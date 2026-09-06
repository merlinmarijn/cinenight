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
    BCryptPasswordEncoder encoder;
    GuestIdentityService service;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder(4);
        service = new GuestIdentityService(users, devices, encoder, contexts,
                "test-pepper", 3, false);
    }

    @Test
    void createsGuestWithHashedRecoveryCodeAndDeviceCookie() {
        when(devices.findByDeviceHash(anyString())).thenReturn(Optional.empty());
        when(users.existsByUsernameIgnoreCase("FilmFan")).thenReturn(false);
        when(users.countByAccountTypeAndGuestSignupIpHashAndCreatedAtAfter(eq(AccountType.GUEST), anyString(), any()))
                .thenReturn(0L);
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.8");
        var response = new MockHttpServletResponse();
        var result = service.register(new GuestRegisterRequest("FilmFan"), request, response);

        assertThat(result.recoveryCode()).matches("[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}");
        assertThat(result.existingAccount()).isFalse();
        assertThat(result.user().email()).isNull();
        assertThat(response.getHeader("Set-Cookie")).contains("CINENIGHT_GUEST_DEVICE=").contains("HttpOnly");

        ArgumentCaptor<User> guest = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(guest.capture());
        assertThat(guest.getValue().getAccountType()).isEqualTo(AccountType.GUEST);
        assertThat(guest.getValue().getGuestSignupIpHash()).doesNotContain("203.0.113.8");
        assertThat(encoder.matches(result.recoveryCode().replace("-", ""), guest.getValue().getGuestCodeHash())).isTrue();
        verify(devices).save(any(GuestDevice.class));
        verify(contexts).saveContext(any(), eq(request), eq(response));
    }

    @Test
    void rejectsAnInvalidRecoveryCodeWithoutLinkingDevice() {
        User guest = new User();
        guest.setUsername("FilmFan");
        guest.setAccountType(AccountType.GUEST);
        guest.setGuestCodeHash(encoder.encode("ABCD2345"));
        when(users.findByUsernameIgnoreCaseAndAccountType("FilmFan", AccountType.GUEST))
                .thenReturn(Optional.of(guest));

        var request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.8");

        assertThatThrownBy(() -> service.login(new GuestLoginRequest("FilmFan", "WRNG-2345"),
                request, new MockHttpServletResponse()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("incorrect");
        verify(devices, never()).save(any());
    }
}
