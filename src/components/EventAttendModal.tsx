import React, { useEffect, useRef, useState } from 'react';
import { AppRegion, ClubEvent, EventAccessPass, EventTier, SpeiOrder } from '../types';
import { X, Calendar, MapPin, Loader2, Clock, ShieldCheck, Download, BellRing, Ticket, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { showToast } from './Toast';
import { SpeiModal } from './SpeiModal';
import { newSpeiOrder, createRemoteSpeiOrder, upsertLocalSpeiOrder, appendRemoteTimelineAndStatus, fetchRemoteSpeiOrdersForUser } from '../spei';
import {
  getEventDepositPrice,
  fetchEventPassesForUser,
  downloadEventTicket,
  isEventDay,
  isEventPast,
} from '../eventflow';

interface EventAttendModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: AppRegion;
  event: ClubEvent | null;
  tier: EventTier | null;
  userUid: string | null;
  userName: string;
  userEmail: string;
  passes: EventAccessPass[];
  onPassChange: (passes: EventAccessPass[]) => void;
}

/**
 * Event attendance deposit. Each user pays ONCE through SPEI to reserve their
 * seat; the administrator confirms the payment and issues the VIP access pass
 * (three groups of four digits). The exact location is released the same day
 * of the event for security, and the technical sheet (payment receipt with
 * the APPSWINGER watermark, ID = order reference) can be downloaded at any
 * time. Disclosures are explicit before paying: a no-show is not refunded,
 * and if the organizer does not admit the attendee, they ARE refunded.
 */
