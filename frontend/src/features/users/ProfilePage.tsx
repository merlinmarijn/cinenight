import { useState } from 'react';
import { type UserDto, regenerateGuestCode } from '@/api/auth';
import { User, Mail, Save, Loader2, AlertTriangle, CheckCircle, Lock, Key, Clipboard, Ticket } from 'lucide-react';
import { changePassword, updateProfile } from '@/api/user';
import { useTranslation } from 'react-i18next';

type Message = { type: 'success' | 'error' | 'info'; text: string };

export default function ProfilePage({ user, onUserUpdate }: { user: UserDto; onUserUpdate: (user: UserDto) => void }) {
    const { t } = useTranslation();
    const isGuest = user.accountType === 'GUEST';
    const [name, setName] = useState(user.displayName);
    const [email, setEmail] = useState(user.email || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<Message | null>(null);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [savingPw, setSavingPw] = useState(false);
    const [pwMsg, setPwMsg] = useState<Message | null>(null);
    const [newGuestCode, setNewGuestCode] = useState<string | null>(null);
    const [creatingCode, setCreatingCode] = useState(false);
    const [copied, setCopied] = useState(false);

    const renameDate = user.renameAvailableAt ? new Date(user.renameAvailableAt) : null;
    const renameLocked = Boolean(isGuest && renameDate && renameDate.getTime() > Date.now());

    const handleProfileSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSavingProfile(true);
        setProfileMsg(null);
        const res = await updateProfile({ displayName: name, email: isGuest ? '' : email });
        setSavingProfile(false);
        if (!res.ok) {
            setProfileMsg({ type: 'error', text: res.error || t('profile.msg_profile_failed') });
            return;
        }
        onUserUpdate(res.data);
        if (!isGuest && email !== user.email) setProfileMsg({ type: 'info', text: t('profile.msg_profile_updated_email') });
        else setProfileMsg({ type: 'success', text: t('profile.msg_profile_updated') });
    };

    const handlePasswordSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setPwMsg(null);
        if (newPw.length < 6) return setPwMsg({ type: 'error', text: t('profile.msg_password_min') });
        if (newPw !== confirmPw) return setPwMsg({ type: 'error', text: t('profile.msg_password_mismatch') });
        setSavingPw(true);
        const res = await changePassword(currentPw, newPw);
        setSavingPw(false);
        if (res.ok) {
            setPwMsg({ type: 'success', text: t('profile.msg_password_updated') });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } else setPwMsg({ type: 'error', text: res.error || t('profile.msg_password_failed') });
    };

    const replaceGuestCode = async () => {
        setCreatingCode(true);
        setProfileMsg(null);
        const result = await regenerateGuestCode();
        setCreatingCode(false);
        if (result.ok) setNewGuestCode(result.data);
        else setProfileMsg({ type: 'error', text: result.error || t('profile.guest.code_failed') });
    };

    const copyGuestCode = async () => {
        if (!newGuestCode) return;
        await navigator.clipboard.writeText(`${user.displayName} ${newGuestCode}`);
        setCopied(true);
    };

    return (
        <div className="mx-auto max-w-xl space-y-8 px-4 py-10">
            <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isGuest ? 'text-amber-300' : 'text-indigo-400'}`}>{isGuest ? t('profile.guest.eyebrow') : t('profile.account_eyebrow')}</p>
                <h1 className="mt-2 text-3xl font-bold text-white">{t('profile.title')}</h1>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-xl">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-white"><User className={`h-5 w-5 ${isGuest ? 'text-amber-300' : 'text-indigo-400'}`} />{t('profile.section_profile')}</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">{isGuest ? t('profile.guest.username') : t('auth.fields.display_name')}</label>
                        <div className="flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 focus-within:border-indigo-500">
                            <User className="mr-2 h-4 w-4 text-gray-500" />
                            <input value={name} onChange={event => setName(event.target.value)} required minLength={isGuest ? 3 : 2} maxLength={isGuest ? 24 : 100} pattern={isGuest ? '[A-Za-z0-9_]+' : undefined} disabled={renameLocked} className="w-full border-none bg-transparent py-3 text-white focus:outline-none disabled:cursor-not-allowed disabled:text-gray-500" />
                        </div>
                        {renameLocked && renameDate ? <p className="mt-2 text-xs leading-5 text-amber-200/80">{t('profile.guest.rename_available', { date: renameDate.toLocaleString('en-US') })}</p> : isGuest ? <p className="mt-2 text-xs text-gray-500">{t('profile.guest.rename_hint')}</p> : null}
                    </div>

                    {!isGuest ? <div>
                        <label className="mb-1 block text-sm font-medium text-gray-400">{t('auth.fields.email')}</label>
                        <div className="flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 focus-within:border-indigo-500"><Mail className="mr-2 h-4 w-4 text-gray-500" /><input type="email" value={email} onChange={event => setEmail(event.target.value)} required className="w-full border-none bg-transparent py-3 text-white focus:outline-none" /></div>
                        {email !== user.email ? <p className="mt-2 flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" />{t('profile.email_warning')}</p> : null}
                    </div> : null}

                    {profileMsg ? <StatusMessage message={profileMsg} /> : null}
                    <button type="submit" disabled={savingProfile || renameLocked || name === user.displayName} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{t('profile.save_button')}</button>
                </form>
            </div>

            {isGuest ? <div className="overflow-hidden rounded-2xl border border-amber-200/20 bg-gray-900 shadow-xl">
                <div className="border-b border-dashed border-amber-200/20 bg-amber-200/[0.06] p-6"><h2 className="flex items-center gap-2 text-xl font-semibold text-white"><Ticket className="h-5 w-5 text-amber-300" />{t('profile.guest.code_title')}</h2><p className="mt-2 text-sm leading-6 text-gray-400">{t('profile.guest.code_desc')}</p></div>
                <div className="space-y-4 p-6">
                    {newGuestCode ? <button type="button" onClick={copyGuestCode} className="flex w-full items-center justify-between rounded-lg bg-amber-200/10 px-4 py-4 text-left"><span className="font-mono text-xl font-bold tracking-[0.16em] text-amber-200">{newGuestCode}</span>{copied ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <Clipboard className="h-5 w-5 text-amber-200" />}</button> : null}
                    <button type="button" onClick={replaceGuestCode} disabled={creatingCode} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gray-800 py-3 font-semibold text-gray-200 transition hover:bg-gray-700 disabled:opacity-50">{creatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}{t('profile.guest.code_replace')}</button>
                    <p className="text-xs leading-5 text-gray-500">{t('profile.guest.code_warning')}</p>
                </div>
            </div> : <div className="rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-xl">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold text-white"><Lock className="h-5 w-5 text-indigo-400" />{t('profile.section_password')}</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <PasswordField label={t('profile.current_password')} value={currentPw} onChange={setCurrentPw} placeholder={t('auth.fields.password_placeholder')} />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><PasswordField label={t('auth.fields.new_password')} value={newPw} onChange={setNewPw} placeholder={t('profile.placeholder_min_char')} /><PasswordField label={t('profile.new_password_confirm')} value={confirmPw} onChange={setConfirmPw} placeholder={t('auth.fields.password_placeholder')} /></div>
                    {pwMsg ? <StatusMessage message={pwMsg} /> : null}
                    <button type="submit" disabled={savingPw} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gray-800 py-3 font-bold text-gray-200 transition hover:bg-gray-700 disabled:opacity-50">{savingPw ? <Loader2 className="h-5 w-5 animate-spin" /> : <Key className="h-5 w-5" />}{t('profile.update_password_button')}</button>
                </form>
            </div>}
        </div>
    );
}

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return <label className="block text-sm font-medium text-gray-400">{label}<div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-gray-800 px-3 focus-within:border-indigo-500"><Lock className="mr-2 h-4 w-4 text-gray-500" /><input type="password" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} required minLength={6} className="w-full border-none bg-transparent py-3 text-white focus:outline-none" /></div></label>;
}

function StatusMessage({ message }: { message: Message }) {
    const style = message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : message.type === 'error' ? 'bg-red-500/10 text-red-300' : 'bg-blue-500/10 text-blue-300';
    return <div role="status" className={`flex items-start gap-3 rounded-xl p-4 ${style}`}>{message.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}<span className="text-sm">{message.text}</span></div>;
}
