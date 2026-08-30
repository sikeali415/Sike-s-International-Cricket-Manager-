import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, CheckCircle2, ShieldCheck, Smartphone } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if running as standalone PWA
        if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
            setIsInstalled(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    if (dismissed) return null;

    return (
        <div className="w-full bg-slate-900/90 border-b border-teal-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-medium backdrop-blur-md">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
                {isOnline ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Wifi className="w-3.5 h-3.5" />
                        ONLINE
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                        <WifiOff className="w-3.5 h-3.5" />
                        OFFLINE PLAY MODE (CACHED)
                    </span>
                )}

                <span className="text-slate-300 hidden sm:inline">
                    {isInstalled ? 'Cricket Manager 26 App Installed' : 'Chrome Installable PWA App'}
                </span>
            </div>

            {/* Install / App Status Actions */}
            <div className="flex items-center gap-3 ml-auto">
                {isInstalled ? (
                    <span className="flex items-center gap-1 text-teal-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        App Ready Offline
                    </span>
                ) : (
                    <button
                        onClick={handleInstallClick}
                        disabled={!deferredPrompt}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                            deferredPrompt
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 hover:from-teal-400 hover:to-cyan-500 shadow-teal-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                        }`}
                        title={deferredPrompt ? "Install Chrome App" : "Use Chrome Menu > Add to Home Screen to Install"}
                    >
                        <Download className="w-3.5 h-3.5" />
                        {deferredPrompt ? 'INSTALL CHROME APP' : 'APP READY TO INSTALL'}
                    </button>
                )}

                <button
                    onClick={() => setDismissed(true)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                    title="Close banner"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};
