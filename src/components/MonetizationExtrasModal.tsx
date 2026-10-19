import React, { useState } from 'react';
import { AppRegion, SubscriptionTier } from '../types';
import { X, Sparkles, Flame, Crown, Megaphone, Zap, Heart, Check, Clock, ShieldCheck, DollarSign } from 'lucide-react';

interface MonetizationExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: AppRegion;
  isEs: boolean;
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export function MonetizationExtrasModal({
  isOpen,
  onClose,
  region,
  isEs,
  currentTier,
  onSelectTier,
}: MonetizationExtrasModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | 'sponsored'>(currentTier);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMx = region === 'MX';
  const currencySymbol = isMx ? '$' : '$';
  const currencyCode = isMx ? 'MXN' : 'USD';

  // Pricing calculation with 16% tax (IVA)
  const silverBase = isMx ? 408 : 100;
  const silverTax = Math.round(silverBase * 0.16 * 100) / 100;
  const silverTotal = Math.round((silverBase + silverTax) * 100) / 100;

  const goldBase = isMx ? 800 : 180;
  const goldTax = Math.round(goldBase * 0.16 * 100) / 100;
  const goldTotal = Math.round((goldBase + goldTax) * 100) / 100;

  const sponsorBase = isMx ? 1500 : 800;
  const sponsorTax = Math.round(sponsorBase * 0.16 * 100) / 100;
  const sponsorTotal = Math.round((sponsorBase + sponsorTax) * 100) / 100;

  const handleCheckout = (tier: SubscriptionTier | 'sponsored') => {
    if (tier === 'sponsored') {
      setSuccessMsg(
        isEs
          ? 'El sistema de solicitudes de patrocinio aún no está conectado. No se envió ninguna solicitud.'
          : 'The sponsorship request system is not connected yet. No request was sent.'
      );
      return;
    }

    if (tier === 'free') {
      onSelectTier('free');
      setSuccessMsg(isEs ? 'Plan Gratis seleccionado.' : 'Free plan selected.');
      return;
    }

    // Paid tiers must never be enabled by a client-side button click.
    // Until a trusted payment provider/webhook is integrated, fail closed.
    setSuccessMsg(
      isEs
        ? 'Los pagos todavía no están conectados. No se realizó ningún cobro ni se activó el plan.'
        : 'Payments are not connected yet. No charge was made and the plan was not activated.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl p-6 rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl flex flex-col gap-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {isEs ? 'Planes y Promociones Oficiales' : 'Official Plans & Promotions'}
          </span>
          <h2 className="text-2xl font-bold text-white">
            {isEs ? 'Eleva tu Experiencia con AppSwinguer' : 'Elevate Your AppSwinguer Experience'}
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {isEs 
              ? `Moneda e impuestos aplicados según tu región (${region === 'MX' ? 'México + 16% IVA' : 'USA + 16% Tax'}).` 
              : 'Currency and taxes applied according to your region.'}
          </p>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-sm font-semibold animate-pulse">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Free Plan */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
            currentTier === 'free' ? 'bg-rose-950/30 border-rose-500/60 shadow-lg shadow-rose-600/20' : 'bg-black/40 border-white/10'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-white">{isEs ? 'Plan Gratis' : 'Free Plan'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">{isEs ? 'Básico' : 'Basic'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-1">0 {currencyCode}</div>
              <div className="text-[11px] font-bold text-emerald-400 mb-3">
                {isEs ? 'Máximo 4 postulaciones/semana' : 'Max 4 applications/week'}
              </div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? '4 postulaciones a eventos/semana' : '4 event applications/week'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Perfil básico verificado' : 'Basic verified profile'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Swipes & Match mutuo en tu radio' : 'Match & Swipes in radius'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Chat y privacidad de ubicación' : 'Chat & location privacy'}</li>
              </ul>
            </div>
            <button
              disabled={currentTier === 'free'}
              onClick={() => handleCheckout('free')}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs disabled:opacity-50"
            >
              {currentTier === 'free' ? (isEs ? '✓ Plan Actual' : '✓ Current Plan') : (isEs ? 'Elegir Gratis' : 'Choose Free')}
            </button>
          </div>

          {/* Plus / Silver Plan */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
            currentTier === 'plus' || currentTier === 'silver' ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-600/30' : 'bg-black/40 border-white/10'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-rose-400">{isEs ? 'Siguiente Plan (VIP Plus)' : 'VIP Plus Tier'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">15 {isEs ? 'días' : 'days'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-0.5">{currencySymbol}{silverTotal} <span className="text-xs text-white/60">{currencyCode}</span></div>
              <div className="text-[11px] font-bold text-pink-300 mb-2">
                {isEs ? '15 postulaciones a la semana' : '15 applications per week'}
              </div>
              <div className="text-[10px] text-white/50 mb-3">{isEs ? `Base: ${silverBase} + 16% IVA (${silverTax})` : `Base: ${silverBase} + 16% Tax (${silverTax})`}</div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? '15 postulaciones a la semana' : '15 applications per week'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? '50 swipes prioritarios diarios' : '50 priority swipes'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Filtros pasionales avanzados' : 'Advanced passion filters'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Prioridad en solicitudes' : 'Priority in proposals'}</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('plus')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 hover:opacity-95 transition"
            >
              {currentTier === 'plus' || currentTier === 'silver' ? (isEs ? '✓ Plan Activo' : '✓ Active Plan') : (isEs ? 'Obtener VIP Plus (15/sem)' : 'Get VIP Plus (15/wk)')}
            </button>
          </div>

          {/* Ultra / Gold Plan */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
            currentTier === 'ultra' || currentTier === 'gold' ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-600/30' : 'bg-black/40 border-amber-500/30'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1"><Crown className="w-4 h-4" /> Ultra VIP</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">1 {isEs ? 'mes' : 'month'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-0.5">{currencySymbol}{goldTotal} <span className="text-xs text-white/60">{currencyCode}</span></div>
              <div className="text-[11px] font-bold text-amber-300 mb-2">
                {isEs ? 'Postulaciones ILIMITADAS' : 'UNLIMITED applications'}
              </div>
              <div className="text-[10px] text-white/50 mb-3">{isEs ? `Base: ${goldBase} + 16% IVA (${goldTax})` : `Base: ${goldBase} + 16% Tax (${goldTax})`}</div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Postulaciones ilimitadas 24/7' : 'Unlimited applications 24/7'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Swipes & Super Likes ilimitados' : 'Unlimited swipes & Super Likes'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Modo incógnito & Ver quién te dio like' : 'Incognito & See who liked'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Acceso VIP a villas privadas' : 'VIP villa priority'}</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('ultra')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-black text-xs shadow-lg shadow-amber-600/30 hover:opacity-95 transition"
            >
              {currentTier === 'ultra' || currentTier === 'gold' ? (isEs ? '✓ Plan Activo' : '✓ Active Plan') : (isEs ? 'Activar Ultra (Ilimitadas)' : 'Activate Ultra (Unlimited)')}
            </button>
          </div>
        </div>

        {/* Sponsored Profile Ad Tier */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-pink-950/40 border border-purple-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold mb-1">
              <Megaphone className="w-4 h-4" />
              {isEs ? 'Perfiles Patrocinados / Empresas & Agencias' : 'Sponsored Profiles / Businesses & Agencies'}
            </div>
            <h4 className="text-lg font-bold text-white">
              {currencySymbol}{sponsorTotal} <span className="text-xs text-white/60">{currencyCode} / {isEs ? 'mes' : 'month'}</span>
            </h4>
            <p className="text-xs text-white/70">
              {isEs 
                ? `Promociona tu club swinger, agencia o evento destacado. Incluye base ${sponsorBase} + 16% IVA (${sponsorTax}).`
                : `Promote your swinger club, agency, or featured event. Includes base ${sponsorBase} + 16% Tax (${sponsorTax}).`}
            </p>
          </div>
          <button
            onClick={() => handleCheckout('sponsored')}
            className="px-6 py-3 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 shrink-0"
          >
            {isEs ? 'Contratar Patrocinio' : 'Get Sponsorship'}
          </button>
        </div>
      </div>
    </div>
  );
}
