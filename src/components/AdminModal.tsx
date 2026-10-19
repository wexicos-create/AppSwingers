import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  X, 
  ShieldAlert, 
  Key, 
  Lock, 
  Check, 
  Mail, 
  ShieldCheck, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Bell, 
  Smartphone, 
  Trash2, 
  Send, 
  CreditCard, 
  FileCheck, 
  Shield, 
  Zap,
  CheckCircle2,
  RefreshCw,
  BadgeCheck
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
}

export function AdminModal({ isOpen, onClose, isEs }: AdminModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Active admin tab: 'monetizacion' | 'push' | 'seguridad'
  const [activeAdminTab, setActiveAdminTab] = useState<'monetizacion' | 'push' | 'seguridad' | 'operaciones'>('operaciones');
  type ReviewCase = { id: string; orderId?: string; type: 'spei' | 'identity' | 'support'; status: string; userId?: string; createdAt?: string; amount?: number; currency?: string; reference?: string; transferTrackingNumber?: string; trackingStatus?: string; duplicateTrackingDetected?: boolean; productLabel?: string; summary?: string; riskSignals?: string[] };
  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [broadcastTitle, setBroadcastTitle] = useState(
    isEs ? '🔥 Nuevo evento VIP Swinger en San Luis Potosí' : '🔥 New VIP Lifestyle event announced'
  );
  const [broadcastBody, setBroadcastBody] = useState(
    isEs ? 'Cupo limitado para parejas verificadas. Revisa la sección de eventos.' : 'Limited capacity for verified couples. Check events tab.'
  );
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError(isEs
        ? 'Inicia sesión primero con tu cuenta de Firebase autorizada.'
        : 'Sign in first with your authorized Firebase account.');
      return;
    }
    try {
      const token = await currentUser.getIdTokenResult(true);
      if (token.claims.admin !== true) {
        setError(isEs
          ? 'Acceso denegado. Un administrador debe asignar el permiso admin en el servidor.'
          : 'Access denied. An administrator must grant the admin claim server-side.');
        return;
      }
      setIsLoggedIn(true);
      void loadReviewQueue();
    } catch {
      setError(isEs ? 'No se pudo verificar la sesión. Inténtalo de nuevo.' : 'Could not verify session. Please retry.');
    }
  };

  const loadReviewQueue = async () => {
    setReviewLoading(true); setReviewError(null); setReviewMessage(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error(isEs ? 'La sesión expiró. Vuelve a iniciar sesión.' : 'Session expired. Sign in again.');
      const token = await currentUser.getIdTokenResult(true);
      if (token.claims.admin !== true) throw new Error(isEs ? 'Permiso de administrador no válido.' : 'Administrator permission is missing.');
      const snapshot = await getDocs(query(collection(db, 'adminReviewQueue'), orderBy('createdAt', 'desc')));
      setReviewCases(snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, orderId: data.orderId || d.id, type: data.type || 'spei', status: data.status || 'under_review', userId: data.userId, amount: data.amount, currency: data.currency || 'MXN', reference: data.reference, transferTrackingNumber: data.transferTrackingNumber || data.transferReference, trackingStatus: data.trackingStatus, duplicateTrackingDetected: data.duplicateTrackingDetected === true, riskSignals: Array.isArray(data.riskSignals) ? data.riskSignals : [], productLabel: data.productLabel, summary: data.summary, createdAt: data.createdAt?.toDate?.().toISOString() };
      }));
    } catch (e) { setReviewError(e instanceof Error ? e.message : 'Review queue unavailable'); }
    finally { setReviewLoading(false); }
  };

  const decideReviewCase = async (item: ReviewCase, decision: 'approve' | 'reject' | 'request_info') => {
    const prompts = { approve: isEs ? '¿Confirmas aprobar este caso? Primero compara el depósito real, el importe exacto y la referencia en tu banco.' : 'Approve this case? First verify the actual bank deposit, exact amount and reference.', reject: isEs ? '¿Confirmas rechazar este caso?' : 'Reject this case?', request_info: isEs ? '¿Solicitar información adicional?' : 'Request additional information?' };
    if (!window.confirm(prompts[decision])) return;
    let bankTransactionId = '';
    if (decision === 'approve' && item.type === 'spei') {
      bankTransactionId = window.prompt(isEs ? 'Introduce el identificador real del movimiento bancario confirmado (no el folio que escribió el usuario).' : 'Enter the actual confirmed bank transaction ID (not the user-entered transfer reference).')?.trim() || '';
      if (bankTransactionId.length < 5) {
        setReviewError(isEs ? 'Aprobación cancelada: hace falta el identificador real del movimiento bancario.' : 'Approval cancelled: actual bank transaction ID is required.');
        return;
      }
    }
    setReviewLoading(true); setReviewError(null); setReviewMessage(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error(isEs ? 'La sesión expiró.' : 'Session expired.');
      const functions = getFunctions(undefined, 'us-central1');
      const review = httpsCallable(functions, 'reviewSpeiOrder');
      const response = await review({
        orderId: item.orderId || item.id,
        decision,
        notes: reviewNotes[item.id] || '',
        bankConfirmed: decision === 'approve' && item.type === 'spei',
        bankTransactionId,
      });
      const payload = response.data as { success?: boolean; status?: string };
      if (payload.success !== true) throw new Error(isEs ? 'El servidor no confirmó la decisión.' : 'Server did not confirm the decision.');
      setReviewMessage(isEs ? 'Decisión registrada por el servidor.' : 'Decision recorded by server.');
      await loadReviewQueue();
    } catch (e) { setReviewError(e instanceof Error ? e.message : 'Review action failed'); }
    finally { setReviewLoading(false); }
  };

  const handleClearCookiesAndStorage = () => {
    if (window.confirm(isEs ? '¿Purgar cookies, caché y restablecer datos locales del APK?' : 'Purge all cookies, cache, and local APK storage?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        alert(isEs ? 'Cookies y almacenamiento local purgados al 100%. El APK está limpio en 0.' : 'Cookies & local storage purged 100%. APK is pristine at 0.');
        window.location.reload();
      } catch (err) {
        console.warn('Wipe cookies note:', err);
      }
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastSuccess(false);
    setBroadcastError(isEs
      ? 'Notificaciones no configuradas: falta un servicio de envío en el servidor. No se envió ninguna alerta.'
      : 'Notifications are not configured: a server-side delivery service is missing. No alert was sent.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-lg p-5 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-2xl flex flex-col gap-5 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 border border-rose-500/40 shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            {isEs ? 'Panel Admin & Business Analytics' : 'Admin & Business Analytics'}
          </h2>
          <p className="text-[11px] text-purple-200/70 mt-0.5">
            {isEs ? 'Acceso seguro para jocervantes99@gmail.com' : 'Secure access for jocervantes99@gmail.com'}
          </p>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            {error && <div role="alert" className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">{error}</div>}
            <p className="text-xs text-white/70">{isEs ? 'El panel exige una sesión de Firebase y el claim admin=true asignado de forma segura desde un entorno de servidor. No existen credenciales predeterminadas.' : 'The panel requires a Firebase session and admin=true claim securely assigned server-side. No default credentials exist.'}</p>
            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-lg">
              {isEs ? 'Verificar sesión de administrador' : 'Verify administrator session'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Admin Header Bar */}
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-xs">{isEs ? 'Sesión Autorizada (Root Admin)' : 'Authorized Session'}</h4>
                  <p className="text-[10px] text-emerald-200">jocervantes99@gmail.com</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition"
              >
                {isEs ? 'Salir' : 'Logout'}
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 rounded-xl bg-black/60 border border-white/10 gap-1 text-xs flex-wrap">
              <button onClick={() => { setActiveAdminTab('operaciones'); void loadReviewQueue(); }} className={`flex-1 min-w-[90px] py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${activeAdminTab === 'operaciones' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'}`}><BadgeCheck className="w-3.5 h-3.5" />{isEs ? 'Revisiones' : 'Reviews'}</button>
              <button
                onClick={() => setActiveAdminTab('monetizacion')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'monetizacion' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isEs ? 'Finanzas & IVA' : 'Finances'}
              </button>
              <button
                onClick={() => setActiveAdminTab('push')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'push' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {isEs ? 'Push Lookup' : 'Push'}
              </button>
              <button
                onClick={() => setActiveAdminTab('seguridad')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'seguridad' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {isEs ? 'Seguridad' : 'Security'}
              </button>
            </div>

            {/* TAB OPERACIONES: SPEI MANUAL, IDENTIDAD Y SOPORTE */}
            {activeAdminTab === 'operaciones' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">{isEs ? 'Aprueba SPEI solo después de comprobar el abono en tu banco. La decisión se envía al servidor, que debe registrar auditoría e idempotencia y aplicar el producto una sola vez. La verificación facial muestra solo resultados mínimos; no expone imágenes biométricas en el panel.' : 'Approve SPEI only after confirming the deposit in your bank. The server must audit and apply entitlements exactly once. Facial review exposes minimal results, never biometric images.'}</div>
                <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-white text-sm">{isEs ? 'Cola de revisión' : 'Review queue'}</h3><button type="button" onClick={() => void loadReviewQueue()} disabled={reviewLoading} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${reviewLoading ? 'animate-spin' : ''}`} />{isEs ? 'Actualizar' : 'Refresh'}</button></div>
                {reviewError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{reviewError}</div>}
                {reviewMessage && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{reviewMessage}</div>}
                {!reviewLoading && !reviewError && reviewCases.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">{isEs ? 'Sin casos cargados. Pulsa Actualizar; si el endpoint aún no existe, el panel lo indicará sin inventar transacciones.' : 'No cases loaded. Refresh; if the endpoint is missing, the panel will report it without inventing transactions.'}</div>}
                {reviewCases.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-bold text-white">{item.type === 'spei' ? 'SPEI / ' + (item.productLabel || 'Compra') : item.type === 'identity' ? (isEs ? 'Verificación de identidad' : 'Identity verification') : (isEs ? 'Asistencia técnica' : 'Technical support')}</div><div className="text-[10px] text-white/50 font-mono break-all">{item.id} · {item.status}</div></div><span className={`text-[10px] rounded-full border px-2 py-1 font-extrabold ${item.status === 'paid' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : item.duplicateTrackingDetected ? 'bg-rose-500/15 border-rose-500/30 text-rose-200' : 'bg-amber-500/15 border-amber-500/25 text-amber-200'}`}>{item.status === 'paid' ? (isEs ? 'CONFIRMADO' : 'CONFIRMED') : item.duplicateTrackingDetected ? (isEs ? 'RASTREO REPETIDO · ALERTA' : 'DUPLICATE TRACKING · ALERT') : item.transferTrackingNumber ? (isEs ? 'RASTREO RECIBIDO · PENDIENTE' : 'TRACKING RECEIVED · PENDING') : (isEs ? 'REVISIÓN MANUAL' : 'MANUAL REVIEW')}</span></div>
                  {item.amount !== undefined && <p className="text-xs text-emerald-200">{new Intl.NumberFormat(isEs ? 'es-MX' : 'en-US', { style: 'currency', currency: item.currency || 'MXN' }).format(item.amount)}{item.reference ? ` · ${isEs ? 'Pedido' : 'Order'}: ${item.reference}` : ''}</p>}{item.transferTrackingNumber && <div className={`rounded-xl border p-3 space-y-1.5 ${item.duplicateTrackingDetected ? 'border-rose-400/35 bg-rose-400/10' : 'border-amber-300/25 bg-amber-300/[0.06]'}`}><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{isEs ? 'Clave de rastreo SPEI reportada' : 'Reported SPEI tracking key'}</p><p className="break-all select-all font-mono text-sm text-white">{item.transferTrackingNumber}</p><p className="text-[10px] leading-relaxed text-white/60">{item.duplicateTrackingDetected ? (isEs ? 'Alerta automática: esta clave ya fue enviada en otro pedido. No aprobar sin investigar el duplicado.' : 'Automatic alert: this key was submitted for another order. Investigate before approving.') : (isEs ? 'Estado automático: formato recibido; existencia de la transferencia aún no verificada.' : 'Automatic status: format received; transfer existence has not been verified.')}</p><a href="https://www.banxico.org.mx/cep/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-fuchsia-200 underline underline-offset-4">{isEs ? 'Abrir MI-SPEI / CEP de Banco de México' : 'Open Banco de México MI-SPEI / CEP'} <ExternalLink className="h-3 w-3" /></a></div>}
                  {item.userId && <p className="text-[10px] text-white/50 break-all">UID: {item.userId}</p>}{item.summary && <p className="text-xs text-white/75">{item.summary}</p>}{item.riskSignals?.length ? <ul className="list-disc pl-4 text-[11px] text-amber-200">{item.riskSignals.map((signal, i) => <li key={i}>{signal}</li>)}</ul> : null}
                  <textarea rows={2} value={reviewNotes[item.id] || ''} onChange={e => setReviewNotes(prev => ({ ...prev, [item.id]: e.target.value }))} placeholder={isEs ? 'Notas de revisión (opcional; no introduzcas datos biométricos)' : 'Review notes (optional; do not enter biometric data)'} className="w-full rounded-lg bg-black/60 border border-white/15 p-2 text-xs text-white" />
                  <div className="grid grid-cols-3 gap-2"><button type="button" disabled={reviewLoading} onClick={() => void decideReviewCase(item, 'approve')} className="rounded-lg bg-emerald-600/80 px-2 py-2 text-[11px] font-bold text-white disabled:opacity-40">{isEs ? 'Aprobar' : 'Approve'}</button><button type="button" disabled={reviewLoading} onClick={() => void decideReviewCase(item, 'request_info')} className="rounded-lg bg-amber-600/70 px-2 py-2 text-[11px] font-bold text-white disabled:opacity-40">{isEs ? 'Pedir datos' : 'Request info'}</button><button type="button" disabled={reviewLoading} onClick={() => void decideReviewCase(item, 'reject')} className="rounded-lg bg-rose-600/70 px-2 py-2 text-[11px] font-bold text-white disabled:opacity-40">{isEs ? 'Rechazar' : 'Reject'}</button></div>
                </article>)}
                <p className="text-[10px] text-white/45">{isEs ? 'El servidor debe exigir claim admin, validar el estado actual, evitar doble aprobación y registrar auditoría. La función reviewSpeiOrder valida el claim, el estado, la referencia bancaria y la idempotencia en el servidor.' : 'The server must enforce admin claims, validate current state, prevent duplicate approval, and write audit logs. This UI does not replace those endpoints.'}</p>
              </div>
            )}

            {/* TAB 1: MONETIZACIÓN & FINANZAS */}
            {activeAdminTab === 'monetizacion' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos México (MXN)' : 'Mexico Revenue'}</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">—</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Sin conexión a facturación real</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos USA (USD)' : 'USA Revenue'}</span>
                    <span className="text-xl font-black text-pink-400 mt-1 block">—</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Sin conexión a facturación real</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Silver ($408 MXN / $100 USD 15d):' : 'Silver Plan:'}</span>
                    <span className="font-bold text-white">—</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Gold ($800 MXN / $180 USD mes):' : 'Gold Plan:'}</span>
                    <span className="font-bold text-amber-300">—</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Sponsored Profiles ($1,500 MXN / $800 USD):' : 'Sponsored Profiles:'}</span>
                    <span className="font-bold text-pink-400">—</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Propuestas Colaboración ($350 MXN / $80 USD):' : 'Collab Proposals:'}</span>
                    <span className="font-bold text-emerald-300">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">{isEs ? 'Comisión Creadoras (15% neta + 10% cobro):' : 'Creator Net Commission:'}</span>
                    <span className="font-bold text-purple-300">No verificado</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PUSH & NOTIFICACIONES MASIVAS */}
            {activeAdminTab === 'push' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-white">—</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Dispositivos Registrados' : 'Registered Devices'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-emerald-400">—</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Tasa de Entrega Push' : 'Delivery Rate'}</span>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                    {isEs ? 'Enviar Alerta Push Masiva a la Red' : 'Broadcast Push Notification'}
                  </span>
                  
                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Título de la Notificación:' : 'Title:'}</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Mensaje / Cuerpo:' : 'Body:'}</label>
                    <textarea
                      rows={2}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs resize-none"
                    />
                  </div>

                  {broadcastSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold text-center">
                      {isEs ? 'La solicitud fue aceptada por el servidor.' : 'The request was accepted by the server.'}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
                  >
                    {isEs ? 'Difundir Alerta Push Inmediata' : 'Send Push Broadcast'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: SEGURIDAD, CIBERSEGURIDAD & COOKIES */}
            {activeAdminTab === 'seguridad' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Ciberseguridad del APK' : 'APK Cybersecurity'}</span>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Estado TLS/tokens: requiere auditoría del despliegue</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verificación de identidad: no conectada</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Moderación y antifraude: requiere backend</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/60">{isEs ? 'Los permisos de administrador se gestionan fuera del cliente mediante Firebase Admin SDK. Este panel no permite cambiar credenciales locales.' : 'Admin permissions are managed outside the client using Firebase Admin SDK. This panel cannot change local credentials.'}</p>

                {/* Purge cookies and local data */}
                <button
                  onClick={handleClearCookiesAndStorage}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isEs ? 'Purgar Todo en Cookies y Dejar APK Limpia en 0' : 'Purge All Cookies & Reset APK to 0'}
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
