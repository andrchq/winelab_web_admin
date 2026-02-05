'use client';

import { ReactNode, useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TSDModeProvider } from '@/contexts/TSDModeContext';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // During SSR/static generation, render children without providers
    // This prevents useState errors during prerendering
    if (!mounted) {
        return <>{children}</>;
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
