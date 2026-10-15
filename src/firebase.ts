import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { SwipeAction, Profile, MatchItem } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
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
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection per Firebase Skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
    return false;
  }
}

// Sync authenticated user profile to Firestore
export async function syncUserProfile(user: User, customFields?: Partial<Profile>) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const baseData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Anonymous Explorer',
      photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      lastSeen: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      ...customFields
    };

    await setDoc(userRef, baseData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Record a swipe action in Firestore
export async function recordSwipe(
  userId: string, 
  targetProfile: Profile, 
  swipeType: SwipeAction
) {
  if (!userId) return;
  const swipeDocId = `${targetProfile.id}_${Date.now()}`;
  const path = `users/${userId}/swipes/${swipeDocId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'swipes', swipeDocId), {
      fromUserId: userId,
      toUserId: targetProfile.id,
      profileName: targetProfile.name,
      profilePhoto: targetProfile.photos[0],
      swipeType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Record a match in Firestore
export async function recordMatch(userId: string, targetProfile: Profile) {
  if (!userId) return;
  const matchDocId = `match_${targetProfile.id}`;
  const path = `users/${userId}/matches/${matchDocId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'matches', matchDocId), {
      userIds: [userId, targetProfile.id],
      profile: targetProfile,
      matchedAt: new Date().toISOString(),
      lastMessage: "It's a Match! Say hello..."
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Fetch user matches
export async function fetchUserMatches(userId: string): Promise<MatchItem[]> {
  if (!userId) return [];
  const path = `users/${userId}/matches`;
  try {
    const q = query(collection(db, 'users', userId, 'matches'), orderBy('matchedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        profile: data.profile as Profile,
        matchedAt: data.matchedAt || new Date().toISOString(),
        lastMessage: data.lastMessage || 'Say hello!',
        unreadCount: 1
      };
    });
  } catch (error) {
    console.warn('Could not load remote matches from Firestore:', error);
    return [];
  }
}
