import { useEffect, useState } from 'react';
import { fetchMyGroups, type GroupDto } from '@/api/groups';
import { Plus, Users, Shield, User } from 'lucide-react';
import CreateGroupModal from './components/CreateGroupModal';
import {useNavigate} from "react-router-dom";
import { useTranslation } from 'react-i18next';
import type { UserDto } from '@/api/auth';

export default function GroupsPage({ user }: { user: UserDto }) {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<GroupDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { t } = useTranslation();

    const loadGroups = async () => {
        setLoading(true);
        const res = await fetchMyGroups();
        if (res.ok && res.data) {
            setGroups(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadGroups();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header and action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('groups.my_groups.title')}</h1>
                    <p className="text-gray-400 mt-1">{t('groups.my_groups.subtitle')}</p>
                </div>
                {user.canCreateGroups ? <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"><Plus className="h-5 w-5" />{t('groups.my_groups.create_button')}</button> : <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-200">Group creation is a VIP feature unless an admin grants access.</div>}
            </div>

            {/* Loading */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 rounded-xl bg-gray-800/50 animate-pulse border border-white/5" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && groups.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/30 py-20 text-center">
                    <div className="rounded-full bg-gray-800 p-4 mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{t('groups.my_groups.empty_title')}</h3>
                    <p className="mt-2 text-gray-400 max-w-md">
                        {t('groups.my_groups.empty_desc')}
                    </p>
                    {user.canCreateGroups ? <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="mt-6 text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4"
                    >
                        {t('groups.my_groups.create_link')}
                    </button> : null}
                </div>
            )}

            {/* Group list */}
            {!loading && groups.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-gray-900/60 p-6 hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${group.role === 'OWNER' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                        {group.role === 'OWNER' ? <Shield className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                                    {group.role === 'OWNER' ? t('groups.roles.owner') : t('groups.roles.member')}
                                </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{group.name}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2 min-h-[2.5rem]">
                                    {group.description || t('groups.common.no_description')}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-sm text-gray-500">
                                <User className="h-4 w-4 mr-1.5" />
                                <span>{t('groups.my_groups.member_count', { count: group.memberCount })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isCreateModalOpen && user.canCreateGroups && (
                <CreateGroupModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={loadGroups}
                />
            )}
        </div>
    );
}
