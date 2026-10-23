import { doc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { AppRegion, DonationRecord, EventAccessPass, EventPayoutRequest, EventRating, SupportTicket } from './types';
import { computeEarningSplit } from './organizers';

// ---------- Event attendance, settlement, donations, ratings and support ----------
// Harmonized settlement logic (admin rule 2026-10). The goal: nobody loses.
// 1. Each attendee pays their deposit ONCE through SPEI; the platform holds it
//    in escrow. Before paying the attendee accepts explicitly: "if you do not
//    attend, your deposit is not refundable" (that seat was reserved).
// 2. On event day the organizer registers attendance in a single form by
//    entering every access code presented at the door; each code is validated
//    against the passes actually issued (no duplicates, no inventions).
// 3. Settlement pays the organizer the deposits of confirmed attendees PLUS
//    the deposits of paid no-shows (no-show rule, disclosed before payment),
//    minus the 30% platform commission and the 10% ISR retention. The
//    organizer never loses money because of absentees.
// 4. Refunds are issued ONLY when: (a) the organizer declares a paid user as
//    "no admitido" (not admitted / not delivered) in that same form, (b) the
//    event is cancelled, or (c) the administrator decides so after verified
//    complaints. If 15 pay, the organizer declares 8 and marks 7 as not
//    admitted, only the 8 are paid out and the 7 are refunded.
// 5. Anti-fraud threshold ("cuántos asistentes se requieren para pagar"):
//    if the declared attendance is below EVENT_MIN_ATTENDANCE_RATIO of the
//    paid passes (e.g. 15 pay, 3 attend), the payout is NOT released
//    automatically: it goes to administrative review, and the admin can
//    either release it (legitimate low attendance) or refund everyone
//    (phantom event). This closes the staggered-scam vector without
//    confiscating money from honest organizers: the fee they paid to publish
//    plus the public rating history make the scam unprofitable.

export const EVENT_MIN_ATTENDANCE_RATIO = 0.5; // at least 50% of paid passes must attend for instant release
export const EVENT_PASS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // passes purged at least once a month
export const RATING_ALERT_THRESHOLD = 3.5; // agencies below this average raise an admin alert
export const PLATFORM_COMMISSION_LABEL = '30%'; // shown in settlement previews

export const MX_IVA_PCT = 0.16;
export const US_SALES_TAX_PCT = 0.08; // configurable average US sales tax

// ---------- Pricing (deposits and donations carry tax on top) ----------
export interface TaxedPrice { base: number; tax: number; taxLabel: string; total: number; currency: string }

export function getEventDepositPrice(region: AppRegion, tierPrice: number): TaxedPrice {
  const isMx = region === 'MX';
  const tax = Math.round(tierPrice * (isMx ? MX_IVA_PCT : US_SALES_TAX_PCT) * 100) / 100;
  return {
    base: tierPrice,
    tax,
    taxLabel: isMx ? 'IVA 16%' : 'Sales tax 8%',
    total: Math.round((tierPrice + tax) * 100) / 100,
    currency: isMx ? 'MXN' : 'USD',
  };
}

// Donation pricing: the user pays what they want to donate plus tax.
export function getDonationPrice(region: AppRegion, amount: number): TaxedPrice {
  return getEventDepositPrice(region, amount);
}

// Suggested donation amounts (MX nominal; US follows the MXN/10 rule).
export const DONATION_PRESETS_MX = [100, 200, 500, 1000];
export const DONATION_PRESETS_US = [10, 20, 50, 100];

// ---------- VIP access codes ----------
// Format: 'VIP 7365 6145 0880' — always VIP first, three groups of four
// digits. Uniqueness is checked against the currently retained passes; the
// monthly purge keeps the registry small, so collisions stay negligible.
export function generateVipAccessCode(existingCodes: string[] = []): string {
  const group = () => String(Math.floor(1000 + Math.random() * 9000));
  for (let attempt = 0; attempt < 60; attempt++) {
    const code = `VIP ${group()} ${group()} ${group()}`;
    if (!existingCodes.includes(code)) return code;
  }
  return `VIP ${group()} ${group()} ${group()}`;
}

// Tolerant normalizer: 'vip7365614508 80' → 'VIP 7365 6145 0880'.
export function normalizeAccessCode(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 12) return raw.trim().toUpperCase();
  const d = digits.slice(0, 12);
  return `VIP ${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)}`;
}

