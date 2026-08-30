import React from 'react';
import { User } from 'firebase/auth';
import { Download, Smartphone, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface MainMenuProps {
    onStartNewGame: () => void;
    onResumeGame: () => void;
    onResetGame: () => void;
    hasSaveData: boolean;
    user: User | null;
    onSignIn: () => void;
    onSignOut: () => void;
    onOpenPWAInstall?: () => void;
    isOnline?: boolean;
    isInstallable?: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
    onStartNewGame, 
    onResumeGame, 
    onResetGame, 
    hasSaveData, 
    user, 
    onSignIn, 
    onSignOut,
    onOpenPWAInstall,
    isOnline = true,
    isInstallable = false
}) => (
    <div className="h-full flex flex-col items-center justify-between p-6 bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 1)), url('https://images.unsplash.com/photo-1595435942477-f5439483405a?q=80&w=2070&auto=format&fit=crop')" }}>
        <div className="h-full w-full absolute top-0 left-0 bg-gradient-to-b dark:from-black/80 dark:via-[#1c2421] dark:to-[#0f172a] from-gray-100/80 to-gray-50"></div>
        
        {/* Top Header Row: User Profile & Online/Offline/Install Bar */}
        <div className="relative z-20 w-full flex items-center justify-between gap-2 pt-4">
            {user ? (
                <div className="flex items-center gap-2.5 bg-white/40 dark:bg-black/40 backdrop-blur-md p-1.5 px-3 rounded-full border border-white/30 shadow-sm">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-7 h-7 rounded-full border border-teal-400" referrerPolicy="no-referrer" />
                    <div className="text-left">
                        <p className="text-[9px] font-bold text-teal-600 dark:text-teal-400 leading-none">SIGNED IN</p>
                        <p className="text-xs font-black text-gray-900 dark:text-white leading-tight truncate max-w-[100px]">{user.displayName?.split(' ')[0]}</p>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => { playSFX('click'); onSignIn(); }}
                    className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 rounded-full shadow-lg border border-teal-500/30 hover:scale-105 active:scale-95 transition-all text-xs font-bold"
                >
                    <svg className="w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.4-1.12 1.12-2.6 1.96-4.64 1.96-4.12 0-7.44-3.24-7.44-7.36s3.32-7.36 7.44-7.36c2.24 0 4 .88 5.28 2.12l2.32-2.32C19.12 1.28 16.32 0 12.48 0 5.48 0 0 5.48 0 12.48s5.48 12.48 12.48 12.48c4.08 0 7.16-1.32 9.56-3.84 2.48-2.48 3.24-5.92 3.24-8.8 0-.84-.08-1.64-.16-2.4H12.48z"/>
                    </svg>
                    <span>Sign In</span>
                </button>
            )}

            <div className="flex items-center gap-1.5">
                {/* PWA Offline / Install Button */}
                {onOpenPWAInstall && (
                    <button
                        onClick={() => { playSFX('click'); onOpenPWAInstall(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[11px] font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
                        title="PWA Offline Chrome App & Android APK Install"
                    >
                        <Smartphone size={13} className="text-teal-500" />
                        <span>Install App</span>
                    </button>
                )}

                {/* Connection Status Pill */}
                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'}`}>
                    {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
                    <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
            </div>
        </div>

        {/* Center Hero Branding */}
        <div className="relative z-10 text-center my-auto w-full max-w-xs space-y-3">
            {/* App Icon Badge */}
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-600 to-slate-900 p-0.5 shadow-2xl shadow-teal-500/30 flex items-center justify-center">
                <img 
                    src="/app-icon.svg" 
                    alt="Cricket Manager 26 Icon" 
                    className="w-full h-full object-cover rounded-3xl"
                    onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                    }}
                />
            </div>

            <div>
                <span className="text-xs font-black tracking-widest text-yellow-600 dark:text-yellow-400 uppercase">
                    SIKE'S CRICKET SIMULATOR
                </span>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                    CRICKET MANAGER
                </h1>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">26 Beta</span>
                    <span className="text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full">
                        Offline PWA
                    </span>
                </div>
            </div>

            {/* Menu Buttons */}
            <div className="space-y-3 pt-4 w-full">
                {hasSaveData && (
                    <button
                        onClick={() => { playSFX('click'); onResumeGame(); }}
                        className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black py-3.5 px-6 text-lg rounded-2xl shadow-xl shadow-teal-500/25 transform hover:scale-105 active:scale-95 transition-all w-full flex items-center justify-center gap-2"
                    >
                        <span>Resume Career</span>
                    </button>
                )}
                <button
                    onClick={() => { playSFX('click'); onStartNewGame(); }}
                    className="bg-gray-800 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-black py-3.5 px-6 text-lg rounded-2xl shadow-lg border border-slate-700 hover:scale-105 active:scale-95 transition-all w-full flex items-center justify-center gap-2"
                >
                    <span>{hasSaveData ? "Start New Game" : "Start Career"}</span>
                </button>

                {onOpenPWAInstall && (
                    <button
                        onClick={() => { playSFX('click'); onOpenPWAInstall(); }}
                        className="w-full bg-teal-950/40 hover:bg-teal-900/40 text-teal-300 border border-teal-500/40 text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Download size={14} />
                        <span>Install Chrome App &amp; Offline APK</span>
                    </button>
                )}

                <button
                    onClick={() => { playSFX('click'); onResetGame(); }}
                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 text-[11px] font-bold uppercase tracking-widest py-2 px-4 rounded-xl transition-all mt-2"
                >
                    Wipe &amp; Clear All Saved Data
                </button>
            </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-center w-full pb-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                PWA Offline Standalone • Android &amp; Chrome App Ready
            </p>
        </div>
    </div>
);

export default MainMenu;
