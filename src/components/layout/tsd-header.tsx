"use client";

import { useTSDMode } from "@/contexts/TSDModeContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TSDHeader() {
    const { isTSDMode, disableTSDMode } = useTSDMode();
    const router = useRouter();
    const pathname = usePathname();

    if (!isTSDMode) return null;

    // Don't show header on the main TSD dashboard
    if (pathname === '/tsd') return null;

    return (
        <div className="h-14 border-b bg-background flex items-center px-4 gap-2 shrink-0 z-40 sticky top-0 shadow-sm">
            {/* Exit Button - Narrower */}
            <Button
                variant="ghost"
                size="sm"
                onClick={disableTSDMode}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/50 h-9 px-3"
            >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Выход из TSD</span>
                <span className="sm:hidden">Выход</span>
            </Button>

            {/* Back Button - Returns to previous page */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="h-9 px-3 gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Назад
            </Button>

            <div className="flex-1" /> {/* Spacer */}

            {/* Home Button (Optional, but good to have) */}
            <Button variant="ghost" size="icon" onClick={() => router.push('/tsd')} className="h-9 w-9">
                <Home className="h-5 w-5" />
            </Button>
        </div>
    );
}
