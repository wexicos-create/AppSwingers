import type { User } from '@supabase/supabase-js';
import type { MatchItem, Profile, SwipeAction } from './types';
import { supabase } from './supabase';

export async function testConnection(): Promise<boolean> {
  const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    console.warn('Supabase connection check failed:', error.code);
    return false;
  }
  return true;
}

// Create a minimal pending profile after OAuth login. Verification, account status,
// and moderation fields are left to database defaults / trusted server-side services.
export async function syncUserProfile(user: User): Promise<void> {
  if (!user?.id) return;
  const metadata = user.user_metadata ?? {};
  const displayName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    (typeof user.email === 'string' ? user.email.split('@')[0] : '') ||
    'Usuario AppSwinger';

  const { error: insertError } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (insertError) {
    console.warn('Supabase profile sync failed:', insertError.code);
    throw new Error('No fue posible preparar el perfil de AppSwinger.');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id);

  if (updateError && updateError.code !== '42501') {
    console.warn('Supabase profile refresh failed:', updateError.code);
  }
}

// Mock profiles are never written to production. RLS requires both accounts to be
// active, age/identity verified, photo-matched, and not blocked.
export async function recordSwipe(
  userId: string,
  targetProfile: Profile,
  swipeType: SwipeAction,
): Promise<void> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId) || !uuidPattern.test(targetProfile.id)) return;

  const { error } = await supabase
    .from('profile_swipes')
    .upsert(
      { swiper_user_id: userId, target_user_id: targetProfile.id, swipe_type: swipeType },
      { onConflict: 'swiper_user_id,target_user_id' },
    );

  if (error) {
    console.warn('Swipe not persisted by Supabase policy:', error.code);
    throw new Error('La acción no pudo guardarse. Verifica tu cuenta e inténtalo de nuevo.');
  }
}

// Mutual matches are created only by the database trigger after reciprocal likes.
export async function recordMatch(_userId: string, _targetProfile: Profile): Promise<void> {
  // Intentionally empty: client-side scores must never create a real match.
}

// Match-card data is not yet exposed through a privacy-filtered RPC, so do not
// synthesize names/photos or leak private profile information here.
export async function fetchUserMatches(_userId: string): Promise<MatchItem[]> {
  return [];
}
