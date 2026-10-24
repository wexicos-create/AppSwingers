import React, { useState } from 'react';
import { AppRegion, ProfileKind } from '../types';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  User,
  Users,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { IdentityFlow, IdentityFlowResult } from './IdentityFlow';
import { ProfileCompletion, ProfileCompletionData } from './ProfileCompletion';

type OnboardingStep = 'cuenta' | 'perfil' | 'identidad' | 'camara' | 'perfilFinal';

export interface OnboardingResult {
  alias: string;
  kind: ProfileKind;
  seeking: string[];
  ineFront: string;
  ineBack: string;
  selfie: string;
  docType: 'ine' | 'pasaporte';
  age: number;
  bio: string;
  ageMin: number;
  ageMax: number;
  photo: string;
}

interface OnboardingWizardProps {
  mode: 'register' | 'login' | 'resume';
  isEs: boolean;
  region: AppRegion;
  onCreateAccount: (email: string, password: string) => Promise<string | null>;
  onLoginAccount: (email: string, password: string) => Promise<string | null>;
  onComplete: (data: OnboardingResult) => void;
  onAbort: () => void;
  onOpenLegal: (topic: string) => void;
}

const STEP_ORDER: OnboardingStep[] = ['cuenta', 'perfil', 'identidad', 'camara', 'perfilFinal'];

const authErrorText = (code: string, isEs: boolean): string => {
  const map: Record<string, [string, string]> = {
    'auth/email-already-in-use': ['Este correo ya está registrado. Inicia sesión con él.', 'This email is already registered. Please log in with it.'],
    'auth/invalid-email': ['El correo no tiene un formato válido.', 'The email format is invalid.'],
    'auth/weak-password': ['La contraseña debe tener al menos 6 caracteres.', 'The password must be at least 6 characters long.'],
    'auth/invalid-credential': ['Correo o contraseña incorrectos.', 'Incorrect email or password.'],
    'auth/user-not-found': ['No existe una cuenta con este correo.', 'No account exists with this email.'],
    'auth/wrong-password': ['Contraseña incorrecta.', 'Incorrect password.'],
    'auth/too-many-requests': ['Demasiados intentos fallidos. Espera un momento antes de continuar.', 'Too many failed attempts. Please wait before trying again.'],
    'auth/network-request-failed': ['Error de red. Revisa tu conexión e inténtalo de nuevo.', 'Network error. Check your connection and try again.'],
    'auth/email-not-confirmed': ['Confirma tu correo para iniciar sesión: revisa tu bandeja de entrada.', 'Confirm your email to log in: check your inbox.'],
  };
  const pair = map[code];
  return pair ? (isEs ? pair[0] : pair[1]) : (isEs ? 'No se pudo completar la operación. Inténtalo de nuevo.' : 'Could not complete the operation. Please try again.');
};

// Shared interest-tag builder (Sugar adapts to the account kind).
export function buildSeekingOptions(kind: ProfileKind | null, isEs: boolean): string[] {
  const sugar = kind === 'Caballero' ? 'Sugar Daddy' : kind === 'Dama' ? 'Sugar Baby' : 'Sugar';
  return [
    isEs ? 'Encuentros casuales' : 'Casual encounters',
    isEs ? 'Encuentros informales' : 'Informal encounters',
    isEs ? 'Tríos' : 'Threesomes',
    'Hotwife',
    'GangBang',
    'Swingers',
    sugar,
  ];
}

