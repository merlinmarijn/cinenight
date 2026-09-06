import { apiGet, apiPost, type ApiResponse } from './client';

export type UserDto = {
    id: number;
    email: string | null;
    displayName: string;
    role: 'USER' | 'ADMIN' | string;
    accountType: 'REGISTERED' | 'GUEST';
    renameAvailableAt: string | null;
};

export type GuestSessionDto = {
    user: UserDto;
    recoveryCode: string | null;
    existingAccount: boolean;
};

const base = '/auth';

export function login(email: string, password: string): Promise<ApiResponse<UserDto>> {
    return apiPost<UserDto>(`${base}/login`, { email, password });
}

export function register(
    email: string,
    password: string,
    displayName: string
): Promise<ApiResponse<UserDto>> {
    return apiPost<UserDto>(`${base}/register`, { email, password, displayName });
}

export function forgot(email: string): Promise<ApiResponse<string>> {
    return apiPost<string>(`${base}/forgot`, { email });
}

export function resetPassword(token: string, newPassword: string): Promise<ApiResponse<string>> {
    return apiPost<string>(`${base}/reset`, { token, newPassword });
}

export function me(): Promise<ApiResponse<UserDto | null>> {
    return apiGet<UserDto | null>(`${base}/me`);
}

export function logout(): Promise<ApiResponse<string>> {
    return apiPost<string>(`${base}/logout`);
}

export function createGuest(username: string): Promise<ApiResponse<GuestSessionDto>> {
    return apiPost<GuestSessionDto>(`${base}/guest`, { username });
}

export function loginGuest(username: string, code: string): Promise<ApiResponse<GuestSessionDto>> {
    return apiPost<GuestSessionDto>(`${base}/guest/login`, { username, code });
}

export function regenerateGuestCode(): Promise<ApiResponse<string>> {
    return apiPost<string>(`${base}/guest/code`);
}

export function verifyEmail(token: string): Promise<ApiResponse<string>> {
    return apiPost<string>(`/auth/verify?token=${token}`);
}

export const AuthApi = { login, register, createGuest, loginGuest, regenerateGuestCode, forgot, resetPassword, me, logout, verifyEmail };