// ---------- Event dates (mixed formats: free text like "Sáb 24 oct" or ISO) ----------
export function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const MONTH_TOKENS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

// Best-effort parser to ISO 'YYYY-MM-DD'; returns null when unknown.
export function parseEventDate(dateStr: string): string | null {
  const s = (dateStr || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dayMatch = s.match(/(\d{1,2})/);
  const monthMatch = s.toLowerCase().match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)/);
  if (!dayMatch || !monthMatch) return null;
  const day = Number(dayMatch[1]);
  const month = MONTH_TOKENS[monthMatch[1]];
  if (!day || !month || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear();
  // If that day/month already passed this year, the event is next year.
  if (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && day < now.getDate())) year += 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isEventDay(dateStr: string): boolean {
  const iso = parseEventDate(dateStr);
  return iso !== null && iso === todayIso();
}

export function isEventPast(dateStr: string): boolean {
  const iso = parseEventDate(dateStr);
  return iso !== null && iso < todayIso();
}

// ---------- Event access passes (Firestore) ----------
export async function saveRemoteEventPass(pass: EventAccessPass): Promise<boolean> {
  try {
    await setDoc(doc(db, 'event_passes', pass.id), pass);
    return true;
  } catch { return false; }
}

export async function fetchEventPassesForUser(userUid: string): Promise<EventAccessPass[]> {
  if (!userUid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'event_passes'), where('userUid', '==', userUid)));
    return snap.docs.map(d => d.data() as EventAccessPass).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function fetchEventPassesForEvent(eventId: string): Promise<EventAccessPass[]> {
  try {
    const snap = await getDocs(query(collection(db, 'event_passes'), where('eventId', '==', eventId)));
    return snap.docs.map(d => d.data() as EventAccessPass).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function fetchAllEventPasses(): Promise<EventAccessPass[]> {
  try {
    const snap = await getDocs(collection(db, 'event_passes'));
    return snap.docs.map(d => d.data() as EventAccessPass);
  } catch { return []; }
}

export async function updateRemoteEventPass(passId: string, partial: Partial<EventAccessPass>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'event_passes', passId), partial);
    return true;
  } catch { return false; }
}

// Monthly pass purge: passes older than the retention window are deleted
// completely, so the code registry never accumulates forever.
export async function purgeExpiredEventPasses(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'event_passes'));
    const cutoff = Date.now() - EVENT_PASS_RETENTION_MS;
    let purged = 0;
    for (const d of snap.docs) {
      const p = d.data() as EventAccessPass;
      if (p.createdAt < cutoff) {
        await deleteDoc(doc(db, 'event_passes', p.id));
        purged++;
      }
    }
    return purged;
  } catch { return 0; }
}

// ---------- Settlement computation ----------
export interface EventSettlement {
  paidCount: number;
  attendedCount: number;
  noShowCount: number;
  refundCount: number;
  gross: number;
  commission: number;
  isrRetained: number;
  net: number;
  refundTotal: number;
  requiresReview: boolean;
}

