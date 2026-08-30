// PWA & Offline Service Worker Manager for Chrome, Android APK & Desktop

let deferredInstallPrompt: any = null;
const installListeners: Array<(canInstall: boolean) => void> = [];
const offlineListeners: Array<(isOnline: boolean) => void> = [];

export interface PWAInstallStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  cacheVersion: string;
}

export const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const initPWA = () => {
  if (typeof window === 'undefined') return;

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((listener) => listener(true));
    console.log('[PWA] beforeinstallprompt captured - ready to install as Chrome App / APK');
  });

  // Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    console.log('[PWA] App successfully installed as standalone application');
  });

  // Online / Offline tracking
  window.addEventListener('online', () => {
    offlineListeners.forEach((listener) => listener(true));
  });
  window.addEventListener('offline', () => {
    offlineListeners.forEach((listener) => listener(false));
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New offline version available');
                }
              };
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped or failed:', err);
        });
    });
  }
};

export const subscribeInstallable = (callback: (canInstall: boolean) => void): (() => void) => {
  installListeners.push(callback);
  callback(!!deferredInstallPrompt);
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
};

export const subscribeOnlineStatus = (callback: (isOnline: boolean) => void): (() => void) => {
  offlineListeners.push(callback);
  callback(typeof navigator !== 'undefined' ? navigator.onLine : true);
  return () => {
    const idx = offlineListeners.indexOf(callback);
    if (idx !== -1) offlineListeners.splice(idx, 1);
  };
};

export const triggerPWAInstall = async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
  if (!deferredInstallPrompt) {
    return 'manual';
  }

  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return outcome;
  } catch (err) {
    console.error('[PWA] Prompt error:', err);
    return 'manual';
  }
};

export const checkCacheStorageStatus = async (): Promise<{ cachedCount: number; quotaMB?: number; usageMB?: number }> => {
  let cachedCount = 0;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        cachedCount += requests.length;
      }
    }
  } catch {
    // ignore
  }

  let quotaMB: number | undefined;
  let usageMB: number | undefined;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) quotaMB = Math.round(estimate.quota / (1024 * 1024));
      if (estimate.usage) usageMB = +(estimate.usage / (1024 * 1024)).toFixed(2);
    } catch {
      // ignore
    }
  }

  return { cachedCount, quotaMB, usageMB };
};

export const forceRefreshOfflineCache = async (): Promise<boolean> => {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    }
    return true;
  } catch (err) {
    console.error('[PWA] Force refresh error:', err);
    return false;
  }
};
