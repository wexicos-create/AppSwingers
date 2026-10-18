import type { User } from '@supabase/supabase-js';
import type { AppRegion, ChatMessage, MatchItem, Profile, ProfileKind, Proposal, SwipeAction, ClubEvent, CollaborationProposal } from './types';
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
  locationState?: string;
}

export async function fetchUserLocation(userId: string): Promise<{ city: string; state: string } | null> {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('city,state').eq('id', userId).maybeSingle();
  if (error || !data?.city || !data?.state) return null;
  return { city: data.city, state: data.state };
}

export async function testConnection(): Promise<boolean> {
  const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    console.warn('Supabase connection check failed:', error.code);
    return false;
  }
  return true;
}

export async function syncUserProfile(user: User): Promise<string | null> {
  if (!user?.id) return null;
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
  const { data: savedProfile, error: readError } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) console.warn('Supabase profile read failed:', readError.code);
  return savedProfile?.display_name ?? displayName;
}

export async function saveUserProfile(userId: string, data: ProfileEditorData, region: AppRegion): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: data.alias.trim().slice(0, 60),
    profile_kind: data.kind,
    bio: data.bio.trim().slice(0, 1200),
    city: data.locationCity?.trim().slice(0, 100) || null,
    state: data.locationState?.trim().slice(0, 80) || null,
    country_code: 'MX',
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
  state: string | null;
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
      country: 'MX',
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      verify: 'verificado',
      status: 'activo',
      hue: 270,
      tags: row.interests ?? [],
      bio: row.bio ?? '',
      photo: photoUrl,
      photos,
      joined: row.created_at,
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
      country: 'MX',
      verify: 'verificado',
      status: 'activo',
      hue: 270,
      tags: row.interests ?? [],
      bio: row.bio ?? '',
      photo: photoUrl,
      photos,
      joined: row.matched_at,
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

export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<string> {
  if (!userId || !otherUserId || userId === otherUserId) {
    throw new Error('Conversación no válida.');
  }

  const { data: existing, error: lookupError } = await supabase
    .from('chat_conversations')
    .select('id,participant_a,participant_b')
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .limit(100);

  if (lookupError) {
    console.warn('Supabase conversation lookup failed:', lookupError.code);
    throw new Error('No fue posible abrir la conversación.');
  }
  const found = (existing ?? []).find(row =>
    (row.participant_a === userId && row.participant_b === otherUserId) ||
    (row.participant_b === userId && row.participant_a === otherUserId)
  );
  if (found) return found.id;

  const { data: created, error: createError } = await supabase
    .from('chat_conversations')
    .insert({ participant_a: userId, participant_b: otherUserId, conversation_type: 'dating', status: 'active' })
    .select('id')
    .single();

  if (!createError && created?.id) return created.id;

  // A concurrent match/open may have created the same pair first.
  const { data: retry } = await supabase
    .from('chat_conversations')
    .select('id,participant_a,participant_b')
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .limit(100);
  const raced = (retry ?? []).find(row =>
    (row.participant_a === userId && row.participant_b === otherUserId) ||
    (row.participant_b === userId && row.participant_a === otherUserId)
  );
  if (raced) return raced.id;

  console.warn('Supabase conversation creation failed:', createError?.code);
  throw new Error('No se pudo iniciar el chat. Comprueba que ambas cuentas estén verificadas y no bloqueadas.');
}

export async function fetchChatMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
  if (!userId || !conversationId) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id,sender_user_id,body,created_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) {
    console.warn('Supabase message load failed:', error.code);
    throw new Error('No fue posible cargar los mensajes.');
  }
  return (data ?? []).map(row => ({
    id: row.id,
    me: row.sender_user_id === userId,
    ts: new Date(row.created_at).getTime(),
    t: row.body,
  }));
}

export async function sendChatMessage(userId: string, conversationId: string, body: string): Promise<ChatMessage> {
  const text = body.trim();
  if (!userId || !conversationId || !text || text.length > 4000) {
    throw new Error('El mensaje está vacío o supera el límite permitido.');
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: userId,
      body: text,
      message_type: 'text',
    })
    .select('id,sender_user_id,body,created_at')
    .single();
  if (error || !data) {
    console.warn('Supabase message send failed:', error?.code);
    throw new Error('No se pudo enviar el mensaje. Verifica el estado de tu conversación.');
  }
  return {
    id: data.id,
    me: data.sender_user_id === userId,
    ts: new Date(data.created_at).getTime(),
    t: data.body,
  };
}

