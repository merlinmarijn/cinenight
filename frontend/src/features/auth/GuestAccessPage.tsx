import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Clipboard, KeyRound, Ticket, UserRound } from 'lucide-react';
import { createGuest, loginGuest, type UserDto } from '@/api/auth';
import { useTranslation } from 'react-i18next';

type Mode = 'create' | 'returning';

export default function GuestAccessPage({ onLoginSuccess }: { onLoginSuccess: (user: UserDto) => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>('create');
    const [username, setUsername] = useState('');
    const [code, setCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [createdUser, setCreatedUser] = useState<UserDto | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const destination = searchParams.get('redirect') || '/dashboard';

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        const result = mode === 'create' ? await createGuest(username) : await loginGuest(username, code);
        setLoading(false);

        if (!result.ok) {
            setError(result.error || t('auth.pages.guest.error'));
            return;
        }

        onLoginSuccess(result.data.user);
        if (result.data.recoveryCode) {
            setCreatedUser(result.data.user);
            setRecoveryCode(result.data.recoveryCode);
            return;
        }
        navigate(destination);
    };

    const copyCode = async () => {
        if (!recoveryCode) return;
        await navigator.clipboard.writeText(`${createdUser?.displayName} ${recoveryCode}`);
        setCopied(true);
    };

    if (recoveryCode && createdUser) {
        return (
            <section className="space-y-6" aria-live="polite">
                <div className="relative overflow-hidden border-y border-amber-300/30 bg-amber-300/[0.07] px-5 py-7 text-left">
                    <div className="absolute -right-7 -top-7 h-20 w-20 rounded-full border border-amber-200/20" />
                    <Ticket className="mb-4 h-7 w-7 text-amber-300" />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/70">
                        {t('auth.pages.guest.pass_label')}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{createdUser.displayName}</h2>
                    <div className="mt-5 font-mono text-3xl font-bold tracking-[0.18em] text-amber-200">
                        {recoveryCode}
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">{t('auth.pages.guest.save_title')}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-300">{t('auth.pages.guest.save_desc')}</p>
                </div>
                <button type="button" onClick={copyCode} className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200/30 bg-amber-200/10 py-3 font-semibold text-amber-100 transition hover:bg-amber-200/15">
                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copied ? t('auth.pages.guest.copied') : t('auth.pages.guest.copy')}
                </button>
                <button type="button" onClick={() => navigate(destination)} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
                    {t('auth.pages.guest.continue')}
                </button>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{t('auth.pages.guest.eyebrow')}</p>
                <h2 className="mt-2 text-2xl font-semibold text-gray-100">{t('auth.pages.guest.title')}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">{t('auth.pages.guest.subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 border-b border-white/10" role="tablist">
                {(['create', 'returning'] as const).map(item => (
                    <button key={item} type="button" role="tab" aria-selected={mode === item}
                            onClick={() => { setMode(item); setError(null); }}
                            className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${mode === item ? 'border-amber-300 text-amber-200' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                        {t(`auth.pages.guest.tabs.${item}`)}
                    </button>
                ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm text-gray-300">
                    {t('auth.pages.guest.username')}
                    <div className="mt-1 flex items-center rounded-lg border border-gray-600 bg-gray-700 px-3 focus-within:border-amber-300">
                        <UserRound className="mr-2 h-4 w-4 text-gray-400" />
                        <input value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={24}
                               pattern="[A-Za-z0-9_]+" autoComplete="username" spellCheck={false}
                               className="w-full bg-transparent py-3 text-white placeholder-gray-500 focus:outline-none"
                               placeholder={t('auth.pages.guest.username_placeholder')} />
                    </div>
                    {mode === 'create' ? <span className="mt-1 block text-xs text-gray-500">{t('auth.pages.guest.username_hint')}</span> : null}
                </label>

                {mode === 'returning' ? (
                    <label className="block text-sm text-gray-300">
                        {t('auth.pages.guest.code')}
                        <div className="mt-1 flex items-center rounded-lg border border-gray-600 bg-gray-700 px-3 focus-within:border-amber-300">
                            <KeyRound className="mr-2 h-4 w-4 text-gray-400" />
                            <input value={code} onChange={event => setCode(event.target.value.toUpperCase())} required autoComplete="one-time-code"
                                   className="w-full bg-transparent py-3 font-mono uppercase tracking-[0.16em] text-white placeholder-gray-500 focus:outline-none"
                                   placeholder="ABCD-EFGH" />
                        </div>
                    </label>
                ) : null}

                {error ? <div role="alert" className="rounded-md bg-red-900/40 p-3 text-center text-sm text-red-200">{error}</div> : null}

                <button disabled={loading} type="submit" className="w-full rounded-lg bg-amber-300 py-3 font-bold text-gray-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">
                    {loading ? t('common.loading') : t(`auth.pages.guest.submit.${mode}`)}
                </button>
            </form>

            <p className="text-center text-sm text-gray-500">
                {t('auth.pages.guest.registered')} <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">{t('auth.login')}</Link>
            </p>
        </section>
    );
}