export function OnboardingWizard({
  mode,
  isEs,
  region,
  onCreateAccount,
  onLoginAccount,
  onComplete,
  onAbort,
  onOpenLegal,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<OnboardingStep>(mode === 'resume' ? 'perfil' : 'cuenta');

  // Step 1: account credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Step 2: three profile questions
  const [alias, setAlias] = useState('');
  const [kind, setKind] = useState<ProfileKind | null>(null);
  const [seeking, setSeeking] = useState<string[]>([]);
  const [perfilWarning, setPerfilWarning] = useState<string | null>(null);

  // Step 3: identity terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Step 4: identity flow result (documents + liveness selfie)
  const [idResult, setIdResult] = useState<IdentityFlowResult | null>(null);

  const isRegister = mode !== 'login';
  const stepIndex = STEP_ORDER.indexOf(step);
  const sugarLabel = kind === 'Caballero' ? 'Sugar Daddy' : kind === 'Dama' ? 'Sugar Baby' : 'Sugar';
  const seekingOptions = [
    isEs ? 'Encuentros casuales' : 'Casual encounters',
    isEs ? 'Encuentros informales' : 'Informal encounters',
    isEs ? 'Tríos' : 'Threesomes',
    'Hotwife',
    'GangBang',
    'Swingers',
    sugarLabel,
  ];

  // ---------- Step navigation ----------
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setAuthError(isEs ? 'Ingresa un correo válido.' : 'Enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setAuthError(isEs ? 'La contraseña debe tener al menos 6 caracteres.' : 'The password must be at least 6 characters long.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setAuthError(isEs ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
      return;
    }
    setAuthBusy(true);
    const errorCode = isRegister ? await onCreateAccount(em, password) : await onLoginAccount(em, password);
    setAuthBusy(false);
    if (errorCode) {
      setAuthError(authErrorText(errorCode, isEs));
      return;
    }
    setStep('perfil');
  };

  const handleNextFromPerfil = () => {
    if (!alias.trim()) {
      setPerfilWarning(isEs ? 'Escribe un nombre o apodo para continuar.' : 'Write a name or alias to continue.');
      return;
    }
    if (!kind) {
      setPerfilWarning(isEs ? 'Selecciona quién eres: hombre, mujer o pareja.' : 'Select who you are: man, woman or couple.');
      return;
    }
    if (seeking.length === 0) {
      setPerfilWarning(isEs ? 'Selecciona al menos una opción de lo que buscas.' : 'Select at least one option of what you are looking for.');
      return;
    }
    setPerfilWarning(null);
    setStep('identidad');
  };

  const toggleSeeking = (item: string) => {
    setSeeking(prev => prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]);
  };

  const handleIdentityDone = (result: IdentityFlowResult) => {
    setIdResult(result);
    setStep('perfilFinal');
  };

  const handleProfileComplete = (p: ProfileCompletionData) => {
    if (!idResult || !kind) return;
    onComplete({
      alias: p.alias,
      kind,
      seeking: p.seeking,
      ineFront: idResult.ineFront,
      ineBack: idResult.ineBack,
      selfie: idResult.selfie,
      docType: idResult.docType,
      age: p.age,
      bio: p.bio,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      photo: p.photo,
    });
  };

  const legalLinks = [
    { id: 'privacidad', label: isEs ? 'Aviso de privacidad' : 'Privacy notice' },
    { id: 'terminos', label: isEs ? 'Términos y reglas de uso' : 'Terms and rules of use' },
    { id: 'seguridad', label: isEs ? 'Operaciones y reglas del sitio' : 'Site operations and rules' },
    { id: 'reglas', label: isEs ? 'Reglas de convivencia' : 'Community rules' },
  ];

  const prohibitions = isEs
    ? [
        'Contenido infantil: prohibición absoluta. Representa ban permanente y la entrega de datos a la autoridad correspondiente.',
        'Agresiones físicas o cualquier conducta que constituya un delito: colaboraremos y proporcionaremos los datos del usuario ante un requerimiento legal por abusos cometidos mediante esta plataforma.',
        'Prohibido robar, estafar o agredir a cualquier usuario.',
        'No nos hacemos responsables del uso que se dé a la plataforma; sí garantizamos y nos esforzamos por otorgar seguridad a los usuarios, evitar sucesos ilegales y formalizar de forma segura, en especial para las mujeres, un tema tan controversial.',
        'Reglas de sana convivencia: consentimiento mutuo, respeto y discreción en todo momento.',
        'La información pública de tu perfil no debe mostrar desnudos ni semi-desnudos; el contenido explícito únicamente por mensaje privado.',
        'Si el administrador no puede validar tu identidad, se te notificará y tu cuenta con credenciales será eliminada; en caso de ban, las credenciales se retienen un año por cualquier tema legal y después se borran.',
        'No manejamos reembolsos salvo una causa realmente justificada. Todas las membresías y comisiones incluyen IVA.',
      ]
    : [
        'Child content: absolute prohibition. It means permanent ban and handing data over to the corresponding authority.',
        'Physical aggression or any behavior constituting a crime: we will collaborate and provide the user data upon a legal request for abuses committed through this platform.',
        'Stealing, scamming or attacking any user is prohibited.',
        'We are not responsible for the use given to the platform; we do guarantee and strive to provide security to users, prevent illegal events and formalize safely, especially for women, such a controversial topic.',
        'Healthy coexistence rules: mutual consent, respect and discretion at all times.',
        'Your public profile information must not show nudes or semi-nudes; explicit content only through private messages.',
        'If the administrator cannot validate your identity, you will be notified and your account with credentials will be deleted; in case of ban, credentials are retained for one year for any legal matter and then purged.',
        'We do not handle refunds unless truly justified. All memberships and commissions include tax.',
      ];

  return (
    <div className="fixed inset-0 z-50 bg-[#050307] text-[#f5eeff] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md min-h-full flex flex-col px-5 py-5 relative">

        {/* Header with step indicator */}
        <div className="flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onAbort}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition"
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {STEP_ORDER.map((s, i) => (
              <span
                key={s}
                className={
                  i <= stepIndex
                    ? 'w-6 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500'
                    : 'w-6 h-1.5 rounded-full bg-white/15'
                }
              />
            ))}
          </div>
          <span className="text-[10px] font-bold text-white/40 w-8 text-right">{stepIndex + 1}/5</span>
        </div>

        {/* STEP 1: CUENTA */}
        {step === 'cuenta' && (
          <div className="flex-1 flex flex-col justify-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg mb-4">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white">
              {isRegister ? (isEs ? 'Crea tu cuenta' : 'Create your account') : (isEs ? 'Inicia sesión' : 'Log in')}
            </h1>
            <p className="text-xs text-purple-200/70 mt-1">
              {isEs
                ? 'Un registro normal con tu correo y una contraseña.'
                : 'A standard registration with your email and a password.'}
            </p>

            <form onSubmit={handleAccountSubmit} className="mt-6 space-y-3.5">
              <div>
                <label className="text-[11px] text-white/70 font-bold block mb-1">{isEs ? 'Correo electrónico' : 'Email'}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@dominio.com"
                  className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/70 font-bold block mb-1">{isEs ? 'Contraseña' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
              {isRegister && (
                <div>
                  <label className="text-[11px] text-white/70 font-bold block mb-1">{isEs ? 'Confirmar contraseña' : 'Confirm password'}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {authBusy
                  ? (isEs ? 'Un momento...' : 'One moment...')
                  : isRegister
                    ? (isEs ? 'Registrarme' : 'Sign up')
                    : (isEs ? 'Entrar' : 'Log in')}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: PERFIL (three questions on one screen) */}
        {step === 'perfil' && (
          <div className="flex-1 flex flex-col py-6">
            <h1 className="text-xl font-black text-white">
              {isEs ? 'Cuéntanos sobre ti' : 'Tell us about you'}
            </h1>
            <p className="text-[11px] text-purple-200/70 mt-0.5">
              {isEs ? 'Tres preguntas rápidas para personalizar tu experiencia.' : 'Three quick questions to personalize your experience.'}
            </p>

            <div className="mt-6 space-y-6 flex-1">
              {/* Question 1: name or alias */}
              <div>
                <label className="text-xs font-bold text-white block">
                  {isEs ? '¿Cómo te llamas?' : 'What is your name?'}
                </label>
                <input
                  value={alias}
                  onChange={(e) => { setAlias(e.target.value); setPerfilWarning(null); }}
                  placeholder={isEs ? 'Nombre o apodo' : 'Name or alias'}
                  maxLength={24}
                  className="mt-2 w-full px-4 py-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-sm focus:outline-none focus:border-pink-500"
                />
                <p className="text-[10px] text-pink-300/80 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isEs ? 'Un buen nombre te ayuda a tener más éxito en la comunidad.' : 'A good name helps you be more successful in the community.'}
                </p>
              </div>

              {/* Question 2: who you are */}
              <div>
                <span className="text-xs font-bold text-white block">
                  {isEs ? '¿Quién eres?' : 'Who are you?'}
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([
                    { k: 'Caballero' as ProfileKind, label: isEs ? 'HOMBRE' : 'MAN', icon: User },
                    { k: 'Dama' as ProfileKind, label: isEs ? 'MUJER' : 'WOMAN', icon: HeartHandshake },
                    { k: 'Pareja' as ProfileKind, label: isEs ? 'PAREJA' : 'COUPLE', icon: Users },
                  ]).map((opt) => {
                    const Icon = opt.icon;
                    const active = kind === opt.k;
                    return (
                      <button
                        key={opt.k}
                        type="button"
                        onClick={() => { setKind(opt.k); setPerfilWarning(null); }}
                        className={
                          'py-3.5 rounded-2xl border text-[11px] font-extrabold flex flex-col items-center gap-1.5 transition active:scale-95 ' +
                          (active
                            ? 'bg-gradient-to-b from-pink-600/40 to-purple-700/40 border-pink-400 text-white shadow-[0_0_20px_rgba(255,45,120,0.35)]'
                            : 'bg-black/50 border-white/10 text-white/60 hover:border-purple-400/40 hover:text-white')
                        }
                      >
                        <Icon className="w-5 h-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 3: what you are looking for (toggleable tags) */}
              <div>
                <span className="text-xs font-bold text-white block">
                  {isEs ? '¿Qué buscas?' : 'What are you looking for?'}
                </span>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {isEs ? 'Presiona una o varias etiquetas para activarlas.' : 'Tap one or several tags to activate them.'}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {seekingOptions.map((opt) => {
                    const active = seeking.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { toggleSeeking(opt); setPerfilWarning(null); }}
                        className={
                          'px-3.5 py-2 rounded-full border text-[11px] font-bold transition active:scale-95 ' +
                          (active
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400/60 text-white shadow-[0_0_15px_rgba(255,45,120,0.4)]'
                            : 'bg-black/50 border-white/15 text-white/60 hover:border-purple-400/40 hover:text-white')
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {perfilWarning && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{perfilWarning}</span>
                </div>
              )}
            </div>

            {/* SIGUIENTE button, bottom right with arrow */}
            <div className="flex justify-end pt-3 shrink-0">
              <button
                type="button"
                onClick={handleNextFromPerfil}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
              >
                {isEs ? 'SIGUIENTE' : 'NEXT'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: IDENTIDAD (age verification terms) */}
        {step === 'identidad' && (
          <div className="flex-1 flex flex-col py-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-lg mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-white">
              {isEs ? 'Necesitamos validar tu identidad' : 'We need to validate your identity'}
            </h1>
            <p className="text-xs text-purple-200/70 mt-1.5 leading-relaxed">
              {isEs
                ? 'Necesitamos validar tu identidad para garantizar el acceso a este tipo de contenido a personas mayores de edad (+18). A continuación capturaremos tu identificación oficial y realizaremos una prueba de vida con tu rostro.'
                : 'We need to validate your identity to guarantee that access to this kind of content is granted only to adults (+18). Next we will capture your official ID and run a liveness test with your face.'}
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
              <span className="text-[11px] font-bold text-white block">
                {isEs ? 'Términos legales y reglas de la plataforma' : 'Legal terms and platform rules'}
              </span>
              {prohibitions.map((p) => (
                <p key={p} className="text-[10px] text-purple-200/70 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </p>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {legalLinks.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onOpenLegal(l.id)}
                  className="text-[11px] text-purple-200/80 hover:text-purple-200 underline underline-offset-4 transition"
                >
                  {l.label}
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-pink-500 shrink-0"
              />
              <span className="text-[11px] text-white/80 leading-relaxed">
                {isEs
                  ? 'Acepto los términos y reglas de la plataforma, el aviso de privacidad y confirmo que soy mayor de 18 años.'
                  : 'I accept the platform terms and rules, the privacy notice, and I confirm I am over 18 years old.'}
              </span>
            </label>

            <div className="mt-auto flex items-center justify-between pt-5 shrink-0">
              <button
                type="button"
                onClick={() => setStep('perfil')}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isEs ? 'Atrás' : 'Back'}
              </button>
              <button
                type="button"
                disabled={!acceptedTerms}
                onClick={() => setStep('camara')}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isEs ? 'Continuar' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: DOCUMENTS + LIVENESS (delegated to IdentityFlow) */}
        {step === 'camara' && (
          <IdentityFlow
            isEs={isEs}
            region={region}
            onDone={handleIdentityDone}
          />
        )}

        {/* STEP 5: PROFILE COMPLETION (photo, presentation, age range) */}
        {step === 'perfilFinal' && (
          <ProfileCompletion
            isEs={isEs}
            initial={{ alias, kind: kind || 'Pareja', seeking }}
            onComplete={handleProfileComplete}
          />
        )}
      </div>
    </div>
  );
}