export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  if (!userId || !blockedUserId || userId === blockedUserId) return;
  const { error } = await supabase.from('user_blocks').insert(
    { blocker_user_id: userId, blocked_user_id: blockedUserId },
  );
  if (error && error.code !== '23505') {
    console.warn('Supabase block failed:', error.code);
    throw new Error('No se pudo bloquear la cuenta.');
  }
}

export async function createSafetyReport(
  reporterUserId: string,
  reportedUserId: string,
  category: string,
  description: string,
): Promise<void> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(reporterUserId) || !uuidPattern.test(reportedUserId) || reporterUserId === reportedUserId) {
    throw new Error('El reporte requiere dos cuentas reales válidas.');
  }
  const safeCategory = category.trim().slice(0, 100) || 'Otro';
  const safeDescription = description.trim().slice(0, 4000) || 'Reporte enviado desde el chat.';
  const { error } = await supabase.from('safety_reports').insert({
    reporter_user_id: reporterUserId,
    reported_user_id: reportedUserId,
    category: safeCategory,
    description: safeDescription,
    status: 'open',
  });
  if (error) {
    console.warn('Supabase safety report failed:', error.code);
    throw new Error('No se pudo enviar el reporte. Inténtalo de nuevo.');
  }
}

const proposalCategoryFromDb = (category: string): string => ({
  date: 'Cita',
  trio: 'Trío',
  group_meetup: 'Reunión grupal',
  fetish_discussion: 'Conversación de intereses',
  other: 'Otra propuesta',
}[category] || 'Otra propuesta');

export async function fetchApprovedEvents(userId: string): Promise<ClubEvent[]> {
  if (!userId) return [];
  const { data: profile, error: profileError } = await supabase.from('profiles').select('city,state').eq('id', userId).maybeSingle();
  if (profileError || !profile?.state || !profile.city) return [];
  const { data, error } = await supabase.from('event_proposals')
    .select('id,title,venue_name,city,state,event_date,schedule,expected_attendees,status')
    .eq('status', 'approved')
    .eq('country_code', 'MX')
    .eq('state', profile.state)
    .eq('city', profile.city)
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })
    .limit(100);
  if (error) {
    console.warn('Supabase local events load failed:', error.code);
    return [];
  }
  return (data ?? []).map(row => {
    const schedule = Array.isArray(row.schedule) ? row.schedule[0] : row.schedule;
    const time = schedule && typeof schedule === 'object' && 'start_time' in schedule ? String((schedule as { start_time: unknown }).start_time) : 'Horario por confirmar';
    return {
      id: row.id,
      title: row.title,
      theme: 'Evento local aprobado',
      date: new Date(row.event_date).toLocaleDateString('es-MX'),
      time,
      zone: row.city,
      city: row.city,
      state: row.state ?? undefined,
      organizer: 'Organizador verificado',
      own: false,
      cap: row.expected_attendees,
      sold: 0,
      reqs: [],
      paid: false,
      published: true,
      promoted: false,
      hue: 280,
    } satisfies ClubEvent;
  });
}

export async function createEventProposal(userId: string, proposal: Omit<CollaborationProposal, 'id' | 'createdAt' | 'status' | 'paid'>): Promise<string> {
  if (!userId) throw new Error('Inicia sesión antes de enviar una propuesta.');
  const eventDate = new Date(proposal.eventDate + 'T' + proposal.schedule + ':00');
  if (!Number.isFinite(eventDate.getTime()) || eventDate.getTime() <= Date.now()) throw new Error('Selecciona una fecha y hora futuras.');
  if (proposal.title.trim().length < 8 || proposal.city.trim().length < 2 || !proposal.state) throw new Error('Completa el título, estado y ciudad del evento.');
  const description = ('Tipo: ' + proposal.eventType + '. ' + proposal.consentRules + ' Ratio: ' + proposal.attendeeRatio).slice(0, 4000);
  const safetyPlan = ('Reglas: ' + proposal.consentRules + ' Salud e higiene: ' + proposal.healthProtocols).slice(0, 3000);
  const invitePlan = ('Filtro de admisión: ' + proposal.admissionFilter).slice(0, 2000);
  const { data, error } = await supabase.from('event_proposals').insert({
    organizer_user_id: userId,
    title: proposal.title.trim().slice(0, 140),
    description,
    venue_name: null,
    city: proposal.city.trim().slice(0, 100),
    state: proposal.state,
    country_code: 'MX',
    event_date: eventDate.toISOString(),
    schedule: [{ start_time: proposal.schedule, timezone: 'America/Mexico_City' }],
    safety_plan: safetyPlan,
    invite_plan: invitePlan,
    expected_attendees: Math.max(2, Math.min(200, Math.round(proposal.capacity))),
    contribution_label: 'none',
    contribution_details: 'No se procesa ningún pago en este paso.',
    organizer_compensation_model: 'none',
    status: 'pending',
  }).select('id').single();
  if (error || !data) {
    console.warn('Supabase event proposal failed:', error?.code);
    throw new Error('No se pudo enviar la propuesta. Verifica identidad Didit, foto de perfil y permisos de la cuenta.');
  }
  return data.id;
}

