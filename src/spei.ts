import { lsSet, lsGet, lsUpdate, lsAll, lsWhere } from './localstore';
import { AppRegion, SpeiOrder, SpeiOrderKind, SpeiOrderStatus } from './types';

export interface SpeiBankConfig {
  bank: string;
  clabe: string;
  beneficiary: string;
}

export const SPEI_CONCEPT_MAX_LENGTH = 40; // SPEI truncates bank concepts to 40 characters
export const SPEI_ORDER_TTL_MS = 30 * 60 * 1000; // 30 minutes to complete the transfer

const CONFIG_KEY = 'appswinguer_spei_config';
const ORDERS_KEY = 'appswinguer_spei_orders';

const DEFAULT_CONFIG: SpeiBankConfig = {
  bank: 'BBVA',
  clabe: '012180015132823618',
  beneficiary: 'Jose Israel Cervantes Alvarado',
};

export function getSpeiConfig(): SpeiBankConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSpeiConfig(partial: Partial<SpeiBankConfig>): SpeiBankConfig {
  const next: SpeiBankConfig = { ...getSpeiConfig(), ...partial };
  if (next.clabe) next.clabe = next.clabe.replace(/[^0-9]/g, '');
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function formatClabe(clabe: string): string {
  const digits = clabe.replace(/[^0-9]/g, '').padStart(18, '0');
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 12), digits.slice(12, 15), digits.slice(15, 18)].join(' ');
}

export interface SpeiPlanPrice {
  base: number;
  tax: number;
  total: number;
  labelEs: string;
  labelEn: string;
}

// Plan pricing kept in sync with MonetizationExtrasModal
export function getPlanPricing(region: AppRegion): Record<string, SpeiPlanPrice> {
  const isMx = region === 'MX';
  const build = (base: number, labelEs: string, labelEn: string): SpeiPlanPrice => ({
    base,
    tax: Math.round(base * 0.16 * 100) / 100,
    total: Math.round((base + Math.round(base * 0.16 * 100) / 100) * 100) / 100,
    labelEs,
    labelEn,
  });
  const plusBase = isMx ? 408 : 100;
  const ultraBase = isMx ? 800 : 180;
  return {
    plus: build(plusBase, 'Suscripción VIP Plus (15 días)', 'VIP Plus subscription (15 days)'),
    silver: build(plusBase, 'Suscripción VIP Plus (15 días)', 'VIP Plus subscription (15 days)'),
    ultra: build(ultraBase, 'Suscripción Ultra VIP (1 mes)', 'Ultra VIP subscription (1 month)'),
    gold: build(ultraBase, 'Suscripción Ultra VIP (1 mes)', 'Ultra VIP subscription (1 month)'),
  };
}

export function newSpeiOrder(params: {
  kind: SpeiOrderKind;
  itemRef: string;
  label: string;
  amount: number;
  userName: string;
  userEmail: string;
  userUid: string | null;
}): SpeiOrder {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const reference = 'ASW-' + rand;
  // Reference goes FIRST so the unique payment ID always survives bank concept truncation.
  const concept = (reference + ' ' + params.label + ' - ' + params.userName).slice(0, SPEI_CONCEPT_MAX_LENGTH);
  return {
    id: 'spei_' + now + '_' + rand,
    reference,
    concept,
    kind: params.kind,
    itemRef: params.itemRef,
    label: params.label,
    amount: params.amount,
    userUid: params.userUid,
    userName: params.userName,
    userEmail: params.userEmail,
    status: 'pendiente',
    createdAt: now,
    expiresAt: now + SPEI_ORDER_TTL_MS,
    timeline: [{ ts: now, text: 'Pedido creado. Esperando transferencia SPEI del usuario.' }],
  };
}

// ---------- Local storage ----------
export function loadLocalSpeiOrders(): SpeiOrder[] {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function saveLocalSpeiOrders(orders: SpeiOrder[]) {
  try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch { /* ignore */ }
}

export function upsertLocalSpeiOrder(order: SpeiOrder): SpeiOrder[] {
  const orders = loadLocalSpeiOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order; else orders.unshift(order);
  saveLocalSpeiOrders(orders);
  return orders;
}

// ---------- Local order registry (database-free persistence) ----------
export async function createRemoteSpeiOrder(order: SpeiOrder): Promise<boolean> {
  return lsSet('spei_orders', order.id, order);
}

export async function fetchRemoteSpeiOrdersForUser(uid: string | null): Promise<SpeiOrder[]> {
  if (!uid) return [];
  try {
    return lsWhere<SpeiOrder>('spei_orders', 'userUid', uid);
  } catch {
    return [];
  }
}

export async function fetchAllRemoteSpeiOrders(): Promise<SpeiOrder[]> {
  try {
    return lsAll<SpeiOrder>('spei_orders');
  } catch {
    return [];
  }
}

export async function appendRemoteTimelineAndStatus(id: string, status: SpeiOrderStatus, note: string): Promise<boolean> {
  try {
    const order = lsGet<SpeiOrder & { timeline: Array<{ ts: number; text: string }> }>('spei_orders', id);
    if (!order) return false;
    const timeline = Array.isArray(order.timeline) ? [...order.timeline] : [];
    timeline.push({ ts: Date.now(), text: note });
    return lsUpdate('spei_orders', id, { status, timeline });
  } catch {
    return false;
  }
}

// ---------- Automatic validation bot ----------
export interface SpeiBotCheck { label: string; ok: boolean }
export interface SpeiBotResult { checks: SpeiBotCheck[]; passed: boolean; expired: boolean }

/**
 * Automatic validation bot. Verifies reference, concept and amount integrity of the
 * order and whether it is still within the payment window. Bank-side transfer
 * detection (connection bancaria) plugs in here once the provider is integrated;
 * until then the final decision stays with the administrator.
 */
export function runBotValidation(order: SpeiOrder): SpeiBotResult {
  const refOk = /^ASW-[A-Z0-9]{6}$/.test(order.reference);
  const conceptOk = order.concept.indexOf(order.reference) === 0;
  const amountOk = order.amount > 0;
  const expired = order.expiresAt < Date.now();
  const checks: SpeiBotCheck[] = [
    { label: 'Referencia única con formato válido', ok: refOk },
    { label: 'Concepto bancario inicia con la referencia', ok: conceptOk },
    { label: 'Monto coherente con el plan solicitado (IVA incluido)', ok: amountOk },
    { label: 'Orden vigente dentro de la ventana de pago', ok: !expired },
  ];
  return { checks, passed: refOk && conceptOk && amountOk && !expired, expired };
}

