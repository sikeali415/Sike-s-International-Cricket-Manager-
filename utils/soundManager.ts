// Web Audio API Synthesizer Sound Manager
// Generates procedural sounds for game actions to avoid external assets dependency

export type SFXType = 'click' | 'success' | 'error' | 'four' | 'six' | 'wicket' | 'cheer' | 'bounce' | 'stroke' | 'bowled' | 'catch' | 'fifty' | 'hundred';

let audioContext: AudioContext | null = null;
let sfxEnabled = true;
let musicEnabled = false;

// TTS Settings
let ttsEnabled = true;
let ttsVolume = 1.0;
let ttsRate = 1.1;
let ttsPitch = 1.0;
let ttsVoiceName = '';

// Safe localStorage helper
const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch {
            // ignore
        }
    }
};

// Initialize settings from localStorage if available
if (typeof window !== 'undefined') {
    sfxEnabled = safeStorage.getItem('cricket_sfx_enabled') !== 'false';
    musicEnabled = safeStorage.getItem('cricket_music_enabled') === 'true';
    ttsEnabled = safeStorage.getItem('cricket_tts_enabled') !== 'false';
    ttsVolume = parseFloat(safeStorage.getItem('cricket_tts_volume') || '1.0');
    ttsRate = parseFloat(safeStorage.getItem('cricket_tts_rate') || '1.1');
    ttsPitch = parseFloat(safeStorage.getItem('cricket_tts_pitch') || '1.0');
    ttsVoiceName = safeStorage.getItem('cricket_tts_voice') || '';
}

function getAudioContext(): AudioContext | null {
    try {
        if (!audioContext && typeof window !== 'undefined') {
            // @ts-ignore
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                audioContext = new AudioCtx();
            }
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
        return audioContext;
    } catch {
        return null;
    }
}

export const playSFX = (type: SFXType) => {
    if (!sfxEnabled) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        switch (type) {
            case 'click': {
                // Short, snappy tap
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
                break;
            }
            case 'bounce': {
                // Short organic wood bat knock
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.07);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.07);
                break;
            }
            case 'error': {
                // Low descending tone for validation error
                [320, 240, 180].forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + index * 0.08);

                    gain.gain.setValueAtTime(0.04, now + index * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.12);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + index * 0.08);
                    osc.stop(now + index * 0.08 + 0.12);
                });
                break;
            }
            case 'success': {
                // Happy chord arpeggio
                [440, 554, 659, 880].forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + index * 0.06);

                    gain.gain.setValueAtTime(0.05, now + index * 0.06);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + index * 0.06);
                    osc.stop(now + index * 0.06 + 0.25);
                });
                break;
            }
            case 'four': {
                // Higher rising arpeggio for hitting a boundary
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + index * 0.05);

                    gain.gain.setValueAtTime(0.06, now + index * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.3);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + index * 0.05);
                    osc.stop(now + index * 0.05 + 0.3);
                });
                break;
            }
            case 'six': {
                // Extra celebratory giant hit sound combining pitch-slides & chords
                const oscs = [600, 750, 900, 1200];
                oscs.forEach((baseFreq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    
                    osc.frequency.setValueAtTime(baseFreq, now);
                    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.4);

                    gain.gain.setValueAtTime(0.04, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.45);
                });
                break;
            }
            case 'wicket': {
                // Sad dramatic falling pitch
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.5);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, now);
                filter.frequency.linearRampToValueAtTime(100, now + 0.5);

                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            }
            case 'cheer': {
                // Simulates white noise whoosh / crowd roar arpeggios
                const bufferSize = ctx.sampleRate * 0.8; // 0.8s roar
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(400, now);
                filter.frequency.exponentialRampToValueAtTime(1500, now + 0.3);
                filter.frequency.exponentialRampToValueAtTime(300, now + 0.8);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start(now);
                noise.stop(now + 0.8);
                break;
            }
            case 'stroke': {
                // Leather on willow: crisp wood impact + pop
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

                gain.gain.setValueAtTime(0.22, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

                const bufferSize = ctx.sampleRate * 0.02;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const noiseData = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;

                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.15, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

                osc.connect(gain);
                gain.connect(ctx.destination);
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.06);
                noise.start(now);
                noise.stop(now + 0.02);
                break;
            }
            case 'bowled': {
                // Stumps timber crash & rattling metal noise
                [130, 190, 260, 320, 480].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = idx % 2 === 0 ? 'square' : 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.012);
                    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

                    gain.gain.setValueAtTime(0.12, now + idx * 0.012);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.012);
                    osc.stop(now + 0.35);
                });

                const bufferSize = ctx.sampleRate * 0.35;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(900, now);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.18, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(ctx.destination);
                noise.start(now);
                noise.stop(now + 0.35);
                break;
            }
            case 'catch': {
                // Leather glove thud & snap
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.exponentialRampToValueAtTime(65, now + 0.08);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

                const bufferSize = ctx.sampleRate * 0.025;
                const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.18, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

                osc.connect(gain);
                gain.connect(ctx.destination);
                noise.connect(noiseGain);
                noiseGain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.08);
                noise.start(now);
                noise.stop(now + 0.025);
                break;
            }
            case 'fifty': {
                // Half-century celebratory fanfare
                const notes = [523.25, 659.25, 783.99, 659.25, 1046.50];
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.09);

                    const duration = idx === notes.length - 1 ? 0.5 : 0.12;
                    gain.gain.setValueAtTime(0.1, now + idx * 0.09);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + duration);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.09);
                    osc.stop(now + idx * 0.09 + duration);
                });
                break;
            }
            case 'hundred': {
                // Century grand triumphant fanfare
                const notes = [523.25, 659.25, 783.99, 1046.50, 880.00, 987.77, 1318.51];
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.11);

                    const duration = idx === notes.length - 1 ? 0.8 : 0.15;
                    gain.gain.setValueAtTime(0.12, now + idx * 0.11);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + duration);

                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(2200, now);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.11);
                    osc.stop(now + idx * 0.11 + duration);
                });
                break;
            }
        }
    } catch (e) {
        console.warn('Audio contextual playback skipped/failed:', e);
    }
};

