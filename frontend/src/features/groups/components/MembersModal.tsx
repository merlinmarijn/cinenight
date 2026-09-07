import { useEffect, useState } from 'react';
import { X, Loader2, Trash2, Shield, User } from 'lucide-react';
import { fetchGroupMembers, removeMember, type GroupMemberDto } from '@/api/groups';
import ConfirmModal from '@/components/ConfirmModal';
import { useTranslation } from 'react-i18next';

type Props = {
    groupId: number;
    isOwner: boolean;
    onClose: () => void;
};

export default function MembersModal({ groupId, isOwner, onClose }: Props) {
    const [members, setMembers] = useState<GroupMemberDto[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    // Modal State
    const [userToRemove, setUserToRemove] = useState<number | null>(null);
    const [removeLoading, setRemoveLoading] = useState(false);

    const loadMembers = async () => {
        const res = await fetchGroupMembers(groupId);
        if (res.ok && res.data) {
            setMembers(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadMembers();
    }, [groupId]);

    const confirmRemove = (userId: number) => {
        setUserToRemove(userId);
    };

    const executeRemove = async () => {
        if (!userToRemove) return;
        setRemoveLoading(true);
        const res = await removeMember(groupId, userToRemove);

        if (res.ok) {
            setMembers(prev => prev.filter(m => m.userId !== userToRemove));
            setUserToRemove(null);
        } else {
            alert(res.error || t('errors.action_failed'));
        }
        setRemoveLoading(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
                <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-800/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-400" />
                            {t('modals.members.title')}
                        </h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition"><X className="h-5 w-5 text-gray-400" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
                        ) : (
                            members.map(m => (
                                <div key={m.userId} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-white/5 hover:bg-gray-800 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${m.role === 'OWNER' ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                            {m.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white flex items-center gap-2">
                                                {m.displayName}
                                                {m.role === 'OWNER' && <Shield className="h-3 w-3 text-amber-500" />}
                                            </div>
                                            <div className="text-xs text-gray-500">{m.role === 'OWNER' ? t('groups.roles.owner') : t('groups.roles.member')}</div>
                                        </div>
                                    </div>

                                    {isOwner && m.role !== 'OWNER' && (
                                        <button
                                            onClick={() => confirmRemove(m.userId)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                            title={t('modals.members.kick_tooltip')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-white/10 bg-gray-800/30 text-center text-xs text-gray-500">
                        {t('modals.members.total_count', { count: members.length })}
                    </div>
                </div>
            </div>

            {/* Member removal confirmation */}
            <ConfirmModal
                isOpen={!!userToRemove}
                onClose={() => setUserToRemove(null)}
                onConfirm={executeRemove}
                title={t('modals.members.confirm_kick_title')}
                description={t('modals.members.confirm_kick_desc')}
                confirmText={t('modals.members.btn_kick')}
                cancelText={t('common.cancel')}
                variant="danger"
                loading={removeLoading}
            />
        </>
    );
}
