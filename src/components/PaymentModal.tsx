import React from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, ShieldCheck, Clock3, Lock, Building2, Globe2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

/**
 * Payment processing is disabled until a provider and server-side verification
 * are configured. This screen must never simulate approval or activate a plan.
 */
export function PaymentModal({ isOpen, onClose, item, region, isEs }: PaymentModalProps) {
  if (!isOpen || !item) return null;

  const isMx = region === 'MX';
  const currency = isMx ? 'MXN' : 'USD';
  const baseAmount = Number(item.amount) || 0;
  const taxAmount = isMx ? Math.round(baseAmount * 0.16 * 100) / 100 : 0;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
  const money = (amount: number) => new Intl.NumberFormat(isEs ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-5 relative">
        <button type="button" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 id="payment-title" className="text-xl font-bold text-white">{isEs ? 'Pago seguro' : 'Secure payment'}</h2>
          <p className="text-xs text-purple-300 mt-1">{isEs ? 'La confirmación depende del proveedor de pagos.' : 'Confirmation depends on the payment provider.'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs">
          <div className="flex justify-between gap-3 font-bold text-white text-sm">
            <span>{item.label}</span><span>{money(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-white/60 pt-1 border-t border-white/10">
            <span>{isEs ? 'Subtotal' : 'Subtotal'}</span><span>{money(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>{isEs ? 'IVA estimado (16%)' : 'Estimated tax (16%)'}</span><span>{money(taxAmount)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-100 text-sm">
          <div className="flex items-center gap-2 font-bold mb-2"><Clock3 className="w-4 h-4" />{isEs ? 'Pagos aún no habilitados' : 'Payments not yet enabled'}</div>
          <p>{isEs
            ? 'La pasarela real y la verificación del pago en el servidor todavía deben configurarse y probarse. No se realizará ningún cobro desde esta pantalla y la membresía no se activará.'
            : 'The live payment gateway and server-side verification still need to be configured and tested. This screen will not charge you or activate a membership.'}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs text-white/70">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><Building2 className="w-4 h-4 text-purple-300" /><span>{isEs ? 'SPEI: validación CEP y conciliación pendientes.' : 'SPEI: CEP verification and reconciliation pending.'}</span></div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><Globe2 className="w-4 h-4 text-purple-300" /><span>{isEs ? 'Tarjeta / Google Pay: integración de proveedor pendiente.' : 'Card / Google Pay: provider integration pending.'}</span></div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><Lock className="w-4 h-4 text-purple-300" /><span>{isEs ? 'La membresía solo debe activarse tras confirmación del servidor.' : 'Membership must only activate after server confirmation.'}</span></div>
        </div>

        <button type="button" onClick={onClose} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:brightness-110 transition">
          {isEs ? 'Entendido' : 'Understood'}
        </button>
      </div>
    </div>
  );
}
