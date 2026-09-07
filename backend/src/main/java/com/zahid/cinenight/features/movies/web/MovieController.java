package com.zahid.cinenight.features.movies.web;

import com.zahid.cinenight.common.api.ApiResponse;
import com.zahid.cinenight.features.movies.service.MovieService;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/movies")
public class MovieController {

    private final MovieService service;
    public MovieController(MovieService service) { this.service = service; }

    @GetMapping("/{tmdbId}")
    public ApiResponse<MovieService.MovieDto> byId(@PathVariable int tmdbId) {
        return ApiResponse.ok(service.byId(tmdbId));
    }

    @GetMapping("/search")
    public ApiResponse<MovieService.PagedMovies> search(@RequestParam String q,
                                                        @RequestParam(defaultValue = "1") int page) {
        return ApiResponse.ok(service.search(q, page));
    }

    @GetMapping("/trending")
    public ApiResponse<MovieService.PagedMovies> trending(@RequestParam(defaultValue = "1") int page) {
        return ApiResponse.ok(service.trending(page));
    }

    @PostMapping("/{tmdbId}/view")
    public ApiResponse<Void> view(@PathVariable int tmdbId,
                                  HttpServletRequest req) {
        service.recordView(tmdbId, req.getRemoteAddr(), req.getHeader("User-Agent"));
        return ApiResponse.ok(null);
    }

    @PostMapping("/{tmdbId}/vote")
    public ApiResponse<Void> vote(@PathVariable int tmdbId,
                                  @RequestParam byte rating) {
        service.rate(tmdbId, rating);
        return ApiResponse.ok(null);
    }

}
