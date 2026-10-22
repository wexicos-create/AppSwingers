import React, { useState, useEffect } from 'react';
import { AppRegion, SpeiOrder } from '../types';
import { X, Landmark, Copy, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSpeiConfig, formatClabe } from '../spei';
import { showToast } from './Toast';

interface SpeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SpeiOrder | null;
  region: AppRegion;
  isEs: boolean;
  onTransferSent: (orderId: string) => void;
}

export function SpeiModal({ isOpen, onClose, order, region, isEs, onTransferSent }: SpeiModalProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const cfg = getSpeiConfig();
  const currencyCode = region === 'MX' ? 'MXN' : 'USD';
  const remaining = order.expiresAt - now;
  const expired = remaining <= 0;
  const minutes = Math.max(0, Math.floor(remaining / 60000));
  const seconds = Math.max(0, Math.floor((remaining % 60000) / 1000));
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const amountText = '$' + order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' ' + currencyCode;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(isEs ? label + ' copiado al portapapeles.' : label + ' copied to clipboard.');
    } catch {
      showToast(isEs ? 'No se pudo copiar automáticamente. Cópialo manualmente.' : 'Could not copy automatically. Copy it manually.', 'error');
    }
  };

  const renderRow = (label: string, value: string, mono: boolean) => (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <span className="text-[10px] uppercase font-bold text-white/50 block">{label}</span>
        <span className={'text-xs text-white break-all ' + (mono ? 'font-mono' : '')}>{value}</span>
      </div>
      <button
        type="button"
        onClick={() => copy(value, label)}
        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 shrink-0 transition"
        aria-label={'Copiar ' + label}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-md p-5 rounded-3xl bg-zinc-950 border border-emerald-500/40 shadow-2xl flex flex-col gap-4 relative my-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center mx-auto mb-2 border border-emerald-500/40 shadow-lg">
            <Landmark className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">{isEs ? 'Pago por Transferencia SPEI' : 'SPEI Bank Transfer'}</h2>
          <p className="text-[11px] text-purple-200/70 mt-0.5">{order.label}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/30 text-center">
          <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Total a transferir (IVA incluido)' : 'Total to transfer (tax included)'}</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{amountText}</span>
          <span className={'text-[10px] font-bold block mt-1.5 px-2.5 py-1 rounded-full ' + (expired ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300')}>
            {expired ? (isEs ? 'Orden expirada' : 'Order expired') : (isEs ? 'Vence en ' + mm + ':' + ss : 'Expires in ' + mm + ':' + ss)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
          <span className="text-xs font-bold text-white block mb-1">{isEs ? 'Instrucciones de pago' : 'Payment instructions'}</span>
          {renderRow(isEs ? 'Banco receptor' : 'Receiving bank', cfg.bank, false)}
          {renderRow('CLABE', formatClabe(cfg.clabe), true)}
          {renderRow(isEs ? 'Beneficiario' : 'Beneficiary', cfg.beneficiary, false)}
          {renderRow(isEs ? 'Concepto (contiene tu ID de pago)' : 'Concept (contains your payment ID)', order.concept, true)}
          {renderRow(isEs ? 'Monto exacto' : 'Exact amount', amountText, true)}
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {isEs
              ? 'Tu referencia ' + order.reference + ' identifica el pago y el motivo. La confirmación es automática mediante conexión bancaria; si no está disponible, el administrador valida manualmente. Al aprobarse, tu plan se activa automáticamente sin pasos adicionales.'
              : 'Your reference ' + order.reference + ' identifies this payment and its purpose. Confirmation is automatic via bank connection; if unavailable, the admin validates manually. On approval your plan activates automatically with no extra steps.'}
          </span>
        </div>

        {expired ? (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {isEs ? 'La orden expiró. Genera una nueva desde tu plan.' : 'This order expired. Generate a new one from your plan.'}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onTransferSent(order.id)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isEs ? 'Ya realicé mi transferencia' : 'I already made my transfer'}
          </button>
        )}
      </div>
    </div>
  );
}
