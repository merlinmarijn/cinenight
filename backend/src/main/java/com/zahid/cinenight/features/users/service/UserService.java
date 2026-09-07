package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.notifications.service.EmailService;
import com.zahid.cinenight.features.users.domain.*;
import com.zahid.cinenight.features.users.dto.AuthDtos.UserDto;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.UUID;

@Service
public class UserService {

    public record UpdateProfileReq(String displayName, String email) {}
    public record ChangePasswordReq(String currentPassword, String newPassword) {}

    private final UserRepository users;
    private final VerificationTokenRepository verifyTokens;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final MessageSource messageSource;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    public UserService(UserRepository users,
                       VerificationTokenRepository verifyTokens,
                       EmailService emailService,
                       PasswordEncoder passwordEncoder,
                       MessageSource messageSource) {
        this.users = users;
        this.verifyTokens = verifyTokens;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.messageSource = messageSource;
    }

    private String getMsg(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileReq req) {
        User user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException(getMsg("user.not.found"))); 

        if (user.getAccountType() == AccountType.GUEST) {
            updateGuestName(user, req.displayName());
            return AuthService.toDto(users.save(user));
        }

        if (req.displayName() != null && !req.displayName().isBlank()) {
            user.setDisplayName(req.displayName());
        }

        if (req.email() != null && !req.email().isBlank() && !req.email().equals(user.getEmail())) {
            if (users.existsByEmail(req.email())) {
                throw new IllegalArgumentException(getMsg("auth.email.exists")); 
            }

            user.setPendingEmail(req.email());
            users.save(user);

            String token = UUID.randomUUID().toString();
            VerificationToken vt = new VerificationToken();
            vt.setUser(user);
            vt.setToken(token);
            vt.setExpiresAt(LocalDateTime.now().plusHours(24));
            verifyTokens.save(vt);


            String link = String.format("%s/verify-email?token=%s&type=email_change", frontendBaseUrl, token);
            emailService.sendEmailChangeVerification(req.email(), link);
        } else {
            users.save(user);
        }

        return AuthService.toDto(user);
    }

    private void updateGuestName(User user, String requestedName) {
        String username = requestedName == null ? "" : requestedName.trim();
        if (username.equals(user.getUsername())) return;
        if (username.length() < 3 || username.length() > 24 || !username.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException(getMsg("guest.username.invalid"));
        }
        Instant availableAt = user.getDisplayNameChangedAt() == null ? Instant.EPOCH
                : user.getDisplayNameChangedAt().plus(GuestIdentityService.renameCooldown());
        if (availableAt.isAfter(Instant.now())) {
            throw new IllegalArgumentException(messageSource.getMessage(
                    "guest.rename.cooldown", new Object[]{availableAt}, LocaleContextHolder.getLocale()));
        }
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException(getMsg("guest.username.taken"));
        }
        user.setUsername(username);
        user.setDisplayName(username);
        user.setDisplayNameChangedAt(Instant.now());
    }

    @Transactional
    public void confirmEmailChange(String token) {
        VerificationToken vt = verifyTokens.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException(getMsg("auth.token.invalid"))); 

        if (vt.getExpiresAt().isBefore(LocalDateTime.now())) {
            verifyTokens.delete(vt);
            throw new IllegalArgumentException(getMsg("auth.token.expired")); 
        }

        User user = vt.getUser();
        if (user.getPendingEmail() == null) {
            verifyTokens.delete(vt);
            return;
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        users.save(user);

        verifyTokens.delete(vt);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordReq req) {
        User user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException(getMsg("user.not.found")));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException(getMsg("user.password.wrong")); 
        }
        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException(getMsg("user.password.same")); 
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        users.save(user);
    }
}
