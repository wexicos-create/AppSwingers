import React, { useState } from 'react';
import { Proposal } from '../types';
import { Plus, Bookmark, Flag, Check, Clock, Sparkles } from 'lucide-react';

interface ProposalsViewProps {
  proposals: Proposal[];
  appliedIds: string[];
  savedIds: string[];
  onApply: (proposal: Proposal) => void;
  onToggleSave: (id: string) => void;
  onCreateProposal: (newProp: { title: string; cat: string; body: string; limited: boolean }) => void;
  onOpenReport: (target: { type: 'propuesta'; id: string; name: string }) => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  appliedIds,
  savedIds,
  onApply,
  onToggleSave,
  onCreateProposal,
  onOpenReport,
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
    <div className="w-full max-w-md mx-auto p-4 pb-24 text-white overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Propuestas
          </h2>
          <p className="text-xs text-purple-200/70">Planes con reglas claras y consentimiento</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Publicar
        </button>
      </div>

      {/* Proposals List */}
      <div className="space-y-3.5">
        {proposals.map((item) => {
          const isApplied = appliedIds.includes(item.id);
          const isSaved = savedIds.includes(item.id);
          const isExpanded = expandedId === item.id;

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
                    onClick={() => onApply(item)}
                    disabled={isApplied}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isApplied
                        ? 'bg-purple-900/50 text-purple-200 border border-purple-500/30'
                        : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Postulado
                      </>
                    ) : (
                      'Postularme'
                    )}
                  </button>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/80 transition"
                >
                  {isExpanded ? 'Menos' : 'Detalles'}
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
