package com.zahid.cinenight.features.polls.service;

import com.zahid.cinenight.features.groups.domain.Group;
import com.zahid.cinenight.features.groups.domain.GroupMember;
import com.zahid.cinenight.features.groups.domain.GroupMemberId;
import com.zahid.cinenight.features.groups.domain.GroupMemberRepository;
import com.zahid.cinenight.features.groups.domain.GroupRepository;
import com.zahid.cinenight.features.movies.domain.Movie;
import com.zahid.cinenight.features.movies.domain.MovieRepository;
import com.zahid.cinenight.features.movies.service.MovieService;
import com.zahid.cinenight.features.polls.domain.*;
import com.zahid.cinenight.features.users.domain.UserRepository;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PollService {

    public record CreatePollReq(@NotNull Long groupId, @NotBlank String title, String description,
                                LocalDateTime closesAt, Boolean allowAddOptions, Integer maxVotesPerUser) {}
    public record PollDto(Long id, Long groupId, String title, boolean isOpen, String publicToken) {
        public static PollDto of(Poll p) {
            return new PollDto(p.getId(), p.getGroup().getId(), p.getTitle(), Boolean.TRUE.equals(p.getIsOpen()), p.getPublicToken());
        }
    }
    public record AddOptionReq(@NotNull Long pollId, @NotNull Integer tmdbId, String label) {}
    public record VoteReq(@NotNull Long optionId) {}
    public record OptionResult(Long optionId, Integer tmdbId, String title, long votes) {}
    public record SuggestMovieReq(@NotNull Long groupId, @NotNull Integer tmdbId, String title) {}
    public record PollOptionDto(Long id, Integer tmdbId, String title, String posterPath, Short releaseYear, String addedBy, long voteCount, boolean isVotedByMe) {}
    public record PollDetailDto(Long id, String title, String description, boolean isOpen, String publicToken, List<PollOptionDto> options) {}
    public record UpdatePollReq(String description, LocalDateTime opensAt) {}

    private final GroupRepository groups;
    private final GroupMemberRepository members;
    private final PollRepository polls;
    private final PollOptionRepository options;
    private final VoteRepository votes;
    private final MovieRepository movies;
    private final MovieService movieService;
    private final UserRepository users;
    private final MessageSource messageSource;

    public PollService(GroupRepository groups, GroupMemberRepository members,
                       PollRepository polls, PollOptionRepository options,
                       VoteRepository votes, MovieRepository movies, MovieService movieService,
                       UserRepository users, MessageSource messageSource) {
        this.groups = groups;
        this.members = members;
        this.polls = polls;
        this.options = options;
        this.votes = votes;
        this.movies = movies;
        this.movieService = movieService;
        this.users = users;
        this.messageSource = messageSource;
    }

    private String getMsg(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    private void ensureMember(Long groupId, Long userId) {
        var key = new GroupMemberId(groupId, userId);
        GroupMember m = members.findById(key).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.member"))); 
        if (m == null) throw new IllegalArgumentException(getMsg("group.not.member"));
    }

    @Transactional
    public PollDto create(CreatePollReq req, Long userId) {
        Group g = groups.findById(req.groupId()).orElseThrow(() -> new IllegalArgumentException(getMsg("group.not.found"))); 
        ensureMember(g.getId(), userId);

        Poll p = new Poll();
        p.setGroup(g);
        p.setTitle(req.title());
        p.setDescription(req.description());
        p.setClosesAt(req.closesAt());
        p.setIsOpen(true);
        p.setAllowAddOptions(req.allowAddOptions() == null ? Boolean.TRUE : req.allowAddOptions());
        p.setMaxVotesPerUser(req.maxVotesPerUser() == null ? 1 : Math.max(1, req.maxVotesPerUser()));
        p.setPublicToken(Long.toHexString(System.nanoTime())); // basit token
        polls.save(p);

        return PollDto.of(p);
    }

    @Transactional
    public void addOption(AddOptionReq req, Long userId) {
        Poll p = polls.findById(req.pollId()).orElseThrow(() -> new IllegalArgumentException(getMsg("poll.not.found"))); 
        ensureMember(p.getGroup().getId(), userId);
        if (!Boolean.TRUE.equals(p.getIsOpen())) throw new IllegalArgumentException(getMsg("poll.closed")); 

        movieService.byId(req.tmdbId());
        Movie m = movies.findByTmdbId(req.tmdbId()).orElseThrow();

        // Skip options that are already in the poll.
        if (options.existsByPollIdAndMovieId(p.getId(), m.getId())) {
            return;
        }

        PollOption po = new PollOption();
        po.setPoll(p);
        po.setMovie(m);
        po.setLabel(req.label());
        po.setAddedBy(users.findById(userId).orElse(null));
        options.save(po);
    }

    @Transactional
    public void vote(Long pollId, VoteReq req, Long userId) {
        Poll p = polls.findById(pollId).orElseThrow(() -> new IllegalArgumentException(getMsg("poll.not.found"))); 
        ensureMember(p.getGroup().getId(), userId);
        if (!Boolean.TRUE.equals(p.getIsOpen())) throw new IllegalArgumentException(getMsg("poll.closed")); 

        PollOption opt = options.findById(req.optionId()).orElseThrow(() -> new IllegalArgumentException(getMsg("option.not.found"))); 
        if (!opt.getPoll().getId().equals(pollId)) throw new IllegalArgumentException(getMsg("option.not.in.poll")); 

        var existing = votes.findByPollIdAndUserId(pollId, userId);
        if (existing.isPresent()) {
            var v = existing.get();
            v.setOption(opt);
            votes.save(v);
        } else {
            Vote v = new Vote();
            v.setPoll(p);
            v.setOption(opt);
            v.setUser(users.findById(userId).orElseThrow());
            v.setWeight(1);
            votes.save(v);
        }
    }

    public List<OptionResult> results(Long pollId) {
        Poll p = polls.findById(pollId).orElseThrow(() -> new IllegalArgumentException(getMsg("poll.not.found"))); 
        return options.findAll().stream()
                .filter(o -> o.getPoll().getId().equals(p.getId()))
                .map(o -> {
                    var movie = movieService.byId(o.getMovie().getTmdbId());
                    return new OptionResult(
                        o.getId(),
                        o.getMovie().getTmdbId(),
                        movie.title(),
                        votes.countByOptionId(o.getId()));
                })
                .sorted((a,b) -> Long.compare(b.votes(), a.votes()))
                .toList();
    }

    public PollDto getByPublicToken(String token) {
        Poll p = polls.findByPublicToken(token).orElseThrow(() -> new IllegalArgumentException(getMsg("poll.token.invalid"))); 
        return PollDto.of(p);
    }

    @Transactional
    public void close(Long pollId, Long userId) {
        Poll p = polls.findById(pollId).orElseThrow(() -> new IllegalArgumentException(getMsg("poll.not.found"))); 
        ensureMember(p.getGroup().getId(), userId);
        p.setIsOpen(false);
        polls.save(p);
    }

    @Transactional
    public String suggest(SuggestMovieReq req, Long userId) {
        ensureMember(req.groupId(), userId);

        Poll poll = polls.findFirstByGroupIdAndIsOpenTrueOrderByCreatedAtDesc(req.groupId())
                .orElseGet(() -> {
                    Group g = groups.findById(req.groupId()).orElseThrow();
                    Poll newPoll = new Poll();
                    newPoll.setGroup(g);
                    newPoll.setTitle(getMsg("poll.default.title")); 
                    newPoll.setDescription(getMsg("poll.default.desc")); 
                    newPoll.setIsOpen(true);
                    newPoll.setAllowAddOptions(true);
                    newPoll.setCreatedBy(users.findById(userId).orElse(null));
                    newPoll.setPublicToken(Long.toHexString(System.nanoTime()));
                    return polls.save(newPoll);
                });

        movieService.byId(req.tmdbId());
        Movie m = movies.findByTmdbId(req.tmdbId()).orElseThrow();

        if (options.existsByPollIdAndMovieId(poll.getId(), m.getId())) {
            return "exists";
        }

        PollOption po = new PollOption();
        po.setPoll(poll);
        po.setMovie(m);
        po.setLabel(req.title());
        po.setAddedBy(users.findById(userId).orElse(null));
        options.save(po);

        return "added";
    }

    @Transactional(readOnly = true)
    public PollDetailDto getActivePoll(Long groupId, Long userId) {
        ensureMember(groupId, userId);

        Poll poll = polls.findFirstByGroupIdAndIsOpenTrueOrderByCreatedAtDesc(groupId)
                .orElseThrow(() -> new IllegalArgumentException(getMsg("poll.active.not.found"))); 

        List<PollOption> pollOptions = options.findAll().stream()
                .filter(o -> o.getPoll().getId().equals(poll.getId()))
                .toList();


        Long myVotedOptionId = votes.findByPollIdAndUserId(poll.getId(), userId)
                .map(v -> v.getOption().getId())
                .orElse(null);

        List<PollOptionDto> optionDtos = pollOptions.stream().map(o -> {
                    long count = votes.countByOptionId(o.getId());
                    boolean isVoted = o.getId().equals(myVotedOptionId);
                    var movie = movieService.byId(o.getMovie().getTmdbId());

                    return new PollOptionDto(
                            o.getId(),
                            o.getMovie().getTmdbId(),
                            movie.title(),
                            movie.posterPath(),
                            movie.releaseYear(),
                            o.getAddedBy() != null ? o.getAddedBy().getDisplayName() : getMsg("user.anonymous"),
                            count,
                            isVoted
                    );
                }).sorted((a, b) -> Long.compare(b.voteCount(), a.voteCount()))
                .toList();

        return new PollDetailDto(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getIsOpen(),
                poll.getPublicToken(),
                optionDtos
        );
    }

    @Transactional
    public void updateDetails(Long pollId, Long userId, String description, LocalDateTime eventTime) {
        Poll p = polls.findById(pollId).orElseThrow();
        ensureMember(p.getGroup().getId(), userId);

        p.setDescription(description);
        p.setOpensAt(eventTime);
        polls.save(p);
    }
}
