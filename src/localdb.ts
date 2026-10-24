// ---------- Local authentication & profile store (database-free) ----------
// Drop-in replacement for the previous Firebase module. Accounts, sessions,
// profiles, swipes and matches now live in localStorage on this device only.
// No external service is contacted; the app works fully offline.

import { lsSet, lsUpdate, lsGet, lsDelete, lsWhere } from './localstore';
import { SwipeAction, Profile, MatchItem } from './types';

// ---------- User shape (Firebase-compatible subset used by the app) ----------

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: null;
  providerData: Array<{ providerId: string; email: string | null }>;
}

interface StoredAccount {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  pw: string; // local obfuscation only; this is not real security
  provider: 'password' | 'google';
}

const ACCOUNTS_KEY = 'appswinguer_accounts';
const SESSION_KEY = 'appswinguer_session';

// ---------- Error helpers (Firebase-compatible error codes) ----------

interface AuthError extends Error {
  code: string;
}

function authError(code: string): AuthError {
  const err = new Error(code) as AuthError;
  err.code = code;
  return err;
}

function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}_${pw.length}`;
}

function uid(): string {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ---------- Accounts & session (localStorage) ----------

function readAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredAccount>) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, StoredAccount>): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* ignore quota errors */
  }
}

function accountKey(email: string): string {
  return email.trim().toLowerCase();
}

function toUser(account: StoredAccount): User {
  return {
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    photoURL: account.photoURL,
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: account.provider === 'google' ? 'google.com' : 'password', email: account.email }],
  };
}

function persistSession(user: User | null): void {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

type AuthListener = (user: User | null) => void;
const listeners = new Set<AuthListener>();

function notifyListeners(): void {
  const current = auth.currentUser;
  for (const cb of listeners) {
    try {
      cb(current);
    } catch {
      /* listener errors must not break the loop */
    }
  }
}

export const auth = {
  get currentUser(): User | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as User;
      // If the underlying account was deleted, the session is invalid.
      const accounts = readAccounts();
      const account = Object.values(accounts).find((a) => a.uid === user.uid);
      return account ? user : null;
    } catch {
      return null;
    }
  },
};

/** Firebase-compatible subscription: fires immediately with the current user. */
export function onAuthStateChanged(_auth: unknown, callback: AuthListener): () => void {
  listeners.add(callback);
  const timer = setTimeout(() => callback(auth.currentUser), 0);
  return () => {
    clearTimeout(timer);
    listeners.delete(callback);
  };
}

function signIn(user: User): void {
  persistSession(user);
  notifyListeners();
}

// ---------- Password accounts (local, this device only) ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: User }> {
  if (!EMAIL_RE.test(email || '')) throw authError('auth/invalid-email');
  if (!password || password.length < 6) throw authError('auth/weak-password');
  const accounts = readAccounts();
  const key = accountKey(email);
  if (accounts[key]) throw authError('auth/email-already-in-use');
  const account: StoredAccount = {
    uid: uid(),
    email: email.trim(),
    displayName: null,
    photoURL: null,
    pw: hashPassword(password),
    provider: 'password',
  };
  accounts[key] = account;
  writeAccounts(accounts);
  const user = toUser(account);
  signIn(user);
  return { user };
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: User }> {
  const accounts = readAccounts();
  const key = accountKey(email || '');
  const account = accounts[key];
  if (!account) throw authError('auth/user-not-found');
  if (account.pw !== hashPassword(password)) throw authError('auth/wrong-password');
  const user = toUser(account);
  signIn(user);
  return { user };
}

// ---------- Local "Google" sign-in ----------
// Without a backend there is no OAuth handshake: the popup flow signs the
// user into a persistent local Google-style account on this device.

const LOCAL_GOOGLE_EMAIL = 'invitado.local@appswinguer';
export const googleProvider = { local: true } as const;

export async function signInWithPopup(_auth: unknown, _provider: unknown): Promise<{ user: User }> {
  const accounts = readAccounts();
  const key = accountKey(LOCAL_GOOGLE_EMAIL);
  let account = accounts[key];
  if (!account) {
    account = {
      uid: uid(),
      email: LOCAL_GOOGLE_EMAIL,
      displayName: 'Invitado',
      photoURL: null,
      pw: '',
      provider: 'google',
    };
    accounts[key] = account;
    writeAccounts(accounts);
  }
  const user = toUser(account);
  signIn(user);
  return { user };
}

export async function signOut(_auth: unknown): Promise<void> {
  persistSession(null);
  notifyListeners();
}

export async function deleteUser(user: User): Promise<void> {
  const accounts = readAccounts();
  for (const [key, account] of Object.entries(accounts)) {
    if (account.uid === user.uid) delete accounts[key];
  }
  writeAccounts(accounts);
  lsDelete('users', user.uid);
  if (auth.currentUser?.uid === user.uid) {
    persistSession(null);
    notifyListeners();
  }
}

// ---------- Minimal Firestore-compatible helpers (App.tsx account deletion) ----------

export const db = { local: true } as const;

export interface DocRef {
  collection: string;
  id: string;
}

export function doc(_db: unknown, ...pathSegments: string[]): DocRef {
  const collection = pathSegments[0] ?? '';
  const id = pathSegments[pathSegments.length - 1] ?? '';
  return { collection, id };
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  lsDelete(ref.collection, ref.id);
}

// ---------- User profile, swipes & matches (local) ----------

export async function syncUserProfile(user: User, customFields?: Partial<Profile>): Promise<void> {
  if (!user) return;
  lsSet(
    'users',
    user.uid,
    {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Anonymous Explorer',
      photoURL:
        user.photoURL ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      lastSeen: new Date().toISOString(),
      updatedAt: Date.now(),
      ...customFields,
    },
    true
  );
}

export async function recordSwipe(userId: string, targetProfile: Profile, swipeType: SwipeAction): Promise<void> {
  if (!userId) return;
  lsSet('swipes', `${targetProfile.id}_${Date.now()}`, {
    fromUserId: userId,
    toUserId: targetProfile.id,
    profileName: targetProfile.name,
    profilePhoto: targetProfile.photos[0],
    swipeType,
    timestamp: new Date().toISOString(),
  });
}

export async function recordMatch(userId: string, targetProfile: Profile): Promise<void> {
  if (!userId) return;
  lsSet('matches', `match_${targetProfile.id}_${userId}`, {
    userUid: userId,
    userIds: [userId, targetProfile.id],
    profile: targetProfile,
    matchedAt: new Date().toISOString(),
    lastMessage: "It's a Match! Say hello...",
  });
}

export async function fetchUserMatches(userId: string): Promise<MatchItem[]> {
  if (!userId) return [];
  return lsWhere<any>('matches', 'userUid', userId).map((doc) => ({
    id: doc.id,
    profile: doc.profile as Profile,
    matchedAt: doc.matchedAt || new Date().toISOString(),
    lastMessage: doc.lastMessage || 'Say hello!',
    unreadCount: 1,
  }));
}

/** The local store is always available: the app is considered connected. */
export async function testConnection(): Promise<boolean> {
  return true;
}

