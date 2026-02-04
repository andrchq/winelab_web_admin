"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface TSDModeContextType {
    isTSDMode: boolean;
    setIsTSDMode: (value: boolean) => void;
    enableTSDMode: () => void;
    disableTSDMode: () => void;
}

const TSDModeContext = createContext<TSDModeContextType | undefined>(undefined);

export function TSDModeProvider({ children }: { children: React.ReactNode }) {
    const [isTSDMode, setIsTSDMode] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Initial sync with localStorage - runs once on mount
    useEffect(() => {
        const stored = localStorage.getItem('winelab_tsd_mode');
        if (stored === 'true') {
            setIsTSDMode(true);
        }
        setIsInitialized(true);
    }, []);

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
        // Redirect to receiving new or list? User said "starts with loading document"
        // Let's redirect to /receiving/new
        router.push('/receiving/new');
    };

    const disableTSDMode = () => {
        localStorage.setItem('winelab_tsd_mode', 'false');
        setIsTSDMode(false);
        setShowPrompt(false);
    };

    return (
        <TSDModeContext.Provider value={{ isTSDMode, setIsTSDMode, enableTSDMode, disableTSDMode }}>
            {/* Global Prompt */}
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

            <div className={cn(
                "flex flex-col",
                isTSDMode ? "fixed inset-0 z-[50] bg-background" : "min-h-screen"
            )}>
                <div className="flex-1 relative flex flex-col min-h-0">
                    {children}
                </div>

                {isTSDMode && (
                    <div className="p-4 border-t bg-background shrink-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <Button variant="destructive" size="lg" className="w-full" onClick={disableTSDMode}>
                            Выход из режима TSD
                        </Button>
                    </div>
                )}
            </div>
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
