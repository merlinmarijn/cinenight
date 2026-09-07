import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinGroupByToken } from '@/api/groups';
import { Loader2, Users, ShieldAlert, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function JoinGroupPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [status, setStatus] = useState<'JOINING' | 'SUCCESS' | 'ERROR'>('JOINING');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        async function join() {
            if (!token) return;
            const joinRes = await joinGroupByToken(token);

            if (joinRes.ok && joinRes.data) {
                setStatus('SUCCESS');

                setTimeout(() => {
                    navigate(`/groups/${joinRes.data}`);
                }, 2000); // 2 saniye bekle
            } else {
                setStatus('ERROR');
                setErrorMsg(joinRes.error || "LINK_INVALID");
            }
        }

        join();
    }, [token, navigate]);

    if (status === 'ERROR') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300 px-4">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t('groups.join.error_title')}</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                    {(errorMsg === t('groups.join.error_invalid_link') || errorMsg === "LINK_INVALID")
                        ? t('groups.join.error_invalid_desc')
                        : errorMsg}
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition border border-white/10"
                    >
                        {t('common.back')}
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition shadow-lg shadow-indigo-500/20"
                    >
                        {t('nav.myGroups')}
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle className="h-12 w-12" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t('groups.join.success_title')}</h2>
                <p className="text-gray-300 mb-8 text-lg">{t('groups.join.success_desc')}</p>

                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-900/50 px-4 py-2 rounded-full border border-white/5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('groups.join.redirecting')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mb-6 animate-pulse">
                <Users className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('groups.join.loading_title')}</h2>
            <p className="text-gray-400 mb-8">{t('groups.join.loading_desc')}</p>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );
}
