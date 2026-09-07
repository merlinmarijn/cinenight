package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.users.domain.User;
import com.zahid.cinenight.features.users.domain.UserRepository;
import com.zahid.cinenight.features.users.domain.UserRole;
import com.zahid.cinenight.features.users.domain.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
    @Mock UserRepository users;
    AdminUserService service;
    User admin;

    @BeforeEach
    void setUp() {
        service = new AdminUserService(users);
        admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@example.com");
        admin.setDisplayName("Admin");
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        when(users.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
    }

    @Test
    void administratorCanChangeNormalUserRoleAndPermission() {
        User target = new User();
        target.setId(2L);
        target.setDisplayName("Viewer");
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(users.save(target)).thenReturn(target);

        var result = service.update(admin.getEmail(), 2L,
                new AdminUserService.UpdateUserRequest("Movie fan", UserRole.VIP, UserStatus.ACTIVE, false));

        assertThat(result.role()).isEqualTo(UserRole.VIP);
        assertThat(target.getDisplayName()).isEqualTo("Movie fan");
        assertThat(target.isCanCreateGroups()).isFalse();
    }

    @Test
    void lastActiveAdministratorCannotBeDisabled() {
        when(users.findById(1L)).thenReturn(Optional.of(admin));
        when(users.findAllByRoleAndStatusOrderById(UserRole.ADMIN, UserStatus.ACTIVE)).thenReturn(List.of(admin));

        assertThatThrownBy(() -> service.update(admin.getEmail(), 1L,
                new AdminUserService.UpdateUserRequest(null, null, UserStatus.DISABLED, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("one active administrator");
        verify(users, never()).save(admin);
    }

    @Test
    void lastActiveAdministratorCannotBeDeleted() {
        when(users.findById(1L)).thenReturn(Optional.of(admin));
        when(users.findAllByRoleAndStatusOrderById(UserRole.ADMIN, UserStatus.ACTIVE)).thenReturn(List.of(admin));

        assertThatThrownBy(() -> service.delete(admin.getEmail(), 1L))
                .isInstanceOf(IllegalArgumentException.class);
        verify(users, never()).delete(admin);
    }
}
