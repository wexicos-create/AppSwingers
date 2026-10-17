import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BadgeCheck, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';

type IdentityStatus = 'not_started' | 'pending' | 'in_review' | 'approved' | 'declined' | 'expired';

const labels: Record<IdentityStatus, { es: string; en: string }> = {
  not_started: { es: 'Identidad sin verificar', en: 'Identity not verified' },
  pending: { es: 'Verificación pendiente', en: 'Verification pending' },
  in_review: { es: 'En revisión', en: 'In review' },
  approved: { es: 'Identidad verificada', en: 'Identity verified' },
  declined: { es: 'No aprobada; revisa los datos e intenta de nuevo', en: 'Not approved; review details and try again' },
  expired: { es: 'Sesión vencida; inicia una nueva', en: 'Session expired; start a new one' }
};

export const IdentityVerification: React.FC<{ user: User; isEs?: boolean }> = ({ user, isEs = true }) => {
  const [status, setStatus] = useState<IdentityStatus>('not_started');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acceptedBiometricConsent, setAcceptedBiometricConsent] = useState(false);

  useEffect(() => onSnapshot(doc(db, 'users', user.uid), snap => {
    const value = snap.data()?.identityVerification?.status;
    if (['pending', 'in_review', 'approved', 'declined', 'expired'].includes(value)) setStatus(value as IdentityStatus);
    else setStatus('not_started');
  }, () => setError(isEs ? 'No se pudo consultar el estado de verificación.' : 'Could not load verification status.')), [user.uid, isEs]);

  const start = async () => {
    if (!acceptedBiometricConsent) {
      setError(isEs ? 'Debes aceptar el tratamiento de datos de identidad y biométricos para continuar.' : 'Consent to identity and biometric data processing to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/identity/session', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.url !== 'string') throw new Error(payload.error || 'Could not start verification');
      window.location.assign(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEs ? 'No se pudo iniciar la verificación.' : 'Could not start verification.'));
      setBusy(false);
    }
  };

  const title = labels[status][isEs ? 'es' : 'en'];
  return (
    <section className="rounded-3xl border border-purple-500/30 bg-[#100720] p-5 text-white">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-200">
          {status === 'approved' ? <BadgeCheck className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{isEs ? 'Verificación real de identidad' : 'Real identity verification'}</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            {isEs ? 'Flujo alojado por Didit: INE/documento oficial, prueba de vida y comparación facial, según el flujo habilitado en tu cuenta Didit. AppSwinger solo recibe el resultado.' : 'Hosted by Didit: ID document, liveness and face match, depending on the workflow enabled in Didit. AppSwinger receives the decision only.'}
          </p>
          <p className="mt-3 text-sm font-semibold text-purple-200">{title}</p>
        </div>
      </div>
      {status !== 'approved' && <>
      <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/70"><input type="checkbox" checked={acceptedBiometricConsent} onChange={e => setAcceptedBiometricConsent(e.target.checked)} className="mt-0.5 accent-purple-500" /><span>{isEs ? 'Autorizo expresamente a Didit a procesar mi documento oficial, imagen facial y prueba de vida para verificar mi identidad. Entiendo que puedo consultar el aviso de privacidad de AppSwinger y que no se publicarán estos datos en mi perfil.' : 'I expressly authorize Didit to process my ID document, facial image and liveness check for identity verification. I understand I can review AppSwinger’s privacy notice and these data will not be public.'}</span></label>
      <button type="button" onClick={start} disabled={busy || !acceptedBiometricConsent} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-bold disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {busy ? (isEs ? 'Conectando con Didit…' : 'Connecting to Didit…') : (status === 'pending' || status === 'in_review' ? (isEs ? 'Iniciar / repetir verificación' : 'Start / retry verification') : (isEs ? 'Verificar con INE y rostro' : 'Verify ID and face'))}
      </button></>}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-white/40">{isEs ? 'La insignia solo se activa tras validar el webhook firmado de Didit. No se aceptan capturas como prueba.' : 'The badge is granted only after validating Didit’s signed webhook. Screenshots are not accepted.'}</p>
    </section>
  );
};
