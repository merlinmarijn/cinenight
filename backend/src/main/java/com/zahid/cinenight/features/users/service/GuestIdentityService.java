package com.zahid.cinenight.features.users.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.zahid.cinenight.features.users.domain.*;
import com.zahid.cinenight.features.users.dto.AuthDtos.GuestLoginRequest;
import com.zahid.cinenight.features.users.dto.AuthDtos.GuestRegisterRequest;
import com.zahid.cinenight.features.users.dto.AuthDtos.GuestSessionDto;
import com.zahid.cinenight.features.users.dto.AuthDtos.UserDto;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Base64;
import java.util.Deque;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class GuestIdentityService {
    private static final String DEVICE_COOKIE = "CINENIGHT_GUEST_DEVICE";
    private static final String NO_RESUME_COOKIE = "CINENIGHT_GUEST_NO_RESUME";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration RENAME_COOLDOWN = Duration.ofHours(24);
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_LOGIN_FAILURES = 10;

    private final UserRepository users;
    private final GuestDeviceRepository devices;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository;
    private final Cache<String, Deque<Instant>> failedLogins = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(15, TimeUnit.MINUTES)
            .build();
    private final String dummyPasswordHash;
    private final String identityPepper;
    private final int maxAccountsPerIp;
    private final boolean trustForwardedHeaders;
    private final BootstrapStateRepository bootstrapStates;

    public GuestIdentityService(UserRepository users,
                                GuestDeviceRepository devices,
                                PasswordEncoder passwordEncoder,
                                SecurityContextRepository securityContextRepository,
                                @Value("${app.guest.identity-pepper:cinenight-local-dev-only}") String identityPepper,
                                @Value("${app.guest.max-accounts-per-ip-per-24h:3}") int maxAccountsPerIp,
                                @Value("${app.guest.trust-forwarded-headers:false}") boolean trustForwardedHeaders,
                                BootstrapStateRepository bootstrapStates) {
        this.users = users;
        this.devices = devices;
        this.passwordEncoder = passwordEncoder;
        this.dummyPasswordHash = passwordEncoder.encode("invalid-guest-password");
        this.securityContextRepository = securityContextRepository;
        this.identityPepper = identityPepper;
        this.maxAccountsPerIp = maxAccountsPerIp;
        this.trustForwardedHeaders = trustForwardedHeaders;
        this.bootstrapStates = bootstrapStates;
    }

    @Transactional
    public GuestSessionDto register(GuestRegisterRequest req,
                                    HttpServletRequest request,
                                    HttpServletResponse response) {
        DeviceIdentity device = getOrCreateDevice(request, response);
        String ipHash = hash(clientIp(request));

        var existingDevice = devices.findByDeviceHash(device.hash());
        if (existingDevice.isPresent()) {
            User existing = existingDevice.get().getUser();
            touch(existingDevice.get(), ipHash);
            signIn(existing, request, response);
            return new GuestSessionDto(AuthService.toDto(existing), true);
        }

        String username = normalizeUsername(req.username());
        validateUsername(username);
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("That guest name is already taken.");
        }

        long recentFromIp = users.countByAccountTypeAndGuestSignupIpHashAndCreatedAtAfter(
                AccountType.GUEST, ipHash, Instant.now().minus(Duration.ofHours(24)));
        if (recentFromIp >= maxAccountsPerIp) {
            throw new GuestRateLimitException("Too many guest accounts were created from this network. Try again later or sign in to an existing guest account.");
        }

        User guest = new User();
        guest.setEmail("guest-" + UUID.randomUUID() + "@guest.cinenight.invalid");
        guest.setPasswordHash(passwordEncoder.encode(req.password()));
        guest.setDisplayName(username);
        guest.setUsername(username);
        guest.setAccountType(AccountType.GUEST);
        guest.setGuestSignupIpHash(ipHash);
        guest.setDisplayNameChangedAt(Instant.now());
        guest.setStatus(UserStatus.ACTIVE);
        BootstrapState bootstrap = bootstrapStates.findByIdForUpdate(1)
                .orElseThrow(() -> new IllegalStateException("Application bootstrap state is missing."));
        if (!bootstrap.isAdminClaimed()) {
            guest.setRole(UserRole.ADMIN);
            bootstrap.setAdminClaimed(true);
            bootstrapStates.save(bootstrap);
        }
        users.saveAndFlush(guest);

        GuestDevice link = new GuestDevice();
        link.setUser(guest);
        link.setDeviceHash(device.hash());
        link.setLastIpHash(ipHash);
        link.setLastUsedAt(Instant.now());
        devices.save(link);

        signIn(guest, request, response);
        return new GuestSessionDto(AuthService.toDto(guest), false);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public GuestSessionDto login(GuestLoginRequest req,
                                 HttpServletRequest request,
                                 HttpServletResponse response) {
        String username = normalizeUsername(req.username());
        String ipHash = hash(clientIp(request));
        String throttleKey = ipHash + ":" + username.toLowerCase(Locale.ROOT);
        enforceLoginThrottle(throttleKey);

        User guest = users.findByUsernameIgnoreCaseAndAccountType(username, AccountType.GUEST).orElse(null);
        String expectedHash = guest == null ? dummyPasswordHash : guest.getPasswordHash();
        boolean passwordMatches = passwordEncoder.matches(req.password(), expectedHash);
        boolean legacyCodeMatches = guest != null && guest.getGuestCodeHash() != null
                && passwordEncoder.matches(compactCode(req.password()), guest.getGuestCodeHash());
        if ((!passwordMatches && !legacyCodeMatches) || guest == null) {
            recordLoginFailure(throttleKey);
            throw new IllegalArgumentException("Guest name or password is incorrect.");
        }

        if (legacyCodeMatches) {
            guest.setPasswordHash(passwordEncoder.encode(req.password()));
            guest.setGuestCodeHash(null);
            users.save(guest);
        }

        failedLogins.invalidate(throttleKey);
        DeviceIdentity device = getOrCreateDevice(request, response);
        GuestDevice link = devices.findByDeviceHash(device.hash()).orElseGet(GuestDevice::new);
        link.setUser(guest);
        link.setDeviceHash(device.hash());
        link.setLastIpHash(ipHash);
        link.setLastUsedAt(Instant.now());
        devices.save(link);

        signIn(guest, request, response);
        return new GuestSessionDto(AuthService.toDto(guest), true);
    }

    @Transactional
    public UserDto resume(HttpServletRequest request, HttpServletResponse response) {
        if (hasCookie(request, NO_RESUME_COOKIE)) return null;
        String token = readDeviceToken(request);
        if (token == null) return null;
        var link = devices.findByDeviceHash(hash(token)).orElse(null);
        if (link == null || link.getUser().getStatus() != UserStatus.ACTIVE) return null;
        touch(link, hash(clientIp(request)));
        signIn(link.getUser(), request, response);
        return AuthService.toDto(link.getUser());
    }

    public void pauseAutomaticResume(HttpServletRequest request, HttpServletResponse response) {
        if (readDeviceToken(request) == null) return;
        addCookie(response, ResponseCookie.from(NO_RESUME_COOKIE, "1")
                .httpOnly(true).secure(isSecureRequest(request)).sameSite("Lax")
                .path("/").maxAge(Duration.ofDays(365)).build());
    }

    public static Duration renameCooldown() {
        return RENAME_COOLDOWN;
    }

    private void touch(GuestDevice link, String ipHash) {
        link.setLastIpHash(ipHash);
        link.setLastUsedAt(Instant.now());
        devices.save(link);
    }

    private void signIn(User user, HttpServletRequest request, HttpServletResponse response) {
        UserDetails principal = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .build();
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        request.getSession(true);
        securityContextRepository.saveContext(context, request, response);
        addCookie(response, ResponseCookie.from(NO_RESUME_COOKIE, "")
                .httpOnly(true).secure(isSecureRequest(request)).sameSite("Lax")
                .path("/").maxAge(Duration.ZERO).build());
    }

    private DeviceIdentity getOrCreateDevice(HttpServletRequest request, HttpServletResponse response) {
        String token = readDeviceToken(request);
        if (token == null) {
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            ResponseCookie cookie = ResponseCookie.from(DEVICE_COOKIE, token)
                    .httpOnly(true).secure(isSecureRequest(request)).sameSite("Lax")
                    .path("/").maxAge(Duration.ofDays(365)).build();
            addCookie(response, cookie);
        }
        return new DeviceIdentity(hash(token));
    }

    private String readDeviceToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (DEVICE_COOKIE.equals(cookie.getName()) && cookie.getValue().length() >= 32) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean hasCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return false;
        for (Cookie cookie : cookies) if (name.equals(cookie.getName())) return true;
        return false;
    }

    private void addCookie(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String clientIp(HttpServletRequest request) {
        if (trustForwardedHeaders) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",", 2)[0].trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        return request.isSecure() || (trustForwardedHeaders &&
                "https".equalsIgnoreCase(request.getHeader("X-Forwarded-Proto")));
    }

    private String hash(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(identityPepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to protect guest identity", e);
        }
    }

    private void enforceLoginThrottle(String key) {
        Deque<Instant> attempts = failedLogins.get(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            Instant cutoff = Instant.now().minus(LOGIN_WINDOW);
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) attempts.removeFirst();
            if (attempts.size() >= MAX_LOGIN_FAILURES) {
                throw new GuestRateLimitException("Too many failed sign-in attempts. Try again in 15 minutes.");
            }
        }
    }

    private void recordLoginFailure(String key) {
        Deque<Instant> attempts = failedLogins.get(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) { attempts.addLast(Instant.now()); }
    }

    private static String normalizeUsername(String value) {
        return value == null ? "" : value.trim();
    }

    private static void validateUsername(String username) {
        if (username.length() < 3 || username.length() > 24 || !username.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException("Guest names must be 3–24 characters using letters, numbers, or underscores.");
        }
    }

    private static String compactCode(String code) {
        return code == null ? "" : code.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    private record DeviceIdentity(String hash) {}
}
