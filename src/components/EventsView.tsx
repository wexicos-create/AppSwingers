import React, { useState } from 'react';
import { ClubEvent, EventAccessPass, Reservation, EventTier } from '../types';
import { EVENT_TIERS } from '../data/mockProfiles';
import { Calendar, MapPin, Ticket, ShieldCheck, Plus, CheckCircle2, Megaphone, X, Star, Download, BellRing, HelpCircle } from 'lucide-react';
import { downloadEventTicket, isEventDay, isEventPast, type OrganizerReputation } from '../eventflow';

interface EventsViewProps {
  events: ClubEvent[];
  reservations: Reservation[];
  passes: EventAccessPass[];
  reputation: Record<string, OrganizerReputation>;
  onReserve: (eventId: string, tierId: string | null) => void;
  onAttend: (eventId: string, tierId: string | null) => void;
  onCancelReservation: (reservationId: string) => void;
  onRatePass: (pass: EventAccessPass) => void;
  onAgencyPromoRequest: (data: { agency: string; title: string; date: string; zone: string; cap: number }) => void;
  onOpenOrganizerPanel: () => void;
  onOpenOrganizerProfile?: (organizer: string, organizerUid: string | null) => void;
  onNoShowFeedback?: (pass: EventAccessPass, reason: string, details: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  reservations,
  passes,
  reputation,
  onReserve,
  onAttend,
  onCancelReservation,
  onRatePass,
  onAgencyPromoRequest,
  onOpenOrganizerPanel,
  onOpenOrganizerProfile,
  onNoShowFeedback,
}) => {
  const [viewTab, setViewTab] = useState<'cartelera' | 'reservas'>('cartelera');
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('pareja');
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  // Post-event no-show feedback (why the user did not attend) with complaints channel.
  const [noShowPass, setNoShowPass] = useState<EventAccessPass | null>(null);
  const [noShowReason, setNoShowReason] = useState('Imprevisto personal');
  const [noShowDetails, setNoShowDetails] = useState('');
  const [agencyForm, setAgencyForm] = useState({
    agency: '',
    title: '',
    date: '',
    zone: '',
    cap: 50,
  });

  const activeReservations = reservations.filter(r => r.status !== 'cancelado');

  const handleConfirmReservation = () => {
    if (!selectedEvent) return;
    // Paid events: one SPEI deposit per user; the admin confirms and issues
    // the VIP access pass. Free events keep the direct reservation.
    if (selectedEvent.paid) {
      onAttend(selectedEvent.id, selectedTier);
    } else {
      onReserve(selectedEvent.id, null);
    }
    setSelectedEvent(null);
  };

  const handleAgencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyForm.agency.trim() || !agencyForm.title.trim()) return;
    onAgencyPromoRequest(agencyForm);
    setAgencyForm({ agency: '', title: '', date: '', zone: '', cap: 50 });
    setAgencyModalOpen(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 pb-28 text-white overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Eventos & Fiestas
          </h2>
          <p className="text-xs text-purple-200/70">Reuniones selectas en CDMX &bull; Mascaradas</p>
        </div>

        <button
          onClick={() => setViewTab(viewTab === 'cartelera' ? 'reservas' : 'cartelera')}
          className="px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-500/30 text-xs font-semibold text-purple-200 flex items-center gap-1.5 shadow-md active:scale-95 transition"
        >
          <Ticket className="w-3.5 h-3.5 text-pink-400" />
          <span>{viewTab === 'cartelera' ? `Mis Boletos (${activeReservations.length + passes.length})` : 'Ver Cartelera'}</span>
        </button>
      </div>

      {/* VIEW: MIS RESERVAS & PASES DIGITALES */}
      {viewTab === 'reservas' && (
        <div className="space-y-4">
          {/* VIP passes (paid attendance deposits confirmed by the admin) */}
          {passes.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5" />
                Pases VIP ({passes.length})
              </span>
              {passes.map((pass) => {
                const dayOf = isEventDay(pass.eventDate);
                const past = isEventPast(pass.eventDate);
                return (
                  <div
                    key={pass.id}
                    className={`rounded-3xl bg-gradient-to-b from-purple-950/40 via-neutral-900 to-black border overflow-hidden shadow-2xl ${dayOf ? 'border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.25)]' : 'border-purple-500/30'}`}
                  >
                    {/* Pass stub */}
                    <div className="p-5 border-b border-dashed border-purple-500/30 relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${dayOf ? 'text-amber-300' : 'text-pink-400'}`}>
                          {pass.status === 'usado' ? 'Pase utilizado' : pass.status === 'reembolsado' ? 'Reembolsado' : dayOf ? '¡Hoy es tu evento!' : pass.status === 'activo' ? 'Pase activo' : 'Pago pendiente'}
                        </span>
                        <span className="text-xs text-white/60 font-medium">
                          {pass.eventDate} &bull; {pass.eventTime}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-snug">{pass.eventTitle}</h3>
                      <p className="text-xs text-purple-300/80 mt-1">{pass.tierLabel} &bull; ${pass.amount.toLocaleString()}</p>
                      <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {dayOf
                          ? `${pass.eventZone} · ubicación liberada HOY`
                          : `Zona ${pass.eventZone} · ubicación el mismo día del evento`}
                      </p>
                      <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#090514] border-r border-purple-500/30" />
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#090514] border-l border-purple-500/30" />
                    </div>

                    {/* Code + actions */}
                    <div className="p-4 bg-purple-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest block">Código de acceso</span>
                          <span className="text-base font-mono font-black text-pink-300">{pass.code}</span>
                          <span className="text-[9px] text-white/40 block">ID de orden: {pass.orderRef}</span>
                        </div>
                        {dayOf && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <BellRing className="w-3.5 h-3.5" />
                            Hoy
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadEventTicket(pass, true)}
                          className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-purple-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Ficha técnica
                        </button>
                        {past && pass.status === 'usado' && (
                          <button
                            onClick={() => onRatePass(pass)}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-black text-[11px] font-black flex items-center justify-center gap-1.5 transition"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Calificar
                          </button>
                        )}
                        {past && pass.status === 'activo' && (
                          <button
                            onClick={() => { setNoShowPass(pass); setNoShowReason('Imprevisto personal'); setNoShowDetails(''); }}
                            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-purple-500/40 text-purple-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            ¿Por qué no asististe?
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeReservations.length === 0 && passes.length === 0 ? (
            <div className="py-12 text-center text-white/50 text-xs bg-white/5 rounded-3xl p-6 border border-white/10">
              No tienes reservaciones activas. Elige un evento de la cartelera para apartar tu lugar.
            </div>
          ) : (
            activeReservations.map((res) => {
              const ev = events.find(e => e.id === res.eventId);
              const tier = EVENT_TIERS.find(t => t.id === res.tier);
              const isConfirmed = res.status === 'pagado' || res.status === 'confirmado' || res.status === 'asistió';

              return (
                <div
                  key={res.id}
                  className="rounded-3xl bg-gradient-to-b from-purple-950/40 via-neutral-900 to-black border border-purple-500/30 overflow-hidden shadow-2xl"
                >
                  {/* Ticket top stub */}
                  <div className="p-5 border-b border-dashed border-purple-500/30 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                        {isConfirmed ? 'Pase Confirmado' : 'Apartado \u2022 Pago Pendiente'}
                      </span>
                      <span className="text-xs text-white/60 font-medium">
                        {ev?.date} &bull; {ev?.time}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">
                      {ev?.title || 'Evento Privado'}
                    </h3>
                    <p className="text-xs text-purple-300/80 mt-1">
                      {tier ? `${tier.label} &bull; $${tier.price} MXN` : 'Entrada Gratuita'}
                    </p>
                    <p className="text-xs text-white/60 mt-0.5">
                      {isConfirmed ? '📍 Dirección exacta desbloqueada en tu confirmación' : `📍 ${ev?.zone}`}
                    </p>

                    {/* Left and Right cutout holes */}
                    <div className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[#090514] border-r border-purple-500/30" />
                    <div className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[#090514] border-l border-purple-500/30" />
                  </div>

                  {/* Ticket bottom code & QR representation */}
                  <div className="p-4 bg-purple-950/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest block">Código de Acceso</span>
                      <span className="text-base font-mono font-black text-pink-300">
                        {res.code || `FOLIO-${res.folio}`}
                      </span>
                    </div>

                    {isConfirmed ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Listo en Puerta</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => onCancelReservation(res.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW: CARTELERA DE EVENTOS */}
      {viewTab === 'cartelera' && (
        <div className="space-y-4">
          {events.map((ev, index) => {
            const hasReservation = reservations.some(r => r.eventId === ev.id && r.status !== 'cancelado');
            const percentSold = Math.min(100, Math.round((ev.sold / ev.cap) * 100));

            return (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`rounded-[32px] overflow-hidden cursor-pointer border transition-all hover:scale-[1.01] ${
                  ev.promoted
                    ? 'border-purple-500/40 bg-gradient-to-b from-[#1c1032] to-[#0e071a] shadow-[0_0_30px_rgba(177,76,255,0.25)]'
                    : 'border-purple-500/20 bg-[#120922] shadow-xl'
                }`}
              >
                {/* Hero preview banner */}
                <div className="relative h-36 w-full overflow-hidden">
                  <div className={`w-full h-full bg-gradient-to-tr from-purple-900 via-pink-900/60 to-black opacity-85`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#120922] via-transparent to-black/30" />

                  {/* Date badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 border border-white/10">
                    <Calendar className="w-3.5 h-3.5 text-pink-400" />
                    <span>{ev.date} &bull; {ev.time}</span>
                  </div>

                  {ev.promoted && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-[10px] font-black uppercase text-white shadow-md">
                      Destacado VIP
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-4 right-4">
                    <span className="text-[11px] font-semibold text-purple-300 block uppercase tracking-wider">
                      {ev.theme}
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight drop-shadow truncate">
                      {ev.title}
                    </h3>
                  </div>
                </div>

                {/* Details body */}
                <div className="p-4 pt-2 space-y-3">
                  <div className="flex items-center justify-between text-xs text-purple-200/80">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      <span>{ev.zone}</span>
                    </div>
                    <span className="font-bold text-white text-sm">
                      {ev.paid ? 'desde $500 MXN' : 'Entrada Gratuita'}
                    </span>
                  </div>

                  {/* Capacity progress bar */}
                  <div>
                    <div className="h-1.5 w-full rounded-full bg-purple-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_8px_rgba(255,45,120,0.8)]"
                        style={{ width: `${percentSold}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/50 mt-1">
                      <span>Cupo: {ev.sold}/{ev.cap} asistentes</span>
                      <span>{ev.cap - ev.sold > 0 ? `${ev.cap - ev.sold} lugares libres` : 'Lleno'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-purple-300/80 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenOrganizerProfile?.(ev.organizer, ev.organizerUid ?? null); }}
                        className="underline decoration-dotted underline-offset-2 hover:text-white transition text-left"
                        title="Ver perfil, calificación y eventos de la agencia / asociado / organizador"
                      >
                        Organiza: <strong className="text-white">{ev.organizer}</strong>
                      </button>
                      {reputation[ev.organizer] && reputation[ev.organizer].count > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-300 font-bold">
                          <Star className="w-3 h-3 fill-amber-300" />
                          {reputation[ev.organizer].avg}
                          <span className="text-white/40 font-normal">({reputation[ev.organizer].count})</span>
                        </span>
                      )}
                    </span>

                    {hasReservation || passes.some(p => p.eventId === ev.id && p.status !== 'cancelado') ? (
                      <span className="px-3 py-1 rounded-xl bg-purple-900/40 text-purple-200 border border-purple-400/30 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                        Reservado
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
                      >
                        {ev.paid ? 'Apartar Lugar' : 'Reservar Gratis'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Organizer registration banner: agencies, associates and hosts publish with an approved file */}
          <div
            onClick={onOpenOrganizerPanel}
            className="p-4 rounded-3xl bg-gradient-to-r from-purple-950 to-pink-950/40 border border-pink-500/30 flex items-center gap-3.5 cursor-pointer hover:bg-purple-900/40 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-950 flex items-center justify-center text-pink-300 border border-pink-500/30 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">Publica tu evento con expediente aprobado</h4>
              <p className="text-xs text-purple-200/70">Agencias, asociados y organizadores: registro con documentos, cartera virtual y retiros en 24 h.</p>
            </div>
          </div>

          {/* Agency Promo Banner */}
          <div
            onClick={() => setAgencyModalOpen(true)}
            className="p-4 rounded-3xl bg-neutral-900/60 border border-purple-500/25 flex items-center gap-3.5 cursor-pointer hover:bg-purple-950/30 transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-950 flex items-center justify-center text-pink-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white">¿Organizas eventos o fiestas privadas?</h4>
              <p className="text-xs text-purple-200/70">Publica en cartelera y promociona para la comunidad.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APARTAR LUGAR / SELECCIÓN DE ENTRADA */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-t-[36px] sm:rounded-[36px] bg-[#140a24] border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider block">
                  {selectedEvent.theme}
                </span>
                <h3 className="text-2xl font-black text-white leading-tight">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-purple-200/70 mt-1">
                  {selectedEvent.date} &bull; {selectedEvent.time} &bull; {selectedEvent.zone}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requisitos */}
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                Requisitos de Asistencia
              </span>
              {selectedEvent.reqs.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {/* Tiers selection */}
            {selectedEvent.paid && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  Elige tipo de entrada
                </span>
                <div className="space-y-2">
                  {EVENT_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                        selectedTier === tier.id
                          ? 'bg-purple-950/70 border-pink-500 shadow-md shadow-pink-500/20'
                          : 'bg-white/5 border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{tier.label}</span>
                          {tier.promo && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-bold text-white">
                              Oferta
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-purple-200/60 block">{tier.note}</span>
                      </div>
                      <span className="text-base font-black text-pink-400">${tier.price} MXN</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón confirmación */}
            <button
              onClick={handleConfirmReservation}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-sm shadow-xl shadow-purple-600/40 active:scale-95 transition"
            >
              {selectedEvent.paid ? 'Apartar Entrada · Pagar Depósito' : 'Confirmar Reserva Gratuita'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ¿POR QUÉ NO ASISTISTE? (quejas, sugerencias y reclamos del evento) */}
      {noShowPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140827] border border-purple-500/40 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
              <HelpCircle className="w-5 h-5" />
              <span>¿Por qué no asististe a {noShowPass.eventTitle}?</span>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Tu respuesta ayuda a proteger a la comunidad: las quejas, sugerencias y reclamos sobre la agencia, el trato o las condiciones del evento se envían directamente al Administrador.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/70 font-bold block">Motivo de tu inasistencia</label>
              <select
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs focus:outline-none focus:border-pink-400"
              >
                <option>Imprevisto personal</option>
                <option>Cuestiones de seguridad</option>
                <option>La agencia cambió condiciones o pidió costo extra</option>
                <option>Mal trato o mala comunicación de la agencia</option>
                <option>Ubicación lejana o de riesgo</option>
                <option>Otra razón</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-white/70 font-bold block">Quejas, sugerencias o reclamos (opcional)</label>
              <textarea
                rows={3}
                value={noShowDetails}
                onChange={(e) => setNoShowDetails(e.target.value)}
                placeholder="Cuéntanos qué pasó: trato recibido, cambios de último momento, condiciones del lugar, etc."
                className="w-full p-2.5 rounded-xl bg-neutral-900 border border-purple-500/40 text-white text-xs resize-none focus:outline-none focus:border-pink-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoShowPass(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={() => {
                  onNoShowFeedback?.(noShowPass, noShowReason, noShowDetails.trim());
                  setNoShowPass(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg"
              >
                Enviar al Administrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROMOCIÓN PARA AGENCIAS */}
      {agencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#140a24] border border-purple-500/30 p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Promocionar Evento</h3>
            <p className="text-xs text-purple-200/70 mb-4">Para agencias, clubs y anfitriones privados</p>

            <form onSubmit={handleAgencySubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre de la agencia u organizador"
                value={agencyForm.agency}
                onChange={(e) => setAgencyForm({ ...agencyForm, agency: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Título del evento"
                value={agencyForm.title}
                onChange={(e) => setAgencyForm({ ...agencyForm, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Fecha y hora (ej. Sáb 14 Nov 22:00)"
                value={agencyForm.date}
                onChange={(e) => setAgencyForm({ ...agencyForm, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />
              <input
                type="text"
                placeholder="Zona (ej. Roma Norte, CDMX)"
                value={agencyForm.zone}
                onChange={(e) => setAgencyForm({ ...agencyForm, zone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-neutral-900 border border-purple-500/30 text-sm text-white"
              />

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAgencyModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!agencyForm.agency.trim() || !agencyForm.title.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
