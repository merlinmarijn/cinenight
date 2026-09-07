package com.zahid.cinenight.features.groups.service;

import com.zahid.cinenight.features.groups.domain.GroupMemberRepository;
import com.zahid.cinenight.features.groups.domain.GroupRepository;
import com.zahid.cinenight.features.polls.domain.VoteRepository;
import com.zahid.cinenight.features.users.domain.User;
import com.zahid.cinenight.features.users.domain.UserRepository;
import com.zahid.cinenight.features.users.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupServicePermissionTest {
    @Mock GroupRepository groups;
    @Mock GroupMemberRepository members;
    @Mock UserRepository users;
    @Mock VoteRepository votes;
    @Mock MessageSource messages;

    @Test
    void normalUserCannotCreateGroupByDefault() {
        User user = new User();
        user.setId(7L);
        user.setRole(UserRole.USER);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        GroupService service = new GroupService(groups, members, users, votes, messages);

        assertThatThrownBy(() -> service.create(new GroupService.CreateGroupReq("Blocked", null, "PUBLIC"), 7L))
                .isInstanceOf(AccessDeniedException.class);
        verify(groups, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
