import React, { useState } from 'react';
import { EventAccessPass, EventRating } from '../types';
import { X, Star, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { showToast } from './Toast';
import { saveRemoteRating, RATING_ALERT_THRESHOLD } from '../eventflow';

interface EventRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  pass: EventAccessPass | null;
  userUid: string | null;
  userName: string;
  onRated: (rating: EventRating) => void;
}

/**
 * Post-event rating pushed to the attendee the day after the event
 * ("¿qué te pareció el evento?"): five stars plus an optional comment.
 * Accumulated bad references (below 3.5 average) raise admin alerts about
 * the agency / promoter / associate; when the experience was bad, the rater
 * is invited to contact the platform or report the organizer directly.
 */
export function EventRatingModal({
  isOpen, onClose, isEs, pass, userUid, userName, onRated,
}: EventRatingModalProps) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen || !pass) return null;

  const handleSubmit = async () => {
    if (!stars || !userUid) return;
    setBusy(true);
    const rating: EventRating = {
      id: 'rate_' + pass.id + '_' + (userUid || 'x'),
      eventId: pass.eventId,
      eventTitle: pass.eventTitle,
      organizerUid: pass.organizerUid,
      organizerName: pass.organizerName,
      userUid,
      userName,
      stars,
      comment: comment.trim(),
      ts: Date.now(),
    };
    const ok = await saveRemoteRating(rating);
    setBusy(false);
    if (ok) {
      onRated(rating);
      showToast(isEs ? '¡Gracias por calificar! Tu opinión construye la reputación de las agencias.' : 'Thanks for rating! Your opinion builds the reputation of agencies.');
      setStars(0);
      setComment('');
      onClose();
    } else {
      showToast(isEs ? 'No se pudo guardar tu calificación. Inténtalo de nuevo.' : 'Could not save your rating. Try again.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0514] border border-amber-500/40 p-5 shadow-2xl space-y-4 text-white my-auto">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              {isEs ? 'Califica el evento' : 'Rate the event'}
            </span>
            <h3 className="text-lg font-black text-white leading-tight">{pass.eventTitle}</h3>
            <p className="text-[11px] text-purple-200/70">{pass.eventDate} · {isEs ? 'organiza' : 'hosted by'} {pass.organizerName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition" aria-label={isEs ? 'Cerrar' : 'Close'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-purple-100/80 leading-relaxed">
          {isEs ? '¿Qué te pareció el evento? Tu calificación genera el estatus de la agencia, promotora o asociado que lo publicó.' : 'How was the event? Your rating builds the status of the agency, promoter or associate who published it.'}
        </p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} ${isEs ? 'estrellas' : 'stars'}`}
              className="transition active:scale-95"
            >
              <Star className={'w-10 h-10 transition ' + (n <= stars ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'text-white/20 hover:text-amber-200/60')} />
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 280))}
          placeholder={isEs ? 'Comentario opcional sobre la organización, el lugar, el ambiente...' : 'Optional comment about the organization, the venue, the vibe...'}
          className="w-full p-3 rounded-2xl bg-black/60 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
        />

        {/* Contact / report recommendation when the experience was bad */}
        {stars > 0 && stars < RATING_ALERT_THRESHOLD && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 space-y-1.5">
            <p className="flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {isEs ? 'Lamentamos tu experiencia. Te recomendamos contactarnos desde el panel de soporte para atender tu caso, o reportar directamente a quien publicó el evento (agencia, promotor o asociado): el administrador recibe la alerta con tus referencias.' : 'We are sorry about your experience. We recommend contacting us from the support panel to handle your case, or reporting the publisher directly (agency, promoter or associate): the administrator receives the alert with your references.'}
            </p>
            <p className="flex items-start gap-2 leading-relaxed text-rose-200/80">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              {isEs ? 'Buscamos tu satisfacción más que ganar cualquier controversia.' : 'We seek your satisfaction over winning any controversy.'}
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={!stars || busy}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 text-black font-black text-sm shadow-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
          {isEs ? 'Enviar calificación' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
