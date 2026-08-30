
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogOut, Cloud, CloudOff, Database, Volume2, VolumeX, Music, Mic, Play, Sparkles, RotateCcw, RefreshCw, Trophy, Smartphone, Download, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { GameData, Format } from '../types';
import { restartTournament } from '../utils';
import { ConfirmModal } from './ConfirmModal';
import { PWAInstallModal } from './PWAInstallModal';
import { subscribeInstallable, subscribeOnlineStatus, isStandaloneApp } from '../utils/pwaManager';
import { 
    isSFXEnabled, isMusicEnabled, setSFXEnabled, setMusicEnabled, playSFX,
    isTTSEnabled, setTTSEnabled, getTTSRate, setTTSRate, getTTSPitch, setTTSPitch,
    getTTSVolume, setTTSVolume, getTTSVoice, setTTSVoice, getAvailableVoices, speakCommentary
} from '../utils/soundManager';

interface SettingsProps {
    gameData?: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    setScreen?: (screen: any) => void;
    showFeedback?: (msg: string, type?: 'success' | 'error') => void;
    onResetGame: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    saveGame: () => void;
    loadGame: () => void;
    user: User | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ gameData, setGameData, setScreen, showFeedback, onResetGame, theme, setTheme, saveGame, loadGame, user, onSignIn, onSignOut }) => {
    const [sfx, setSfx] = useState(isSFXEnabled());
    const [music, setMusic] = useState(isMusicEnabled());
    const [tts, setTts] = useState(isTTSEnabled());
    const [ttsRate, setTtsRateState] = useState(getTTSRate());
    const [ttsPitch, setTtsPitchState] = useState(getTTSPitch());
    const [ttsVolume, setTtsVolumeState] = useState(getTTSVolume());
    const [ttsVoice, setTtsVoiceState] = useState(getTTSVoice());
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        setIsStandalone(isStandaloneApp());
        const unsubInstall = subscribeInstallable(setIsInstallable);
        const unsubOnline = subscribeOnlineStatus(setIsOnline);
        return () => {
            unsubInstall();
            unsubOnline();
        };
    }, []);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        isDanger?: boolean;
        icon?: 'warning' | 'restart' | 'danger';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const openConfirm = (
        title: string, 
        message: string, 
        onConfirm: () => void, 
        opts?: { confirmText?: string; isDanger?: boolean; icon?: 'warning' | 'restart' | 'danger' }
    ) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            },
            confirmText: opts?.confirmText || 'Confirm',
            isDanger: opts?.isDanger || false,
            icon: opts?.icon || 'warning'
        });
    };

    useEffect(() => {
        const updateVoices = () => {
            const avail = getAvailableVoices();
            setVoices(avail);
        };
        updateVoices();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
    }, []);

    const handleToggleSFX = () => {
        const nextState = !sfx;
        setSfx(nextState);
        setSFXEnabled(nextState);
    };

    const handleToggleMusic = () => {
        const nextState = !music;
        setMusic(nextState);
        setMusicEnabled(nextState);
    };

    const handleToggleTTS = () => {
        const nextState = !tts;
        setTts(nextState);
        setTTSEnabled(nextState);
        if (nextState) {
            speakCommentary("TTS Commentary reader enabled!");
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-black text-center tracking-tight uppercase">Settings</h2>
            
            {/* User Account Section */}
            <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-white/5">
                {user ? (
                    <div className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <img 
                                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                                alt="Profile" 
                                className="w-12 h-12 rounded-full border-2 border-teal-500"
                                referrerPolicy="no-referrer"
                            />
                            <div className="flex-grow">
                                <p className="text-xs font-bold text-teal-500 uppercase leading-none">Cloud Connected</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate">{user.displayName}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    playSFX('click');
                                    openConfirm(
                                        'Sign Out',
                                        'Are you sure you want to sign out? Your local save will remain intact.',
                                        () => onSignOut(),
                                        { confirmText: 'Sign Out', icon: 'warning' }
                                    );
                                }}
                                className="flex-grow flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                            >
                                <LogOut size={14} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center space-y-3">
                        <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                            <CloudOff size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold dark:text-white">Not Signed In</p>
                            <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto">Sign in with Google to enable automatic cloud backup and cross-device play.</p>
                        </div>
                        <button 
                            onClick={() => { playSFX('click'); onSignIn(); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-600/20"
                        >
                            Sign In with Google
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Theme */}
                <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl shadow-sm">
                    <span className="font-bold text-sm">Theme</span>
                    <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-lg">
                        <button onClick={() => { playSFX('click'); setTheme('light'); }} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Light</button>
                        <button onClick={() => { playSFX('click'); setTheme('dark'); }} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Dark</button>
                    </div>
                </div>

                {/* Sound & Audio Effects Controls */}
                <div className="bg-gray-100 dark:bg-gray-800/40 border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Audio Effects & Music</p>
                        <span className="text-[10px] text-teal-500 font-bold">Web Audio Synthesizer</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {sfx ? <Volume2 size={16} className="text-teal-400" /> : <VolumeX size={16} className="text-slate-500" />}
                            <div>
                                <span className="text-sm font-bold block">Sound Effects</span>
                                <span className="text-[10px] text-slate-400 block">Strokes, bowled, catches, 50/100 celebrations</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleToggleSFX}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest min-w-[70px] transition-all ${sfx ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                        >
                            {sfx ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {sfx && (
                        <div className="p-3 bg-slate-200/50 dark:bg-black/20 rounded-lg space-y-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Test Sound Effects:</p>
                            <div className="flex flex-wrap gap-1.5">
                                <button onClick={() => playSFX('stroke')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">🏏 Stroke</button>
                                <button onClick={() => playSFX('bowled')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">🎯 Bowled!</button>
                                <button onClick={() => playSFX('catch')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">🤲 Catch!</button>
                                <button onClick={() => playSFX('four')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">4️⃣ Four</button>
                                <button onClick={() => playSFX('six')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">6️⃣ Six</button>
                                <button onClick={() => playSFX('fifty')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">🎉 50 Celebration</button>
                                <button onClick={() => playSFX('hundred')} className="px-2.5 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded hover:bg-teal-500 hover:text-white transition-all">💯 100 Celebration</button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Music size={16} className={music ? 'text-teal-400 animate-pulse' : 'text-slate-500'} />
                            <span className="text-sm font-bold">Background Music</span>
                        </div>
                        <button 
                            onClick={handleToggleMusic}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest min-w-[70px] transition-all ${music ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                        >
                            {music ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                {/* Offline Device TTS Commentary Reader */}
                <div className="bg-gray-100 dark:bg-gray-800/40 border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                            <Mic size={16} className={tts ? "text-teal-400 animate-pulse" : "text-slate-500"} />
                            <div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Device Offline TTS Reader</p>
                                <span className="text-xs font-bold block">Live Commentary Voice Reader</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleToggleTTS}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest min-w-[70px] transition-all ${tts ? 'bg-teal-500 text-slate-950 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}
                        >
                            {tts ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {tts && (
                        <div className="space-y-3 pt-1">
                            {/* Voice Selector */}
                            {voices.length > 0 && (
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Commentary Voice ({voices.length} voices found)</label>
                                    <select 
                                        value={ttsVoice}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setTtsVoiceState(v);
                                            setTTSVoice(v);
                                            speakCommentary("Voice selected for match commentary.");
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium p-2 rounded-lg text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">Default System Voice</option>
                                        {voices.map(v => (
                                            <option key={v.name} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Speed Slider */}
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span>Commentary Speed</span>
                                    <span className="text-teal-500">{ttsRate.toFixed(1)}x</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0.7"
                                    max="2.0"
                                    step="0.1"
                                    value={ttsRate}
                                    onChange={(e) => {
                                        const r = parseFloat(e.target.value);
                                        setTtsRateState(r);
                                        setTTSRate(r);
                                    }}
                                    className="w-full accent-teal-500 cursor-pointer"
                                />
                            </div>

                            {/* Pitch Slider */}
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span>Voice Pitch</span>
                                    <span className="text-teal-500">{ttsPitch.toFixed(1)}</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0.6"
                                    max="1.5"
                                    step="0.1"
                                    value={ttsPitch}
                                    onChange={(e) => {
                                        const p = parseFloat(e.target.value);
                                        setTtsPitchState(p);
                                        setTTSPitch(p);
                                    }}
                                    className="w-full accent-teal-500 cursor-pointer"
                                />
                            </div>

                            {/* Test Button */}
                            <button 
                                onClick={() => speakCommentary("Sike smashed it over deep midwicket for SIX! What a massive blow!")}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-bold transition-all border border-teal-500/30"
                            >
                                <Play size={12} />
                                Test Commentary Voice
                            </button>
                        </div>
                    )}
                </div>

                {/* Tournament Restarter Controls */}
                {gameData && setGameData && (
                    <div className="bg-gray-100 dark:bg-gray-800/40 border border-slate-200 dark:border-white/5 p-4 rounded-xl space-y-3 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                                <RotateCcw size={16} className="text-amber-500" />
                                <div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Tournament Restarter</p>
                                    <span className="text-xs font-bold block">Reset Any Tournament Progress</span>
                                </div>
                            </div>
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase">Fresh Start</span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            Select a tournament format below to restart its schedule, matches, and standings for the current season.
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                            {[
                                { format: Format.T20, label: 'T20 League', icon: '⚡', color: 'from-amber-600 to-orange-600' },
                                { format: Format.ODI, label: 'List A (ODI) Cup', icon: '🏆', color: 'from-blue-600 to-cyan-600' },
                                { format: Format.SHIELD, label: 'First Class (Shield)', icon: '🛡️', color: 'from-emerald-600 to-teal-600' },
                            ].map((item) => (
                                <button
                                    key={item.format}
                                    onClick={() => {
                                        playSFX('click');
                                        openConfirm(
                                            `Restart ${item.label}?`,
                                            `This will reset all match fixtures, results, and league standings for ${item.label} back to Match Day 1.`,
                                            () => {
                                                const updated = restartTournament(gameData, item.format);
                                                setGameData(updated);
                                                playSFX('success');
                                                if (showFeedback) showFeedback(`${item.label} tournament restarted!`, 'success');
                                                if (setScreen) setScreen('SCHEDULE');
                                            },
                                            { confirmText: 'Restart Format', icon: 'restart' }
                                        );
                                    }}
                                    className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 rounded-lg hover:border-amber-500/50 hover:bg-amber-500/5 transition-all active:scale-95 text-left group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{item.icon}</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">{item.label}</span>
                                    </div>
                                    <RotateCcw size={12} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                playSFX('click');
                                openConfirm(
                                    'Restart ALL Tournaments?',
                                    'DANGER: This will reset all schedules, match logs, and standings across T10, T20, ODI, and Shield back to Match Day 1.',
                                    () => {
                                        const updated = restartTournament(gameData, 'ALL');
                                        setGameData(updated);
                                        playSFX('success');
                                        if (showFeedback) showFeedback('ALL tournaments restarted successfully!', 'success');
                                        if (setScreen) setScreen('SCHEDULE');
                                    },
                                    { confirmText: 'Restart ALL Tournaments', isDanger: true, icon: 'restart' }
                                );
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600 hover:to-orange-600 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-500/30 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                        >
                            <RefreshCw size={14} />
                            Restart ALL Tournaments
                        </button>
                    </div>
                )}
                
                {/* PWA Offline & Android APK Installation Hub */}
                <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30 p-4 rounded-xl space-y-3 shadow-md">
                    <div className="flex justify-between items-center border-b border-teal-500/20 pb-2">
                        <div className="flex items-center gap-2">
                            <Smartphone size={16} className="text-teal-400" />
                            <div>
                                <p className="text-[10px] text-teal-400 uppercase font-black tracking-widest">Chrome App &amp; Android APK</p>
                                <span className="text-xs font-bold block dark:text-white">PWA Offline Installation</span>
                            </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
                        </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight">
                        Install Cricket Manager 26 as a standalone app on Android, PC/Mac Chrome, or iOS with complete offline match simulation support.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={() => {
                                playSFX('click');
                                setIsInstallModalOpen(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                        >
                            <Download size={14} />
                            <span>{isStandalone ? 'Offline PWA Manager' : 'Install App / APK Guide'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { playSFX('click'); saveGame(); }} className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 border-2 border-dashed border-teal-500/30 text-teal-600 dark:text-teal-400 font-black py-3 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-all active:scale-95">
                        <Cloud size={18} />
                        <span className="text-[10px] uppercase tracking-tighter">Sync Save</span>
                    </button>
                    <button onClick={() => { playSFX('click'); loadGame(); }} className="flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-black py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95">
                        <Database size={18} />
                        <span className="text-[10px] uppercase tracking-tighter">Load Save</span>
                    </button>
                </div>

                <button 
                    onClick={() => {
                        playSFX('click');
                        openConfirm(
                            'Exit to Main Menu?',
                            'Your progress is saved automatically.',
                            () => window.location.reload(),
                            { confirmText: 'Exit Game', icon: 'warning' }
                        );
                    }} 
                    className="w-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-black py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest"
                >
                    EXIT TO MAIN MENU
                </button>

                <div className="pt-8 mt-4 border-t border-slate-200 dark:border-white/5">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black mb-3 px-1 tracking-widest text-center">DANGER ZONE</p>
                    <button 
                        onClick={() => {
                            playSFX('click');
                            openConfirm(
                                'Delete All Saved Data?',
                                'PERMANENT: This will delete your current game save completely.',
                                () => onResetGame(),
                                { confirmText: 'Delete Everything', isDanger: true, icon: 'danger' }
                            );
                        }} 
                        className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 font-black py-3.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest"
                    >
                        DELETE ALL DATA
                    </button>
                </div>

                <ConfirmModal 
                    isOpen={modalConfig.isOpen}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    confirmText={modalConfig.confirmText}
                    isDanger={modalConfig.isDanger}
                    icon={modalConfig.icon}
                    onConfirm={modalConfig.onConfirm}
                    onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                />

                <PWAInstallModal
                    isOpen={isInstallModalOpen}
                    onClose={() => setIsInstallModalOpen(false)}
                    isInstallable={isInstallable}
                    isOnline={isOnline}
                    showFeedback={showFeedback}
                />
            </div>
        </div>
    );
};

export default Settings;
