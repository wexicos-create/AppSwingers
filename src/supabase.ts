// ---------- Cliente de Supabase + autenticación ----------
// Este módulo conecta la app con el proyecto "Swingers App" de Supabase.
// Los nombres de las funciones públicas (createUserWithEmailAndPassword,
// signInWithEmailAndPassword, onAuthStateChanged, etc.) son una capa de
// compatibilidad que App.tsx ya usa; internamente todo es Supabase Auth.

import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env ?? {};

export const SUPABASE_URL: string =
  env.VITE_SUPABASE_URL || 'https://plsnlwskttnskhsacina.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-xZ_yRjRVa1rlaHc5em0Hg_-eEKhxai';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ---------- Perfil de usuario que consume la app ----------

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

interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean | null;
  user_metadata?: Record<string, any> | null;
}

function mapUser(user: SupabaseAuthUser): User {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? '',
    displayName: meta.displayName ?? meta.full_name ?? null,
    photoURL: meta.avatar_url ?? null,
    emailVerified: !!user.email_confirmed_at,
    isAnonymous: !!user.is_anonymous,
    tenantId: null,
    providerData: [{ providerId: 'password', email: user.email ?? null }],
  };
}

// Usuario en caché para lecturas síncronas (auth.currentUser).
let cachedUser: User | null = null;
void supabase.auth.getSession().then(({ data: { session } }) => {
  cachedUser = session?.user ? mapUser(session.user as unknown as SupabaseAuthUser) : null;
});

export const auth = {
  get currentUser(): User | null {
    return cachedUser;
  },
};

// ---------- Errores con códigos compatibles con la UI existente ----------

interface AuthError extends Error {
  code: string;
}

function authError(code: string, message: string): AuthError {
  const err = new Error(message) as AuthError;
  err.code = code;
  return err;
}

function mapAuthError(error: { message: string }): AuthError {
  const msg = error.message || '';
  if (/already registered/i.test(msg)) return authError('auth/email-already-in-use', msg);
  if (/at least 6 characters/i.test(msg)) return authError('auth/weak-password', msg);
  if (/invalid login credentials/i.test(msg)) return authError('auth/wrong-password', msg);
  if (/email not confirmed/i.test(msg)) return authError('auth/email-not-confirmed', msg);
  if (/unable to validate email/i.test(msg)) return authError('auth/invalid-email', msg);
  if (/signup requires a valid password/i.test(msg)) return authError('auth/weak-password', msg);
  return authError('auth/error', msg);
}

// ---------- Suscripción al estado de sesión ----------

type AuthListener = (user: User | null) => void;

export function onAuthStateChanged(_auth: unknown, callback: AuthListener): () => void {
  let unsubscribe: (() => void) | null = null;
  void supabase.auth.getSession().then(({ data: { session } }) => {
    cachedUser = session?.user ? mapUser(session.user as unknown as SupabaseAuthUser) : null;
    callback(cachedUser);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      cachedUser = newSession?.user ? mapUser(newSession.user as unknown as SupabaseAuthUser) : null;
      callback(cachedUser);
    });
    unsubscribe = () => sub.subscription.unsubscribe();
  });
  return () => unsubscribe?.();
}

// ---------- Cuentas por correo/contraseña ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: User }> {
  if (!EMAIL_RE.test(email || '')) throw authError('auth/invalid-email', 'Correo inválido.');
  if (!password || password.length < 6) throw authError('auth/weak-password', 'La contraseña debe tener al menos 6 caracteres.');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { displayName: email.split('@')[0] } },
  });
  if (error) throw mapAuthError(error);
  if (!data.user) throw authError('auth/error', 'No fue posible crear la cuenta.');
  const user = mapUser(data.user as unknown as SupabaseAuthUser);
  cachedUser = user;
  return { user };
}

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: User }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(),
    password,
  });
  if (error) throw mapAuthError(error);
  if (!data.user) throw authError('auth/user-not-found', 'Cuenta no encontrada.');
  const user = mapUser(data.user as unknown as SupabaseAuthUser);
  cachedUser = user;
  return { user };
}

// ---------- Inicio de sesión con Google (OAuth de Supabase) ----------
// Requiere activar el proveedor Google en el dashboard de Supabase
// (Authentication → Providers → Google). El acceso por correo funciona
// sin ninguna configuración adicional.

export const googleProvider = { provider: 'google' } as const;

export async function signInWithPopup(_auth: unknown, _provider: unknown): Promise<{ user: User }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  if (error) throw mapAuthError(error);
  // El navegador es redirigido a Google; al volver, la sesión se recupera
  // automáticamente vía onAuthStateChanged / detectSessionInUrl.
  const current = auth.currentUser;
  return { user: current ?? ({ uid: '', email: '', displayName: null, photoURL: null, emailVerified: false, isAnonymous: false, tenantId: null, providerData: [] } as User) };
}

export async function signOut(_auth: unknown): Promise<void> {
  await supabase.auth.signOut();
  cachedUser = null;
}

/**
 * Supabase no permite que el cliente borre usuarios de auth directamente.
 * Para el lanzamiento: se marca el perfil como eliminado y se cierra la
 * sesión. El borrado definitivo puede hacerse desde el dashboard
 * (Authentication → Users).
 */
export async function deleteUser(user: User): Promise<void> {
  const { docSet } = await import('./store');
  await docSet('users', user.uid, { deletedAt: Date.now() }, true);
  if (auth.currentUser?.uid === user.uid) {
    await supabase.auth.signOut();
    cachedUser = null;
  }
}

// ---------- Compatibilidad mínima con doc/db/deleteDoc de App.tsx ----------

export const db = { supabase: true } as const;

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
  const { docDelete } = await import('./store');
  await docDelete(ref.collection, ref.id);
}

// ---------- Perfil de usuario, swipes y matches (tablas app_*) ----------

import { docSet, docQuery } from './store';
import { SwipeAction, Profile, MatchItem } from './types';

export async function syncUserProfile(user: User, customFields?: Partial<Profile>): Promise<void> {
  if (!user) return;
  await docSet(
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
  await docSet('swipes', `${targetProfile.id}_${Date.now()}`, {
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
  await docSet('matches', `match_${targetProfile.id}_${userId}`, {
    userUid: userId,
    userIds: [userId, targetProfile.id],
    profile: targetProfile,
    matchedAt: new Date().toISOString(),
    lastMessage: "It's a Match! Say hello...",
  });
}

export async function fetchUserMatches(userId: string): Promise<MatchItem[]> {
  if (!userId) return [];
  const docs = await docQuery<any>('matches', 'userUid', userId);
  return docs.map((doc) => ({
    id: doc.id,
    profile: doc.profile as Profile,
    matchedAt: doc.matchedAt || new Date().toISOString(),
    lastMessage: doc.lastMessage || 'Say hello!',
    unreadCount: 1,
  }));
}

/** Verifica la conexión con Supabase leyendo la sesión actual. */
export async function testConnection(): Promise<boolean> {
  const { error } = await supabase.from('app_users').select('id').limit(1);
  return !error;
}
