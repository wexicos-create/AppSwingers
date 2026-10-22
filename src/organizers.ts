import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { AppRegion } from './types';

// ---------- Organizer roles and types ----------
// agencia: recurring professional agency; asociado: recurring event host;
// organizador: occasional host whose publishing benefit degrades monthly and requires renewal.
export type OrganizerRole = 'agencia' | 'asociado' | 'organizador';

export interface OrganizerApplication {
  id: string;
  userUid: string | null;
  userEmail: string;
  role: OrganizerRole;
  legalName: string;
  phone: string;
  ineFront: string;       // dataURL (INE front, same document captured at registration)
  ineBack: string;        // dataURL (INE back)
  bankStatement: string;  // dataURL (bank statement photo)
  fiscalProof: string;    // dataURL (fiscal proof)
  payoutBank: string;
  payoutClabe: string;
  payoutHolder: string;   // must match legalName; withdrawals only to accounts in the holder's name
  status: 'en revisión' | 'aprobada' | 'rechazada';
  createdAt: number;
  approvedAt: number | null;
}

export type OrganizerApplicationDraft = Omit<OrganizerApplication, 'id' | 'status' | 'createdAt' | 'approvedAt'>;

export interface WalletTransaction {
  id: string;
  userUid: string | null; // wallet owner (the organizer receiving the earning)
  kind: 'ingreso_evento' | 'ingreso_colaboracion' | 'retiro' | 'ajuste';
  eventId?: string;
  gross: number;
  commission: number;  // platform commission (30%)
  isrRetained: number; // ISR withheld by the platform
  net: number;         // credited amount (negative for withdrawals/adjustments)
  note: string;
  ts: number;
}

export interface WithdrawalRequest {
  id: string;
  userUid: string | null;
  userName: string;
  userEmail: string;
  amount: number;
  bank: string;
  clabe: string;
  holder: string;
  status: 'solicitado' | 'transferido' | 'rechazado';
  createdAt: number;
  slaDeadline: number; // transfer must complete within 24 hours
  paidAt: number | null;
}

// ---------- Commercial constants ----------
export const PLATFORM_COMMISSION_PCT = 30; // platform keeps 30% of every event sale
export const CREATOR_PCT = 70;            // organizer/creator receives 70%
export const ISR_RETENTION_PCT = 10;      // provisional ISR rate withheld by the platform (admin-adjustable in the future)
export const WITHDRAWAL_SLA_MS = 24 * 60 * 60 * 1000;
export const ORGANIZER_BENEFIT_MS = 30 * 24 * 60 * 60 * 1000; // monthly degradation for occasional organizers

// ---------- Earnings split and wallet ----------
export interface EarningSplit { gross: number; commission: number; isrRetained: number; net: number }

export function computeEarningSplit(gross: number): EarningSplit {
  const commission = Math.round(gross * PLATFORM_COMMISSION_PCT) / 100;
  const afterCommission = Math.round((gross - commission) * 100) / 100;
  const isrRetained = Math.round(afterCommission * ISR_RETENTION_PCT) / 100;
  const net = Math.round((afterCommission - isrRetained) * 100) / 100;
  return { gross, commission, isrRetained, net };
}

export function walletBalance(transactions: WalletTransaction[]): number {
  return Math.round(transactions.reduce((sum, t) => sum + t.net, 0) * 100) / 100;
}

// Withdrawals may only go to an account in the file holder's own name.
export function namesMatch(legalName: string, holderName: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u00f1 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const a = norm(legalName);
  const b = norm(holderName);
  if (!a || !b) return false;
  if (a === b) return true;
  const legalTokens = a.split(' ');
  const holderTokens = b.split(' ');
  return holderTokens.length > 0 && holderTokens.every(t => legalTokens.includes(t));
}

// ---------- Publishing benefit state ----------
export interface OrganizerBenefitState { active: boolean; expiresAt: number | null }

export function organizerBenefitState(app: OrganizerApplication | null): OrganizerBenefitState {
  if (!app || app.status !== 'aprobada') return { active: false, expiresAt: null };
  // Agencies and associates keep the benefit while their file is approved;
  // occasional organizers degrade monthly and the administrator renews them.
  if (app.role === 'organizador') {
    const expiresAt = (app.approvedAt || 0) + ORGANIZER_BENEFIT_MS;
    return { active: Date.now() < expiresAt, expiresAt };
  }
  return { active: true, expiresAt: null };
}

// ---------- Event publishing fee (admin-editable) ----------
export interface EventPublishFee { base: number; tax: number; total: number }

const EVENT_FEE_KEY = 'appswinguer_event_fee';

export function getEventPublishFee(region: AppRegion): EventPublishFee {
  let base = region === 'MX' ? 500 : 120;
  try {
    const saved = JSON.parse(localStorage.getItem(EVENT_FEE_KEY) || '{}');
    if (saved && typeof saved[region] === 'number' && saved[region] > 0) base = saved[region];
  } catch { /* ignore */ }
  const tax = Math.round(base * 0.16 * 100) / 100;
  return { base, tax, total: Math.round((base + tax) * 100) / 100 };
}

export function saveEventPublishFee(region: AppRegion, base: number): void {
  try {
    const saved = JSON.parse(localStorage.getItem(EVENT_FEE_KEY) || '{}');
    saved[region] = base;
    localStorage.setItem(EVENT_FEE_KEY, JSON.stringify(saved));
  } catch { /* ignore */ }
}

// ---------- Constructors ----------
export function newOrganizerApplication(draft: OrganizerApplicationDraft): OrganizerApplication {
  return { ...draft, id: 'orga_' + Date.now(), status: 'en revisión', createdAt: Date.now(), approvedAt: null };
}

