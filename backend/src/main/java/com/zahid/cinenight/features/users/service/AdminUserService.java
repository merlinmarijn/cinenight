package com.zahid.cinenight.features.users.service;

import com.zahid.cinenight.features.users.domain.AccountType;
import com.zahid.cinenight.features.users.domain.User;
import com.zahid.cinenight.features.users.domain.UserRepository;
import com.zahid.cinenight.features.users.domain.UserRole;
import com.zahid.cinenight.features.users.domain.UserStatus;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class AdminUserService {
    public record AdminUserDto(Long id, String email, String displayName, UserRole role, UserStatus status,
                               AccountType accountType, boolean canCreateGroups, Instant createdAt) {
        static AdminUserDto from(User user) {
            return new AdminUserDto(user.getId(),
                    user.getAccountType() == AccountType.GUEST ? null : user.getEmail(),
                    user.getDisplayName(), user.getRole(), user.getStatus(), user.getAccountType(),
                    user.isCanCreateGroups(), user.getCreatedAt());
        }
    }

    public record UpdateUserRequest(@Size(min = 2, max = 100) String displayName, UserRole role,
                                    UserStatus status, Boolean canCreateGroups) {}

    private final UserRepository users;

    public AdminUserService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> list(String actorEmail) {
        requireAdmin(actorEmail);
        return users.findAllByOrderByCreatedAtDesc().stream().map(AdminUserDto::from).toList();
    }

    @Transactional
    public AdminUserDto update(String actorEmail, Long targetId, UpdateUserRequest request) {
        requireAdmin(actorEmail);
        User target = users.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        UserRole nextRole = request.role() == null ? target.getRole() : request.role();
        UserStatus nextStatus = request.status() == null ? target.getStatus() : request.status();
        ensureAnActiveAdminRemains(target, nextRole, nextStatus);

        if (request.displayName() != null) {
            String displayName = request.displayName().trim();
            if (displayName.length() < 2) throw new IllegalArgumentException("Display name must be at least 2 characters.");
            target.setDisplayName(displayName);
        }
        target.setRole(nextRole);
        target.setStatus(nextStatus);
        if (request.canCreateGroups() != null) target.setCanCreateGroups(request.canCreateGroups());
        return AdminUserDto.from(users.save(target));
    }

    @Transactional
    public void delete(String actorEmail, Long targetId) {
        requireAdmin(actorEmail);
        User target = users.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        ensureAnActiveAdminRemains(target, null, null);
        users.delete(target);
    }

    private User requireAdmin(String actorEmail) {
        User actor = users.findByEmail(actorEmail)
                .orElseThrow(() -> new AccessDeniedException("Admin access required."));
        if (actor.getStatus() != UserStatus.ACTIVE || actor.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Admin access required.");
        }
        return actor;
    }

    private void ensureAnActiveAdminRemains(User target, UserRole nextRole, UserStatus nextStatus) {
        if (target.getRole() != UserRole.ADMIN || target.getStatus() != UserStatus.ACTIVE) return;
        boolean remainsActiveAdmin = nextRole == UserRole.ADMIN && nextStatus == UserStatus.ACTIVE;
        if (!remainsActiveAdmin && users.findAllByRoleAndStatusOrderById(UserRole.ADMIN, UserStatus.ACTIVE).size() <= 1) {
            throw new IllegalArgumentException("At least one active administrator is required.");
        }
    }
}
