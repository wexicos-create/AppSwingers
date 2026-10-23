export type ProfileKind = 'Pareja' | 'Dama' | 'Caballero' | 'Individual';
export type VerifyStatus = 'sin iniciar' | 'en revisión' | 'verificado' | 'rechazado';
export type AccountStatus = 'activo' | 'suspendido' | 'eliminado';

// Identity verdict issued by the administrator after reviewing the INE archive.
// 'pendiente' is implicit for records that predate the verdict system.
export type IdentityVerdict = 'pendiente' | 'aprobada' | 'rechazada' | 'baneada';

// Platform notification stored in the `notifications` collection; the admin
// creates them and each user reads only their own on login.
export interface AppNotification {
  id: string;
  userUid: string;
  kind: 'identidad' | 'pase' | 'sistema' | 'donacion' | 'evento' | 'soporte';
  title: string;
  body: string;
  ts: number;
  read: boolean;
  senderUid?: string | null; // authenticated sender for cross-user notifications (rule-verified)
}

// Premium state-search day pass (travelers/tourists). Stored in `state_passes/{uid}`;
// only the administrator can create it (after approving the SPEI payment).
export interface StatePass {
  userUid: string;
  stateCode: string;
  stateName: string;
  region: AppRegion;
  orderId: string;
  createdAt: number;
  expiresAt: number;
}

// Badge policy: 'verificada' (blue) is reserved for content creators, event
// agencies and coordinators; 'oro' (gold) is reserved for socios and admins.
export type BadgeKind = 'verificada' | 'oro';
export type SwipeAction = 'like' | 'pass' | 'dislike' | 'superlike';
export type AppRegion = 'MX' | 'US';

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
  country?: AppRegion;
  state?: string; // state/province used by the premium state-search pass
  badge?: BadgeKind; // 'verificada' (creators/agencies/coordinators) | 'oro' (socios/admins)
  adminStamp?: boolean; // gold rectangular ADMIN seal next to the name
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
  organizer: string;
  organizerUid?: string | null;
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
  mine?: boolean;
}

export interface CollaborationProposal {
  id: string;
  title: string;
  eventType: 'Swinger' | 'GangBang' | 'Trío MHM' | 'Fiesta Privada VIP';
  organizerType: 'Mujer' | 'Pareja';
  organizerName: string;
  region: AppRegion;
  feeAmount: number; // $350 MXN or $80 USD
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

export type SpeiOrderKind = 'suscripcion' | 'evento' | 'propuesta_colaboracion' | 'premium' | 'pase_estado' | 'donacion';
export type SpeiOrderStatus = 'pendiente' | 'verificado' | 'aprobado' | 'rechazado' | 'expirado';

// SPEI transfer order: reference is the unique payment ID used in the bank concept.
// The administrator approves or rejects; on approval the purchased benefit activates automatically.
export interface SpeiOrder {
  id: string;
  reference: string;
  concept: string;
  kind: SpeiOrderKind;
  itemRef: string;
  label: string;
  amount: number;
  userUid: string | null;
  userName: string;
  userEmail: string;
  status: SpeiOrderStatus;
  createdAt: number;
  expiresAt: number;
  timeline: { ts: number; text: string }[];
  // JSON payload with the context the administrator needs to activate the
  // benefit automatically: event data for the access pass, creator and donor
  // data for donations.
  meta?: string;
}

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


// ---------- Event attendance, settlement, donations, ratings and support ----------
// Access pass issued by the administrator when the attendee's SPEI deposit is
// approved. Stored in `event_passes/{id}`; the pass carries the VIP access
// code presented at the door. Passes are purged monthly (they never
// accumulate forever), which also keeps code repetition extremely unlikely.
export interface EventAccessPass {
  id: string;
  code: string; // 'VIP 7365 6145 0880' (always VIP first, three groups of four)
  eventId: string;
  eventTitle: string;
  eventDate: string; // as published in the event (free text or ISO)
  eventTime: string;
  eventZone: string; // approximate zone; the exact location is released the same day
  organizerUid: string | null;
  organizerName: string;
  userUid: string; // attendee
  userName: string;
  tierId: string | null;
  tierLabel: string;
  amount: number; // deposit actually paid (tax included)
  orderId: string; // SPEI order id (the technical sheet ID is the order reference)
  orderRef: string; // 'ASW-XXXXXX' — printed as the ticket ID on the technical sheet
  createdAt: number;
  status: 'pendiente_pago' | 'activo' | 'usado' | 'reembolsado' | 'cancelado';
  usedAt: number | null;
  refundedAt: number | null;
}

// Settlement the organizer requests after registering attendance. When the
// declared attendance is at or above EVENT_MIN_ATTENDANCE_RATIO of the paid
// passes, the payout releases instantly; below the threshold it goes to
// administrative review (anti "phantom event" protection).
export interface EventPayoutRequest {
  id: string;
  eventId: string;
  eventTitle: string;
  organizerUid: string | null;
  organizerName: string;
  organizerEmail: string;
  paidCount: number;
  attendedCount: number;
  noShowCount: number;
  refundCount: number;
  gross: number;
  commission: number;
  isrRetained: number;
  net: number;
  refundTotal: number;
  status: 'revision' | 'liberado' | 'rechazado';
  createdAt: number;
  decidedAt: number | null;
  note: string;
}

// Donation from a user to a content creator. The donor pays the donation plus
// tax (IVA 16% in Mexico, ~8% sales tax in the US); the creator is notified
// with the donor's profile name and the amount is credited to the creator's
// virtual earnings card when the administrator approves the SPEI payment.
export interface DonationRecord {
  id: string;
  donorUid: string | null;
  donorName: string; // account name
  donorProfileName: string; // profile alias shown to the creator
  creatorHandle: string;
  creatorName: string;
  amount: number; // donation before tax
  tax: number;
  total: number; // amount actually paid by the donor
  message: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  orderId: string;
  createdAt: number;
  decidedAt: number | null;
}

// Post-event rating pushed to attendees the day after the event (5 stars +
// optional comment). Accumulated bad references raise admin alerts about the
// agency / promoter / associate.
export interface EventRating {
  id: string;
  eventId: string;
  eventTitle: string;
  organizerUid: string | null;
  organizerName: string;
  userUid: string;
  userName: string;
  stars: number; // 1..5
  comment: string;
  ts: number;
}

// Support channel for agencies, promoters, associates and creators: total
// openness to handle their requests, complaints and clarifications, always
// seeking their satisfaction over winning any controversy.
export interface SupportTicket {
  id: string;
  userUid: string | null;
  userName: string;
  userEmail: string;
  requester: 'agencia' | 'asociado' | 'organizador' | 'creadora';
  subject: string;
  message: string;
  status: 'abierto' | 'respondido' | 'cerrado';
  reply: string | null;
  createdAt: number;
  repliedAt: number | null;
}
