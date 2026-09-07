import { useState } from "react";
import MoviesTabs from "./components/MoviesTabs";
import MoviesGrid from "./components/MoviesGrid";
import HomeHero from "./components/HomeHero";
import { useHomeData } from "./hooks/useHomeData";
import MovieDetailModal from "@/components/MovieDetailModal";

export default function HomePage() {
    const h = useHomeData();
    const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);

    const handleMovieClick = (tmdbId: number) => {
        setSelectedMovieId(tmdbId);
    };

    const handleCloseModal = () => {
        setSelectedMovieId(null);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
            <HomeHero
                featured={h.featured}
                q={h.q}
                onQueryChange={h.setQ}
                isSearching={h.isSearching}
                searchErr={h.searchErr}
                searchResults={h.searchResults}
                onRetrySearch={() => h.setQ(h.q)}
                onMovieClick={handleMovieClick}
            />

            <section id="tabs" className="space-y-4">
                <MoviesTabs
                    active={h.active}
                    onChange={h.setActive}
                    onLoadMore={() => {
                        if (h.active === "trending") h.loadMoreTrending();
                        else if (h.active === "toprated") h.loadMoreTopRated();
                    }}
                    canLoadMore={
                        (h.active === "trending" && h.pageTrend < h.totalPagesTrend) ||
                        (h.active === "toprated" && h.pageTopRated < h.totalPagesTop)
                    }
                    limitTop={h.limitTop}
                    onChangeLimit={(v) => h.loadTopCine(v)}
                    onRefreshTop={() => h.loadTopCine(h.limitTop)}
                />

                {h.active === "trending" && (
                    <MoviesGrid
                        items={h.trend}
                        variant="tmdb"
                        loading={h.loadingKey === "trending"}
                        error={h.errKey === "trending"}
                        onRetry={() => h.loadTrending(false, 1)}
                        onMovieClick={handleMovieClick}
                    />
                )}
                {h.active === "toprated" && (
                    <MoviesGrid
                        items={h.toprated}
                        variant="tmdb"
                        loading={h.loadingKey === "toprated"}
                        error={h.errKey === "toprated"}
                        onRetry={() => h.loadTopRated(false, 1)}
                        onMovieClick={handleMovieClick}
                    />
                )}
                {h.active === "cinenight" && (
                    <MoviesGrid
                        items={h.topCine}
                        variant="top"
                        loading={h.loadingKey === "cinenight"}
                        error={h.errKey === "cinenight"}
                        onRetry={() => h.loadTopCine(h.limitTop)}
                        emptyText="No movies have received activity yet. A few votes or views will fill this section."
                        onMovieClick={handleMovieClick}
                    />
                )}
            </section>

            {selectedMovieId && (
                <MovieDetailModal
                    tmdbId={selectedMovieId}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}