// Procedural background chord generator representing background music
let musicTimer: any = null;
let currentChord = 0;
const chords = [
    [130.81, 164.81, 196.00], // C major reference low
    [146.83, 174.61, 220.00], // D minor
    [164.81, 196.00, 246.94], // E minor
    [174.61, 220.00, 261.63], // F major
];

export const startMusicLoop = () => {
    if (!musicEnabled) return;
    if (musicTimer) clearInterval(musicTimer);

    const playChordStep = () => {
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;
            const currentFreqs = chords[currentChord];

            currentFreqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'triangle';
                // Very clean cozy pad sound
                osc.frequency.setValueAtTime(freq * 2, now);
                
                gain.gain.setValueAtTime(0, now);
                // Slow ambient fade-in
                gain.gain.linearRampToValueAtTime(0.015, now + 0.4); 
                // Warm sustain and slow decay
                gain.gain.setValueAtTime(0.015, now + 1.2);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 2.0);
            });

            currentChord = (currentChord + 1) % chords.length;
        } catch (e) {
            console.warn('Procedural Ambient music playback failed:', e);
        }
    };

    // Play right away and schedule every 2 seconds
    playChordStep();
    musicTimer = setInterval(playChordStep, 2000);
};

export const stopMusicLoop = () => {
    if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
    }
};

export const setSFXEnabled = (enabled: boolean) => {
    sfxEnabled = enabled;
    safeStorage.setItem('cricket_sfx_enabled', enabled ? 'true' : 'false');
    if (enabled) {
        playSFX('click');
    }
};

export const isSFXEnabled = () => sfxEnabled;

export const setMusicEnabled = (enabled: boolean) => {
    musicEnabled = enabled;
    safeStorage.setItem('cricket_music_enabled', enabled ? 'true' : 'false');
    if (enabled) {
        startMusicLoop();
    } else {
        stopMusicLoop();
    }
};

export const isMusicEnabled = () => musicEnabled;

// --- TTS Commentary Reader Engine ---
export const isTTSEnabled = () => ttsEnabled;
export const setTTSEnabled = (enabled: boolean) => {
    ttsEnabled = enabled;
    safeStorage.setItem('cricket_tts_enabled', enabled ? 'true' : 'false');
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

export const getTTSVolume = () => ttsVolume;
export const setTTSVolume = (vol: number) => {
    ttsVolume = vol;
    safeStorage.setItem('cricket_tts_volume', vol.toString());
};

export const getTTSRate = () => ttsRate;
export const setTTSRate = (rate: number) => {
    ttsRate = rate;
    safeStorage.setItem('cricket_tts_rate', rate.toString());
};

export const getTTSPitch = () => ttsPitch;
export const setTTSPitch = (pitch: number) => {
    ttsPitch = pitch;
    safeStorage.setItem('cricket_tts_pitch', pitch.toString());
};

export const getTTSVoice = () => ttsVoiceName;
export const setTTSVoice = (vName: string) => {
    ttsVoiceName = vName;
    safeStorage.setItem('cricket_tts_voice', vName);
};

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
};

export const speakCommentary = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel(); // Keep commentary real-time & clear previous
        if (!text || text.trim() === '') return;

        // Clean out emojis or symbols for smooth reading
        const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.volume = ttsVolume;
        utterance.rate = ttsRate;
        utterance.pitch = ttsPitch;

        const voices = window.speechSynthesis.getVoices();
        if (ttsVoiceName) {
            const found = voices.find(v => v.name === ttsVoiceName);
            if (found) utterance.voice = found;
        } else if (voices.length > 0) {
            const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('English')));
            if (enVoice) utterance.voice = enVoice;
        }

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Speech synthesis error:', e);
    }
};

export const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

