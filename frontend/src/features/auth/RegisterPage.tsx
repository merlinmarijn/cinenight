import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '@/api/auth';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

export default function RegisterPage() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password.length < 6) {
            setError(t('auth.validation.password_min'));
            return;
        }
        const res = await register(email, password, displayName);
        if (res.ok) {
            setSuccess(true);
        } else {
            setError(res.error || t('auth.pages.register.error_generic'));
        }
    };

    if (success) {
        return (
            <div className="text-center space-y-6 py-10">
                <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t('auth.pages.register.success_title')}</h2>
                <p className="text-gray-300">
                    {/* Translation containing rich text */}
                    <Trans
                        i18nKey="auth.pages.register.success_message"
                        values={{ email }}
                        components={{ bold: <strong /> }}
                    />
                </p>
                <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition">
                    {t('auth.pages.register.back_to_login')}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-200">{t('auth.pages.register.title')}</h2>
                <p className="mt-1 text-sm text-gray-400">{t('auth.pages.register.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm text-gray-300">
                    {t('auth.fields.display_name')}
                    <div className="mt-1 flex items-center rounded-lg border border-gray-600 bg-gray-700 px-3">
                        <User className="mr-2 h-4 w-4 text-gray-300" />
                        <input
                            className="w-full bg-transparent py-3 text-white placeholder-gray-400 focus:outline-none"
                            placeholder={t('auth.fields.display_name_placeholder')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                </label>

                <label className="block text-sm text-gray-300">
                    {t('auth.fields.email')}
                    <div className="mt-1 flex items-center rounded-lg border border-gray-600 bg-gray-700 px-3">
                        <Mail className="mr-2 h-4 w-4 text-gray-300" />
                        <input
                            className="w-full bg-transparent py-3 text-white placeholder-gray-400 focus:outline-none"
                            type="email"
                            placeholder={t('auth.fields.email_placeholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </label>

                <label className="block text-sm text-gray-300">
                    {t('auth.fields.password')}
                    <div className="mt-1 flex items-center rounded-lg border border-gray-600 bg-gray-700 px-3">
                        <Lock className="mr-2 h-4 w-4 text-gray-300" />
                        <input
                            className="w-full bg-transparent py-3 text-white placeholder-gray-400 focus:outline-none"
                            type={showPw ? 'text' : 'password'}
                            placeholder={t('auth.fields.password_placeholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(s => !s)}
                            className="text-gray-300"
                            aria-label={showPw ? t('auth.aria.hide_password') : t('auth.aria.show_password')}
                        >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{t('auth.fields.password_hint')}</p>
                </label>

                {error && <div className="rounded-md bg-red-900/40 p-3 text-center text-sm text-red-200">{error}</div>}

                <button type="submit" className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
                    {t('auth.pages.register.submit')}
                </button>
            </form>

            <p className="text-center text-sm text-gray-400">
                {t('auth.pages.register.already_have_account')}{' '}
                <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">{t('auth.pages.register.login_link')}</Link>
            </p>
            <p className="text-center text-sm text-gray-400">
                <Link to="/guest" className="font-medium text-amber-300 hover:text-amber-200">
                    {t('auth.pages.guest.create_link')}
                </Link>
            </p>
        </div>
    );
}
