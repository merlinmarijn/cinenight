import { useState } from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import { login, UserDto } from '@/api/auth';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoginPageProps {
    onLoginSuccess: (user: UserDto) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const res = await login(email, password);
        if (res.ok && res.data) {
            onLoginSuccess(res.data);

            const redirectUrl = searchParams.get('redirect') || '/';
            navigate(redirectUrl);
        } else {
            let msg = res.error || t('auth.pages.login.error_generic');
            if (msg.includes('disabled')) {
                msg = t('auth.pages.login.error_inactive');
            }
            setError(msg);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-200">{t('auth.pages.login.title')}</h2>
                <p className="mt-1 text-sm text-gray-400">{t('auth.pages.login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                </label>

                {error && <div className="rounded-md bg-red-900/40 p-3 text-center text-sm text-red-200">{error}</div>}

                <button type="submit" className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
                    {t('auth.pages.login.submit')}
                </button>
            </form>

            <div className="flex justify-between text-sm">
                <Link to="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">{t('auth.pages.login.forgot_password')}</Link>
                <Link to="/register" className="font-medium text-indigo-400 hover:text-indigo-300">{t('auth.pages.login.create_account')}</Link>
            </div>
            <div className="border-t border-white/10 pt-5 text-center">
                <Link to="/guest" className="font-medium text-amber-300 hover:text-amber-200">
                    {t('auth.pages.guest.login_link')}
                </Link>
            </div>
        </div>
    );
}
