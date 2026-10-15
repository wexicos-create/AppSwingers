import React, { useState } from 'react';
import { ClubEvent, Proposal, Creator, ReportItem, Reservation, PaymentItem, Profile, SystemAnnouncement } from '../types';
import { X, Users, AlertTriangle, ShieldCheck, Calendar, DollarSign, Gift, Megaphone, Settings, Check, Trash2, Search, QrCode } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  events: ClubEvent[];
  proposals: Proposal[];
  reports: ReportItem[];
  reservations: Reservation[];
  payments: PaymentItem[];
  announcements: SystemAnnouncement[];
  attendStamps: number;
  onVerifyUser: (userId: string, status: 'verificado' | 'rechazado') => void;
  onSuspendUser: (userId: string) => void;
  onResolveReport: (reportId: string, action: string) => void;
  onApproveProposal: (proposalId: string) => void;
  onApproveEventRequest: (event: ClubEvent) => void;
  onCheckinTicket: (code: string) => void;
  onConfirmPayment: (paymentId: string) => void;
  onBroadcastAnnouncement: (title: string, body: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  profiles,
  events,
  proposals,
  reports,
  reservations,
  payments,
  announcements,
  attendStamps,
  onVerifyUser,
  onSuspendUser,
  onResolveReport,
  onApproveProposal,
  onApproveEventRequest,
  onCheckinTicket,
  onConfirmPayment,
  onBroadcastAnnouncement,
}) => {
  const [tab, setTab] = useState<'resumen' | 'usuarios' | 'reportes' | 'eventos' | 'pagos' | 'anuncios' | 'ajustes'>('resumen');
  const [ticketInput, setTicketInput] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [searchUser, setSearchUser] = useState('');

  if (!isOpen) return null;

  const totalRevenue = reservations.filter(r => r.status === 'pagado' || r.status === 'asistió').length * 600 +
    payments.filter(p => p.status === 'confirmado').reduce((acc, p) => acc + p.amount, 0);

  const pendingReports = reports.filter(r => r.status === 'abierto');
  const pendingProposals = proposals.filter(p => p.status === 'en revisión');
  const pendingReservations = reservations.filter(r => r.status === 'pendiente_pago' || r.status === 'solicitud');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-lg h-[90vh] rounded-[36px] bg-[#110820] border border-purple-500/40 flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-neutral-950/60">
          <div>
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">AppSwinguer Club</span>
            <h2 className="text-xl font-black text-white">Panel de Administración</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-1 p-2 bg-neutral-950/40 border-b border-purple-500/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'resumen', label: 'Resumen' },
            { id: 'usuarios', label: `Usuarios (${profiles.length})` },
            { id: 'reportes', label: `Reportes (${pendingReports.length})` },
            { id: 'eventos', label: 'Eventos' },
            { id: 'pagos', label: `Check-in & Pagos (${pendingReservations.length})` },
            { id: 'anuncios', label: 'Push Anuncios' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* RESUMEN */}
          {tab === 'resumen' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider block">Usuarios Activos</span>
                  <span className="text-2xl font-black text-purple-300">{profiles.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider block">Ingresos Confirmados</span>
                  <span className="text-2xl font-black text-emerald-400">${totalRevenue} MXN</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider block">Reportes Abiertos</span>
                  <span className="text-2xl font-black text-rose-400">{pendingReports.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider block">Sellos Club Canjeados</span>
                  <span className="text-2xl font-black text-amber-300">{attendStamps}/10</span>
                </div>
              </div>

              {/* Moderation alert */}
              {pendingReports.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between">
                  <span>Hay {pendingReports.length} reporte(s) abiertos que requieren tu revisión.</span>
                  <button onClick={() => setTab('reportes')} className="font-bold underline ml-2">Revisar</button>
                </div>
              )}
            </div>
          )}

          {/* USUARIOS */}
          {tab === 'usuarios' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por alias o tipo..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900 border border-purple-500/30 text-xs text-white"
                />
              </div>

              <div className="space-y-2">
                {profiles
                  .filter(p => p.name.toLowerCase().includes(searchUser.toLowerCase()))
                  .map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <img src={p.photos[0] || p.photo || ''} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{p.name} ({p.kind})</h4>
                        <span className="text-[10px] text-purple-300 block">{p.verify} &bull; {p.status}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {p.verify !== 'verificado' && (
                          <button
                            onClick={() => onVerifyUser(p.id, 'verificado')}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold"
                          >
                            Verificar
                          </button>
                        )}
                        <button
                          onClick={() => onSuspendUser(p.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold"
                        >
                          {p.status === 'activo' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* REPORTES */}
          {tab === 'reportes' && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/50">Sin reportes registrados.</div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-rose-400 uppercase">{r.target.type}: {r.target.name}</span>
                      <span className="text-white/40">{r.when}</span>
                    </div>
                    <p className="text-xs text-white/90">Motivo: {r.reason}</p>
                    {r.status === 'abierto' ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onResolveReport(r.id, 'descartado')}
                          className="px-3 py-1 rounded-lg bg-white/10 text-xs font-semibold text-white/80"
                        >
                          Descartar
                        </button>
                        <button
                          onClick={() => onResolveReport(r.id, 'advertencia')}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold"
                        >
                          Advertir
                        </button>
                        <button
                          onClick={() => onResolveReport(r.id, 'suspender')}
                          className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold"
                        >
                          Suspender
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold block">Resuelto: {r.action}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* CHECK-IN Y PAGOS */}
          {tab === 'pagos' && (
            <div className="space-y-4">
              {/* Check-in box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  Check-in de Asistencia en Puerta
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código de boleto (ej. AS-XXXX-123)"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-purple-500/30 text-xs font-mono text-white"
                  />
                  <button
                    onClick={() => {
                      onCheckinTicket(ticketInput.trim());
                      setTicketInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white"
                  >
                    Validar
                  </button>
                </div>
              </div>

              {/* Pending reservations */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  Reservaciones Pendientes ({pendingReservations.length})
                </span>
                {pendingReservations.map((res) => {
                  const ev = events.find(e => e.id === res.eventId);
                  return (
                    <div key={res.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{ev?.title}</h4>
                        <span className="text-[10px] text-white/50">{res.folio} &bull; {res.status}</span>
                      </div>
                      <button
                        onClick={() => onCheckinTicket(res.code || res.folio)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                      >
                        Confirmar Pase
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PUSH ANUNCIOS */}
          {tab === 'anuncios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Nuevo Anuncio a Usuarios</h4>
                <input
                  type="text"
                  placeholder="Título del anuncio"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-purple-500/30 text-xs text-white"
                />
                <textarea
                  placeholder="Mensaje de difusión..."
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-purple-500/30 text-xs text-white resize-none"
                />
                <button
                  onClick={() => {
                    if (annTitle.trim()) {
                      onBroadcastAnnouncement(annTitle, annBody);
                      setAnnTitle('');
                      setAnnBody('');
                    }
                  }}
                  disabled={!annTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs disabled:opacity-50"
                >
                  Publicar a toda la app
                </button>
              </div>

              {/* Published list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">Historial de Anuncios</span>
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <h5 className="text-xs font-bold text-white">{a.title}</h5>
                    <p className="text-[11px] text-white/70 mt-0.5">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
