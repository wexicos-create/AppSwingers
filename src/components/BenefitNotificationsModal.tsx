import React from 'react';
import { Bell, CalendarClock, CheckCircle2, Clock3, X } from 'lucide-react';
import { ApprovedEntitlement, BENEFIT_CATALOG, entitlementState } from '../lib/benefitLifecycle';

interface BenefitNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  entitlement: ApprovedEntitlement | null;
  loading: boolean;
  error?: string | null;
}

export function BenefitNotificationsModal({ isOpen, onClose, isEs, entitlement, loading, error }: BenefitNotificationsModalProps) {
  if (!isOpen) return null;
  const state = entitlement ? entitlementState(entitlement) : null;
  const definition = entitlement ? BENEFIT_CATALOG[entitlement.benefitKey] : null;
  const expires = state?.expiresAt ? new Date(state.expiresAt).toLocaleString(isEs ? 'es-MX' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="benefit-notifications-title">
      <section className="w-full max-w-md rounded-3xl border border-purple-400/25 bg-[#0c0714] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-purple-400/10 p-3 text-purple-200"><Bell className="h-5 w-5" /></span><div><h2 id="benefit-notifications-title" className="text-lg font-black">{isEs ? 'Notificaciones de beneficios' : 'Benefit notifications'}</h2><p className="text-xs text-white/55">{isEs ? 'Aviso de vencimiento y estado de activación' : 'Expiry reminder and activation status'}</p></div></div>
          <button onClick={onClose} aria-label={isEs ? 'Cerrar' : 'Close'} className="rounded-lg p-2 text-white/60 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        {loading ? <p className="rounded-xl bg-white/5 p-4 text-sm text-white/65">{isEs ? 'Consultando beneficios aprobados…' : 'Checking approved benefits…'}</p>
          : error ? <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{error}</p>
          : !entitlement ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="font-semibold">{isEs ? 'No hay beneficios pagados activos' : 'No active paid benefits'}</p><p className="mt-1 text-xs leading-relaxed text-white/55">{isEs ? 'Un depósito pendiente o una captura de pago no activa un plan. El beneficio aparece aquí después de la aprobación administrativa y el registro seguro en el servidor.' : 'A pending deposit or payment screenshot does not activate a plan. A benefit appears here only after admin approval and secure server registration.'}</p></div>
          : <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2">{state?.active ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <Clock3 className="h-5 w-5 text-amber-300" />}<h3 className="font-bold">{definition?.label || entitlement.benefitKey}</h3></div><p className="mt-2 text-xs text-white/60">{state?.active ? (isEs ? 'Depósito aprobado · beneficio activo' : 'Deposit approved · benefit active') : state?.expired ? (isEs ? 'Beneficio vencido' : 'Benefit expired') : (isEs ? 'Pendiente de activación o revocado' : 'Awaiting activation or revoked')}</p>{expires && <p className="mt-2 flex items-center gap-2 text-xs text-white/70"><CalendarClock className="h-4 w-4 text-purple-300" />{isEs ? 'Vence:' : 'Expires:'} {expires}</p>}</div>
            {state?.shouldNotify && <div role="status" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4"><p className="font-bold text-amber-100">{isEs ? 'Tu beneficio está por vencer' : 'Your benefit is about to expire'}</p><p className="mt-1 text-sm text-amber-100/80">{isEs ? `Quedan ${state.daysRemaining} día(s). Este aviso aparece dentro de los últimos 3 días.` : `${state.daysRemaining} day(s) remaining. This reminder appears during the final 3 days.`}</p></div>}
            {state?.expired && <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-100">{isEs ? 'El plazo terminó. El servidor debe retirar automáticamente los permisos premium; esta pantalla solo muestra el estado.' : 'The term has ended. The server must automatically revoke premium entitlements; this screen only displays status.'}</p>}
          </div>}
        <p className="mt-4 text-[10px] leading-relaxed text-white/40">{isEs ? 'La notificación dentro de la app se calcula al abrirla. Las notificaciones push con la app cerrada requieren un servicio de envío del servidor y no están configuradas todavía.' : 'In-app reminders are calculated when the app opens. Push notifications while the app is closed require a server delivery service and are not configured yet.'}</p>
      </section>
    </div>
  );
}
