import React, { useState } from 'react';
import { Profile, ProfileRating } from '../types';
import { newProfileRating } from '../ratings';
import { X, Star, ShieldCheck, MessageSquare } from 'lucide-react';

interface ProfileRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  target: Profile | null;
  raterUid: string | null;
  raterName: string;
  onPublished: (rating: ProfileRating) => void;
}

const ENCOUNTER_TYPES = {
  es: ['Encuentro Casual / Cita Privada', 'Fiesta Privada', 'Evento de Agencia', 'Hotel / Viaje', 'Solo Chat (no nos vimos)'],
  en: ['Casual encounter / private date', 'Private party', 'Agency event', 'Hotel / trip', 'Chat only (we never met)'],
};

const REPUTATION_TAGS = {
  es: ['100% Respetuosos', 'Puntuales y Pulcros', 'Excelente Química', 'Cumplieron Límites', 'Cero Dramas', 'Discreción Absoluta', 'Super Divertidos', 'Gran Anfitrión'],
  en: ['100% Respectful', 'Punctual & Clean', 'Great Chemistry', 'Limits Respected', 'Zero Drama', 'Total Discretion', 'Super Fun', 'Great Host'],
};

const STAR_LABELS = {
  es: ['Nunca más', 'Mala experiencia', 'Regular', 'Muy buena', '¡Experiencia Inolvidable!'],
  en: ['Never again', 'Bad experience', 'Average', 'Very good', 'Unforgettable!'],
};

export function ProfileRatingModal({ isOpen, onClose, isEs, target, raterUid, raterName, onPublished }: ProfileRatingModalProps) {
  const [stars, setStars] = useState(0);
  const [encounterType, setEncounterType] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  if (!isOpen || !target) return null;

  const types = isEs ? ENCOUNTER_TYPES.es : ENCOUNTER_TYPES.en;
  const tagsList = isEs ? REPUTATION_TAGS.es : REPUTATION_TAGS.en;
  const labels = isEs ? STAR_LABELS.es : STAR_LABELS.en;
  const currentType = encounterType || types[0];

  const publish = () => {
    if (stars < 1) return;
    const rating = newProfileRating({
      raterUid,
      raterName,
      targetProfileId: target.id,
      targetName: target.name,
      stars,
      encounterType: currentType,
      tags,
      comment: comment.trim(),
    });
    setStars(0);
    setTags([]);
    setComment('');
    onPublished(rating);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#0d0618] border border-amber-400/40 p-5 shadow-[0_0_50px_rgba(250,204,21,0.25)] text-white space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-amber-400/20 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {isEs ? 'Calificación Anónima' : 'Anonymous Rating'}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              {isEs ? 'Calificar Encuentro con ' : 'Rate Encounter with '}{target.name}
            </h2>
            <p className="text-[11px] text-purple-200/70 mt-0.5 leading-relaxed">
              {isEs ? 'Tu opinión es 100% anónima y ayuda a mantener una comunidad segura y de confianza.' : 'Your opinion is 100% anonymous and helps keep the community safe and trustworthy.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified encounter box (anti-troll) */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <span>
            {isEs
              ? 'Encuentro Verificado: solo participantes con interacción registrada pueden emitir calificaciones (protección anti-trolls).'
              : 'Verified encounter: only participants with a registered interaction can rate (anti-troll protection).'}
          </span>
        </div>

        {/* Stars */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setStars(n)} aria-label={String(n)} className="p-1 active:scale-90 transition">
                <Star className={'w-9 h-9 ' + (n <= stars ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'text-white/25')} />
              </button>
            ))}
          </div>
          {stars > 0 && (
            <span className="text-xs font-bold text-amber-300">
              {labels[stars - 1]} ({stars}/5)
            </span>
          )}
        </div>

        {/* Encounter type */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/70 font-bold block">{isEs ? 'Tipo de Encuentro' : 'Encounter type'}</label>
          <select value={currentType} onChange={(e) => setEncounterType(e.target.value)} className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs focus:outline-none focus:border-amber-400">
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Reputation tags */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/70 font-bold block">{isEs ? 'Etiquetas de Reputación' : 'Reputation tags'}</label>
          <div className="flex flex-wrap gap-1.5">
            {tagsList.map(t => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                  className={'px-3 py-1.5 rounded-full text-[11px] font-semibold transition active:scale-95 border ' + (active ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white border-amber-300/60 shadow-md' : 'bg-white/5 border-white/10 text-purple-200/70 hover:border-amber-400/40 hover:text-white')}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Anonymous comment */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-white/70 font-bold block flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {isEs ? 'Comentario Anónimo (opcional)' : 'Anonymous comment (optional)'}
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isEs ? 'Describe tu experiencia para ayudar a otros perfiles...' : 'Describe your experience to help other profiles...'}
            className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs resize-none focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={stars < 1}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-black shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isEs ? 'Publicar Calificación' : 'Publish Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
