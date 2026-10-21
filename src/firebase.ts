import { supabase, isSupabaseConfigured } from './supabase';
import type { Profile, MatchItem, SwipeAction } from './types';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
}
type AuthCallback = (user: User | null) => void;
export const auth = {};
export const googleProvider = {};

function normalizeUser(user: any): User | null {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    photoURL: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export function onAuthStateChanged(_auth: unknown, callback: AuthCallback): () => void {
  if (!supabase) { callback(null); return () => undefined; }
  let active = true;
  supabase.auth.getSession().then(({ data }) => {
    if (active) callback(normalizeUser(data.session?.user));
  }).catch((error) => console.error('Supabase session lookup failed', error));
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (active) callback(normalizeUser(session?.user));
  });
  return () => { active = false; subscription.unsubscribe(); };
}

export async function signInWithPopup(_auth: unknown, _provider: unknown): Promise<{ user: User | null }> {
  if (!supabase || !isSupabaseConfigured) throw new Error('Supabase frontend environment is not configured.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return { user: null };
}

export async function signOut(_auth?: unknown): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function testConnection(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return false;
  if (!session) return true;
  const { error: profileError } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
  return !profileError;
}

export async function syncUserProfile(user: User): Promise<void> {
  if (!supabase || !user?.uid) throw new Error('Supabase is not configured or user is missing.');
  const { data: existing, error: lookupError } = await supabase
    .from('profiles').select('id').eq('id', user.uid).maybeSingle();
  if (lookupError) throw lookupError;
  const displayName = user.displayName?.trim().slice(0, 80) || 'Miembro';
  if (existing) {
    const { error } = await supabase.from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', user.uid);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('profiles').insert({
    id: user.uid, display_name: displayName, status: 'pending',
  });
  if (error && error.code !== '23505') throw error;
}

async function signedPhoto(path: string | null | undefined): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from('profile-photos').createSignedUrl(path, 300);
  if (error) { console.warn('Private profile photo unavailable', error.message); return null; }
  return data.signedUrl;
}

function mapProfile(row: any, photoUrl: string | null): Profile {
  const kinds = ['Pareja', 'Dama', 'Caballero', 'Individual'];
  return {
    id: row.profile_id ?? row.id,
    name: row.display_name?.trim() || 'Miembro verificado',
    kind: kinds.includes(row.profile_kind) ? row.profile_kind : 'Individual',
    age: Number.isFinite(Number(row.age)) ? Number(row.age) : undefined,
    km: 0,
    distance: 'Distancia no disponible',
    location: row.city ?? undefined,
    country: row.country_code === 'US' ? 'US' : 'MX',
    verify: 'verificado',
    status: 'activo',
    hue: 276,
    tags: Array.isArray(row.interests) ? row.interests : [],
    bio: row.bio ?? '',
    photo: photoUrl ?? undefined,
    photos: photoUrl ? [photoUrl] : [],
    verified: true,
    online: false,
  };
}

export async function fetchDiscoverableProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('discover_verified_profiles', { p_limit: 30 });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) =>
    mapProfile(row, await signedPhoto(row.profile_photo_path))
  ));
}

export async function recordSwipe(userId: string, targetProfile: Profile, swipeType: SwipeAction): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('profile_swipes').insert({
    swiper_user_id: userId, target_user_id: targetProfile.id, swipe_type: swipeType,
  });
  if (error && error.code !== '23505') throw error;
}

/** Mutual matches are created by the database trigger after reciprocal swipes. */
export async function recordMatch(_userId: string, _targetProfile: Profile): Promise<void> {
  return;
}

export async function fetchUserMatches(_userId: string): Promise<MatchItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_verified_matches', { p_limit: 30 });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) => {
    const profile = mapProfile({
      profile_id: row.profile_id, display_name: row.display_name, profile_kind: row.profile_kind,
      bio: row.bio, city: row.city, country_code: row.country_code, interests: row.interests, age: row.age,
    }, await signedPhoto(row.profile_photo_path));
    return {
      id: row.match_id, profile, matchedAt: row.matched_at ?? new Date().toISOString(),
      lastMessage: 'Es un match mutuo. Saluda con respeto.', unreadCount: 0,
    };
  }));
}
