import { Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { me, type UserDto } from '@/api/auth';
import RootLayout from '@/components/RootLayout';
import AuthLayout from '@/components/AuthLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

import HomePage from '@/features/home/HomePage';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import VerifyEmailPage from '@/features/auth/VerifyEmailPage';
import GuestAccessPage from '@/features/auth/GuestAccessPage';
import TryDemoPage from '@/features/home/TryDemoPage';
import GroupsPage from '@/features/groups/GroupsPage';
import GroupDetailPage from '@/features/groups/GroupDetailPage';
import JoinGroupPage from '@/features/groups/JoinGroupPage';
import ExplorePage from '@/features/groups/ExplorePage';
import ProfilePage from "@/features/users/ProfilePage";
import { useTranslation } from 'react-i18next';

export default function AppRoutes() {
    const [user, setUser] = useState<UserDto | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        me().then(r => {
            if (r.ok && r.data) setUser(r.data);
            setLoading(false);
        });
    }, []);

    const handleLogin = (user: UserDto) => {
        setUser(user);
    };

    const handleLogout = () => {
        setUser(null);
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950">
                <p className="text-white">{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <Routes>
            {/* PUBLIC: Herkes görebilir */}
            <Route element={<RootLayout user={user} onLogout={handleLogout} />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/try" element={<TryDemoPage />} />
                <Route path="/explore" element={<ExplorePage />} />

                {/* PROTECTED: Sadece giriş yapmış kullanıcılar */}
                <Route element={<ProtectedRoute user={user} />}>
                    <Route path="/dashboard" element={<GroupsPage />} />
                    <Route path="/profile" element={<ProfilePage user={user!} onUserUpdate={setUser} />} />
                    <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                    <Route path="/join/:token" element={<JoinGroupPage />} />
                </Route>
            </Route>

            {/* AUTH: Giriş/Kayıt işlemleri */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage onLoginSuccess={handleLogin} />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/guest" element={<GuestAccessPage onLoginSuccess={handleLogin} />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>
        </Routes>
    );
}
