import React, { useState, useEffect } from 'react';
import { X, FileCheck, Calendar, Wallet, Clock, ClipboardCheck, LifeBuoy, CheckCircle2, AlertTriangle, MapPin, Send } from 'lucide-react';
import { showToast } from './Toast';
import { ClubEvent, AppRegion, EventAccessPass, EventPayoutRequest, SupportTicket } from '../types';
import {
  OrganizerApplication,
  OrganizerApplicationDraft,
  OrganizerBenefitState,
  OrganizerRole,
  WalletTransaction,
  WithdrawalRequest,
  EventPublishFee,
  namesMatch,
  walletBalance,
  compressImage,
} from '../organizers';
import {
  fetchEventPassesForEvent,
  fetchPayoutsForOrganizer,
  fetchTicketsForUser,
  updateRemoteEventPass,
  computeEventSettlement,
  newEventPayoutRequest,
  createRemotePayout,
  createRemoteTicket,
  newSupportTicket,
  pushRemoteNotification,
  normalizeAccessCode,
  EVENT_MIN_ATTENDANCE_RATIO,
  PLATFORM_COMMISSION_LABEL,
} from '../eventflow';

interface OrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: AppRegion;
  userEmail: string;
  userName: string;
  userUid: string | null;
  application: OrganizerApplication | null;
  benefit: OrganizerBenefitState;
  eventFee: EventPublishFee;
  ownEvents: ClubEvent[];
  wallet: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
  onSubmitApplication: (draft: OrganizerApplicationDraft) => void;
  onPublishEvent: (data: { title: string; theme: string; date: string; time: string; zone: string; cap: number }) => void;
  onRequestWithdrawal: (amount: number) => void;
  onWalletCredit: (tx: WalletTransaction) => void;
}

/**
 * Organizer panel for agencies, associates and occasional hosts. Besides the
 * document file, event publishing and the virtual wallet, it now includes:
 * - "Liquidar": single-form attendance registration on event day (validated
 *   against the VIP passes actually issued), refund declaration for
 *   non-admitted users and the harmonized settlement (deposits of confirmed
 *   attendees and no-shows minus 30% commission and 10% ISR; refunds only for
 *   declared non-admissions; payouts below 50% attendance go to admin review),
 *   plus the same-day location release notification to pass holders.
 * - "Soporte": open support channel for agencies, promoters, associates and
 *   creators (requests, complaints and clarifications, satisfaction first).
 */
