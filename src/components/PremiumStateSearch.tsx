import React, { useEffect, useRef, useState } from 'react';
import { AppRegion, ClubEvent, Profile, SpeiOrder, StatePass } from '../types';
import { X, MapPin, Crown, Clock, Plane, Calendar, Heart, ShieldCheck, Loader2, RefreshCw, Users } from 'lucide-react';
import { showToast } from './Toast';
import { SpeiModal } from './SpeiModal';
import { NameBadges } from './Badges';
import { newSpeiOrder, createRemoteSpeiOrder, upsertLocalSpeiOrder, appendRemoteTimelineAndStatus } from '../spei';
import { getStatePassPrice, statesForRegion, stateNameByCode, fetchStatePass, profilesInState, eventsInState } from '../premium';

interface PremiumStateSearchProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: AppRegion;
  userUid: string | null;
  userName: string;
  userEmail: string;
  profiles: Profile[];
  events: ClubEvent[];
  onConnect: (profile: Profile) => void;
  onPassChange: (pass: StatePass | null) => void;
}

/**
 * Premium panel: search by state for travelers and tourists. A 24-hour pass
 * per state unlocks profile discovery and event listings of that state, and
 * the ability to match with people from another state (always with their
 * consent). Payment follows the existing SPEI flow: bot validation + manual
 * administrator approval; on approval the admin activates the pass.
 */
