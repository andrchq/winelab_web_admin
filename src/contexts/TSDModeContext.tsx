"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TSDDashboard } from "@/components/tsd/TSDDashboard";
import { ScanBarcode, Smartphone } from "lucide-react";

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
        if (stored === 'true') {
            // User enabled TSD mode explicitly
            setShowPrompt(false);
            return;
        }

        // Check if prompt was dismissed recently (within 2 hours)
        const dismissedAt = localStorage.getItem('winelab_tsd_prompt_dismissed');
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const twoHours = 2 * 60 * 60 * 1000;

            // If less than 2 hours passed since dismissal, don't show
            if (Date.now() - dismissedTime < twoHours) {
                setShowPrompt(false);
                return;
            }
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

    const dismissPrompt = () => {
        localStorage.setItem('winelab_tsd_prompt_dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    return (
        <TSDModeContext.Provider value={{ isTSDMode, isExitingTSD, setIsTSDMode, enableTSDMode, disableTSDMode }}>
            {/* Global Prompt for mobile devices */}
            {showPrompt && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="p-4 bg-primary/10 rounded-full mb-2">
                                <Smartphone className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Режим TSD</h2>
                            <p className="text-muted-foreground text-base">
                                Мы обнаружили, что вы используете мобильное устройство. Перейти в режим сканера?
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                className="w-full h-14 text-lg font-semibold rounded-xl"
                                size="lg"
                                onClick={enableTSDMode}
                            >
                                <ScanBarcode className="mr-2 h-5 w-5" />
                                Перейти в режим TSD
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-14 text-base font-medium rounded-xl border-2"
                                onClick={dismissPrompt}
                            >
                                Обычная версия
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

