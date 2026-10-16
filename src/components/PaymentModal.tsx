import React, { useState } from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, Lock, ShieldCheck, Sparkles, CheckCircle2, DollarSign, Smartphone } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

export function PaymentModal({ isOpen, onClose, item, region, isEs, onSuccessPayment }: PaymentModalProps) {
  const [success] = useState(false);

  if (!isOpen || !item) return null;

  const isMx = region === 'MX';
  const currencyCode = isMx ? 'MXN' : 'USD';
  const currencySymbol = isMx ? '$' : '$';

  // Mexican IVA is shown separately. Other jurisdictions require tax configuration before launch.
  const baseAmount = item.amount;
  const taxAmount = isMx ? Math.round(baseAmount * 0.16 * 100) / 100 : 0;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    // Intentionally fail closed until a server-side payment provider and webhook are validated.
    alert(isEs
      ? 'Los cobros están deshabilitados durante la validación técnica. No se realizó ningún cargo ni se activó la membresía.'
      : 'Payments are disabled during technical validation. No charge was made and no membership was activated.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isEs ? 'Membresía y pago' : 'Membership and payment'}
          </h2>
          <p className="text-xs text-purple-300 mt-1">
            {isEs ? 'Cobros deshabilitados hasta validar la integración segura' : 'Payments disabled until secure integration is validated'}
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center flex flex-col items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <div>
              <h3 className="font-bold text-lg">{isEs ? '¡Pago Aprobado con Éxito!' : 'Payment Approved Successfully!'}</h3>
              <p className="text-xs text-emerald-200 mt-1">{isEs ? 'Transacción registrada y abonada al monedero virtual.' : 'Transaction processed and credited.'}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              {isEs ? 'Checkout temporalmente deshabilitado' : 'Checkout temporarily disabled'}
            </div>
            <p className="text-xs text-white/75 leading-relaxed">
              {isEs
                ? 'Esta pantalla solo muestra un cálculo informativo. No introduzcas datos bancarios: aún no hay una pasarela conectada ni confirmación de pago del servidor. La membresía no se activará hasta validar el proveedor, los webhooks y la conciliación.'
                : 'This screen is informational only. Do not enter payment details: no payment gateway or server-confirmed payment flow is connected yet. Membership will remain inactive until the provider, webhooks, and reconciliation are validated.'}
            </p>
            <button type="button" onClick={onClose} className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm">
              {isEs ? 'Cerrar sin pagar' : 'Close without paying'}
            </button>
          </div>   </form>
        )}
      </div>
    </div>
  );
}
