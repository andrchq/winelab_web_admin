/**
 * Sound feedback utility for scanning operations.
 * Uses Web Audio API to generate tones without external audio files.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn('Sound playback failed:', e);
    }
}

export const sounds = {
    /** Short high-pitched beep — scan confirmed */
    success: () => {
        playTone(880, 0.15, 'sine', 0.25);
        setTimeout(() => playTone(1100, 0.15, 'sine', 0.25), 100);
    },

    /** Low buzzer — error */
    error: () => {
        playTone(200, 0.3, 'square', 0.2);
        setTimeout(() => playTone(150, 0.4, 'square', 0.2), 200);
    },

    /** Three quick beeps — attention needed (e.g., duplicate scan, excess) */
    warning: () => {
        playTone(600, 0.1, 'triangle', 0.3);
        setTimeout(() => playTone(600, 0.1, 'triangle', 0.3), 150);
        setTimeout(() => playTone(600, 0.1, 'triangle', 0.3), 300);
    },

    /** Single soft beep — item found / navigation */
    info: () => {
        playTone(660, 0.12, 'sine', 0.15);
    },

    /** Rising tone — completion */
    complete: () => {
        playTone(523, 0.15, 'sine', 0.2);
        setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 120);
        setTimeout(() => playTone(784, 0.2, 'sine', 0.25), 240);
    }
};
