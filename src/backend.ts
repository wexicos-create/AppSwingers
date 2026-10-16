import type { User } from '@supabase/supabase-js';
import type { AppRegion, MatchItem, Profile, ProfileKind, SwipeAction } from './types';
import { supabase } from './supabase';

export interface ProfileEditorData {
  alias: string;
  kind: ProfileKind;
  bio: string;
  interests: string[];
  seeking: string[];
  ages: string[];
  maxKm: number;
  locationCity?: string;
}

export async function testConnection(): Promise<boolean> {
  const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    console.warn('Supabase connection check failed:', error.code);
    return false;
  }
  return true;
}

export async function syncUserProfile(user: User): Promise<void> {
  if (!user?.id) return;
  const metadata = user.user_metadata ?? {};
  const displayName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    (typeof user.email === 'string' ? user.email.split('@')[0] : '') ||
    'Usuario AppSwinger';

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    console.warn('Supabase profile sync failed:', error.code);
    throw new Error('No fue posible preparar el perfil de AppSwinger.');
  }
}

export async function saveUserProfile(userId: string, data: ProfileEditorData, region: AppRegion): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: data.alias.trim().slice(0, 60),
    profile_kind: data.kind,
    bio: data.bio.trim().slice(0, 1200),
    city: data.locationCity?.trim().slice(0, 100) || null,
    country_code: region,
    interests: data.interests.slice(0, 40),
    seeking: data.seeking.slice(0, 20),
    preferred_age_ranges: data.ages.slice(0, 10),
    max_distance_km: Math.max(1, Math.min(500, Math.round(data.maxKm))),
  }, { onConflict: 'id' });

  if (error) {
    console.warn('Supabase profile save failed:', error.code);
    throw new Error('No se pudo guardar el perfil. La cuenta puede seguir pendiente de verificación.');
  }
}

interface DiscoverableProfile {
  profile_id: string;
  display_name: string | null;
  profile_kind: ProfileKind;
  bio: string;
  city: string | null;
  country_code: string;
  interests: string[];
  seeking: string[];
  age: number | null;
  profile_photo_path: string;
  created_at: string;
}

export async function fetchDiscoverableProfiles(limit = 30): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('discover_verified_profiles', { p_limit: limit });
  if (error) {
    // An empty result is expected while the current account awaits verification.
    if (error.code === '42501' || error.code === 'PGRST202') return [];
    console.warn('Supabase discovery request failed:', error.code);
    return [];
  }

  const rows = (data ?? []) as DiscoverableProfile[];
  return Promise.all(rows.map(async row => {
    let photoUrl: string | undefined;
    if (row.profile_photo_path) {
      const { data: signed, error: photoError } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(row.profile_photo_path, 300);
      if (!photoError) photoUrl = signed?.signedUrl;
    }

    const photos = photoUrl ? [photoUrl] : [];
    return {
      id: row.profile_id,
      name: row.display_name || 'Usuario AppSwinger',
      kind: row.profile_kind,
      age: row.age ?? undefined,
      km: 0,
      distance: 'Distancia no disponible',
      country: row.country_code === 'US' ? 'US' : 'MX',
      verify: 'verificado',
      status: 'activo',
      hue: 270,
      tags: row.interests ?? [],
      bio: row.bio ?? '',
      photo: photoUrl,
      photos,
      joined: row.matched_at,
    } satisfies Profile;
  }));
}

// Only real UUID-backed profiles are persisted. RLS enforces active, verified,
// photo-matched accounts and the two-way block gate.
export async function recordSwipe(userId: string, targetProfile: Profile, swipeType: SwipeAction): Promise<boolean> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId) || !uuidPattern.test(targetProfile.id)) return false;

  const { error } = await supabase.from('profile_swipes').upsert(
    { swiper_user_id: userId, target_user_id: targetProfile.id, swipe_type: swipeType },
    { onConflict: 'swiper_user_id,target_user_id' },
  );
  if (error) {
    console.warn('Swipe not persisted by Supabase policy:', error.code);
    throw new Error('La acción no pudo guardarse. Verifica tu cuenta e inténtalo de nuevo.');
  }
  if (swipeType !== 'like' && swipeType !== 'superlike') return false;

  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('user_a,user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  if (matchError) {
    console.warn('Supabase match confirmation failed:', matchError.code);
    return false;
  }
  return (matches ?? []).some(match =>
    (match.user_a === userId && match.user_b === targetProfile.id) ||
    (match.user_b === userId && match.user_a === targetProfile.id)
  );
}

// Match cards require a privacy-filtered RPC and are intentionally not synthesized.
export async function fetchUserMatches(userId: string): Promise<MatchItem[]> {
  if (!userId) return [];
  const { data, error } = await supabase.rpc('my_verified_matches', { p_limit: 30 });
  if (error) {
    if (error.code !== '42501' && error.code !== 'PGRST202') {
      console.warn('Supabase match list failed:', error.code);
    }
    return [];
  }

  const rows = (data ?? []) as Array<DiscoverableProfile & { match_id: string; matched_at: string }>;
  return Promise.all(rows.map(async row => {
    let photoUrl: string | undefined;
    if (row.profile_photo_path) {
      const { data: signed, error: photoError } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(row.profile_photo_path, 300);
      if (!photoError) photoUrl = signed?.signedUrl;
    }
    const photos = photoUrl ? [photoUrl] : [];
    const profile: Profile = {
      id: row.profile_id,
      name: row.display_name || 'Usuario AppSwinger',
      kind: row.profile_kind,
      age: row.age ?? undefined,
      km: 0,
      distance: 'Distancia no disponible',
      country: row.country_code === 'US' ? 'US' : 'MX',
      verify: 'verificado',
      status: 'activo',
      hue: 270,
      tags: row.interests ?? [],
      bio: row.bio ?? '',
      photo: photoUrl,
      photos,
      joined: row.created_at,
    };
    return {
      id: row.match_id,
      profile,
      matchedAt: row.matched_at,
      lastMessage: 'Match mutuo confirmado',
      unreadCount: 0,
    };
  }));
}
