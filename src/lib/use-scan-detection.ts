import { useEffect, useRef, useState } from "react";

interface ScanDetectionOptions {
    onScan: (code: string) => void;
    minLength?: number;
    timeBetweenKeys?: number;
}

export const useScanDetection = ({
    onScan,
    minLength = 3,
    timeBetweenKeys = 500
}: ScanDetectionOptions) => {
    const buffer = useRef<string>("");
    const lastKeyTime = useRef<number>(0);

    // Focus handling to ensure we catch events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const char = e.key;

            // Ignore non-character keys (except Enter)
            if (char.length > 1 && char !== "Enter") {
                return;
            }

            // Ignore if focus is on an input
            const target = e.target as HTMLElement;
            if (target.matches("input, textarea, [contenteditable]")) {
                return;
            }

            // Check timing
            if (now - lastKeyTime.current > timeBetweenKeys) {
                buffer.current = "";
            }

            lastKeyTime.current = now;

            if (char === "Enter") {
                if (buffer.current.length >= minLength) {
                    e.preventDefault();
                    e.stopPropagation();
                    onScan(buffer.current);
                    buffer.current = "";
                }
            } else {
                buffer.current += char;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onScan, minLength, timeBetweenKeys]);
};
