"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TSDDashboard } from "@/components/tsd/TSDDashboard";

interface TSDModeContextType {
    isTSDMode: boolean;
    isExitingTSD: boolean;
    setIsTSDMode: (value: boolean) => void;
    enableTSDMode: () => void;
    disableTSDMode: () => void;
}

const TSDModeContext = createContext<TSDModeContextType | undefined>(undefined);

export function TSDModeProvider({ children }: { children: React.ReactNode }) {
    const [isTSDMode, setIsTSDMode] = useState(false);
    const [isExitingTSD, setIsExitingTSD] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isEnteringTSD, setIsEnteringTSD] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Check if we're on a TSD-related page
    const isOnTSDPage = pathname?.startsWith('/tsd') || pathname?.startsWith('/receiving') || pathname?.startsWith('/shipments');

    // Initial sync with localStorage - runs once on mount
    useEffect(() => {
        const stored = localStorage.getItem('winelab_tsd_mode');
        // Use setTimeout to avoid synchronous setState inside effect in React 19
        const timer = setTimeout(() => {
            if (stored === 'true') {
                setIsTSDMode(true);
            }
            setIsInitialized(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // Hide entering overlay when we reach the TSD page
    useEffect(() => {
        if (isEnteringTSD && isOnTSDPage) {
            setIsEnteringTSD(false);
        }
    }, [isEnteringTSD, isOnTSDPage]);

    // Logic for showing prompt - only runs after initialization
    useEffect(() => {
        // Wait for both initialization and auth check
        if (!isInitialized || isLoading) return;

        // If already in TSD mode (from localStorage or state), never show prompt
        if (isTSDMode) {
            setShowPrompt(false);
            return;
        }

        // If not authenticated, don't show prompt
        if (!isAuthenticated) {
            setShowPrompt(false);
            return;
        }

        // Check if user already made a choice
        const stored = localStorage.getItem('winelab_tsd_mode');
        if (stored === 'true' || stored === 'false') {
            // User already decided, don't prompt again
            setShowPrompt(false);
            return;
        }

        // Detect Mobile and show prompt only if no decision was made yet
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

        if (isMobile) {
            setShowPrompt(true);
        }
    }, [isInitialized, isLoading, isAuthenticated, isTSDMode]);

    const enableTSDMode = () => {
        localStorage.setItem('winelab_tsd_mode', 'true');
        setIsTSDMode(true);
        setShowPrompt(false);
        setIsEnteringTSD(true); // Show overlay immediately
        router.push('/tsd');
    };

    const disableTSDMode = () => {
        setIsExitingTSD(true);
        localStorage.setItem('winelab_tsd_mode', 'false');
        setIsTSDMode(false);
        setShowPrompt(false);
        setIsEnteringTSD(false);
        router.push('/');

        // Reset exiting flag after navigation completes
        setTimeout(() => {
            setIsExitingTSD(false);
        }, 300);
    };

    return (
        <TSDModeContext.Provider value={{ isTSDMode, isExitingTSD, setIsTSDMode, enableTSDMode, disableTSDMode }}>
            {/* Global Prompt for mobile devices */}
            {showPrompt && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-spring-in">
                        <h2 className="text-xl font-bold">Мобильный режим (TEST)</h2>
                        <p className="text-muted-foreground">
                            Вы зашли с мобильного устройства. Перейти в режим сканера (TSD)?
                        </p>
                        <div className="flex flex-col gap-3">
                            <Button className="w-full" size="lg" onClick={enableTSDMode}>
                                Да, перейти
                            </Button>
                            <Button variant="outline" className="w-full" onClick={disableTSDMode}>
                                Нет, обычная версия
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instant TSD overlay - shows immediately when entering TSD mode */}
            {isEnteringTSD && (
                <div className="fixed inset-0 z-[200] bg-slate-950" style={{ backgroundColor: '#020617' }}>
                    <TSDDashboard onExit={disableTSDMode} />
                </div>
            )}

            {children}
        </TSDModeContext.Provider>
    );
}

export function useTSDMode() {
    const context = useContext(TSDModeContext);
    if (!context) {
        throw new Error("useTSDMode must be used within a TSDModeProvider");
    }
    return context;
}

