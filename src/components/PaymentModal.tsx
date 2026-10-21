import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, Lock, ShieldCheck, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

export function PaymentModal({ isOpen, onClose, item, region, isEs }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isMx = region === 'MX';
  const currencyCode = isMx ? 'MXN' : 'USD';
  const baseAmount = item.amount;
  const taxAmount = isMx ? Math.round(baseAmount * 0.16 * 100) / 100 : 0;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  const createPendingOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      setError(isEs ? 'Inicia sesión antes de crear un pedido.' : 'Sign in before creating an order.');
      return;
    }
    setIsSubmitting(true);
    try {
      const order = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        itemKind: item.kind,
        itemRef: item.ref,
        itemLabel: item.label,
        amount: totalAmount,
        currency: currencyCode,
        paymentMethod: 'SPEI',
        paymentStatus: 'pending',
        membershipStatus: 'inactive',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewRequired: true,
      });
      setOrderId(order.id);
    } catch {
      setError(isEs
        ? 'No se pudo registrar el pedido. No realices una transferencia hasta recibir instrucciones bancarias verificadas.'
        : 'The order could not be registered. Do not transfer funds until verified bank instructions are provided.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center pr-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">{isEs ? 'Pedido y pago por SPEI' : 'Order and SPEI payment'}</h2>
          <p className="text-xs text-purple-200/80 mt-1">{isEs ? 'La membresía no se activa hasta que administración verifique el ingreso.' : 'Membership stays inactive until an administrator verifies the funds.'}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/50">{isEs ? 'Servicio' : 'Service'}</p>
          <p className="font-semibold text-white mt-1">{item.label}</p>
          <div className="flex items-end justify-between mt-4">
            <span className="text-xs text-white/60">{isEs ? 'Total con impuestos aplicables' : 'Total including applicable tax'}</span>
            <strong className="text-2xl text-white">${totalAmount.toLocaleString()} <span className="text-sm">{currencyCode}</span></strong>
          </div>
        </div>

        {!orderId ? (
          <>
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 flex gap-2 text-amber-100/90 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{isEs
                ? 'Este paso registra únicamente un pedido pendiente. No confirma una transferencia ni habilita la membresía. Las instrucciones bancarias deben estar verificadas antes de transferir.'
                : 'This step only creates a pending order. It does not confirm a transfer or activate membership. Bank instructions must be verified before transferring.'}</span>
            </div>
            {error && <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{error}</p>}
            <form onSubmit={createPendingOrder}>
              <button disabled={isSubmitting} type="submit" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Lock className="w-4 h-4" />}
                {isSubmitting ? (isEs ? 'Registrando pedido…' : 'Registering order…') : (isEs ? 'Crear pedido pendiente' : 'Create pending order')}
              </button>
            </form>
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-bold text-emerald-200">{isEs ? 'Pedido registrado' : 'Order registered'}</h3>
            <p className="text-xs text-white/80 mt-2">{isEs ? 'Estado: pendiente de revisión administrativa. No se ha confirmado ningún pago y tu membresía sigue inactiva.' : 'Status: pending administrator review. No payment has been confirmed and your membership remains inactive.'}</p>
            <p className="text-[11px] text-white/50 mt-3 break-all">{isEs ? 'Folio del pedido' : 'Order ID'}: {orderId}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-200"><Clock3 className="w-4 h-4" />{isEs ? 'Espera las instrucciones oficiales de pago' : 'Wait for official payment instructions'}</div>
            <button onClick={onClose} className="w-full mt-4 py-3 rounded-xl bg-white/10 text-white font-semibold">{isEs ? 'Cerrar' : 'Close'}</button>
          </div>
        )}
        <p className="text-[10px] text-white/40 text-center flex items-center justify-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />{isEs ? 'Registro pendiente; no equivale a comprobante bancario.' : 'Pending record; not proof of bank payment.'}</p>
      </div>
    </div>
  );
}
