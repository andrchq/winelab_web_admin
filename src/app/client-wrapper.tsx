'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TSDModeProvider } from '@/contexts/TSDModeContext';
import { Toaster } from '@/components/ui/sonner';

export function ClientWrapper({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Show a simple loading state during SSR/hydration
    if (!mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <p className="text-muted-foreground">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthProvider>
            <TSDModeProvider>
                {children}
                <Toaster />
            </TSDModeProvider>
        </AuthProvider>
    );
}