// Computes the settlement over the paid passes of one event.
// - used passes → released to the organizer;
// - active (not used) passes NOT marked for refund → no-show rule, released
//   to the organizer (disclosed as non-refundable before paying);
// - active passes marked for refund → refunded to the attendee.
export function computeEventSettlement(passes: EventAccessPass[], refundPassIds: string[]): EventSettlement {
  const paid = passes.filter(p => p.status === 'usado' || p.status === 'activo');
  const attended = paid.filter(p => p.status === 'usado');
  const refundIds = new Set(refundPassIds);
  const refunded = paid.filter(p => p.status === 'activo' && refundIds.has(p.id));
  const noShow = paid.filter(p => p.status === 'activo' && !refundIds.has(p.id));
  const released = [...attended, ...noShow];
  const gross = Math.round(released.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const split = computeEarningSplit(gross);
  const refundTotal = Math.round(refunded.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const requiresReview = paid.length > 0 && attended.length / paid.length < EVENT_MIN_ATTENDANCE_RATIO;
  return {
    paidCount: paid.length,
    attendedCount: attended.length,
    noShowCount: noShow.length,
    refundCount: refunded.length,
    gross,
    commission: split.commission,
    isrRetained: split.isrRetained,
    net: split.net,
    refundTotal,
    requiresReview,
  };
}

export function newEventPayoutRequest(params: {
  eventId: string;
  eventTitle: string;
  organizerUid: string | null;
  organizerName: string;
  organizerEmail: string;
  settlement: EventSettlement;
  status: 'revision' | 'liberado';
}): EventPayoutRequest {
  const s = params.settlement;
  return {
    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    organizerUid: params.organizerUid,
    organizerName: params.organizerName,
    organizerEmail: params.organizerEmail,
    paidCount: s.paidCount,
    attendedCount: s.attendedCount,
    noShowCount: s.noShowCount,
    refundCount: s.refundCount,
    gross: s.gross,
    commission: s.commission,
    isrRetained: s.isrRetained,
    net: s.net,
    refundTotal: s.refundTotal,
    status: params.status,
    createdAt: Date.now(),
    decidedAt: null,
    note: '',
  };
}

export async function createRemotePayout(payout: EventPayoutRequest): Promise<boolean> {
  try {
    await setDoc(doc(db, 'event_payouts', payout.id), payout);
    return true;
  } catch { return false; }
}

export async function fetchPayoutsForOrganizer(uid: string | null): Promise<EventPayoutRequest[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'event_payouts'), where('organizerUid', '==', uid)));
    return snap.docs.map(d => d.data() as EventPayoutRequest).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function fetchAllPayouts(): Promise<EventPayoutRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'event_payouts'));
    return snap.docs.map(d => d.data() as EventPayoutRequest).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function updateRemotePayout(payoutId: string, partial: Partial<EventPayoutRequest>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'event_payouts', payoutId), partial);
    return true;
  } catch { return false; }
}

// ---------- Donations ----------
export async function createRemoteDonation(donation: DonationRecord): Promise<boolean> {
  try {
    await setDoc(doc(db, 'donations', donation.id), donation);
    return true;
  } catch { return false; }
}

export async function updateRemoteDonation(donationId: string, partial: Partial<DonationRecord>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'donations', donationId), partial);
    return true;
  } catch { return false; }
}

export async function fetchDonationsForDonor(uid: string | null): Promise<DonationRecord[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'donations'), where('donorUid', '==', uid)));
    return snap.docs.map(d => d.data() as DonationRecord).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function fetchAllDonations(): Promise<DonationRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'donations'));
    return snap.docs.map(d => d.data() as DonationRecord).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

// ---------- Ratings and reputation ----------
export async function saveRemoteRating(rating: EventRating): Promise<boolean> {
  try {
    await setDoc(doc(db, 'event_ratings', rating.id), rating);
    return true;
  } catch { return false; }
}

export async function fetchAllEventRatings(): Promise<EventRating[]> {
  try {
    const snap = await getDocs(collection(db, 'event_ratings'));
    return snap.docs.map(d => d.data() as EventRating);
  } catch { return []; }
}

export async function fetchRatingsByUser(uid: string): Promise<EventRating[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'event_ratings'), where('userUid', '==', uid)));
    return snap.docs.map(d => d.data() as EventRating);
  } catch { return []; }
}

export interface OrganizerReputation { avg: number; count: number; alert: boolean }

export function organizerReputation(ratings: EventRating[]): OrganizerReputation {
  if (ratings.length === 0) return { avg: 0, count: 0, alert: false };
  const avg = Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10;
  return { avg, count: ratings.length, alert: avg < RATING_ALERT_THRESHOLD };
}

