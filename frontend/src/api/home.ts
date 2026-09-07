import { apiGet, unwrap } from "./client";
import type { TmdbMovie } from "./movies";

export type TmdbPage<T> = {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
};

export type TopMovie = {
    id: number;
    title: string;
    posterPath?: string;
    score: number;
};

function qs(params: Record<string, string | number | boolean | undefined>) {
    const s = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        s.append(k, String(v));
    });
    const str = s.toString();
    return str ? `?${str}` : "";
}

/** GET /home/trending */
export async function fetchTrending(page = 1) {
    const resp = await apiGet<TmdbPage<TmdbMovie>>(
        `/home/trending${qs({ page })}`
    );
    return unwrap(resp);
}

/** GET /home/top-rated */
export async function fetchTopRated(page = 1) {
    const resp = await apiGet<TmdbPage<TmdbMovie>>(
        `/home/top-rated${qs({ page })}`
    );
    return unwrap(resp);
}

/** GET /home/top-movies */
export async function fetchTopMovies(limit = 12) {
    const resp = await apiGet<TopMovie[]>(`/home/top-movies${qs({ limit })}`);
    return unwrap(resp);
}
