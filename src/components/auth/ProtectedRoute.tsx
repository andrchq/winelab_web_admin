"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoaderCircle } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRoles?: ('ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'SUPPORT')[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, hasRole } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
    }, [isLoading, isAuthenticated, router, pathname]);

    // Check role access
    useEffect(() => {
        if (!isLoading && isAuthenticated && requiredRoles && requiredRoles.length > 0) {
            if (!hasRole(requiredRoles)) {
                router.push('/');
            }
        }
    }, [isLoading, isAuthenticated, requiredRoles, hasRole, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]" suppressHydrationWarning>
                <div className="text-center">
                    <LoaderCircle className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="text-white/50">Загрузка...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <p className="text-red-400 text-lg">Доступ запрещён</p>
                    <p className="text-white/50 mt-2">У вас нет прав для просмотра этой страницы</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
