import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, Lock, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

type BenefitKey = 'vip_plus' | 'ultra_vip' | 'event_listing' | 'featured_campaign' | 'profile_boost' | 'host_tools';
type CreateOrderResult = {
  orderId: string;
  reference: string;
  currency: 'MXN';
  subtotalMxn: number;
  ivaMxn: number;
  totalMxn: number;
  expiresAt: string;
  productLabel: string;
};
type ReportTransferResult = {
  success: boolean;
  status: string;
  trackingStatus: string;
  message: string;
};

const BENEFIT_KEYS: BenefitKey[] = ['vip_plus', 'ultra_vip', 'event_listing', 'featured_campaign', 'profile_boost', 'host_tools'];

function resolveBenefitKey(item: NonNullable<PaymentModalProps['item']>): BenefitKey {
  const source = `${item.ref} ${item.label}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const match = BENEFIT_KEYS.find((key) => source.includes(key));
  if (match) return match;
  // Do not guess a backend price for a product whose identifier is not in the server catalog.
  throw new Error('Este producto aún no está conectado al catálogo de cobro seguro. No se realizó ningún cargo.');
}

export function PaymentModal({ isOpen, onClose, item, region, isEs, onSuccessPayment }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [order, setOrder] = useState<CreateOrderResult | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [reported, setReported] = useState(false);

  if (!isOpen || !item) return null;

  const isMexico = region === 'MX';
  const currencyCode = isMexico ? 'MXN' : 'MXN';
  const displayedTotal = order?.totalMxn;
  const money = (value: number) => value.toLocaleString('es-MX', { style: 'currency', currency: currencyCode });

  const handleCreateOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsProcessing(true);
    try {
      if (!isMexico) throw new Error('Los pedidos SPEI están disponibles únicamente para México.');
      const benefitKey = resolveBenefitKey(item);
      const createOrder = httpsCallable<{ benefitKey: BenefitKey }, CreateOrderResult>(
        getFunctions(undefined, 'us-central1'),
        'createSpeiOrder'
      );
      const response = await createOrder({ benefitKey });
      setOrder(response.data);
      setReported(false);
      setTrackingNumber('');
      setNotice('Orden creada. El servidor calculó el precio; todavía no es un pago confirmado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la orden. No se realizó ningún cargo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order) return;
    setError(null);
    setNotice(null);
    setIsReporting(true);
    try {
      const reportTransfer = httpsCallable<
        { orderId: string; trackingNumber: string },
        ReportTransferResult
      >(getFunctions(undefined, 'us-central1'), 'reportSpeiTransfer');
      const response = await reportTransfer({
        orderId: order.orderId,
        trackingNumber: trackingNumber.trim(),
      });
      setReported(true);
      setNotice(response.data.message || 'Rastreo recibido; el pago sigue pendiente de revisión.');
      // Deliberately do not call onSuccessPayment: a tracking number is not proof of payment.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el rastreo.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md my-auto p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-5 relative text-white">
        <button onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center pr-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">{isEs ? 'Orden SPEI y validación' : 'SPEI order and verification'}</h2>
          <p className="text-xs text-purple-300 mt-1">{isEs ? 'La orden y el precio se calculan en el servidor.' : 'Order and price are calculated on the server.'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-sm">
          <div className="flex justify-between font-bold gap-3"><span>{order?.productLabel || item.label}</span><span className="whitespace-nowrap">{displayedTotal === undefined ? 'Importe calculado al crear orden' : money(displayedTotal)}</span></div>
          {order && <>
            <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{money(order.subtotalMxn)}</span></div>
            <div className="flex justify-between text-white/60"><span>IVA incluido en cálculo</span><span>{money(order.ivaMxn)}</span></div>
            <div className="border-t border-white/10 pt-2 flex justify-between text-white/60 text-xs"><span>Referencia de pago</span><span className="font-mono text-white break-all">{order.reference}</span></div>
            <p className="text-xs text-white/50">Vence: {new Date(order.expiresAt).toLocaleString('es-MX')}</p>
          </>}
        </div>

        {error && <div role="alert" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
        {notice && <div role="status" className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-100 text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{notice}</span></div>}

        {!order ? (
          <form onSubmit={handleCreateOrder} className="flex flex-col gap-3">
            <p className="text-xs text-white/60">{isEs
              ? 'Crear una orden no procesa el dinero ni activa la membresía. Usa únicamente los datos bancarios oficiales proporcionados por AppSwinger; no transfieras a cuentas compartidas por terceros.'
              : 'Creating an order does not process money or activate membership. Use only official bank details provided by AppSwinger.'}</p>
            <button type="submit" disabled={isProcessing} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-600 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isProcessing ? 'Creando orden…' : 'Crear orden SPEI'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleReportTransfer} className="flex flex-col gap-3">
            <label htmlFor="spei-tracking" className="text-sm font-semibold">Clave de rastreo SPEI / referencia bancaria</label>
            <input id="spei-tracking" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} minLength={5} maxLength={120} required disabled={reported || isReporting} autoComplete="off" className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-purple-400 disabled:opacity-60" placeholder="Ingresa la clave de rastreo" />
            <p className="text-xs text-white/55">Enviar la clave no confirma el depósito. El equipo debe contrastar el CEP y el abono real antes de activar el beneficio.</p>
            <button type="submit" disabled={isReporting || reported || trackingNumber.trim().length < 5} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-rose-600 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {isReporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{reported ? 'Rastreo enviado para revisión' : isReporting ? 'Enviando rastreo…' : 'Reportar transferencia'}</span>
            </button>
            {reported && <p className="text-xs text-emerald-300">El beneficio no se activa hasta que un administrador autorizado confirme el movimiento bancario.</p>}
          </form>
        )}
      </div>
    </div>
  );
}
