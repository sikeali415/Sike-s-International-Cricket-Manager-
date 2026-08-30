import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { GameData } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Use the correct DB ID
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

export const syncUser = async (userId: string, email: string | null, displayName: string | null) => {
    const userRef = doc(db, 'users', userId);
    try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                uid: userId,
                email,
                displayName,
                lastUsedSaveId: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } else {
            await updateDoc(userRef, {
                updatedAt: serverTimestamp()
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
};

export const saveGameToFirebase = async (userId: string, saveId: string, name: string, data: GameData) => {
    const saveRef = doc(db, 'users', userId, 'saves', saveId);
    try {
        const snap = await getDoc(saveRef);
        if (!snap.exists()) {
            await setDoc(saveRef, {
                id: saveId,
                userId,
                name,
                data,
                lastPlayed: serverTimestamp(),
                createdAt: serverTimestamp()
            });
        } else {
            await updateDoc(saveRef, {
                data,
                lastPlayed: serverTimestamp()
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${userId}/saves/${saveId}`);
    }
};

export const getSaves = async (userId: string): Promise<any[]> => {
    const savesRef = collection(db, 'users', userId, 'saves');
    try {
        const snap = await getDocs(savesRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${userId}/saves`);
        return [];
    }
};

export const deleteSave = async (userId: string, saveId: string) => {
    const saveRef = doc(db, 'users', userId, 'saves', saveId);
    try {
        await deleteDoc(saveRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}/saves/${saveId}`);
    }
};

export const signIn = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Sign in error:", error);
        return null;
    }
};

export const signOutUser = () => auth.signOut();
