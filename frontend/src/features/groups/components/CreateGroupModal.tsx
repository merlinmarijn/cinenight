import { useState } from 'react';
import { X, Loader2, Users, Globe, Lock, AlignLeft } from 'lucide-react';
import { createGroup } from '@/api/groups';
import { useTranslation } from 'react-i18next';

type Props = {
    onClose: () => void;
    onSuccess: () => void;
};

export default function CreateGroupModal({ onClose, onSuccess }: Props) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<'PUBLIC' | 'LINK' | 'PRIVATE'>('PUBLIC');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    const handleSubmit = async () => {
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        const res = await createGroup({
            name,
            description: description.trim() || t('groups.my_groups.group_description'),
            visibility
        });

        setLoading(false);

        if (res.ok) {
            onSuccess();
            onClose();
        } else {
            setError(res.error || t('errors.generic'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-indigo-500" />
                        {t('modals.create_group.title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>}

                    <div className="space-y-5">
                        {/* Group name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('modals.create_group.name_label')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={t('modals.create_group.name_placeholder')}
                                className="w-full rounded-xl bg-gray-800/50 border border-white/10 px-4 py-3 text-white focus:border-indigo-500 outline-none placeholder:text-gray-600"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                                <AlignLeft className="h-4 w-4 text-gray-500" />
                                {t('modals.create_group.desc_label')} <span className="text-xs text-gray-600 font-normal">{t('groups.common.optional')}</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={t('modals.create_group.desc_placeholder')}
                                rows={3}
                                className="w-full rounded-xl bg-gray-800/50 border border-white/10 px-4 py-3 text-white focus:border-indigo-500 outline-none resize-none placeholder:text-gray-600"
                            />
                        </div>

                        {/* Privacy selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.create_group.privacy_label')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setVisibility('PUBLIC')}
                                    className={`flex flex-col items-center p-4 rounded-xl border transition-all ${visibility === 'PUBLIC' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-750 hover:border-white/10'}`}
                                >
                                    <Globe className="h-6 w-6 mb-2" />
                                    <span className="font-bold text-sm">{t('modals.create_group.public')}</span>
                                    <span className="text-[10px] opacity-70">{t('modals.create_group.public_hint')}</span>
                                </button>
                                <button
                                    onClick={() => setVisibility('LINK')}
                                    className={`flex flex-col items-center p-4 rounded-xl border transition-all ${visibility === 'LINK' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-800 border-white/5 text-gray-400 hover:bg-gray-750 hover:border-white/10'}`}
                                >
                                    <Lock className="h-6 w-6 mb-2" />
                                    <span className="font-bold text-sm">{t('modals.create_group.link')}</span>
                                    <span className="text-[10px] opacity-70">{t('modals.create_group.link_hint')}</span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={!name.trim() || loading}
                            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 mt-2"
                        >
                            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                            {t('modals.create_group.submit')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
