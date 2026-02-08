import { useEffect, useRef, useState } from "react";

interface ScanDetectionOptions {
    onScan: (code: string) => void;
    minLength?: number;
    timeBetweenKeys?: number;
}

// Cyrillic to Latin mapping based on QWERTY/ЙЦУКЕН keyboard layout
const cyrillicToLatin: Record<string, string> = {
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.',
    // Uppercase
    'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P', 'Х': '{', 'Ъ': '}',
    'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ж': ':', 'Э': '"',
    'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M', 'Б': '<', 'Ю': '>',
};

// Convert Cyrillic barcode to Latin (in case of wrong keyboard layout)
const transliterateBarcode = (code: string): string => {
    // Check if code contains Cyrillic characters
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(code);
    if (!hasCyrillic) return code;

    // Transliterate each character
    return code.split('').map(char => cyrillicToLatin[char] || char).join('');
};

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
                    // Transliterate if barcode contains Cyrillic (wrong keyboard layout)
                    const transliterated = transliterateBarcode(buffer.current);
                    onScan(transliterated);
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
