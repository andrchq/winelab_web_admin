"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
    value: number;
    className?: string;
    delay?: number;
}

export function NumberTicker({
    value,
    className,
    delay = 0,
}: NumberTickerProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const previousValue = useRef(value);

    useEffect(() => {
        if (value === previousValue.current) return;

        let startTimestamp: number | null = null;
        const duration = 500; // Faster transition for clock
        const startValue = previousValue.current;
        const diff = value - startValue;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            const current = Math.floor(startValue + diff * progress);
            setDisplayValue(current);

            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                previousValue.current = value;
            }
        };

        const timeout = setTimeout(() => {
            window.requestAnimationFrame(step);
        }, delay * 1000);

        return () => clearTimeout(timeout);
    }, [value, delay]);

    return (
        <span className={cn("inline-block tabular-nums tracking-tighter", className)}>
            {displayValue.toString().padStart(2, "0")}
        </span>
    );
}
