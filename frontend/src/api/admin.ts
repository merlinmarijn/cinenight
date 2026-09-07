import { apiDelete, apiGet, apiPatch } from './client';

export type UserRole = 'ADMIN' | 'VIP' | 'USER';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type AdminUserDto = {
    id: number;
    email: string | null;
    displayName: string;
    role: UserRole;
    status: UserStatus;
    accountType: 'REGISTERED' | 'GUEST';
    canCreateGroups: boolean;
    createdAt: string;
};

export type UpdateAdminUserRequest = Partial<Pick<AdminUserDto, 'displayName' | 'role' | 'status' | 'canCreateGroups'>>;

export const fetchUsers = () => apiGet<AdminUserDto[]>('/admin/users');
export const updateUser = (id: number, data: UpdateAdminUserRequest) =>
    apiPatch<AdminUserDto>(`/admin/users/${id}`, data);
export const deleteUser = (id: number) => apiDelete<string>(`/admin/users/${id}`);
