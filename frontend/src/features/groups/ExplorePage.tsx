import { useEffect, useState } from 'react';
import { fetchExploreGroups, joinGroup, type GroupDto } from '@/api/groups';
import { UserPlus, Loader2, Globe, Calendar, MapPin, Laptop, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { me } from '@/api/auth';
import { useTranslation } from 'react-i18next';

export default function ExplorePage() {
    const [groups, setGroups] = useState<GroupDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        async function load() {
            const res = await fetchExploreGroups();
            if (res.ok && res.data) {
                setGroups(res.data);
            }
            setLoading(false);
        }
        load();
    }, []);

    const handleJoin = async (group: GroupDto) => {
        setJoiningId(group.id);

        // Check whether the user is signed in
        const userRes = await me();
        if (!userRes.ok) {
            navigate(`/login?redirect=/explore`);
            return;
        }

        // Send the join request
        const res = await joinGroup(group.id);

        if (res.ok) {
            navigate(`/groups/${group.id}`);
        } else {
            alert(res.error || t('errors.join_failed'));
            setJoiningId(null);
        }
    };

    // Parse the description text
    const parseDescription = (desc: string = "") => {
        const lines = desc.split('\n');
        // Descriptions created by the legacy modal contain emoji markers
        const isFormatted = desc.includes('🌐') || desc.includes('📍');

        if (!isFormatted) {
            return { type: 'GENERAL', text: desc };
        }

        return {
            type: lines[0] || "",
            date: lines[1] || "",
            location: lines[2] || "",
            note: lines.slice(3).join(" ") || ""
        };
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
            <div className="text-center py-8">
                <h1 className="text-4xl font-bold text-white mb-2">{t('groups.explore.title')}</h1>
                <p className="text-gray-400 max-w-xl mx-auto">
                    {t('groups.explore.subtitle')}
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(g => {
                        const info = parseDescription(g.description);
                        const isGeneral = info.type === 'GENERAL';

                        return (
                            <div key={g.id} className="group relative flex flex-col rounded-2xl border border-white/10 bg-gray-900/60 p-6 hover:bg-gray-900 transition-all hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10">
                                {/* Header labels */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                    <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-wider">
                                        {g.visibility}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-3">{g.name}</h3>

                                {/* Information rows */}
                                <div className="space-y-2 mb-6 text-sm text-gray-400">
                                    {isGeneral ? (
                                        // Plain-text mode
                                        <div className="flex items-start gap-2">
                                            <Info className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                                            <p className="line-clamp-3 leading-relaxed">{info.text || t('groups.common.no_description')}</p>
                                        </div>
                                    ) : (
                                        // Structured mode
                                        <>
                                            {info.type && (
                                                <div className="flex items-center gap-2">
                                                    {info.type.includes("Online") ? <Laptop className="h-4 w-4 text-sky-400" /> : <MapPin className="h-4 w-4 text-rose-400" />}
                                                    <span className="text-gray-300">{info.type}</span>
                                                </div>
                                            )}
                                            {info.date && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-indigo-400" />
                                                    <span>{info.date.replace('📅 ', '').replace('⏰ ', '')}</span>
                                                </div>
                                            )}
                                            {info.note && (
                                                <p className="text-xs text-gray-500 line-clamp-2 mt-2 italic border-t border-white/5 pt-2">
                                                    "{info.note.replace(/^📝 (?:Note|Not): /, '')}"
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleJoin(g)}
                                    disabled={joiningId === g.id}
                                    className="mt-auto w-full py-3 rounded-xl bg-white/5 hover:bg-indigo-600 hover:text-white text-gray-300 font-bold transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-transparent group-active:scale-95"
                                >
                                    {joiningId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    {t('groups.explore.join_button')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && groups.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <p>{t('groups.explore.no_groups')}</p>
                </div>
            )}
        </div>
    );
}
