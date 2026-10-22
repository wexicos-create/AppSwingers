import React, { useEffect, useRef, useState } from 'react';
import { AppRegion, Creator, DonationRecord, SpeiOrder } from '../types';
import { X, Heart, Loader2, Clock, ShieldCheck, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { showToast } from './Toast';
import { SpeiModal } from './SpeiModal';
import { newSpeiOrder, createRemoteSpeiOrder, upsertLocalSpeiOrder, appendRemoteTimelineAndStatus, fetchRemoteSpeiOrdersForUser } from '../spei';
import { getDonationPrice, DONATION_PRESETS_MX, DONATION_PRESETS_US, createRemoteDonation, fetchDonationsForDonor } from '../eventflow';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: AppRegion;
  creator: Creator | null;
  userUid: string | null;
  userName: string;
  userProfileName: string;
  userEmail: string;
}

/**
 * Donations to content creators. The user pays what they want to donate plus
 * tax (IVA 16% in Mexico, ~8% sales tax in the US) through the SPEI flow.
 * When the administrator approves the payment, the donation is credited to
 * the creator's virtual earnings card (with the donor's profile name, so the
 * creator always knows who sent it) and the creator is notified.
 */
export function DonateModal({
  isOpen, onClose, isEs, region, creator, userUid, userName, userProfileName, userEmail,
}: DonateModalProps) {
  const presets = region === 'MX' ? DONATION_PRESETS_MX : DONATION_PRESETS_US;
  const [amount, setAmount] = useState<number>(presets[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<SpeiOrder | null>(null);
  const [myDonation, setMyDonation] = useState<DonationRecord | null>(null);
  const [speiOpen, setSpeiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const price = getDonationPrice(region, amount);
  const currency = price.currency;

  const refresh = async () => {
    if (!userUid || !creator) return;
    const list = await fetchDonationsForDonor(userUid);
    const mine = list.find(d => d.creatorHandle === creator.handle) || null;
    setMyDonation(mine);
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
  }, [isOpen, userUid, creator?.handle, order?.id]);

  if (!isOpen || !creator) return null;

  const startDonation = async () => {
    if (!userUid) return;
    if (!amount || amount <= 0) {
      showToast(isEs ? 'Elige o escribe un monto de donación válido.' : 'Choose or type a valid donation amount.', 'error');
      return;
    }
    setBusy(true);
    try {
      const meta = JSON.stringify({
        creatorHandle: creator.handle,
        creatorName: creator.name,
        donorProfileName: userProfileName,
        donorName: userName,
        amount,
        tax: price.tax,
        total: price.total,
        message,
      });
      const fresh: SpeiOrder = newSpeiOrder({
        kind: 'donacion',
        itemRef: creator.handle,
        label: isEs ? `Donación · ${creator.name}` : `Donation · ${creator.name}`,
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
      const donation: DonationRecord = {
        id: 'don_' + fresh.id,
        donorUid: userUid,
        donorName: userName,
        donorProfileName: userProfileName,
        creatorHandle: creator.handle,
        creatorName: creator.name,
        amount,
        tax: price.tax,
        total: price.total,
        message,
        status: 'pendiente',
        orderId: fresh.id,
        createdAt: Date.now(),
        decidedAt: null,
      };
      await createRemoteDonation(donation);
      setOrder(fresh);
      setSpeiOpen(true);
      showToast(isEs ? 'Orden creada: realiza la transferencia SPEI para completar tu donación.' : 'Order created: complete the SPEI transfer to finish your donation.');
    } finally {
      setBusy(false);
    }
  };

  const handleTransferSent = async (orderId: string) => {
    if (!order) return;
    await appendRemoteTimelineAndStatus(orderId, 'pendiente', isEs
      ? 'El usuario indicó que ya realizó la transferencia de la donación. El bot valida la referencia; el administrador la aprueba y la creadora recibe la notificación.'
      : 'The user confirmed the donation transfer. The bot validates the reference; the administrator approves it and the creator gets notified.');
    setSpeiOpen(false);
    showToast(isEs
      ? 'Transferencia registrada. Al aprobarla el administrador, la donación se abona a la tarjeta virtual de la creadora y ella sabrá que fuiste tú.'
      : 'Transfer registered. When the administrator approves it, the donation is credited to the creator card and she will know it was you.', 'info');
    setTimeout(() => { void refresh(); }, 20000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0514] border border-pink-500/40 p-5 shadow-2xl space-y-4 text-white my-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={creator.avatar} alt={creator.name} className="w-12 h-12 rounded-full object-cover border-2 border-pink-400" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {isEs ? 'Donación a creadora' : 'Donation to creator'}
              </span>
              <h3 className="text-base font-bold text-white leading-tight">{creator.name}</h3>
              <p className="text-[11px] text-purple-300">{creator.handle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition" aria-label={isEs ? 'Cerrar' : 'Close'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount picker */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">{isEs ? '¿Cuánto quieres donar?' : 'How much do you want to donate?'}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setAmount(p); setCustomAmount(''); }}
                className={'py-2.5 rounded-xl text-xs font-black transition ' + (amount === p && !customAmount
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-black shadow-lg'
                  : 'bg-white/5 border border-white/10 text-purple-200/70 hover:border-purple-400/40')}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setAmount(Number(e.target.value) || 0); }}
            placeholder={isEs ? 'O escribe otro monto' : 'Or type another amount'}
            className="w-full px-4 py-2.5 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Optional message */}
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder={isEs ? 'Mensaje opcional para la creadora...' : 'Optional message for the creator...'}
          className="w-full p-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
        />

        {/* Price breakdown */}
        <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-[11px] text-white/70 space-y-1">
          <div className="flex justify-between"><span>{isEs ? 'Tu donación' : 'Your donation'}</span><span className="text-white font-semibold">${amount.toLocaleString()} {currency}</span></div>
          <div className="flex justify-between"><span>{price.taxLabel} {isEs ? '(lo paga el usuario)' : '(paid by the user)'}</span><span className="text-white font-semibold">+${price.tax.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-pink-400 pt-1 border-t border-white/10"><span>{isEs ? 'Total por SPEI' : 'Total via SPEI'}</span><span>${price.total.toLocaleString()}</span></div>
          <p className="text-[10px] text-emerald-400 pt-1 flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {isEs ? 'La creadora sabrá qué perfil le mandó la donación. El valor se suma a su tarjeta virtual.' : 'The creator will know which profile sent the donation. The value adds to her virtual card.'}
          </p>
        </div>

        <button
          type="button"
          disabled={!amount || amount <= 0 || busy}
          onClick={startDonation}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white font-black text-sm shadow-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isEs ? `Donar $${price.total.toLocaleString()} ${currency}` : `Donate $${price.total.toLocaleString()} ${currency}`}
        </button>

        {/* Last order / donation status */}
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
            {order.status === 'aprobado' && myDonation && (
              <p className="text-emerald-300 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEs ? `Donación de $${myDonation.amount.toLocaleString()} entregada a ${creator.name}.` : `$${myDonation.amount.toLocaleString()} donation delivered to ${creator.name}.`}
              </p>
            )}
            {order.status === 'pendiente' && order.expiresAt > Date.now() && (
              <button type="button" onClick={() => setSpeiOpen(true)} className="w-full mt-1 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isEs ? 'Ver datos de transferencia (SPEI)' : 'View transfer details (SPEI)'}
              </button>
            )}
            {order.status === 'pendiente' && (
              <button type="button" onClick={() => { void refresh(); }} className="w-full mt-1 py-1.5 rounded-xl bg-white/5 text-purple-200 text-[9px] flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {isEs ? 'Actualizar estado' : 'Refresh status'}
              </button>
            )}
          </div>
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
