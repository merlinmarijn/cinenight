import { Navigate, Outlet } from 'react-router-dom';
import type { UserDto } from '@/api/auth';

export default function AdminRoute({ user }: { user: UserDto }) {
    return user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
