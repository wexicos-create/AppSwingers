import React, { useState, useEffect, useRef } from 'react';
import { AppRegion, ProfileKind } from '../types';
import { compressImage } from '../organizers';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  User,
  Users,
  HeartHandshake,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

type OnboardingStep = 'cuenta' | 'perfil' | 'identidad' | 'camara';
type CameraSide = 'front' | 'back';

interface OnboardingWizardProps {
  mode: 'register' | 'login' | 'resume';
  isEs: boolean;
  region: AppRegion;
  onCreateAccount: (email: string, password: string) => Promise<string | null>;
  onLoginAccount: (email: string, password: string) => Promise<string | null>;
  onComplete: (data: { alias: string; kind: ProfileKind; seeking: string[]; ineFront: string; ineBack: string }) => void;
  onAbort: () => void;
  onOpenLegal: (topic: string) => void;
}

const STEP_ORDER: OnboardingStep[] = ['cuenta', 'perfil', 'identidad', 'camara'];

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
  };
  const pair = map[code];
  return pair ? (isEs ? pair[0] : pair[1]) : (isEs ? 'No se pudo completar la operación. Inténtalo de nuevo.' : 'Could not complete the operation. Please try again.');
};

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

  // Step 4: rear-camera document capture
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [side, setSide] = useState<CameraSide>('front');
  const [ineFront, setIneFront] = useState('');
  const [ineBack, setIneBack] = useState('');
  const [finalBusy, setFinalBusy] = useState(false);

  const isRegister = mode !== 'login';
  const stepIndex = STEP_ORDER.indexOf(step);
  const docLabel = region === 'MX'
    ? (isEs ? 'INE/Pasaporte' : 'INE/Passport')
    : (isEs ? 'ID/Pasaporte' : 'ID/Passport');

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

  // ---------- Camera lifecycle (rear camera for the ID document) ----------
  useEffect(() => {
    if (step !== 'camara') return;
    let active = true;
    let localStream: MediaStream | null = null;
    const start = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('unsupported');
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(localStream);
        setCameraReady(true);
      } catch {
        if (active) setCameraError(true);
      }
    };
    void start();
    return () => {
      active = false;
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, [step]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const max = 800;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const applyCapture = (target: CameraSide, data: string) => {
    if (target === 'front') setIneFront(data);
    else setIneBack(data);
  };

  const handleShutter = () => {
    const data = captureFrame();
    if (!data) return;
    applyCapture(side, data);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('reader'));
    reader.readAsDataURL(file);
  });

  const handleDocFile = async (file: File, target: CameraSide) => {
    try {
      const data = await compressImage(file);
      applyCapture(target, data);
    } catch {
      try {
        const raw = await readFileAsDataUrl(file);
        applyCapture(target, raw);
      } catch { /* ignore unreadable file */ }
    }
  };

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

  const handleFinish = () => {
    if (!ineFront || !ineBack || !kind) return;
    setFinalBusy(true);
    if (stream) stream.getTracks().forEach(t => t.stop());
    onComplete({
      alias: alias.trim(),
      kind,
      seeking,
      ineFront,
      ineBack,
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
      ]
    : [
        'Child content: absolute prohibition. It means permanent ban and handing data over to the corresponding authority.',
        'Physical aggression or any behavior constituting a crime: we will collaborate and provide the user data upon a legal request for abuses committed through this platform.',
        'Stealing, scamming or attacking any user is prohibited.',
        'We are not responsible for the use given to the platform; we do guarantee and strive to provide security to users, prevent illegal events and formalize safely, especially for women, such a controversial topic.',
        'Healthy coexistence rules: mutual consent, respect and discretion at all times.',
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
          <span className="text-[10px] font-bold text-white/40 w-8 text-right">{stepIndex + 1}/4</span>
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
                ? 'Necesitamos validar tu identidad para garantizar el acceso a este tipo de contenido a personas mayores de edad (+18). A continuación capturaremos tu identificación oficial con la cámara.'
                : 'We need to validate your identity to guarantee that access to this kind of content is granted only to adults (+18). Next we will capture your official ID with the camera.'}
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

        {/* STEP 4: CÁMARA (rear camera, ID document) */}
        {step === 'camara' && (
          <div className="flex-1 flex flex-col py-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-black text-white">
                  {side === 'front'
                    ? (isEs ? `Coloca tu ${docLabel}` : `Place your ${docLabel}`)
                    : (isEs ? 'Voltea tu documento' : 'Flip your document')}
                </h1>
                <p className="text-[10px] text-purple-200/70">
                  {side === 'front'
                    ? (isEs ? 'Frente del documento dentro del marco.' : 'Front side of the document inside the frame.')
                    : (isEs ? 'Ahora captura el reverso del documento.' : 'Now capture the back side of the document.')}
                </p>
              </div>
            </div>

            {/* Live camera capture */}
            {cameraReady && !cameraError && (
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-purple-500/30">
                <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                {/* Framing guide */}
                <div className="absolute inset-4 rounded-2xl border-2 border-dashed border-pink-400/70 pointer-events-none" />
                <span className="absolute top-5 inset-x-0 text-center text-[11px] font-bold text-white drop-shadow-lg">
                  {side === 'front'
                    ? (isEs ? `Coloca tu ${docLabel}` : `Place your ${docLabel}`)
                    : (isEs ? 'Reverso del documento' : 'Back side of the document')}
                </span>
              </div>
            )}

            {/* Camera unavailable: file fallback */}
            {cameraError && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                <p className="text-[11px] text-amber-200 leading-relaxed">
                  {isEs
                    ? 'No pudimos abrir la cámara de este dispositivo. Puedes subir las fotos de tu documento desde tu galería o cámara del sistema.'
                    : 'We could not open this device camera. You can upload your document photos from your gallery or system camera.'}
                </p>
                <div className="space-y-2">
                  <label className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center cursor-pointer transition">
                    {isEs ? `Foto frente (${docLabel})` : `Front photo (${docLabel})`}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleDocFile(f, 'front'); }}
                    />
                  </label>
                  <label className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold text-center cursor-pointer transition">
                    {isEs ? 'Foto reverso' : 'Back photo'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleDocFile(f, 'back'); }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Preview thumbnails */}
            {(ineFront || ineBack) && (
              <div className="mt-4 flex gap-2.5">
                {ineFront && (
                  <div className="flex-1">
                    <img src={ineFront} alt="Frente" className="w-full h-20 object-cover rounded-xl border border-purple-500/40" />
                    <span className="text-[9px] text-white/50 block text-center mt-1">{isEs ? 'Frente' : 'Front'}</span>
                  </div>
                )}
                {ineBack && (
                  <div className="flex-1">
                    <img src={ineBack} alt="Reverso" className="w-full h-20 object-cover rounded-xl border border-purple-500/40" />
                    <span className="text-[9px] text-white/50 block text-center mt-1">{isEs ? 'Reverso' : 'Back'}</span>
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 text-[10px] text-white/40 leading-relaxed">
              {isEs
                ? 'Tu identificación se resguarda únicamente en el archivo legal de la plataforma y solo el administrador puede consultarla. Otros usuarios nunca la ven.'
                : 'Your ID is stored only in the platform legal archive and only the administrator can review it. Other users never see it.'}
            </p>

            <div className="mt-auto pt-4 shrink-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (side === 'front') { setIneFront(''); setIneBack(''); }
                  else setIneBack('');
                  setSide('front');
                }}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {isEs ? 'Atrás' : 'Back'}
              </button>

              {cameraReady && !cameraError && (side === 'front' ? !ineFront : !ineBack) && (
                <button
                  type="button"
                  onClick={handleShutter}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 border-4 border-white/20 text-white shadow-xl shadow-pink-600/40 active:scale-90 transition flex items-center justify-center"
                  aria-label={isEs ? 'Capturar' : 'Capture'}
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}

              {side === 'front' && ineFront && (
                <button
                  type="button"
                  onClick={() => setSide('back')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 active:scale-95 transition inline-flex items-center gap-2"
                >
                  {isEs ? 'Capturar reverso' : 'Capture back'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {side === 'front' && ineFront && (
                <button
                  type="button"
                  onClick={() => setIneFront('')}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isEs ? 'Repetir' : 'Retake'}
                </button>
              )}

              {side === 'back' && ineBack && (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={finalBusy}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/40 active:scale-95 transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {finalBusy ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Finalizar' : 'Finish')}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}

              {side === 'back' && ineBack && (
                <button
                  type="button"
                  onClick={() => setIneBack('')}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isEs ? 'Repetir' : 'Retake'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
