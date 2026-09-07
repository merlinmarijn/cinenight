package com.zahid.cinenight.features.polls.service;

import com.zahid.cinenight.features.groups.domain.Group;
import com.zahid.cinenight.features.groups.domain.GroupMember;
import com.zahid.cinenight.features.groups.domain.GroupMemberId;
import com.zahid.cinenight.features.groups.domain.GroupMemberRepository;
import com.zahid.cinenight.features.groups.domain.GroupRepository;
import com.zahid.cinenight.features.movies.domain.MovieRepository;
import com.zahid.cinenight.features.movies.service.MovieService;
import com.zahid.cinenight.features.polls.domain.Poll;
import com.zahid.cinenight.features.polls.domain.PollOption;
import com.zahid.cinenight.features.polls.domain.PollOptionRepository;
import com.zahid.cinenight.features.polls.domain.PollRepository;
import com.zahid.cinenight.features.polls.domain.Vote;
import com.zahid.cinenight.features.polls.domain.VoteRepository;
import com.zahid.cinenight.features.users.domain.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;

import java.util.Optional;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PollServiceVoteTest {
    @Mock GroupRepository groups;
    @Mock GroupMemberRepository members;
    @Mock PollRepository polls;
    @Mock PollOptionRepository options;
    @Mock VoteRepository votes;
    @Mock MovieRepository movies;
    @Mock MovieService movieService;
    @Mock UserRepository users;
    @Mock MessageSource messages;

    private PollService service;

    @BeforeEach
    void setUp() {
        service = new PollService(groups, members, polls, options, votes, movies, movieService, users, messages);
    }

    @Test
    void votingForSelectedOptionRemovesVote() {
        Group group = new Group();
        group.setId(1L);

        Poll poll = new Poll();
        poll.setId(2L);
        poll.setGroup(group);
        poll.setIsOpen(true);

        PollOption option = new PollOption();
        option.setId(3L);
        option.setPoll(poll);

        Vote existingVote = new Vote();
        existingVote.setId(4L);
        existingVote.setPoll(poll);
        existingVote.setOption(option);

        when(polls.findById(2L)).thenReturn(Optional.of(poll));
        when(members.findById(new GroupMemberId(1L, 5L))).thenReturn(Optional.of(new GroupMember()));
        when(options.findById(3L)).thenReturn(Optional.of(option));
        when(votes.findByPollIdAndUserId(2L, 5L)).thenReturn(Optional.of(existingVote));

        service.vote(2L, new PollService.VoteReq(3L), 5L);

        verify(votes).delete(existingVote);
        verify(votes, never()).save(existingVote);
    }
}