export function newWithdrawalRequest(params: {
  userUid: string | null;
  userName: string;
  userEmail: string;
  amount: number;
  bank: string;
  clabe: string;
  holder: string;
}): WithdrawalRequest {
  const now = Date.now();
  return {
    id: 'wd_' + now,
    ...params,
    status: 'solicitado',
    createdAt: now,
    slaDeadline: now + WITHDRAWAL_SLA_MS,
    paidAt: null,
  };
}

// ---------- Local storage ----------
const ORG_APP_KEY = 'appswinguer_organizer_app';
const WALLET_KEY = 'appswinguer_wallet';
const WITHDRAWALS_KEY = 'appswinguer_withdrawals';

export function loadOrganizerApplication(): OrganizerApplication | null {
  try { return JSON.parse(localStorage.getItem(ORG_APP_KEY) || 'null'); } catch { return null; }
}

export function saveOrganizerApplication(app: OrganizerApplication): void {
  try { localStorage.setItem(ORG_APP_KEY, JSON.stringify(app)); } catch { /* ignore */ }
}

export function loadWallet(): WalletTransaction[] {
  try { return JSON.parse(localStorage.getItem(WALLET_KEY) || '[]'); } catch { return []; }
}

export function saveWallet(transactions: WalletTransaction[]): void {
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(transactions)); } catch { /* ignore */ }
}

export function loadWithdrawals(): WithdrawalRequest[] {
  try { return JSON.parse(localStorage.getItem(WITHDRAWALS_KEY) || '[]'); } catch { return []; }
}

export function saveWithdrawals(items: WithdrawalRequest[]): void {
  try { localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

export function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const merged = [...a];
  for (const item of b) {
    if (!merged.some(m => m.id === item.id)) merged.push(item);
  }
  return merged;
}

// ---------- Firestore remote sync (cross-device approval and accounting) ----------
export async function saveRemoteOrganizerApplication(app: OrganizerApplication): Promise<boolean> {
  try {
    await setDoc(doc(db, 'organizer_applications', app.id), app);
    return true;
  } catch { return false; }
}

export async function fetchRemoteOrganizerApplication(uid: string): Promise<OrganizerApplication | null> {
  if (!uid) return null;
  try {
    const q = query(collection(db, 'organizer_applications'), where('userUid', '==', uid));
    const snap = await getDocs(q);
    const items = snap.docs.map(d => d.data() as OrganizerApplication);
    if (items.length === 0) return null;
    return items.sort((a, b) => b.createdAt - a.createdAt)[0];
  } catch { return null; }
}

export async function fetchAllRemoteOrganizerApplications(): Promise<OrganizerApplication[]> {
  try {
    const snap = await getDocs(collection(db, 'organizer_applications'));
    return snap.docs.map(d => d.data() as OrganizerApplication);
  } catch { return []; }
}

export async function saveRemoteWalletTransaction(tx: WalletTransaction): Promise<boolean> {
  try {
    await setDoc(doc(db, 'wallet_transactions', tx.id), tx);
    return true;
  } catch { return false; }
}

export async function fetchRemoteWalletForUser(uid: string): Promise<WalletTransaction[]> {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'wallet_transactions'), where('userUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as WalletTransaction);
  } catch { return []; }
}

export async function fetchAllRemoteWalletTransactions(): Promise<WalletTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'wallet_transactions'));
    return snap.docs.map(d => d.data() as WalletTransaction);
  } catch { return []; }
}

export async function createRemoteWithdrawal(wd: WithdrawalRequest): Promise<boolean> {
  try {
    await setDoc(doc(db, 'withdrawal_requests', wd.id), wd);
    return true;
  } catch { return false; }
}

export async function fetchRemoteWithdrawalsForUser(uid: string): Promise<WithdrawalRequest[]> {
  if (!uid) return [];
  try {
    const q = query(collection(db, 'withdrawal_requests'), where('userUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as WithdrawalRequest);
  } catch { return []; }
}

export async function fetchAllRemoteWithdrawals(): Promise<WithdrawalRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'withdrawal_requests'));
    return snap.docs.map(d => d.data() as WithdrawalRequest);
  } catch { return []; }
}

export async function updateRemoteWithdrawal(wd: WithdrawalRequest): Promise<boolean> {
  try {
    await setDoc(doc(db, 'withdrawal_requests', wd.id), wd, { merge: true });
    return true;
  } catch { return false; }
}

// ---------- Legal INE archive ----------
// Identity documents (INE and selfie) are preserved for legal purposes and identity audits.
export const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('reader'));
    reader.readAsDataURL(file);
  });

export type IneRecordSource = 'organizador' | 'colaboracion' | 'registro';

export interface IneRecord {
  id: string;
  userUid: string | null;
  userEmail: string;
  alias: string;
  legalName: string;
  source: IneRecordSource;
  context: string; // event title or file reference
  ineFront: string; // dataURL
  ineBack: string;  // dataURL
  selfie: string;   // dataURL (empty when the flow does not require it)
  createdAt: number;
}

export function newIneRecord(params: {
  userUid: string | null;
  userEmail: string;
  alias: string;
  legalName: string;
  source: IneRecordSource;
  context: string;
  ineFront: string;
  ineBack: string;
  selfie: string;
}): IneRecord {
  return { id: 'ine_' + Date.now(), ...params, createdAt: Date.now() };
}

export async function saveRemoteIneRecord(record: IneRecord): Promise<boolean> {
  try {
    await setDoc(doc(db, 'ine_records', record.id), record);
    return true;
  } catch { return false; }
}

export async function fetchAllRemoteIneRecords(): Promise<IneRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'ine_records'));
    return snap.docs.map(d => d.data() as IneRecord);
  } catch { return []; }
}
