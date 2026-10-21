import React, { useState } from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, ShieldCheck, Copy, Landmark, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

function createOrderReference() {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    : Math.random().toString(36).slice(2, 12).toUpperCase();
  return `AS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`;
}

export function PaymentModal({ isOpen, onClose, item, region, isEs, onSuccessPayment }: PaymentModalProps) {
  const [reference, setReference] = useState('');
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const currencyCode = region === 'MX' ? 'MXN' : 'USD';
  const baseAmount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0;

  const createPendingOrder = () => {
    if (!baseAmount || created) return;
    const orderRef = createOrderReference();
    setReference(orderRef);
    setCreated(true);
    onSuccessPayment({
      id: orderRef,
      kind: item.kind,
      ref: item.ref,
      label: item.label,
      amount: baseAmount,
      status: 'pendiente',
      ts: Date.now(),
    });
  };

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <section role="dialog" aria-modal="true" aria-labelledby="spei-title" className="relative my-auto flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-cyan-400/20 bg-slate-950 p-5 text-white shadow-2xl sm:p-7">
        <button type="button" onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
        <header className="pr-10">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
            <Landmark className="h-6 w-6" />
          </div>
          <h2 id="spei-title" className="text-xl font-black">{isEs ? 'Checkout seguro · Transferencia SPEI' : 'Secure checkout · Bank transfer'}</h2>
          <p className="mt-1 text-sm text-slate-400">{isEs ? 'El pedido queda pendiente hasta que un administrador verifique el pago.' : 'The order remains pending until an administrator verifies payment.'}</p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">{isEs ? 'Servicio seleccionado' : 'Selected service'}</p>
              <h3 className="mt-1 font-bold">{item.label}</h3>
            </div>
            <p className="whitespace-nowrap text-xl font-black text-cyan-300">${baseAmount.toLocaleString(isEs ? 'es-MX' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">{currencyCode}</span></p>
          </div>
        </div>

        {!created ? (
          <>
            <ol className="grid grid-cols-3 gap-2 text-center text-xs">
              <li className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-cyan-200"><CheckCircle2 className="mx-auto mb-1 h-4 w-4" />{isEs ? 'Elegir servicio' : 'Choose service'}</li>
              <li className="rounded-xl border border-white/15 bg-white/5 p-3 text-white"><Landmark className="mx-auto mb-1 h-4 w-4" />{isEs ? 'Crear pedido' : 'Create order'}</li>
              <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-slate-400"><ShieldCheck className="mx-auto mb-1 h-4 w-4" />{isEs ? 'Revisión manual' : 'Manual review'}</li>
            </ol>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm text-amber-100">
              <div className="mb-1 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 shrink-0" />{isEs ? 'Instrucciones bancarias pendientes de configuración' : 'Bank instructions need configuration'}</div>
              {isEs
                ? 'No se muestra una CLABE ni un beneficiario ficticio. CA Enterprise debe configurar los datos oficiales de recepción antes de recibir transferencias. Crear el pedido no confirma el pago ni activa una membresía.'
                : 'No fake account or beneficiary details are shown. CA Enterprise must configure official receiving details before accepting transfers. Creating an order does not confirm payment or activate a membership.'}
            </div>
            <button type="button" onClick={createPendingOrder} disabled={!baseAmount} className="w-full rounded-xl bg-cyan-500 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
              {isEs ? 'Generar referencia y dejar pedido pendiente' : 'Generate reference and leave order pending'}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.07] p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200"><Clock3 className="h-5 w-5" /><span className="font-bold">{isEs ? 'Pedido creado · Pendiente de pago' : 'Order created · Payment pending'}</span></div>
              <p className="text-sm text-slate-300">{isEs ? 'Guarda esta referencia. La transferencia aún no se ha confirmado y tu rango no cambia hasta la aprobación manual.' : 'Save this reference. The transfer is not confirmed and your membership does not change until manual approval.'}</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <code className="break-all font-mono text-lg font-bold tracking-wider">{reference}</code>
                <button type="button" onClick={copyReference} aria-label={isEs ? 'Copiar referencia' : 'Copy reference'} className="shrink-0 rounded-lg bg-white/10 p-2 hover:bg-white/20"><Copy className="h-4 w-4" /></button>
              </div>
              <p aria-live="polite" className="mt-2 text-xs text-slate-400">{copied ? (isEs ? 'Referencia copiada.' : 'Reference copied.') : (isEs ? 'Usa la referencia exacta en el concepto de transferencia cuando se te proporcionen los datos bancarios oficiales.' : 'Use the exact reference in the transfer concept once official bank details are provided.')}</p>
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
              {isEs ? 'Este pedido está registrado en el estado local de la aplicación. Para que la revisión persista entre dispositivos, falta conectarlo a un backend seguro y a un panel admin con autorización del servidor.' : 'This order is currently registered in the app state. Cross-device review requires a secure backend and server-authorized admin panel.'}
            </div>
            <button type="button" onClick={onClose} className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-semibold hover:bg-white/15">{isEs ? 'Cerrar' : 'Close'}</button>
          </div>
        )}
        <footer className="flex items-center justify-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-4 w-4" />{isEs ? 'Nunca compartas contraseñas ni códigos bancarios de un solo uso.' : 'Never share passwords or one-time banking codes.'}</footer>
      </section>
    </div>
  );
}
