import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { ShieldCheck, X, ExternalLink, Loader2, LockKeyhole, AlertTriangle, CheckCircle2 } from 'lucide-react';

type VerificationStatus = 'not_started' | 'pending' | 'verified' | 'rejected' | 'unavailable';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isEs: boolean;
}

/**
 * Privacy-first identity verification handoff.
 * The app must never upload/store raw INE images or face templates itself.
 * A configured, contracted identity provider hosts capture and liveness checks;
 * the trusted backend creates sessions and verifies signed provider webhooks.
 */
export const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({ isOpen, onClose, user, isEs }) => {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>('not_started');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;
  const t = (es: string, en: string) => isEs ? es : en;

  const startVerification = async () => {
    if (!user) {
      setMessage(t('Inicia sesión antes de verificar tu identidad.', 'Sign in before verifying your identity.'));
      return;
    }
    if (!consent) {
      setMessage(t('Debes aceptar el aviso de privacidad y el consentimiento específico.', 'You must accept the privacy notice and specific consent.'));
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/identity-verification/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType: 'MX_INE', checks: ['document_authenticity', 'face_match', 'liveness'], consentVersion: 'mx-identity-v1' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || t('El servicio de verificación aún no está configurado. No se ha enviado ni guardado ninguna identificación.', 'The verification service is not configured yet. No ID document has been sent or stored.'));
      }
      if (typeof payload.verificationUrl !== 'string') {
        throw new Error(t('El servidor no devolvió una sesión de verificación válida.', 'The server did not return a valid verification session.'));
      }
      const url = new URL(payload.verificationUrl);
      if (url.protocol !== 'https:' || url.username || url.password) {
        throw new Error(t('El enlace seguro de verificación no es válido.', 'The secure verification link is invalid.'));
      }
      setStatus('pending');
      window.location.assign(url.toString());
    } catch (error) {
      setStatus('unavailable');
      setMessage(error instanceof Error ? error.message : t('No fue posible iniciar la verificación.', 'Could not start verification.'));
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async () => {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/identity-verification/status', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || t('No se pudo consultar el estado; el servicio puede no estar configurado.', 'Could not check status; the service may not be configured.'));
      if (!['pending', 'verified', 'rejected', 'not_started'].includes(payload.status)) throw new Error(t('Estado de verificación no reconocido.', 'Unrecognized verification status.'));
      setStatus(payload.status as VerificationStatus);
      setMessage(payload.status === 'verified'
        ? t('Identidad verificada por el proveedor. El servidor es la autoridad del estado.', 'Identity verified by the provider. The server is authoritative.')
        : payload.status === 'pending'
          ? t('La revisión sigue pendiente.', 'Review is still pending.')
          : payload.status === 'rejected'
            ? t('La verificación no fue aprobada. Contacta soporte para conocer las opciones de revisión.', 'Verification was not approved. Contact support for review options.')
            : t('No hay una verificación activa.', 'There is no active verification.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('No se pudo consultar el estado.', 'Could not check status.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/90 backdrop-blur-xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="identity-verification-title">
      <div className="w-full max-w-md my-auto rounded-3xl bg-[#10061e] border border-purple-500/40 p-5 text-white shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="rounded-2xl p-3 bg-emerald-500/10 border border-emerald-400/30"><ShieldCheck className="w-6 h-6 text-emerald-300" /></div>
            <div>
              <h2 id="identity-verification-title" className="text-lg font-black">{t('Verificación de identidad', 'Identity verification')}</h2>
              <p className="text-xs text-purple-200/70 mt-1">{t('INE mexicana + comparación facial + prueba de vida', 'Mexican INE + face match + liveness check')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label={t('Cerrar', 'Close')}><X className="w-5 h-5" /></button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
          <p className="font-bold flex items-center gap-2"><LockKeyhole className="w-4 h-4 text-emerald-300" />{t('Captura privada y segura', 'Private, secure capture')}</p>
          <p className="text-xs leading-relaxed text-white/70">{t('La captura de la INE y el rostro debe ocurrir dentro de la página segura de un proveedor de verificación contratado. AppSwinguer no debe recibir ni guardar fotos de tu INE, selfies biométricas o plantillas faciales.', 'INE and face capture must take place on the secure page of a contracted verification provider. AppSwinguer should not receive or store ID photos, biometric selfies, or face templates.')}</p>
          <p className="text-xs leading-relaxed text-white/70">{t('El proveedor devolverá únicamente el resultado y un identificador de sesión. La aprobación final debe validarse en el servidor mediante webhook firmado; nunca se acepta una marca de “verificado” enviada por el navegador.', 'The provider should return only a result and session identifier. Final approval must be validated server-side using a signed webhook; a browser-submitted “verified” flag is never trusted.')}</p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-purple-400/20 p-3 text-xs leading-relaxed">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-pink-500" />
          <span>{t('Consiento expresamente el tratamiento de mis datos de identificación y la comprobación facial por el proveedor que se identifique antes de continuar. Entiendo que puedo cancelar antes de enviar mis documentos y que el aviso de privacidad debe explicar finalidad, conservación, transferencias, derechos ARCO y contacto responsable.', 'I expressly consent to processing my identity data and face check by the provider identified before continuing. I understand I can cancel before submitting documents and that the privacy notice must explain purpose, retention, transfers, rights, and the responsible contact.')}</span>
        </label>

        {status === 'verified' && <p className="text-sm text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{t('Verificación aprobada', 'Verification approved')}</p>}
        {message && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" /><span>{message}</span></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" disabled={busy || !consent || !user} onClick={startVerification} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}{t('Iniciar verificación', 'Start verification')}
          </button>
          <button type="button" disabled={busy || !user} onClick={refreshStatus} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold disabled:opacity-40">{t('Consultar estado', 'Check status')}</button>
        </div>
        {!user && <p className="text-xs text-amber-200">{t('Inicia sesión para continuar.', 'Sign in to continue.')}</p>}
        <p className="text-[10px] text-white/40">{t('La verificación está desactivada hasta configurar proveedor, backend, webhook y aviso de privacidad. No se simula una aprobación.', 'Verification remains disabled until the provider, backend, webhook, and privacy notice are configured. Approval is never simulated.')}</p>
      </div>
    </div>
  );
};
