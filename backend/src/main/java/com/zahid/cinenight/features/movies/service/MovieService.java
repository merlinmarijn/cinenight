package com.zahid.cinenight.features.movies.service;

import com.zahid.cinenight.features.movies.domain.*;
import com.zahid.cinenight.features.movies.dto.TmdbGenre;
import com.zahid.cinenight.features.movies.dto.TmdbMovie;
import com.zahid.cinenight.features.movies.dto.TmdbMoviePage;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static java.util.Objects.nonNull;

@Service
public class MovieService {

    public record MovieDto(Long id, Integer tmdbId, String title, String posterPath,
                           String backdropPath, String language, Short releaseYear,
                           String description
    ) {
        public static MovieDto from(Movie m) {
            return new MovieDto(
                    m.getId(), m.getTmdbId(), m.getTitle(), m.getPosterPath(),
                    m.getBackdropPath(), m.getLanguage(), m.getReleaseYear(), m.getDescription()
            );
        }
    }

    public record PagedMovies(int page, int totalPages, List<MovieDto> results) {}

    private final TmdbClient tmdb;
    private final MovieRepository movies;
    private final GenreService genreService;
    private final MovieViewRepository views;
    private final MovieVoteRepository votes;
    private final MessageSource messageSource;

    @Autowired
    @Lazy
    private MovieService self;

    public MovieService(TmdbClient tmdb, MovieRepository movies, GenreService genreService,
                        MovieViewRepository views, MovieVoteRepository votes, MessageSource messageSource) {
        this.tmdb = tmdb;
        this.movies = movies;
        this.genreService = genreService;
        this.views = views;
        this.votes = votes;
        this.messageSource = messageSource;
    }

    private String getMsg(String key) {
        return messageSource.getMessage(key, null, LocaleContextHolder.getLocale());
    }

    @Cacheable(value = "movieById", key = "#tmdbId")
    public MovieDto byId(int tmdbId) {
        try {
            TmdbMovie tm = tmdb.movieDetail(tmdbId);

            return MovieDto.from(self.upsertFromTmdb(tm));
        } catch (Exception e) {
            return movies.findByTmdbId(tmdbId)
                    .map(MovieDto::from)
                    .orElseThrow(() -> new IllegalStateException(getMsg("movie.load.failed"), e));
        }
    }

    @Cacheable(value = "movieSearch", key = "#q+'|'+#page")
    public PagedMovies search(String q, int page) {
        TmdbMoviePage res = tmdb.search(q, page);
        var saved = res.results().stream().map(self::upsertFromTmdb).toList();
        return new PagedMovies(res.page(), res.total_pages(), saved.stream().map(MovieDto::from).toList());
    }

    @Cacheable(value = "movieTrending", key = "#page")
    public PagedMovies trending(int page) {
        TmdbMoviePage res = tmdb.trending(page);
        var saved = res.results().stream().map(self::upsertFromTmdb).toList();
        return new PagedMovies(res.page(), res.total_pages(), saved.stream().map(MovieDto::from).toList());
    }

    public Movie upsertFromTmdb(TmdbMovie t) {
        int maxRetries = 3;

        for (int i = 0; i < maxRetries; i++) {
            try {
                var existing = self.findMovieSafely(t.id());

                if (existing.isPresent()) {
                    return self.updateAndSave(existing.get(), t);
                } else {
                    return self.createMovieSafely(t);
                }
            } catch (Exception e) {
                if (i == maxRetries - 1) throw e;
                try { Thread.sleep(50); } catch (InterruptedException ignored) {}
            }
        }
        throw new IllegalStateException(getMsg("movie.upsert.failed"));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<Movie> findMovieSafely(Integer tmdbId) {
        return movies.findByTmdbId(tmdbId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Movie createMovieSafely(TmdbMovie t) {
        if (movies.findByTmdbId(t.id()).isPresent()) {
            throw new DataIntegrityViolationException("Exists");
        }
        Movie m = new Movie();
        m.setTmdbId(t.id());
        mapFields(m, t);
        return movies.saveAndFlush(m);
    }

    @Transactional
    public Movie updateAndSave(Movie m, TmdbMovie t) {
        mapFields(m, t);
        return movies.save(m);
    }

    private void mapFields(Movie m, TmdbMovie t) {
        String newTitle = t.title() != null ? t.title() : (t.name() != null ? t.name() : getMsg("movie.title.unknown"));
        m.setTitle(newTitle);
        m.setOriginalTitle(t.original_title());
        m.setDescription(t.overview());

        if (nonNull(t.release_date()) && t.release_date().length() >= 4) {
            try { m.setReleaseYear(Short.parseShort(t.release_date().substring(0, 4))); } catch (Exception ignored) {}
        }
        if (nonNull(t.runtime())) m.setRuntimeMinutes(t.runtime().shortValue());

        m.setPosterPath(t.poster_path());
        m.setBackdropPath(t.backdrop_path());
        m.setLanguage(t.original_language() != null ? t.original_language() : "en");

        if (t.genres() != null && !t.genres().isEmpty()) {
            m.setGenres(t.genres().stream().map(TmdbGenre::name).collect(Collectors.joining(",")));
        } else if (t.genre_ids() != null && !t.genre_ids().isEmpty()) {
            var map = genreService.genreMap();
            m.setGenres(t.genre_ids().stream().map(id -> map.getOrDefault(id, String.valueOf(id))).collect(Collectors.joining(",")));
        }
        m.setFetchedAt(Instant.now());
    }

    public void recordView(int tmdbId, String ip, String ua) {
        try {
            Movie m = self.upsertFromTmdb(tmdb.movieDetail(tmdbId));

            var v = new MovieView(m);
            v.setIp(ip);
            v.setUserAgent(ua);
            views.save(v);
        } catch (Exception e) {
            System.err.println("View record failed: " + e.getMessage());
        }
    }

    public void rate(int tmdbId, byte rating) {
        if (rating < 1 || rating > 10) throw new IllegalArgumentException(getMsg("movie.rating.invalid"));
        Movie m = self.upsertFromTmdb(tmdb.movieDetail(tmdbId));
        var vote = new MovieVote(m, rating);
        votes.save(vote);
    }
}
