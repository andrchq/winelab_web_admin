"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/registry/magicui/number-ticker";

export function DigitalClock({ className }: { className?: string }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const dateString = time.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    return (
        <div className={cn(
            "flex flex-col items-start justify-center px-8 py-5 rounded-2xl bg-gradient-to-br from-background/50 to-muted/50 border border-white/10 shadow-lg backdrop-blur-md relative overflow-hidden group hover:border-primary/30 transition-all duration-500 min-w-[320px]",
            className
        )}>
            {/* Background glow effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

            <div className="relative flex flex-col items-start">
                <div className="text-5xl font-black tracking-tighter text-foreground select-none flex items-center gap-1">
                    <NumberTicker value={time.getHours()} />
                    <span className="animate-pulse opacity-50">:</span>
                    <NumberTicker value={time.getMinutes()} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80 mt-2 select-none">
                    {dateString}
                </span>
            </div>

            {/* Subtle bottom line gradient */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        </div>
    );
}
