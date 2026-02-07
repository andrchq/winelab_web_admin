
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

    // During SSR, rendered a minimal shell to avoid Context errors
    if (!mounted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
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