export async function fetchExperienceProposals(userId: string): Promise<Proposal[]> {
  if (!userId) return [];
  const { data: ownProfile } = await supabase.from('profiles').select('state,city').eq('id', userId).maybeSingle();
  if (!ownProfile?.state) return [];
  const { data, error } = await supabase
    .from('experience_proposals')
    .select('id,owner_user_id,title,description,category,city,state,status,created_at')
    .eq('country_code', 'MX')
    .eq('state', ownProfile.state)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('Supabase proposals load failed:', error.code);
    return [];
  }
  return (data ?? []).filter(row => !ownProfile.city || row.city?.toLocaleLowerCase('es-MX') === ownProfile.city.toLocaleLowerCase('es-MX')).map(row => ({
    id: row.id,
    title: row.title,
    cat: proposalCategoryFromDb(row.category),
    author: row.owner_user_id === userId ? 'Tú' : 'Miembro verificado',
    when: new Date(row.created_at).toLocaleDateString(),
    apps: 0,
    status: row.status === 'active' ? 'publicada' : row.status === 'rejected' ? 'rechazada' : row.status === 'closed' || row.status === 'paused' ? 'retirada' : 'en revisión',
    body: row.description,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    mine: row.owner_user_id === userId,
  }));
}

export async function createExperienceProposal(
  userId: string,
  proposal: { title: string; cat: string; body: string; limited: boolean },
  city?: string,
  state?: string,
  region: AppRegion = 'MX',
): Promise<Proposal> {
  const title = proposal.title.trim().slice(0, 120);
  const description = proposal.body.trim().slice(0, 3000);
  if (title.length < 8) throw new Error('El título debe tener al menos 8 caracteres.');
  if (description.length < 20) throw new Error('La descripción debe tener al menos 20 caracteres.');
  const category = /tr[ií]o/i.test(proposal.cat) ? 'trio'
    : /grupo|fiesta|meetup/i.test(proposal.cat) ? 'group_meetup'
    : /fetiche|inter[eé]s/i.test(proposal.cat) ? 'fetish_discussion'
    : /cita|date/i.test(proposal.cat) ? 'date' : 'other';

  const { data, error } = await supabase
    .from('experience_proposals')
    .insert({
      owner_user_id: userId,
      title,
      description,
      category,
      participant_min: 2,
      participant_max: 2,
      boundaries: proposal.limited ? 'Identidad y datos personales limitados hasta aceptación mutua.' : 'Consentimiento explícito, respeto y límites acordados.',
      location_mode: 'city_only',
      city: city?.trim().slice(0, 100) || null,
      state: state?.trim().slice(0, 80) || null,
      country_code: 'MX',
      status: 'pending',
    })
    .select('id,owner_user_id,title,description,category,city,state,status,created_at')
    .single();

  if (error || !data) {
    console.warn('Supabase proposal create failed:', error?.code);
    throw new Error('No se pudo enviar la propuesta. La cuenta debe estar verificada y activa.');
  }
  return {
    id: data.id,
    title: data.title,
    cat: proposalCategoryFromDb(data.category),
    author: 'Tú',
    when: new Date(data.created_at).toLocaleDateString(),
    apps: 0,
    status: 'en revisión',
    body: data.description,
    city: data.city ?? undefined,
    state: data.state ?? undefined,
    mine: true,
  };
}

export async function applyToExperienceProposal(userId: string, proposalId: string): Promise<void> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId) || !uuidPattern.test(proposalId)) {
    throw new Error('La propuesta no pertenece al backend real.');
  }
  const { error } = await supabase.from('experience_interests').insert({
    proposal_id: proposalId,
    requester_user_id: userId,
    message: 'Me interesa esta propuesta. Acepto conversar con respeto y consentimiento mutuo.',
    status: 'pending',
  });
  if (error) {
    console.warn('Supabase proposal interest failed:', error.code);
    throw new Error('No se pudo enviar el interés. Verifica tu cuenta y que la propuesta siga activa.');
  }
}
