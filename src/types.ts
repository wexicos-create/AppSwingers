export type ProfileKind = 'Pareja' | 'Dama' | 'Caballero' | 'Individual';
export type VerifyStatus = 'sin iniciar' | 'en revisión' | 'verificado' | 'rechazado';
export type AccountStatus = 'activo' | 'suspendido' | 'eliminado';
export type SwipeAction = 'like' | 'pass' | 'dislike' | 'superlike';
export type AppRegion = 'MX';

export interface VoiceNote {
  duration: string;
  reflectionPrompt: string;
  reflectionQuote: string;
}

export interface Profile {
  id: string;
  name: string;
  kind: ProfileKind;
  age?: number;
  ages?: string;
  km: number;
  distance?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: AppRegion;
  likesYou?: boolean;
  verify: VerifyStatus;
  status: AccountStatus;
  hue: number;
  tags: string[];
  bio: string;
  photo?: string;
  photos: string[];
  joined?: string;
  occupation?: string;
  zodiac?: string;
  height?: string;
  verified?: boolean;
  online?: boolean;
  matchPercentage?: number;
  voiceNote?: VoiceNote;
}

export interface MatchItem {
  id: string;
  profile: Profile;
  matchedAt: string;
  lastMessage?: string;
  unreadCount?: number;
}

export interface EventTier {
  id: string;
  label: string;
  note: string;
  price: number;
  seats: number;
  promo?: boolean;
}

export interface ClubEvent {
  id: string;
  title: string;
  theme: string;
  date: string;
  time: string;
  zone: string;
  city?: string;
  state?: string;
  organizer: string;
  own: boolean;
  cap: number;
  sold: number;
  reqs: string[];
  paid: boolean;
  published: boolean;
  promoted: boolean;
  hue: number;
}

export interface Reservation {
  id: string;
  eventId: string;
  tier: string | null;
  folio: string;
  code: string;
  ts: number;
  status: 'solicitud' | 'pendiente_pago' | 'pagado' | 'confirmado' | 'asistió' | 'rechazado' | 'cancelado';
}

export interface Proposal {
  id: string;
  title: string;
  cat: string;
  author: string;
  when: string;
  apps: number;
  status: 'publicada' | 'en revisión' | 'rechazada' | 'retirada';
  body: string;
  city?: string;
  state?: string;
  mine?: boolean;
}

export interface CollaborationProposal {
  id: string;
  title: string;
  eventType: 'Swinger' | 'GangBang' | 'Trío MHM' | 'Fiesta Privada VIP';
  organizerType: 'Mujer' | 'Pareja';
  organizerName: string;
  region: AppRegion;
  state?: string;
  eventDate: string;
  schedule: string;
  feeAmount: number; // MXN
  city: string; // e.g. San Luis Potosí, CDMX, Texas, etc.
  consentRules: string;
  attendeeRatio: string;
  capacity: number;
  healthProtocols: string;
  admissionFilter: string;
  ineFrontUrl?: string;
  ineBackUrl?: string;
  selfieUrl?: string;
  status: 'en revisión' | 'aprobada' | 'rechazada';
  paid: boolean;
  createdAt: number;
}

export interface Creator {
  name: string;
  handle: string;
  bio: string;
  price: number;
  avatar: string;
  ok?: boolean;
  status?: string;
  subs?: number;
  followers?: string;
  free?: number;
}

export interface LiveStream {
  id: string;
  title: string;
  host: string;
  when: string;
  price: number;
  status: 'programado' | 'en vivo';
  hue: number;
}

export interface ChatMessage {
  id?: string;
  me: boolean;
  ts: number;
  t?: string;
  img?: string;
  voiceUrl?: string;
  voiceDuration?: string;
}

export interface ReportItem {
  id: string;
  target: {
    type: 'usuario' | 'propuesta' | 'creadora';
    id: string;
    name: string;
  };
  reason: string;
  when: string;
  status: 'abierto' | 'resuelto';
  action?: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;
  ts: number;
}

export interface PaymentItem {
  id: string;
  kind: 'premium' | 'suscripcion' | 'directo' | 'evento' | 'propuesta_colaboracion';
  ref: string;
  label: string;
  amount: number;
  status: 'pendiente' | 'confirmado' | 'rechazado';
  ts: number;
}

export type SubscriptionTier = 'free' | 'plus' | 'ultra' | 'silver' | 'gold';

export interface StoryPost {
  id: string;
  title: string;
  author: string;
  category: 'historia' | 'consejo' | 'donde_buscar' | 'faq';
  body: string;
  likes: number;
  date: string;
  region: AppRegion;
  sensualConsentTag?: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  author: string;
  postsCount: number;
  lastActive: string;
  requiresMatchOrPhone: boolean;
  messages: { id: string; author: string; text: string; time: string }[];
}

