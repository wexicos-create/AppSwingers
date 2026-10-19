import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Eye, EyeOff, Mail, ShieldCheck, X } from 'lucide-react';

interface AccountAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  onSuccess: (created: boolean) => void;
}

export function AccountAccessModal({ isOpen, onClose, isEs, onSuccess }: AccountAccessModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;
  const t = (es: string, en: string) => isEs ? es : en;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    if (mode === 'register' && (!adult || !terms)) {
      setError(t('Debes confirmar que tienes 18 años o más y aceptar las reglas de seguridad.', 'You must confirm you are 18 or older and accept the safety rules.'));
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError(t('Las contraseñas no coinciden.', 'Passwords do not match.'));
      return;
    }
    if (password.length < 8) {
      setError(t('Usa una contraseña de al menos 8 caracteres.', 'Use a password of at least 8 characters.'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await sendEmailVerification(credential.user);
          setMessage(t('Cuenta creada. Te enviamos un correo para verificar tu dirección; completa ahora tu perfil.', 'Account created. We sent an email verification link; complete your profile now.'));
        } catch {
          setMessage(t('Cuenta creada. No se pudo enviar el correo de verificación; solicita reenviarlo desde tu cuenta.', 'Account created. Verification email could not be sent; request another from your account.'));
        }
        onSuccess(true);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onSuccess(false);
      }
    } catch (cause) {
      const code = (cause as { code?: string })?.code || '';
      const messages: Record<string, string> = {
        'auth/email-already-in-use': t('Ese correo ya tiene una cuenta. Inicia sesión.', 'That email already has an account. Sign in.'),
        'auth/invalid-email': t('El correo no tiene un formato válido.', 'Enter a valid email address.'),
        'auth/invalid-credential': t('Correo o contraseña incorrectos.', 'Incorrect email or password.'),
        'auth/weak-password': t('La contraseña es demasiado débil.', 'Password is too weak.'),
        'auth/too-many-requests': t('Demasiados intentos. Espera y vuelve a intentarlo.', 'Too many attempts. Wait and try again.'),
        'auth/network-request-failed': t('No hay conexión. Revisa tu internet e inténtalo de nuevo.', 'Network unavailable. Check your connection and retry.')
      };
      setError(messages[code] || t('No se pudo completar la operación. Revisa la configuración de Firebase Authentication.', 'Could not complete the operation. Check Firebase Authentication configuration.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="account-access-title">
      <div className="my-auto w-full max-w-md rounded-3xl border border-fuchsia-400/25 bg-[#0b0811] p-5 text-white shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> AppSwinger · 18+</span>
            <h2 id="account-access-title" className="mt-3 text-2xl font-black">{mode === 'register' ? t('Crea tu cuenta', 'Create your account') : t('Bienvenido de vuelta', 'Welcome back')}</h2>
            <p className="mt-1 text-sm text-white/60">{t('Usa tu correo y contraseña. Después configurarás tus preferencias y afinidades.', 'Use your email and password. Then set up your preferences and affinities.')}</p>
          </div>
          <button onClick={onClose} aria-label={t('Cerrar', 'Close')} className="rounded-full p-2 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
          <button type="button" onClick={() => { setMode('register'); setError(''); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'register' ? 'bg-fuchsia-300 text-black' : 'text-white/60'}`}>{t('Crear cuenta', 'Sign up')}</button>
          <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'login' ? 'bg-fuchsia-300 text-black' : 'text-white/60'}`}>{t('Iniciar sesión', 'Sign in')}</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-white/75">{t('Correo electrónico', 'Email address')}
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3"><Mail className="h-4 w-4 text-fuchsia-200" /><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="tu@correo.com" /></span>
          </label>
          <label className="block text-xs font-bold text-white/75">{t('Contraseña', 'Password')}
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder={t('Mínimo 8 caracteres', 'At least 8 characters')} /><button type="button" aria-label={t('Mostrar contraseña', 'Show password')} onClick={() => setShowPassword(v => !v)} className="text-white/50"><Eye className="h-4 w-4" /></button></span>
          </label>
          {mode === 'register' && <label className="block text-xs font-bold text-white/75">{t('Confirmar contraseña', 'Confirm password')}<input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:border-fuchsia-300" /></label>}
          {mode === 'register' && <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/70">
            <label className="flex items-start gap-2"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} className="mt-0.5 accent-fuchsia-400" /><span>{t('Confirmo que tengo 18 años o más. La declaración no sustituye una verificación de identidad.', 'I confirm I am 18 or older. This declaration does not replace identity verification.')}</span></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 accent-fuchsia-400" /><span>{t('Acepto las reglas: consentimiento explícito y revocable; prohibido contenido íntimo no consentido, menores, amenazas, explotación o actividades ilegales. Puedo bloquear y denunciar.', 'I accept the rules: explicit, revocable consent; non-consensual intimate content, minors, threats, exploitation and illegal activity are prohibited. I can block and report.')}</span></label>
          </div>}
          {error && <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-200">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-fuchsia-300 to-pink-400 px-4 py-3.5 text-sm font-black text-black disabled:opacity-50">{busy ? t('Procesando…', 'Working…') : mode === 'register' ? t('Crear cuenta y continuar', 'Create account & continue') : t('Entrar', 'Sign in')}</button>
          <p className="text-center text-[10px] leading-relaxed text-white/40">{t('La creación de cuenta requiere Firebase Authentication correctamente configurado. La verificación de edad e identidad se gestiona por separado.', 'Account creation requires Firebase Authentication to be configured. Age and identity verification are handled separately.')}</p>
        </form>
      </div>
    </div>
  );
}
