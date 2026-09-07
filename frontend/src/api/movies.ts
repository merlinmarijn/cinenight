import { apiGet, apiPost } from "./client";

export type TmdbGenre = { id: number; name: string };

export type TmdbMovie = {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_language?: string;
    release_date?: string | null;
    runtime?: number | null;
    poster_path?: string | null;
    backdrop_path?: string | null;
    genres?: TmdbGenre[];
    genre_ids?: number[];
    overview?: string;
};

export type TmdbMoviePage = {
    page: number;
    results: TmdbMovie[];
    total_pages: number;
    total_results: number;
};

export type MovieDto = {
    id: number;
    tmdbId: number;
    title: string;
    posterPath?: string | null;
    backdropPath?: string | null;
    language?: string | null;
    releaseYear?: number | null;
    description?: string | null;
};

export type PagedMovies = {
    page: number;
    totalPages: number;
    results: MovieDto[];
};

export type HomeTopMovie = {
    id: number;
    tmdbId: number;
    title: string;
    posterPath: string | null;
    backdropPath: string | null;
    language: string | null;
    releaseYear: number | null;
    voteCount: number;
    avgRating: number;
    viewCount: number;
    score: number;
    description?: string | null;
};

export function tmdbTrending(page = 1) {
    return apiGet<TmdbMoviePage>(`/home/trending?page=${page}`);
}

export function tmdbTopRated(page = 1) {
    return apiGet<TmdbMoviePage>(`/home/top-rated?page=${page}`);
}

export function topMovies(limit = 10) {
    return apiGet<HomeTopMovie[]>(`/home/top-movies?limit=${limit}`);
}

export function byId(tmdbId: number) {
    return apiGet<MovieDto>(`/movies/${tmdbId}`);
}

export function search(q: string, page = 1) {
    return apiGet<PagedMovies>(
        `/movies/search?q=${encodeURIComponent(q)}&page=${page}`
    );
}

export function recordView(tmdbId: number) {
    return apiPost<void>(`/movies/${tmdbId}/view`);
}

export function vote(tmdbId: number, rating: number) {
    return apiPost<void>(`/movies/${tmdbId}/vote?rating=${rating}`);
}

export const MoviesApi = {
    tmdbTrending,
    tmdbTopRated,
    topMovies,
    byId,
    search,
    recordView,
    vote,
};

export const searchMovies = (q: string, page=1) =>
    apiGet<PagedMovies>(`/movies/search?q=${encodeURIComponent(q)}&page=${page}`);

