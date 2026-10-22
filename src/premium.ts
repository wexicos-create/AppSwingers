import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { AppRegion, ClubEvent, Profile, StatePass } from './types';

// ---------- Premium state search (travelers & tourists day pass) ----------
// The pass grants 24 hours of profile + event discovery in a chosen state,
// including the ability to match with people from that other state.

export const STATE_PASS_TTL_MS = 24 * 60 * 60 * 1000; // one day

export interface StateOption {
  code: string;
  name: string;
}

export const MX_STATES: StateOption[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'CMX', name: 'Ciudad de México' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

export const US_STATES: StateOption[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
];

export function statesForRegion(region: AppRegion): StateOption[] {
  return region === 'MX' ? MX_STATES : US_STATES;
}

export function stateNameByCode(code: string): string {
  return MX_STATES.find(s => s.code === code)?.name || US_STATES.find(s => s.code === code)?.name || code;
}

// ---------- Pass pricing ----------
// Admin rule (2026-10): México prices carry 16% IVA on top of the base price.
// USA prices follow the platform convention of roughly /10 of the MXN nominal
// value (e.g. a $350 MXN membership is sold at $35 USD) plus local sales tax.
// The US sales-tax rate is configurable below; several states charge 0%.

export interface StatePassPrice {
  base: number;
  tax: number;
  taxRate: number;
  taxLabel: string;
  total: number;
  currency: string;
}

export const US_SALES_TAX_PCT = 8; // adjustable estimate; several US states charge 0%

export function getStatePassPrice(region: AppRegion): StatePassPrice {
  if (region === 'MX') {
    const base = 300;
    const tax = Math.round(base * 0.16 * 100) / 100;
    return { base, tax, taxRate: 16, taxLabel: 'IVA 16%', total: Math.round((base + tax) * 100) / 100, currency: 'MXN' };
  }
  const base = 30;
  const tax = Math.round(base * (US_SALES_TAX_PCT / 100) * 100) / 100;
  return { base, tax, taxRate: US_SALES_TAX_PCT, taxLabel: 'impuestos locales aprox.', total: Math.round((base + tax) * 100) / 100, currency: 'USD' };
}

// ---------- Pass storage (state_passes/{uid}) ----------
// Only the admin writes passes (after approving the SPEI order); the owner
// reads their own. Users can never self-issue a pass.

export async function fetchStatePass(uid: string | null): Promise<StatePass | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'state_passes', uid));
    if (!snap.exists()) return null;
    const pass = snap.data() as StatePass;
    // An expired pass is equivalent to no pass; the UI shows the paywall again.
    return pass.expiresAt > Date.now() ? pass : null;
  } catch { return null; }
}

export async function activateStatePass(pass: StatePass): Promise<boolean> {
  try {
    await setDoc(doc(db, 'state_passes', pass.userUid), pass);
    return true;
  } catch { return false; }
}

export async function fetchAllStatePasses(): Promise<StatePass[]> {
  try {
    const snap = await getDocs(collection(db, 'state_passes'));
    return snap.docs.map(d => d.data() as StatePass).sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

// ---------- State resolution for discovery (demo data fallback) ----------
// Seed profiles and events predate the `state` field; until real users carry
// their own state, this mapping resolves the demo dataset so the state search
// is fully testable. Real profiles use Profile.state when present.

export const MOCK_PROFILE_STATES: Record<string, string> = {
  'p-emma': 'SLP', 'p1': 'SLP', 'p2': 'SLP', 'p3': 'SLP', 'p4': 'SLP',
  'p5': 'CMX', 'p6': 'CMX', 'p7': 'JAL', 'p8': 'GUA', 'p9': 'NLE',
  'p10': 'ROO', 'p11': 'PUE', 'p12': 'YUC', 'p13': 'CHH', 'p14': 'SIN',
  'p15': 'BCN', 'p16': 'MOR', 'p17': 'VER', 'p18': 'OAX', 'p19': 'MIC',
  'p20': 'QUE', 'p21': 'SON', 'p22': 'TAM', 'p23': 'COA', 'p24': 'AGU',
  'p25': 'COL', 'p26': 'DUR', 'p27': 'TAB', 'p28': 'TLA', 'p29': 'ZAC',
  'p30': 'HID', 'p31': 'BCS', 'p32': 'CHP', 'p33': 'CAM', 'p34': 'NAY',
};

const ZONE_STATE_HINTS: Array<{ hint: string; code: string }> = [
  { hint: 'CDMX', code: 'CMX' }, { hint: 'Polanco', code: 'CMX' }, { hint: 'Roma', code: 'CMX' }, { hint: 'Coyoacán', code: 'CMX' },
  { hint: 'Guadalajara', code: 'JAL' }, { hint: 'Zapopan', code: 'JAL' }, { hint: 'Puerto Vallarta', code: 'JAL' },
  { hint: 'Monterrey', code: 'NLE' }, { hint: 'San Luis', code: 'SLP' }, { hint: 'SLP', code: 'SLP' },
  { hint: 'Cancún', code: 'ROO' }, { hint: 'Playa del Carmen', code: 'ROO' }, { hint: 'Tulum', code: 'ROO' },
  { hint: 'Querétaro', code: 'QUE' }, { hint: 'Guanajuato', code: 'GUA' }, { hint: 'León', code: 'GUA' },
  { hint: 'Puebla', code: 'PUE' }, { hint: 'Mérida', code: 'YUC' }, { hint: 'Tijuana', code: 'BCN' },
  { hint: 'Cuernavaca', code: 'MOR' }, { hint: 'Veracruz', code: 'VER' }, { hint: 'Oaxaca', code: 'OAX' },
  { hint: 'Acapulco', code: 'GRO' }, { hint: 'Mazatlán', code: 'SIN' }, { hint: 'Hermosillo', code: 'SON' },
  { hint: 'Texas', code: 'TX' }, { hint: 'Houston', code: 'TX' }, { hint: 'Dallas', code: 'TX' },
  { hint: 'Miami', code: 'FL' }, { hint: 'California', code: 'CA' }, { hint: 'Los Angeles', code: 'CA' },
  { hint: 'Nevada', code: 'NV' }, { hint: 'Las Vegas', code: 'NV' }, { hint: 'New York', code: 'NY' },
];

export function profileState(profile: Profile): string | null {
  if (profile.state) return profile.state;
  const hint = profile.location || '';
  const byZone = ZONE_STATE_HINTS.find(z => hint.includes(z.hint));
  if (byZone) return byZone.code;
  return MOCK_PROFILE_STATES[profile.id] || null;
}

export function eventState(event: ClubEvent): string | null {
  const byZone = ZONE_STATE_HINTS.find(z => event.zone.includes(z.hint));
  return byZone ? byZone.code : null;
}

export function profilesInState(profiles: Profile[], stateCode: string): Profile[] {
  return profiles.filter(p => profileState(p) === stateCode);
}

export function eventsInState(events: ClubEvent[], stateCode: string): ClubEvent[] {
  return events.filter(e => eventState(e) === stateCode);
}
