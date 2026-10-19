import React, { useState } from 'react';
import { AppRegion, SubscriptionTier } from '../types';
import { X, Sparkles, Crown, Megaphone, Check, ShieldCheck, CalendarDays, Video, TrendingUp, LockKeyhole, Info, Users, Ticket } from 'lucide-react';

interface MonetizationExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  region: AppRegion;
  isEs: boolean;
  currentTier: SubscriptionTier;
  onSelectTier: (tier: SubscriptionTier) => void;
}

type Offer = {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  tone: string;
};

export function MonetizationExtrasModal({
  isOpen,
  onClose,
  region,
  isEs,
  currentTier,
}: MonetizationExtrasModalProps) {
  const [notice, setNotice] = useState<string | null>(null);
  if (!isOpen) return null;

  const isMx = region === 'MX';
  const currencyCode = isMx ? 'MXN' : 'USD';
  const money = (mx: number, us: number) => `${isMx ? '$' + mx.toLocaleString('es-MX') : '$' + us.toLocaleString('en-US')} ${currencyCode}`;
  const t = (es: string, en: string) => isEs ? es : en;

  const offers: Offer[] = [
    {
      eyebrow: t('PARA CONECTAR', 'CONNECT'),
      title: t('AppSwinger Gratis', 'AppSwinger Free'),
      description: t('Una comunidad útil desde el primer día, sin obligar a pagar para participar.', 'A useful community from day one, without forcing payment to participate.'),
      features: [t('Perfil, descubrimiento y controles de privacidad', 'Profile, discovery and privacy controls'), t('Historias y comunidad moderada', 'Moderated stories and community'), t('Consultar eventos y solicitar acceso', 'Browse events and request access')],
      icon: <ShieldCheck className="w-5 h-5" />,
      tone: 'border-white/15 bg-white/[0.035]',
    },
    {
      eyebrow: t('PARA DESCUBRIR MÁS', 'DISCOVER MORE'),
      title: 'VIP Plus',
      description: t('Acceso VIP Plus durante 10 días desde su activación aprobada.', 'VIP Plus access for 10 days after approved activation.'),
      features: [t('Filtros avanzados y 15 postulaciones por semana', 'Advanced filters and 15 applications per week'), t('Prioridad configurable en descubrimiento', 'Configurable discovery priority'), t('Estadísticas personales de actividad', 'Personal activity insights')],
      icon: <Sparkles className="w-5 h-5" />,
      tone: 'border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-950/65 to-black/60',
    },
    {
      eyebrow: t('EXPERIENCIA COMPLETA', 'FULL EXPERIENCE'),
      title: 'Ultra VIP',
      description: t('Acceso Ultra VIP durante 20 días desde su activación aprobada.', 'Ultra VIP access for 20 days after approved activation.'),
      features: [t('Modo discreto con controles claros', 'Discreet mode with clear controls'), t('Postulaciones ilimitadas mientras esté activo', 'Unlimited applications while active'), t('Más filtros y preferencias guardadas', 'More filters and saved preferences')],
      icon: <Crown className="w-5 h-5" />,
      tone: 'border-amber-400/40 bg-gradient-to-br from-amber-950/55 to-black/70',
    },
  ];

  const revenueOffers = [
    { icon: <CalendarDays className="w-5 h-5" />, title: t('Publicación de evento (perfil comercial por uso)', 'Event listing (commercial profile, per use)'), desc: t('Cada publicación cuesta $1,500 MXN + IVA ($1,740 total). Aforo máximo: 40 invitados. El evento debe indicar claramente precio, reglas, consentimiento y si la entrada se cobra por persona o por pareja.', 'Each listing costs $1,500 MXN + VAT ($1,740 total). Maximum capacity: 40 guests. The event must clearly state price, rules, consent and whether admission is per person or couple.'), badge: t('$1,500 + IVA · $1,740 total', '$1,500 + VAT · $1,740 total') },
    { icon: <Megaphone className="w-5 h-5" />, title: t('Campaña destacada', 'Featured campaign'), desc: t('Por campaña: $2,500 MXN + IVA ($2,900 total). Máximo 40 invitados. El distintivo destacado identifica publicidad y no garantiza asistencia.', 'Per campaign: $2,500 MXN + VAT ($2,900 total). Maximum 40 guests. Featured placement is labeled as advertising and does not guarantee attendance.'), badge: t('$2,500 + IVA · $2,900 total', '$2,500 + VAT · $2,900 total') },
    { icon: <TrendingUp className="w-5 h-5" />, title: t('Impulso de perfil', 'Profile boost'), desc: t('Un impulso dura 15 días: $300 MXN + IVA ($348 total). Mejora la exposición durante el plazo, sin prometer coincidencias ni resultados.', 'A boost lasts 15 days: $300 MXN + VAT ($348 total). It increases exposure for the term without promising matches or results.'), badge: t('15 días · $300 + IVA', '15 days · $300 + VAT') },
    { icon: <Users className="w-5 h-5" />, title: t('Herramientas para anfitriones', 'Host tools'), desc: t('$1,500 MXN + IVA ($1,740 total). Incluye la publicación de dos eventos en el panel de eventos. Cada evento admite hasta 40 invitados y debe pasar las reglas de publicación.', '$1,500 MXN + VAT ($1,740 total). Includes publishing two events in the events panel. Each event allows up to 40 guests and must pass listing rules.'), badge: t('2 eventos incluidos · $1,740 total', '2 events included · $1,740 total') },
    { icon: <Ticket className="w-5 h-5" />, title: t('Precio de acceso a cada evento', 'Admission price per event'), desc: t('Quien publica define entre $500 y $1,200 MXN + IVA: total de $580 a $1,392. Debe seleccionar cobro individual o por pareja y puede definir descuento para mujeres. El precio y el descuento se muestran antes de reservar.', 'The organizer sets $500–$1,200 MXN + VAT: $580–$1,392 total. They must choose individual or couple pricing and may offer a discount for women. Price and discount are shown before booking.'), badge: t('$500–$1,200 + IVA · $580–$1,392 total', '$500–$1,200 + VAT · $580–$1,392 total') },
  ];

  const handlePlanClick = (tier: SubscriptionTier) => {
    if (tier === 'free') {
      setNotice(t('Ya puedes usar las funciones gratuitas. No necesitas pagar para seguir participando.', 'You can use the free features now. Payment is not required to keep participating.'));
      return;
    }
    setNotice(t('Los beneficios solo deben activarse después de que un administrador apruebe y concilie el depósito. El backend SPEI aún no está conectado; no se ha realizado ningún cobro ni activado un plan desde esta pantalla.', 'Benefits must only activate after an administrator approves and reconciles the deposit. SPEI backend is not connected yet; this screen has not charged or activated a plan.'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-5 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="monetization-title">
      <div className="w-full max-w-5xl my-5 overflow-hidden rounded-[28px] border border-fuchsia-300/20 bg-[#09070e] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
        <div className="relative overflow-hidden border-b border-white/10 px-5 py-7 sm:px-8 sm:py-9 bg-gradient-to-br from-fuchsia-950/80 via-[#151020] to-[#08070c]">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
          <button onClick={onClose} aria-label={t('Cerrar','Close')} className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/30 p-2 text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300">
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-fuchsia-200">
              <Sparkles className="h-3.5 w-3.5" /> {t('Membresías · creadores · experiencias','Memberships · creators · experiences')}
            </span>
            <h2 id="monetization-title" className="text-3xl sm:text-4xl font-black tracking-tight text-white">{t('Tu experiencia. Tus reglas.','Your experience. Your rules.')}</h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-white/65">{t('AppSwinger combina comunidad gratuita, descubrimiento con privacidad y experiencias opcionales. Paga solo por herramientas adicionales que realmente quieras.', 'AppSwinger combines a free community, privacy-minded discovery and optional experiences. Pay only for extra tools you actually want.')}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5">{t('18+ y consentimiento obligatorio','18+ and consent required')}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t('IVA incluido y desglose fiscal visible','Tax-inclusive prices and clear tax breakdown')}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t('Sin cobros simulados','No simulated charges')}</span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-7 space-y-8">
          {notice && <div role="status" className="flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100"><Info className="h-5 w-5 shrink-0 text-amber-300" /><span>{notice}</span></div>}

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-fuchsia-300">{t('Elige tu nivel','Choose your level')}</p><h3 className="mt-1 text-xl font-bold text-white">{t('Planes para cada ritmo','Plans for every pace')}</h3></div>
              <span className="text-right text-[10px] text-white/45">{t('Moneda mostrada: ', 'Displayed currency: ')}{currencyCode}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {offers.map((offer, index) => {
                const tier: SubscriptionTier = index === 0 ? 'free' : index === 1 ? 'plus' : 'ultra';
                const price = index === 0 ? t('Gratis', 'Free') : index === 1 ? money(406, 24.99) + t(' / 10 días', ' / 10 days') : money(754, 39.99) + t(' / 20 días', ' / 20 days');
                const active = currentTier === tier || (tier === 'plus' && currentTier === 'silver') || (tier === 'ultra' && currentTier === 'gold');
                return <article key={offer.title} className={`relative flex flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-white/25 ${offer.tone} ${index === 1 ? 'md:-translate-y-1 md:shadow-[0_16px_60px_rgba(217,70,239,.12)]' : ''}`}>
                  {index === 1 && <span className="absolute -top-2.5 left-5 rounded-full bg-fuchsia-300 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-black">{t('Más elegido','Popular')}</span>}
                  <div className="mb-4 flex items-center justify-between"><span className="rounded-xl border border-white/10 bg-black/25 p-2.5 text-fuchsia-200">{offer.icon}</span>{active && <span className="text-[10px] font-bold text-emerald-300">{t('Plan actual','Current plan')}</span>}</div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-white/45">{offer.eyebrow}</p>
                  <h4 className="mt-1 text-xl font-black text-white">{offer.title}</h4>
                  <p className="mt-2 min-h-[42px] text-xs leading-relaxed text-white/60">{offer.description}</p>
                  <p className="my-4 text-xl font-black text-white">{price}</p>
                  {isMx && index > 0 && (() => {
                    const total = index === 1 ? 399 : 699;
                    const subtotal = Math.round((total / 1.16) * 100) / 100;
                    const vat = Math.round((total - subtotal) * 100) / 100;
                    return <p className="-mt-2 mb-4 text-[10px] leading-relaxed text-white/50">{t(`Incluye IVA (16%): subtotal ${money(subtotal, subtotal)} + IVA ${money(vat, vat)}`, `Includes 16% VAT: subtotal ${money(subtotal, subtotal)} + VAT ${money(vat, vat)}`)}</p>;
                  })()}
                  <ul className="mb-5 flex-1 space-y-2.5">{offer.features.map(feature => <li key={feature} className="flex gap-2 text-xs leading-relaxed text-white/75"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{feature}</li>)}</ul>
                  <button onClick={() => handlePlanClick(tier)} className={`w-full rounded-xl px-4 py-3 text-xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 ${index === 1 ? 'bg-fuchsia-300 text-[#170b1d] hover:bg-fuchsia-200' : index === 2 ? 'bg-amber-300 text-black hover:bg-amber-200' : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'}`}>{index === 0 ? t('Seguir gratis','Continue free') : t('Ver disponibilidad de pago','Check payment availability')}</button>
                </article>;
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/40">{t('Precios de lanzamiento propuestos para México: VIP Plus: $350 MXN + IVA = $406 MXN por 10 días. Ultra VIP: $650 MXN + IVA = $754 MXN por 20 días. Los precios mostrados para México incluyen el total con IVA del 16% desglosado. Los precios USD son referencias comerciales, no conversiones en tiempo real. No se puede cobrar ni activar un plan hasta que el checkout y la conciliación SPEI estén implementados y probados.', 'Proposed launch pricing: VIP Plus $350 MXN + 16% VAT = $406 for 10 days; Ultra VIP $650 + VAT = $754 for 20 days. The displayed Mexican total includes VAT and should show its breakdown. USD prices are commercial references, not live currency conversion. Plans cannot be charged or activated until checkout and SPEI reconciliation are implemented and tested.')}</p>
          </section>

          <section>
            <div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-300">{t('Ecosistema de ingresos','Revenue ecosystem')}</p><h3 className="mt-1 text-xl font-bold text-white">{t('Más formas de participar y crecer','More ways to participate and grow')}</h3><p className="mt-1 text-xs text-white/55">{t('Un catálogo que sirve a miembros, creadores, anfitriones y negocios locales.', 'A catalog for members, creators, hosts and local businesses.')}</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {revenueOffers.map(item => <article key={item.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:bg-white/[0.05] transition"><span className="h-fit rounded-xl border border-fuchsia-300/15 bg-fuchsia-300/10 p-2.5 text-fuchsia-200">{item.icon}</span><div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><h4 className="text-sm font-bold text-white">{item.title}</h4><span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-white/45">{item.badge}</span></div><p className="text-xs leading-relaxed text-white/55">{item.desc}</p></div></article>)}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-5 w-5" /><h4 className="text-sm font-bold">{t('Seguridad como ventaja','Safety as an advantage')}</h4></div>
              <p className="text-xs leading-relaxed text-white/60">{t('Controles de bloqueo y reporte, moderación, consentimiento revocable y acceso por mayoría de edad. Ninguna insignia se mostrará como “verificada” sin comprobación real.', 'Block and report controls, moderation, revocable consent and age gating. No badge will say “verified” without real verification.')}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-200"><LockKeyhole className="h-5 w-5" /><h4 className="text-sm font-bold">{t('Pagos con trazabilidad','Traceable payments')}</h4></div>
              <p className="text-xs leading-relaxed text-white/60">{t('La activación comercial requiere conciliación SPEI, comprobante validado, folio, historial y aprobación manual cuando exista riesgo. No se concede acceso por una captura de pantalla.', 'Commercial activation requires SPEI reconciliation, validated proof, reference number, audit history and manual approval for risk cases. A screenshot alone never grants access.')}</p>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-[10px] leading-relaxed text-white/40">{t('El contenido íntimo solo podrá monetizarse si cumple la ley, las políticas del proveedor de pagos y el consentimiento documentado de todas las personas adultas identificables. RFC/CFDI requiere integración fiscal real.', 'Intimate content may be monetized only when lawful, allowed by the payment provider and supported by documented consent from all identifiable adults. Tax invoicing requires a real fiscal integration.')}</p>
            <button onClick={onClose} className="shrink-0 rounded-xl border border-white/15 px-5 py-3 text-xs font-bold text-white/80 hover:bg-white/10">{t('Volver a la app','Back to app')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
