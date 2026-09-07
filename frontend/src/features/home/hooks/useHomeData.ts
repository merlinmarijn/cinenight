import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTrending, fetchTopRated, fetchTopMovies, TopMovie } from "@/api/home";
import { searchMovies, PagedMovies, type TmdbMovie } from "@/api/movies";
import { useTranslation } from "react-i18next";

export type TabKey = "trending" | "toprated" | "cinenight";

export type UseHomeDataReturn = ReturnType<typeof useHomeData>;

export function useHomeData(initialLimitTop = 12) {
    const { t } = useTranslation();

    const [q, setQ] = useState("");
    const [active, setActive] = useState<TabKey>("trending");

    // TRENDING state
    const [trend, setTrend] = useState<TmdbMovie[]>([]);
    const [pageTrend, setPageTrend] = useState(0);
    const [totalPagesTrend, setTotalPagesTrend] = useState(1);
    const [loadingTrend, setLoadingTrend] = useState(false);
    const [errTrend, setErrTrend] = useState(false);

    // TOP RATED state
    const [toprated, setToprated] = useState<TmdbMovie[]>([]);
    const [pageTopRated, setPageTopRated] = useState(0);
    const [totalPagesTop, setTotalPagesTop] = useState(1);
    const [loadingTopRated, setLoadingTopRated] = useState(false);
    const [errTopRated, setErrTopRated] = useState(false);

    // TOP CINENIGHT state
    const [topCine, setTopCine] = useState<TopMovie[]>([]);
    const [limitTop, setLimitTop] = useState(initialLimitTop);
    const [loadingTopCine, setLoadingTopCine] = useState(false);
    const [errTopCine, setErrTopCine] = useState(false);

    const [searchResults, setSearchResults] = useState<PagedMovies | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchErr, setSearchErr] = useState<string | null>(null);


    const loadTrending = useCallback(async (append = false, pageNum = 1) => {
        setLoadingTrend(true);
        setErrTrend(false);
        try {
            const data = await fetchTrending(pageNum);
            setTrend((prev) => (append ? [...prev, ...data.results] : data.results));
            setPageTrend(data.page);
            setTotalPagesTrend(data.total_pages);
        } catch {
            setErrTrend(true);
        } finally {
            setLoadingTrend(false);
        }
    }, []);

    const loadTopRated = useCallback(async (append = false, pageNum = 1) => {
        setLoadingTopRated(true);
        setErrTopRated(false);
        try {
            const data = await fetchTopRated(pageNum);
            setToprated((prev) => (append ? [...prev, ...data.results] : data.results));
            setPageTopRated(data.page);
            setTotalPagesTop(data.total_pages);
        } catch {
            setErrTopRated(true);
        } finally {
            setLoadingTopRated(false);
        }
    }, []);

    const loadTopCine = useCallback(async (limit: number) => {
        setLimitTop(limit);
        setLoadingTopCine(true);
        setErrTopCine(false);
        try {
            const data = await fetchTopMovies(limit);
            setTopCine(data);
        } catch {
            setErrTopCine(true);
        } finally {
            setLoadingTopCine(false);
        }
    }, []);

    const performSearch = useCallback(async (query: string) => {
        if (query.trim().length === 0) {
            setSearchResults(null);
            return;
        }
        setIsSearching(true);
        setSearchErr(null);
        try {
            const resp = await searchMovies(query, 1);
            if(resp.ok) {
                setSearchResults(resp.data);
            } else {
                setSearchErr(resp.error || t('errors.search_failed'));
            }
        } catch (e: unknown) {
            const msg =
                e instanceof Error
                    ? e.message
                    : typeof e === "string"
                        ? e
                        : t('errors.search_error');
            setSearchErr(msg);
        } finally {
            setIsSearching(false);
        }
    }, [t]);

    useEffect(() => {
        const handler = setTimeout(() => {
            performSearch(q);
        }, 300); // 300ms bekle

        return () => {
            clearTimeout(handler);
        };
    }, [q, performSearch]);


    useEffect(() => {
        loadTrending(false, 1);
        loadTopRated(false, 1);
        loadTopCine(initialLimitTop);
    }, [loadTrending, loadTopRated, loadTopCine, initialLimitTop]);

    const featured = useMemo(() => trend[0] ?? toprated[0] ?? null, [trend, toprated]);

    const loadingKey = useMemo(() => {
        if (active === "trending" && loadingTrend) return "trending";
        if (active === "toprated" && loadingTopRated) return "toprated";
        if (active === "cinenight" && loadingTopCine) return "cinenight";
        return null;
    }, [active, loadingTrend, loadingTopRated, loadingTopCine]);

    const errKey = useMemo(() => {
        if (active === "trending" && errTrend) return "trending";
        if (active === "toprated" && errTopRated) return "toprated";
        if (active === "cinenight" && errTopCine) return "cinenight";
        return null;
    }, [active, errTrend, errTopRated, errTopCine]);


    return {
        q, setQ,
        active, setActive,
        featured,
        trend,
        toprated,
        topCine,
        pageTrend, totalPagesTrend,
        pageTopRated, totalPagesTop,
        limitTop,
        loadMoreTrending: () => loadTrending(true, pageTrend + 1),
        loadMoreTopRated: () => loadTopRated(true, pageTopRated + 1),
        loadTopCine,
        searchResults, isSearching, searchErr,
        loadingKey, errKey,
        loadTrending,
        loadTopRated,
    }
}
