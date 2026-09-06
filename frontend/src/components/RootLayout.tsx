import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { UserDto, logout } from '@/api/auth';
import { LayoutDashboard, LogOut } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface RootLayoutProps {
    user: UserDto | null;
    onLogout: () => void;
}

export default function RootLayout({ user, onLogout }: RootLayoutProps) {
    const { pathname } = useLocation();
    const { t } = useTranslation();

    useEffect(() => {
        document.title = t('meta.title');
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', t('meta.description'));
        }
        document.documentElement.lang = localStorage.getItem('i18nextLng') || 'tr';
    }, [t]);

    const handleLogout = async () => {
        await logout();
        onLogout();
    };

    const isHome = pathname === '/';

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-indigo-500/30">
            <header className={`sticky top-0 z-30 border-b transition-colors duration-300 ${isHome ? 'border-white/5 bg-gray-950/80 backdrop-blur-md' : 'border-white/10 bg-gray-900/95 backdrop-blur-sm'}`}>
                <nav className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link to="/" className="flex items-center gap-2 group">
                        <span className="text-2xl">🎬</span>
                        <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:to-white transition-all">
                            CineNight
                        </span>
                    </Link>

                    <div className="hidden items-center gap-8 md:flex">
                        {user ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className={`text-sm font-medium transition-colors flex items-center gap-2 ${pathname === '/dashboard' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    {t('nav.myGroups')}
                                </Link>
                                <Link to="/explore" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                    {t('nav.explore')}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/try" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                    {t('nav.liveDemo')}
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />

                        {user ? (
                            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                                <Link
                                    to="/profile"
                                    className="hidden text-right sm:block hover:opacity-80 transition cursor-pointer"
                                    title={t('nav.profileSettings')}
                                >
                                    <div className="text-sm font-medium text-white leading-none">{user.displayName}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {user.accountType === 'GUEST' ? t('auth.guest_badge') : user.email}
                                    </div>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="group relative rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                    title={t('auth.logout')}
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                <Link
                                    to="/guest"
                                    className="hidden text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors px-2 py-2 sm:block"
                                >
                                    {t('auth.guest')}
                                </Link>
                                <Link
                                    to="/login"
                                    className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2"
                                >
                                    {t('auth.login')}
                                </Link>
                                <Link
                                    to="/register"
                                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-950 transition hover:bg-gray-200"
                                >
                                    {t('auth.register')}
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>
                {isHome && (
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                )}
            </header>

            <main className="flex-1">
                <div className={`mx-auto ${pathname === '/' ? '' : 'container p-4 md:p-8'}`}>
                    <Outlet />
                </div>
            </main>

            <footer className="border-t border-white/5 bg-gray-950 py-12 mt-auto">
                <div className="container mx-auto px-4 text-center space-y-2">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} CineNight · {t('footer.tagline')}
                    </p>
                    <a href="http://localhost:8080/about" className="text-xs text-indigo-500/60 hover:text-indigo-400 transition underline">
                        {t('footer.systemInfo')}
                    </a>
                </div>
            </footer>
        </div>
    );
}
