import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, Users, Check, ChevronRight, Info } from "lucide-react";
import { MoviesApi, type MovieDto } from "@/api/movies";
import { fetchMyGroups, type GroupDto } from "@/api/groups";
import { suggestMovie } from "@/api/polls";
import { useTranslation } from "react-i18next";

const IMG_BASE = "https://image.tmdb.org/t/p";

function languageName(code: string) {
    try {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
}

type Props = {
    tmdbId: number;
    onClose: () => void;
};

type Mode = 'DETAIL' | 'SELECT_GROUP' | 'SUCCESS' | 'EXISTS';

export default function MovieDetailModal({ tmdbId, onClose }: Props) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<Mode>('DETAIL');

    // Data
    const [movie, setMovie] = useState<MovieDto | null>(null);
    const [groups, setGroups] = useState<GroupDto[]>([]);

    // Loading/Error State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Load the movie
    useEffect(() => {
        async function fetchDetails() {
            setLoading(true);
            setError(null);

            const res = await MoviesApi.byId(tmdbId);

            if (res.ok) {
                setMovie(res.data);
            } else {
                setError(res.error || t('movie.details_error'));
            }
            setLoading(false);
        }
        fetchDetails();
    }, [tmdbId, t]);

    // Load groups
    const handleStartSuggest = async () => {
        setActionLoading(true);
        const res = await fetchMyGroups();
        setActionLoading(false);

        if (res.ok) {
            setGroups(res.data);
            setMode('SELECT_GROUP');
        } else {
            alert(t('errors.groups_load_failed'));
        }
    };

    // Send the selected group to the backend
    const handleSelectGroup = async (groupId: number) => {
        if (!movie) return;
        setActionLoading(true);

        const res = await suggestMovie(groupId, movie.tmdbId, movie.title);

        setActionLoading(false);

        if (res.ok) {
            if (res.data === 'exists') {
                setMode('EXISTS');
            } else {
                setMode('SUCCESS');
            }

            setTimeout(() => onClose(), 1500);
        } else {
            alert(res.error || t('errors.action_failed'));
        }
    };

    const posterUrl = movie?.posterPath ? `${IMG_BASE}/w500${movie.posterPath}` : "/no-poster.svg";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="card relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition"
                >
                    <X className="h-5 w-5" />
                </button>

                {loading && (
                    <div className="flex h-80 items-center justify-center text-gray-400 gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>{t('movie.loading_details')}</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex h-80 flex-col items-center justify-center text-red-400 gap-2 p-6 text-center">
                        <AlertCircle className="h-8 w-8" />
                        <p>{error}</p>
                    </div>
                )}

                {!loading && movie && (
                    <div className="flex flex-col md:flex-row h-full">
                        <div className="w-full md:w-2/5 h-64 md:h-auto relative bg-gray-900">
                            <img
                                src={posterUrl}
                                alt={movie.title}
                                className="absolute inset-0 w-full h-full object-cover opacity-90"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent md:bg-gradient-to-r" />
                        </div>

                        <div className="flex-1 p-6 flex flex-col bg-gray-900">

                            {/* Movie details */}
                            {mode === 'DETAIL' && (
                                <>
                                    <div className="flex-1 overflow-y-auto">
                                        <h2 className="text-2xl font-bold text-white mb-2">{movie.title}</h2>
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-4">
                                            {movie.releaseYear && <span>📅 {movie.releaseYear}</span>}
                                            {movie.language && <span>🗣️ {languageName(movie.language)}</span>}
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {movie.description || t('movie.no_description')}
                                        </p>
                                    </div>

                                    <div className="pt-6 mt-4 border-t border-white/10">
                                        <button
                                            onClick={handleStartSuggest}
                                            disabled={actionLoading}
                                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {actionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Users className="h-5 w-5" />}
                                            {t('modals.movie_detail.suggest_button')}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Group selection */}
                            {mode === 'SELECT_GROUP' && (
                                <div className="flex flex-col h-full">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-white">{t('modals.movie_detail.select_group_title')}</h3>
                                        <p className="text-sm text-gray-400">{t('modals.movie_detail.select_group_desc')}</p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
                                        {groups.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                {t('modals.movie_detail.no_groups')} <br />
                                                <span className="text-xs">{t('modals.movie_detail.no_groups_hint')}</span>
                                            </div>
                                        ) : (
                                            groups.map(g => (
                                                <button
                                                    key={g.id}
                                                    disabled={actionLoading}
                                                    onClick={() => handleSelectGroup(g.id)}
                                                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-white/5 transition text-left group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                                            <Users className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-200">{g.name}</div>
                                                            <div className="text-xs text-gray-500">{g.role}</div>
                                                        </div>
                                                    </div>
                                                    {actionLoading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-white transition" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        <button
                                            onClick={() => setMode('DETAIL')}
                                            className="w-full py-2 text-sm text-gray-400 hover:text-white transition"
                                        >
                                            {t('common.back')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Success */}
                            {mode === 'SUCCESS' && (
                                <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                                        <Check className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t('modals.movie_detail.success_title')}</h3>
                                    <p className="text-gray-400 mt-2">{t('modals.movie_detail.success_desc')}</p>
                                </div>
                            )}

                            {/* MOD 4: Zaten Var */}
                            {mode === 'EXISTS' && (
                                <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                                        <Info className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{t('modals.movie_detail.exists_title')}</h3>
                                    <p className="text-gray-400 mt-2">{t('modals.movie_detail.exists_desc')}</p>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
