// Auth service for WineLab Admin

import { api, setAuthToken } from './api';
import type { BootstrapStatus, LoginResponse, User } from '@/types/api';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface BootstrapAdminPayload {
    email: string;
    password: string;
    name: string;
    phone?: string;
}

function persistSession(response: LoginResponse) {
    setAuthToken(response.accessToken);
    if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
    }
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    persistSession(response);
    return response;
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
    return api.get<BootstrapStatus>('/auth/bootstrap-status');
}

export async function bootstrapAdmin(payload: BootstrapAdminPayload): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/bootstrap-admin', payload);
    persistSession(response);
    return response;
}

export async function logout(): Promise<void> {
    try {
        await api.post('/auth/logout');
    } catch {
        // Ignore logout errors
    } finally {
        setAuthToken(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    }
}

export async function refreshToken(): Promise<string | null> {
    try {
        const refreshToken = typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;

        if (!refreshToken) return null;

        const response = await api.post<{ accessToken: string }>('/auth/refresh', {
            refreshToken,
        });

        setAuthToken(response.accessToken);
        return response.accessToken;
    } catch {
        // Refresh failed, clear auth
        await logout();
        return null;
    }
}

export function getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        return await api.get<User>('/auth/me');
    } catch {
        return null;
    }
}