export function reputationByOrganizer(ratings: EventRating[]): Record<string, OrganizerReputation> {
  const map: Record<string, OrganizerReputation> = {};
  for (const r of ratings) {
    if (!map[r.organizerName]) map[r.organizerName] = { avg: 0, count: 0, alert: false };
    map[r.organizerName].count++;
  }
  for (const name of Object.keys(map)) {
    map[name] = organizerReputation(ratings.filter(r => r.organizerName === name));
  }
  return map;
}

// ---------- Support tickets (agencies, promoters, associates, creators) ----------
export async function createRemoteTicket(ticket: SupportTicket): Promise<boolean> {
  try {
    await setDoc(doc(db, 'support_tickets', ticket.id), ticket);
    return true;
  } catch { return false; }
}

export async function fetchTicketsForUser(uid: string | null): Promise<SupportTicket[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'support_tickets'), where('userUid', '==', uid)));
    return snap.docs.map(d => d.data() as SupportTicket).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function fetchAllTickets(): Promise<SupportTicket[]> {
  try {
    const snap = await getDocs(collection(db, 'support_tickets'));
    return snap.docs.map(d => d.data() as SupportTicket).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function updateRemoteTicket(ticketId: string, partial: Partial<SupportTicket>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'support_tickets', ticketId), partial);
    return true;
  } catch { return false; }
}

export function newSupportTicket(params: {
  userUid: string | null;
  userName: string;
  userEmail: string;
  requester: SupportTicket['requester'];
  subject: string;
  message: string;
}): SupportTicket {
  return {
    id: 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    userUid: params.userUid,
    userName: params.userName,
    userEmail: params.userEmail,
    requester: params.requester,
    subject: params.subject,
    message: params.message,
    status: 'abierto',
    reply: null,
    createdAt: Date.now(),
    repliedAt: null,
  };
}

// Cross-device in-app notification (same collection the identity verdicts use).
// Used by the admin panel (pass issued, donation credited, payout decided) and
// by organizers (same-day location release, refunds after settlement).
export async function pushRemoteNotification(params: {
  userUid: string;
  kind: 'identidad' | 'pase' | 'sistema' | 'donacion' | 'evento' | 'soporte';
  title: string;
  body: string;
}): Promise<boolean> {
  try {
    const now = Date.now();
    const id = 'nt_' + now + '_' + Math.random().toString(36).slice(2, 8);
    await setDoc(doc(db, 'notifications', id), {
      id,
      userUid: params.userUid,
      senderUid: auth.currentUser?.uid || null,
      kind: params.kind,
      title: params.title,
      body: params.body,
      ts: now,
      read: false,
    });
    return true;
  } catch { return false; }
}

