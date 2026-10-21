import React from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, ShieldAlert, Lock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

/**
 * Fail-closed checkout screen.
 * This app version previously collected sample card data and marked a payment as
 * approved with a timer. That was a simulation, not a payment processor.
 * Never accept card data or grant paid access until a real provider flow/webhook
 * is integrated and verified.
 */
export function PaymentModal({ isOpen, onClose, item, region, isEs }: PaymentModalProps) {
  if (!isOpen || !item) return null;

  const currencyCode = region === 'MX' ? 'MXN' : 'USD';
  const currencySymbol = '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-5 relative text-white">
        <button
          onClick={onClose}
          aria-label={isEs ? 'Cerrar' : 'Close'}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pt-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">{isEs ? 'Pago protegido' : 'Protected checkout'}</h2>
          <p className="text-xs text-purple-300 mt-1">{isEs ? 'No se capturan datos bancarios en esta pantalla.' : 'This screen does not collect card or bank details.'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-white/70">{item.label}</span>
            <strong>{currencySymbol}{item.amount.toLocaleString()} {currencyCode}</strong>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 text-amber-200 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{isEs
              ? 'El cobro real todavía no está conectado a esta pantalla. No se ha realizado ningún pago y no se activará una membresía desde aquí.'
              : 'Real checkout is not connected to this screen yet. No payment has been taken and no membership will be activated here.'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3 flex gap-2 text-xs text-white/60">
          <Lock className="w-4 h-4 shrink-0 text-purple-300" />
          <p>{isEs
            ? 'El siguiente paso es conectar esta pantalla al flujo SPEI de Supabase con una referencia única, validación del CEP y activación solo después de la confirmación del servidor.'
            : 'Next, connect this screen to the Supabase SPEI flow with a unique reference, CEP validation, and server-confirmed activation only.'}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:brightness-110 transition"
        >
          {isEs ? 'Entendido' : 'Understood'}
        </button>
      </div>
    </div>
  );
}
