package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.notifications.service.EmailService;
import com.zahid.cinenight.features.users.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceGuestTest {
    @Mock UserRepository users;
    @Mock VerificationTokenRepository tokens;
    @Mock EmailService email;
    @Mock PasswordEncoder encoder;
    @Mock MessageSource messages;
    UserService service;
    User guest;

    @BeforeEach
    void setUp() {
        service = new UserService(users, tokens, email, encoder, messages);
        guest = new User();
        guest.setId(42L);
        guest.setEmail("guest@test.invalid");
        guest.setUsername("OldName");
        guest.setDisplayName("OldName");
        guest.setAccountType(AccountType.GUEST);
        when(users.findById(42L)).thenReturn(Optional.of(guest));
    }

    @Test
    void enforcesTwentyFourHourRenameCooldown() {
        guest.setDisplayNameChangedAt(Instant.now().minusSeconds(60));
        when(messages.getMessage(eq("guest.rename.cooldown"), any(Object[].class), any(Locale.class)))
                .thenReturn("Please wait");

        assertThatThrownBy(() -> service.updateProfile(42L, new UserService.UpdateProfileReq("NewName", "")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Please wait");
        verify(users, never()).save(any());
    }

    @Test
    void renamesGuestAfterCooldownAndUpdatesLoginName() {
        guest.setDisplayNameChangedAt(Instant.now().minusSeconds(25 * 60 * 60));
        when(users.existsByUsernameIgnoreCase("NewName")).thenReturn(false);
        when(users.save(guest)).thenReturn(guest);

        var result = service.updateProfile(42L, new UserService.UpdateProfileReq("NewName", ""));

        assertThat(result.displayName()).isEqualTo("NewName");
        assertThat(guest.getUsername()).isEqualTo("NewName");
        assertThat(guest.getDisplayNameChangedAt()).isAfter(Instant.now().minusSeconds(5));
    }

    @Test
    void changesGuestPassword() {
        guest.setPasswordHash("old-hash");
        when(encoder.matches("old-password", "old-hash")).thenReturn(true);
        when(encoder.matches("new-password", "old-hash")).thenReturn(false);
        when(encoder.encode("new-password")).thenReturn("new-hash");

        service.changePassword(42L, new UserService.ChangePasswordReq("old-password", "new-password"));

        assertThat(guest.getPasswordHash()).isEqualTo("new-hash");
        verify(users).save(guest);
    }
}
