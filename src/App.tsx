// ============================================================================
// AppSwinguer Ultra Plus — reconstrucción desde cero.
// Diseño de referencia: paleta y sistema visual originales (sin alterar color).
// Cero datos de relleno: todos los perfiles, eventos, pases y pagos provienen
// exclusivamente de usuarios reales registrados en la base de datos.
// Flujos comerciales: registro + onboarding, validación INE, pagos SPEI,
// matches y chat, eventos con pases VIP, y Panel Admin de alto nivel.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, X, Star, Bell, ShieldCheck, ChevronLeft, Copy, Check, LogOut,
  Camera, ImagePlus, Users, CalendarDays, CreditCard, BadgeCheck, Ban, Plus, Sparkles,
  Banknote, Ticket, Send, Loader2, AlertTriangle, Trash2, Clock, Crown,
  RefreshCw, Eye, MessageCircle, Upload, UserCheck, UserX, FileCheck2, Lock,
  EyeOff, Pencil, Gift, Coins, Video,
} from 'lucide-react';
import {
  auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
  googleProvider, signOut, onAuthStateChanged, User,
} from './supabase';
import { docAll, docGet, docSet, docUpdate, docQuery, docDelete } from './store';
import { AppNotification, SpeiOrder } from './types';
import {
  SpeiBankConfig, getSpeiConfig, saveSpeiConfig, fetchRemoteSpeiConfig, saveRemoteSpeiConfig,
  formatClabe, getPlanPricing, newSpeiOrder, createRemoteSpeiOrder, fetchRemoteSpeiOrdersForUser,
  fetchAllRemoteSpeiOrders, appendRemoteTimelineAndStatus, runBotValidation,
} from './spei';
import {
  compressImage, IneRecord, newIneRecord, saveRemoteIneRecord, fetchAllRemoteIneRecords,
  issueIdentityVerdict, ineRecordVerdict, fetchNotificationsForUser, markNotificationsRead,
  purgeExpiredRetainedRecords,
} from './ine';
import { analyzeReport, scanProfile, auditProcesses, ModerationReport } from './moderation';

// ---------------------------- Constantes ------------------------------------

const ADMIN_EMAILS = ['jocervantesa@gmail.com', 'betylanz0613@gmail.com'];
const KINDS = ['Pareja', 'Dama', 'Caballero'];
const INTERESTS = [
  'Parejas liberales', 'Full swap', 'Soft swap', 'Tríos', 'GangBang', 'BDSM',
  'Voyeurismo', 'Exhibicionismo', 'Fiestas privadas', 'Viajes eróticos',
  'Discreción total', 'Amigos con derechos',
];
const SEEKING = ['Parejas', 'Damas', 'Caballeros', 'Todos'];
const AGE_PREFS = ['18-25', '26-35', '36-45', '46+'];
const FREE_DAILY_LIKES = 10;
const IVA = 0.16;
// Comisión de la plataforma sobre las ganancias de creadoras (15%).
const CREATOR_COMMISSION = 0.15;
// Retención de ISR que la plataforma efectúa por defecto a creadoras (1%).
const ISR_RATE = 0.01;
// Umbral para la insignia azul de calificación: 5 o más calificaciones con promedio >= 4.5.
const RATING_BADGE_MIN = 5;
const RATING_BADGE_AVG = 4.5;
// Planes de membresía de creadora (alternativa sin comisión por venta).
// El equivalente en dólares usa la conversión indicada para la comunidad en EE. UU.
const CREATOR_PLANS: Array<{ id: string; name: string; price: number; cap: string; usd: number }> = [
  { id: 'cm_inicial', name: 'Creadora Inicial', price: 2000, cap: 'Hasta $50,000 MXN de entradas al mes', usd: 100 },
  { id: 'cm_pro', name: 'Creadora Pro', price: 4500, cap: 'Hasta $100,000 MXN de entradas al mes', usd: 225 },
  { id: 'cm_elite', name: 'Creadora Élite', price: 7000, cap: 'Hasta $150,000 MXN de entradas al mes', usd: 350 },
  { id: 'cm_master', name: 'Creadora Máster', price: 10000, cap: 'Hasta $200,000 MXN de entradas al mes', usd: 500 },
  { id: 'cm_ultra', name: 'Creadora Ultra', price: 15000, cap: 'Entradas superiores a $200,000 MXN al mes', usd: 750 },
];
// Límites de contenido por creadora.
const CREATOR_FREE_POSTS = 3;
const CREATOR_PREMIUM_POSTS = 10;
const CREATOR_ULTRA_POSTS = 10;
const CREATOR_VIDEO_MAX_BYTES = 8 * 1024 * 1024;
const ivaTotal = (base: number) => Math.round(base * (1 + IVA) * 100) / 100;

// ---------------------------- Tipos -----------------------------------------

type Tab = 'match' | 'propuestas' | 'eventos' | 'virtual' | 'perfil';

interface UserDoc {
  uid: string;
  email: string;
  alias: string;
  kind: string;
  age: number;
  bio: string;
  avatar: string | null;
  photos: string[];
  interests: string[];
  seeking: string[];
  agesPref: string[];
  km: number;
  region: string;
  identityStatus: string;
  identityNote?: string;
  premium: 'free' | 'plus' | 'ultra';
  premiumUntil: number | null;
  status: 'activo' | 'suspendido';
  onboardingDone: boolean;
  badge?: 'oro' | 'verificada';
  createdAt: number;
  lastSeen: number;
}

interface EventDoc {
  id: string;
  title: string;
  theme: string;
  date: string;
  time: string;
  zone: string;
  organizer: string;
  price: number;
  cap: number;
  sold: number;
  published: boolean;
  hue: number;
  reqs: string[];
}

interface PassDoc {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventZone: string;
  userUid: string;
  userName: string;
  amount: number;
  orderRef: string;
  status: string;
  createdAt: number;
}

interface ChatMsg { id: string; uid: string; t: string; ts: number }

interface MatchEntry {
  id: string;
  users: string[];
  createdAt: number;
  lastMessage?: string;
  lastTs?: number;
  status?: 'activo' | 'cerrado';
  closedAt?: number;
  closedBy?: string;
  hiddenFor?: string[];
}

interface SwipeDoc { id: string; from: string; to: string; action: string; ts: number }

interface ProposalDoc {
  id: string;
  authorUid: string;
  authorAlias: string;
  cat: string;
  title: string;
  body: string;
  rules: string;
  status: 'revision' | 'publicada' | 'rechazada';
  applies: string[];
  createdAt: number;
}

interface CreatorDoc {
  id: string;
  userUid: string;
  name: string;
  handle: string;
  bio: string;
  price: number;
  status: 'pendiente' | 'activa' | 'rechazada';
  createdAt: number;
  membershipPlan?: string | null;
  membershipUntil?: number | null;
  isrAssumed?: boolean;
  isrSignedAt?: number | null;
  signature?: string | null;
  earnings?: number;
}

interface CreatorPostDoc {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  image: string;
  caption: string;
  tier?: 'gratis' | 'premium' | 'ultra';
  kind?: 'foto' | 'video';
  premium?: boolean;
  price: number;
  status: 'revision' | 'publicado' | 'rechazado';
  createdAt: number;
}

interface CreatorSubDoc {
  id: string;
  userUid: string;
  creatorId: string;
  until: number;
  createdAt: number;
}

interface ForumDoc {
  id: string;
  userUid: string;
  userName: string;
  question: string;
  answer: string | null;
  status: 'abierta' | 'respondida';
  createdAt: number;
  answeredAt: number | null;
}

interface TicketDoc {
  id: string;
  userUid: string;
  userName: string;
  userEmail: string;
  requester: string;
  subject: string;
  message: string;
  status: string;
  createdAt: number;
}

interface RatingDoc {
  id: string;
  chatId: string;
  raterUid: string;
  raterAlias: string;
  ratedUid: string;
  stars: number;
  comment: string;
  createdAt: number;
}

interface UnlockDoc {
  id: string;
  userUid: string;
  postId: string;
  createdAt: number;
}

// ---------------------------- Utilerías -------------------------------------

const money = (n: number) => '$' + n.toFixed(2) + ' MXN';
const hueFrom = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const chatIdFor = (a: string, b: string) => 'c_' + [a, b].sort().join('_');
const matchIdFor = (a: string, b: string) => 'm_' + [a, b].sort().join('_');
const ago = (ts: number) => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return Math.floor(s / 60) + ' min';
  if (s < 86400) return Math.floor(s / 3600) + ' h';
  return Math.floor(s / 86400) + ' d';
};
const vipCode = () => 'VIP ' + Array.from({ length: 3 }, () => String(Math.floor(1000 + Math.random() * 9000))).join(' ');
const notifId = (uid: string) => 'nt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + '_' + uid;
const isVip = (u: UserDoc | null) => !!u?.premiumUntil && u.premiumUntil > Date.now();
const vipLabel = (u: UserDoc | null) => (isVip(u) ? (u?.premium === 'ultra' ? 'Ultra VIP' : 'VIP Plus') : 'Free');
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------- Componentes de UI ------------------------------