export function PremiumStateSearch({
  isOpen, onClose, isEs, region, userUid, userName, userEmail, profiles, events, onConnect, onPassChange,
}: PremiumStateSearchProps) {
  const [pass, setPass] = useState<StatePass | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [order, setOrder] = useState<SpeiOrder | null>(null);
  const [speiOpen, setSpeiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef<number | null>(null);

  const price = getStatePassPrice(region);
  const states = statesForRegion(region);

  const refreshPass = async () => {
    if (!userUid) return;
    const p = await fetchStatePass(userUid);
    setPass(p);
    onPassChange(p);
  };

  // Load pass + refresh pending order status while the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void refreshPass().finally(() => setLoading(false));
    pollRef.current = window.setInterval(() => {
      setNow(Date.now());
      void refreshPass();
    }, 15000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 1s ticker for countdowns
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isOpen]);

  if (!isOpen) return null;

  const startPurchase = async () => {
    if (!selectedState || !userUid) return;
    setBusy(true);
    try {
      const stateName = stateNameByCode(selectedState);
      const label = isEs ? `Pase 1 día · ${stateName}` : `1-day pass · ${stateName}`;
      const fresh: SpeiOrder = newSpeiOrder({
        kind: 'pase_estado',
        itemRef: selectedState,
        label,
        amount: price.total,
        userName,
        userEmail,
        userUid,
      });
      const saved = await createRemoteSpeiOrder(fresh);
      if (!saved) {
        showToast(isEs ? 'No se pudo crear la orden de pago. Revisa tu conexión e inténtalo de nuevo.' : 'Could not create the payment order. Check your connection and try again.', 'error');
        setBusy(false);
        return;
      }
      upsertLocalSpeiOrder(fresh);
      setOrder(fresh);
      setSpeiOpen(true);
      showToast(isEs ? 'Orden creada: realiza la transferencia SPEI para activar tu pase.' : 'Order created: complete the SPEI transfer to activate your pass.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransferSent = async (orderId: string) => {
    if (!order) return;
    await appendRemoteTimelineAndStatus(orderId, 'pendiente', isEs
      ? 'El usuario indicó que ya realizó la transferencia. El bot validará la referencia y el administrador dará el visto bueno.'
      : 'The user confirmed the transfer. The bot validates the reference and the administrator gives the final approval.');
    setSpeiOpen(false);
    showToast(isEs
      ? 'Transferencia registrada. El bot valida tu pago y el administrador lo aprueba; el pase se activa automáticamente al aprobarse.'
      : 'Transfer registered. The bot validates your payment and the administrator approves it; the pass activates automatically on approval.', 'info');
    setTimeout(() => { void refreshPass(); }, 20000);
  };

  const remainingMs = pass ? Math.max(0, pass.expiresAt - now) : 0;
  const hh = String(Math.floor(remainingMs / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((remainingMs % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');

  const stateProfiles = pass ? profilesInState(profiles, pass.stateCode) : [];
  const stateEvents = pass ? eventsInState(events, pass.stateCode) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-md min-h-full bg-[#0a0514] flex flex-col relative">
        {/* Header */}
        <div className="sticky top-0 z-10 p-4 pb-3 border-b border-purple-500/20 bg-[#0a0514]/95 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-600 flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">
                {isEs ? 'Búsqueda por Estado (Premium)' : 'Search by State (Premium)'}
              </h2>
              <p className="text-[10px] text-purple-200/70 flex items-center gap-1">
                <Plane className="w-3 h-3" />
                {isEs ? 'Para viajeros y turistas · pase de 24 horas' : 'For travelers & tourists · 24-hour pass'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/50 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEs ? 'Consultando tu pase...' : 'Checking your pass...'}
            </div>
          )}

          {/* ACTIVE PASS */}
          {pass && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-pink-500/10 to-purple-600/15 border border-amber-400/40 shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-300" />
                    <div>
                      <span className="text-sm font-black text-white block">{pass.stateName}</span>
                      <span className="text-[10px] text-purple-200/70">{isEs ? 'Pase activo · perfiles y eventos de este estado' : 'Active pass · profiles and events of this state'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-mono font-black text-emerald-300 block">{hh}:{mm}:{ss}</span>
                    <span className="text-[9px] text-white/50 uppercase tracking-wider">{isEs ? 'restante' : 'remaining'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed mt-2.5">
                  {isEs
                    ? 'Puedes ver perfiles de este estado, enviar interés y concretar un Match si la persona accede, así como consultar sus eventos.'
                    : 'You can browse profiles of this state, send interest and match if the person accepts, and check its events.'}
                </p>
              </div>

              {/* Profiles of the state */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-pink-400" />
                    {isEs ? `Perfiles en ${pass.stateName}` : `Profiles in ${pass.stateName}`}
                  </h3>
                  <span className="text-[10px] text-purple-200/70">{stateProfiles.length}</span>
                </div>
                {stateProfiles.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-white/50 text-center">
                    {isEs ? 'Aún no hay perfiles publicados en este estado. Revisa pronto: la comunidad crece rápido.' : 'No profiles published in this state yet.'}
                  </div>
                ) : stateProfiles.map(p => (
                  <div key={p.id} className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                    <img src={p.photos[0] || p.photo} alt={p.name} className="w-12 h-12 rounded-2xl object-cover border border-purple-500/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{p.name}</span>
                        <NameBadges badge={p.badge} />
                      </div>
                      <span className="text-[10px] text-purple-200/60 block truncate">{p.kind} · {p.ages || (p.age ? String(p.age) : '')} · {p.distance || `~${p.km} km`}</span>
                      <span className="text-[9px] text-white/40 block truncate">{p.tags.slice(0, 3).join(' · ')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConnect(p)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 active:scale-95 transition"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      {isEs ? 'Me interesa' : 'Interested'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Events of the state */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {isEs ? `Eventos en ${pass.stateName}` : `Events in ${pass.stateName}`}
                </h3>
                {stateEvents.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-white/50 text-center">
                    {isEs ? 'Sin eventos publicados en este estado por ahora.' : 'No events published in this state yet.'}
                  </div>
                ) : stateEvents.map(e => (
                  <div key={e.id} className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{e.title}</span>
                      <span className="text-[10px] text-purple-200/60 block truncate">{e.date} · {e.time} · {e.zone}</span>
                      <span className="text-[9px] text-white/40 block truncate">{e.theme} · {isEs ? 'por' : 'by'} {e.organizer}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => { void refreshPass(); }} className="w-full py-2.5 rounded-2xl bg-white/5 text-[11px] text-purple-200 flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                {isEs ? 'Actualizar' : 'Refresh'}
              </button>
            </div>
          )}

          {/* PAYWALL */}
          {!pass && !loading && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-b from-purple-950/70 to-black/50 border border-purple-500/30 space-y-2.5">
                <p className="text-xs text-purple-100/80 leading-relaxed">
                  {isEs
                    ? 'Elige un estado y desbloquea por 24 horas sus perfiles y eventos: ideal para viajeros y turistas. Con el pase puedes hacer Match con personas de otro estado y acordar citas si la persona accede al Match, o acudir a un evento del estado que elijas.'
                    : 'Pick a state and unlock its profiles and events for 24 hours: ideal for travelers and tourists. With the pass you can match with people from another state (always with their consent) or attend an event in the chosen state.'}
                </p>
                <div className="p-3 rounded-2xl bg-black/50 border border-amber-400/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/50 uppercase font-bold block">{isEs ? 'Precio del pase (1 día)' : 'Pass price (1 day)'}</span>
                    <span className="text-xs text-white/60 block">${price.base.toLocaleString()} + {price.taxLabel} ${price.tax.toLocaleString()}</span>
                  </div>
                  <span className="text-lg font-black text-amber-300">${price.total.toLocaleString()} <span className="text-[10px]">{price.currency}</span></span>
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                  {isEs
                    ? 'Pago único por transferencia SPEI. No manejamos reembolsos salvo causa realmente justificada. Todas las membresías y comisiones incluyen IVA.'
                    : 'One-time SPEI transfer. We do not handle refunds unless truly justified. All memberships and commissions include tax.'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-pink-400" />
                  {isEs ? (region === 'MX' ? 'Selecciona un estado' : 'Estados de EE. UU.') : 'Select a state'}
                </h3>
                <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto p-1">
                  {states.map(s => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSelectedState(s.code)}
                      className={'px-2 py-2 rounded-xl text-[10px] font-bold text-center transition leading-tight ' + (selectedState === s.code
                        ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-black shadow-lg'
                        : 'bg-white/5 border border-white/10 text-purple-200/70 hover:border-purple-400/40')}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedState || busy}
                onClick={startPurchase}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black font-black text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                {selectedState
                  ? (isEs ? `Pagar $${price.total.toLocaleString()} ${price.currency} y activar` : `Pay $${price.total.toLocaleString()} ${price.currency} and activate`)
                  : (isEs ? 'Selecciona un estado para continuar' : 'Select a state to continue')}
              </button>

              {order && (
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-[10px] text-white/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{isEs ? 'Última orden' : 'Last order'} · {order.reference}</span>
                    <span className={'px-2 py-0.5 rounded-full text-[9px] font-bold ' + (
                      order.status === 'aprobado' ? 'bg-emerald-500/20 text-emerald-300'
                      : order.status === 'rechazado' || order.status === 'expirado' ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300')}>
                      {order.status}
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {isEs
                      ? 'El bot valida automáticamente tu transferencia y el administrador da el visto bueno final. Al aprobarse, el pase de 24 horas se activa solo.'
                      : 'The bot validates your transfer automatically and the administrator gives the final approval. On approval the 24-hour pass activates by itself.'}
                  </p>
                  {order.status === 'pendiente' && order.expiresAt > now && (
                    <button type="button" onClick={() => setSpeiOpen(true)} className="w-full mt-1 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {isEs ? 'Ver datos de transferencia (SPEI)' : 'View transfer details (SPEI)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SPEI transfer modal (reuses the platform flow) */}
      <SpeiModal
        isOpen={speiOpen}
        onClose={() => setSpeiOpen(false)}
        order={order}
        region={region}
        isEs={isEs}
        onTransferSent={handleTransferSent}
      />
    </div>
  );
}
