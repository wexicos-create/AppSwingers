import React, { useState } from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, Lock, AlertTriangle, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

type OrderResponse = {
  orderId?: string;
  status?: 'pending' | 'confirmed';
  message?: string;
  amount?: number;
  currency?: string;
};

export function PaymentModal({ isOpen, onClose, item, region, isEs, onSuccessPayment }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const currencyCode = region === 'MX' ? 'MXN' : 'USD';
  const currencySymbol = '$';
  const baseAmount = item.amount;
  const taxAmount = Math.round(baseAmount * 0.16 * 100) / 100;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);
    try {
      // This endpoint must authenticate the user, calculate price server-side, and create
      // a provider-backed order. The client never declares a payment successful.
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: item.kind, ref: item.ref, region }),
      });
      const result = await response.json().catch(() => ({})) as OrderResponse;
      if (!response.ok || !result.orderId || !result.status) {
        throw new Error(result.message || (isEs
          ? 'La pasarela de pago aún no está configurada. No se realizó ningún cobro.'
          : 'The payment gateway is not configured yet. No charge was made.'));
      }
      setOrderId(result.orderId);
      if (result.status === 'confirmed') {
        // Confirmation must only be returned by a trusted backend after provider verification.
        onSuccessPayment({
          id: result.orderId,
          kind: item.kind,
          ref: item.ref,
          label: item.label,
          amount: typeof result.amount === 'number' ? result.amount : totalAmount,
          status: 'confirmado',
          ts: Date.now(),
        });
      } else {
        setError(isEs
          ? 'Orden creada; el pago sigue pendiente. El acceso se habilitará únicamente tras la confirmación del proveedor.'
          : 'Order created; payment is pending. Access will unlock only after provider confirmation.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEs
        ? 'No fue posible verificar el pago. Inténtalo más tarde.'
        : 'Payment could not be verified. Please try again later.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-5 relative">
        <button onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{isEs ? 'Pago y confirmación segura' : 'Secure payment and confirmation'}</h2>
          <p className="text-xs text-purple-300 mt-1">{isEs ? 'El estado se valida en el servidor; esta pantalla no procesa tarjetas.' : 'Status is verified server-side; this screen does not process card details.'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs">
          <div className="flex justify-between font-bold text-white text-sm gap-3">
            <span>{item.label}</span><span className="whitespace-nowrap">{currencySymbol}{totalAmount.toLocaleString()} {currencyCode}</span>
          </div>
          <div className="flex justify-between text-white/60"><span>{isEs ? 'Subtotal' : 'Subtotal'}</span><span>{currencySymbol}{baseAmount.toLocaleString()} {currencyCode}</span></div>
          <div className="flex justify-between text-white/60"><span>{isEs ? 'Impuesto estimado (16%)' : 'Estimated tax (16%)'}</span><span>{currencySymbol}{taxAmount.toLocaleString()} {currencyCode}</span></div>
        </div>
        {error && <div role="status" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
        {orderId && <p className="text-xs text-white/60">{isEs ? 'Referencia de orden:' : 'Order reference:'} <span className="font-mono">{orderId}</span></p>}
        <form onSubmit={handlePay} className="flex flex-col gap-3">
          <p className="text-xs text-white/60">{isEs
            ? 'Se solicitará una orden al servidor comercial. No introduzcas números de tarjeta aquí. SPEI y otros métodos requieren proveedor y webhook configurados.'
            : 'A payment order will be requested from the commerce server. Do not enter card numbers here. SPEI and other methods require a configured provider and webhook.'}</p>
          <button type="submit" disabled={isProcessing} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{isProcessing ? (isEs ? 'Solicitando orden…' : 'Requesting order…') : (isEs ? 'Solicitar pago verificado' : 'Request verified payment')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