// ---------- Technical sheet (ficha técnica) with APPSWINGER watermark ----------
// Standalone HTML receipt; the ID is the SPEI order reference. It is a proof
// of payment for the attendee and the promoter, NOT a door credential: at the
// event only the access code is presented.
export function buildTicketHtml(pass: EventAccessPass, isEs: boolean): string {
  const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const watermark = 'APPSWINGER '.repeat(60);
  return `<!DOCTYPE html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AppSwinguer · ${isEs ? 'Ficha técnica' : 'Technical sheet'} ${esc(pass.orderRef)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #0a0514; color: #f5eeff; margin: 0; padding: 24px; }
  .sheet { max-width: 520px; margin: 0 auto; background: linear-gradient(160deg, #1c1032, #0e071a); border: 1px solid rgba(177,76,255,.4); border-radius: 24px; padding: 28px; position: relative; overflow: hidden; }
  .watermark { position: absolute; top: -40px; left: -30px; width: 160%; transform: rotate(-24deg); font-size: 28px; font-weight: 900; color: rgba(255,255,255,0.045); letter-spacing: 8px; white-space: pre-wrap; pointer-events: none; user-select: none; line-height: 46px; z-index: 0; }
  .content { position: relative; z-index: 1; }
  .brand { font-size: 12px; letter-spacing: 4px; color: #d49cff; font-weight: bold; text-transform: uppercase; }
  h1 { font-size: 20px; margin: 10px 0 2px; }
  .sub { color: #cbbee2; font-size: 12px; margin: 0 0 18px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px dashed rgba(199,125,255,.25); font-size: 13px; }
  .row .k { color: #cbbee2; }
  .row .v { font-weight: bold; text-align: right; }
  .code { text-align: center; margin: 20px 0 8px; }
  .code .label { font-size: 10px; letter-spacing: 3px; color: #cbbee2; text-transform: uppercase; }
  .code .value { font-family: 'Courier New', monospace; font-size: 26px; font-weight: 900; color: #ff7ab8; letter-spacing: 3px; }
  .note { background: rgba(94,230,168,.08); border: 1px solid rgba(94,230,168,.3); border-radius: 12px; padding: 10px 12px; font-size: 11px; color: #b7f5d9; margin-top: 16px; line-height: 1.5; }
  .foot { text-align: center; font-size: 10px; color: #8b7fa8; margin-top: 18px; line-height: 1.6; }
</style>
</head>
<body>
<div class="sheet">
  <div class="watermark">${watermark}</div>
  <div class="content">
    <div class="brand">AppSwinguer</div>
    <h1>${isEs ? 'Ficha técnica de evento' : 'Event technical sheet'}</h1>
    <p class="sub">${isEs ? 'Comprobante de pago de depósito de asistencia' : 'Attendance deposit payment receipt'}</p>
    <div class="row"><span class="k">${isEs ? 'ID de orden' : 'Order ID'}</span><span class="v">${esc(pass.orderRef)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Evento' : 'Event'}</span><span class="v">${esc(pass.eventTitle)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Fecha y hora' : 'Date and time'}</span><span class="v">${esc(pass.eventDate)} · ${esc(pass.eventTime)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Zona' : 'Zone'}</span><span class="v">${esc(pass.eventZone)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Entrada' : 'Ticket type'}</span><span class="v">${esc(pass.tierLabel || (isEs ? 'General' : 'General'))}</span></div>
    <div class="row"><span class="k">${isEs ? 'Asistente' : 'Attendee'}</span><span class="v">${esc(pass.userName)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Organiza' : 'Organizer'}</span><span class="v">${esc(pass.organizerName)}</span></div>
    <div class="row"><span class="k">${isEs ? 'Monto pagado' : 'Amount paid'}</span><span class="v">$${pass.amount.toLocaleString()}</span></div>
    <div class="code">
      <div class="label">${isEs ? 'Código de acceso' : 'Access code'}</div>
      <div class="value">${esc(pass.code)}</div>
    </div>
    <div class="note">
      ${isEs
        ? 'La ubicación exacta se entrega el mismo día del evento por seguridad. Si no asistes, tu depósito no es reembolsable (fue aclarado antes de pagar); si el organizador no te admite, se te reembolsa. Esta ficha NO se presenta en el evento: en la puerta solo presentas tu código de acceso.'
        : 'The exact location is released the same day of the event for security. If you do not attend, your deposit is not refundable (disclosed before paying); if the organizer does not admit you, you are refunded. This sheet is NOT presented at the event: at the door you only show your access code.'}
    </div>
    <p class="foot">
      ${isEs ? 'Documento generado por AppSwinguer. Marca de agua de autenticidad.' : 'Document generated by AppSwinguer. Authenticity watermark.'}<br>
      ${new Date().toLocaleString()}
    </p>
  </div>
</div>
</body>
</html>`;
}

// Triggers the browser download of the technical sheet as an HTML file.
export function downloadEventTicket(pass: EventAccessPass, isEs: boolean): void {
  try {
    const html = buildTicketHtml(pass, isEs);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AppSwinguer_${pass.orderRef || pass.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch { /* download unsupported */ }
}
