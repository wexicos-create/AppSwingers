import React from 'react';
import { Flame, Heart, ShieldCheck, Lock, CalendarDays, MapPin, Check, Globe, ArrowRight } from 'lucide-react';

interface LandingScreenProps {
  isEs: boolean;
  onRegister: () => void;
  onLogin: () => void;
  onGoogleSignIn: () => void;
  onOpenLegal: (topic: string) => void;
}

export function LandingScreen({ isEs, onRegister, onLogin, onGoogleSignIn, onOpenLegal }: LandingScreenProps) {
  const benefits = [
    {
      icon: ShieldCheck,
      title: isEs ? 'Verificación de identidad' : 'Identity verification',
      desc: isEs
        ? 'Validamos tu INE o pasaporte para garantizar una comunidad exclusivamente para adultos (+18).'
        : 'We validate your ID or passport to guarantee an adults-only (+18) community.',
    },
    {
      icon: Heart,
      title: isEs ? 'Comunidad real y segura' : 'Real and safe community',
      desc: isEs
        ? 'Hombres, mujeres y parejas con reglas claras de consentimiento, respeto y discreción.'
        : 'Men, women and couples with clear rules of consent, respect and discretion.',
    },
    {
      icon: CalendarDays,
      title: isEs ? 'Eventos y propuestas privadas' : 'Private events and proposals',
      desc: isEs
        ? 'Fiestas, propuestas de colaboración y encuentros con verificación de organizadores.'
        : 'Parties, collaboration proposals and encounters with verified organizers.',
    },
    {
      icon: Lock,
      title: isEs ? 'Privacidad y discreción' : 'Privacy and discretion',
      desc: isEs
        ? 'Tu identidad solo la ve el administrador del archivo legal. Nunca se muestra a otros usuarios.'
        : 'Your identity is only visible to the legal archive administrator. Never shown to other users.',
    },
  ];

  const plans = [
    {
      name: isEs ? 'Plan Gratis' : 'Free Plan',
      price: '$0',
      period: '',
      highlight: false,
      items: isEs
        ? ['4 postulaciones a eventos por semana', 'Swipes y Match mutuo en tu radio', 'Chat con privacidad de ubicación']
        : ['4 event applications per week', 'Swipes and mutual Match in your radius', 'Chat with location privacy'],
    },
    {
      name: isEs ? 'VIP Plus' : 'VIP Plus',
      price: '$473',
      period: isEs ? 'MXN / 15 días (IVA incluido)' : 'MXN / 15 days (tax included)',
      highlight: false,
      items: isEs
        ? ['15 postulaciones a la semana', 'Swipes prioritarios diarios', 'Filtros pasionales avanzados']
        : ['15 applications per week', 'Priority daily swipes', 'Advanced passion filters'],
    },
    {
      name: 'Ultra VIP',
      price: '$928',
      period: isEs ? 'MXN / 1 mes (IVA incluido)' : 'MXN / 1 month (tax included)',
      highlight: true,
      items: isEs
        ? ['Postulaciones ilimitadas 24/7', 'Swipes y Super Likes ilimitados', 'Modo incógnito y acceso VIP a villas']
        : ['Unlimited applications 24/7', 'Unlimited swipes and Super Likes', 'Incognito mode and VIP villa access'],
    },
  ];

  const legalLinks = [
    { id: 'privacidad', label: isEs ? 'Aviso de privacidad' : 'Privacy notice' },
    { id: 'terminos', label: isEs ? 'Términos y reglas de uso' : 'Terms and rules of use' },
    { id: 'seguridad', label: isEs ? 'Operaciones y reglas del sitio' : 'Site operations and rules' },
    { id: 'reglas', label: isEs ? 'Reglas de convivencia' : 'Community rules' },
  ];

  return (
    <div className="min-h-screen bg-[#050307] text-[#f5eeff] relative overflow-hidden">
      {/* Ambient neon blobs */}
      <div className="absolute top-0 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative max-w-5xl mx-auto px-5 py-8 sm:py-12">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,45,120,0.5)]">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <span className="font-black text-sm tracking-wider uppercase">AppSwinguer</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
            +18 {isEs ? 'Solo adultos' : 'Adults only'}
          </span>
        </header>

        {/* Hero */}
        <section className="mt-12 sm:mt-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-black leading-tight">
            {isEs ? (
              <>
                La comunidad liberal <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">más segura</span> de México
              </>
            ) : (
              <>
                Mexico&apos;s <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">safest</span> lifestyle community
              </>
            )}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-purple-200/70 max-w-2xl mx-auto leading-relaxed">
            {isEs
              ? 'Encuentros casuales, tríos, Hotwife, GangBang, Swingers y más. Con verificación de identidad obligatoria para hombres, mujeres y parejas reales.'
              : 'Casual encounters, threesomes, Hotwife, GangBang, Swingers and more. With mandatory identity verification for real men, women and couples.'}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onRegister}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition"
            >
              {isEs ? 'Regístrate gratis' : 'Sign up free'}
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition active:scale-95"
            >
              {isEs ? 'Iniciar sesión' : 'Log in'}
            </button>
          </div>
          <button
            onClick={onGoogleSignIn}
            className="mt-3 text-xs text-purple-200/60 hover:text-purple-200 underline underline-offset-4 transition"
          >
            {isEs ? 'O continúa con Google' : 'Or continue with Google'}
          </button>
        </section>

        {/* Countries */}
        <section className="mt-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 text-center">
            {isEs ? 'Países donde funciona' : 'Available countries'}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {isEs ? 'México — Disponible ahora' : 'Mexico — Available now'}
            </span>
            <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              {isEs ? 'Estados Unidos — Próximamente' : 'United States — Coming soon'}
            </span>
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 text-center">
            {isEs ? 'Beneficios de la plataforma' : 'Platform benefits'}
          </h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="p-5 rounded-3xl bg-[#140e1d]/80 border border-purple-500/20 backdrop-blur-xl">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-pink-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{b.title}</h3>
                  <p className="text-xs text-purple-200/70 mt-1 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Plans */}
        <section className="mt-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 text-center">
            {isEs ? 'Planes' : 'Plans'}
          </h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? 'p-5 rounded-3xl bg-gradient-to-b from-amber-950/40 to-[#140e1d] border border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.15)]'
                    : 'p-5 rounded-3xl bg-[#140e1d]/80 border border-purple-500/20'
                }
              >
                <span className="text-xs font-bold uppercase tracking-wide text-purple-300">{p.name}</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{p.price}</span>
                </div>
                {p.period && <span className="text-[10px] text-white/50 block">{p.period}</span>}
                <ul className="mt-4 space-y-2">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[11px] text-purple-200/80">
                      <Check className={'w-3.5 h-3.5 shrink-0 ' + (p.highlight ? 'text-amber-400' : 'text-pink-400')} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-14 text-center">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/30">
            <h3 className="text-lg font-black text-white">
              {isEs ? '¿Listo para comenzar?' : 'Ready to start?'}
            </h3>
            <p className="text-xs text-purple-200/70 mt-1">
              {isEs
                ? 'El registro incluye verificación de identidad con tu INE o pasaporte.'
                : 'Registration includes identity verification with your ID or passport.'}
            </p>
            <button
              onClick={onRegister}
              className="mt-4 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-sm shadow-xl shadow-purple-600/40 hover:brightness-110 active:scale-95 transition inline-flex items-center gap-2"
            >
              {isEs ? 'Regístrate o inicia sesión' : 'Sign up or log in'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Footer legal links */}
        <footer className="mt-14 pb-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {legalLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => onOpenLegal(l.id)}
                className="text-[11px] text-purple-200/60 hover:text-purple-200 underline underline-offset-4 transition"
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-4">
            {isEs
              ? 'AppSwinguer es una plataforma exclusiva para adultos mayores de 18 años. Todo contenido y participación requiere consentimiento mutuo.'
              : 'AppSwinguer is an adults-only (18+) platform. All content and participation requires mutual consent.'}
          </p>
        </footer>
      </div>
    </div>
  );
}
