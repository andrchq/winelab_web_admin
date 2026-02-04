// Auth service for WineLab Admin

import { api, setAuthToken } from './api';
import type { LoginResponse, User } from '@/types/api';

export interface LoginCredentials {
    email: string;
    password: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    // Store tokens
    setAuthToken(response.accessToken);
    if (typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));
    }

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
