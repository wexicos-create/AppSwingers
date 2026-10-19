import React from 'react';
import { ShieldCheck, UserRoundPlus, LogIn, LockKeyhole, Database, HeartHandshake, ShieldAlert, Camera, Building2, MessageCircle, ArrowUpRight } from 'lucide-react';

interface WelcomeScreenProps {
  isEs: boolean;
  onOpenAccount: (mode: 'register' | 'login') => void;
  onOpenLegal: (topic: string) => void;
}

export function WelcomeScreen({ isEs, onOpenAccount, onOpenLegal }: WelcomeScreenProps) {
  const t = (es: string, en: string) => isEs ? es : en;
  const policyLinks = [
    { id: 'privacidad', label: t('Aviso de privacidad', 'Privacy notice'), icon: LockKeyhole },
    { id: 'datos', label: t('Uso de datos personales', 'Personal data use'), icon: Database },
    { id: 'recomendaciones', label: t('Avisos y recomendaciones de seguridad', 'Safety notices and recommendations'), icon: HeartHandshake },
    { id: 'estafas', label: t('Reportar posibles estafas y bloquear', 'Report possible scams and block'), icon: ShieldAlert },
    { id: 'creadoras', label: t('Políticas de creadoras de contenido', 'Creator content policies'), icon: Camera },
    { id: 'agencias', label: t('Políticas para agencias, eventos y promoción', 'Agency, event and promotion policies'), icon: Building2 },
    { id: 'terminos', label: t('Términos y condiciones', 'Terms and conditions'), icon: ShieldCheck },
  ];

  return (
    <section aria-label={t('Bienvenida a AppSwinger', 'Welcome to AppSwinger')} className="absolute inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#08050d] text-white">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-5 pt-8 sm:px-7">
        <header className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-300/30 bg-gradient-to-br from-fuchsia-500/25 to-violet-500/20 text-fuchsia-200 shadow-lg">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-black tracking-[.12em]">APPSWINGER</p>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-fuchsia-200/65">{t('Conexiones con respeto', 'Connections with respect')}</p>
          </div>
        </header>

        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> {t('Solo mayores de 18 años', 'Adults 18+ only')}</span>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{t('Tu comunidad. Tus límites. Tu decisión.', 'Your community. Your boundaries. Your choice.')}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/65">{t('Conoce personas y eventos con reglas claras, consentimiento y herramientas para cuidar tu privacidad.', 'Meet people and discover events with clear rules, consent and privacy controls.')}</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3">
          <button type="button" onClick={() => onOpenAccount('register')} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-400 to-pink-500 px-4 py-4 text-sm font-black text-[#160817] shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 active:scale-[.99]">
            <UserRoundPlus className="h-5 w-5" /> {t('Regístrate', 'Create account')}
          </button>
          <button type="button" onClick={() => onOpenAccount('login')} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.045] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[.99]">
            <LogIn className="h-4 w-4 text-fuchsia-200" /> {t('¿Ya tienes cuenta? Inicia sesión', 'Already have an account? Sign in')}
          </button>
          <p className="text-center text-[10px] leading-relaxed text-white/45">{t('Al crear una cuenta, primero confirma que tienes 18 años o más y revisa los avisos y reglas que aparecen a continuación.', 'When creating an account, confirm you are 18 or older and review the notices and rules below.')}</p>
        </div>

        <section className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.045] p-4">
          <div className="mb-2 flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-5 w-5" /><h2 className="text-sm font-extrabold">{t('Respeto total y seguridad para cada usuario', 'Respect and safety for every user')}</h2></div>
          <p className="text-xs leading-relaxed text-white/65">{t('El consentimiento es indispensable y se puede retirar en cualquier momento. No toleramos acoso, suplantación, extorsión ni contenido íntimo publicado sin permiso.', 'Consent is essential and can be withdrawn at any time. Harassment, impersonation, extortion and intimate content posted without permission are not tolerated.')}</p>
        </section>

        <section className="mb-5">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-200/75">{t('Privacidad, confianza y políticas', 'Privacy, trust and policies')}</h2>
          <div className="space-y-2">
            {policyLinks.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => onOpenLegal(id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left transition hover:border-fuchsia-300/25 hover:bg-fuchsia-300/[.06]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-950/80 text-fuchsia-200"><Icon className="h-4 w-4" /></span>
                <span className="flex-1 text-xs font-semibold text-white/85">{label}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/35" />
              </button>
            ))}
          </div>
        </section>

        <footer className="mt-auto border-t border-white/10 pt-4">
          <p className="mb-3 text-center text-[10px] leading-relaxed text-white/45">{t('El uso de la plataforma está sujeto a sus políticas y a la legislación aplicable. La información de seguridad no sustituye el criterio personal ni la ayuda de las autoridades.', 'Use of the platform is subject to its policies and applicable law. Safety information does not replace personal judgment or assistance from authorities.')}</p>
          <a href="https://wa.me/524443218418" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3.5 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/20">
            <MessageCircle className="h-4 w-4" /> {t('CONTÁCTANOS POR WHATSAPP', 'CONTACT US ON WHATSAPP')}
          </a>
          <p className="mt-3 text-center text-[9px] text-white/30">AppSwinger · 18+ · {t('Respeto, privacidad y consentimiento', 'Respect, privacy and consent')}</p>
        </footer>
      </div>
    </section>
  );
}
