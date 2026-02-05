'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TSDModeProvider } from '@/contexts/TSDModeContext';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
    // Since this component is dynamically imported with ssr: false,
    // it will only render on the client side, so we can safely use hooks
    return (
        <AuthProvider>
            <TSDModeProvider>
                {children}
                <Toaster />
            </TSDModeProvider>
        </AuthProvider>
    );
}