function Portrait({ hue, blur }: { hue: number; blur?: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, hsl(${hue} 40% 20%), hsl(${(hue + 30) % 360} 50% 6%))` }}>
      <div style={{ position: 'absolute', width: 220, height: 260, left: 40, top: 70, borderRadius: '50%', background: `hsl(${hue} 80% 60%)`, opacity: 0.45, filter: `blur(${blur ? 44 : 30}px)` }} />
      <div style={{ position: 'absolute', width: 160, height: 180, right: 10, top: 150, borderRadius: '50%', background: `hsl(${(hue + 25) % 360} 70% 45%)`, opacity: 0.5, filter: `blur(${blur ? 44 : 32}px)` }} />
      <div style={{ position: 'absolute', width: 110, height: 110, left: 110, top: 40, borderRadius: '50%', background: '#f1dcff', opacity: 0.25, filter: 'blur(26px)' }} />
    </div>
  );
}

function Avatar({ doc, size }: { doc: { avatar?: string | null; alias?: string }; size: number }) {
  return doc.avatar ? (
    <img src={doc.avatar} alt="Perfil" style={{ width: size, height: size, borderRadius: 999, objectFit: 'cover' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 999, background: 'var(--s3)', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
      <span className="caps" style={{ fontSize: size * 0.42, color: 'var(--lila)' }}>{(doc.alias || '?').slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

function FileButton(props: {
  accept?: string;
  capture?: boolean;
  onFiles: (f: File) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button type="button" className={props.className ?? 'btn btn-dark btn-sm'} style={props.style} onClick={() => ref.current?.click()}>
      {props.children ?? <Upload size={16} />}
      <input
        ref={ref}
        type="file"
        hidden
        accept={props.accept ?? 'image/*'}
        capture={props.capture ? 'environment' : undefined}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onFiles(f);
          e.currentTarget.value = '';
        }}
      />
    </button>
  );
}

function CopyRow({ label, value, onToast }: { label: string; value: string; onToast: (s: string) => void }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="row between" style={{ padding: '10px 14px', background: 'var(--s3)', borderRadius: 14, boxShadow: 'inset 0 0 0 1px var(--line)' }}>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="tiny" style={{ display: 'block' }}>{label}</span>
        <span className="ui" style={{ fontWeight: 700, fontSize: 15, wordBreak: 'break-all' }}>{value}</span>
      </span>
      <button
        className="iconbtn"
        style={{ width: 38, height: 38 }}
        aria-label={'Copiar ' + label}
        onClick={async () => {
          const done = await copyText(value);
          if (done) { setOk(true); onToast('Copiado al portapapeles.'); setTimeout(() => setOk(false), 1500); }
        }}
      >
        {ok ? <Check size={16} color="var(--ok)" /> : <Copy size={16} color="var(--lila)" />}
      </button>
    </div>
  );
}

function Steps({ n, total }: { n: number; total: number }) {
  return (
    <div className="row" style={{ gap: 6, marginTop: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ height: 4, borderRadius: 2, flex: 1, background: i <= n ? 'var(--lila)' : 'var(--s3)', boxShadow: i === n ? 'var(--glow)' : 'none', transition: 'width .3s' }} />
      ))}
    </div>
  );
}

function Toggle({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button className="row between full" style={{ padding: '8px 0', textAlign: 'left' }} onClick={onClick}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block' }}>{label}</span>
        {hint && <span className="tiny">{hint}</span>}
      </span>
      <span style={{
        flex: 'none', width: 46, height: 26, borderRadius: 13, background: on ? 'var(--lila)' : 'var(--s3)',
        boxShadow: on ? 'var(--glow)' : 'inset 0 0 0 1px var(--line)', position: 'relative', transition: 'background .2s',
      }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, background: on ? '#12051f' : 'var(--muted)', transition: 'left .2s' }} />
      </span>
    </button>
  );
}

function IdentityTag({ status }: { status: string }) {
  if (status === 'aprobada' || status === 'verificado') return <span className="tag ok"><BadgeCheck size={12} /> Verificada</span>;
  if (status === 'en revisión') return <span className="tag warn"><Clock size={12} /> En revisión</span>;
  if (status === 'rechazada') return <span className="tag bad"><AlertTriangle size={12} /> Rechazada</span>;
  if (status === 'baneada') return <span className="tag bad"><Ban size={12} /> Suspendida</span>;
  return <span className="tag"><ShieldCheck size={12} /> Sin validar</span>;
}

function StatusTagOrder({ status }: { status: string }) {
  if (status === 'aprobado') return <span className="tag ok"><BadgeCheck size={12} /> Aprobado</span>;
  if (status === 'verificado') return <span className="tag warn"><Clock size={12} /> Por confirmar</span>;
  if (status === 'rechazado') return <span className="tag bad"><X size={12} /> Rechazado</span>;
  if (status === 'expirado') return <span className="tag">Expirado</span>;
  return <span className="tag warn"><Clock size={12} /> Pendiente</span>;
}

/** Precio + IVA (rosa neón) + total, sin ecuaciones confusas. */
function PriceIva({ base, total, size = 24, align = 'right' }: { base: number; total?: number; size?: number; align?: 'left' | 'right' | 'center' }) {
  return (
    <div style={{ textAlign: align, lineHeight: 1.15 }}>
      <div className="caps" style={{ fontSize: size - 7, color: 'var(--soft)' }}>${base.toLocaleString('es-MX')}</div>
      <div
        className="tiny"
        style={{ color: 'var(--lila)', textShadow: 'var(--glow)', letterSpacing: '.22em', fontWeight: 800, margin: '2px 0' }}
      >
        + IVA
      </div>
      <div className="caps" style={{ fontSize: size, textShadow: 'var(--glow)' }}>${(total ?? ivaTotal(base)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
    </div>
  );
}

/** Calificación promedio en estrellas (1 a 5). */
function Stars({ avg, count, size = 14 }: { avg: number; count: number; size?: number }) {
  if (count === 0) return null;
  return (
    <span className="row" style={{ gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={n <= Math.round(avg) ? 'var(--lila)' : 'var(--muted)'}
          fill={n <= Math.round(avg) ? 'currentColor' : 'none'}
          style={{ filter: n <= Math.round(avg) ? 'drop-shadow(0 0 5px rgba(199,125,255,.8))' : undefined }}
        />
      ))}
      <span className="tiny" style={{ marginLeft: 2 }}>{avg.toFixed(1)} · {count}</span>
    </span>
  );
}

/** Insignia azul de miembro altamente calificado (5 o más calificaciones sobresalientes). */
function RatingBadge({ avg, count }: { avg: number; count: number }) {
  if (count < RATING_BADGE_MIN || avg < RATING_BADGE_AVG) return null;
  return (
    <span
      className="tag"
      style={{ color: '#7cc4ff', boxShadow: 'inset 0 0 0 1px rgba(124,196,255,.55), 0 0 12px rgba(61,148,255,.35)', display: 'inline-flex', gap: 4, alignItems: 'center' }}
    >
      <BadgeCheck size={12} /> Calificado 5 estrellas
    </span>
  );
}

/** Insignia rosa de creadora de contenido verificada. */
function CreatorBadge() {
  return (
    <span
      className="tag"
      style={{ color: 'var(--lila)', boxShadow: 'inset 0 0 0 1px rgba(212,156,255,.55), var(--glow)', display: 'inline-flex', gap: 4, alignItems: 'center' }}
    >
      <Sparkles size={12} /> Creadora verificada
    </span>
  );
}

/** Lienzo de firma digital con lápiz (dibujo con el dedo o el mouse). */
function SignaturePad({ onSignature }: { onSignature: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    const l = last.current ?? p;
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    dirty.current = true;
  };
  const end = () => {
    drawing.current = false;
    const c = ref.current;
    if (c && dirty.current) onSignature(c.toDataURL('image/png'));
  };
  const clear = () => {
    const c = ref.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onSignature(null);
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <canvas
        ref={ref}
        width={640}
        height={200}
        style={{ width: '100%', height: 130, borderRadius: 12, background: '#0b0612', boxShadow: 'inset 0 0 0 1px var(--line)', touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="row between">
        <span className="tiny">Firma con el dedo o el mouse dentro del recuadro.</span>
        <button className="btn btn-ghost btn-sm" onClick={clear}><Trash2 size={14} /> Borrar firma</button>
      </div>
    </div>
  );
}

// ---------------------------- Pantalla de acceso -----------------------------

function AuthScreen({ onToast }: { onToast: (s: string) => void }) {
  const [mode, setMode] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const friendly = (code: string, raw: string) => {
    if (code === 'auth/email-already-in-use') return 'Ese correo ya está registrado. Inicia sesión.';
    if (code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
    if (code === 'auth/wrong-password') return 'Correo o contraseña incorrectos.';
    if (code === 'auth/invalid-email') return 'Correo inválido.';
    if (code === 'auth/user-not-found') return 'Cuenta no encontrada.';
    if (code === 'auth/email-not-confirmed') return 'Confirma tu correo antes de continuar.';
    return raw || 'No fue posible completar la operación.';
  };

  const submit = async () => {
    setErr(null);
    if (!email.trim() || !pass) { setErr('Completa todos los campos.'); return; }
    if (mode === 'registro' && pass !== confirm) { setErr('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      if (mode === 'registro') {
        await createUserWithEmailAndPassword(auth, email.trim(), pass);
        onToast('Cuenta creada. Completa tu perfil para entrar.');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), pass);
        onToast('Sesión iniciada.');
      }
    } catch (e: any) {
      setErr(friendly(e?.code ?? '', e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="aura" />
      <div className="topbar">
        <span className="wordmark">App<b>Swinguer</b></span>
        <span className="tag"><Sparkles size={12} /> Ultra Plus</span>
      </div>
      <div className="body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="h1" style={{ fontSize: 38 }}>{mode === 'login' ? 'Vuelve al' : 'Crea tu'}</div>
        <div className="h1" style={{ fontSize: 38, marginBottom: 8 }}>{mode === 'login' ? 'club' : 'cuenta'}</div>
        <p className="sub">Conexiones exclusivas para parejas liberales y solteros verificados. Solo adultos, solo reales.</p>
        <div className="stack" style={{ gap: 10 }}>
          <input className="field" placeholder="Correo" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" placeholder="Contraseña" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} />
          {mode === 'registro' && (
            <input className="field" placeholder="Confirmar contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          )}
          {err && (
            <div className="row" style={{ gap: 8, color: 'var(--bad)', fontSize: 15 }}>
              <AlertTriangle size={16} /> {err}
            </div>
          )}
          <button className="btn btn-neon full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={18} className="spin" /> : mode === 'login' ? <Lock size={18} /> : <Plus size={18} />}
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
          <button className="btn btn-ghost full" onClick={() => { setMode(mode === 'login' ? 'registro' : 'login'); setErr(null); }}>
            {mode === 'login' ? 'No tengo cuenta. Registrarme' : 'Ya tengo cuenta. Iniciar sesión'}
          </button>
        </div>
        <p className="tiny" style={{ textAlign: 'center', marginTop: 18 }}>
          Al continuar confirmas ser mayor de 18 años y aceptas nuestras normas de consentimiento y discreción.
        </p>
      </div>
    </div>
  );
}

// ---------------------------- Captura INE ------------------------------------

function IneCapture({ uid, email, alias, onToast, onDone }: {
  uid: string; email: string; alias: string; onToast: (s: string) => void; onDone: () => void;
}) {
  const [legalName, setLegalName] = useState('');
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grab = async (file: File, which: 'front' | 'back' | 'selfie') => {
    try {
      const data = await compressImage(file);
      if (which === 'front') setFront(data); else if (which === 'back') setBack(data); else setSelfie(data);
    } catch {
      onToast('No fue posible procesar la imagen.');
    }
  };

  const submit = async () => {
    if (!legalName.trim() || !front || !back || !selfie) {
      onToast('Completa los tres documentos y tu nombre legal.');
      return;
    }
    setBusy(true);
    const rec = newIneRecord({
      userUid: uid, userEmail: email, alias, legalName: legalName.trim(),
      source: 'registro', context: 'Validación de identidad de registro',
      ineFront: front, ineBack: back, selfie,
    });
    const saved = await saveRemoteIneRecord(rec);
    if (!saved) {
      setBusy(false);
      onToast('No fue posible subir el expediente. Intenta de nuevo.');
      return;
    }
    await docUpdate('users', uid, { identityStatus: 'en revisión' });
    setBusy(false);
    onToast('INE enviado. Administración validará tu identidad.');
    onDone();
  };

  const Thumb = ({ src, onClear }: { src: string | null; onClear: () => void }) => src ? (
    <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
      <img src={src} alt="Documento" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <button className="iconbtn" style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32 }} aria-label="Quitar" onClick={onClear}>
        <X size={14} />
      </button>
    </div>
  ) : (
    <div style={{ aspectRatio: '3/4', borderRadius: 14, background: 'var(--s2)', boxShadow: 'inset 0 0 0 1.5px var(--line)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <span className="tiny">Sin foto</span>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 12 }}>
      <input className="field" placeholder="Nombre legal como aparece en tu INE" value={legalName} onChange={(e) => setLegalName(e.target.value.slice(0, 80))} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <Thumb src={front} onClear={() => setFront(null)} />
        <Thumb src={back} onClear={() => setBack(null)} />
        <Thumb src={selfie} onClear={() => setSelfie(null)} />
      </div>
      <div className="grid2">
        <FileButton onFiles={(f) => grab(f, 'front')}><Camera size={16} /> INE frente</FileButton>
        <FileButton onFiles={(f) => grab(f, 'back')}><Camera size={16} /> INE reverso</FileButton>
      </div>
      <FileButton className="btn btn-dark btn-sm full" onFiles={(f) => grab(f, 'selfie')} capture><Camera size={16} /> Selfie con tu INE</FileButton>
      <p className="tiny">Tus documentos se guardan cifrados en el archivo legal de la plataforma y solo los revisa administración. Aprobada tu identidad, tu perfil obtiene el sello de verificación.</p>
      <button className="btn btn-neon full" onClick={submit} disabled={busy}>
        {busy ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />} Enviar a validación
      </button>
    </div>
  );
}

// ---------------------------- Onboarding -------------------------------------

function Onboarding({ user, seed, onFinish, onToast }: {
  user: User; seed: Partial<UserDoc> | null;
  onFinish: (doc: UserDoc) => Promise<void>;
  onToast: (s: string) => void;
}) {
  const steps = ['cuenta', 'gustos', 'ine', 'permiso'];
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Partial<UserDoc>>({
    alias: '', kind: 'Pareja', age: 30, bio: '', avatar: null, photos: [],
    interests: [], seeking: [], agesPref: [], km: 50, region: 'MX',
    ...seed,
  });
  const upd = (p: Partial<UserDoc>) => setDraft((d) => ({ ...d, ...p }));

  const grabPhoto = async (file: File, which: 'avatar' | 'gallery') => {
    try {
      const data = await compressImage(file);
      if (which === 'avatar') upd({ avatar: data });
      else upd({ photos: [...(draft.photos ?? []), data].slice(0, 9) });
    } catch { onToast('No fue posible procesar la imagen.'); }
  };

  const finish = async () => {
    setBusy(true);
    const doc: UserDoc = {
      uid: user.uid, email: user.email, alias: (draft.alias || '').trim() || 'Anónimo',
      kind: draft.kind ?? 'Pareja', age: Number(draft.age) || 30, bio: draft.bio ?? '',
      avatar: draft.avatar ?? null, photos: draft.photos ?? [], interests: draft.interests ?? [],
      seeking: draft.seeking ?? [], agesPref: draft.agesPref ?? [], km: draft.km ?? 50, region: 'MX',
      identityStatus: draft.identityStatus ?? seed?.identityStatus ?? 'sin iniciar', premium: 'free', premiumUntil: null,
      status: 'activo', onboardingDone: true, badge: undefined,
      createdAt: seed?.createdAt ?? Date.now(), lastSeen: Date.now(),
    };
    await onFinish(doc);
    setBusy(false);
  };

  return (
    <div className="screen">
      <div className="aura" />
      <div className="topbar">
        <button className="iconbtn" aria-label="Atrás" onClick={() => setStep(Math.max(0, step - 1))} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          <ChevronLeft size={20} />
        </button>
        <span className="wordmark">App<b>Swinguer</b></span>
        <span className="tag">{step + 1}/{steps.length}</span>
      </div>
      <div className="body" style={{ display: 'flex', flexDirection: 'column' }}>
        <Steps n={step} total={steps.length} />
        {steps[step] === 'cuenta' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h2 className="h1">Tu perfil</h2>
            <p className="sub">Así te verá la comunidad. Nada de relleno: solo tú.</p>
            <div className="row" style={{ gap: 14, marginBottom: 6 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 84, height: 84, borderRadius: 28, overflow: 'hidden', background: 'var(--s3)', boxShadow: 'var(--glow)' }}>
                  {draft.avatar ? <img src={draft.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Camera size={28} color="var(--lila)" /></div>}
                </div>
              </div>
              <div className="grid2" style={{ flex: 1 }}>
                <FileButton onFiles={(f) => grabPhoto(f, 'avatar')}><Camera size={16} /> Cámara</FileButton>
                <FileButton onFiles={(f) => grabPhoto(f, 'avatar')}><ImagePlus size={16} /> Galería</FileButton>
              </div>
            </div>
            <input className="field" placeholder="Alias artístico" value={draft.alias ?? ''} onChange={(e) => upd({ alias: e.target.value.slice(0, 24) })} />
            <div className="label" style={{ margin: '16px 0 8px' }}>Quiénes son</div>
            <div className="chips">
              {KINDS.map((k) => (
                <button key={k} className={'chip' + (draft.kind === k ? ' sel' : '')} onClick={() => upd({ kind: k })}>{k}</button>
              ))}
            </div>
            <div className="label" style={{ margin: '16px 0 8px' }}>Edad (18+)</div>
            <input className="field" inputMode="numeric" value={draft.age ?? ''} onChange={(e) => upd({ age: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) })} />
            <textarea className="field" placeholder="Preséntate en pocas líneas…" value={draft.bio ?? ''} onChange={(e) => upd({ bio: e.target.value.slice(0, 300) })} />
            <button className="btn btn-neon full" style={{ marginTop: 'auto' }} onClick={() => setStep(1)} disabled={!draft.alias?.trim() || Number(draft.age) < 18}>
              Continuar
            </button>
          </div>
        )}
        {steps[step] === 'gustos' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h2 className="h1">Gustos pasionales</h2>
            <p className="sub">Lo que te prende. Elige al menos dos.</p>
            <div className="chips">
              {INTERESTS.map((i) => (
                <button key={i} className={'chip' + ((draft.interests ?? []).includes(i) ? ' sel' : '')}
                  onClick={() => upd({ interests: (draft.interests ?? []).includes(i) ? (draft.interests ?? []).filter((x) => x !== i) : [...(draft.interests ?? []), i] })}>
                  {i}
                </button>
              ))}
            </div>
            <div className="label" style={{ margin: '18px 0 8px' }}>Busco</div>
            <div className="chips">
              {SEEKING.map((s) => (
                <button key={s} className={'chip' + ((draft.seeking ?? []).includes(s) ? ' sel' : '')}
                  onClick={() => upd({ seeking: (draft.seeking ?? []).includes(s) ? (draft.seeking ?? []).filter((x) => x !== s) : [...(draft.seeking ?? []), s] })}>
                  {s}
                </button>
              ))}
            </div>
            <div className="label" style={{ margin: '18px 0 8px' }}>Edad que prefieres</div>
            <div className="chips">
              {AGE_PREFS.map((a) => (
                <button key={a} className={'chip' + ((draft.agesPref ?? []).includes(a) ? ' sel' : '')}
                  onClick={() => upd({ agesPref: (draft.agesPref ?? []).includes(a) ? (draft.agesPref ?? []).filter((x) => x !== a) : [...(draft.agesPref ?? []), a] })}>
                  {a}
                </button>
              ))}
            </div>
            <div className="card" style={{ marginTop: 18 }}>
              <div className="row between">
                <span className="label">Radio de búsqueda</span>
                <span className="caps" style={{ fontSize: 24 }}>{draft.km} km</span>
              </div>
              <input type="range" min={1} max={200} value={draft.km ?? 50} onChange={(e) => upd({ km: Number(e.target.value) })} aria-label="Radio en km" style={{ width: '100%', accentColor: 'var(--lila)' }} />
            </div>
            <button className="btn btn-neon full" style={{ marginTop: 'auto' }} onClick={() => setStep(2)} disabled={(draft.interests ?? []).length < 2}>
              Continuar
            </button>
          </div>
        )}
        {steps[step] === 'ine' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h2 className="h1">Validación INE</h2>
            <p className="sub">Tu identidad real, resguardada. Obligatoria: sin INE aprobada no se accede a la plataforma.</p>
            <IneCapture
              uid={user.uid} email={user.email} alias={draft.alias ?? ''} onToast={onToast}
              onDone={() => { upd({ identityStatus: 'en revisión' }); setStep(3); }}
            />
            <button className="btn btn-ghost full" style={{ marginTop: 12 }} onClick={() => setStep(3)}>
              Validar más tarde
            </button>
          </div>
        )}
        {steps[step] === 'permiso' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <h2 className="h1">Permisos</h2>
            <p className="sub">Actívalos para no perderte matches, pases y avisos de pago.</p>
            <div className="card">
              <Toggle
                on={typeof Notification !== 'undefined' && Notification.permission === 'granted'}
                label="Notificaciones"
                hint="Matches, validación INE y aprobación de pagos"
                onClick={async () => {
                  if (typeof Notification === 'undefined') return;
                  if (Notification.permission === 'granted') return;
                  await Notification.requestPermission();
                }}
              />
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <ShieldCheck size={20} color="var(--lila)" />
                <span className="small">Solo adultos. Consentimiento explícito. Tolerancia cero a contenido sin permiso.</span>
              </div>
            </div>
            <button className="btn btn-neon full" style={{ marginTop: 'auto' }} onClick={finish} disabled={busy}>
              {busy ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />} Entrar a la comunidad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// APP RAÍZ
// ============================================================================

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'carga' | 'auth' | 'onboarding' | 'verificacion' | 'app'>('carga');
  const [tab, setTab] = useState<Tab>('match');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [allUsers, setAllUsers] = useState<UserDoc[]>([]);
  const [mySwipes, setMySwipes] = useState<SwipeDoc[]>([]);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [orders, setOrders] = useState<SpeiOrder[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [passes, setPasses] = useState<PassDoc[]>([]);
  const [bankCfg, setBankCfg] = useState<SpeiBankConfig>(getSpeiConfig());
  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [creators, setCreators] = useState<CreatorDoc[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPostDoc[]>([]);
  const [myCreatorSubs, setMyCreatorSubs] = useState<CreatorSubDoc[]>([]);
  const [forum, setForum] = useState<ForumDoc[]>([]);
  const [ratings, setRatings] = useState<RatingDoc[]>([]);
  const [myUnlocks, setMyUnlocks] = useState<UnlockDoc[]>([]);

  const [orderSheet, setOrderSheet] = useState<SpeiOrder | null>(null);
  const [eventSheet, setEventSheet] = useState<EventDoc | null>(null);
  const [sheet, setSheet] = useState<null | 'avisos' | 'ine' | 'editar' | 'reportar' | 'propuesta' | 'donacion' | 'contenido' | 'oficio'>(null);
  const [chatWith, setChatWith] = useState<UserDoc | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [matchPopup, setMatchPopup] = useState<UserDoc | null>(null);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [foroOpen, setForoOpen] = useState(false);
  const [foroDraft, setForoDraft] = useState('');
  const [donationTarget, setDonationTarget] = useState<CreatorDoc | null>(null);
  const [contentTarget, setContentTarget] = useState<{ post: CreatorPostDoc; creator: CreatorDoc } | null>(null);
  const [explicitView, setExplicitView] = useState<{ image: string; caption: string; kind: string } | null>(null);
  const [explicitConfirm, setExplicitConfirm] = useState(false);
  const [rateModal, setRateModal] = useState<{ peer: UserDoc; chatId: string } | null>(null);
  const [dismissedRatings, setDismissedRatings] = useState<string[]>([]);
  const [oficioBusy, setOficioBusy] = useState(false);

  const isAdmin = useMemo(() => !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()), [user]);
  const myDoc = useMemo(() => allUsers.find((u) => u.uid === user?.uid) ?? null, [allUsers, user]);
  const myCreatorDoc = useMemo(() => creators.find((c) => c.userUid === user?.uid) ?? null, [creators, user]);
  const vip = isVip(myDoc);

  const notify = useCallback((s: string) => {
    setToast(s);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // ------------------------- Autenticación ---------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (booting) setBooting(false);
      // Mientras exista sesión, la vista la decide el bootstrap del documento
      // propio (onboarding vs app); en pantallas intermedias se muestra "carga".
      if (u) setView('carga'); else setView('auth');
    });
    return () => { unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------- Carga de datos --------------------------------
  const refreshCore = useCallback(async () => {
    if (!user) return;
    const uid = user.uid;
    const [users, swipes, ordersList, notifsList, evts, passList, matchesList, props, creas, posts, subs, forumList, ratingsList, unlocksList] = await Promise.all([
      docAll<UserDoc>('users'),
      docQuery<SwipeDoc>('swipes', 'from', uid),
      fetchRemoteSpeiOrdersForUser(uid),
      fetchNotificationsForUser(uid),
      docAll<EventDoc>('events'),
      docQuery<PassDoc>('event_passes', 'userUid', uid),
      docAll<MatchEntry>('matches'),
      docAll<ProposalDoc>('proposals'),
      docAll<CreatorDoc>('creators'),
      docAll<CreatorPostDoc>('creator_posts'),
      docQuery<CreatorSubDoc>('creator_subscriptions', 'userUid', uid),
      docAll<ForumDoc>('forum'),
      docAll<RatingDoc>('ratings'),
      docQuery<UnlockDoc>('content_unlocks', 'userUid', uid),
    ]);
    setAllUsers(users);
    setMySwipes(swipes);
    setOrders(ordersList);
    setNotifs(notifsList);
    setEvents(evts.filter((e) => e.published).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    setPasses(passList.sort((a, b) => b.createdAt - a.createdAt));
    setMatches(matchesList.filter((m) => m.users?.includes(uid)));
    setProposals(props.sort((a, b) => b.createdAt - a.createdAt));
    setCreators(creas);
    setCreatorPosts(posts.sort((a, b) => b.createdAt - a.createdAt));
    setMyCreatorSubs(subs);
    setForum(forumList.sort((a, b) => b.createdAt - a.createdAt));
    setRatings(ratingsList);
    setMyUnlocks(unlocksList);
    const remoteBank = await fetchRemoteSpeiConfig();
    if (remoteBank) setBankCfg(remoteBank);
  }, [user]);

  useEffect(() => {
    void refreshCore();
    const t = setInterval(() => void refreshCore(), 45000);
    return () => clearInterval(t);
  }, [refreshCore]);

  // Bootstrap del documento propio (incluye bypass de administración).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const existing = await docGet<UserDoc>('users', user.uid);
      if (cancelled) return;
      if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        if (!existing || !existing.onboardingDone) {
          await docSet<UserDoc>('users', user.uid, {
            uid: user.uid, email: user.email, alias: existing?.alias || 'Administración',
            kind: existing?.kind || 'Pareja', age: existing?.age || 30, bio: existing?.bio || '',
            avatar: existing?.avatar ?? null, photos: existing?.photos ?? [], interests: existing?.interests ?? [],
            seeking: existing?.seeking ?? [], agesPref: existing?.agesPref ?? [], km: existing?.km ?? 50, region: 'MX',
            identityStatus: 'aprobada', premium: 'ultra', premiumUntil: null, status: 'activo',
            onboardingDone: true, badge: 'oro', createdAt: existing?.createdAt ?? Date.now(), lastSeen: Date.now(),
          }, true);
        } else {
          await docUpdate('users', user.uid, { lastSeen: Date.now(), identityStatus: 'aprobada', badge: 'oro' });
        }
        setView('app');
        await refreshCore();
        return;
      }
      if (!existing || !existing.onboardingDone) {
        setView('onboarding');
      } else if (existing.identityStatus !== 'aprobada') {
        // Puerta de acceso: sin INE aprobada no se entra a la plataforma.
        setView('verificacion');
        await refreshCore();
      } else {
        await docUpdate('users', user.uid, { lastSeen: Date.now() });
        setView('app');
        await refreshCore();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Transiciones automáticas de la puerta de verificación: cuando el
  // administrador aprueba la INE, el usuario entra; si se revoca, sale.
  useEffect(() => {
    if (!myDoc || isAdmin) return;
    if (view === 'verificacion' && myDoc.identityStatus === 'aprobada') {
      setView('app');
      notify('Identidad verificada. Bienvenido a la comunidad.');
    } else if (view === 'app' && myDoc.identityStatus !== 'aprobada') {
      setView('verificacion');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myDoc?.identityStatus]);

  const finishOnboarding = async (doc: UserDoc) => {
    await docSet<UserDoc>('users', user!.uid, doc, true);
    setView('app');
    await refreshCore();
    notify('Perfil activo. Bienvenido a la comunidad.');
  };

  // ------------------------- Perfiles del mazo -----------------------------
  const swipedIds = useMemo(() => new Set(mySwipes.map((s) => s.to)), [mySwipes]);
  const deck = useMemo(() => {
    if (!user || !myDoc) return [];
    return allUsers.filter((u) => {
      if (u.uid === user.uid) return false;
      if (ADMIN_EMAILS.includes((u.email || '').toLowerCase())) return false;
      if (u.status !== 'activo') return false;
      if (!u.onboardingDone) return false;
      if (u.identityStatus === 'rechazada' || u.identityStatus === 'baneada') return false;
      if (swipedIds.has(u.uid)) return false;
      return true;
    });
  }, [allUsers, user, myDoc, swipedIds]);

  const likesToday = useMemo(
    () => mySwipes.filter((s) => s.action !== 'pass' && s.ts > startOfToday()).length,
    [mySwipes]
  );

  const actOn = async (target: UserDoc, action: 'like' | 'superlike' | 'pass') => {
    if (!user) return;
    if (action !== 'pass' && !vip && likesToday >= FREE_DAILY_LIKES) {
      notify('Llegaste a tus ' + FREE_DAILY_LIKES + ' likes de hoy. VIP Plus te da likes ilimitados.');
      return;
    }
    await docSet('swipes', `${user.uid}_${target.uid}`, { from: user.uid, to: target.uid, action, ts: Date.now() });
    setMySwipes((prev) => [...prev.filter((s) => s.to !== target.uid), { id: `${user.uid}_${target.uid}`, from: user.uid, to: target.uid, action, ts: Date.now() }]);
    if (action !== 'pass') {
      const recips = await docQuery<SwipeDoc>('swipes', 'from', target.uid);
      const hit = recips.find((r) => r.to === user.uid && (r.action === 'like' || r.action === 'superlike'));
      if (hit) {
        const id = matchIdFor(user.uid, target.uid);
        await docSet('matches', id, { id, users: [user.uid, target.uid], createdAt: Date.now(), lastMessage: '', lastTs: Date.now() });
        setMatchPopup(target);
      }
    }
  };

  // ------------------------- Chat -------------------------------------------
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatDraft, setChatDraft] = useState('');

  useEffect(() => {
    if (!chatWith || !user) return;
    const id = chatIdFor(user.uid, chatWith.uid);
    let stop = false;
    const pull = async () => {
      const doc = await docGet<{ messages?: ChatMsg[] }>('messages', id);
      if (!stop) setChatMsgs(Array.isArray(doc?.messages) ? doc!.messages! : []);
    };
    void pull();
    const t = setInterval(() => void pull(), 6000);
    return () => { stop = true; clearInterval(t); };
  }, [chatWith, user]);

  const sendMsg = async () => {
    if (!chatWith || !user || !chatDraft.trim()) return;
    const text = chatDraft.trim();
    setChatDraft('');
    const id = chatIdFor(user.uid, chatWith.uid);
    const doc = await docGet<{ messages?: ChatMsg[] }>('messages', id);
    const msgs = Array.isArray(doc?.messages) ? [...doc!.messages!] : [];
    msgs.push({ id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), uid: user.uid, t: text, ts: Date.now() });
    await docSet('messages', id, { id, users: [user.uid, chatWith.uid], messages: msgs });
    await docUpdate('matches', matchIdFor(user.uid, chatWith.uid), { lastMessage: text, lastTs: Date.now() });
    setChatMsgs(msgs);
  };

  // ------------------------- Finalización de chats ----------------------------
  // Abandonar: cierra el chat para ambas personas. La otra parte recibe una
  // notificación central y, al abrir la ventana, se le pide calificar y comentar.
  const abandonChat = async (peer: UserDoc) => {
    if (!user || !myDoc) return;
    const chatId = matchIdFor(user.uid, peer.uid);
    await docUpdate('matches', chatId, {
      status: 'cerrado', closedAt: Date.now(), closedBy: user.uid,
    } as Partial<MatchEntry>);
    const now = Date.now();
    const nid = notifId(peer.uid);
    await docSet('notifications', nid, {
      id: nid, userUid: peer.uid, kind: 'sistema',
      title: 'Chat finalizado',
      body: myDoc.alias + ' abandonó el chat. Califica tu experiencia: es indispensable para calificar a las personas.',
      ts: now, read: false,
    } as AppNotification);
    setChatWith(null);
    await refreshCore();
    notify('Chat finalizado. Califica tu experiencia con ' + peer.alias + '.');
  };

  // Borrar: oculta la conversación solo para quien la borra.
  const deleteChat = async (peer: UserDoc) => {
    if (!user) return;
    const chatId = matchIdFor(user.uid, peer.uid);
    const doc = await docGet<MatchEntry>('matches', chatId);
    const hidden = [...(doc?.hiddenFor ?? []), user.uid];
    await docUpdate('matches', chatId, { hiddenFor: hidden } as Partial<MatchEntry>);
    setChatWith(null);
    await refreshCore();
    notify('Conversación eliminada de tu lista.');
  };

  // Calificación mutua tras finalizar el chat (estrellas 1 a 5 + comentario).
  const ratePeer = async (chatId: string, peer: UserDoc, stars: number, comment: string) => {
    if (!user || !myDoc) return false;
    const id = 'rt_' + chatId + '_' + user.uid;
    const ok = await docSet('ratings', id, {
      id, chatId, raterUid: user.uid, raterAlias: myDoc.alias,
      ratedUid: peer.uid, stars, comment: comment.trim(),
      createdAt: Date.now(),
    } as RatingDoc);
    if (ok) {
      const nid = notifId(peer.uid);
      await docSet('notifications', nid, {
        id: nid, userUid: peer.uid, kind: 'sistema',
        title: 'Recibiste una calificación',
        body: myDoc.alias + ' calificó tu encuentro con ' + stars + ' estrella(s).',
        ts: Date.now(), read: false,
      } as AppNotification);
      await refreshCore();
    }
    return ok;
  };

  // Promedio de calaciones por perfil (estrellas y conteo).
  const ratingAgg = useMemo(() => {
    const map = new Map<string, { avg: number; count: number }>();
    for (const r of ratings) {
      const cur = map.get(r.ratedUid) ?? { sum: 0, count: 0 } as any;
      cur.sum = (cur.sum ?? 0) + r.stars;
      cur.count = (cur.count ?? 0) + 1;
      map.set(r.ratedUid, cur);
    }
    const out = new Map<string, { avg: number; count: number }>();
    for (const [uid, v] of map as any) {
      out.set(uid, { avg: v.sum / v.count, count: v.count });
    }
    return out;
  }, [ratings]);

  // Notificación central: si un chat cerrado quedó sin calificar, se pide
  // calificar al abrir la ventana. Es indispensable para calificar a las personas.
  useEffect(() => {
    if (!user || !myDoc || view !== 'app') return;
    const pending = matches.find(
      (m) => m.status === 'cerrado'
        && !(m.hiddenFor ?? []).includes(user.uid)
        && !dismissedRatings.includes(m.id)
        && !ratings.some((r) => r.chatId === m.id && r.raterUid === user.uid)
    );
    if (!pending) return;
    const peerUid = pending.users.find((u) => u !== user.uid);
    const peer = allUsers.find((u) => u.uid === peerUid);
    if (peer) setRateModal({ peer, chatId: pending.id });
  }, [matches, ratings, allUsers, user, myDoc, view, dismissedRatings]);

  // ------------------------- SPEI ------------------------------------------
  const pricing = getPlanPricing('MX');

  const createSubscriptionOrder = async (plan: 'plus' | 'ultra') => {
    if (!user || !myDoc) return;
    if (myDoc.identityStatus !== 'aprobada') {
      notify('Para comprar necesitas tu INE aprobado. Súbelo desde tu perfil.');
      return;
    }
    if (orders.some((o) => o.kind === 'suscripcion' && o.itemRef === plan && (o.status === 'pendiente' || o.status === 'verificado'))) {
      notify('Ya tienes una orden en curso para este plan. Complétala o espera a que expire.');
      return;
    }
    const price = pricing[plan];
    const order = newSpeiOrder({
      kind: 'suscripcion', itemRef: plan, label: price.labelEs, amount: price.total,
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setOrderSheet(order);
      notify('Orden SPEI creada. Realiza la transferencia a la brevedad.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  const createEventOrder = async (ev: EventDoc) => {
    if (!user || !myDoc) return;
    if (myDoc.identityStatus !== 'aprobada') {
      notify('Para reservar entradas pagadas necesitas tu INE aprobado. Súbelo desde tu perfil.');
      return;
    }
    if ((ev.sold ?? 0) >= ev.cap) { notify('Cupo lleno. No quedan lugares para este evento.'); return; }
    const mine = await docQuery<PassDoc>('event_passes', 'userUid', user.uid);
    if (mine.some((p) => p.eventId === ev.id && p.status === 'activo')) { notify('Ya tienes un pase activo para este evento.'); return; }
    if (orders.some((o) => o.kind === 'evento' && o.itemRef === ev.id && (o.status === 'pendiente' || o.status === 'verificado'))) {
      notify('Ya tienes una orden en curso para este evento. Complétala o espera a que expire.');
      return;
    }
    const total = Math.round(ev.price * (1 + IVA) * 100) / 100;
    const order = newSpeiOrder({
      kind: 'evento', itemRef: ev.id, label: 'Entrada: ' + ev.title, amount: total,
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    order.meta = JSON.stringify({ eventId: ev.id, eventTitle: ev.title, eventDate: ev.date, eventTime: ev.time, eventZone: ev.zone });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setEventSheet(null);
      setOrderSheet(order);
      notify('Orden SPEI creada para tu entrada.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  const claimFreePass = async (ev: EventDoc) => {
    if (!user || !myDoc) return;
    if ((ev.sold ?? 0) >= ev.cap) { notify('Cupo lleno. No quedan lugares para este evento.'); return; }
    const mine = await docQuery<PassDoc>('event_passes', 'userUid', user.uid);
    if (mine.some((p) => p.eventId === ev.id && p.status === 'activo')) { notify('Ya tienes un pase activo para este evento.'); return; }
    const pass: PassDoc = {
      id: 'pass_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      code: vipCode(), eventId: ev.id, eventTitle: ev.title, eventDate: ev.date,
      eventTime: ev.time, eventZone: ev.zone, userUid: user.uid, userName: myDoc.alias,
      amount: 0, orderRef: 'GRATIS', status: 'activo', createdAt: Date.now(),
    };
    const ok = await docSet('event_passes', pass.id, pass);
    if (ok) {
      await docUpdate('events', ev.id, { sold: Math.min(ev.cap, (ev.sold ?? 0) + 1) });
      const nid = notifId(user.uid);
      await docSet('notifications', nid, {
        id: nid, userUid: user.uid, kind: 'pase',
        title: 'Entrada confirmada', body: 'Tu pase para "' + ev.title + '" ya está activo. Preséntalo en la entrada.',
        ts: Date.now(), read: false,
      } as AppNotification);
      setEventSheet(null);
      await refreshCore();
      notify('Entrada confirmada. Consulta tu pase en Eventos.');
    } else {
      notify('No fue posible reservar. Intenta de nuevo.');
    }
  };

  const reportTransfer = async (order: SpeiOrder) => {
    const bot = runBotValidation(order);
    if (!bot.passed) {
      notify(bot.expired ? 'La orden expiró. Genera una nueva.' : 'La orden no pasó la validación automática.');
      return;
    }
    const ok = await appendRemoteTimelineAndStatus(order.id, 'verificado', 'El usuario reportó su transferencia. Validación automática aprobada; espera confirmación del administrador.');
    if (ok) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'verificado', timeline: [...o.timeline, { ts: Date.now(), text: 'El usuario reportó su transferencia. Validación automática aprobada; espera confirmación del administrador.' }] } : o)));
      setOrderSheet((o) => (o && o.id === order.id ? { ...o, status: 'verificado' } : o));
      notify('Transferencia reportada. Administración confirmará en breve.');
    }
  };

  // ------------------------- Propuestas ------------------------------------
  const applyToProposal = async (p: ProposalDoc) => {
    if (!user || !myDoc) return;
    if ((p.applies ?? []).includes(user.uid)) { notify('Ya aplicaste a esta propuesta.'); return; }
    const applies = [...(p.applies ?? []), user.uid];
    const ok = await docUpdate<ProposalDoc>('proposals', p.id, { applies } as Partial<ProposalDoc>);
    if (ok) {
      const nid = notifId(p.authorUid);
      await docSet('notifications', nid, {
        id: nid, userUid: p.authorUid, kind: 'sistema',
        title: 'Nueva aplicación', body: myDoc.alias + ' aplicó a tu propuesta "' + p.title + '".',
        ts: Date.now(), read: false,
      } as AppNotification);
      setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, applies } : x)));
      notify('Aplicación enviada. El autor te verá entre sus interesados.');
    } else {
      notify('No fue posible aplicar. Intenta de nuevo.');
    }
  };

  const createProposal = async (f: { cat: string; title: string; body: string; rules: string }) => {
    if (!user || !myDoc) return false;
    const id = 'pr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const doc: ProposalDoc = {
      id, authorUid: user.uid, authorAlias: myDoc.alias,
      cat: f.cat, title: f.title, body: f.body, rules: f.rules,
      status: 'revision', applies: [], createdAt: Date.now(),
    };
    const ok = await docSet('proposals', id, doc);
    if (ok) { await refreshCore(); notify('Propuesta enviada a revisión. Administración la aprobará o rechazará.'); }
    else notify('No fue posible enviar la propuesta. Intenta de nuevo.');
    return ok;
  };

  // ------------------------- Creadoras --------------------------------------
  const registerCreator = async (f: { name: string; handle: string; bio: string; price: number }) => {
    if (!user || !myDoc) return false;
    const id = 'cr_' + user.uid;
    const doc: CreatorDoc = {
      id, userUid: user.uid, name: f.name.trim(),
      handle: (f.handle || '').replace(/^@/, '').trim(), bio: f.bio.trim(),
      price: Math.max(0, Math.round(f.price) || 0), status: 'pendiente', createdAt: Date.now(),
    };
    const ok = await docSet('creators', id, doc, true);
    if (ok) { await refreshCore(); notify('Recibimos tu registro de creadora. Te avisamos al aprobarlo.'); }
    else notify('No fue posible enviar el registro. Intenta de nuevo.');
    return ok;
  };

  const uploadCreatorPost = async (creator: CreatorDoc, media: string, kind: 'foto' | 'video', caption: string, tier: 'gratis' | 'premium' | 'ultra', price: number) => {
    if (!user) return false;
    const id = 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const doc: CreatorPostDoc = {
      id, creatorId: creator.id, creatorName: creator.name, creatorHandle: creator.handle,
      image: media, caption: caption.trim(), tier, kind,
      premium: tier !== 'gratis',
      price: tier === 'gratis' ? 0 : Math.max(0, Math.round(price) || 0),
      status: 'revision', createdAt: Date.now(),
    };
    const ok = await docSet('creator_posts', id, doc);
    if (ok) { await refreshCore(); notify('Contenido enviado a moderación. Aparecerá al aprobarse.'); }
    else notify('No fue posible subir el contenido. Intenta de nuevo.');
    return ok;
  };

  const createCreatorOrder = async (creator: CreatorDoc) => {
    if (!user || !myDoc) return;
    if (myCreatorSubs.some((s) => s.creatorId === creator.id && s.until > Date.now())) {
      notify('Ya tienes una suscripción activa con esta creadora.');
      return;
    }
    if (orders.some((o) => o.kind === 'creadora' && o.itemRef === creator.id && (o.status === 'pendiente' || o.status === 'verificado'))) {
      notify('Ya tienes una orden en curso para esta suscripción.');
      return;
    }
    // Economía de creadoras: la compradora paga el precio de la creadora,
    // más la comisión de plataforma del 15%, más IVA sobre todo el importe.
    const total = Math.round(creator.price * (1 + CREATOR_COMMISSION) * (1 + IVA) * 100) / 100;
    const order = newSpeiOrder({
      kind: 'creadora', itemRef: creator.id, label: 'Suscripción: ' + creator.handle, amount: total,
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    order.meta = JSON.stringify({ creatorId: creator.id, creatorHandle: creator.handle, base: creator.price });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setOrderSheet(order);
      notify('Orden SPEI creada para tu suscripción de creadora.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  // Compra de contenido premium o ultra de una creadora (desbloqueo por pieza).
  const createContentOrder = async (post: CreatorPostDoc, creator: CreatorDoc) => {
    if (!user || !myDoc) return;
    if (myDoc.identityStatus !== 'aprobada') {
      notify('Para comprar contenido necesitas tu INE aprobada.');
      return;
    }
    if (myUnlocks.some((u) => u.postId === post.id)) {
      notify('Ya tienes acceso a este contenido.');
      return;
    }
    if (orders.some((o) => o.kind === 'contenido' && o.itemRef === post.id && (o.status === 'pendiente' || o.status === 'verificado'))) {
      notify('Ya tienes una orden en curso para este contenido.');
      return;
    }
    const total = Math.round(post.price * (1 + CREATOR_COMMISSION) * (1 + IVA) * 100) / 100;
    const order = newSpeiOrder({
      kind: 'contenido', itemRef: post.id,
      label: (post.tier === 'ultra' ? 'Ultra: ' : 'Contenido: ') + (post.caption || creator.handle).slice(0, 18),
      amount: total,
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    order.meta = JSON.stringify({ postId: post.id, creatorId: creator.id, base: post.price });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setOrderSheet(order);
      notify('Orden SPEI creada. Al aprobarse el pago se desbloquea el contenido.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  // Donación directa a una creadora: sin comisión de plataforma; la donante
  // paga el monto elegido más IVA. La creadora cubre su ISR.
  const createDonationOrder = async (creator: CreatorDoc, amount: number) => {
    if (!user || !myDoc) return;
    if (myDoc.identityStatus !== 'aprobada') {
      notify('Para donar necesitas tu INE aprobada.');
      return;
    }
    if (!amount || amount < 20) {
      notify('La donación mínima es $20 MXN.');
      return;
    }
    if (orders.some((o) => o.kind === 'donacion' && o.itemRef === creator.id && (o.status === 'pendiente' || o.status === 'verificado') && o.amount === ivaTotal(amount))) {
      notify('Ya tienes una donación en curso para esta creadora.');
      return;
    }
    const order = newSpeiOrder({
      kind: 'donacion', itemRef: creator.id,
      label: 'Donación: ' + creator.handle,
      amount: ivaTotal(amount),
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    order.meta = JSON.stringify({ creatorId: creator.id, creatorHandle: creator.handle, base: amount });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setOrderSheet(order);
      notify('Orden SPEI creada para tu donación.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  // Membresía de creadora: sustituye la comisión por venta.
  const createCreatorMembershipOrder = async (creator: CreatorDoc, plan: typeof CREATOR_PLANS[number]) => {
    if (!user || !myDoc) return;
    if ((creator.membershipUntil ?? 0) > Date.now()) {
      notify('Ya tienes una membresía activa. Contratar otra la renovará al vencer.');
    }
    if (orders.some((o) => o.kind === 'membresia_creadora' && o.itemRef === plan.id && (o.status === 'pendiente' || o.status === 'verificado'))) {
      notify('Ya tienes una orden en curso para este plan.');
      return;
    }
    const order = newSpeiOrder({
      kind: 'membresia_creadora', itemRef: plan.id,
      label: 'Membresía: ' + plan.name.slice(0, 24),
      amount: ivaTotal(plan.price),
      userName: myDoc.alias, userEmail: user.email, userUid: user.uid,
    });
    order.meta = JSON.stringify({ creatorId: creator.id, planId: plan.id, base: plan.price });
    const ok = await createRemoteSpeiOrder(order);
    if (ok) {
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      setOrderSheet(order);
      notify('Orden SPEI creada para tu membresía de creadora.');
    } else {
      notify('No fue posible crear la orden. Intenta de nuevo.');
    }
  };

  // Fiscal: firma del acuse para asumir el ISR ante el SAT bajo su responsabilidad.
  const signOficio = async (creator: CreatorDoc, signature: string) => {
    if (!user || !signature) return false;
    setOficioBusy(true);
    const ok = await docUpdate('creators', creator.id, {
      isrAssumed: true, isrSignedAt: Date.now(), signature,
    } as Partial<CreatorDoc>);
    setOficioBusy(false);
    if (ok) {
      await refreshCore();
      notify('Acuse firmado. A partir de ahora cubres tu ISR directamente ante el SAT.');
    } else {
      notify('No fue posible registrar tu firma. Intenta de nuevo.');
    }
    return ok;
  };

  // Solicitud de factura por parte de la creadora (llega al panel como ticket).
  const requestFactura = async (creator: CreatorDoc) => {
    if (!user || !myDoc) return;
    const id = 'st_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await docSet('support_tickets', id, {
      id, userUid: user.uid, userName: myDoc.alias, userEmail: user.email,
      requester: 'creadora', subject: 'Solicitud de factura: ' + creator.handle,
      message: 'Solicito factura de mis comisiones y/o membresías como creadora @' + creator.handle + '.',
      status: 'abierto', createdAt: Date.now(),
    });
    notify('Solicitud de factura enviada a administración.');
  };

  // ------------------------- Foro público ------------------------------------
  const askQuestion = async (text: string) => {
    if (!user || !myDoc) return false;
    const id = 'fq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const doc: ForumDoc = {
      id, userUid: user.uid, userName: myDoc.alias, question: text.trim(),
      answer: null, status: 'abierta', createdAt: Date.now(), answeredAt: null,
    };
    const ok = await docSet('forum', id, doc);
    if (ok) { await refreshCore(); notify('Pregunta publicada. Administración responderá pronto.'); }
    else notify('No fue posible publicar tu pregunta. Intenta de nuevo.');
    return ok;
  };

  // ------------------------- Notificaciones -------------------------------
  const unread = notifs.filter((n) => !n.read).length;
  const openAvisos = async () => {
    setSheet('avisos');
    const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length && user) {
      await markNotificationsRead(user.uid, unreadIds);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  // ------------------------- Render ----------------------------------------
  if (booting || view === 'carga') {
    return (
      <div className="shell">
        <div className="screen" style={{ display: 'grid', placeItems: 'center' }}>
          <Loader2 size={36} className="spin" color="var(--lila)" />
        </div>
      </div>
    );
  }

  // Bloqueo efectivo de cuentas suspendidas o baneadas: el veredicto del
  // administrador corta el acceso completo a la aplicación.
  if ((view === 'app' || view === 'verificacion') && myDoc && !isAdmin && (myDoc.status === 'suspendido' || myDoc.identityStatus === 'baneada')) {
    const banned = myDoc.identityStatus === 'baneada';
    return (
      <div className="shell">
        <div className="screen">
          <div className="aura" />
          <div className="topbar">
            <span className="wordmark">App<b>Swinguer</b></span>
            <span className="tag bad"><Ban size={12} /> {banned ? 'Baneada' : 'Suspendida'}</span>
          </div>
          <div className="body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <Ban size={34} color="var(--bad)" />
              <div className="h1" style={{ fontSize: 26, marginTop: 12 }}>{banned ? 'Cuenta baneada' : 'Cuenta suspendida'}</div>
              <p className="muted small" style={{ margin: '10px 0 0' }}>
                {banned
                  ? 'Tu cuenta fue baneada por decisión de administración. Tus credenciales se retienen un año conforme a la política de la plataforma.'
                  : 'Tu cuenta está suspendida. Si crees que se trata de un error, comunícate con administración por un canal oficial.'}
              </p>
              {myDoc.identityNote && <p className="tiny" style={{ marginTop: 8 }}>{myDoc.identityNote}</p>}
            </div>
            <button className="btn btn-bad full" style={{ marginTop: 16 }} onClick={() => void signOut(auth)}>
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Puerta de verificación: sin INE aprobada no se accede a la plataforma.
  if (view === 'verificacion' && user) {
    return (
      <div className="shell">
        <div className="screen">
          <div className="aura" />
          <div className="topbar">
            <span className="wordmark">App<b>Swinguer</b></span>
            <span className="tag warn"><ShieldCheck size={12} /> Verificación</span>
          </div>
          <div className="body" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="h1" style={{ fontSize: 26 }}>Validación de identidad</div>
            <p className="sub">Sin tu INE aprobada no se accede a la plataforma. Es la única forma de mantener la comunidad real y segura.</p>
            {myDoc && (
              <>
                <div className="card">
                  <div className="row between">
                    <span className="label">Estado actual</span>
                    <IdentityTag status={myDoc.identityStatus} />
                  </div>
                  {myDoc.identityStatus === 'en revisión' && (
                    <p className="muted small" style={{ margin: '10px 0 0' }}>
                      Tu expediente está en revisión por administración. Esta pantalla se libera sola al aprobarse; no necesitas reiniciar la app.
                    </p>
                  )}
                  {myDoc.identityStatus === 'rechazada' && (
                    <p className="muted small" style={{ margin: '10px 0 0' }}>
                      Tu expediente fue rechazado. Puedes volver a enviarlo con ambas caras legibles y tu selfie.
                    </p>
                  )}
                  {(myDoc.identityStatus === 'sin iniciar' || !myDoc.identityStatus) && (
                    <p className="muted small" style={{ margin: '10px 0 0' }}>
                      Sube el frente y reverso de tu INE más un selfie sosteniéndola. Solo lo ve administración.
                    </p>
                  )}
                </div>
                <div style={{ marginTop: 14 }} />
                <IneCapture
                  uid={user.uid}
                  email={user.email ?? ''}
                  alias={myDoc.alias}
                  onToast={notify}
                  onDone={async () => { await refreshCore(); }}
                />
              </>
            )}
            <button className="btn btn-bad full" style={{ marginTop: 16 }} onClick={() => void signOut(auth)}>
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="aura" />
        {view === 'auth' && <AuthScreen onToast={notify} />}
        {view === 'onboarding' && user && (
          <Onboarding user={user} seed={myDoc} onFinish={finishOnboarding} onToast={notify} />
        )}
        {view === 'app' && user && myDoc && (
          <>
            <div className="topbar">
              {tab === 'perfil' ? (
                <span className="tag">{vipLabel(myDoc)}</span>
              ) : (
                <span className="wordmark">App<b>Swinguer</b></span>
              )}
              <div className="row">
                <button className="iconbtn" aria-label="Avisos" onClick={openAvisos}>
                  <Bell size={18} />
                  {unread > 0 && <span className="badge">{unread}</span>}
                </button>
                <button className="iconbtn" aria-label="Perfil" onClick={() => setTab('perfil')}>
                  <Avatar doc={myDoc} size={26} />
                </button>
              </div>
            </div>

            <div className="body">
              {tab === 'match' && (
                <MatchTab
                  deck={deck}
                  vip={vip}
                  likesToday={likesToday}
                  onAct={actOn}
                  matches={matches}
                  allUsers={allUsers}
                  myUid={user.uid}
                  onOpenChat={(peer) => setChatWith(peer)}
                  ratingAgg={ratingAgg}
                />
              )}
              {tab === 'propuestas' && (
                <PropuestasTab
                  myUid={user.uid}
                  proposals={proposals}
                  onApply={applyToProposal}
                  onToast={notify}
                  onOpenNew={() => setSheet('propuesta')}
                />
              )}
              {tab === 'eventos' && (
                <EventsTab
                  events={events}
                  passes={passes}
                  onOpenEvent={(ev) => setEventSheet(ev)}
                  onToast={notify}
                />
              )}
              {tab === 'virtual' && (
                <VirtualTab
                  myDoc={myDoc}
                  creators={creators}
                  posts={creatorPosts}
                  mySubs={myCreatorSubs}
                  myUnlocks={myUnlocks}
                  ratingAgg={ratingAgg}
                  onToast={notify}
                  onSubscribe={createCreatorOrder}
                  onBuyContent={(p, c) => { setContentTarget({ post: p, creator: c }); setSheet('contenido'); }}
                  onDonate={(c) => { setDonationTarget(c); setSheet('donacion'); }}
                  onRegister={registerCreator}
                  onUpload={uploadCreatorPost}
                  onMembership={createCreatorMembershipOrder}
                  onOpenOficio={() => setSheet('oficio')}
                  onRequestFactura={requestFactura}
                  onOpenExplicit={(p) => {
                    setExplicitView({ image: p.image, caption: p.caption, kind: p.kind ?? 'foto' });
                    setExplicitConfirm(true);
                  }}
                />
              )}
              {tab === 'perfil' && (
                <ProfileTab
                  myDoc={myDoc}
                  isAdmin={isAdmin}
                  passesCount={passes.filter((p) => p.status === 'activo').length}
                  onOpenIne={() => setSheet('ine')}
                  onOpenEdit={() => setSheet('editar')}
                  onGoPago={() => setPagoOpen(true)}
                  onOpenForo={() => setForoOpen(true)}
                  onOpenAvisos={openAvisos}
                  onOpenAdmin={() => setAdminOpen(true)}
                  onToast={notify}
                  onSaved={async (doc) => { await docUpdate('users', user.uid, doc); await refreshCore(); }}
                  onPhoto={async (file, kind) => {
                    try {
                      const data = await compressImage(file);
                      if (kind === 'avatar') {
                        await docUpdate('users', user.uid, { avatar: data });
                      } else {
                        const photos = [...(myDoc.photos ?? []), data].slice(0, 9);
                        await docUpdate('users', user.uid, { photos });
                      }
                      await refreshCore();
                    } catch { notify('No fue posible procesar la imagen.'); }
                  }}
                  onRemovePhoto={async (idx) => {
                    const photos = (myDoc.photos ?? []).filter((_, i) => i !== idx);
                    await docUpdate('users', user.uid, { photos });
                    await refreshCore();
                  }}
                  onLogout={async () => { await signOut(auth); setView('auth'); setTab('match'); }}
                  myRating={ratingAgg.get(user.uid)}
                  isCreatorVerified={myCreatorDoc?.status === 'activa'}
                />
              )}
            </div>

            <nav className="nav">
              {([
                ['match', <Heart size={22} />, 'Match'],
                ['propuestas', <Sparkles size={22} />, 'Propuestas'],
                ['eventos', <CalendarDays size={22} />, 'Eventos'],
                ['virtual', <Star size={22} />, 'Virtual'],
                ['perfil', <Users size={22} />, 'Perfil'],
              ] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
                <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {icon}
                  {label}
                </button>
              ))}
            </nav>
          </>
        )}

        {/* ---------------------- Pop-up de match ---------------------- */}
        <AnimatePresence>
          {matchPopup && (
            <motion.div
              className="overlay"
              style={{ background: 'radial-gradient(circle at 50% 40%, #6d1fb8, #050307 70%)', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 28 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }}>
                <div className="caps" style={{ fontSize: 64, lineHeight: 0.9, textShadow: '0 0 40px rgba(199,125,255,.9)' }}>
                  Es<br />Match
                </div>
              </motion.div>
              <p style={{ fontSize: 19, margin: '20px 0 30px' }}>
                Tú y <b>{matchPopup.alias}</b> se interesaron mutuamente.
              </p>
              <button
                className="btn btn-neon full"
                onClick={() => { setChatWith(matchPopup); setMatchPopup(null); }}
              >
                <MessageCircle size={18} /> Abrir chat
              </button>
              <button className="btn btn-ghost full" style={{ marginTop: 10 }} onClick={() => setMatchPopup(null)}>
                Seguir explorando
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Calificación central ------------------- */}
        <AnimatePresence>
          {rateModal && user && myDoc && (
            <motion.div
              className="overlay"
              style={{ background: 'radial-gradient(circle at 50% 35%, #3f0f73, #050307 72%)', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 24 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div style={{ width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto' }}>
                <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 16 }}>
                  <div className="card" style={{ textAlign: 'left', boxShadow: 'var(--glow)' }}>
                    <div className="row" style={{ gap: 12 }}>
                      <Avatar doc={rateModal.peer} size={54} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="caps" style={{ fontSize: 19 }}>{rateModal.peer.alias}</div>
                        <div className="tiny">Tu chat llegó a su fin</div>
                      </div>
                    </div>
                    <p className="small muted" style={{ margin: '12px 0 4px' }}>
                      Tu calificación es indispensable para calificar a las personas: construye perfiles confiables para toda la comunidad.
                    </p>
                    <RatePeerForm
                      onDone={async (stars, comment) => {
                        const ok = await ratePeer(rateModal.chatId, rateModal.peer, stars, comment);
                        if (ok) { setRateModal(null); notify('Calificación enviada. Gracias por calificar.'); }
                        else notify('No fue posible enviar tu calificación. Intenta de nuevo.');
                      }}
                      onLater={() => {
                        setDismissedRatings((d) => [...d, rateModal.chatId]);
                        setRateModal(null);
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Contenido explícito 18+ ---------------- */}
        <AnimatePresence>
          {explicitView && explicitConfirm && (
            <motion.div
              className="overlay"
              style={{ background: 'radial-gradient(circle at 50% 35%, #4d1030, #050307 72%)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div style={{ width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto' }} className="card">
                <div className="row" style={{ gap: 10 }}>
                  <AlertTriangle size={28} color="var(--warn)" />
                  <div className="caps" style={{ fontSize: 20 }}>Contenido explícito para adultos</div>
                </div>
                <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                  <p className="small" style={{ margin: 0 }}>
                    Este contenido es explícito y está dirigido exclusivamente a personas mayores de 18 años.
                  </p>
                  <p className="small muted" style={{ margin: 0 }}>
                    Está prohibido mostrarlo a menores de edad. Guardar, capturar o redistribuir este material puede derivar en problemas legales:
                    vulnera la intimidad y la protección de datos personales de su autora, y su difusión sin consentimiento puede constituir delito.
                  </p>
                  <p className="small muted" style={{ margin: 0 }}>
                    Al continuar confirmas que eres mayor de edad y que lo visualizarás bajo tu responsabilidad.
                  </p>
                  <button
                    className="btn btn-neon full"
                    style={{ marginTop: 6 }}
                    onClick={() => setExplicitConfirm(false)}
                  >
                    <Eye size={18} /> Aceptar y ver el contenido
                  </button>
                  <button className="btn btn-ghost full" onClick={() => setExplicitView(null)}>
                    No, volver
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {explicitView && !explicitConfirm && (
            <motion.div
              className="ann"
              style={{ zIndex: 70, flexDirection: 'column', gap: 10, padding: 16 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExplicitView(null)}
            >
              {explicitView.kind === 'video' ? (
                <video src={explicitView.image} controls autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '74%', borderRadius: 16, boxShadow: 'var(--glow)' }} onClick={(e) => e.stopPropagation()} />
              ) : (
                <img src={explicitView.image} alt={explicitView.caption} style={{ maxWidth: '100%', maxHeight: '74%', borderRadius: 16, boxShadow: 'var(--glow)' }} onClick={(e) => e.stopPropagation()} />
              )}
              <p className="tiny" style={{ maxWidth: 480, textAlign: 'center' }}>
                {explicitView.caption || 'Contenido explícito'} · Prohibido mostrar a menores, guardar o redistribuir sin consentimiento.
              </p>
              <button className="btn btn-dark btn-sm" onClick={() => setExplicitView(null)}><X size={14} /> Cerrar</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Chat abierto -------------------------- */}
        <AnimatePresence>
          {chatWith && user && (
            <motion.div className="overlay" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
              <div className="topbar">
                <button className="iconbtn" aria-label="Salir" onClick={() => setChatWith(null)}><ChevronLeft size={20} /></button>
                <span className="caps" style={{ fontSize: 16, flex: 1, textAlign: 'center', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatWith.alias}</span>
                <button className="iconbtn" aria-label="Borrar chat" title="Borrar chat" onClick={() => void deleteChat(chatWith)}><Trash2 size={18} /></button>
                <button className="iconbtn" aria-label="Abandonar chat" title="Abandonar chat" onClick={() => void abandonChat(chatWith)}><LogOut size={18} /></button>
                <button className="iconbtn" aria-label="Reportar" title="Reportar" onClick={() => setSheet('reportar')}><AlertTriangle size={18} /></button>
              </div>
              <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMsgs.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', marginTop: 20 }}>
                    <Sparkles size={26} color="var(--lila)" />
                    <p className="muted small" style={{ margin: '8px 0 0' }}>Sin mensajes aún. Rompe el hielo con respeto y consentimiento.</p>
                  </div>
                )}
                {chatMsgs.map((m) => (
                  <div key={m.id} className={'bubble ' + (m.uid === user.uid ? 'me' : 'them')}>{m.t}</div>
                ))}
              </div>
              <div className="composer">
                <input
                  className="field" placeholder="Mensaje…" value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void sendMsg(); }}
                />
                <button className="iconbtn" style={{ background: 'var(--lila)', color: '#12051f' }} aria-label="Enviar" onClick={() => void sendMsg()}>
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Pago SPEI (desde Perfil) ------------- */}
        <AnimatePresence>
          {pagoOpen && user && myDoc && (
            <motion.div className="overlay" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
              <div className="topbar">
                <button className="iconbtn" aria-label="Salir" onClick={() => setPagoOpen(false)}><ChevronLeft size={20} /></button>
                <span className="caps" style={{ fontSize: 16 }}>Pago SPEI</span>
                <span style={{ width: 44 }} />
              </div>
              <div className="body">
                <PayTab
                  myDoc={myDoc}
                  orders={orders}
                  pricing={pricing}
                  bank={bankCfg}
                  onBuy={createSubscriptionOrder}
                  onOpenOrder={(o) => setOrderSheet(o)}
                  onToast={notify}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Foro público -------------------------- */}
        <AnimatePresence>
          {foroOpen && user && myDoc && (
            <motion.div className="overlay" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
              <div className="topbar">
                <button className="iconbtn" aria-label="Salir" onClick={() => setForoOpen(false)}><ChevronLeft size={20} /></button>
                <span className="caps" style={{ fontSize: 16 }}>Foro público</span>
                <span style={{ width: 44 }} />
              </div>
              <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="h1" style={{ fontSize: 22 }}>Preguntas y respuestas</div>
                <p className="sub" style={{ marginBottom: 4 }}>Público para toda la comunidad verificada. Sin datos personales ni ubicaciones.</p>
                {forum.length === 0 && (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <MessageCircle size={28} color="var(--lila)" />
                    <p className="muted" style={{ margin: '10px 0 0' }}>Aún no hay preguntas. Sé quien abra la conversación.</p>
                  </div>
                )}
                {forum.map((q) => (
                  <div key={q.id} className="card" style={{ padding: 14, background: q.status === 'respondida' ? 'var(--s2)' : 'var(--s3)', boxShadow: q.status === 'respondida' ? 'inset 0 0 0 1px var(--line)' : 'inset 0 0 0 1px var(--lila), var(--glow)' }}>
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 15 }}>{q.userName}</span>
                      <span className="tiny">{ago(q.createdAt)}</span>
                    </div>
                    <p className="small" style={{ margin: '6px 0 0' }}>{q.question}</p>
                    {q.answer ? (
                      <div className="card" style={{ marginTop: 10, padding: 12, background: 'var(--s1)' }}>
                        <div className="tiny" style={{ color: 'var(--ok)', marginBottom: 4 }}><BadgeCheck size={13} /> Respuesta de administración</div>
                        <span className="small">{q.answer}</span>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 6, marginTop: 8 }}><Clock size={13} color="var(--warn)" /><span className="tiny">Esperando respuesta de administración.</span></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="composer">
                <input
                  className="field" placeholder="Haz una pregunta pública…" value={foroDraft}
                  onChange={(e) => setForoDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && foroDraft.trim()) { void askQuestion(foroDraft); setForoDraft(''); } }}
                />
                <button
                  className="iconbtn" style={{ background: 'var(--lila)', color: '#12051f' }} aria-label="Preguntar"
                  onClick={() => { if (foroDraft.trim()) { void askQuestion(foroDraft); setForoDraft(''); } }}
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------------- Hoja de orden SPEI ------------------- */}
        <AnimatePresence>
          {(orderSheet || eventSheet || sheet) && <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setOrderSheet(null); setEventSheet(null); setSheet(null); }} />}
        </AnimatePresence>
        <AnimatePresence>
          {orderSheet && (
            <SpeiOrderSheet
              order={orderSheet}
              bank={bankCfg}
              onToast={notify}
              onReport={() => void reportTransfer(orderSheet)}
              onClose={() => setOrderSheet(null)}
            />
          )}
        </AnimatePresence>

        {/* ---------------------- Hoja de evento ------------------------ */}
        <AnimatePresence>
          {eventSheet && user && myDoc && (
            <EventSheet
              ev={eventSheet}
              hasPass={passes.some((p) => p.eventId === eventSheet.id && p.status === 'activo')}
              onClose={() => setEventSheet(null)}
              onReserve={(ev) => (ev.price > 0 ? void createEventOrder(ev) : void claimFreePass(ev))}
            />
          )}
        </AnimatePresence>

        {/* ---------------------- Hojas de perfil ---------------------- */}
        <AnimatePresence>
          {sheet === 'ine' && user && myDoc && (
            <motion.div key="sheet-ine" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="grab" />
              <div className="caps" style={{ fontSize: 22 }}>Validación INE</div>
              <p className="muted small" style={{ margin: '4px 0 12px' }}>Estado actual: <IdentityTag status={myDoc.identityStatus} /></p>
              <IneCapture
                uid={user.uid} email={user.email} alias={myDoc.alias} onToast={notify}
                onDone={async () => { setSheet(null); await refreshCore(); }}
              />
            </motion.div>
          )}
          {sheet === 'editar' && myDoc && user && (
            <EditProfileSheet key="sheet-editar"
              doc={myDoc}
              onClose={() => setSheet(null)}
              onToast={notify}
              onSave={async (patch) => { await docUpdate('users', user.uid, patch); await refreshCore(); setSheet(null); notify('Perfil actualizado.'); }}
            />
          )}
          {sheet === 'avisos' && (
            <motion.div key="sheet-avisos" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="grab" />
              <div className="caps" style={{ fontSize: 22 }}>Avisos</div>
              <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                {notifs.length === 0 && <p className="muted small">Sin avisos por ahora.</p>}
                {notifs.map((n) => (
                  <div key={n.id} className="card" style={{ padding: 14, background: n.read ? 'var(--s2)' : 'var(--s3)', boxShadow: n.read ? 'inset 0 0 0 1px var(--line)' : 'inset 0 0 0 1px var(--lila), var(--glow)' }}>
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 15 }}>{n.title}</span>
                      <span className="tiny">{ago(n.ts)}</span>
                    </div>
                    <span className="small" style={{ display: 'block', marginTop: 4 }}>{n.body}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {sheet === 'propuesta' && (
            <motion.div key="sheet-propuesta" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <ProposalSheet onClose={() => setSheet(null)} onSubmit={createProposal} onToast={notify} />
            </motion.div>
          )}
          {sheet === 'donacion' && donationTarget && user && myDoc && (
            <motion.div key="sheet-donacion" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <DonationSheet
                creator={donationTarget}
                onClose={() => { setDonationTarget(null); setSheet(null); }}
                onSubmit={async (amount) => {
                  const ok = ivaTotal(amount) >= 0;
                  if (ok) { await createDonationOrder(donationTarget, amount); setDonationTarget(null); setSheet(null); }
                }}
                onToast={notify}
              />
            </motion.div>
          )}
          {sheet === 'contenido' && contentTarget && user && myDoc && (
            <motion.div key="sheet-contenido" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <ContentSheet
                post={contentTarget.post}
                creator={contentTarget.creator}
                onClose={() => { setContentTarget(null); setSheet(null); }}
                onBuy={async () => {
                  await createContentOrder(contentTarget.post, contentTarget.creator);
                  setContentTarget(null);
                  setSheet(null);
                }}
                onToast={notify}
              />
            </motion.div>
          )}
          {sheet === 'oficio' && myCreatorDoc && user && myDoc && (
            <motion.div key="sheet-oficio" className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <OficioSheet
                creator={myCreatorDoc}
                busy={oficioBusy}
                onClose={() => setSheet(null)}
                onSign={async (sig) => {
                  const ok = await signOficio(myCreatorDoc, sig);
                  if (ok) setSheet(null);
                }}
              />
            </motion.div>
          )}
          {sheet === 'reportar' && chatWith && user && myDoc && (
            <ReportSheet key="sheet-reportar"
              peer={chatWith}
              myDoc={myDoc}
              onClose={() => setSheet(null)}
              onToast={notify}
            />
          )}
        </AnimatePresence>

        {/* ---------------------- Panel Admin -------------------------- */}
        <AnimatePresence>
          {adminOpen && user && myDoc && (
            <AdminPanel
              onClose={() => setAdminOpen(false)}
              onToast={notify}
              myEmail={user.email}
              onRefresh={refreshCore}
              events={events}
              allUsers={allUsers}
            />
          )}
        </AnimatePresence>

        {/* ---------------------- Toast -------------------------------- */}
        <AnimatePresence>
          {toast && (
            <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
              <Sparkles size={16} /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// PESTAÑA MATCH
// ============================================================================

function MatchTab({ deck, vip, likesToday, onAct, matches, allUsers, myUid, onOpenChat, ratingAgg }: {
  deck: UserDoc[]; vip: boolean; likesToday: number;
  onAct: (target: UserDoc, action: 'like' | 'superlike' | 'pass') => Promise<void>;
  matches: MatchEntry[]; allUsers: UserDoc[]; myUid: string;
  onOpenChat: (peer: UserDoc) => void;
  ratingAgg: Map<string, { avg: number; count: number }>;
}) {
  const [seg, setSeg] = useState<'descubre' | 'mensajes'>('descubre');
  const [removed, setRemoved] = useState<string[]>([]);
  const cards = deck.filter((p) => !removed.includes(p.uid));
  const top = cards.slice(-3);
  const rest = cards.slice(0, -3);

  const fly = async (p: UserDoc, action: 'like' | 'superlike' | 'pass') => {
    setRemoved((r) => [...r, p.uid]);
    await onAct(p, action);
  };

  const chatRows = matches
    .map((m) => {
      const peerUid = m.users.find((u) => u !== myUid);
      const peer = allUsers.find((u) => u.uid === peerUid);
      return peer ? { m, peer } : null;
    })
    .filter((x): x is { m: MatchEntry; peer: UserDoc } => !!x)
    .filter(({ m }) => m.status !== 'cerrado' && !(m.hiddenFor ?? []).includes(myUid))
    .sort((a, b) => (b.m.lastTs ?? b.m.createdAt) - (a.m.lastTs ?? a.m.createdAt));

  if (seg === 'mensajes') {
    return (
      <>
        <div className="seg" style={{ marginBottom: 16 }}>
          <button onClick={() => setSeg('descubre')}>Descubre</button>
          <button className="on">Mensajes</button>
        </div>
        <p className="sub">Los mensajes se abren solo con interés mutuo.</p>
        {chatRows.length === 0 && (
          <div className="card" style={{ textAlign: 'center', marginTop: 20 }}>
            <MessageCircle size={28} color="var(--lila)" />
            <p className="muted" style={{ margin: '10px 0 0' }}>
              Aún no hay matches. Explora en Descubre y da like a quien te intriga.
            </p>
          </div>
        )}
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          {chatRows.map(({ m, peer }) => (
            <button key={m.id} className="card row" style={{ textAlign: 'left', gap: 12, padding: 14 }} onClick={() => onOpenChat(peer)}>
              <Avatar doc={peer} size={46} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="caps" style={{ display: 'block', fontSize: 16 }}>{peer.alias}</span>
                <span className="tiny" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.lastMessage || 'Di hola'}
                </span>
              </span>
              <span className="tiny">{ago(m.lastTs ?? m.createdAt)}</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className="on">Descubre</button>
        <button onClick={() => setSeg('mensajes')}>Mensajes</button>
      </div>
      {cards.length === 0 ? (
        <>
          <p className="sub">{vip ? 'Likes ilimitados' : `Te quedan ${Math.max(0, FREE_DAILY_LIKES - likesToday)} likes de hoy`}</p>
          <div className="card" style={{ textAlign: 'center', marginTop: 30 }}>
            <Users size={30} color="var(--lila)" />
            <p className="muted" style={{ margin: '10px 0 0' }}>
              Aún no hay perfiles para mostrar. La comunidad crece con personas reales: invita a quienes compartan esta vibra y vuelve pronto.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="row between">
            <div>
              <div className="h1">Descubre</div>
              <p className="sub" style={{ marginBottom: 0 }}>{vip ? 'Likes ilimitados · Ultra Plus' : `Te quedan ${Math.max(0, FREE_DAILY_LIKES - likesToday)} likes de hoy`}</p>
            </div>
          </div>
          <div className="deck">
            <AnimatePresence>
              {rest.map((p) => (
                <DeckCard key={p.uid} p={p} onFly={fly} behind rating={ratingAgg.get(p.uid)} />
              ))}
              {top.map((p, i) => (
                <DeckCard key={p.uid} p={p} onFly={fly} top={i === top.length - 1} rating={ratingAgg.get(p.uid)} />
              ))}
            </AnimatePresence>
          </div>
          {top.length > 0 && (
            <div className="actions">
              <button className="round bad" aria-label="Pasar" onClick={() => void fly(top[top.length - 1], 'pass')}>
                <X size={26} />
              </button>
              <button className="round star" aria-label="Superlike" onClick={() => void fly(top[top.length - 1], 'superlike')}>
                <Star size={24} fill="currentColor" />
              </button>
              <button className="round big" aria-label="Me gusta" onClick={() => void fly(top[top.length - 1], 'like')}>
                <Heart size={32} fill="currentColor" />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function DeckCard({ p, onFly, top, behind, rating }: {
  p: UserDoc; top?: boolean; behind?: boolean;
  onFly: (p: UserDoc, action: 'like' | 'superlike' | 'pass') => Promise<void>;
  rating?: { avg: number; count: number };
}) {
  const hue = hueFrom(p.uid + p.alias);
  const photo = p.photos?.[0] || null;
  return (
    <motion.div
      className="pcard"
      style={{ zIndex: behind ? 1 : 2 }}
      drag={top ? 'x' : false}
      dragElastic={0.7}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={top ? (_e, info) => {
    if (info.offset.x > 110) void onFly(p, 'like');
    else if (info.offset.x < -110) void onFly(p, 'pass');
  } : undefined}
      initial={{ scale: 0.96, y: 12, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileDrag={{ scale: 1.04 }}
    >
      {photo ? (
        <img src={photo} alt={p.alias} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Portrait hue={hue} />
      )}
      <div className="veil">
        <span className="pill"><span className="caps" style={{ fontSize: 22, color: 'var(--lila)' }}>{(p.alias || '?').slice(0, 1).toUpperCase()}</span></span>
        <span className="pill">{p.kind}</span>
      </div>
      <div className="pinfo">
        <div className="row between">
          <span className="pname">{p.alias}</span>
          <span className="pill">{p.age}</span>
        </div>
        {rating && rating.count > 0 && (
          <div className="row" style={{ gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Stars avg={rating.avg} count={rating.count} />
            <RatingBadge avg={rating.avg} count={rating.count} />
          </div>
        )}
        {(p.interests ?? []).length > 0 && (
          <div className="chips" style={{ marginTop: 10 }}>
            {p.interests.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
        {p.bio && <p className="line-clamp-2 small" style={{ margin: '10px 0 0', color: 'var(--muted)' }}>{p.bio}</p>}
      </div>
    </motion.div>
  );
}

// ============================================================================
// PESTAÑA PROPUESTAS
// ============================================================================

function PropuestasTab({ myUid, proposals, onApply, onToast, onOpenNew }: {
  myUid: string; proposals: ProposalDoc[];
  onApply: (p: ProposalDoc) => Promise<void>;
  onToast: (s: string) => void;
  onOpenNew: () => void;
}) {
  const pub = proposals.filter((p) => p.status === 'publicada').sort((a, b) => b.createdAt - a.createdAt);
  const mias = proposals.filter((p) => p.authorUid === myUid && p.status !== 'publicada').sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <div className="row between">
        <div>
          <div className="h1">Propuestas</div>
          <p className="sub" style={{ marginBottom: 0 }}>Planes con reglas claras.</p>
        </div>
        <button className="btn btn-neon btn-sm" onClick={onOpenNew}><Plus size={16} /> Publicar</button>
      </div>

      {mias.length > 0 && (
        <div className="stack" style={{ gap: 8, marginTop: 14 }}>
          {mias.map((p) => (
            <div key={p.id} className="card" style={{ padding: 12 }}>
              <div className="row between">
                <span className="caps small">{p.title}</span>
                <span className={'tag ' + (p.status === 'revision' ? 'warn' : 'bad')}>
                  {p.status === 'revision' ? 'En revisión' : 'Rechazada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pub.length === 0 && (
        <div className="card" style={{ textAlign: 'center', marginTop: 16 }}>
          <Sparkles size={30} color="var(--lila)" />
          <p className="muted" style={{ margin: '10px 0 0' }}>
            Aún no hay propuestas publicadas. La primera puede ser tuya: publica un plan con reglas claras y administración lo revisará.
          </p>
        </div>
      )}

      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {pub.map((p) => {
          const applied = (p.applies ?? []).includes(myUid);
          const mine = p.authorUid === myUid;
          return (
            <div key={p.id} className="card" style={{ padding: 14 }}>
              <div className="row between">
                <span className="tag">{p.cat}</span>
                <span className="tiny">{ago(p.createdAt)}</span>
              </div>
              <div className="caps" style={{ fontSize: 17, marginTop: 8 }}>
                {p.title}{mine && <span className="tiny" style={{ color: 'var(--lila)' }}> (tuya)</span>}
              </div>
              <p className="small" style={{ margin: '6px 0 0' }}>{p.body}</p>
              {p.rules && (
                <>
                  <div className="label" style={{ marginTop: 10 }}>Reglas</div>
                  <p className="small muted" style={{ margin: '4px 0 0' }}>{p.rules}</p>
                </>
              )}
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="tiny">De {p.authorAlias} · {(p.applies ?? []).length} aplicación(es)</span>
                {mine ? (
                  <span className="tag ok">Tuya</span>
                ) : applied ? (
                  <span className="tag ok"><BadgeCheck size={12} /> Aplicaste</span>
                ) : (
                  <button className="btn btn-neon btn-sm" onClick={() => void onApply(p)}>Aplicar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ProposalSheet({ onClose, onSubmit, onToast }: {
  onClose: () => void;
  onSubmit: (f: { cat: string; title: string; body: string; rules: string }) => Promise<boolean>;
  onToast: (s: string) => void;
}) {
  const [cat, setCat] = useState('Encuentro');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rules, setRules] = useState('');
  const [busy, setBusy] = useState(false);
  const CATS = ['Encuentro', 'Trío', 'Intercambio', 'Fiesta', 'Viaje', 'Otro'];

  const send = async () => {
    if (!title.trim() || !body.trim()) { onToast('Completa el título y la descripción.'); return; }
    setBusy(true);
    const ok = await onSubmit({ cat, title: title.trim(), body: body.trim(), rules: rules.trim() });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Nueva propuesta</div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>La revisa administración antes de publicarse.</p>
      <div className="chips" style={{ marginBottom: 12 }}>
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' sel' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <input className="field" placeholder="Título (60 caracteres)" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field" style={{ marginTop: 8 }} placeholder="Describe el plan: quiénes participan y qué buscan (600 caracteres)" value={body} maxLength={600} onChange={(e) => setBody(e.target.value)} />
      <textarea className="field" style={{ marginTop: 8 }} placeholder="Reglas: límites, consentimiento, condiciones (400 caracteres)" value={rules} maxLength={400} onChange={(e) => setRules(e.target.value)} />
      <button className="btn btn-neon full" style={{ marginTop: 12 }} disabled={busy} onClick={() => void send()}>
        {busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />} Enviar a revisión
      </button>
    </>
  );
}

/** Formulario de calificación mutua tras finalizar un chat (estrellas + comentario). */
function RatePeerForm({ onDone, onLater }: {
  onDone: (stars: number, comment: string) => Promise<void>;
  onLater: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (stars === 0) return;
    setBusy(true);
    await onDone(stars, comment);
    setBusy(false);
  };
  return (
    <div className="stack" style={{ gap: 10, marginTop: 10 }}>
      <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={n + ' estrellas'}
            onClick={() => setStars(n)}
            style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer' }}
          >
            <Star
              size={34}
              color={n <= stars ? 'var(--lila)' : 'var(--muted)'}
              fill={n <= stars ? 'currentColor' : 'none'}
              style={{ filter: n <= stars ? 'drop-shadow(0 0 8px rgba(199,125,255,.9))' : undefined }}
            />
          </button>
        ))}
      </div>
      <textarea
        className="field"
        placeholder="Comentario sobre tu experiencia (opcional, 300 caracteres)"
        value={comment}
        maxLength={300}
        onChange={(e) => setComment(e.target.value)}
      />
      <button className="btn btn-neon full" disabled={busy || stars === 0} onClick={() => void send()}>
        {busy ? <Loader2 size={18} className="spin" /> : <Star size={18} fill="currentColor" />} Calificar ahora
      </button>
      <button className="btn btn-ghost full" disabled={busy} onClick={onLater}>Más tarde</button>
    </div>
  );
}

/** Donación directa a una creadora: sin comisión; monto elegido + IVA. */
function DonationSheet({ creator, onClose, onSubmit, onToast }: {
  creator: CreatorDoc;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  onToast: (s: string) => void;
}) {
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!amount || amount < 20) { onToast('La donación mínima es $20 MXN.'); return; }
    setBusy(true);
    await onSubmit(amount);
    setBusy(false);
  };
  return (
    <>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Donar a @{creator.handle}</div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>
        Las donaciones llegan completas a la creadora: la plataforma no cobra comisión. Tú pagas el IVA; la creadora cubre su ISR.
      </p>
      <div className="chips" style={{ marginBottom: 10 }}>
        {[50, 100, 200, 500, 1000].map((n) => (
          <button key={n} className={'chip' + (amount === n ? ' sel' : '')} onClick={() => setAmount(n)}>${n}</button>
        ))}
      </div>
      <input
        className="field"
        inputMode="numeric"
        placeholder="Otro monto (MXN, mínimo 20)"
        value={amount || ''}
        onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '').slice(0, 7)))}
      />
      <div className="card" style={{ marginTop: 12, padding: 14, textAlign: 'center' }}>
        <div className="tiny" style={{ marginBottom: 4 }}>Pagas</div>
        <PriceIva base={amount} align="center" size={26} />
      </div>
      <button className="btn btn-neon full" style={{ marginTop: 12 }} disabled={busy} onClick={() => void send()}>
        {busy ? <Loader2 size={18} className="spin" /> : <Gift size={18} />} Donar por SPEI
      </button>
      <button className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>
    </>
  );
}

/** Compra de una pieza premium o ultra de una creadora (desbloqueo por pieza). */
function ContentSheet({ post, creator, onClose, onBuy, onToast }: {
  post: CreatorPostDoc;
  creator: CreatorDoc;
  onClose: () => void;
  onBuy: () => Promise<void>;
  onToast: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const ultra = post.tier === 'ultra';
  return (
    <>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>{ultra ? 'Contenido ultra exclusivo' : 'Contenido premium'}</div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>@{creator.handle} · {post.kind === 'video' ? 'Video' : 'Foto'}</p>
      <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        {post.kind === 'video' ? (
          <video src={post.image} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(.5)' }} />
        ) : (
          <img src={post.image} alt={post.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(.5)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span className="row" style={{ gap: 8, color: 'var(--soft)' }}><Lock size={22} /> {ultra ? 'Ultra exclusivo' : 'Premium'}</span>
        </div>
      </div>
      {post.caption && <p className="small muted" style={{ margin: '10px 0 0' }}>{post.caption}</p>}
      <div className="card" style={{ marginTop: 12, padding: 14, textAlign: 'center' }}>
        <div className="tiny" style={{ marginBottom: 4 }}>Pagas por ver</div>
        <PriceIva base={post.price} align="center" size={26} />
        <div className="tiny" style={{ marginTop: 6 }}>Tu pago incluye la comisión de plataforma y el IVA correspondientes.</div>
      </div>
      <button
        className="btn btn-neon full" style={{ marginTop: 12 }} disabled={busy}
        onClick={() => { setBusy(true); onBuy().finally(() => setBusy(false)); }}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <Lock size={18} />} Comprar acceso por SPEI
      </button>
      <button className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>
    </>
  );
}

/** Acuse de conocimiento fiscal firmable con lápiz digital (asumir el ISR ante el SAT). */
function OficioSheet({ creator, busy, onClose, onSign }: {
  creator: CreatorDoc;
  busy: boolean;
  onClose: () => void;
  onSign: (signature: string) => Promise<boolean>;
}) {
  const [sig, setSig] = useState<string | null>(null);
  return (
    <>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Acuse de responsabilidad fiscal</div>
      <p className="muted small" style={{ margin: '4px 0 10px' }}>
        Por defecto la plataforma retiene tu ISR para cubrir tu parte fiscal. Si prefieres asumirlo tú, lee y firma este acuse.
      </p>
      <div
        className="card"
        style={{ maxHeight: '42vh', overflowY: 'auto', padding: 16, fontSize: 13, lineHeight: 1.5 }}
      >
        <div className="tiny" style={{ letterSpacing: '.2em', marginBottom: 8, color: 'var(--lila)' }}>APP<b>SWINGUER</b> · DOCUMENTO INFORMATIVO</div>
        <p><b>Acuse de conocimiento y responsabilidad fiscal.</b></p>
        <p>Yo, <b>{creator.name}</b>, creadora de contenido registrada en AppSwinguer con el usuario <b>@{creator.handle}</b>, declaro que:</p>
        <p><b>1.</b> Soy mayor de edad y el contenido que publico es de mi autoría, lícito y publicado con mi consentimiento.</p>
        <p><b>2.</b> La plataforma no es mi representante legal ni fiscal, y no forma parte de mi relación con las autoridades fiscales.</p>
        <p><b>3.</b> Soy la única responsable de declarar y pagar mis impuestos, en particular el ISR, ante el Servicio de Administración Tributaria (SAT), por la totalidad de los ingresos que obtenga a través de la plataforma.</p>
        <p><b>4.</b> Al firmar este acuse, la plataforma dejará de retener el ISR correspondiente a mis ingresos, y el cumplimiento de dichas obligaciones dentro de los plazos legales será mi responsabilidad directa.</p>
        <p><b>5.</b> Puedo solicitar a la plataforma facturas por las comisiones y membresías que pague.</p>
        <p><b>6.</b> Este documento es informativo y de conocimiento; no constituye asesoría legal, contable ni fiscal, y no sustituye la normativa aplicable.</p>
        <p className="tiny muted">Fecha de firma: {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div style={{ marginTop: 12 }}>
        <SignaturePad onSignature={setSig} />
      </div>
      <button
        className="btn btn-neon full" style={{ marginTop: 10 }} disabled={busy || !sig}
        onClick={() => { if (sig) void onSign(sig); }}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <Pencil size={18} />} Firmar y asumir mi ISR
      </button>
      <button className="btn btn-ghost full" style={{ marginTop: 8 }} onClick={onClose}>Conservar retención de ISR</button>
    </>
  );
}

// ============================================================================
// PESTAÑA VIRTUAL (CREADORAS)
// ============================================================================

const readFileData = (f: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('reader'));
    r.readAsDataURL(f);
  });

function VirtualTab({ myDoc, creators, posts, mySubs, myUnlocks, ratingAgg, onToast, onSubscribe, onBuyContent, onDonate, onRegister, onUpload, onMembership, onOpenOficio, onRequestFactura, onOpenExplicit }: {
  myDoc: UserDoc;
  creators: CreatorDoc[];
  posts: CreatorPostDoc[];
  mySubs: CreatorSubDoc[];
  myUnlocks: UnlockDoc[];
  ratingAgg: Map<string, { avg: number; count: number }>;
  onToast: (s: string) => void;
  onSubscribe: (c: CreatorDoc) => Promise<void>;
  onBuyContent: (post: CreatorPostDoc, creator: CreatorDoc) => void;
  onDonate: (c: CreatorDoc) => void;
  onRegister: (f: { name: string; handle: string; bio: string; price: number }) => Promise<boolean>;
  onUpload: (creator: CreatorDoc, media: string, kind: 'foto' | 'video', caption: string, tier: 'gratis' | 'premium' | 'ultra', price: number) => Promise<boolean>;
  onMembership: (creator: CreatorDoc, plan: typeof CREATOR_PLANS[number]) => Promise<void>;
  onOpenOficio: () => void;
  onRequestFactura: (c: CreatorDoc) => void;
  onOpenExplicit: (post: CreatorPostDoc) => void;
}) {
  const [seg, setSeg] = useState<'creadoras' | 'subir'>('creadoras');
  const [busy, setBusy] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const activas = creators.filter((c) => c.status === 'activa');
  const myCreator = creators.find((c) => c.userUid === myDoc.uid);
  const myPosts = myCreator ? posts.filter((p) => p.creatorId === myCreator.id).sort((a, b) => b.createdAt - a.createdAt) : [];

  // Estado del registro de creadora.
  const [fName, setFName] = useState('');
  const [fHandle, setFHandle] = useState('');
  const [fBio, setFBio] = useState('');
  const [fPrice, setFPrice] = useState(0);
  // Estado de la publicación de contenido.
  const [tier, setTier] = useState<'gratis' | 'premium' | 'ultra'>('gratis');
  const [mediaKind, setMediaKind] = useState<'foto' | 'video'>('foto');
  const [media, setMedia] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState(0);

  const tierOf = (p: CreatorPostDoc) => p.tier ?? (p.premium ? 'premium' : 'gratis');
  const counts = {
    gratis: myPosts.filter((p) => tierOf(p) === 'gratis').length,
    premium: myPosts.filter((p) => tierOf(p) === 'premium').length,
    ultra: myPosts.filter((p) => tierOf(p) === 'ultra').length,
  };

  const onMedia = async (f: File) => {
    try {
      if (mediaKind === 'video') {
        if (f.size > CREATOR_VIDEO_MAX_BYTES) { onToast('El video debe pesar menos de 8 MB.'); return; }
        setMedia(await readFileData(f));
      } else {
        setMedia(await compressImage(f));
      }
    } catch { onToast('No fue posible procesar el archivo.'); }
  };

  const sendRegister = async () => {
    if (!fName.trim() || !fHandle.trim()) { onToast('Completa el nombre y el usuario.'); return; }
    setBusy(true);
    const ok = await onRegister({ name: fName, handle: fHandle, bio: fBio, price: fPrice });
    setBusy(false);
    if (ok) { setFName(''); setFHandle(''); setFBio(''); setFPrice(0); }
  };

  const sendPost = async () => {
    if (!myCreator) return;
    if (!media) { onToast('Elige una foto o un video.'); return; }
    if (!caption.trim()) { onToast('Agrega una descripción.'); return; }
    if (tier === 'ultra' && mediaKind !== 'video') { onToast('El contenido ultra exclusivo es forzosamente video.'); return; }
    if (tier !== 'gratis' && !price) { onToast('Asigna el costo por ver este contenido.'); return; }
    if (tier === 'gratis' && counts.gratis >= CREATOR_FREE_POSTS) { onToast('Ya subiste tus 3 fotos gratis.'); return; }
    if (tier === 'premium' && counts.premium >= CREATOR_PREMIUM_POSTS) { onToast('Alcanzaste el límite de 10 publicaciones premium.'); return; }
    if (tier === 'ultra' && counts.ultra >= CREATOR_ULTRA_POSTS) { onToast('Alcanzaste el límite de publicaciones ultra.'); return; }
    setBusy(true);
    const ok = await onUpload(myCreator, media, mediaKind, caption, tier, price);
    setBusy(false);
    if (ok) { setMedia(null); setCaption(''); setPrice(0); setTier('gratis'); setMediaKind('foto'); }
  };

  // ---------------------------------------------------------------- Subir ----
  if (seg === 'subir') {
    return (
      <>
        <div className="seg" style={{ marginBottom: 16 }}>
          <button onClick={() => setSeg('creadoras')}>Creadoras</button>
          <button className="on">Subir</button>
        </div>
        {(!myCreator || myCreator.status === 'rechazada') ? (
          <>
            {myCreator?.status === 'rechazada' && (
              <p className="small" style={{ color: 'var(--bad)' }}>Tu registro anterior fue rechazado. Puedes enviar uno nuevo.</p>
            )}
            {!showRegisterForm && (
              <div className="card">
                <div className="label" style={{ marginBottom: 8 }}>Ser creadora: cómo funciona</div>
                <p className="small muted" style={{ margin: '0 0 10px' }}>
                  Antes de crear tu perfil, conoce las reglas de esta parte:
                </p>
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Sparkles size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">Publicar es gratuito. Tus {CREATOR_FREE_POSTS} primeras fotos son gratis para que más personas conozcan tu contenido.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Upload size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">Tienes derecho a subir hasta {CREATOR_PREMIUM_POSTS} fotos o videos premium con costo por ver, asignado por ti, y contenido ultra exclusivo (forzosamente video íntimo) con tu propio precio.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Coins size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">El acceso para crear es gratis: cubres una comisión del 15% sobre lo que ganes. El IVA de la comisión lo cubre quien compra, no tú.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><FileCheck2 size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">ISR: por defecto la plataforma lo retiene para cubrir tu parte fiscal y puedes solicitar facturas. Si prefieres, puedes asumir tu ISR ante el SAT firmando un acuse digital con lápiz.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Crown size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">Alternativa sin comisión: una membresía mensual (de $2,000 a $15,000 MXN según tus entradas) te deja conservar todas tus ganancias; quien compra tu contenido solo paga IVA.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><Gift size={16} color="var(--lila)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small">Donaciones: tu perfil muestra un botón de donación. Las donaciones no pagan comisión; solo IVA (quien dona) y tu ISR.</span>
                  </div>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><AlertTriangle size={16} color="var(--warn)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span className="small muted">Todo tu contenido pasa moderación antes de publicarse y se muestra tras un aviso de contenido explícito 18+.</span>
                  </div>
                  <button className="btn btn-neon full" onClick={() => setShowRegisterForm(true)}>
                    <Star size={18} /> Continuar al registro
                  </button>
                </div>
              </div>
            )}
            {showRegisterForm && (
              <div className="card">
                <div className="label" style={{ marginBottom: 8 }}>Registro de creadora</div>
                <p className="muted small" style={{ margin: '0 0 12px' }}>
                  Requiere INE aprobada. Tu suscripción mensual es tu precio base; quien te contrate paga ese precio con la comisión y el IVA ya incluidos en el total.
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  <input className="field" placeholder="Nombre público" value={fName} maxLength={40} onChange={(e) => setFName(e.target.value)} />
                  <input className="field" placeholder="Usuario (ej. luna)" value={fHandle} maxLength={24} onChange={(e) => setFHandle(e.target.value)} />
                  <textarea className="field" placeholder="Descripción de tu contenido (300 caracteres)" value={fBio} maxLength={300} onChange={(e) => setFBio(e.target.value)} />
                  <input className="field" inputMode="numeric" placeholder="Suscripción mensual (MXN)" value={fPrice || ''} onChange={(e) => setFPrice(Number(e.target.value.replace(/\D/g, '').slice(0, 6)))} />
                  <button className="btn btn-neon full" disabled={busy} onClick={() => void sendRegister()}>
                    {busy ? <Loader2 size={18} className="spin" /> : <Star size={18} />} Enviar registro
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card">
              <div className="row between">
                <span className="caps" style={{ fontSize: 16 }}>{myCreator.name}</span>
                <span className={'tag ' + (myCreator.status === 'activa' ? 'ok' : 'warn')}>
                  {myCreator.status === 'activa' ? 'Activa' : 'En revisión'}
                </span>
              </div>
              <p className="tiny" style={{ margin: '4px 0 0' }}>@{myCreator.handle} · Suscripción ${myCreator.price}/mes</p>
            </div>

            {myCreator.status === 'activa' && (
              <>
                {/* Ganancias y fiscal */}
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="row between">
                    <span className="label">Tus ganancias</span>
                    <span className="caps" style={{ fontSize: 18, textShadow: 'var(--glow)' }}>${(myCreator.earnings ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '6px 0 0' }}>
                    Comisión: 15% por venta (o membresía sin comisión). IVA de la comisión: lo cubre quien compra. Facturas: puedes solicitarlas.
                  </p>
                  <div className="row between" style={{ marginTop: 8 }}>
                    <span className="tiny">ISR</span>
                    <span className={'tag ' + (myCreator.isrAssumed ? 'warn' : 'ok')}>
                      {myCreator.isrAssumed ? 'Asumido por ti ante el SAT' : 'Retenido por la plataforma'}
                    </span>
                  </div>
                  <div className="grid2" style={{ gap: 8, marginTop: 10 }}>
                    {!myCreator.isrAssumed && (
                      <button className="btn btn-dark btn-sm" onClick={onOpenOficio}><Pencil size={15} /> Asumir mi ISR</button>
                    )}
                    <button className="btn btn-dark btn-sm" onClick={() => onRequestFactura(myCreator!)}><FileCheck2 size={15} /> Solicitar factura</button>
                  </div>
                </div>

                {/* Membresía sin comisiones */}
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="row between">
                    <span className="label">Membresía sin comisiones</span>
                    {(myCreator.membershipUntil ?? 0) > Date.now() ? <span className="tag ok">Vigente</span> : <span className="tag">Sin membresía</span>}
                  </div>
                  {(myCreator.membershipUntil ?? 0) > Date.now() ? (
                    <p className="tiny" style={{ margin: '8px 0 0' }}>
                      Plan {CREATOR_PLANS.find((p) => p.id === myCreator!.membershipPlan)?.name ?? 'de creadora'} vigente hasta{' '}
                      {new Date(myCreator.membershipUntil!).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}. Sin comisión por venta: tus ganancias quedan completas contigo.
                    </p>
                  ) : (
                    <>
                      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
                        Con membresía evitas la comisión por cada venta y el IVA de la comisión. Quien compra tu contenido solo paga IVA. Elige tu plan según tus entradas mensuales.
                      </p>
                      <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                        {CREATOR_PLANS.map((plan) => (
                          <div key={plan.id} className="row between card" style={{ padding: '10px 12px', background: 'var(--s1)' }}>
                            <div style={{ minWidth: 0 }}>
                              <span className="caps small">{plan.name}</span>
                              <span className="tiny" style={{ display: 'block' }}>{plan.cap}</span>
                              <span className="tiny" style={{ display: 'block', color: 'var(--lila)' }}>≈ ${plan.usd} USD comunidad EE. UU.</span>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <PriceIva base={plan.price} size={18} />
                              <button className="btn btn-neon btn-sm" style={{ marginTop: 6 }} disabled={busy} onClick={() => void onMembership(myCreator!, plan)}>Contratar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Publicar contenido */}
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Publicar contenido</div>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <span className="tiny">Gratis {counts.gratis}/{CREATOR_FREE_POSTS} · Premium {counts.premium}/{CREATOR_PREMIUM_POSTS} · Ultra {counts.ultra}/{CREATOR_ULTRA_POSTS}</span>
                  </div>
                  <div className="chips" style={{ marginBottom: 8 }}>
                    {(['gratis', 'premium', 'ultra'] as const).map((t) => (
                      <button key={t} className={'chip' + (tier === t ? ' sel' : '')} onClick={() => { setTier(t); if (t === 'ultra') setMediaKind('video'); }}>
                        {t === 'gratis' ? 'Gratis (3)' : t === 'premium' ? 'Premium (10)' : 'Ultra (video)'}
                      </button>
                    ))}
                  </div>
                  <div className="chips" style={{ marginBottom: 8 }}>
                    {(['foto', 'video'] as const).map((k) => (
                      <button
                        key={k}
                        className={'chip' + (mediaKind === k ? ' sel' : '')}
                        onClick={() => setMediaKind(k)}
                        disabled={tier === 'ultra' && k === 'foto'}
                      >
                        {k === 'foto' ? 'Foto' : 'Video (máx. 8 MB)'}
                      </button>
                    ))}
                  </div>
                  {media ? (
                    <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                      {mediaKind === 'video' ? (
                        <video src={media} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={media} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <button className="iconbtn" aria-label="Quitar archivo" style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32 }} onClick={() => setMedia(null)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <FileButton className="btn btn-dark btn-sm full" style={{ aspectRatio: '3/4', borderRadius: 12 }} accept={mediaKind === 'video' ? 'video/*' : 'image/*'} onFiles={(f) => void onMedia(f)}>
                      <div style={{ display: 'grid', placeItems: 'center', gap: 4 }}>
                        {mediaKind === 'video' ? <Video size={22} color="var(--lila)" /> : <ImagePlus size={22} color="var(--lila)" />}
                        <span className="tiny">Elegir {mediaKind === 'video' ? 'video' : 'imagen'}</span>
                      </div>
                    </FileButton>
                  )}
                  <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                    <input className="field" placeholder="Descripción (200 caracteres)" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} />
                    {tier !== 'gratis' && (
                      <input className="field" inputMode="numeric" placeholder="Costo por ver (MXN)" value={price || ''} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, '').slice(0, 6)))} />
                    )}
                    {tier === 'gratis' && (
                      <p className="tiny muted" style={{ margin: 0 }}>Las fotos gratis se muestran a toda la comunidad tras el aviso de contenido explícito 18+.</p>
                    )}
                    <button className="btn btn-neon full" disabled={busy} onClick={() => void sendPost()}>
                      {busy ? <Loader2 size={18} className="spin" /> : <Upload size={18} />} Enviar a moderación
                    </button>
                  </div>
                </div>

                {/* Mis publicaciones */}
                {myPosts.length > 0 && (
                  <>
                    <div className="row between" style={{ margin: '16px 0 8px' }}>
                      <span className="label">Mis publicaciones</span>
                      <span className="tiny">{myPosts.length}</span>
                    </div>
                    <div className="stack" style={{ gap: 8 }}>
                      {myPosts.map((p) => (
                        <div key={p.id} className="card" style={{ padding: 12 }}>
                          <div className="row between">
                            <span className="tiny" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span className="tag" style={{ marginRight: 6 }}>{tierOf(p) === 'gratis' ? 'Gratis' : tierOf(p) === 'premium' ? 'Premium' : 'Ultra'}</span>
                              {p.caption}
                            </span>
                            <span className={'tag ' + (p.status === 'publicado' ? 'ok' : p.status === 'revision' ? 'warn' : 'bad')}>
                              {p.status === 'publicado' ? 'Publicado' : p.status === 'revision' ? 'En revisión' : 'Rechazado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </>
    );
  }

  // ------------------------------------------------------------- Creadoras ---
  return (
    <>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className="on">Creadoras</button>
        <button onClick={() => setSeg('subir')}>Subir</button>
      </div>
      {activas.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <Star size={30} color="var(--lila)" />
          <p className="muted" style={{ margin: '10px 0 0' }}>
            Aún no hay creadoras verificadas. Si deseas ser creadora, regístrate en el segmento Subir.
          </p>
        </div>
      )}
      {activas.map((c) => {
        const cPosts = posts.filter((p) => p.creatorId === c.id && p.status === 'publicado').sort((a, b) => b.createdAt - a.createdAt);
        const sub = mySubs.find((s) => s.creatorId === c.id && s.until > Date.now());
        const cRating = ratingAgg.get(c.userUid);
        return (
          <div key={c.id} className="card" style={{ padding: 14, marginTop: 12 }}>
            <div className="row" style={{ gap: 12 }}>
              <div
                className="caps"
                style={{ width: 52, height: 52, borderRadius: 14, background: `hsl(${hueFrom(c.id)} 45% 22%)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}
              >
                <span style={{ fontSize: 22, color: 'var(--lila)' }}>{(c.name || '?').slice(0, 1).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="caps" style={{ fontSize: 17 }}>{c.name}</span>
                  <CreatorBadge />
                  {sub && <span className="tag ok"><BadgeCheck size={12} /> Suscrito</span>}
                </div>
                <div className="tiny">@{c.handle}</div>
                {cRating && <div style={{ marginTop: 2 }}><Stars avg={cRating.avg} count={cRating.count} /></div>}
                {c.bio && <p className="small muted" style={{ margin: '6px 0 0' }}>{c.bio}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="tiny" style={{ marginBottom: 2 }}>Suscripción</div>
                <PriceIva
                  base={c.price}
                  total={Math.round(c.price * (1 + CREATOR_COMMISSION) * (1 + IVA) * 100) / 100}
                  size={17}
                />
              </div>
            </div>
            <div className="grid2" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void onSubscribe(c)}>
                {sub ? 'Suscripción activa' : 'Suscribirme'}
              </button>
              <button className="btn btn-dark btn-sm" onClick={() => onDonate(c)}><Gift size={15} /> Donar</button>
            </div>
            {cPosts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 12 }}>
                {cPosts.map((p) => {
                  const pTier = tierOf(p);
                  const unlocked =
                    pTier === 'gratis' ||
                    myUnlocks.some((u) => u.postId === p.id) ||
                    (pTier === 'premium' && !!sub);
                  const locked = pTier !== 'gratis' && !unlocked;
                  return (
                    <button
                      key={p.id}
                      style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#000', padding: 0, border: 'none' }}
                      onClick={() => {
                        if (locked) onBuyContent(p, c);
                        else onOpenExplicit(p);
                      }}
                    >
                      {p.kind === 'video' ? (
                        <video src={p.image} muted style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'blur(16px) brightness(.55)' : 'blur(14px) brightness(.7)' }} />
                      ) : (
                        <img src={p.image} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'blur(16px) brightness(.55)' : 'blur(14px) brightness(.7)' }} />
                      )}
                      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                        {locked ? (
                          <span className="tiny" style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--soft)' }}>
                            <Lock size={13} /> ${p.price}
                            {pTier === 'ultra' ? ' · Ultra' : ''}
                          </span>
                        ) : (
                          <span className="tiny" style={{ display: 'flex', gap: 4, alignItems: 'center', color: 'var(--soft)' }}>
                            <EyeOff size={13} /> 18+
                          </span>
                        )}
                      </span>
                      {p.kind === 'video' && (
                        <span style={{ position: 'absolute', top: 4, left: 4 }} className="tiny"><Video size={12} /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}


// ============================================================================
// PESTAÑA EVENTOS
// ============================================================================

function EventsTab({ events, passes, onOpenEvent, onToast }: {
  events: EventDoc[]; passes: PassDoc[];
  onOpenEvent: (ev: EventDoc) => void; onToast: (s: string) => void;
}) {
  return (
    <>
      <div className="h1">Eventos</div>
      <p className="sub">Fiestas y encuentros publicados por administración.</p>

      {passes.length > 0 && (
        <>
          <div className="label" style={{ margin: '8px 0 10px' }}>Mis pases</div>
          <div className="stack" style={{ gap: 10, marginBottom: 20 }}>
            {passes.slice(0, 3).map((pass) => (
              <div key={pass.id} className="ticket">
                <div className="top">
                  <div className="tiny" style={{ color: '#4a2a66' }}>{pass.eventDate} · {pass.eventTime}</div>
                  <div className="caps" style={{ fontSize: 20, marginTop: 2 }}>{pass.eventTitle}</div>
                  <div className="row between" style={{ marginTop: 8 }}>
                    <span className="tiny" style={{ color: '#4a2a66' }}>{pass.eventZone}</span>
                    <span className="tag" style={{ background: '#12051f', color: '#f5eeff' }}>{pass.status}</span>
                  </div>
                </div>
                <div className="perf" />
                <div className="stub">
                  <span className="code" style={{ fontSize: 18 }}>{pass.code}</span>
                  <Ticket size={22} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <CalendarDays size={30} color="var(--lila)" />
          <p className="muted" style={{ margin: '10px 0 0' }}>
            Aún no hay eventos publicados. Cuando administración verifique una fiesta o encuentro, aparecerá aquí con su entrada y pases VIP.
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {events.map((ev) => {
            const left = Math.max(0, ev.cap - (ev.sold ?? 0));
            return (
              <button key={ev.id} className="card" style={{ textAlign: 'left', padding: 0, overflow: 'hidden' }} onClick={() => onOpenEvent(ev)}>
                <div className="cover">
                  <Portrait hue={ev.hue ?? hueFrom(ev.id)} blur />
                  <CalendarDays size={30} color="var(--lila)" style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
                </div>
                <div style={{ padding: '14px 18px 18px' }}>
                  <div className="label" style={{ fontSize: 13 }}>{ev.theme}</div>
                  <div className="caps" style={{ fontSize: 22, margin: '4px 0 6px' }}>{ev.title}</div>
                  <div className="row between">
                    <span className="muted small">{ev.date} · {ev.zone}</span>
                    <span className="ui" style={{ fontWeight: 800, fontSize: 15 }}>{ev.price > 0 ? 'desde ' + money(ev.price) : 'Gratis'}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--s3)', marginTop: 12 }}>
                    <div style={{ height: 4, borderRadius: 2, width: `${100 - (left / ev.cap) * 100}%`, background: 'var(--lila)', boxShadow: 'var(--glow)' }} />
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>
                    {left > 0 ? `Quedan ${left} de ${ev.cap} lugares` : 'Cupo lleno'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function EventSheet({ ev, hasPass, onClose, onReserve }: {
  ev: EventDoc; hasPass: boolean; onClose: () => void; onReserve: (ev: EventDoc) => void;
}) {
  const total = Math.round(ev.price * (1 + IVA) * 100) / 100;
  const left = Math.max(0, ev.cap - (ev.sold ?? 0));
  return (
    <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
      <div className="grab" />
      <div className="label">{ev.theme}</div>
      <div className="caps" style={{ fontSize: 28, margin: '4px 0 6px' }}>{ev.title}</div>
      <div className="muted small">{ev.date} · {ev.time} · {ev.zone}</div>
      <div className="muted small" style={{ marginTop: 2 }}>Organiza: {ev.organizer}</div>
      {(ev.reqs ?? []).length > 0 && (
        <>
          <div className="label" style={{ margin: '16px 0 8px' }}>Requisitos</div>
          <div className="stack" style={{ gap: 6 }}>
            {ev.reqs.map((r) => (
              <div key={r} className="row small"><BadgeCheck size={16} color="var(--lila)" /> {r}</div>
            ))}
          </div>
        </>
      )}
      <div className="card row" style={{ marginTop: 16, gap: 10, padding: 14 }}>
        <Lock size={18} color="var(--lila)" />
        <span className="small">La dirección exacta se comparte solo con asistentes confirmados.</span>
      </div>
      {ev.price > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <PriceIva base={ev.price} total={total} align="center" size={26} />
        </div>
      )}
      {hasPass ? (
        <div className="card row" style={{ marginTop: 16, gap: 10, padding: 14 }}>
          <Ticket size={18} color="var(--ok)" />
          <span className="small">Ya cuentas con un pase activo para este evento. Consulta tu pase en la pestaña Eventos.</span>
        </div>
      ) : left <= 0 ? (
        <button className="btn btn-dark full" style={{ marginTop: 16 }} disabled>
          <AlertTriangle size={18} /> Cupo lleno
        </button>
      ) : (
        <button className="btn btn-neon full" style={{ marginTop: 16 }} onClick={() => onReserve(ev)}>
          <Banknote size={18} /> {ev.price > 0 ? 'Pagar entrada por SPEI' : 'Reservar lugar gratis'}
        </button>
      )}
      <p className="tiny" style={{ textAlign: 'center', marginTop: 8 }}>Presenta tu pase VIP y tu identificación en el acceso.</p>
    </motion.div>
  );
}

// ============================================================================
// PESTAÑA PAGO (SPEI)
// ============================================================================

function PayTab({ myDoc, orders, pricing, bank, onBuy, onOpenOrder, onToast }: {
  myDoc: UserDoc; orders: SpeiOrder[];
  pricing: ReturnType<typeof getPlanPricing>;
  bank: SpeiBankConfig;
  onBuy: (plan: 'plus' | 'ultra') => Promise<void>;
  onOpenOrder: (o: SpeiOrder) => void;
  onToast: (s: string) => void;
}) {
  const vipActive = isVip(myDoc);
  return (
    <>
      <div className="h1">Pago SPEI</div>
      <p className="sub">Suscripción y entradas por transferencia bancaria. Sin tarjetas.</p>

      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {vipActive ? <Crown size={30} color="var(--lila)" /> : <CreditCard size={30} color="var(--lila)" />}
        <div style={{ flex: 1 }}>
          <div className="caps" style={{ fontSize: 18 }}>{vipLabel(myDoc)}</div>
          {vipActive ? (
            <div className="tiny">Vigente hasta {new Date(myDoc.premiumUntil!).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</div>
          ) : (
            <div className="tiny">Plan gratuito · {FREE_DAILY_LIKES} likes al día</div>
          )}
        </div>
        {vipActive && <span className="tag ok"><BadgeCheck size={12} /> Activo</span>}
      </div>

      <div className="label" style={{ margin: '20px 0 10px' }}>Planes</div>
      <div className="stack" style={{ gap: 10 }}>
        {(['plus', 'ultra'] as const).map((plan) => {
          const price = pricing[plan];
          return (
            <div key={plan} className="card">
              <div className="row between">
                <div>
                  <div className="caps" style={{ fontSize: 19 }}>{plan === 'plus' ? 'VIP Plus' : 'Ultra VIP'}</div>
                  <div className="tiny">{plan === 'plus' ? '15 días · likes ilimitados' : '1 mes · likes ilimitados + insignia'}</div>
                </div>
                <PriceIva base={price.base} total={price.total} size={24} />
              </div>
              <button className="btn btn-neon full" style={{ marginTop: 12 }} onClick={() => void onBuy(plan)}>
                <Banknote size={18} /> Pagar por SPEI
              </button>
            </div>
          );
        })}
      </div>

      <div className="label" style={{ margin: '20px 0 10px' }}>Mis órdenes SPEI</div>
      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <Banknote size={26} color="var(--lila)" />
          <p className="muted small" style={{ margin: '8px 0 0' }}>Sin órdenes todavía. Tus transferencias y su estado aparecerán aquí.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {orders.map((o) => {
            const expiredPending = o.status === 'pendiente' && o.expiresAt < Date.now();
            return (
              <button key={o.id} className="card row" style={{ textAlign: 'left', gap: 12, padding: 14 }} onClick={() => onOpenOrder(o)}>
                <span className="thumb" style={{ display: 'grid', placeItems: 'center' }}><Banknote size={20} color="var(--lila)" /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="caps" style={{ display: 'block', fontSize: 15 }}>{o.label}</span>
                  <span className="tiny" style={{ display: 'block' }}>{o.reference} · {money(o.amount)}</span>
                </span>
                <StatusTagOrder status={expiredPending ? 'expirado' : o.status} />
              </button>
            );
          })}
        </div>
      )}

      <p className="tiny" style={{ marginTop: 16, textAlign: 'center' }}>
        Banco receptor: {bank.bank} · Beneficiario: {bank.beneficiary}
      </p>
    </>
  );
}

function SpeiOrderSheet({ order, bank, onToast, onReport, onClose }: {
  order: SpeiOrder; bank: SpeiBankConfig;
  onToast: (s: string) => void; onReport: () => void; onClose: () => void;
}) {
  const [left, setLeft] = useState(Math.max(0, order.expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, order.expiresAt - Date.now())), 1000);
    return () => clearInterval(t);
  }, [order.expiresAt]);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const expired = left <= 0 && order.status === 'pendiente';

  return (
    <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Transferencia SPEI</div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>{order.label}</p>

      <div className="card" style={{ textAlign: 'center', boxShadow: 'inset 0 0 0 1.5px var(--lila), var(--glow)' }}>
        <div className="tiny">Monto exacto a transferir</div>
        <div className="caps" style={{ fontSize: 32, marginTop: 4 }}>{money(order.amount)}</div>
        <div className="tiny" style={{ marginTop: 4 }}>IVA incluido · sin cargos ocultos</div>
      </div>

      {order.status === 'pendiente' && !expired && (
        <div className="row" style={{ justifyContent: 'center', margin: '10px 0' }}>
          <span className="tag warn"><Clock size={12} /> Completa tu transferencia en {mm}:{String(ss).padStart(2, '0')}</span>
        </div>
      )}
      {expired && (
        <div className="row" style={{ justifyContent: 'center', margin: '10px 0' }}>
          <span className="tag bad">Ventana de pago expirada. Genera una nueva orden.</span>
        </div>
      )}

      <div className="stack" style={{ gap: 8, marginTop: 6 }}>
        <CopyRow label="Banco" value={bank.bank} onToast={onToast} />
        <CopyRow label="CLABE" value={formatClabe(bank.clabe)} onToast={onToast} />
        <CopyRow label="Beneficiario" value={bank.beneficiary} onToast={onToast} />
        <CopyRow label="Concepto (cópialo exacto)" value={order.concept} onToast={onToast} />
        <CopyRow label="Referencia de pago" value={order.reference} onToast={onToast} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label" style={{ marginBottom: 8 }}>Cómo pagar</div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row small" style={{ gap: 8 }}><span className="caps" style={{ color: 'var(--lila)' }}>1</span> Abre tu app bancaria y elige transferir con SPEI.</div>
          <div className="row small" style={{ gap: 8 }}><span className="caps" style={{ color: 'var(--lila)' }}>2</span> Pega la CLABE y el monto exacto.</div>
          <div className="row small" style={{ gap: 8 }}><span className="caps" style={{ color: 'var(--lila)' }}>3</span> Pega el concepto completo, tal cual. Tu referencia viaja ahí.</div>
          <div className="row small" style={{ gap: 8 }}><span className="caps" style={{ color: 'var(--lila)' }}>4</span> Regresa aquí y pulsa "Ya pagué" para acelerar la validación.</div>
        </div>
      </div>

      {(order.timeline ?? []).length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Seguimiento</div>
          <div className="stack" style={{ gap: 6 }}>
            {order.timeline.map((tl, i) => (
              <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <span className="tiny" style={{ flex: 'none' }}>{ago(tl.ts)}</span>
                <span className="small">{tl.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.status === 'pendiente' && !expired && (
        <button className="btn btn-neon full" style={{ marginTop: 14 }} onClick={onReport}>
          <FileCheck2 size={18} /> Ya realicé la transferencia
        </button>
      )}
      <button className="btn btn-dark full" style={{ marginTop: 10 }} onClick={onClose}>Cerrar</button>
    </motion.div>
  );
}

// ============================================================================
// PESTAÑA PERFIL
// ============================================================================

function ProfileTab(props: {
  myDoc: UserDoc;
  isAdmin: boolean;
  passesCount: number;
  onOpenIne: () => void;
  onOpenEdit: () => void;
  onGoPago: () => void;
  onOpenForo: () => void;
  onOpenAvisos: () => void;
  onOpenAdmin: () => void;
  onToast: (s: string) => void;
  onSaved: (doc: Partial<UserDoc>) => Promise<void>;
  onPhoto: (file: File, kind: 'avatar' | 'gallery') => Promise<void>;
  onRemovePhoto: (idx: number) => Promise<void>;
  onLogout: () => Promise<void>;
  myRating?: { avg: number; count: number };
  isCreatorVerified?: boolean;
}) {
  const { myDoc } = props;
  return (
    <>
      <div className="h1">{myDoc.alias}</div>
      <p className="sub">{myDoc.kind} · {myDoc.age} años</p>

      {(props.myRating?.count ?? 0) > 0 && (
        <div className="row" style={{ gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Stars avg={props.myRating!.avg} count={props.myRating!.count} />
          <RatingBadge avg={props.myRating!.avg} count={props.myRating!.count} />
          {props.isCreatorVerified && <CreatorBadge />}
        </div>
      )}
      {props.isCreatorVerified && (props.myRating?.count ?? 0) === 0 && (
        <div style={{ marginBottom: 14 }}><CreatorBadge /></div>
      )}

      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar doc={myDoc} size={64} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row wrap" style={{ gap: 6 }}>
              <IdentityTag status={myDoc.identityStatus} />
              {myDoc.badge === 'oro' && <span className="tag warn"><Crown size={12} /> Admin</span>}
              {isVip(myDoc) && <span className="tag ok"><Sparkles size={12} /> {vipLabel(myDoc)}</span>}
            </div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <FileButton onFiles={(f) => props.onPhoto(f, 'avatar')}><Camera size={16} /> Avatar</FileButton>
              <button className="btn btn-dark btn-sm" onClick={props.onOpenEdit}><Users size={16} /> Editar</button>
            </div>
          </div>
        </div>
        {myDoc.bio && <p style={{ fontSize: 17, margin: '14px 0 0' }}>{myDoc.bio}</p>}
        {(myDoc.interests ?? []).length > 0 && (
          <div className="chips" style={{ marginTop: 12 }}>
            {myDoc.interests.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
        )}
      </div>

      <div className="row between" style={{ margin: '20px 0 8px' }}>
        <span className="label">Mis fotos</span>
        <span className="tiny">{(myDoc.photos ?? []).length}/9</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {(myDoc.photos ?? []).map((src, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden' }}>
            <img src={src} alt={'Foto ' + (i + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              className="iconbtn" aria-label="Quitar foto" style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32 }}
              onClick={() => void props.onRemovePhoto(i)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {(myDoc.photos ?? []).length < 9 && (
          <FileButton
            className="btn btn-dark btn-sm"
            style={{ aspectRatio: '3/4', borderRadius: 14 }}
            onFiles={(f) => props.onPhoto(f, 'gallery')}
          >
            <div style={{ display: 'grid', placeItems: 'center', gap: 4 }}>
              <ImagePlus size={22} color="var(--lila)" />
              <span className="tiny">Añadir</span>
            </div>
          </FileButton>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="row between">
          <span className="label">Validación INE</span>
          <IdentityTag status={myDoc.identityStatus} />
        </div>
        <p className="muted small" style={{ margin: '8px 0 12px' }}>
          Obligatoria para acceder a la plataforma. Solo la ve administración.
        </p>
        <button className="btn btn-dark full" onClick={props.onOpenIne}>
          <ShieldCheck size={18} /> {myDoc.identityStatus === 'aprobada' ? 'Volver a validar' : 'Subir mi INE'}
        </button>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="btn btn-dark btn-sm" onClick={props.onGoPago}><Banknote size={16} /> {vipLabel(myDoc)}</button>
        <button className="btn btn-dark btn-sm" onClick={props.onOpenAvisos}><Bell size={16} /> Avisos</button>
      </div>
      <button className="btn btn-dark btn-sm full" style={{ marginTop: 8 }} onClick={props.onOpenForo}>
        <MessageCircle size={16} /> Foro público
      </button>

      {props.isAdmin && (
        <button
          className="btn full"
          style={{ marginTop: 16, background: 'transparent', boxShadow: 'inset 0 0 0 2px var(--lila), var(--glow)', color: 'var(--soft)', letterSpacing: '.08em' }}
          onClick={props.onOpenAdmin}
        >
          <Eye size={18} /> PANEL ADMIN
        </button>
      )}

      <button className="btn btn-bad full" style={{ marginTop: 12 }} onClick={() => void props.onLogout()}>
        <LogOut size={18} /> Cerrar sesión
      </button>
    </>
  );
}

function EditProfileSheet({ doc, onClose, onSave, onToast }: {
  doc: UserDoc; onClose: () => void; onToast: (s: string) => void;
  onSave: (patch: Partial<UserDoc>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Partial<UserDoc>>({ ...doc });
  const upd = (p: Partial<UserDoc>) => setDraft((d) => ({ ...d, ...p }));
  return (
    <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Editar perfil</div>
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        <input className="field" placeholder="Alias" value={draft.alias ?? ''} onChange={(e) => upd({ alias: e.target.value.slice(0, 24) })} />
        <input className="field" inputMode="numeric" placeholder="Edad" value={draft.age ?? ''} onChange={(e) => upd({ age: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) })} />
        <textarea className="field" placeholder="Bio" value={draft.bio ?? ''} onChange={(e) => upd({ bio: e.target.value.slice(0, 300) })} />
        <div className="card">
          <div className="row between">
            <span className="label">Fijo desde el registro</span>
            <Lock size={14} color="var(--muted)" />
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <span className="tag">{doc.kind}</span>
            <span className="tag">{doc.interests?.length ?? 0} gustos</span>
            <span className="tag">{doc.km} km</span>
          </div>
          <p className="tiny" style={{ marginTop: 8 }}>El tipo de cuenta, los gustos y el radio se eligen al registrarse y permanecen fijos.</p>
        </div>
        <button className="btn btn-neon full" onClick={() => void onSave(draft)} disabled={!(draft.alias ?? '').trim()}>
          <BadgeCheck size={18} /> Guardar cambios
        </button>
        <button className="btn btn-dark full" onClick={onClose}>Cancelar</button>
      </div>
    </motion.div>
  );
}

function ReportSheet({ peer, myDoc, onClose, onToast }: {
  peer: UserDoc; myDoc: UserDoc; onClose: () => void; onToast: (s: string) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) { onToast('Describe lo que pasó.'); return; }
    setBusy(true);
    const id = 'st_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await docSet('support_tickets', id, {
      id, userUid: myDoc.uid, userName: myDoc.alias, userEmail: myDoc.email,
      requester: 'usuario', subject: 'Reporte de conversación: ' + peer.alias,
      message: text.trim(), status: 'abierto', reply: null, createdAt: Date.now(), repliedAt: null,
    });
    setBusy(false);
    onToast('Reporte enviado a moderación.');
    onClose();
  };
  return (
    <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
      <div className="grab" />
      <div className="caps" style={{ fontSize: 22 }}>Reportar</div>
      <p className="muted small" style={{ margin: '4px 0 12px' }}>{peer.alias}. Solo guardamos la evidencia necesaria.</p>
      <textarea className="field" placeholder="Cuéntanos qué pasó…" value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} />
      <button className="btn btn-bad full" style={{ marginTop: 12 }} onClick={() => void send()} disabled={busy}>
        {busy ? <Loader2 size={18} className="spin" /> : <AlertTriangle size={18} />} Enviar reporte
      </button>
    </motion.div>
  );
}

// ============================================================================
// PANEL ADMIN (alto nivel)
// ============================================================================

type AdminSection = 'resumen' | 'ine' | 'ia' | 'moderacion' | 'foro' | 'pagos' | 'usuarios' | 'eventos' | 'banco';

function AdminPanel({ onClose, onToast, onRefresh, myEmail, events, allUsers }: {
  onClose: () => void;
  onToast: (s: string) => void;
  onRefresh: () => Promise<void>;
  myEmail: string;
  events: EventDoc[];
  allUsers: UserDoc[];
}) {
  const [section, setSection] = useState<AdminSection>('resumen');
  const [busy, setBusy] = useState(false);
  const [ineRecords, setIneRecords] = useState<IneRecord[]>([]);
  const [orders, setOrders] = useState<SpeiOrder[]>([]);
  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [creators, setCreators] = useState<CreatorDoc[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPostDoc[]>([]);
  const [forumQuestions, setForumQuestions] = useState<ForumDoc[]>([]);
  const [forumAnswers, setForumAnswers] = useState<Map<string, string>>(new Map());
  const [cfg, setCfg] = useState<SpeiBankConfig>(getSpeiConfig());
  const [imgView, setImgView] = useState<string | null>(null);
  const [evForm, setEvForm] = useState({ title: '', theme: '', date: '', time: '', zone: '', organizer: '', cap: 40, price: 0, reqs: '' });

  const loadAdminData = useCallback(async () => {
    const [records, allOrders, remoteCfg, tk, pr, cr, cp, fq] = await Promise.all([
      fetchAllRemoteIneRecords(),
      fetchAllRemoteSpeiOrders(),
      fetchRemoteSpeiConfig(),
      docAll<TicketDoc>('support_tickets'),
      docAll<ProposalDoc>('proposals'),
      docAll<CreatorDoc>('creators'),
      docAll<CreatorPostDoc>('creator_posts'),
      docAll<ForumDoc>('forum'),
    ]);
    setIneRecords(records.sort((a, b) => b.createdAt - a.createdAt));
    setOrders(allOrders);
    if (remoteCfg) setCfg(remoteCfg);
    setTickets(tk.sort((a, b) => b.createdAt - a.createdAt));
    setProposals(pr.sort((a, b) => b.createdAt - a.createdAt));
    setCreators(cr);
    setCreatorPosts(cp.sort((a, b) => b.createdAt - a.createdAt));
    setForumQuestions(fq.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => { void loadAdminData(); }, [loadAdminData]);

  const pendingIne = ineRecords.filter((r) => ineRecordVerdict(r) === 'pendiente');
  const pendingOrders = orders.filter((o) => o.status === 'pendiente' || o.status === 'verificado');
  const openTickets = tickets.filter((t) => t.status !== 'resuelto');
  const pendingProposals = proposals.filter((p) => p.status === 'revision');
  const pendingCreators = creators.filter((c) => c.status === 'pendiente');
  const pendingPosts = creatorPosts.filter((p) => p.status === 'revision');
  const openQuestions = forumQuestions.filter((q) => q.status !== 'respondida');

  // Resolución del denunciado a partir del asunto del reporte de conversación.
  const targetOf = (t: TicketDoc): UserDoc | null => {
    const m = /^Reporte de conversación: (.+)$/.exec(t.subject || '');
    if (!m) return null;
    return allUsers.find((u) => (u.alias || '') === m[1].trim()) ?? null;
  };

  const verdict = async (rec: IneRecord, v: 'aprobada' | 'rechazada' | 'baneada') => {
    setBusy(true);
    const ok = await issueIdentityVerdict({ record: rec, verdict: v });
    setBusy(false);
    if (ok) { await loadAdminData(); await onRefresh(); onToast('Veredicto emitido y notificado.'); }
    else onToast('No fue posible emitir el veredicto.');
  };

  const approveOrder = async (o: SpeiOrder) => {
    setBusy(true);
    const now = Date.now();
    // Idempotencia: un pago de evento jamás genera dos pases ni suma cupo doble.
    if (o.kind === 'evento' && o.userUid) {
      const dupe = await docQuery<PassDoc>('event_passes', 'orderRef', o.reference);
      if (dupe.length > 0) {
        setBusy(false);
        onToast('Este pago ya tenía un pase emitido. Sin cambios.');
        return;
      }
    }
    await appendRemoteTimelineAndStatus(o.id, 'aprobado', 'Pago aprobado por el administrador. Beneficio activado.');
    if (o.kind === 'suscripcion' && o.userUid) {
      const days = o.itemRef === 'ultra' ? 30 : 15;
      const current = await docGet<UserDoc>('users', o.userUid);
      const base = current?.premiumUntil && current.premiumUntil > now ? current.premiumUntil : now;
      await docUpdate('users', o.userUid, {
        premium: o.itemRef === 'ultra' ? 'ultra' : 'plus',
        premiumUntil: base + days * 24 * 60 * 60 * 1000,
      });
      const nid = notifId(o.userUid);
      await docSet('notifications', nid, {
        id: nid, userUid: o.userUid, kind: 'sistema',
        title: 'Pago aprobado', body: 'Tu pago de "' + o.label + '" fue confirmado. Suscripción activa.',
        ts: now, read: false,
      } as AppNotification);
    }
    if (o.kind === 'evento' && o.userUid) {
      let meta: any = {};
      try { meta = o.meta ? JSON.parse(o.meta) : {}; } catch { meta = {}; }
      const ev = events.find((e) => e.id === o.itemRef) ?? (await docGet<EventDoc>('events', o.itemRef));
      const pass: PassDoc = {
        id: 'pass_' + now + '_' + Math.random().toString(36).slice(2, 6),
        code: vipCode(), eventId: o.itemRef, eventTitle: meta.eventTitle ?? ev?.title ?? 'Evento',
        eventDate: meta.eventDate ?? ev?.date ?? '', eventTime: meta.eventTime ?? ev?.time ?? '',
        eventZone: meta.eventZone ?? ev?.zone ?? '', userUid: o.userUid, userName: o.userName,
        amount: o.amount, orderRef: o.reference, status: 'activo', createdAt: now,
      };
      await docSet('event_passes', pass.id, pass);
      if (ev) await docUpdate('events', ev.id, { sold: Math.min(ev.cap, (ev.sold ?? 0) + 1) });
      const nid2 = notifId(o.userUid);
      await docSet('notifications', nid2, {
        id: nid2, userUid: o.userUid, kind: 'pase',
        title: 'Entrada confirmada', body: 'Tu pago fue aprobado. Tu pase VIP para "' + pass.eventTitle + '" ya está activo.',
        ts: now, read: false,
      } as AppNotification);
    }
    // Suscripción de creadora: idempotente — jamás se otorga dos veces el mismo mes.
    if (o.kind === 'creadora' && o.userUid) {
      const subId = o.userUid + '_' + o.itemRef;
      const existing = await docGet<CreatorSubDoc>('creator_subscriptions', subId);
      if (existing && existing.until > now) {
        setBusy(false);
        onToast('Esta suscripción ya estaba activa. Sin cambios.');
        return;
      }
      await docSet('creator_subscriptions', subId, {
        id: subId, userUid: o.userUid, creatorId: o.itemRef,
        until: now + 30 * 24 * 60 * 60 * 1000, createdAt: now,
      } as CreatorSubDoc);
      const nid3 = notifId(o.userUid);
      await docSet('notifications', nid3, {
        id: nid3, userUid: o.userUid, kind: 'sistema',
        title: 'Suscripción activa', body: 'Tu pago de "' + o.label + '" fue confirmado. Ya tienes acceso al contenido premium de la creadora.',
        ts: now, read: false,
      } as AppNotification);
    }
    // Contenido premium de creadora: idempotente — un desbloqueo por pago.
    if (o.kind === 'contenido' && o.userUid) {
      const unlockId = o.userUid + '_' + o.itemRef;
      const existing = await docGet<UnlockDoc>('content_unlocks', unlockId);
      if (existing) {
        setBusy(false);
        onToast('Este contenido ya estaba desbloqueado. Sin cambios.');
        return;
      }
      await docSet('content_unlocks', unlockId, {
        id: unlockId, userUid: o.userUid, postId: o.itemRef, createdAt: now,
      } as UnlockDoc);
      const nid4 = notifId(o.userUid);
      await docSet('notifications', nid4, {
        id: nid4, userUid: o.userUid, kind: 'sistema',
        title: 'Contenido desbloqueado', body: 'Tu pago fue confirmado. El contenido premium que compraste ya está disponible en la pestaña Virtual.',
        ts: now, read: false,
      } as AppNotification);
    }
    // Donación: la creadora recibe el monto sin comisión (el donante ya pagó el IVA).
    if (o.kind === 'donacion') {
      let meta: any = {};
      try { meta = o.meta ? JSON.parse(o.meta) : {}; } catch { meta = {}; }
      const creatorId = meta.creatorId ?? o.itemRef;
      const creator = await docGet<CreatorDoc>('creators', creatorId);
      if (creator) {
        const netAmount = Math.round((o.amount / (1 + IVA)) * 100) / 100;
        await docUpdate('creators', creator.id, { earnings: Math.round(((creator.earnings ?? 0) + netAmount) * 100) / 100 });
        if (creator.userUid) {
          const nid5 = notifId(creator.userUid);
          await docSet('notifications', nid5, {
            id: nid5, userUid: creator.userUid, kind: 'donacion',
            title: 'Recibiste una donación',
            body: o.userName + ' te donó ' + money(netAmount) + ' MXN. Sin comisión de plataforma: es tuya.',
            ts: now, read: false,
          } as AppNotification);
        }
      }
      if (o.userUid) {
        const nid6 = notifId(o.userUid);
        await docSet('notifications', nid6, {
          id: nid6, userUid: o.userUid, kind: 'sistema',
          title: 'Donación confirmada', body: 'Tu donación fue entregada a la creadora. Gracias por apoyar su contenido.',
          ts: now, read: false,
        } as AppNotification);
      }
    }
    // Membresía de creadora (sin comisión por venta): 30 días de vigencia.
    if (o.kind === 'membresia_creadora' && o.userUid) {
      const creator = (await docAll<CreatorDoc>('creators')).find((c) => c.userUid === o.userUid);
      if (creator) {
        const currentUntil = creator.membershipUntil && creator.membershipUntil > now ? creator.membershipUntil : now;
        await docUpdate('creators', creator.id, {
          membershipPlan: o.itemRef,
          membershipUntil: currentUntil + 30 * 24 * 60 * 60 * 1000,
        });
        const nid7 = notifId(o.userUid);
        await docSet('notifications', nid7, {
          id: nid7, userUid: o.userUid, kind: 'sistema',
          title: 'Membresía de creadora activa',
          body: 'Tu pago fue confirmado. Tu membresía sin comisión está vigente por 30 días más.',
          ts: now, read: false,
        } as AppNotification);
      }
    }
    setBusy(false);
    await loadAdminData();
    await onRefresh();
    onToast('Pago aprobado. Beneficio activado.');
  };

  const rejectOrder = async (o: SpeiOrder) => {
    setBusy(true);
    await appendRemoteTimelineAndStatus(o.id, 'rechazado', 'El administrador rechazó el pago: no se encontró la transferencia con la referencia.');
    if (o.userUid) {
      const now = Date.now();
      const nid = notifId(o.userUid);
      await docSet('notifications', nid, {
        id: nid, userUid: o.userUid, kind: 'sistema',
        title: 'Pago no encontrado', body: 'No localizamos tu transferencia para "' + o.label + '". Verifica el concepto y genera una nueva orden.',
        ts: now, read: false,
      } as AppNotification);
    }
    setBusy(false);
    await loadAdminData();
    onToast('Pago rechazado y notificado.');
  };

  const toggleUser = async (u: UserDoc) => {
    const next = u.status === 'activo' ? 'suspendido' : 'activo';
    await docUpdate('users', u.uid, { status: next });
    await onRefresh();
    onToast(next === 'suspendido' ? 'Cuenta suspendida.' : 'Cuenta reactivada.');
  };

  const publishEvent = async () => {
    const f = evForm;
    if (!f.title.trim() || !f.date.trim() || !f.zone.trim()) { onToast('Completa título, fecha y zona.'); return; }
    const id = 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    await docSet('events', id, {
      id, title: f.title.trim(), theme: f.theme.trim() || 'Encuentro privado',
      date: f.date.trim(), time: f.time.trim() || '21:00', zone: f.zone.trim(),
      organizer: f.organizer.trim() || 'Administración', price: Number(f.price) || 0,
      cap: Number(f.cap) || 40, sold: 0, published: true, hue: hueFrom(id + f.title),
      reqs: f.reqs.split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setEvForm({ title: '', theme: '', date: '', time: '', zone: '', organizer: '', cap: 40, price: 0, reqs: '' });
    await onRefresh();
    onToast('Evento publicado.');
  };

  const deleteEvent = async (ev: EventDoc) => {
    await docDelete('events', ev.id);
    await onRefresh();
    onToast('Evento eliminado.');
  };

  const saveBank = async () => {
    const digits = cfg.clabe.replace(/[^0-9]/g, '');
    if (digits.length !== 18) { onToast('La CLABE debe tener 18 dígitos.'); return; }
    const next = saveSpeiConfig({ bank: cfg.bank, clabe: digits, beneficiary: cfg.beneficiary });
    const ok = await saveRemoteSpeiConfig(next);
    onToast(ok ? 'Configuración bancaria guardada para toda la plataforma.' : 'Guardada solo en este dispositivo.');
  };

  const purge = async () => {
    const n = await purgeExpiredRetainedRecords();
    await loadAdminData();
    onToast(n > 0 ? n + ' expedientes vencidos depurados.' : 'No hay expedientes vencidos.');
  };

  // --------------------- Moderación asistida por IA --------------------------
  const resolveTicket = async (t: TicketDoc) => {
    setBusy(true);
    await docUpdate('support_tickets', t.id, { status: 'resuelto' } as Partial<TicketDoc>);
    setBusy(false);
    await loadAdminData();
    onToast('Reporte marcado como resuelto.');
  };

  const suspendTarget = async (u: UserDoc) => {
    setBusy(true);
    const now = Date.now();
    await docUpdate('users', u.uid, { status: 'suspendido' });
    const nid = notifId(u.uid);
    await docSet('notifications', nid, {
      id: nid, userUid: u.uid, kind: 'sistema',
      title: 'Cuenta suspendida',
      body: 'Tu cuenta fue suspendida por administración tras revisar un reporte. Contacta a soporte si consideras que fue un error.',
      ts: now, read: false,
    } as AppNotification);
    setBusy(false);
    await loadAdminData();
    await onRefresh();
    onToast('Cuenta suspendida y notificada.');
  };

  const moderateCreator = async (c: CreatorDoc, ok: boolean) => {
    setBusy(true);
    const now = Date.now();
    await docUpdate('creators', c.id, { status: ok ? 'activa' : 'rechazada' } as Partial<CreatorDoc>);
    const nid = notifId(c.userUid);
    await docSet('notifications', nid, {
      id: nid, userUid: c.userUid, kind: 'sistema',
      title: ok ? 'Registro de creadora aprobado' : 'Registro de creadora rechazado',
      body: ok
        ? 'Tu perfil de creadora ya está activo. Puedes publicar contenido desde la pestaña Virtual.'
        : 'Tu registro como creadora no fue aprobado esta vez.',
      ts: now, read: false,
    } as AppNotification);
    setBusy(false);
    await loadAdminData();
    await onRefresh();
    onToast(ok ? 'Creadora aprobada y notificada.' : 'Registro rechazado y notificado.');
  };

  const moderateProposal = async (p: ProposalDoc, ok: boolean) => {
    setBusy(true);
    const now = Date.now();
    await docUpdate('proposals', p.id, { status: ok ? 'publicada' : 'rechazada' } as Partial<ProposalDoc>);
    const nid = notifId(p.authorUid);
    await docSet('notifications', nid, {
      id: nid, userUid: p.authorUid, kind: 'sistema',
      title: ok ? 'Propuesta publicada' : 'Propuesta rechazada',
      body: ok
        ? 'Tu propuesta "' + p.title + '" ya está visible en la pestaña Propuestas.'
        : 'Tu propuesta "' + p.title + '" no cumplió las normas de la comunidad.',
      ts: now, read: false,
    } as AppNotification);
    setBusy(false);
    await loadAdminData();
    await onRefresh();
    onToast(ok ? 'Propuesta publicada y notificada.' : 'Propuesta rechazada y notificada.');
  };

  const moderatePost = async (p: CreatorPostDoc, ok: boolean) => {
    setBusy(true);
    const now = Date.now();
    const creator = creators.find((c) => c.id === p.creatorId);
    await docUpdate('creator_posts', p.id, { status: ok ? 'publicado' : 'rechazado' } as Partial<CreatorPostDoc>);
    if (creator) {
      const nid = notifId(creator.userUid);
      await docSet('notifications', nid, {
        id: nid, userUid: creator.userUid, kind: 'sistema',
        title: ok ? 'Contenido publicado' : 'Contenido rechazado',
        body: ok
          ? 'Tu publicación "' + p.caption + '" ya está visible para la comunidad.'
          : 'Tu publicación fue rechazada por no cumplir las normas.',
        ts: now, read: false,
      } as AppNotification);
    }
    setBusy(false);
    await loadAdminData();
    onToast(ok ? 'Contenido publicado.' : 'Contenido rechazado.');
  };

  const answerForum = async (q: ForumDoc, answer: string) => {
    if (!answer.trim()) { onToast('Escribe la respuesta antes de publicarla.'); return; }
    setBusy(true);
    const now = Date.now();
    await docUpdate('forum', q.id, { answer: answer.trim(), status: 'respondida', answeredAt: now } as Partial<ForumDoc>);
    const nid = notifId(q.userUid);
    await docSet('notifications', nid, {
      id: nid, userUid: q.userUid, kind: 'sistema',
      title: 'Respuesta en el foro',
      body: 'Administración respondió tu pregunta pública: "' + q.question.slice(0, 60) + '…"',
      ts: now, read: false,
    } as AppNotification);
    setForumAnswers((m) => { const n = new Map(m); n.set(q.id, ''); return n; });
    setBusy(false);
    await loadAdminData();
    onToast('Respuesta publicada en el foro.');
  };

  const deleteForumQuestion = async (q: ForumDoc) => {
    setBusy(true);
    await docDelete('forum', q.id);
    setBusy(false);
    await loadAdminData();
    onToast('Pregunta eliminada del foro.');
  };

  const audit = auditProcesses({
    clabe: cfg.clabe,
    bank: cfg.bank,
    pendingIne: pendingIne.length,
    pendingOrders: pendingOrders.length,
    openTickets: openTickets.length,
    pendingProposals: pendingProposals.length,
    pendingCreators: pendingCreators.length,
    pendingPosts: pendingPosts.length,
    openQuestions: openQuestions.length,
    fullEvents: events.filter((e) => (e.sold ?? 0) >= (e.cap ?? 0)).length,
  });

  return (
    <motion.div className="overlay" style={{ zIndex: 50 }} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
      <div className="topbar">
        <button className="iconbtn" aria-label="Salir" onClick={onClose}><ChevronLeft size={20} /></button>
        <span className="wordmark">PANEL <b>ADMIN</b></span>
        <button className="iconbtn" aria-label="Recargar" onClick={() => { void loadAdminData(); void onRefresh(); }}><RefreshCw size={16} /></button>
      </div>
      <div className="body">
        <div className="seg" style={{ marginBottom: 8 }}>
          {([['resumen', 'Resumen'], ['ine', 'INE'], ['ia', 'IA'], ['moderacion', 'Moderación'], ['foro', 'Foro']] as [AdminSection, string][]).map(([id, label]) => (
            <button key={id} className={section === id ? 'on' : ''} onClick={() => setSection(id)}>{label}</button>
          ))}
        </div>
        <div className="seg" style={{ marginBottom: 16 }}>
          {([['pagos', 'Pagos'], ['usuarios', 'Usuarios'], ['eventos', 'Eventos'], ['banco', 'Banco']] as [AdminSection, string][]).map(([id, label]) => (
            <button key={id} className={section === id ? 'on' : ''} onClick={() => setSection(id)}>{label}</button>
          ))}
        </div>

        {busy && <div className="row" style={{ gap: 8, marginBottom: 10 }}><Loader2 size={16} className="spin" /><span className="tiny">Procesando…</span></div>}

        {section === 'resumen' && (
          <>
            <div className="grid2" style={{ gap: 8 }}>
              <div className="kpi"><div className="tiny">Usuarios</div><div className="v">{allUsers.length}</div></div>
              <div className="kpi"><div className="tiny">INE pendientes</div><div className="v">{pendingIne.length}</div></div>
              <div className="kpi"><div className="tiny">Pagos por validar</div><div className="v">{pendingOrders.length}</div></div>
              <div className="kpi"><div className="tiny">Eventos activos</div><div className="v">{events.length}</div></div>
            </div>
            <div className="grid2" style={{ gap: 8, marginTop: 8 }}>
              <div className="kpi"><div className="tiny">Reportes abiertos</div><div className="v">{openTickets.length}</div></div>
              <div className="kpi"><div className="tiny">Propuestas por revisar</div><div className="v">{pendingProposals.length}</div></div>
              <div className="kpi"><div className="tiny">Creadoras por aprobar</div><div className="v">{pendingCreators.length + pendingPosts.length}</div></div>
              <div className="kpi"><div className="tiny">Preguntas del foro</div><div className="v">{openQuestions.length}</div></div>
            </div>
            <div className="row between" style={{ margin: '10px 0 0' }}>
              <span className="tiny">Sesión: {myEmail}</span>
              <span className="tiny">{audit.filter((c) => c.ok).length}/{audit.length} procesos en orden</span>
            </div>
            <div className="card" style={{ marginTop: 14 }}>
              <div className="label" style={{ marginBottom: 8 }}>Retención legal</div>
              <p className="muted small" style={{ margin: '0 0 12px' }}>
                Las credenciales de cuentas baneadas se retienen un año y después se depuran de forma permanente.
              </p>
              <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => void purge()}><Trash2 size={16} /> Depurar expedientes vencidos</button>
            </div>
          </>
        )}

        {section === 'ine' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Expedientes INE</div>
            <p className="sub">{pendingIne.length} pendientes de {ineRecords.length} totales</p>
            <div className="stack" style={{ gap: 12 }}>
              {ineRecords.length === 0 && <div className="card"><p className="muted small">Sin expedientes todavía.</p></div>}
              {ineRecords.map((r) => {
                const v = ineRecordVerdict(r);
                return (
                  <div key={r.id} className="card">
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 17 }}>{r.alias}</span>
                      <span className={'tag ' + (v === 'aprobada' ? 'ok' : v === 'pendiente' ? 'warn' : 'bad')}>{v}</span>
                    </div>
                    <div className="tiny" style={{ marginTop: 2 }}>{r.legalName} · {r.userEmail}</div>
                    <div className="tiny">{r.source} · hace {ago(r.createdAt)}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 10 }}>
                      {([['INE frente', r.ineFront], ['INE reverso', r.ineBack], ['Selfie', r.selfie]] as [string, string][]).map(([label, src]) => (
                        <button key={label} style={{ aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative' }} onClick={() => setImgView(src)}>
                          {src ? <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="tiny">Vacío</span>}
                        </button>
                      ))}
                    </div>
                    {v === 'pendiente' && (
                      <div className="grid2" style={{ marginTop: 12 }}>
                        <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void verdict(r, 'aprobada')}><UserCheck size={16} /> Aprobar</button>
                        <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void verdict(r, 'rechazada')}><UserX size={16} /> Rechazar</button>
                        <button className="btn btn-bad btn-sm full" style={{ gridColumn: '1 / -1' }} disabled={busy} onClick={() => void verdict(r, 'baneada')}><Ban size={16} /> Banear y retener un año</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === 'pagos' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Pagos SPEI</div>
            <p className="sub">{pendingOrders.length} por validar</p>
            <div className="stack" style={{ gap: 12 }}>
              {orders.length === 0 && <div className="card"><p className="muted small">Sin órdenes todavía.</p></div>}
              {orders.map((o) => {
                const bot = runBotValidation(o);
                return (
                  <div key={o.id} className="card">
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 16 }}>{o.label}</span>
                      <StatusTagOrder status={o.status} />
                    </div>
                    <div className="tiny" style={{ marginTop: 2 }}>{o.userName} · {o.userEmail}</div>
                    <div className="tiny">{o.reference} · {money(o.amount)} · hace {ago(o.createdAt)}</div>
                    <div className="stack" style={{ gap: 4, marginTop: 10 }}>
                      {bot.checks.map((c) => (
                        <div key={c.label} className="row small" style={{ gap: 8 }}>
                          {c.ok ? <BadgeCheck size={15} color="var(--ok)" /> : <X size={15} color="var(--bad)" />} {c.label}
                        </div>
                      ))}
                    </div>
                    {(o.status === 'pendiente' || o.status === 'verificado') && (
                      <div className="grid2" style={{ marginTop: 12 }}>
                        <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void approveOrder(o)}><BadgeCheck size={16} /> Aprobar pago</button>
                        <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void rejectOrder(o)}><X size={16} /> Rechazar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === 'usuarios' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Usuarios</div>
            <p className="sub">{allUsers.length} cuentas registradas</p>
            <div className="stack" style={{ gap: 10 }}>
              {allUsers.map((u) => (
                <div key={u.uid} className="card" style={{ padding: 14 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Avatar doc={u} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="caps" style={{ fontSize: 16 }}>{u.alias || 'Sin alias'}</span>
                        {u.badge === 'oro' && <Crown size={13} color="var(--warn)" />}
                      </div>
                      <div className="tiny">{u.email}</div>
                      <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                        <IdentityTag status={u.identityStatus} />
                        <span className={'tag ' + (u.status === 'activo' ? 'ok' : 'bad')}>{u.status}</span>
                        {isVip(u) && <span className="tag warn">{vipLabel(u)}</span>}
                      </div>
                    </div>
                    {!ADMIN_EMAILS.includes((u.email || '').toLowerCase()) && (
                      <button className="btn btn-dark btn-sm" onClick={() => void toggleUser(u)}>
                        {u.status === 'activo' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'eventos' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Eventos</div>
            <p className="sub">Publica y administra fiestas verificadas.</p>
            <div className="card">
              <div className="stack" style={{ gap: 8 }}>
                <input className="field" placeholder="Título del evento" value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value.slice(0, 60) })} />
                <input className="field" placeholder="Tema (ej. Noche de parejas)" value={evForm.theme} onChange={(e) => setEvForm({ ...evForm, theme: e.target.value.slice(0, 40) })} />
                <div className="grid2">
                  <input className="field" placeholder="Fecha" value={evForm.date} onChange={(e) => setEvForm({ ...evForm, date: e.target.value.slice(0, 24) })} />
                  <input className="field" placeholder="Hora" value={evForm.time} onChange={(e) => setEvForm({ ...evForm, time: e.target.value.slice(0, 12) })} />
                </div>
                <div className="grid2">
                  <input className="field" placeholder="Zona" value={evForm.zone} onChange={(e) => setEvForm({ ...evForm, zone: e.target.value.slice(0, 40) })} />
                  <input className="field" placeholder="Organiza" value={evForm.organizer} onChange={(e) => setEvForm({ ...evForm, organizer: e.target.value.slice(0, 40) })} />
                </div>
                <div className="row between card" style={{ padding: '10px 14px' }}>
                  <span className="label">Cupo</span>
                  <span className="row">
                    <button className="iconbtn" style={{ width: 36, height: 36 }} onClick={() => setEvForm({ ...evForm, cap: Math.max(4, evForm.cap - 4) })}>−</button>
                    <span className="caps" style={{ width: 44, textAlign: 'center' }}>{evForm.cap}</span>
                    <button className="iconbtn" style={{ width: 36, height: 36 }} onClick={() => setEvForm({ ...evForm, cap: evForm.cap + 4 })}>+</button>
                  </span>
                </div>
                <input className="field" inputMode="numeric" placeholder="Precio de entrada (MXN, 0 = gratis)" value={evForm.price || ''} onChange={(e) => setEvForm({ ...evForm, price: Number(e.target.value.replace(/\D/g, '').slice(0, 6)) })} />
                <textarea className="field" placeholder="Requisitos (uno por línea)" value={evForm.reqs} onChange={(e) => setEvForm({ ...evForm, reqs: e.target.value.slice(0, 400) })} />
                <button className="btn btn-neon full" disabled={busy} onClick={() => void publishEvent()}><Plus size={18} /> Publicar evento</button>
              </div>
            </div>
            <div className="stack" style={{ gap: 10, marginTop: 16 }}>
              {events.map((ev) => (
                <div key={ev.id} className="card" style={{ padding: 14 }}>
                  <div className="row between">
                    <span className="caps" style={{ fontSize: 16 }}>{ev.title}</span>
                    <span className="tiny">{ev.sold}/{ev.cap}</span>
                  </div>
                  <div className="tiny">{ev.date} · {ev.zone} · {ev.price > 0 ? money(ev.price) : 'Gratis'}</div>
                  <button className="btn btn-bad btn-sm" style={{ marginTop: 10 }} onClick={() => void deleteEvent(ev)}><Trash2 size={15} /> Eliminar</button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'ia' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>IA de moderación</div>
            <p className="sub">El motor analiza reportes y denuncias; la decisión final siempre es tuya.</p>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 8 }}>Auditoría de procesos</div>
              <div className="stack" style={{ gap: 8 }}>
                {audit.map((c) => (
                  <div key={c.label} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    {c.ok ? <BadgeCheck size={16} color="var(--ok)" style={{ flexShrink: 0, marginTop: 2 }} /> : <X size={16} color="var(--bad)" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div style={{ minWidth: 0 }}>
                      <span className="small">{c.label}</span>
                      <span className="tiny" style={{ display: 'block' }}>{c.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="row between" style={{ margin: '16px 0 4px' }}>
              <span className="label">Reportes y denuncias</span>
              <span className="tiny">{openTickets.length} abierto(s)</span>
            </div>
            <div className="stack" style={{ gap: 12 }}>
              {openTickets.length === 0 && (
                <div className="card"><p className="muted small">Sin reportes abiertos. La comunidad está en calma.</p></div>
              )}
              {openTickets.map((t) => {
                const rep: ModerationReport = analyzeReport(t.message, {
                  subject: t.subject,
                  reporterReports: openTickets.filter((x) => x.userUid === t.userUid).length,
                });
                const target = targetOf(t);
                return (
                  <div key={t.id} className="card" style={{ padding: 14 }}>
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 15 }}>{t.subject}</span>
                      <span className={'tag ' + (rep.urgency === 'crítica' || rep.urgency === 'alta' ? 'bad' : rep.urgency === 'media' ? 'warn' : 'ok')}>
                        {rep.urgency} · {rep.score}/100
                      </span>
                    </div>
                    <div className="tiny" style={{ marginTop: 2 }}>Denuncia de {t.userName} · hace {ago(t.createdAt)}</div>
                    <p className="small muted" style={{ margin: '8px 0 0' }}>{t.message}</p>
                    <div className="card" style={{ marginTop: 10, padding: 12, background: 'var(--s1)' }}>
                      <div className="tiny" style={{ color: 'var(--lila)', marginBottom: 4 }}>Dictamen del motor</div>
                      <div className="tiny"><b>Categoría:</b> {rep.category} · <b>Acción sugerida:</b> {rep.recommended}</div>
                      {rep.signals.length > 0 && (
                        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                          {rep.signals.map((s) => (
                            <span key={s.code} className="tag warn">{s.label}</span>
                          ))}
                        </div>
                      )}
                      <p className="tiny muted" style={{ margin: '8px 0 0' }}>{rep.summary}</p>
                    </div>
                    {target && (
                      <div className="card" style={{ marginTop: 10, padding: 12, background: 'var(--s1)' }}>
                        <div className="tiny" style={{ color: 'var(--lila)', marginBottom: 4 }}>Perfil denunciado: {target.alias}</div>
                        {(() => {
                          const scan = scanProfile({
                            alias: target.alias, age: target.age, bio: target.bio,
                            photosCount: (target.photos ?? []).length,
                            identityStatus: target.identityStatus,
                            openReports: openTickets.filter((x) => targetOf(x)?.uid === target.uid).length,
                            suspendedBefore: target.status === 'suspendido',
                          });
                          return (
                            <>
                              <span className={'tag ' + (scan.risk === 'alto' ? 'bad' : scan.risk === 'medio' ? 'warn' : 'ok')}>Riesgo {scan.risk} · {scan.score}/100</span>
                              <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                                {scan.findings.map((f) => <span key={f} className="tiny">· {f}</span>)}
                              </div>
                              <p className="tiny muted" style={{ margin: '8px 0 0' }}>{scan.recommendation}</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    <div className="grid2" style={{ marginTop: 12 }}>
                      <button className="btn btn-bad btn-sm" disabled={busy || !target || target.status === 'suspendido'} onClick={() => target && void suspendTarget(target)}>
                        <Ban size={15} /> {target?.status === 'suspendido' ? 'Ya suspendido' : 'Suspender denunciado'}
                      </button>
                      <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => void resolveTicket(t)}>
                        <BadgeCheck size={15} /> Resolver
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === 'moderacion' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Moderación de contenido</div>
            <p className="sub">Creadoras, propuestas y publicaciones esperan tu veredicto.</p>

            <div className="row between" style={{ margin: '12px 0 4px' }}>
              <span className="label">Registros de creadoras</span>
              <span className="tiny">{pendingCreators.length} pendiente(s)</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {pendingCreators.length === 0 && <div className="card"><p className="muted small">Sin registros pendientes.</p></div>}
              {pendingCreators.map((c) => (
                <div key={c.id} className="card" style={{ padding: 14 }}>
                  <div className="row between">
                    <span className="caps" style={{ fontSize: 16 }}>{c.name} <span className="tiny">@{c.handle}</span></span>
                    <span className="tag warn">{money(c.price)}/mes</span>
                  </div>
                  {c.bio && <p className="small muted" style={{ margin: '6px 0 0' }}>{c.bio}</p>}
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void moderateCreator(c, true)}><UserCheck size={15} /> Aprobar</button>
                    <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void moderateCreator(c, false)}><UserX size={15} /> Rechazar</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="row between" style={{ margin: '16px 0 4px' }}>
              <span className="label">Propuestas en revisión</span>
              <span className="tiny">{pendingProposals.length} pendiente(s)</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {pendingProposals.length === 0 && <div className="card"><p className="muted small">Sin propuestas pendientes.</p></div>}
              {pendingProposals.map((p) => (
                <div key={p.id} className="card" style={{ padding: 14 }}>
                  <div className="row between">
                    <span className="tag">{p.cat}</span>
                    <span className="tiny">De {p.authorAlias} · hace {ago(p.createdAt)}</span>
                  </div>
                  <div className="caps" style={{ fontSize: 16, marginTop: 8 }}>{p.title}</div>
                  <p className="small" style={{ margin: '6px 0 0' }}>{p.body}</p>
                  {p.rules && <p className="small muted" style={{ margin: '6px 0 0' }}><b>Reglas:</b> {p.rules}</p>}
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void moderateProposal(p, true)}><BadgeCheck size={15} /> Publicar</button>
                    <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void moderateProposal(p, false)}><X size={15} /> Rechazar</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="row between" style={{ margin: '16px 0 4px' }}>
              <span className="label">Contenido en revisión</span>
              <span className="tiny">{pendingPosts.length} pendiente(s)</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {pendingPosts.length === 0 && <div className="card"><p className="muted small">Sin publicaciones pendientes.</p></div>}
              {pendingPosts.map((p) => (
                <div key={p.id} className="card" style={{ padding: 14 }}>
                  <div className="row between">
                    <span className="caps" style={{ fontSize: 16 }}>{p.creatorName}</span>
                    <span className="row" style={{ gap: 6 }}>
                      {(p.tier ?? (p.premium ? 'premium' : 'gratis')) === 'ultra' && <span className="tag bad">Ultra exclusivo</span>}
                      {(p.tier ?? (p.premium ? 'premium' : 'gratis')) === 'premium' && <span className="tag warn">Premium</span>}
                      {(p.tier ?? (p.premium ? 'premium' : 'gratis')) === 'gratis' && <span className="tag ok">Gratis</span>}
                      {p.kind === 'video' && <span className="tag">Video</span>}
                    </span>
                  </div>
                  <div className="tiny" style={{ marginTop: 2 }}>{p.caption}</div>
                  <button
                    style={{ width: '100%', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#000', marginTop: 10, padding: 0, border: 'none' }}
                    onClick={() => setImgView(p.image)}
                  >
                    <img src={p.image} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                  <div className="grid2" style={{ marginTop: 12 }}>
                    <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void moderatePost(p, true)}><BadgeCheck size={15} /> Publicar</button>
                    <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void moderatePost(p, false)}><X size={15} /> Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'foro' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Foro público</div>
            <p className="sub">Responde las preguntas de la comunidad verificada.</p>
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              {forumQuestions.length === 0 && <div className="card"><p className="muted small">Aún no hay preguntas en el foro.</p></div>}
              {forumQuestions.map((q) => {
                const draft = forumAnswers.get(q.id) ?? '';
                return (
                  <div key={q.id} className="card" style={{ padding: 14 }}>
                    <div className="row between">
                      <span className="caps" style={{ fontSize: 15 }}>{q.userName}</span>
                      <span className="tiny">{ago(q.createdAt)}</span>
                    </div>
                    <p className="small" style={{ margin: '6px 0 0' }}>{q.question}</p>
                    {q.answer ? (
                      <div className="card" style={{ marginTop: 10, padding: 12, background: 'var(--s1)' }}>
                        <div className="tiny" style={{ color: 'var(--ok)', marginBottom: 4 }}>Tu respuesta</div>
                        <span className="small">{q.answer}</span>
                      </div>
                    ) : (
                      <span className="tag warn" style={{ display: 'inline-block', marginTop: 8 }}>Sin responder</span>
                    )}
                    <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                      <input
                        className="field" placeholder="Escribe la respuesta oficial…"
                        value={draft}
                        onChange={(e) => setForumAnswers((m) => { const n = new Map(m); n.set(q.id, e.target.value.slice(0, 400)); return n; })}
                      />
                      <div className="grid2" style={{ gap: 8 }}>
                        <button className="btn btn-neon btn-sm" disabled={busy} onClick={() => void answerForum(q, draft)}><Send size={15} /> Responder</button>
                        <button className="btn btn-bad btn-sm" disabled={busy} onClick={() => void deleteForumQuestion(q)}><Trash2 size={15} /> Eliminar</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === 'banco' && (
          <>
            <div className="h1" style={{ fontSize: 22 }}>Cuenta bancaria SPEI</div>
            <p className="sub">Todos los pagos de la plataforma llegan aquí.</p>
            <div className="stack" style={{ gap: 10 }}>
              <input className="field" placeholder="Banco" value={cfg.bank} onChange={(e) => setCfg({ ...cfg, bank: e.target.value.slice(0, 40) })} />
              <input className="field" inputMode="numeric" placeholder="CLABE (18 dígitos)" value={cfg.clabe} onChange={(e) => setCfg({ ...cfg, clabe: e.target.value.replace(/[^0-9]/g, '').slice(0, 18) })} />
              <input className="field" placeholder="Beneficiario" value={cfg.beneficiary} onChange={(e) => setCfg({ ...cfg, beneficiary: e.target.value.slice(0, 60) })} />
              <button className="btn btn-neon full" onClick={() => void saveBank()}><BadgeCheck size={18} /> Guardar configuración</button>
            </div>
          </>
        )}
      </div>

      {/* Visor de imagen del expediente */}
      <AnimatePresence>
        {imgView && (
          <motion.div className="ann" style={{ zIndex: 60 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setImgView(null)}>
            <img src={imgView} alt="Documento" style={{ maxWidth: '100%', maxHeight: '80%', borderRadius: 16, boxShadow: 'var(--glow)' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}




