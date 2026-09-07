package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.notifications.service.EmailService;
import com.zahid.cinenight.features.users.domain.*;
import com.zahid.cinenight.features.users.dto.AuthDtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final EmailService emailService;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final VerificationTokenRepository verifyTokens;
    private final MessageSource messageSource;
    private final BootstrapStateRepository bootstrapStates;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    public AuthService(UserRepository users,
                       PasswordResetTokenRepository tokens,
                       VerificationTokenRepository verifyTokens,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       SecurityContextRepository securityContextRepository,
                       EmailService emailService,
                       MessageSource messageSource,
                       BootstrapStateRepository bootstrapStates) {
        this.users = users;
        this.tokens = tokens;
        this.verifyTokens = verifyTokens;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.emailService = emailService;
        this.messageSource = messageSource;
        this.bootstrapStates = bootstrapStates;
    }

    private String getMsg(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    @Transactional
    public UserDto register(RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new IllegalArgumentException(getMsg("auth.email.exists"));
        }

        try {
            User u = new User();
            u.setEmail(req.email());
            u.setDisplayName(req.displayName());
            u.setPasswordHash(passwordEncoder.encode(req.password()));
            BootstrapState bootstrap = bootstrapStates.findByIdForUpdate(1)
                    .orElseThrow(() -> new IllegalStateException("Application bootstrap state is missing."));
            if (!bootstrap.isAdminClaimed()) {
                u.setRole(UserRole.ADMIN);
                bootstrap.setAdminClaimed(true);
                bootstrapStates.save(bootstrap);
            }
            u.setStatus(UserStatus.DISABLED);

            users.save(u);

            String token = UUID.randomUUID().toString();
            VerificationToken vt = new VerificationToken();
            vt.setUser(u);
            vt.setToken(token);
            vt.setExpiresAt(LocalDateTime.now().plusHours(24));
            verifyTokens.save(vt);

            String link = String.format("%s/verify-email?token=%s", frontendBaseUrl, token);
            emailService.sendVerification(u.getEmail(), link);

            return toDto(u);
        }catch (DataIntegrityViolationException e){
            throw new IllegalArgumentException(getMsg("auth.email.exists"));
        }
    }

    @Transactional
    public void verifyEmail(String token) {
        var vtOptional = verifyTokens.findByToken(token);
        if (vtOptional.isEmpty()) {
            return;
        }

        VerificationToken vt = vtOptional.get();

        if (vt.getExpiresAt().isBefore(LocalDateTime.now())) {
            verifyTokens.delete(vt);
            throw new IllegalArgumentException(getMsg("auth.token.expired"));
        }

        User u = vt.getUser();
        if (u.getStatus() != UserStatus.ACTIVE) {
            u.setStatus(UserStatus.ACTIVE);
            users.save(u);
        }

        verifyTokens.delete(vt);
    }

    public UserDto login(LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password()));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);

        request.getSession(true);
        securityContextRepository.saveContext(context, request, response);

        User u = users.findByEmail(req.email()).orElseThrow();
        return toDto(u);
    }

    public void logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    @Transactional
    public void forgot(ForgotPasswordRequest req) {
        var u = users.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException(getMsg("user.not.found")));

        String token = UUID.randomUUID().toString().replace("-", ""); // 32 char
        var prt = new PasswordResetToken();
        prt.setUser(u);
        prt.setToken(token);
        prt.setExpiresAt(LocalDateTime.now().plusHours(1));
        tokens.save(prt);

        String link = String.format("%s/reset-password?token=%s", frontendBaseUrl, token);
        emailService.sendPasswordReset(u.getEmail(), link);
    }

    @Transactional
    public void reset(ResetPasswordRequest req) {
        PasswordResetToken prt = tokens.findActiveByToken(req.token())
                .orElseThrow(() -> new IllegalArgumentException(getMsg("auth.token.invalid")));

        User u = prt.getUser();
        u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        users.save(u);

        tokens.markUsed(prt.getId(), LocalDateTime.now());
        tokens.deleteOtherActiveForUser(u.getId(), prt.getId());
    }


    public UserDto me(String email) {
        return users.findByEmail(email)
                .map(AuthService::toDto)
                .orElse(null);
    }

    public static UserDto toDto(User u) {
        boolean guest = u.getAccountType() == AccountType.GUEST;
        Instant renameAvailableAt = guest && u.getDisplayNameChangedAt() != null
                ? u.getDisplayNameChangedAt().plus(GuestIdentityService.renameCooldown())
                : null;
        boolean canCreateGroups = u.getRole() != UserRole.USER || u.isCanCreateGroups();
        return new UserDto(u.getId(), guest ? null : u.getEmail(), u.getDisplayName(), u.getRole().name(),
                u.getAccountType().name(), canCreateGroups, renameAvailableAt);
    }
}