export function OrganizerModal({
  isOpen,
  onClose,
  isEs,
  region,
  userEmail,
  userName,
  userUid,
  application,
  benefit,
  eventFee,
  ownEvents,
  wallet,
  withdrawals,
  onSubmitApplication,
  onPublishEvent,
  onRequestWithdrawal,
  onWalletCredit,
}: OrganizerModalProps) {
  const [section, setSection] = useState<'registro' | 'publicar' | 'liquidacion' | 'cartera' | 'soporte'>('registro');
  const [role, setRole] = useState<OrganizerRole>('organizador');
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('');
  const [ineFront, setIneFront] = useState('');
  const [ineBack, setIneBack] = useState('');
  const [bankStatement, setBankStatement] = useState('');
  const [fiscalProof, setFiscalProof] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutClabe, setPayoutClabe] = useState('');
  const [payoutHolder, setPayoutHolder] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', theme: '', date: '', time: '22:00', zone: '', cap: 40 });
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Settlement: attendance form, refund declaration and payout requests
  const [settleEventId, setSettleEventId] = useState<string | null>(null);
  const [settlePasses, setSettlePasses] = useState<EventAccessPass[]>([]);
  const [settlePayouts, setSettlePayouts] = useState<EventPayoutRequest[]>([]);
  const [attendanceInput, setAttendanceInput] = useState('');
  const [validatedPassIds, setValidatedPassIds] = useState<string[]>([]);
  const [refundPassIds, setRefundPassIds] = useState<string[]>([]);
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleNote, setSettleNote] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);

  // Support channel for agencies, promoters, associates and creators
  const [ticketRole, setTicketRole] = useState<SupportTicket['requester']>('agencia');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [ticketBusy, setTicketBusy] = useState(false);

  const publishedEvents = ownEvents.filter(e => e.published);

  useEffect(() => {
    if (!isOpen || !userUid) return;
    let cancelled = false;
    const load = async () => {
      const [payouts, tickets] = await Promise.all([
        fetchPayoutsForOrganizer(userUid),
        fetchTicketsForUser(userUid),
      ]);
      if (cancelled) return;
      setSettlePayouts(payouts);
      setMyTickets(tickets);
    };
    void load();
    return () => { cancelled = true; };
  }, [isOpen, userUid]);

  useEffect(() => {
    if (!isOpen || !settleEventId) return;
    let cancelled = false;
    const load = async () => {
      const passes = await fetchEventPassesForEvent(settleEventId);
      if (cancelled) return;
      setSettlePasses(passes);
      setValidatedPassIds([]);
      setRefundPassIds([]);
    };
    void load();
    return () => { cancelled = true; };
  }, [isOpen, settleEventId]);

  if (!isOpen) return null;

  const roleMeta = (r: OrganizerRole): { label: string; note: string } => {
    switch (r) {
      case 'agencia':
        return { label: isEs ? 'Agencia' : 'Agency', note: isEs ? 'Organizador recurrente profesional' : 'Professional recurring host' };
      case 'asociado':
        return { label: isEs ? 'Asociado' : 'Associate', note: isEs ? 'Asociado de eventos únicamente' : 'Events-only associate' };
      default:
        return { label: isEs ? 'Organizador ocasional' : 'Occasional organizer', note: isEs ? 'Beneficio con vigencia mensual, renovable con el administrador' : 'Monthly benefit, renewable with the administrator' };
    }
  };

  const appStatusBadge = (): { label: string; className: string } => {
    if (!application) return { label: isEs ? 'SIN REGISTRO' : 'NOT REGISTERED', className: 'bg-white/10 text-white/50' };
    switch (application.status) {
      case 'aprobada':
        return { label: isEs ? 'APROBADO' : 'APPROVED', className: 'bg-emerald-500/20 text-emerald-300' };
      case 'rechazada':
        return { label: isEs ? 'RECHAZADO' : 'REJECTED', className: 'bg-rose-500/20 text-rose-300' };
      default:
        return { label: isEs ? 'EN REVISIÓN' : 'UNDER REVIEW', className: 'bg-amber-500/20 text-amber-300' };
    }
  };

  const ticketRoleMeta = (r: SupportTicket['requester']): string => {
    switch (r) {
      case 'agencia': return isEs ? 'Agencia' : 'Agency';
      case 'asociado': return isEs ? 'Asociado' : 'Associate';
      case 'creadora': return isEs ? 'Creadora' : 'Creator';
      default: return isEs ? 'Organizador' : 'Organizer';
    }
  };

  const docField = (label: string, value: string, onPick: (dataUrl: string) => void) => (
    <div>
      <span className="text-[10px] text-white/60 block mb-1">{label}</span>
      <label className="block">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            void compressImage(file)
              .then(onPick)
              .catch(() => showToast(isEs ? 'No se pudo procesar la imagen.' : 'Could not process the image.', 'error'));
          }}
        />
        <div className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-[11px] text-center cursor-pointer truncate">
          {value ? (isEs ? 'Documento adjuntado ✓' : 'Document attached ✓') : (isEs ? 'Adjuntar foto' : 'Attach photo')}
        </div>
      </label>
      {value && <img src={value} alt={label} className="mt-1 w-14 h-14 object-cover rounded-lg border border-white/10" />}
    </div>
  );

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !phone.trim()) {
      showToast(isEs ? 'Nombre legal y teléfono son obligatorios.' : 'Legal name and phone are required.', 'error');
      return;
    }
    if (!ineFront || !ineBack || !bankStatement || !fiscalProof) {
      showToast(isEs ? 'Adjunta los cuatro documentos del expediente (INE, estado de cuenta y comprobante fiscal).' : 'Attach all four file documents (ID, bank statement and fiscal proof).', 'error');
      return;
    }
    const clabe = payoutClabe.replace(/[^0-9]/g, '');
    if (clabe.length !== 18) {
      showToast(isEs ? 'La CLABE debe tener exactamente 18 dígitos.' : 'CLABE must be exactly 18 digits.', 'error');
      return;
    }
    if (!payoutBank.trim()) {
      showToast(isEs ? 'El banco de la cuenta de retiro es obligatorio.' : 'The withdrawal bank is required.', 'error');
      return;
    }
    if (!namesMatch(legalName, payoutHolder)) {
      showToast(isEs ? 'La cuenta de retiro debe estar a nombre del titular del expediente.' : 'The withdrawal account must be in the file holder\u2019s name.', 'error');
      return;
    }
    onSubmitApplication({
      userUid,
      userEmail,
      role,
      legalName: legalName.trim(),
      phone: phone.trim(),
      ineFront,
      ineBack,
      bankStatement,
      fiscalProof,
      payoutBank: payoutBank.trim(),
      payoutClabe: clabe,
      payoutHolder: payoutHolder.trim(),
    });
    setSection('publicar');
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date.trim() || !eventForm.zone.trim()) {
      showToast(isEs ? 'Título, fecha y zona son obligatorios.' : 'Title, date and zone are required.', 'error');
      return;
    }
    onPublishEvent({
      title: eventForm.title.trim(),
      theme: eventForm.theme.trim() || (isEs ? 'Evento privado' : 'Private event'),
      date: eventForm.date.trim(),
      time: eventForm.time.trim() || '22:00',
      zone: eventForm.zone.trim(),
      cap: Math.max(2, Math.min(1000, Number(eventForm.cap) || 40)),
    });
    setEventForm({ title: '', theme: '', date: '', time: '22:00', zone: '', cap: 40 });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.round(Number(withdrawAmount) * 100) / 100;
    if (!amount || amount <= 0) {
      showToast(isEs ? 'Ingresa un monto válido.' : 'Enter a valid amount.', 'error');
      return;
    }
    onRequestWithdrawal(amount);
    setWithdrawAmount('');
  };

  // ---------- Settlement: attendance registration in a single form ----------
  const selectedEvent = publishedEvents.find(e => e.id === settleEventId) || null;
  const activePasses = settlePasses.filter(p => p.status === 'activo');
  const alreadySettled = settlePayouts.find(p => p.eventId === settleEventId) || null;
  const simulatedPasses = settlePasses.map(p => validatedPassIds.includes(p.id) ? { ...p, status: 'usado' as const } : p);
  const settlementPreview = validatedPassIds.length > 0 ? computeEventSettlement(simulatedPasses, refundPassIds) : null;

  const handleValidateAttendance = () => {
    const rawCodes = attendanceInput.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (rawCodes.length === 0) {
      showToast(isEs ? 'Pega los códigos presentados en la puerta, uno por línea.' : 'Paste the codes shown at the door, one per line.', 'error');
      return;
    }
    const seen = new Set<string>();
    const matched: string[] = [];
    const unknown: string[] = [];
    for (const raw of rawCodes) {
      const norm = normalizeAccessCode(raw);
      const pass = activePasses.find(p => p.code === norm || p.code === raw.toUpperCase());
      if (!pass) { unknown.push(norm); continue; }
      if (seen.has(pass.id)) continue;
      seen.add(pass.id);
      matched.push(pass.id);
    }
    if (unknown.length > 0) {
      showToast((isEs ? 'Códigos no válidos (no existen o ya fueron usados): ' : 'Invalid codes (nonexistent or already used): ') + unknown.join(', '), 'error');
      return;
    }
    if (matched.length === 0) {
      showToast(isEs ? 'Ningún código coincidió con los pases emitidos.' : 'No code matched the issued passes.', 'error');
      return;
    }
    setValidatedPassIds(matched);
    setRefundPassIds([]);
    showToast(isEs
      ? `${matched.length} código(s) validados contra los pases emitidos.`
      : `${matched.length} code(s) validated against the issued passes.`, 'success');
  };

  const toggleRefund = (passId: string) => {
    setRefundPassIds(prev => prev.includes(passId) ? prev.filter(id => id !== passId) : [...prev, passId]);
  };

  const handleSettle = async () => {
    if (!settleEventId || !selectedEvent || validatedPassIds.length === 0 || settleBusy) return;
    if (alreadySettled) {
      showToast(isEs ? 'Este evento ya cuenta con una liquidación registrada.' : 'This event already has a registered settlement.', 'error');
      return;
    }
    setSettleBusy(true);
    const now = Date.now();
    // Refund declaration first (non-admitted users get their deposit back).
    for (const passId of refundPassIds) {
      const pass = settlePasses.find(p => p.id === passId);
      const ok = await updateRemoteEventPass(passId, { status: 'reembolsado', refundedAt: now });
      if (ok && pass && pass.userUid) {
        await pushRemoteNotification({
          userUid: pass.userUid,
          kind: 'evento',
          title: isEs ? 'Depósito reembolsado' : 'Deposit refunded',
          body: isEs
            ? `El organizador declaró que no fuiste admitido en "${pass.eventTitle}". Tu depósito de $${pass.amount.toLocaleString()} será reembolsado; no se te cobrará nada más.`
            : `The organizer declared you were not admitted to "${pass.eventTitle}". Your $${pass.amount.toLocaleString()} deposit will be refunded.`,
        });
      }
    }
    // Confirmed attendance: codes presented at the door are marked as used.
    for (const passId of validatedPassIds) {
      await updateRemoteEventPass(passId, { status: 'usado', usedAt: now });
    }
    const settlement = computeEventSettlement(simulatedPasses, refundPassIds);
    const payout = newEventPayoutRequest({
      eventId: settleEventId,
      eventTitle: selectedEvent.title,
      organizerUid: userUid,
      organizerName: application?.legalName || userName || userEmail,
      organizerEmail: userEmail,
      settlement,
      status: settlement.requiresReview ? 'revision' : 'liberado',
    });
    const created = await createRemotePayout(payout);
    setSettleBusy(false);
    if (!created) {
      showToast(isEs ? 'No se pudo registrar la liquidación. Verifica tu conexión.' : 'Could not register the settlement. Check your connection.', 'error');
      return;
    }
    setSettlePayouts(prev => [payout, ...prev]);
    // Instant release (attendance >= 50%): the net is credited to the
    // organizer wallet right away; admin review payouts are credited when the
    // administrator releases them from the admin panel.
    if (!settlement.requiresReview) {
      onWalletCredit({
        id: 'wtx_pay_' + payout.id,
        userUid,
        kind: 'ingreso_evento',
        eventId: settleEventId,
        gross: settlement.gross,
        commission: settlement.commission,
        isrRetained: settlement.isrRetained,
        net: settlement.net,
        note: `${isEs ? 'Liquidación evento' : 'Event settlement'}: ${selectedEvent.title} (${settlement.attendedCount} ${isEs ? 'asistente(s)' : 'attendee(s)'}, ${settlement.noShowCount} no-show)`,
        ts: now,
      });
    }
    setSettleNote(settlement.requiresReview
      ? (isEs
        ? `Asistencia declarada: ${settlement.attendedCount} de ${settlement.paidCount} pases pagados (menos del ${Math.round(EVENT_MIN_ATTENDANCE_RATIO * 100)}%). La liquidación pasó a revisión del administrador para proteger a los asistentes; si es legítima, se libera manualmente.`
        : `Declared attendance: ${settlement.attendedCount} of ${settlement.paidCount} paid passes (below ${Math.round(EVENT_MIN_ATTENDANCE_RATIO * 100)}%). The payout went to admin review to protect attendees; if legitimate, it is released manually.`)
      : (isEs
        ? `Liquidación liberada: $${settlement.net.toLocaleString()} netos por ${settlement.attendedCount} asistente(s) y ${settlement.noShowCount} inasistencia(s) no reembolsable(s). Reembolsos: $${settlement.refundTotal.toLocaleString()} (${settlement.refundCount} usuario(s)).`
        : `Payout released: $${settlement.net.toLocaleString()} net for ${settlement.attendedCount} attendee(s) and ${settlement.noShowCount} non-refundable no-show(s). Refunds: $${settlement.refundTotal.toLocaleString()} (${settlement.refundCount} user(s)).`));
    showToast(isEs ? 'Asistencia registrada y liquidación creada.' : 'Attendance registered and settlement created.', 'success');
  };

  // Same-day location release (security: the exact venue is only shared with
  // pass holders on the day of the event).
  const handleReleaseLocation = async () => {
    if (!selectedEvent || !locationInput.trim() || locationBusy) return;
    setLocationBusy(true);
    const targets = settlePasses.filter(p => p.status === 'activo' || p.status === 'usado');
    let sent = 0;
    for (const pass of targets) {
      if (!pass.userUid) continue;
      const ok = await pushRemoteNotification({
        userUid: pass.userUid,
        kind: 'evento',
        title: isEs ? 'Ubicación liberada' : 'Location released',
        body: isEs
          ? `"${pass.eventTitle}" (${pass.eventDate} · ${pass.eventTime}): ${locationInput.trim()}. Preséntate únicamente con tu código de acceso ${pass.code}.`
          : `"${pass.eventTitle}" (${pass.eventDate} · ${pass.eventTime}): ${locationInput.trim()}. Show up with your access code ${pass.code} only.`,
      });
      if (ok) sent++;
    }
    setLocationBusy(false);
    if (sent > 0) {
      setLocationInput('');
      showToast(isEs ? `Ubicación enviada a ${sent} asistente(s) con pase.` : `Location sent to ${sent} pass holder(s).`, 'success');
    } else {
      showToast(isEs ? 'No hay pases activos para este evento o falló el envío.' : 'There are no active passes for this event or the send failed.', 'error');
    }
  };

  // ---------- Support channel ----------
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast(isEs ? 'Asunto y mensaje son obligatorios.' : 'Subject and message are required.', 'error');
      return;
    }
    setTicketBusy(true);
    const ticket = newSupportTicket({
      userUid,
      userName: application?.legalName || userName || userEmail,
      userEmail,
      requester: ticketRole,
      subject: ticketSubject.trim(),
      message: ticketMessage.trim(),
    });
    const ok = await createRemoteTicket(ticket);
    setTicketBusy(false);
    if (!ok) {
      showToast(isEs ? 'No se pudo enviar la solicitud. Verifica tu conexión.' : 'Could not submit the request. Check your connection.', 'error');
      return;
    }
    setMyTickets(prev => [ticket, ...prev]);
    setTicketSubject('');
    setTicketMessage('');
    showToast(isEs ? 'Solicitud enviada. Atenderemos tu caso con apertura total.' : 'Request submitted. We will handle your case with full openness.', 'success');
  };

  const balance = walletBalance(wallet);
  const currency = region === 'MX' ? 'MXN' : 'USD';
  const badge = appStatusBadge();
  const sortedWallet = [...wallet].sort((a, b) => b.ts - a.ts);
  const sortedWithdrawals = [...withdrawals].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-lg p-5 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-2xl flex flex-col gap-4 relative my-auto">

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 border border-pink-500/40 shadow-lg">
            <FileCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            {isEs ? 'Panel de Organizadores' : 'Organizer Panel'}
          </h2>
          <p className="text-[11px] text-purple-200/70 mt-0.5">
            {isEs ? 'Agencias, asociados y organizadores de eventos' : 'Agencies, associates and event hosts'}
          </p>
        </div>

        {/* Section navigation */}
        <div className="flex p-1 rounded-xl bg-black/60 border border-white/10 gap-1 text-[10px]">
          <button
            onClick={() => setSection('registro')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'registro' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            {isEs ? 'Registro' : 'File'}
          </button>
          <button
            onClick={() => setSection('publicar')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'publicar' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {isEs ? 'Publicar' : 'Publish'}
          </button>
          <button
            onClick={() => setSection('liquidacion')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'liquidacion' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            {isEs ? 'Liquidar' : 'Settle'}
          </button>
          <button
            onClick={() => setSection('cartera')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'cartera' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {isEs ? 'Cartera' : 'Wallet'}
          </button>
          <button
            onClick={() => setSection('soporte')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'soporte' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            {isEs ? 'Soporte' : 'Support'}
          </button>
        </div>

        {/* SECTION 1: REGISTRO CON EXPEDIENTE DOCUMENTAL */}
        {section === 'registro' && (
          <div className="space-y-3">
            {application && (
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">{application.legalName}</span>
                  <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + badge.className}>{badge.label}</span>
                </div>
                <p className="text-[10px] text-white/60">
                  {roleMeta(application.role).label} · {roleMeta(application.role).note}
                </p>
                {application.status === 'aprobada' && (
                  <p className="text-[10px] text-emerald-300">
                    {benefit.active
                      ? (isEs ? 'Beneficio de publicación activo.' : 'Publishing benefit active.')
                      : (isEs ? 'Beneficio vencido: solicita renovación al administrador.' : 'Benefit expired: request renewal from the administrator.')}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-3">
              <div>
                <span className="text-[10px] text-white/60 block mb-1">{isEs ? 'Tipo de organizador' : 'Organizer type'}</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['agencia', 'asociado', 'organizador'] as OrganizerRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                        role === r ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/60 border-white/15 text-white/60 hover:text-white'
                      }`}
                    >
                      {roleMeta(r).label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-purple-200/60 mt-1">{roleMeta(role).note}</p>
              </div>

              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder={isEs ? 'Nombre legal completo (como en tu INE)' : 'Full legal name (as on your ID)'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isEs ? 'Teléfono de contacto' : 'Contact phone'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
              />

              <div className="grid grid-cols-2 gap-2">
                {docField(isEs ? 'INE (frente)' : 'ID (front)', ineFront, setIneFront)}
                {docField(isEs ? 'INE (reverso)' : 'ID (back)', ineBack, setIneBack)}
                {docField(isEs ? 'Foto de estado de cuenta' : 'Bank statement photo', bankStatement, setBankStatement)}
                {docField(isEs ? 'Comprobante fiscal' : 'Fiscal proof', fiscalProof, setFiscalProof)}
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-white block">{isEs ? 'Cuenta para retiros (debe estar a tu nombre)' : 'Withdrawal account (must be in your name)'}</span>
                <input
                  type="text"
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  placeholder={isEs ? 'Banco' : 'Bank'}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
                <input
                  type="text"
                  value={payoutClabe}
                  onChange={(e) => setPayoutClabe(e.target.value)}
                  placeholder="CLABE (18 dígitos)"
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
                <input
                  type="text"
                  value={payoutHolder}
                  onChange={(e) => setPayoutHolder(e.target.value)}
                  placeholder={isEs ? 'Titular de la cuenta' : 'Account holder'}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {application
                  ? (isEs ? 'Actualizar expediente' : 'Update file')
                  : (isEs ? 'Enviar expediente para revisión' : 'Submit file for review')}
              </button>
              <p className="text-[10px] text-white/40 text-center">
                {isEs
                  ? 'El administrador revisa tus documentos. Al aprobar, se habilita la publicación de eventos y tu cartera virtual.'
                  : 'The administrator reviews your documents. On approval, event publishing and your virtual wallet are enabled.'}
              </p>
            </form>
          </div>
        )}

        {/* SECTION 2: PUBLICAR EVENTO (SPEI FEE, APROBACIÓN DEL ADMIN) */}
        {section === 'publicar' && (
          <div className="space-y-3">
            {!application || application.status !== 'aprobada' || !benefit.active ? (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-semibold text-center">
                {isEs
                  ? 'Requieres un expediente aprobado (y beneficio vigente) para publicar eventos.'
                  : 'You need an approved file (and active benefit) to publish events.'}
              </div>
            ) : (
              <form onSubmit={handlePublish} className="space-y-2.5">
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder={isEs ? 'Título del evento' : 'Event title'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
                <input
                  type="text"
                  value={eventForm.theme}
                  onChange={(e) => setEventForm({ ...eventForm, theme: e.target.value })}
                  placeholder={isEs ? 'Tema (ej. Mascarada & Sensualidad)' : 'Theme (e.g. Masquerade & Sensuality)'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    placeholder={isEs ? 'Fecha (ej. Sáb 14 Nov)' : 'Date (e.g. Sat Nov 14)'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                  />
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    placeholder="22:00"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={eventForm.zone}
                    onChange={(e) => setEventForm({ ...eventForm, zone: e.target.value })}
                    placeholder={isEs ? 'Zona (ej. Roma Norte, CDMX)' : 'Zone (e.g. Roma Norte)'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                  />
                  <input
                    type="number"
                    min={2}
                    max={1000}
                    value={eventForm.cap}
                    onChange={(e) => setEventForm({ ...eventForm, cap: Number(e.target.value) })}
                    placeholder={isEs ? 'Capacidad' : 'Capacity'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                  />
                </div>
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-[11px] text-white/70 space-y-0.5">
                  <div className="flex justify-between">
                    <span>{isEs ? 'Tarifa de publicación' : 'Publishing fee'}</span>
                    <span className="font-bold text-white">${eventFee.base.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA 16%</span>
                    <span className="font-bold text-white">${eventFee.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-pink-300 font-bold">
                    <span>{isEs ? 'Total (SPEI)' : 'Total (SPEI)'}</span>
                    <span>${eventFee.total.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold"
                >
                  {isEs ? 'Publicar evento (pago por SPEI)' : 'Publish event (SPEI payment)'}
                </button>
                <p className="text-[10px] text-white/40 text-center">
                  {isEs
                    ? 'El evento se publica automáticamente cuando el administrador aprueba tu transferencia.'
                    : 'The event publishes automatically once the administrator approves your transfer.'}
                </p>
              </form>
            )}

            {ownEvents.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-white block">{isEs ? 'Mis eventos' : 'My events'}</span>
                {ownEvents.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{ev.title}</p>
                      <p className="text-[10px] text-white/50 truncate">{ev.date} · {ev.zone}</p>
                    </div>
                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (ev.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300')}>
                      {ev.published ? (isEs ? 'PUBLICADO' : 'PUBLISHED') : (isEs ? 'PAGO EN REVISIÓN' : 'PAYMENT UNDER REVIEW')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: LIQUIDACIÓN - ASISTENCIA, REEMBOLSOS Y PAGO */}
        {section === 'liquidacion' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60 leading-relaxed">
              {isEs
                ? 'El día del evento registra la asistencia en UN solo formulario: pega todos los códigos presentados en la puerta. Se validan contra los pases VIP realmente emitidos (sin duplicados ni inventos). Si no admitiste a alguien que pagó, márcalo como reembolsable: solo a ellos se les devuelve su depósito. Las inasistencias sin reembolso se liberan a tu favor (fue aceptado por el usuario antes de pagar). Si la asistencia declarada es menor al 50% de los pases pagados, la liquidación pasa a revisión del administrador para evitar estafas escalonadas.'
                : 'On event day register attendance in ONE single form: paste every code shown at the door. Codes are validated against the actually issued VIP passes (no duplicates or inventions). If you did not admit someone who paid, mark them as refundable: only they get their deposit back. Non-refunded no-shows are released to you (accepted by the user before paying). If declared attendance is below 50% of paid passes, the payout goes to administrator review to prevent staggered scams.'}
            </div>

            {publishedEvents.length === 0 ? (
              <p className="text-[11px] text-white/50 text-center py-4">
                {isEs ? 'Publica un evento para gestionar asistencia y liquidaciones.' : 'Publish an event to manage attendance and settlements.'}
              </p>
            ) : (
              <>
                <div>
                  <span className="text-[10px] text-white/60 block mb-1">{isEs ? 'Selecciona el evento a liquidar' : 'Select the event to settle'}</span>
                  <div className="space-y-1">
                    {publishedEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => { setSettleEventId(ev.id); setAttendanceInput(''); setValidatedPassIds([]); setRefundPassIds([]); setSettleNote(null); }}
                        className={`w-full p-2.5 rounded-xl border text-left transition ${
                          settleEventId === ev.id ? 'bg-purple-600/30 border-purple-400/60' : 'bg-black/50 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <p className="text-[11px] font-bold text-white truncate">{ev.title}</p>
                        <p className="text-[10px] text-white/50 truncate">{ev.date} · {ev.zone}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedEvent && (
                  <>
                    {/* Passes overview */}
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white">{isEs ? 'Pases emitidos' : 'Issued passes'}</span>
                        <span className="text-[11px] font-bold text-pink-300">
                          {settlePasses.filter(p => p.status === 'activo' || p.status === 'usado').length} {isEs ? 'pagados' : 'paid'}
                        </span>
                      </div>
                      {settlePasses.length === 0 ? (
                        <p className="text-[10px] text-white/50">{isEs ? 'Nadie ha comprado depósito para este evento aún.' : 'No one has bought a deposit for this event yet.'}</p>
                      ) : settlePasses.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-mono text-white/80 truncate">{p.code}</span>
                          <span className="text-white/50 shrink-0">{p.userName}</span>
                          <span className={'font-bold shrink-0 ' + (p.status === 'activo' ? 'text-emerald-300' : p.status === 'usado' ? 'text-blue-300' : 'text-rose-300')}>
                            ${p.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {alreadySettled ? (
                      <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-white">{isEs ? 'Liquidación registrada' : 'Settlement registered'}</span>
                          <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (alreadySettled.status === 'liberado' ? 'bg-emerald-500/20 text-emerald-300' : alreadySettled.status === 'rechazado' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300')}>
                            {alreadySettled.status === 'liberado' ? (isEs ? 'LIBERADO' : 'RELEASED') : alreadySettled.status === 'rechazado' ? (isEs ? 'RECHAZADO' : 'REJECTED') : (isEs ? 'EN REVISIÓN' : 'UNDER REVIEW')}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/60">
                          {isEs ? 'Asistieron' : 'Attended'}: {alreadySettled.attendedCount} · {isEs ? 'pagados' : 'paid'}: {alreadySettled.paidCount} · {isEs ? 'neto' : 'net'}: ${alreadySettled.net.toLocaleString()} · {isEs ? 'reembolsos' : 'refunds'}: ${alreadySettled.refundTotal.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-white/40">{alreadySettled.note || (isEs ? 'Sin notas.' : 'No notes.')}</p>
                      </div>
                    ) : (
                      <>
                        {/* Single attendance form */}
                        <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                          <span className="text-[11px] font-bold text-white block">{isEs ? 'Asistencia (un solo formulario)' : 'Attendance (single form)'}</span>
                          <textarea
                            value={attendanceInput}
                            onChange={(e) => setAttendanceInput(e.target.value)}
                            rows={4}
                            placeholder={'VIP 7365 6145 0880\nVIP 1234 5678 9012'}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-[11px] font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleValidateAttendance}
                            disabled={activePasses.length === 0}
                            className="w-full py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-[11px] font-bold transition disabled:opacity-40"
                          >
                            {isEs ? 'Validar códigos contra pases emitidos' : 'Validate codes against issued passes'}
                          </button>
                          {validatedPassIds.length > 0 && (
                            <p className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isEs ? `${validatedPassIds.length} asistencia(s) validadas.` : `${validatedPassIds.length} attendance(s) validated.`}
                            </p>
                          )}
                        </div>

                        {/* Refund declaration: paid users NOT admitted by the organizer */}
                        {validatedPassIds.length > 0 && (() => {
                          const notAdmitted = activePasses.filter(p => !validatedPassIds.includes(p.id));
                          if (notAdmitted.length === 0) return null;
                          return (
                            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                              <span className="text-[11px] font-bold text-white block">{isEs ? '¿A quién NO admitiste? (se reembolsa su depósito)' : 'Who did you NOT admit? (deposit refunded)'}</span>
                              {notAdmitted.map((p) => (
                                <label key={p.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={refundPassIds.includes(p.id)}
                                    onChange={() => toggleRefund(p.id)}
                                    className="accent-pink-500"
                                  />
                                  <span className="font-mono text-[10px] text-white/80">{p.code}</span>
                                  <span className="text-[10px] text-white/50 truncate">{p.userName}</span>
                                  <span className="ml-auto text-[10px] text-rose-300 font-bold shrink-0">${p.amount.toLocaleString()}</span>
                                </label>
                              ))}
                              <p className="text-[10px] text-white/40">
                                {isEs
                                  ? 'Sin marcar se consideran inasistencias: su depósito se libera a tu favor (regla aceptada antes de pagar).'
                                  : 'Unmarked ones count as no-shows: their deposit is released to you (rule accepted before paying).'}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Settlement preview */}
                        {settlementPreview && (
                          <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-[11px] space-y-1">
                            <div className="flex justify-between text-white/70">
                              <span>{isEs ? 'Asistieron' : 'Attended'}</span>
                              <span className="font-bold text-white">{settlementPreview.attendedCount}/{settlementPreview.paidCount}</span>
                            </div>
                            <div className="flex justify-between text-white/70">
                              <span>{isEs ? 'Bruto a liberar' : 'Gross to release'}</span>
                              <span className="font-bold text-white">${settlementPreview.gross.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-white/70">
                              <span>-{PLATFORM_COMMISSION_LABEL}</span>
                              <span className="font-bold text-white">-${settlementPreview.commission.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-white/70">
                              <span>-ISR</span>
                              <span className="font-bold text-white">-${settlementPreview.isrRetained.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-pink-300 font-bold">
                              <span>{isEs ? 'Neto para ti' : 'Your net'}</span>
                              <span>${settlementPreview.net.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-white/70">
                              <span>{isEs ? 'Reembolsos a asistentes' : 'Refunds to attendees'}</span>
                              <span className="font-bold text-rose-300">${settlementPreview.refundTotal.toLocaleString()}</span>
                            </div>
                            {settlementPreview.requiresReview && (
                              <p className="text-[10px] text-amber-300 flex items-start gap-1 pt-1">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                {isEs
                                  ? 'La asistencia es menor al 50% de los pases pagados: la liquidación pasará a revisión del administrador (antiestafa escalonada).'
                                  : 'Attendance is below 50% of paid passes: the payout will go to administrator review (anti staggered-scam).'}
                              </p>
                            )}
                          </div>
                        )}

                        {settlementPreview && (
                          <button
                            type="button"
                            onClick={() => void handleSettle()}
                            disabled={settleBusy}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {settleBusy
                              ? (isEs ? 'Registrando...' : 'Registering...')
                              : (isEs ? 'Registrar asistencia y liquidar' : 'Register attendance and settle')}
                          </button>
                        )}

                        {settleNote && (
                          <p className="text-[10px] text-white/60 bg-black/50 border border-white/10 rounded-xl p-2.5 leading-relaxed">{settleNote}</p>
                        )}
                      </>
                    )}

                    {/* Same-day location release */}
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-pink-400" />
                        {isEs ? 'Liberar ubicación (el mismo día, por seguridad)' : 'Release location (same day, for security)'}
                      </span>
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder={isEs ? 'Dirección exacta del evento' : 'Exact event address'}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void handleReleaseLocation()}
                        disabled={locationBusy || !locationInput.trim()}
                        className="w-full py-2 rounded-xl bg-pink-600/80 hover:bg-pink-500 text-white text-[11px] font-bold transition disabled:opacity-40"
                      >
                        {locationBusy
                          ? (isEs ? 'Enviando...' : 'Sending...')
                          : (isEs ? 'Enviar a asistentes con pase activo' : 'Send to active pass holders')}
                      </button>
                      <p className="text-[10px] text-white/40">
                        {isEs
                          ? 'La ubicación exacta solo se comparte el día del evento con quienes tienen pase. En la puerta solo se presenta el código VIP, no la ficha técnica.'
                          : 'The exact location is only shared on event day with pass holders. At the door only the VIP code is shown, not the technical sheet.'}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* SECTION 4: CARTERA VIRTUAL Y RETIROS */}
        {section === 'cartera' && (
          <div className="space-y-3">
            <div className="p-4 rounded-3xl bg-gradient-to-tr from-purple-900 via-pink-900/70 to-black border border-pink-500/40 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-pink-300 font-bold">AppSwinguer Pay</p>
                  <p className="text-2xl font-black text-white mt-0.5">${balance.toLocaleString()} <span className="text-[10px] text-white/60 font-bold">{currency}</span></p>
                </div>
                <Wallet className="w-8 h-8 text-pink-400/70" />
              </div>
              <p className="text-[10px] text-white/50 mt-1.5">
                {isEs
                  ? 'Los ingresos de eventos se acreditan aquí al liquidar cada evento (menos comisión de plataforma e ISR retenido). Retiros por transferencia en máximo 24 h.'
                  : 'Event earnings are credited here when each event is settled (minus platform commission and withheld ISR). Withdrawals by transfer within 24 h max.'}
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-white block">{isEs ? 'Solicitar retiro' : 'Request withdrawal'}</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={isEs ? 'Monto (máx. saldo disponible)' : 'Amount (max available balance)'}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                  {isEs ? 'Retirar' : 'Withdraw'}
                </button>
              </div>
              <p className="text-[10px] text-white/40">
                {application
                  ? `${isEs ? 'Cuenta' : 'Account'}: ${application.payoutBank} · CLABE ${application.payoutClabe} · ${isEs ? 'Titular' : 'Holder'}: ${application.payoutHolder}`
                  : (isEs ? 'Registra tu expediente con cuenta de retiro.' : 'Register your file with a withdrawal account.')}
              </p>
            </form>

            {sortedWithdrawals.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-white block">{isEs ? 'Mis retiros' : 'My withdrawals'}</span>
                {sortedWithdrawals.map((wd) => {
                  const overdue = wd.status === 'solicitado' && Date.now() > wd.slaDeadline;
                  return (
                    <div key={wd.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white">${wd.amount.toLocaleString()} → {wd.bank}</p>
                        <p className="text-[10px] text-white/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(wd.createdAt).toLocaleString()} · {isEs ? 'SLA máx. 24 h' : '24 h max SLA'}
                          {overdue && <span className="text-rose-400 font-bold"> · {isEs ? 'vencido' : 'overdue'}</span>}
                        </p>
                      </div>
                      <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (wd.status === 'transferido' ? 'bg-emerald-500/20 text-emerald-300' : wd.status === 'rechazado' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300')}>
                        {wd.status === 'transferido' ? (isEs ? 'TRANSFERIDO' : 'TRANSFERRED') : wd.status === 'rechazado' ? (isEs ? 'RECHAZADO' : 'REJECTED') : (isEs ? 'SOLICITADO' : 'REQUESTED')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white block">{isEs ? 'Movimientos' : 'Transactions'}</span>
              {sortedWallet.length === 0 ? (
                <p className="text-[11px] text-white/50">{isEs ? 'Sin movimientos aún. Los ingresos de tus eventos aparecerán aquí al liquidarse.' : 'No transactions yet. Earnings from your events will appear here once settled.'}</p>
              ) : sortedWallet.map((t) => (
                <div key={t.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/80 truncate">{t.note}</span>
                    <span className={'text-[11px] font-black shrink-0 ' + (t.net >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                      {t.net >= 0 ? '+' : '-'}${Math.abs(t.net).toLocaleString()}
                    </span>
                  </div>
                  {(t.kind === 'ingreso_evento' || t.kind === 'donacion') && (
                    <p className="text-[10px] text-white/40">
                      {isEs ? 'Bruto' : 'Gross'} ${t.gross.toLocaleString()} · -30% ${t.commission.toLocaleString()} · -ISR ${t.isrRetained.toLocaleString()} · {isEs ? 'neto' : 'net'} ${t.net.toLocaleString()}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30">{new Date(t.ts).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: SOPORTE - ATENCIÓN ABIERTA PARA AGENCIAS, PROMOTORAS, ASOCIADOS Y CREADORAS */}
        {section === 'soporte' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-200 leading-relaxed">
              {isEs
                ? 'Atención con apertura total para agencias, promotoras, asociados de eventos y creadoras. Recibimos solicitudes, quejas y aclaraciones: buscamos que quedes satisfecho más que ganar cualquier controversia; nadie debe terminar afectado. El administrador responde por este mismo canal y se te notifica en la app.'
                : 'Fully open support for agencies, promoters, event associates and creators. We receive requests, complaints and clarifications: we seek your satisfaction over winning any controversy; nobody should end up harmed. The administrator replies on this same channel and you get an in-app notification.'}
            </div>

            <form onSubmit={handleTicketSubmit} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div>
                <span className="text-[10px] text-white/60 block mb-1">{isEs ? 'Quiero soporte como' : 'I need support as'}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['agencia', 'asociado', 'organizador', 'creadora'] as SupportTicket['requester'][]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTicketRole(r)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition ${
                        ticketRole === r ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/60 border-white/15 text-white/60 hover:text-white'
                      }`}
                    >
                      {ticketRoleMeta(r)}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder={isEs ? 'Asunto (ej. Duda sobre liquidación del 14 nov)' : 'Subject (e.g. Settlement question for Nov 14)'}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
              />
              <textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                rows={4}
                placeholder={isEs ? 'Describe tu solicitud, queja o aclaración con todo el detalle posible.' : 'Describe your request, complaint or clarification in as much detail as possible.'}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-[11px]"
              />
              <button
                type="submit"
                disabled={ticketBusy}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold disabled:opacity-50"
              >
                {ticketBusy ? (isEs ? 'Enviando...' : 'Sending...') : (isEs ? 'Enviar solicitud' : 'Submit request')}
              </button>
            </form>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white block">{isEs ? 'Mis solicitudes' : 'My requests'}</span>
              {myTickets.length === 0 ? (
                <p className="text-[11px] text-white/50">{isEs ? 'Sin solicitudes registradas.' : 'No requests registered.'}</p>
              ) : myTickets.map((tk) => (
                <div key={tk.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white truncate">{tk.subject}</span>
                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (tk.status === 'abierto' ? 'bg-amber-500/20 text-amber-300' : tk.status === 'respondido' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50')}>
                      {tk.status === 'abierto' ? (isEs ? 'ABIERTO' : 'OPEN') : tk.status === 'respondido' ? (isEs ? 'RESPONDIDO' : 'ANSWERED') : (isEs ? 'CERRADO' : 'CLOSED')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60">{tk.message}</p>
                  {tk.reply && (
                    <p className="text-[10px] text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                      <Send className="w-3 h-3 inline mr-1 -mt-0.5" />
                      {tk.reply}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30">{ticketRoleMeta(tk.requester)} · {new Date(tk.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
