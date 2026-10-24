import React, { useEffect, useState } from 'react';
import { ClubEvent, EventAccessPass, EventRating } from '../types';
import { fetchAllEventPasses, fetchAllEventRatings } from '../eventflow';
import { X, Star, Building2, CalendarDays, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface OrganizerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  organizerName: string;
  organizerUid: string | null;
  events: ClubEvent[];
}

export function OrganizerProfileModal({ isOpen, onClose, isEs, organizerName, organizerUid, events }: OrganizerProfileModalProps) {
  const [ratings, setRatings] = useState<EventRating[]>([]);
  const [attendees, setAttendees] = useState<EventAccessPass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([fetchAllEventRatings(), fetchAllEventPasses()]).then(([allRatings, allPasses]) => {
      if (cancelled) return;
      setRatings(allRatings.filter(r => r.organizerName === organizerName));
      setAttendees(allPasses.filter(p => p.organizerName === organizerName));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, organizerName]);

  if (!isOpen || !organizerName) return null;

  const agencyEvents = events.filter(e => e.organizer === organizerName);
  const publishedCount = agencyEvents.filter(e => e.published).length;
  const count = ratings.length;
  const avg = count > 0 ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10 : 0;
  const good = ratings.filter(r => r.stars >= 4).length;
  const regular = ratings.filter(r => r.stars === 3).length;
  const bad = ratings.filter(r => r.stars <= 2).length;
  const comments = ratings
    .filter(r => (r.comment || '').trim().length > 0)
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-md my-auto max-h-[92vh] overflow-y-auto rounded-[32px] bg-[#10061e] border border-purple-500/40 p-5 shadow-[0_0_60px_rgba(177,76,255,0.35)] text-white space-y-4">

        {/* Header: agency name + accumulated rating */}
        <div className="flex items-start justify-between border-b border-purple-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 block">
                {isEs ? 'Perfil de Agencia / Asociado / Organizador' : 'Agency / Associate / Organizer Profile'}
              </span>
              <h2 className="text-lg font-black text-white leading-tight">{organizerName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className={'w-3.5 h-3.5 ' + (count > 0 ? 'text-amber-400 fill-amber-400' : 'text-white/30')} />
                <span className="text-xs font-bold text-white">{count > 0 ? avg : (isEs ? 'Sin calificaciones aún' : 'No ratings yet')}</span>
                {count > 0 && <span className="text-[10px] text-white/50">({count} {isEs ? 'calificaciones' : 'ratings'})</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-purple-200/70 text-center py-6">{isEs ? 'Cargando reputación y asistentes...' : 'Loading reputation and attendees...'}</p>
        ) : (
          <>
            {/* Counters: published events + good/regular/bad ratings */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <CalendarDays className="w-4 h-4 text-pink-400 mx-auto" />
                <span className="text-sm font-black text-white block mt-1">{publishedCount}</span>
                <span className="text-[9px] text-white/50">{isEs ? 'Eventos' : 'Events'}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                <span className="text-sm font-black text-emerald-300 block mt-1">{good}</span>
                <span className="text-[9px] text-white/50">{isEs ? 'Buenas' : 'Good'}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <Star className="w-4 h-4 text-amber-400 mx-auto" />
                <span className="text-sm font-black text-amber-300 block mt-1">{regular}</span>
                <span className="text-[9px] text-white/50">{isEs ? 'Regulares' : 'Average'}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
                <X className="w-4 h-4 text-rose-400 mx-auto" />
                <span className="text-sm font-black text-rose-300 block mt-1">{bad}</span>
                <span className="text-[9px] text-white/50">{isEs ? 'Malas' : 'Bad'}</span>
              </div>
            </div>

            {/* No-messaging notice */}
            <div className="p-3 rounded-2xl bg-purple-950/50 border border-purple-500/30 text-[11px] text-purple-200 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
              <span>
                {isEs
                  ? 'Por seguridad, este apartado no permite enviar mensajes a la agencia ni a los asistentes: solo se muestra la reputación acumulada y el estado de pago de cada asistente.'
                  : 'For safety, this section does not allow messaging the agency or the attendees: only the accumulated reputation and each attendee payment status are shown.'}
              </span>
            </div>

            {/* Comments from event attendees */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 block">
                {isEs ? 'Comentarios de asistentes' : 'Attendee comments'}
              </span>
              {comments.length === 0 ? (
                <p className="text-[11px] text-white/40">{isEs ? 'Aún no hay comentarios publicados.' : 'No comments published yet.'}</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="p-3 rounded-2xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={'w-3 h-3 ' + (n <= c.stars ? 'text-amber-400 fill-amber-400' : 'text-white/20')} />
                      ))}
                      <span className="text-[9px] text-white/40 ml-auto">{new Date(c.ts).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-purple-100/90 mt-1.5 leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Attendees: photo + asistiré + payment status only */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {isEs ? 'Asistentes con pase (' + attendees.length + ')' : 'Attendees with pass (' + attendees.length + ')'}
              </span>
              {attendees.length === 0 ? (
                <p className="text-[11px] text-white/40">{isEs ? 'Aún no hay pases emitidos.' : 'No passes issued yet.'}</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {attendees.map(p => (
                    <div key={p.id} className="p-2.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-sm font-black text-white shrink-0">
                        {(p.userName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-white block">{isEs ? 'Asistiré' : 'Attending'}</span>
                        <span className="text-[10px] text-white/50 block truncate">{p.eventTitle}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black text-emerald-300 block">{'$' + p.amount.toLocaleString()}</span>
                        <span className="text-[9px] text-emerald-400/80">{isEs ? 'Pagado' : 'Paid'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
