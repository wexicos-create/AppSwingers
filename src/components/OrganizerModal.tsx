import React, { useState } from 'react';
import { X, FileCheck, Calendar, Wallet, Clock } from 'lucide-react';
import { showToast } from './Toast';
import { ClubEvent, AppRegion } from '../types';
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
} from '../organizers';

// Client-side compression so document photos fit inside a Firestore document (~1MB limit).
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('reader'));
    reader.readAsDataURL(file);
  });

interface OrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  region: AppRegion;
  userEmail: string;
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
}

export function OrganizerModal({
  isOpen,
  onClose,
  isEs,
  region,
  userEmail,
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
}: OrganizerModalProps) {
  const [section, setSection] = useState<'registro' | 'publicar' | 'cartera'>('registro');
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

  if (!isOpen) return null;

  const roleMeta = (r: OrganizerRole): { label: string; note: string } => {
    switch (r) {
      case 'agencia':
        return { label: isEs ? 'Agencia' : 'Agency', note: isEs ? 'Organizador recurrente profesional' : 'Professional recurring host' };
      case 'asociado':
        return { label: isEs ? 'Asociado' : 'Associate', note: isEs ? 'Organizador recurrente de eventos' : 'Recurring event host' };
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
        <div className="flex p-1 rounded-xl bg-black/60 border border-white/10 gap-1 text-xs">
          <button
            onClick={() => setSection('registro')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'registro' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            {isEs ? 'Mi registro' : 'My file'}
          </button>
          <button
            onClick={() => setSection('publicar')}
            className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
              section === 'publicar' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {isEs ? 'Publicar evento' : 'Publish event'}
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

        {/* SECTION 3: CARTERA VIRTUAL Y RETIROS */}
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
                  ? 'Reparto 70/30 tras comisión de plataforma; ISR retenido por la plataforma. Retiros por transferencia en máximo 24 h.'
                  : '70/30 split after platform commission; ISR withheld by the platform. Withdrawals by transfer within 24 h max.'}
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
                <p className="text-[11px] text-white/50">{isEs ? 'Sin movimientos aún. Los ingresos de tus eventos aparecerán aquí.' : 'No transactions yet. Earnings from your events will appear here.'}</p>
              ) : sortedWallet.map((t) => (
                <div key={t.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/80 truncate">{t.note}</span>
                    <span className={'text-[11px] font-black shrink-0 ' + (t.net >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                      {t.net >= 0 ? '+' : '-'}${Math.abs(t.net).toLocaleString()}
                    </span>
                  </div>
                  {t.kind === 'ingreso_evento' && (
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

      </div>
    </div>
  );
}
