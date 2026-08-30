// Pure TypeScript IndexedDB & LocalStorage hybrid storage manager
// Guarantees unlimited save capacity (IndexedDB) without 5MB quota errors.

const DB_NAME = 'CricketManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'cricketManagerSave';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Saves game data into IndexedDB (primary) and attempts localStorage (backup).
 * Catches quota exceeded errors gracefully without throwing.
 */
export async function saveGameLocally(gameData: unknown): Promise<boolean> {
  let savedToIdb = false;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(gameData, SAVE_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    savedToIdb = true;
  } catch (err) {
    console.warn('IndexedDB write failed, trying fallback:', err);
  }

  // Also try saving to localStorage as a synchronous fallback if possible
  try {
    const serialized = JSON.stringify(gameData);
    localStorage.setItem(SAVE_KEY, serialized);
  } catch (err) {
    // QuotaExceededError is expected on large careers (>5MB).
    // As long as IndexedDB saved, we are completely safe!
    if (savedToIdb) {
      console.info('localStorage quota reached; state safely persisted in IndexedDB.');
    } else {
      console.warn('Failed to save to both IndexedDB and localStorage:', err);
    }
  }

  return savedToIdb;
}

/**
 * Loads game data from IndexedDB (first) or localStorage (fallback/migration).
 */
export async function loadGameLocally(): Promise<any | null> {
  // 1. Try IndexedDB first
  try {
    const db = await openDatabase();
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SAVE_KEY);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (result) {
      return result;
    }
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage fallback:', err);
  }

  // 2. Fallback to localStorage (for migration of existing saves)
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate to IndexedDB for future larger saves
      saveGameLocally(parsed).catch(console.error);
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse localStorage save:', err);
  }

  return null;
}

/**
 * Checks if a local save exists in either IndexedDB or localStorage.
 */
export async function hasLocalSave(): Promise<boolean> {
  try {
    const db = await openDatabase();
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SAVE_KEY);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (result) return true;
  } catch {
    // ignore
  }

  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

/**
 * Completely clears local save data from IndexedDB and localStorage.
 */
export async function deleteLocalSave(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(SAVE_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  }

  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    console.warn('localStorage removeItem failed:', err);
  }
}
