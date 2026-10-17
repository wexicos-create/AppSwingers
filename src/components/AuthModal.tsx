import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, syncUserProfile } from '../firebase';
import { X, Mail, Lock, UserRound, Loader2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  isEs?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onGoogleSignIn, isEs = true }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (mode === 'recover') {
        if (!email.trim()) throw new Error(isEs ? 'Escribe el correo de tu cuenta.' : 'Enter your account email.');
        await sendPasswordResetEmail(auth, email.trim());
        setMessage(isEs ? 'Si la cuenta existe, recibirás un correo con instrucciones para recuperar el acceso.' : 'If the account exists, recovery instructions will be emailed.');
      } else if (mode === 'register') {
        if (!acceptedTerms) throw new Error(isEs ? 'Debes aceptar los términos y el aviso de privacidad.' : 'You must accept the terms and privacy notice.');
        if (password.length < 8) throw new Error(isEs ? 'Usa una contraseña de al menos 8 caracteres.' : 'Use a password of at least 8 characters.');
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await syncUserProfile(credential.user, { displayName: name.trim() || credential.user.email || 'Usuario', newsletterOptIn: newsletter, newsletterConsentAt: newsletter ? serverTimestamp() : null, termsAcceptedAt: serverTimestamp(), authMethod: 'email' } as any);
        await sendEmailVerification(credential.user);
        setMessage(isEs ? 'Cuenta creada. Te enviamos un correo para verificar tu dirección. La suscripción a novedades solo se activa si marcaste esa casilla.' : 'Account created. Check your email to verify your address.');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onClose();
      }
    } catch (e: any) {
      const code = String(e?.code || '');
      const safeMessage = code === 'auth/email-already-in-use' ? 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.'
        : code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' ? 'Correo o contraseña incorrectos.'
        : code === 'auth/weak-password' ? 'La contraseña debe tener al menos 8 caracteres.'
        : code === 'auth/invalid-email' ? 'El correo no tiene un formato válido.'
        : e?.message || 'No se pudo completar la solicitud. Intenta de nuevo.';
      setError(safeMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4" role="dialog" aria-modal="true" aria-label="Acceso a AppSwinger">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-500/30 bg-[#10071d] p-6 text-white shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-white/60 hover:bg-white/10" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-300"><ShieldCheck className="h-6 w-6" /></div>
          <div><h2 className="text-xl font-black">AppSwinger</h2><p className="text-xs text-purple-200/70">{isEs ? 'Acceso seguro con correo' : 'Secure email access'}</p></div>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/5 p-1">
          <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className={`rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-purple-600 text-white' : 'text-white/60'}`}>Iniciar sesión</button>
          <button type="button" onClick={() => { setMode('register'); setError(''); setMessage(''); }} className={`rounded-lg py-2 text-sm font-bold ${mode === 'register' ? 'bg-purple-600 text-white' : 'text-white/60'}`}>Crear cuenta</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <label className="block text-xs font-semibold text-purple-100">Nombre o alias<div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><UserRound className="h-4 w-4 text-purple-300"/><input value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname" className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Tu alias" /></div></label>}
          <label className="block text-xs font-semibold text-purple-100">Correo electrónico<div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Mail className="h-4 w-4 text-purple-300"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="w-full bg-transparent py-3 text-sm outline-none" placeholder="tu@correo.com" /></div></label>
          {mode !== 'recover' && <label className="block text-xs font-semibold text-purple-100">Contraseña<div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Lock className="h-4 w-4 text-purple-300"/><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Mínimo 8 caracteres" /></div></label>}
          {mode === 'register' && <>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-white/75"><input required type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-purple-500"/><span>Acepto los términos de uso y el aviso de privacidad de AppSwinger.</span></label>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-white/75"><input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)} className="mt-0.5 accent-purple-500"/><span>Quiero recibir novedades, avisos y correos de AppSwinger. Puedo cancelar la suscripción después.</span></label>
          </>}
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</p>}
          <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 font-bold disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{mode === 'register' ? 'Crear cuenta' : mode === 'recover' ? 'Enviar recuperación por correo' : 'Iniciar sesión'}</button>
        </form>
        {mode === 'login' && <button onClick={() => {setMode('recover');setError('');setMessage('');}} className="mt-3 w-full text-center text-xs text-purple-200 underline">¿Olvidaste tu contraseña?</button>}
        {mode === 'recover' && <button onClick={() => {setMode('login');setError('');setMessage('');}} className="mt-3 w-full text-center text-xs text-purple-200 underline">Volver a iniciar sesión</button>}
        <div className="my-4 flex items-center gap-3 text-[10px] text-white/35"><span className="h-px flex-1 bg-white/10"/><span>O</span><span className="h-px flex-1 bg-white/10"/></div>
        <button type="button" onClick={async()=>{setBusy(true);setError('');try{await onGoogleSignIn();onClose();}catch{setError('No se pudo iniciar sesión con Google.');}finally{setBusy(false);}}} disabled={busy} className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">Continuar con Google</button>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/40">La recuperación de contraseña se realiza por correo electrónico. AppSwinger nunca te pedirá tu contraseña por correo.</p>
      </div>
    </div>
  );
};