export function EventAttendModal({
  isOpen, onClose, isEs, region, event, tier, userUid, userName, userEmail, passes, onPassChange,
}: EventAttendModalProps) {
  const [order, setOrder] = useState<SpeiOrder | null>(null);
  const [speiOpen, setSpeiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const pollRef = useRef<number | null>(null);

  const myPass = event ? passes.find(p => p.eventId === event.id && p.status !== 'cancelado') || null : null;

  const refresh = async () => {
    if (!userUid) return;
    const list = await fetchEventPassesForUser(userUid);
    onPassChange(list);
    if (order) {
      try {
        const remote = await fetchRemoteSpeiOrdersForUser(userUid);
        const fresh = remote.find(o => o.id === order.id);
        if (fresh && fresh.status !== order.status) setOrder(fresh);
      } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
    pollRef.current = window.setInterval(() => { void refresh(); }, 15000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userUid, event?.id, order?.id]);

  if (!isOpen || !event) return null;

  const price = getEventDepositPrice(region, tier ? tier.price : 0);
  const currency = price.currency;
  const pendingOrder = order && order.status === 'pendiente' || order?.status === 'verificado';

  const startDeposit = async () => {
    if (!userUid || !tier) return;
    setBusy(true);
    try {
      const meta = JSON.stringify({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventZone: event.zone,
        organizerUid: event.organizerUid || null,
        organizerName: event.organizer,
        tierId: tier.id,
        tierLabel: tier.label,
        depositAmount: price.total,
      });
      const fresh: SpeiOrder = newSpeiOrder({
        kind: 'evento',
        itemRef: event.id,
        label: isEs ? `Depósito evento · ${event.title}` : `Event deposit · ${event.title}`,
        amount: price.total,
        userName,
        userEmail,
        userUid,
      });
      fresh.meta = meta;
      const saved = await createRemoteSpeiOrder(fresh);
      if (!saved) {
        showToast(isEs ? 'No se pudo crear la orden de pago. Revisa tu conexión e inténtalo de nuevo.' : 'Could not create the payment order. Check your connection and try again.', 'error');
        return;
      }
      upsertLocalSpeiOrder(fresh);
      setOrder(fresh);
      setSpeiOpen(true);
      showToast(isEs ? 'Orden creada: realiza la transferencia SPEI para apartar tu lugar.' : 'Order created: complete the SPEI transfer to reserve your seat.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransferSent = async (orderId: string) => {
    if (!order) return;
    await appendRemoteTimelineAndStatus(orderId, 'pendiente', isEs
      ? 'El usuario indicó que ya realizó la transferencia del depósito. El bot valida la referencia; el administrador confirma y emite el pase VIP.'
      : 'The user confirmed the deposit transfer. The bot validates the reference; the administrator confirms and issues the VIP pass.');
    setSpeiOpen(false);
    showToast(isEs
      ? 'Transferencia registrada. Al aprobarla, el administrador emite tu pase VIP con código de acceso y tu ficha técnica queda disponible para descargar.'
      : 'Transfer registered. On approval, the administrator issues your VIP pass with the access code and your technical sheet becomes downloadable.', 'info');
    setTimeout(() => { void refresh(); }, 20000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0514] border border-purple-500/40 p-5 shadow-2xl space-y-4 text-white my-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              {isEs ? 'Depósito de asistencia' : 'Attendance deposit'}
            </span>
            <h3 className="text-lg font-black text-white leading-tight">{event.title}</h3>
            <p className="text-[11px] text-purple-200/70 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {event.date} · {event.time} · {event.zone}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition" aria-label={isEs ? 'Cerrar' : 'Close'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACTIVE PASS */}
        {myPass && (
          <div className="space-y-3">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/60 via-pink-950/30 to-purple-950/60 border border-pink-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {myPass.status === 'usado' ? (isEs ? 'Pase utilizado' : 'Pass used') : (isEs ? 'Pase activo' : 'Active pass')}
                </span>
                <span className="text-[10px] text-white/50">${myPass.amount.toLocaleString()} {isEs ? 'pagados' : 'paid'}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-white/50 uppercase tracking-widest block">{isEs ? 'Tu código de acceso' : 'Your access code'}</span>
                <span className="text-2xl font-mono font-black text-pink-300 tracking-wider block mt-1">{myPass.code}</span>
                <span className="text-[9px] text-white/40 block mt-1">{isEs ? 'Preséntalo en la puerta del evento · ID de orden: ' : 'Show it at the door · Order ID: '}{myPass.orderRef}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-[11px] text-purple-200/80 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                {isEventDay(myPass.eventDate) ? (
                  <span>{isEs ? '¡Hoy es tu evento! Zona: ' : 'Your event is today! Zone: '} <strong className="text-white">{myPass.eventZone}</strong>. {isEs ? 'Ubicación exacta liberada: acude a la zona indicada a la hora publicada.' : 'Exact location released: head to the zone at the published time.'}</span>
                ) : (
                  <span>{isEs ? 'Zona aproximada: ' : 'Approximate zone: '} <strong className="text-white">{myPass.eventZone}</strong>. {isEs ? 'La ubicación exacta se entrega el mismo día del evento por seguridad.' : 'The exact location is delivered the same day of the event for security.'}</span>
                )}
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-[11px] text-purple-200/80 flex items-start gap-2">
                <BellRing className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>{isEs ? 'Te avisamos al entrar a la app el día del evento (alarma de día y hora) y tu ficha técnica está lista.' : 'We remind you when you open the app on the event day, and your technical sheet is ready.'}</span>
              </div>
              <button
                type="button"
                onClick={() => { downloadEventTicket(myPass, isEs); showToast(isEs ? 'Ficha técnica descargada con marca de agua APPSWINGER.' : 'Technical sheet downloaded with the APPSWINGER watermark.'); }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                {isEs ? 'DESCARGAR ficha técnica (comprobante)' : 'DOWNLOAD technical sheet (receipt)'}
              </button>
              <p className="text-[9px] text-white/40 leading-relaxed">
                {isEs
                  ? 'La ficha es tu comprobante de pago; no se presenta en el evento, en la puerta solo presentas el código VIP. Si no asistes, tu depósito no es reembolsable; si el organizador no te admite, se te reembolsa.'
                  : 'The sheet is your payment receipt; it is not presented at the event, at the door you only show the VIP code. If you do not attend, your deposit is not refundable; if the organizer does not admit you, you are refunded.'}
              </p>
            </div>
            <button type="button" onClick={() => { void refresh(); }} className="w-full py-2.5 rounded-2xl bg-white/5 text-[11px] text-purple-200 flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              {isEs ? 'Actualizar' : 'Refresh'}
            </button>
          </div>
        )}

        {/* PAYWALL */}
        {!myPass && tier && (
          <div className="space-y-3">
            <div className="p-4 rounded-3xl bg-gradient-to-b from-purple-950/70 to-black/50 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{tier.label}</span>
                <span className="text-lg font-black text-amber-300">${price.total.toLocaleString()} <span className="text-[10px]">{currency}</span></span>
              </div>
              <span className="text-[11px] text-purple-200/60 block">{tier.note}</span>
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-[11px] text-white/70 space-y-1">
                <div className="flex justify-between"><span>{isEs ? 'Depósito base' : 'Base deposit'}</span><span className="text-white font-semibold">${price.base.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>{price.taxLabel}</span><span className="text-white font-semibold">+${price.tax.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-pink-400 pt-1 border-t border-white/10"><span>{isEs ? 'Total a pagar por SPEI' : 'Total to pay via SPEI'}</span><span>${price.total.toLocaleString()}</span></div>
              </div>
            </div>

            {/* Explicit pre-payment disclosures */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isEs ? 'Aclaraciones obligatorias antes de pagar' : 'Mandatory disclosures before paying'}
              </span>
              <p className="text-[11px] text-white/75 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{isEs ? 'Si NO asistes al evento, tu depósito NO es reembolsable: el lugar quedó reservado para ti y pasa al organizador.' : 'If you do NOT attend the event, your deposit is NOT refundable: the seat was reserved for you and goes to the organizer.'}</span>
              </p>
              <p className="text-[11px] text-white/75 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{isEs ? 'Si el organizador NO te admite, se te REEMBOLSA tu depósito automáticamente.' : 'If the organizer does NOT admit you, your deposit is automatically REFUNDED.'}</span>
              </p>
              <p className="text-[11px] text-white/75 leading-relaxed flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                <span>{isEs ? 'El pase del código, el día, la hora y el aviso de ubicación se entregan el mismo día del evento por temas de seguridad.' : 'The code pass, date, time and location notice are delivered the same day of the event for security reasons.'}</span>
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input type="checkbox" checked={acceptedNoRefund} onChange={(e) => setAcceptedNoRefund(e.target.checked)} className="mt-0.5 w-4 h-4 accent-pink-500 shrink-0" />
                <span className="text-[11px] text-white/80 leading-relaxed">
                  {isEs ? 'Entiendo que si no asisto no se me reembolsa, y que solo presento mi código VIP en el evento.' : 'I understand that if I do not attend I am not refunded, and that I only present my VIP code at the event.'}
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!acceptedNoRefund || busy}
              onClick={startDeposit}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-black text-sm shadow-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {isEs ? `Pagar depósito $${price.total.toLocaleString()} ${currency}` : `Pay deposit $${price.total.toLocaleString()} ${currency}`}
            </button>
          </div>
        )}

        {/* PENDING ORDER STATUS */}
        {!myPass && order && (
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
              {order.status === 'aprobado'
                ? (isEs ? '¡Depósito aprobado! Tu pase VIP se está emitiendo, actualiza en unos segundos.' : 'Deposit approved! Your VIP pass is being issued; refresh in a few seconds.')
                : (isEs ? 'El bot valida tu transferencia y el administrador confirma. Al aprobarse, tu pase VIP se emite automáticamente.' : 'The bot validates your transfer and the administrator confirms. On approval, your VIP pass is issued automatically.')}
            </p>
            {pendingOrder && order.expiresAt > Date.now() && (
              <button type="button" onClick={() => setSpeiOpen(true)} className="w-full mt-1 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isEs ? 'Ver datos de transferencia (SPEI)' : 'View transfer details (SPEI)'}
              </button>
            )}
          </div>
        )}

        {isEventPast(event.date) && !myPass && (
          <p className="text-[10px] text-white/40 text-center">{isEs ? 'Este evento ya pasó.' : 'This event has already passed.'}</p>
        )}
      </div>

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
