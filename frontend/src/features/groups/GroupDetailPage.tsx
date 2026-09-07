import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchActivePoll, castVote, type PollDetailDto } from '@/api/polls';
import { fetchGroupEvents, rsvpEvent, type EventDto } from '@/api/events';
import { fetchMyGroups, deleteGroup, leaveGroup } from '@/api/groups';
import { ChevronLeft, Loader2, Share2, Check, Calendar, MapPin, Film, X, Trophy, Clock, Settings, Trash2, LogOut } from 'lucide-react';
import MovieDetailModal from '@/components/MovieDetailModal';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import CreateEventModal from './components/CreateEventModal';
import MembersModal from './components/MembersModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useTranslation } from 'react-i18next';

const IMG = "https://image.tmdb.org/t/p";

export default function GroupDetailPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const dateLocale = enUS;

    // --- State ---
    const [poll, setPoll] = useState<PollDetailDto | null>(null);
    const [events, setEvents] = useState<EventDto[]>([]);
    const [role, setRole] = useState<string>('MEMBER');
    const [loading, setLoading] = useState(true);

    // --- Actions ---
    const [votingId, setVotingId] = useState<number | null>(null);
    const [rsvpLoading, setRsvpLoading] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    // --- Modals ---
    const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);

    // Delete and leave confirmation modals
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaveLoading, setLeaveLoading] = useState(false);

    const [inviteToken, setInviteToken] = useState<string | null>(null);

    // Load data
    const loadData = async () => {
        if (!groupId) return;
        try {
            // Fetch data in parallel
            const [pollRes, eventsRes, groupsRes] = await Promise.all([
                fetchActivePoll(Number(groupId)),
                fetchGroupEvents(Number(groupId)),
                fetchMyGroups()
            ]);

            if (pollRes.ok) {
                setPoll(pollRes.data);
            } else {
                setPoll(null);
            }

            if (eventsRes.ok && eventsRes.data) setEvents(eventsRes.data);

            // Find the current user's role in this group
            if (groupsRes.ok && groupsRes.data) {
                const currentGroup = groupsRes.data.find(g => g.id === Number(groupId));
                if (currentGroup) {
                    setRole(currentGroup.role);
                    setInviteToken(currentGroup.inviteToken);
                }
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [groupId]);

    // Oy Kullanma
    const handleVote = async (optionId: number) => {
        if (!poll) return;
        setVotingId(optionId);
        const res = await castVote(poll.id, optionId);

        if (res.ok) {
            const pollRes = await fetchActivePoll(Number(groupId));
            if (pollRes.ok && pollRes.data) setPoll(pollRes.data);
        }
        setVotingId(null);
    };

    // RSVP status
    const handleRsvp = async (eventId: number, status: 'YES' | 'NO') => {
        setRsvpLoading(eventId);
        await rsvpEvent(eventId, status);
        const eventsRes = await fetchGroupEvents(Number(groupId));
        if (eventsRes.ok && eventsRes.data) setEvents(eventsRes.data);
        setRsvpLoading(null);
    };

    // Delete the group (owner only)
    const handleDeleteGroup = async () => {
        setDeleteLoading(true);
        const res = await deleteGroup(Number(groupId));
        if (res.ok) {
            navigate('/dashboard');
        } else {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
            alert(res.error || t('errors.group_delete_failed'));
        }
    };

    // Leave the group (members only)
    const handleLeaveGroup = async () => {
        setLeaveLoading(true);
        const res = await leaveGroup(Number(groupId));
        if (res.ok) {
            navigate('/dashboard');
        } else {
            setLeaveLoading(false);
            setShowLeaveConfirm(false);
            alert(res.error || t('errors.group_leave_failed'));
        }
    };

    const handleCopyInvite = () => {
        if (!inviteToken) return;
        const link = `${window.location.origin}/join/${inviteToken}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const winners = poll && poll.options.length > 0
        ? poll.options.filter(o => o.voteCount === poll.options[0].voteCount && o.voteCount > 0)
        : [];

    const isTie = winners.length > 1;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4 md:px-8">

            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 pt-4">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white transition border border-white/5">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{t('groups.detail.title')}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {role === 'OWNER' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-500/30">{t('groups.roles.owner').toUpperCase()}</span>}
                            <span className="text-gray-400 text-sm">{t('groups.detail.subtitle')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Owner delete action */}
                    {role === 'OWNER' && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition border border-red-500/20"
                            title={t('modals.delete_group.title')}
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}

                    {/* Member leave action */}
                    {role !== 'OWNER' && (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition border border-red-500/20"
                            title={t('modals.leave_group.title')}
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    )}

                    <button
                        onClick={() => setShowMembersModal(true)}
                        className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/10"
                        title={t('modals.members.title')}
                    >
                        <Settings className="h-5 w-5" />
                    </button>

                    <button
                        onClick={handleCopyInvite}
                        className="group flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-sm font-semibold border border-indigo-500/20 hover:border-indigo-500 shadow-lg shadow-indigo-500/5"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                        {copied ? t('groups.detail.invite_copied') : t('groups.detail.invite_button')}
                    </button>
                </div>
            </div>

            {/* Events */}
            {events.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold uppercase tracking-wider text-sm">
                        <Calendar className="h-4 w-4" />
                        {t('groups.detail.scheduled_events')}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                        {events.map(evt => (
                            <div key={evt.id} className="relative group overflow-hidden rounded-3xl border border-white/10 bg-gray-900 shadow-2xl hover:shadow-emerald-900/20 hover:border-emerald-500/30 transition-all duration-300">
                                {/* Dekoratif Arkaplan */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-transparent opacity-50 pointer-events-none" />

                                <div className="p-6 flex flex-col h-full relative z-10">
                                    {/* Tarih ve Durum */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center justify-center bg-gray-800/80 border border-white/10 rounded-xl p-2 min-w-[3.5rem]">
                                                <span className="text-xs font-bold text-gray-400 uppercase">
                                                    {format(new Date(evt.startTime), 'MMM', { locale: dateLocale })}
                                                </span>
                                                <span className="text-xl font-bold text-white">
                                                    {format(new Date(evt.startTime), 'dd')}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-white font-semibold flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                                                    {format(new Date(evt.startTime), 'HH:mm')}
                                                </div>
                                                <div className="text-xs text-gray-400 capitalize">
                                                    {format(new Date(evt.startTime), 'EEEE', { locale: dateLocale })}
                                                </div>
                                            </div>
                                        </div>
                                        {/* RSVP badge */}
                                        {evt.myRsvp === 'YES' && <span className="px-2 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold shadow-lg">{t('groups.detail.coming_badge')}</span>}
                                        {evt.myRsvp === 'NO' && <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">{t('groups.detail.not_coming_badge')}</span>}
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 leading-snug break-words">
                                        {evt.title}
                                    </h3>

                                    <div className="space-y-2 mb-6">
                                        {evt.movieTitle && (
                                            <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/20 w-fit px-2 py-1 rounded-md border border-indigo-500/20">
                                                <Film className="h-3.5 w-3.5" />
                                                <span className="truncate max-w-[200px]">{evt.movieTitle}</span>
                                            </div>
                                        )}
                                        {evt.locationText && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{evt.locationText}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Participant list */}
                                    {evt.participants && evt.participants.length > 0 && (
                                        <div className="flex items-center gap-2 mb-6 pt-4 border-t border-white/5">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {evt.participants.map(p => (
                                                    <div
                                                        key={p.userId}
                                                        className="inline-flex h-8 w-8 rounded-full ring-2 ring-gray-900 bg-gray-700 items-center justify-center text-xs font-bold text-white cursor-help"
                                                        title={p.displayName}
                                                    >
                                                        {p.avatarUrl ? (
                                                            <img src={p.avatarUrl} alt={p.displayName} className="h-full w-full rounded-full object-cover" />
                                                        ) : (
                                                            p.displayName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500 ml-1 font-medium">{t('groups.detail.coming_count')}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            onClick={() => handleRsvp(evt.id, 'YES')}
                                            disabled={rsvpLoading === evt.id}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 ${evt.myRsvp === 'YES' ? 'bg-emerald-600 text-white cursor-default' : 'bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-300 border border-white/5'}`}
                                        >
                                            <Check className="h-4 w-4" /> {t('groups.detail.btn_coming')}
                                        </button>
                                        <button
                                            onClick={() => handleRsvp(evt.id, 'NO')}
                                            disabled={rsvpLoading === evt.id}
                                            className={`px-4 rounded-xl text-sm font-medium transition ${evt.myRsvp === 'NO' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 border border-white/5'}`}
                                            title={t('groups.detail.btn_not_coming')}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Divider */}
            {events.length > 0 && poll && <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />}

            {/* Poll */}
            {poll ? (
                <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-400 font-semibold uppercase tracking-wider text-sm mb-1">
                                <span className="text-lg">🗳️</span>
                                {poll.isOpen ? t('groups.poll.status_open') : t('groups.poll.status_closed')}
                            </div>
                            <h2 className="text-2xl font-bold text-white">{poll.title}</h2>
                        </div>
                    </div>

                    {/* Leader panel and owner planning action */}
                    {poll.isOpen && winners.length > 0 && role === 'OWNER' && (
                        <div className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl ${isTie ? 'bg-amber-900/20 border-amber-500/30' : 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-indigo-500/30'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg ${isTie ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                                    <Trophy className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isTie ? 'text-amber-400' : 'text-indigo-200'}`}>
                                        {isTie ? t('groups.poll.tie_title') : t('groups.poll.leader_title')}
                                    </div>
                                    <div className="text-white font-bold text-2xl leading-none">
                                        {isTie ? t('groups.poll.tie_count', { count: winners.length }) : winners[0].title}
                                    </div>
                                    <div className="text-gray-400 text-sm mt-1">{t('groups.poll.vote_count', { count: winners[0].voteCount })}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowEventModal(true)}
                                className={`relative z-10 px-6 py-3 rounded-xl font-bold text-sm transition shadow-xl hover:shadow-white/10 whitespace-nowrap flex items-center gap-2 ${isTie ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-white hover:bg-gray-100 text-indigo-900'}`}
                            >
                                <Calendar className="h-4 w-4" />
                                {isTie ? t('groups.poll.resolve_tie') : t('groups.poll.end_and_plan')}
                            </button>
                        </div>
                    )}

                    {/* Movie grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {poll.options.map((opt) => {
                            const isWinner = winners.some(w => w.id === opt.id);

                            return (
                                <div
                                    key={opt.id}
                                    className={`relative group flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 bg-gray-900 ${
                                        opt.isVotedByMe
                                            ? 'border-indigo-500 shadow-[0_0_25px_-5px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/50 scale-[1.02] z-10'
                                            : 'border-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl'
                                    }`}
                                >
                                    {/* Poster */}
                                    <div
                                        className="aspect-[2/3] w-full relative overflow-hidden cursor-pointer bg-gray-800"
                                        onClick={() => setSelectedMovieId(opt.tmdbId)}
                                    >
                                        {opt.posterPath ? (
                                            <img
                                                src={`${IMG}/w500${opt.posterPath}`}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={opt.title}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                                                <Film className="h-12 w-12" />
                                            </div>
                                        )}

                                        {/* Shadow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />

                                        {/* Lider Badge */}
                                        {isWinner && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <div className={`text-white text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1 backdrop-blur-md ${isTie ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                                    <Trophy className="h-3 w-3" /> {isTie ? 'LEADER' : '#1'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Detaylar Hover */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="text-white text-xs font-bold border border-white/40 px-4 py-2 rounded-full bg-black/50 hover:bg-white hover:text-black transition-colors">
                                                Details
                                            </span>
                                        </div>
                                    </div>

                                    {/* Kart Alt Bilgi */}
                                    <div className="p-4 flex-1 flex flex-col relative">
                                        <div className="absolute -top-10 left-4 right-4 text-shadow-sm pointer-events-none">
                                            <div className="flex items-center gap-1.5 text-white/90 font-bold text-lg">
                                                <span className="text-yellow-400 drop-shadow-md">★</span>
                                                {opt.voteCount}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-gray-100 text-sm leading-tight line-clamp-2 mb-2 min-h-[2.5rem]" title={opt.title}>
                                            {opt.title}
                                        </h3>

                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                            <span>{opt.releaseYear || 'N/A'}</span>
                                            <span className="flex items-center gap-1 truncate max-w-[80px]" title={opt.addedBy}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                {opt.addedBy}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleVote(opt.id)}
                                            disabled={votingId !== null || !poll.isOpen}
                                            className={`mt-auto w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                                                opt.isVotedByMe
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 cursor-default'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/20'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {votingId === opt.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : opt.isVotedByMe ? (
                                                <><Check className="h-3.5 w-3.5" /> {t('groups.poll.voted')}</>
                                            ) : (
                                                t('groups.poll.vote')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ) : (
                // Empty state: no events or poll
                events.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-gray-900/30 rounded-3xl border border-dashed border-gray-700 text-center">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 text-gray-600">
                            <Film className="h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{t('groups.detail.empty_state_title')}</h3>
                        <p className="text-gray-400 mb-8 max-w-md">{t('groups.detail.empty_state_desc')}</p>
                        <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 hover:-translate-y-1">
                            <Film className="h-5 w-5" />
                            {t('groups.detail.suggest_start')}
                        </Link>
                    </div>
                )
            )}

            {/* --- Modals --- */}
            {selectedMovieId && (
                <MovieDetailModal
                    tmdbId={selectedMovieId}
                    onClose={() => setSelectedMovieId(null)}
                />
            )}

            {showEventModal && poll && (
                <CreateEventModal
                    groupId={Number(groupId)}
                    pollId={poll.id}
                    movies={winners}
                    onClose={() => setShowEventModal(false)}
                    onSuccess={() => {
                        loadData();
                        setPoll(prev => prev ? { ...prev, isOpen: false } : null);
                    }}
                />
            )}

            {showMembersModal && (
                <MembersModal
                    groupId={Number(groupId)}
                    isOwner={role === 'OWNER'}
                    onClose={() => setShowMembersModal(false)}
                />
            )}

            {/* Delete confirmation */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteGroup}
                title={t('modals.delete_group.title')}
                description={t('modals.delete_group.desc')}
                confirmText={t('modals.delete_group.confirm')}
                cancelText={t('common.cancel')}
                variant="danger"
                loading={deleteLoading}
            />

            {/* Leave confirmation */}
            <ConfirmModal
                isOpen={showLeaveConfirm}
                onClose={() => setShowLeaveConfirm(false)}
                onConfirm={handleLeaveGroup}
                title={t('modals.leave_group.title')}
                description={t('modals.leave_group.desc')}
                confirmText={t('modals.leave_group.confirm')}
                cancelText={t('common.cancel')}
                variant="danger"
                loading={leaveLoading}
            />
        </div>
    );
}
