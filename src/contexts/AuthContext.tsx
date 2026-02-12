"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@/types/api';
import { initializeAuth, getAuthToken } from '@/lib/api';
import { login as authLogin, logout as authLogout, getStoredUser, getCurrentUser, LoginCredentials } from '@/lib/auth';
import { socket } from '@/lib/socket';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Socket connection management
    useEffect(() => {
        if (user) {
            socket.connect();
        } else {
            socket.disconnect();
        }
    }, [user]);

    useEffect(() => {
        const init = async () => {
            initializeAuth();

            const token = getAuthToken();
            if (token) {
                // Try to get stored user first (fast)
                const storedUser = getStoredUser();
                if (storedUser) {
                    setUser(storedUser);
                }

                // Then verify with server
                const serverUser = await getCurrentUser();
                if (serverUser) {
                    setUser(serverUser);
                    localStorage.setItem('user', JSON.stringify(serverUser));
                } else {
                    // Token invalid
                    setUser(null);
                }
            }

            setIsLoading(false);
        };

        init();

        return () => {
            socket.disconnect();
        };
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const response = await authLogin(credentials);
        setUser(response.user);
    };

    const logout = async () => {
        await authLogout();
        setUser(null);
    };

    const hasRole = (roles: string[]): boolean => {
        if (!user || !user.role) return false;
        const userRoleName = typeof user.role === 'object' ? user.role.name : user.role;
        return roles.includes(userRoleName);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
