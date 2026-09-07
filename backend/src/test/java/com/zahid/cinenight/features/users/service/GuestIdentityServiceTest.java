package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.users.domain.*;
import com.zahid.cinenight.features.users.dto.AuthDtos.GuestLoginRequest;
import com.zahid.cinenight.features.users.dto.AuthDtos.GuestRegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GuestIdentityServiceTest {
    @Mock UserRepository users;
    @Mock GuestDeviceRepository devices;
    @Mock SecurityContextRepository contexts;
    @Mock BootstrapStateRepository bootstrapStates;
    BCryptPasswordEncoder encoder;
    GuestIdentityService service;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder(4);
        service = new GuestIdentityService(users, devices, encoder, contexts,
                "test-pepper", 3, false, bootstrapStates);
        BootstrapState state = new BootstrapState();
        state.setId(1);
        state.setAdminClaimed(true);
        lenient().when(bootstrapStates.findByIdForUpdate(1)).thenReturn(Optional.of(state));
    }

    @Test
    void createsGuestWithChosenPasswordHashAndDeviceCookie() {
        BootstrapState unclaimed = new BootstrapState();
        unclaimed.setId(1);
        when(bootstrapStates.findByIdForUpdate(1)).thenReturn(Optional.of(unclaimed));
        when(devices.findByDeviceHash(anyString())).thenReturn(Optional.empty());
        when(users.existsByUsernameIgnoreCase("FilmFan")).thenReturn(false);
        when(users.countByAccountTypeAndGuestSignupIpHashAndCreatedAtAfter(eq(AccountType.GUEST), anyString(), any()))
                .thenReturn(0L);
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.8");
        var response = new MockHttpServletResponse();
        var result = service.register(new GuestRegisterRequest("FilmFan", "secret-movie"), request, response);

        assertThat(result.existingAccount()).isFalse();
        assertThat(result.user().email()).isNull();
        assertThat(response.getHeader("Set-Cookie")).contains("CINENIGHT_GUEST_DEVICE=").contains("HttpOnly");

        ArgumentCaptor<User> guest = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(guest.capture());
        assertThat(guest.getValue().getAccountType()).isEqualTo(AccountType.GUEST);
        assertThat(guest.getValue().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(guest.getValue().getGuestSignupIpHash()).doesNotContain("203.0.113.8");
        assertThat(encoder.matches("secret-movie", guest.getValue().getPasswordHash())).isTrue();
        assertThat(guest.getValue().getGuestCodeHash()).isNull();
        verify(devices).save(any(GuestDevice.class));
        verify(contexts).saveContext(any(), eq(request), eq(response));
    }

    @Test
    void rejectsAnInvalidPasswordWithoutLinkingDevice() {
        User guest = new User();
        guest.setUsername("FilmFan");
        guest.setAccountType(AccountType.GUEST);
        guest.setPasswordHash(encoder.encode("secret-movie"));
        when(users.findByUsernameIgnoreCaseAndAccountType("FilmFan", AccountType.GUEST))
                .thenReturn(Optional.of(guest));

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.8");

        assertThatThrownBy(() -> service.login(new GuestLoginRequest("FilmFan", "wrong-password"),
                request, new MockHttpServletResponse()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("incorrect");
        verify(devices, never()).save(any());
    }

    @Test
    void migratesALegacyRecoveryCodeToThePasswordHash() {
        User guest = new User();
        guest.setUsername("FilmFan");
        guest.setEmail("guest@test.invalid");
        guest.setDisplayName("FilmFan");
        guest.setAccountType(AccountType.GUEST);
        guest.setPasswordHash(encoder.encode("unavailable-random-password"));
        guest.setGuestCodeHash(encoder.encode("ABCD2345"));
        when(users.findByUsernameIgnoreCaseAndAccountType("FilmFan", AccountType.GUEST))
                .thenReturn(Optional.of(guest));
        when(devices.findByDeviceHash(anyString())).thenReturn(Optional.empty());

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.8");
        service.login(new GuestLoginRequest("FilmFan", "ABCD-2345"), request, new MockHttpServletResponse());

        assertThat(encoder.matches("ABCD-2345", guest.getPasswordHash())).isTrue();
        assertThat(guest.getGuestCodeHash()).isNull();
        verify(users).save(guest);
        verify(devices).save(any(GuestDevice.class));
    }
}
