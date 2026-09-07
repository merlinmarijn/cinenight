package com.zahid.cinenight.features.movies.service;

import com.zahid.cinenight.features.movies.dto.TmdbGenresResponse;
import com.zahid.cinenight.features.movies.dto.TmdbMovie;
import com.zahid.cinenight.features.movies.dto.TmdbMoviePage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class TmdbClient {

    public static final String ENGLISH_LANGUAGE = "en-US";

    private final RestClient rest;
    private final String apiKeyParam;

    public TmdbClient(
            @Value("${tmdb.base-url:https://api.themoviedb.org/3}") String baseUrl,
            @Value("${tmdb.api-key:}") String apiKey
    ) {
        RestClient.Builder b = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);

        if (apiKey != null && !apiKey.isBlank() && looksLikeBearer(apiKey)) {
            b.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
            this.apiKeyParam = null;
        } else {
            // V3 key: query param
            this.apiKeyParam = (apiKey == null || apiKey.isBlank()) ? null : apiKey;
        }
        this.rest = b.build();
    }

    private boolean looksLikeBearer(String key) {
        return key.length() > 40;
    }

    private String withKey(String pathAndQuery) {
        if (apiKeyParam == null) return pathAndQuery;
        return pathAndQuery.contains("?")
                ? pathAndQuery + "&api_key=" + apiKeyParam
                : pathAndQuery + "?api_key=" + apiKeyParam;
    }

    public TmdbMoviePage trending(int page) {
        String uri = withKey("/trending/movie/day?language={lang}&page={page}");
        return rest.get()
                .uri(uri, ENGLISH_LANGUAGE, page)
                .retrieve()
                .body(TmdbMoviePage.class);
    }

    public TmdbMoviePage topRated(int page) {
        String uri = withKey("/movie/top_rated?language={lang}&page={page}");
        return rest.get()
                .uri(uri, ENGLISH_LANGUAGE, page)
                .retrieve()
                .body(TmdbMoviePage.class);
    }

    public TmdbMoviePage search(String q, int page) {
        String uri = withKey("/search/movie?query={q}&language={lang}&page={page}");
        return rest.get()
                .uri(uri, q, ENGLISH_LANGUAGE, page)
                .retrieve()
                .body(TmdbMoviePage.class);
    }

    public TmdbMovie movieDetail(int tmdbId) {
        String uri = withKey("/movie/{id}?language={lang}&append_to_response=credits");
        return rest.get()
                .uri(uri, tmdbId, ENGLISH_LANGUAGE)
                .retrieve()
                .body(TmdbMovie.class);
    }

    public TmdbGenresResponse genres() {
        String uri = withKey("/genre/movie/list?language={lang}");
        return rest.get()
                .uri(uri, ENGLISH_LANGUAGE)
                .retrieve()
                .body(TmdbGenresResponse.class);
    }

}
