package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.notifications.service.EmailService;
import com.zahid.cinenight.features.users.domain.BootstrapState;
import com.zahid.cinenight.features.users.domain.BootstrapStateRepository;
import com.zahid.cinenight.features.users.domain.PasswordResetTokenRepository;
import com.zahid.cinenight.features.users.domain.User;
import com.zahid.cinenight.features.users.domain.UserRepository;
import com.zahid.cinenight.features.users.domain.UserRole;
import com.zahid.cinenight.features.users.domain.VerificationTokenRepository;
import com.zahid.cinenight.features.users.dto.AuthDtos.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRoleTest {
    @Mock UserRepository users;
    @Mock EmailService email;
    @Mock PasswordResetTokenRepository resetTokens;
    @Mock VerificationTokenRepository verificationTokens;
    @Mock PasswordEncoder encoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock SecurityContextRepository securityContexts;
    @Mock MessageSource messages;
    @Mock BootstrapStateRepository bootstrapStates;
    AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, resetTokens, verificationTokens, encoder, authenticationManager,
                securityContexts, email, messages, bootstrapStates);
        when(encoder.encode(any())).thenReturn("hash");
    }

    @Test
    void firstRegisteredAccountClaimsAdministratorRole() {
        BootstrapState state = new BootstrapState();
        state.setId(1);
        state.setAdminClaimed(false);
        when(bootstrapStates.findByIdForUpdate(1)).thenReturn(Optional.of(state));

        var result = service.register(new RegisterRequest("first@example.com", "secret1", "First user"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(result.role()).isEqualTo("ADMIN");
        assertThat(state.isAdminClaimed()).isTrue();
    }

    @Test
    void laterRegisteredAccountsAreNormalUsers() {
        BootstrapState state = new BootstrapState();
        state.setId(1);
        state.setAdminClaimed(true);
        when(bootstrapStates.findByIdForUpdate(1)).thenReturn(Optional.of(state));

        var result = service.register(new RegisterRequest("later@example.com", "secret1", "Later user"));

        assertThat(result.role()).isEqualTo("USER");
    }
}
