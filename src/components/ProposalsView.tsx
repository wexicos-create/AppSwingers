import React, { useState } from 'react';
import { Proposal, SubscriptionTier } from '../types';
import { Plus, Bookmark, Flag, Check, Clock, Sparkles, Zap, ChevronRight } from 'lucide-react';

interface ProposalsViewProps {
  proposals: Proposal[];
  city?: string;
  stateName?: string;
  appliedIds: string[];
  savedIds: string[];
  onApply: (proposal: Proposal) => void;
  onToggleSave: (id: string) => void;
  onCreateProposal: (newProp: { title: string; cat: string; body: string; limited: boolean }) => void;
  onOpenReport: (target: { type: 'propuesta'; id: string; name: string }) => void;
  subscriptionTier?: SubscriptionTier;
  weeklyApplicationsUsed?: number;
  weeklyApplicationsLimit?: number;
  onUpgradePlan?: () => void;
  isEs?: boolean;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  city = 'San Luis Potosí',
  stateName = 'San Luis Potosí',
  appliedIds,
  savedIds,
  onApply,
  onToggleSave,
  onCreateProposal,
  onOpenReport,
  subscriptionTier = 'free',
  weeklyApplicationsUsed = 0,
  weeklyApplicationsLimit = 4,
  onUpgradePlan,
  isEs = true,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    cat: 'Swinger',
    body: '',
    limited: true,
  });

  const categories = ['Swinger', 'Tríos', 'Gangbang', 'Encuentro casual', 'Fiestas'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onCreateProposal(form);
    setForm({ title: '', cat: 'Swinger', body: '', limited: true });
    setModalOpen(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-28 text-white overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Propuestas
          </h2>
          <p className="text-xs text-purple-200/70">Propuestas locales: {city}, {stateName}, México</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Publicar
        </button>
      </div>

      {/* Special Collaboration Banner for Swinger / GangBang */}
      <div
        onClick={() => {
          if ((window as any).__openCollaborationModal) {
            (window as any).__openCollaborationModal();
          }
        }}
        className="p-3.5 mb-4 rounded-3xl bg-gradient-to-r from-pink-950/70 via-purple-950/80 to-indigo-950/70 border border-pink-500/40 shadow-lg cursor-pointer hover:border-pink-400 transition group flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">Colaboración Swinger / GangBang</span>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/30 border border-pink-400/40 text-[9px] font-bold text-pink-300 uppercase">
                Mujeres / Parejas
              </span>
            </div>
            <p className="text-[11px] text-purple-200/80 mt-0.5">
              Envía tu propuesta de evento estructurada para revisión oficial.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-pink-400 group-hover:translate-x-1 transition ml-2">
          &rarr;
        </span>
      </div>

      {/* Weekly Quota Card */}
      <div className="p-3.5 mb-4 rounded-3xl bg-neutral-900/80 border border-purple-500/30 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">
                {isEs ? 'Cuota de Postulaciones Semanales' : 'Weekly Applications Quota'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-900/60 text-pink-300 text-[9px] font-mono font-bold uppercase">
                {subscriptionTier === 'free' ? 'Plan Gratis' : subscriptionTier === 'plus' || subscriptionTier === 'silver' ? 'VIP Plus' : 'VIP Ultra'}
              </span>
            </div>
            <p className="text-[10px] text-purple-200/80 mt-0.5">
              {weeklyApplicationsLimit === Infinity
                ? (isEs ? 'Tienes postulaciones ILIMITADAS en tu Ultra Plan ✨' : 'You have UNLIMITED applications ✨')
                : (isEs 
                    ? `${weeklyApplicationsUsed} de ${weeklyApplicationsLimit} usadas esta semana (${weeklyApplicationsLimit === 4 ? 'Plan Gratis: máx 4' : 'VIP Plus: máx 15'})` 
                    : `${weeklyApplicationsUsed} of ${weeklyApplicationsLimit} used this week`)}
            </p>
          </div>
        </div>

        {weeklyApplicationsLimit !== Infinity && onUpgradePlan && (
          <button
            onClick={onUpgradePlan}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-[10px] shrink-0 active:scale-95 transition shadow-sm hover:brightness-110 flex items-center gap-1"
          >
            <span>{isEs ? 'Aumentar' : 'Upgrade'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Proposals List */}
      <div className="space-y-3.5">
        {proposals.length === 0 ? <div className="rounded-3xl border border-purple-500/20 bg-white/5 p-6 text-center"><h3 className="text-sm font-bold text-white">Aún no hay propuestas en {city}, {stateName}</h3><p className="mt-2 text-xs leading-relaxed text-white/60">Solo se mostrarán propuestas de tu ciudad y estado. Activa avisos para enterarte cuando haya actividad local.</p></div> : proposals.map((item) => {
          const isApplied = appliedIds.includes(item.id);
          const isSaved = savedIds.includes(item.id);
          const isExpanded = expandedId === item.id;
          const isAtLimit = !isApplied && weeklyApplicationsUsed >= weeklyApplicationsLimit;

          return (
            <div
              key={item.id}
              className="p-4 rounded-3xl bg-neutral-900/70 border border-purple-500/20 backdrop-blur-md shadow-lg flex flex-col gap-2.5 transition"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-400/30 text-[10px] font-bold text-purple-200">
                  {item.cat}
                </span>
                <span className="text-[10px] text-white/50">{item.when}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-purple-300/80 mt-0.5 font-medium">{item.author}</p>
              </div>

              {isExpanded && (
                <p className="text-xs text-neutral-300 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
                  {item.body}
                </p>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-1">
                {item.mine ? (
                  <span className="px-3 py-1 rounded-xl bg-purple-900/40 border border-purple-400/30 text-[11px] font-semibold text-purple-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {item.status === 'publicada' ? 'Publicada' : 'En revisión'}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (isAtLimit && onUpgradePlan) {
                        onUpgradePlan();
                      } else {
                        onApply(item);
                      }
                    }}
                    disabled={isApplied}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isApplied
                        ? 'bg-purple-900/50 text-purple-200 border border-purple-500/30 cursor-default'
                        : isAtLimit
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 active:scale-95'
                        : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {isEs ? 'Postulado' : 'Applied'}
                      </>
                    ) : isAtLimit ? (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        {isEs ? 'Límite alcanzado · Subir Plan' : 'Limit reached · Upgrade'}
                      </>
                    ) : (
                      isEs ? 'Postularme' : 'Apply'
                    )}
                  </button>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 transition"
                >
                  {isExpanded ? (isEs ? 'Menos' : 'Less') : (isEs ? 'Detalles' : 'Details')}
                </button>

                <button
                  onClick={() => onToggleSave(item.id)}
                  aria-label="Guardar propuesta"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition ml-auto"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-purple-400 text-purple-400' : ''}`} />
                </button>

                {!item.mine && (
                  <button
                    onClick={() => onOpenReport({ type: 'propuesta', id: item.id, name: item.title })}
                    aria-label="Reportar propuesta"
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!item.mine && (
                <span className="text-[10px] text-white/40">
                  {item.apps + (isApplied ? 1 : 0)} postulaciones &bull; El autor decide a quién responder en privado
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Publicar Nueva Propuesta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#150d26] border border-purple-500/30 p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Nueva Propuesta</h3>
            <p className="text-xs text-purple-200/70 mb-4">Planes para compartir con parejas y singles</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <input
                type="text"
                placeholder="Título del plan o fantasía"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 70) })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400"
              />

              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm({ ...form, cat: c })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      form.cat === c
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                        : 'bg-white/5 text-purple-200 border border-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Describe los detalles, lugar propuesto y reglas indispensables..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value.slice(0, 300) })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white focus:outline-none focus:border-purple-400 resize-none"
              />

              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80 py-1">
                <input
                  type="checkbox"
                  checked={form.limited}
                  onChange={(e) => setForm({ ...form, limited: e.target.checked })}
                  className="rounded text-pink-500 accent-pink-500"
                />
                <span>Publicar con identidad limitada (discreción total)</span>
              </label>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!form.title.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
