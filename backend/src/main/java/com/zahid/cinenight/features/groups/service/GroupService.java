package com.zahid.cinenight.features.groups.service;

import com.zahid.cinenight.features.groups.domain.*;
import com.zahid.cinenight.features.polls.domain.VoteRepository;
import com.zahid.cinenight.features.users.domain.UserRepository;
import com.zahid.cinenight.features.users.domain.User;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GroupService {

    public record CreateGroupReq(@NotBlank String name, String description, String visibility) {}

    public record GroupDto(Long id, String name, String description, String visibility, String role, int memberCount, String inviteToken) {
        public static GroupDto of(Group g, String role, int memberCount) {
            return new GroupDto(
                    g.getId(), g.getName(), g.getDescription(),
                    g.getVisibility().name(), role, memberCount, g.getInviteToken()
            );
        }
    }
    public record AddMemberReq(@NotNull Long groupId, @NotBlank String email, @NotNull GroupRole role) {}
    public record GroupMemberDto(Long userId, String displayName, String avatarUrl, String role, String joinedAt) {}

    private final GroupRepository groups;
    private final GroupMemberRepository members;
    private final UserRepository users;
    private final VoteRepository votes;
    private final MessageSource messageSource;

    public GroupService(GroupRepository groups, GroupMemberRepository members, UserRepository users, VoteRepository votes, MessageSource messageSource) {
        this.groups = groups;
        this.members = members;
        this.users = users;
        this.votes = votes;
        this.messageSource = messageSource;
    }

    // Message lookup helper
    private String getMsg(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    @Transactional
    public GroupDto create(CreateGroupReq req, Long ownerUserId) {
        Group g = new Group();
        g.setName(req.name());
        g.setDescription(req.description());
        g.setInviteToken(UUID.randomUUID().toString());

        try {
            if (req.visibility() != null) g.setVisibility(GroupVisibility.valueOf(req.visibility()));
            else g.setVisibility(GroupVisibility.LINK);
        } catch (Exception e) { g.setVisibility(GroupVisibility.LINK); }

        g.setCreatedBy(users.findById(ownerUserId).orElse(null));
        groups.save(g);

        GroupMember m = new GroupMember();
        m.setId(new GroupMemberId(g.getId(), ownerUserId));
        m.setGroup(g);
        m.setUser(users.findById(ownerUserId).orElseThrow());
        m.setRole(GroupRole.OWNER);
        members.save(m);

        return GroupDto.of(g, "OWNER", 1);
    }

    @Transactional
    public void join(Long groupId, Long userId) {
        Group g = groups.findById(groupId).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.found")));
        if (members.existsById(new GroupMemberId(groupId, userId))) return;

        if (g.getVisibility() != GroupVisibility.PUBLIC) {
            throw new IllegalArgumentException(getMsg("group.join.private"));
        }

        GroupMember m = new GroupMember();
        m.setId(new GroupMemberId(groupId, userId));
        m.setGroup(g);
        m.setUser(users.findById(userId).orElseThrow());
        m.setRole(GroupRole.MEMBER);
        members.save(m);
    }

    @Transactional
    public Long joinByToken(String token, Long userId) {
        Group g = groups.findByInviteToken(token)
                .orElseThrow(() -> new IllegalArgumentException(getMsg("group.invite.invalid")));
        members.joinGroupNative(g.getId(), userId, GroupRole.MEMBER.name());
        return g.getId();
    }

    @Transactional
    public void addMember(AddMemberReq req, Long byUserId) {
        Group g = groups.findById(req.groupId()).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.found")));
        GroupMember me = members.findById(new GroupMemberId(g.getId(), byUserId))
                .orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.member")));
        if (me.getRole() == GroupRole.MEMBER) throw new IllegalArgumentException(getMsg("error.access.denied"));

        User u = users.findByEmail(req.email()).orElseThrow(() -> new IllegalArgumentException(getMsg("user.not.found")));
        GroupMemberId id = new GroupMemberId(g.getId(), u.getId());
        if (members.findById(id).isPresent()) return;

        GroupMember m = new GroupMember();
        m.setId(id);
        m.setGroup(g);
        m.setUser(u);
        m.setRole(req.role());
        members.save(m);
    }

    public List<GroupDto> myGroups(Long userId) {
        return members.findAll().stream()
                .filter(m -> m.getUser().getId().equals(userId))
                .map(m -> {
                    int count = members.countByGroupId(m.getGroup().getId());
                    return GroupDto.of(m.getGroup(), m.getRole().name(), count);
                })
                .toList();
    }

    public List<GroupDto> explore() {
        return groups.findTop20ByVisibilityOrderByCreatedAtDesc(GroupVisibility.PUBLIC)
                .stream()
                .map(g -> {
                    int count = members.countByGroupId(g.getId());
                    return GroupDto.of(g, "VISITOR", count);
                })
                .toList();
    }

    public List<GroupMemberDto> getMembers(Long groupId, Long currentUserId) {
        ensureMember(groupId, currentUserId);

        return members.findAll().stream()
                .filter(m -> m.getGroup().getId().equals(groupId))
                .map(m -> new GroupMemberDto(
                        m.getUser().getId(),
                        m.getUser().getDisplayName(),
                        m.getUser().getAvatarUrl(),
                        m.getRole().name(),
                        m.getJoinedAt().toString()
                ))
                .toList();
    }

    @Transactional
    public void removeMember(Long groupId, Long targetUserId, Long currentUserId) {
        Group g = groups.findById(groupId).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.found")));

        GroupMember actor = members.findById(new GroupMemberId(groupId, currentUserId))
                .orElseThrow(() -> new IllegalArgumentException(getMsg("error.access.denied")));

        if (actor.getRole() != GroupRole.OWNER) {
            throw new IllegalArgumentException(getMsg("group.only.owner.remove"));
        }

        if (targetUserId.equals(currentUserId)) {
            throw new IllegalArgumentException(getMsg("group.cannot.remove.self"));
        }

        GroupMember target = members.findById(new GroupMemberId(groupId, targetUserId))
                .orElseThrow(() -> new IllegalArgumentException(getMsg("group.user.not.in.group")));

        members.delete(target);
    }

    @Transactional
    public void deleteGroup(Long groupId, Long currentUserId) {
        Group g = groups.findById(groupId).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.found")));

        if (!g.getCreatedBy().getId().equals(currentUserId)) {
            throw new IllegalArgumentException(getMsg("group.delete.denied"));
        }

        groups.delete(g);
    }

    @Transactional
    public void leaveGroup(Long groupId, Long userId) {
        GroupMember member = members.findById(new GroupMemberId(groupId, userId))
                .orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.member")));

        if (member.getRole() == GroupRole.OWNER) {
            throw new IllegalArgumentException(getMsg("group.owner.cannot.leave"));
        }
        votes.deleteByUserIdAndGroupId(userId, groupId);
        members.delete(member);
    }

    private void ensureMember(Long groupId, Long userId) {
        if (!members.existsById(new GroupMemberId(groupId, userId))) {
            throw new IllegalArgumentException(getMsg("group.not.member"));
        }
    }
}
