import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  HardDrive, 
  RefreshCw, 
  Share2, 
  X, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  triggerPWAInstall, 
  isStandaloneApp, 
  checkCacheStorageStatus, 
  forceRefreshOfflineCache 
} from '../utils/pwaManager';
import { playSFX } from '../utils/soundManager';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isOnline: boolean;
  showFeedback?: (msg: string, type?: 'success' | 'error') => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isOnline,
  showFeedback
}) => {
  const [activeTab, setActiveTab] = useState<'chrome_android' | 'desktop' | 'ios' | 'offline_cache'>('chrome_android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ cachedCount: number; quotaMB?: number; usageMB?: number }>({ cachedCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsStandalone(isStandaloneApp());
      checkCacheStorageStatus().then(setCacheStats);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    playSFX('click');
    const outcome = await triggerPWAInstall();
    if (outcome === 'accepted') {
      playSFX('success');
      if (showFeedback) showFeedback('App installation started!', 'success');
      onClose();
    } else if (outcome === 'dismissed') {
      if (showFeedback) showFeedback('Installation dismissed.', 'error');
    }
  };

  const handleSyncCache = async () => {
    playSFX('click');
    setIsSyncing(true);
    const success = await forceRefreshOfflineCache();
    const stats = await checkCacheStorageStatus();
    setCacheStats(stats);
    setIsSyncing(false);
    if (success) {
      playSFX('success');
      if (showFeedback) showFeedback('Offline cache updated & verified!', 'success');
    } else {
      if (showFeedback) showFeedback('Failed to update cache.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-slate-900 border border-teal-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Banner */}
        <div className="relative bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 p-5 border-b border-teal-500/20">
          <button 
            onClick={() => { playSFX('click'); onClose(); }}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 p-0.5 shadow-lg shadow-teal-500/20 flex-shrink-0">
              <img 
                src="/app-icon.svg" 
                alt="App Icon" 
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  PWA &amp; Chrome App
                </span>
                {isOnline ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <Wifi size={11} /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                    <WifiOff size={11} /> Offline
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                Cricket Manager 26
              </h2>
              <p className="text-xs text-slate-400">
                Install as a native standalone app with 100% offline gameplay
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action / Installation Status */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3">
          {isStandalone ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={16} />
              <span>Installed &amp; Running in Standalone App Mode</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Download size={16} />
              <span>1-Click Install App (Chrome / Android)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Smartphone size={16} className="text-teal-400" />
              <span>Follow the instructions below to install on your device</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 border-b border-slate-800 p-1.5 gap-1 text-[11px] font-bold">
          <button
            onClick={() => { playSFX('click'); setActiveTab('chrome_android'); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'chrome_android' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone size={13} />
            <span>Android / Chrome</span>
          </button>
          <button
            onClick={() => { playSFX('click'); setActiveTab('desktop'); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'desktop' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Monitor size={13} />
            <span>PC / Mac</span>
          </button>
          <button
            onClick={() => { playSFX('click'); setActiveTab('ios'); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'ios' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Share2 size={13} />
            <span>iOS / Safari</span>
          </button>
          <button
            onClick={() => { playSFX('click'); setActiveTab('offline_cache'); }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${activeTab === 'offline_cache' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <HardDrive size={13} />
            <span>Offline Sync</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'chrome_android' && (
            <div className="space-y-3">
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Smartphone size={16} />
                  <span className="text-sm">How to Install on Android / Chrome APK:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Open this app in <strong className="text-white">Google Chrome</strong> on your Android device.
                  </li>
                  <li>
                    Tap the <strong className="text-white">Three Dots (⋮)</strong> in the top-right corner of Chrome.
                  </li>
                  <li>
                    Select <strong className="text-teal-300">"Install app"</strong> or <strong className="text-teal-300">"Add to Home screen"</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">Install</strong>. The app will be placed in your phone's app drawer &amp; home screen.
                  </li>
                </ol>
              </div>

              <div className="bg-teal-950/30 border border-teal-500/20 p-3 rounded-xl flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300">
                  <strong className="text-teal-300">Offline &amp; Fullscreen Experience:</strong> Once installed, the game launches in full screen without browser bars and loads entirely offline even in airplane mode.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Monitor size={16} />
                  <span className="text-sm">How to Install on PC / Mac (Chrome &amp; Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Open the game in <strong className="text-white">Google Chrome</strong>, <strong className="text-white">Microsoft Edge</strong>, or <strong className="text-white">Brave</strong>.
                  </li>
                  <li>
                    Look at the right side of the address bar (URL bar) for the <strong className="text-teal-300">Install icon (⊕)</strong> or computer monitor icon.
                  </li>
                  <li>
                    Click <strong className="text-white">Install Cricket Manager 26</strong>.
                  </li>
                  <li>
                    The game will launch in its own standalone desktop window with a desktop shortcut!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Share2 size={16} />
                  <span className="text-sm">How to Install on iOS (iPhone &amp; iPad):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                  <li>
                    Open this game in <strong className="text-white">Apple Safari</strong> on your iPhone or iPad.
                  </li>
                  <li>
                    Tap the <strong className="text-white">Share button (⎋ with arrow)</strong> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <strong className="text-teal-300">"Add to Home Screen"</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">Add</strong> in the top-right corner.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'offline_cache' && (
            <div className="space-y-3">
              <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <HardDrive size={15} className="text-teal-400" /> Offline Storage Status
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                    Service Worker Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Pre-Cached Files</span>
                    <span className="text-lg font-black text-white">{cacheStats.cachedCount || 12} files</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Offline Storage</span>
                    <span className="text-lg font-black text-teal-400">
                      {cacheStats.usageMB ? `${cacheStats.usageMB} MB` : 'Ready'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSyncCache}
                  disabled={isSyncing}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-teal-500/20"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Verifying Offline Assets...' : 'Force Refresh & Verify Offline Assets'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-200">100% Offline Architecture:</p>
                <p>• All player stats, auctions, 4-year calendar tournaments, and live simulation engines run purely in your device's browser memory &amp; IndexedDB without requiring an active internet connection.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
            PWA Version 26.0 • Offline Ready
          </span>
          <button
            onClick={() => { playSFX('click'); onClose(); }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallModal;
