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
      setSuccessMsg(isEs ? '¡Solicitud de patrocinio enviada! El equipo comercial se pondrá en contacto.' : 'Sponsored request sent! Our commercial team will contact you.');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 3000);
      return;
    }
    onSelectTier(tier);
    setSuccessMsg(isEs ? `¡Suscripción ${tier.toUpperCase()} activada con éxito!` : `${tier.toUpperCase()} subscription successfully activated!`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 2500);
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
                <span className="font-bold text-white">Free</span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">{isEs ? 'Básico' : 'Basic'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-3">0 {currencyCode}</div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Perfil básico' : 'Basic profile'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Destacado en Match' : 'Match spotlight'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Postularse a eventos' : 'Event proposals'}</li>
              </ul>
            </div>
            <button
              disabled={currentTier === 'free'}
              onClick={() => handleCheckout('free')}
              className="w-full py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs disabled:opacity-50"
            >
              {currentTier === 'free' ? (isEs ? 'Plan Actual' : 'Current Plan') : 'Free'}
            </button>
          </div>

          {/* Silver Plan */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
            currentTier === 'silver' ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-600/30' : 'bg-black/40 border-white/10'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-rose-400">Silver</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">15 {isEs ? 'días' : 'days'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-1">{currencySymbol}{silverTotal} <span className="text-xs text-white/60">{currencyCode}</span></div>
              <div className="text-[10px] text-white/50 mb-3">{isEs ? `Base: ${silverBase} + 16% IVA (${silverTax})` : `Base: ${silverBase} + 16% Tax (${silverTax})`}</div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? '50 swipes diarios' : '50 daily swipes'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Filtros avanzados' : 'Advanced filters'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Sin publicidad' : 'Ad-free'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-400" /> {isEs ? 'Chat ilimitado' : 'Unlimited chat'}</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('silver')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 hover:opacity-95 transition"
            >
              {currentTier === 'silver' ? (isEs ? 'Plan Activo' : 'Active Plan') : (isEs ? 'Obtener Silver' : 'Get Silver')}
            </button>
          </div>

          {/* Gold Plan */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
            currentTier === 'gold' ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-600/30' : 'bg-black/40 border-amber-500/30'
          }`}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1"><Crown className="w-4 h-4" /> Gold</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">1 {isEs ? 'mes' : 'month'}</span>
              </div>
              <div className="text-2xl font-black text-white mb-1">{currencySymbol}{goldTotal} <span className="text-xs text-white/60">{currencyCode}</span></div>
              <div className="text-[10px] text-white/50 mb-3">{isEs ? `Base: ${goldBase} + 16% IVA (${goldTax})` : `Base: ${goldBase} + 16% Tax (${goldTax})`}</div>
              <ul className="text-xs text-white/70 flex flex-col gap-2">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Swipes ilimitados' : 'Unlimited swipes'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Ver quién te dio like' : 'See who liked you'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Prioridad en eventos' : 'Event priority'}</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /> {isEs ? 'Foros exclusivos' : 'Exclusive forums'}</li>
              </ul>
            </div>
            <button
              onClick={() => handleCheckout('gold')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-semibold text-xs shadow-lg shadow-amber-600/30 hover:opacity-95 transition"
            >
              {currentTier === 'gold' ? (isEs ? 'Plan Activo' : 'Active Plan') : (isEs ? 'Obtener Gold' : 'Get Gold')}
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
