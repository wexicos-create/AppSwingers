import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Key, 
  Lock, 
  Check, 
  Mail, 
  ShieldCheck, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Bell, 
  Smartphone, 
  Trash2, 
  Send, 
  CreditCard, 
  FileCheck, 
  Shield, 
  Zap,
  CheckCircle2,
  Landmark,
  Briefcase,
  TicketCheck,
  Star,
  LifeBuoy
} from 'lucide-react';
import { showToast } from './Toast';
import {
  loadLocalSpeiOrders,
  upsertLocalSpeiOrder,
  fetchAllRemoteSpeiOrders,
  appendRemoteTimelineAndStatus,
  runBotValidation,
  getSpeiConfig,
  saveSpeiConfig,
} from '../spei';
import {
  OrganizerApplication,
  OrganizerRole,
  WalletTransaction,
  WithdrawalRequest,
  fetchAllRemoteOrganizerApplications,
  fetchAllRemoteWithdrawals,
  fetchAllRemoteWalletTransactions,
  saveRemoteOrganizerApplication,
  updateRemoteWithdrawal,
  loadOrganizerApplication,
  saveOrganizerApplication,
  loadWithdrawals,
  saveWithdrawals,
  getEventPublishFee,
  saveEventPublishFee,
  organizerBenefitState,
  PLATFORM_COMMISSION_PCT,
  ISR_RETENTION_PCT,
  fetchAllRemoteIneRecords,
  issueIdentityVerdict,
  ineRecordVerdict,
  purgeExpiredRetainedRecords,
  INE_BAN_RETENTION_MS,
  IneRecord,
  IneRecordSource,
} from '../organizers';
import { activateStatePass, stateNameByCode, fetchAllStatePasses, getStatePassPrice } from '../premium';
import {
  fetchAllPayouts,
  updateRemotePayout,
  fetchAllTickets,
  updateRemoteTicket,
  fetchAllDonations,
  updateRemoteDonation,
  fetchAllEventRatings,
  fetchAllEventPasses,
  fetchEventPassesForEvent,
  updateRemoteEventPass,
  generateVipAccessCode,
  saveRemoteEventPass,
  reputationByOrganizer,
  RATING_ALERT_THRESHOLD,
  purgeExpiredEventPasses,
  pushRemoteNotification,
} from '../eventflow';
import { saveRemoteWalletTransaction, computeEarningSplit } from '../organizers';
import { SpeiOrder, SpeiOrderStatus, StatePass, EventAccessPass, EventPayoutRequest, EventRating, DonationRecord, SupportTicket } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEs: boolean;
  // Correo con sesión iniciada de una cuenta administradora autorizada
  // (jocervantesa@gmail.com / betylanz0613@gmail.com): acceso directo al panel.
  // Cualquier otra cuenta ve el panel bloqueado de forma exclusiva.
  signedInAdminEmail?: string | null;
}

export function AdminModal({ isOpen, onClose, isEs, signedInAdminEmail = null }: AdminModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Security: no default credentials exist in source code. The owner configures them at first use.
  const [storedEmail, setStoredEmail] = useState(localStorage.getItem('admin_email') || '');
  const [storedPass, setStoredPass] = useState(localStorage.getItem('admin_pass') || '');
  const [storedPin, setStoredPin] = useState(localStorage.getItem('admin_pin') || '');
  const isAdminConfigured = Boolean(storedEmail && storedPass && storedPin);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    try { return Number(sessionStorage.getItem('admin_lockout_until') || 0); } catch { return 0; }
  });
  const [isChangingCreds, setIsChangingCreds] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [newPin, setNewPin] = useState('');

  // Cuenta administradora autorizada con sesión iniciada: entra directo al panel.
  useEffect(() => {
    if (isOpen && signedInAdminEmail) {
      setIsLoggedIn(true);
      setError(null);
    }
  }, [isOpen, signedInAdminEmail]);

  // Active admin tab: 'monetizacion' | 'push' | 'seguridad' | 'spei' | 'eventos' | 'organizadores'
  const [activeAdminTab, setActiveAdminTab] = useState<'monetizacion' | 'push' | 'seguridad' | 'spei' | 'eventos' | 'organizadores'>('monetizacion');
  const [broadcastTitle, setBroadcastTitle] = useState(
    isEs ? '🔥 Nuevo evento VIP Swinger en San Luis Potosí' : '🔥 New VIP Lifestyle event announced'
  );
  const [broadcastBody, setBroadcastBody] = useState(
    isEs ? 'Cupo limitado para parejas verificadas. Revisa la sección de eventos.' : 'Limited capacity for verified couples. Check events tab.'
  );
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // SPEI payments management (bot validation + manual approve/reject)
  const initialSpeiCfg = getSpeiConfig();
  const [speiBank, setSpeiBank] = useState(initialSpeiCfg.bank);
  const [speiClabe, setSpeiClabe] = useState(initialSpeiCfg.clabe);
  const [speiBeneficiary, setSpeiBeneficiary] = useState(initialSpeiCfg.beneficiary);
  const [speiOrders, setSpeiOrders] = useState<SpeiOrder[]>([]);

  // Organizers & wallet management (agency/associate/organizer files + withdrawal queue)
  const [orgApplications, setOrgApplications] = useState<OrganizerApplication[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [adminWallet, setAdminWallet] = useState<WalletTransaction[]>([]);
  const [adminIneRecords, setAdminIneRecords] = useState<IneRecord[]>([]);
  // Premium state passes + identity verdict actions
  const [adminStatePasses, setAdminStatePasses] = useState<StatePass[]>([]);
  const [identityBusyId, setIdentityBusyId] = useState<string | null>(null);
  const [purgeNote, setPurgeNote] = useState<string | null>(null);
  const [eventFeeMx, setEventFeeMx] = useState(String(getEventPublishFee('MX').base));
  const [eventFeeUs, setEventFeeUs] = useState(String(getEventPublishFee('US').base));

  // Event flow: VIP passes, settlement payout review, ratings, donations, support
  const [adminPayouts, setAdminPayouts] = useState<EventPayoutRequest[]>([]);
  const [adminEventPasses, setAdminEventPasses] = useState<EventAccessPass[]>([]);
  const [adminRatings, setAdminRatings] = useState<EventRating[]>([]);
  const [adminDonations, setAdminDonations] = useState<DonationRecord[]>([]);
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null);
  const [payoutNotes, setPayoutNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;
    let cancelled = false;
    const loadOrders = async () => {
      const remote = await fetchAllRemoteSpeiOrders();
      if (cancelled) return;
      const local = loadLocalSpeiOrders();
      const merged = [...remote];
      for (const l of local) {
        if (!merged.some(r => r.id === l.id)) merged.push(l);
      }
      merged.sort((a, b) => b.createdAt - a.createdAt);
      setSpeiOrders(merged);
    };
    void loadOrders();
    const timer = window.setInterval(() => { void loadOrders(); }, 20000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isOpen, isLoggedIn]);

  // Organizer files, wallet summary and withdrawal queue (cross-device via Firestore)
  useEffect(() => {
    if (!isOpen || !isLoggedIn) return;
    let cancelled = false;
    const loadOrganizerData = async () => {
      const [remoteApps, remoteWithdrawals, remoteWallet, remoteIne, remotePayouts, remoteTickets, remoteRatings, remoteDonations, remotePasses] = await Promise.all([
        fetchAllRemoteOrganizerApplications(),
        fetchAllRemoteWithdrawals(),
        fetchAllRemoteWalletTransactions(),
        fetchAllRemoteIneRecords(),
        fetchAllPayouts(),
        fetchAllTickets(),
        fetchAllEventRatings(),
        fetchAllDonations(),
        fetchAllEventPasses(),
      ]);
      if (cancelled) return;
      const localApp = loadOrganizerApplication();
      const apps = [...remoteApps];
      if (localApp && !apps.some(a => a.id === localApp.id)) apps.unshift(localApp);
      apps.sort((a, b) => b.createdAt - a.createdAt);
      setOrgApplications(apps);
      const localWds = loadWithdrawals();
      const wds = [...remoteWithdrawals];
      for (const l of localWds) {
        if (!wds.some(w => w.id === l.id)) wds.push(l);
      }
      wds.sort((a, b) => b.createdAt - a.createdAt);
      setAdminWithdrawals(wds);
      setAdminWallet([...remoteWallet].sort((a, b) => b.ts - a.ts));
      setAdminIneRecords([...remoteIne].sort((a, b) => b.createdAt - a.createdAt));
      // Lazy legal purge: credentials of banned users whose one-year retention
      // expired are permanently deleted, plus the active state-pass overview.
      const purged = await purgeExpiredRetainedRecords();
      if (purged > 0) {
        const remaining = await fetchAllRemoteIneRecords();
        setAdminIneRecords([...remaining].sort((a, b) => b.createdAt - a.createdAt));
        setPurgeNote(isEs ? `${purged} expediente(s) de credenciales retenidas vencidas fueron eliminados permanentemente.` : `${purged} expired retained credential file(s) permanently deleted.`);
      }
      // Monthly VIP pass purge (at least once a month, avoids code repetition).
      await purgeExpiredEventPasses();
      setAdminStatePasses(await fetchAllStatePasses());
      setAdminPayouts(remotePayouts);
      setAdminTickets(remoteTickets);
      setAdminRatings(remoteRatings);
      setAdminDonations(remoteDonations);
      setAdminEventPasses(remotePasses);
    };
    void loadOrganizerData();
    const timer = window.setInterval(() => { void loadOrganizerData(); }, 20000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  const registerFailedAttempt = () => {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= 5) {
      const until = Date.now() + 60000;
      setLockoutUntil(until);
      try { sessionStorage.setItem('admin_lockout_until', String(until)); } catch { /* ignore */ }
      setFailedAttempts(0);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const now = Date.now();
    if (lockoutUntil > now) {
      const secs = Math.ceil((lockoutUntil - now) / 1000);
      setError(isEs ? `Demasiados intentos fallidos. Intenta de nuevo en ${secs} segundos.` : `Too many failed attempts. Try again in ${secs} seconds.`);
      return;
    }
    if (email.trim().toLowerCase() !== storedEmail || !password || password !== storedPass || !pin || pin !== storedPin) {
      registerFailedAttempt();
      setError(isEs ? 'Credenciales de administrador no válidas.' : 'Invalid admin credentials.');
      return;
    }
    setFailedAttempts(0);
    setIsLoggedIn(true);
  };

  const handleFirstSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setError(isEs ? 'Correo de administrador no válido.' : 'Invalid admin email.');
      return;
    }
    if (password.length < 8) {
      setError(isEs ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters long.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError(isEs ? 'El NIP debe ser exactamente 6 dígitos.' : 'PIN must be exactly 6 digits.');
      return;
    }
    try {
      localStorage.setItem('admin_email', em);
      localStorage.setItem('admin_pass', password);
      localStorage.setItem('admin_pin', pin);
    } catch {
      setError(isEs ? 'No se pudieron guardar las credenciales en este dispositivo.' : 'Could not store credentials on this device.');
      return;
    }
    setStoredEmail(em);
    setStoredPass(password);
    setStoredPin(pin);
    setIsLoggedIn(true);
    showToast(isEs ? 'Panel administrativo configurado con éxito. Guarda tus credenciales en un lugar seguro.' : 'Admin panel configured successfully. Store your credentials safely.');
  };

  const handleUpdateCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass && newPass.length < 8) {
      showToast(isEs ? 'La nueva contraseña debe tener al menos 8 caracteres.' : 'New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPin && !/^\d{6}$/.test(newPin)) {
      showToast(isEs ? 'El nuevo NIP debe ser exactamente 6 dígitos.' : 'New PIN must be exactly 6 digits.', 'error');
      return;
    }
    if (newPass) {
      localStorage.setItem('admin_pass', newPass);
      setStoredPass(newPass);
    }
    if (newPin) {
      localStorage.setItem('admin_pin', newPin);
      setStoredPin(newPin);
    }
    setIsChangingCreds(false);
    showToast(isEs ? 'Credenciales de administrador actualizadas con éxito.' : 'Admin credentials successfully updated.');
  };

  const handleClearCookiesAndStorage = () => {
    if (window.confirm(isEs ? '¿Purgar cookies, caché y restablecer datos locales del APK?' : 'Purge all cookies, cache, and local APK storage?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        showToast(isEs ? 'Cookies y almacenamiento local purgados al 100%. El APK está limpio en 0.' : 'Cookies & local storage purged 100%. APK is pristine at 0.');
        window.setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.warn('Wipe cookies note:', err);
      }
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 4000);
  };

  // ---------- SPEI order decisions ----------
  const persistSpeiDecision = (order: SpeiOrder, status: SpeiOrderStatus, note: string) => {
    const updated: SpeiOrder = { ...order, status, timeline: [...order.timeline, { ts: Date.now(), text: note }] };
    setSpeiOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    upsertLocalSpeiOrder(updated);
    void appendRemoteTimelineAndStatus(order.id, status, note);
    showToast(isEs ? 'Orden actualizada. El cambio se reflejará automáticamente en la cuenta del usuario.' : 'Order updated. The change will reflect automatically on the user account.');
  };

  const handleSpeiBotValidate = (order: SpeiOrder) => {
    const result = runBotValidation(order);
    if (result.expired) {
      persistSpeiDecision(order, 'expirado', 'Validación automática: la orden expiró sin transferencia en la ventana de pago.');
      return;
    }
    if (result.passed) {
      persistSpeiDecision(order, 'verificado', 'Validación automática completada: referencia, concepto y monto verificados. Esperando decisión del administrador.');
    } else {
      showToast(isEs ? 'La orden presenta inconsistencias. Revísala manualmente antes de decidir.' : 'The order has inconsistencies. Review it manually before deciding.', 'error');
    }
  };

  const handleSpeiApprove = (order: SpeiOrder) => {
    persistSpeiDecision(order, 'aprobado', 'Pago aprobado por el administrador. El beneficio contratado se activa automáticamente en la cuenta del usuario.');
    // Premium state-search pass: approving the SPEI order activates the
    // 24-hour pass on state_passes/{uid} (admin-only write per rules).
    if (order.kind === 'pase_estado' && order.userUid) {
      const now = Date.now();
      void activateStatePass({
        userUid: order.userUid,
        stateCode: order.itemRef,
        stateName: stateNameByCode(order.itemRef),
        region: (order.amount === getStatePassPrice('MX').total) ? 'MX' : 'US',
        orderId: order.id,
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
      }).then(ok => {
        showToast(ok
          ? (isEs ? `Pase de 24 h activado para ${stateNameByCode(order.itemRef)}.` : `24-hour pass activated for ${stateNameByCode(order.itemRef)}.`)
          : (isEs ? 'No se pudo escribir el pase en Firestore. Verifica las reglas.' : 'Could not write the pass to Firestore. Check the rules.'),
          ok ? 'success' : 'error');
      });
      return;
    }
    // Event deposit: approving the order issues the VIP access pass
    // (three groups of four digits, unique against all retained passes).
    if (order.kind === 'evento' && order.userUid) {
      void (async () => {
        const now = Date.now();
        let meta: Record<string, unknown> = {};
        try { meta = order.meta ? JSON.parse(order.meta) : {}; } catch { meta = {}; }
        const existingCodes = (await fetchAllEventPasses()).map(p => p.code);
        const code = generateVipAccessCode(existingCodes);
        const pass: EventAccessPass = {
          id: 'pass_' + order.id,
          code,
          eventId: String(meta.eventId || order.itemRef),
          eventTitle: String(meta.eventTitle || order.label),
          eventDate: String(meta.eventDate || ''),
          eventTime: String(meta.eventTime || ''),
          eventZone: String(meta.eventZone || ''),
          organizerUid: (meta.organizerUid as string) || null,
          organizerName: String(meta.organizerName || ''),
          userUid: order.userUid,
          userName: order.userName,
          tierId: (meta.tierId as string) || null,
          tierLabel: String(meta.tierLabel || ''),
          amount: order.amount,
          orderId: order.id,
          orderRef: order.reference,
          createdAt: now,
          status: 'activo',
          usedAt: null,
          refundedAt: null,
        };
        const ok = await saveRemoteEventPass(pass);
        if (ok) {
          await pushRemoteNotification({
            userUid: order.userUid,
            kind: 'evento',
            title: isEs ? 'Pase VIP emitido' : 'VIP pass issued',
            body: isEs
              ? `Tu depósito del evento "${pass.eventTitle}" fue confirmado. Código de acceso: ${pass.code}. La ubicación exacta se libera el mismo día del evento; descarga tu ficha técnica desde la sección de eventos (ID de orden: ${pass.orderRef}).`
              : `Your deposit for "${pass.eventTitle}" was confirmed. Access code: ${pass.code}. The exact location is released on event day; download your technical sheet from the events tab (order ID: ${pass.orderRef}).`,
          });
        }
        showToast(ok
          ? (isEs ? `Pase VIP emitido: ${code}` : `VIP pass issued: ${code}`)
          : (isEs ? 'No se pudo escribir el pase en Firestore. Verifica las reglas.' : 'Could not write the pass to Firestore. Check the rules.'),
          ok ? 'success' : 'error');
      })();
      return;
    }
    // Donation: approving the order credits the creator's virtual card with
    // the donor profile name (so she knows who donated) and notifies both.
    if (order.kind === 'donacion' && order.userUid) {
      void (async () => {
        const now = Date.now();
        let meta: Record<string, unknown> = {};
        try { meta = order.meta ? JSON.parse(order.meta) : {}; } catch { meta = {}; }
        const donationId = 'don_' + order.id;
        const base = Number(meta.amount) || 0;
        const split = computeEarningSplit(base);
        await updateRemoteDonation(donationId, { status: 'aprobada', decidedAt: now });
        const tx: WalletTransaction = {
          id: 'wtx_don_' + order.id,
          userUid: null,
          kind: 'donacion',
          creatorHandle: String(meta.creatorHandle || order.itemRef),
          gross: base,
          commission: split.commission,
          isrRetained: split.isrRetained,
          net: split.net,
          note: `${isEs ? 'Donación de' : 'Donation from'} ${String(meta.donorProfileName || meta.donorName || order.userName)}${meta.message ? ' · "' + String(meta.message) + '"' : ''}`,
          ts: now,
        };
        await saveRemoteWalletTransaction(tx);
        await pushRemoteNotification({
          userUid: order.userUid,
          kind: 'donacion',
          title: isEs ? 'Donación acreditada' : 'Donation credited',
          body: isEs
            ? `Tu donación de ${order.amount.toLocaleString()} (incluye IVA) a ${String(meta.creatorName || '')} fue confirmada. Ella verá que fuiste tú quien la envió.`
            : `Your ${order.amount.toLocaleString()} donation to ${String(meta.creatorName || '')} was confirmed. She will see it came from you.`,
        });
        showToast(isEs ? 'Donación acreditada a la tarjeta virtual de la creadora.' : 'Donation credited to the creator virtual card.', 'success');
      })();
      return;
    }
  };

  const handleSpeiReject = (order: SpeiOrder) => {
    persistSpeiDecision(order, 'rechazado', 'Pago rechazado por el administrador. El usuario permanece en Plan Gratis sin el beneficio solicitado.');
  };

  // ---------- Identity verdicts: the admin gives the second validation ----------
  const handleIdentityVerdict = async (rec: IneRecord, verdict: 'aprobada' | 'rechazada' | 'baneada') => {
    setIdentityBusyId(rec.id);
    const ok = await issueIdentityVerdict({ record: rec, verdict, isEs });
    if (ok) {
      const refreshed = await fetchAllRemoteIneRecords();
      setAdminIneRecords([...refreshed].sort((a, b) => b.createdAt - a.createdAt));
      showToast(
        verdict === 'aprobada'
          ? (isEs ? 'Identidad aprobada: el usuario recibió la notificación de verificación.' : 'Identity approved: the user received the verification notice.')
          : verdict === 'rechazada'
            ? (isEs ? 'Rechazo emitido: se notificó al dueño que no pudimos validar quién dice ser; su cuenta se eliminará al ingresar.' : 'Rejection issued: the owner was notified we could not validate who they claim to be; the account is deleted on login.')
            : (isEs ? 'Usuario baneado: credenciales retenidas un año por cualquier tema legal y luego purgadas.' : 'User banned: credentials retained for one year for any legal matter, then purged.'),
        verdict === 'aprobada' ? 'success' : 'info',
      );
    } else {
      showToast(isEs ? 'No se pudo publicar el veredicto. Verifica la conexión y las reglas de Firestore.' : 'Could not publish the verdict. Check the connection and Firestore rules.', 'error');
    }
    setIdentityBusyId(null);
  };

  const handleManualPurge = async () => {
    const purged = await purgeExpiredRetainedRecords();
    const purgedPasses = await purgeExpiredEventPasses();
    if (purged > 0 || purgedPasses > 0) {
      const [refreshed, refreshedPasses] = await Promise.all([
        fetchAllRemoteIneRecords(),
        fetchAllEventPasses(),
      ]);
      setAdminIneRecords([...refreshed].sort((a, b) => b.createdAt - a.createdAt));
      setAdminEventPasses(refreshedPasses);
    }
    setPurgeNote(purged > 0 || purgedPasses > 0
      ? (isEs ? `${purged} expediente(s) retenido(s) y ${purgedPasses} pase(s) VIP vencido(s) eliminados permanentemente.` : `${purged} expired retained file(s) and ${purgedPasses} expired VIP pass(es) permanently deleted.`)
      : (isEs ? 'No hay credenciales retenidas ni pases VIP con retención vencida.' : 'No retained credentials or passes with expired retention.'));
  };

  // ---------- Event settlement review: release, or reject with full refunds ----------
  const refreshPayouts = async () => {
    setAdminPayouts(await fetchAllPayouts());
  };

  const handlePayoutRelease = async (payout: EventPayoutRequest) => {
    setPayoutBusyId(payout.id);
    const now = Date.now();
    const ok = await updateRemotePayout(payout.id, { status: 'liberado', decidedAt: now, note: payoutNotes[payout.id] || payout.note });
    if (ok) {
      const tx: WalletTransaction = {
        id: 'wtx_pay_' + payout.id,
        userUid: payout.organizerUid,
        kind: 'ingreso_evento',
        eventId: payout.eventId,
        gross: payout.gross,
        commission: payout.commission,
        isrRetained: payout.isrRetained,
        net: payout.net,
        note: `${isEs ? 'Liquidación evento' : 'Event settlement'}: ${payout.eventTitle} (${payout.attendedCount} ${isEs ? 'asistente(s)' : 'attendee(s)'}, ${payout.noShowCount} no-show)`,
        ts: now,
      };
      await saveRemoteWalletTransaction(tx);
      if (payout.organizerUid) {
        await pushRemoteNotification({
          userUid: payout.organizerUid,
          kind: 'evento',
          title: isEs ? 'Liquidación liberada' : 'Payout released',
          body: isEs
            ? `El administrador liberó la liquidación de "${payout.eventTitle}": ${payout.net.toLocaleString()} netos acreditados a tu cartera.`
            : `The administrator released the payout for "${payout.eventTitle}": ${payout.net.toLocaleString()} net credited to your wallet.`,
        });
      }
      showToast(isEs ? `Liquidación liberada: ${payout.net.toLocaleString()} netos acreditados al organizador.` : `Payout released: ${payout.net.toLocaleString()} net credited to the organizer.`, 'success');
    } else {
      showToast(isEs ? 'No se pudo liberar la liquidación.' : 'Could not release the payout.', 'error');
    }
    await refreshPayouts();
    setPayoutBusyId(null);
  };

  const handlePayoutReject = async (payout: EventPayoutRequest) => {
    setPayoutBusyId(payout.id);
    const now = Date.now();
    const ok = await updateRemotePayout(payout.id, { status: 'rechazado', decidedAt: now, note: payoutNotes[payout.id] || payout.note });
    if (ok) {
      // Verified phantom event / verified complaint: every paid pass of the
      // event is refunded, no matter its previous status.
      const passes = await fetchEventPassesForEvent(payout.eventId);
      let refunded = 0;
      for (const p of passes) {
        if (p.status === 'activo' || p.status === 'usado') {
          const okPass = await updateRemoteEventPass(p.id, { status: 'reembolsado', refundedAt: now });
          if (okPass) {
            refunded++;
            if (p.userUid) {
              await pushRemoteNotification({
                userUid: p.userUid,
                kind: 'evento',
                title: isEs ? 'Reembolso total de tu depósito' : 'Full refund of your deposit',
                body: isEs
                  ? `Tras revisión, se reembolsará tu depósito de ${p.amount.toLocaleString()} del evento "${p.eventTitle}". Lamentamos la experiencia.`
                  : `After review, your ${p.amount.toLocaleString()} deposit for "${p.eventTitle}" will be refunded. We apologize for the experience.`,
              });
            }
          }
        }
      }
      showToast(isEs
        ? `Liquidación rechazada: ${refunded} depósito(s) reembolsado(s) a los asistentes.`
        : `Payout rejected: ${refunded} deposit(s) refunded to attendees.`, 'info');
    } else {
      showToast(isEs ? 'No se pudo rechazar la liquidación.' : 'Could not reject the payout.', 'error');
    }
    await refreshPayouts();
    setPayoutBusyId(null);
  };

  // ---------- Support tickets: reply (satisfaction first) and close ----------
  const handleTicketReply = async (ticket: SupportTicket) => {
    const reply = (ticketReplies[ticket.id] || '').trim();
    if (!reply) {
      showToast(isEs ? 'Escribe una respuesta antes de enviar.' : 'Write a reply before sending.', 'error');
      return;
    }
    const now = Date.now();
    const ok = await updateRemoteTicket(ticket.id, { status: 'respondido', reply, repliedAt: now });
    if (ok) {
      if (ticket.userUid) {
        await pushRemoteNotification({
          userUid: ticket.userUid,
          kind: 'soporte',
          title: isEs ? 'Respuesta de soporte AppSwinguer' : 'AppSwinguer support reply',
          body: reply,
        });
      }
      setAdminTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'respondido', reply, repliedAt: now } : t));
      showToast(isEs ? 'Respuesta enviada: el usuario recibió la notificación.' : 'Reply sent: the user received the notification.', 'success');
    } else {
      showToast(isEs ? 'No se pudo enviar la respuesta.' : 'Could not send the reply.', 'error');
    }
  };

  const handleTicketClose = async (ticket: SupportTicket) => {
    const ok = await updateRemoteTicket(ticket.id, { status: 'cerrado' });
    if (ok) {
      setAdminTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'cerrado' } : t));
      showToast(isEs ? 'Solicitud cerrada.' : 'Request closed.', 'info');
    }
  };

  const handleSaveSpeiConfig = () => {
    const digits = speiClabe.replace(/[^0-9]/g, '');
    if (digits.length !== 18) {
      showToast(isEs ? 'La CLABE debe tener exactamente 18 dígitos.' : 'CLABE must be exactly 18 digits.', 'error');
      return;
    }
    if (!speiBeneficiary.trim()) {
      showToast(isEs ? 'El beneficiario es obligatorio.' : 'Beneficiary is required.', 'error');
      return;
    }
    saveSpeiConfig({ bank: speiBank.trim() || 'BBVA', clabe: digits, beneficiary: speiBeneficiary.trim() });
    showToast(isEs ? 'Cuenta receptora SPEI actualizada para todas las órdenes nuevas.' : 'SPEI receiving account updated for all new orders.');
  };

  // ---------- Organizer files, publishing fees and withdrawal queue ----------
  const persistApplicationDecision = (app: OrganizerApplication, status: 'aprobada' | 'rechazada', note: string) => {
    const updated: OrganizerApplication = { ...app, status, approvedAt: status === 'aprobada' ? Date.now() : null };
    setOrgApplications(prev => prev.map(a => a.id === app.id ? updated : a));
    void saveRemoteOrganizerApplication(updated);
    // Keep the local copy in sync when the organizer uses this same device.
    const localApp = loadOrganizerApplication();
    if (localApp && localApp.id === app.id) saveOrganizerApplication(updated);
    showToast(note);
  };

  const handleApproveApplication = (app: OrganizerApplication) => {
    persistApplicationDecision(
      app,
      'aprobada',
      isEs ? 'Expediente aprobado. El organizador ya puede publicar eventos y recibir ingresos en su cartera.' : 'File approved. The organizer can now publish events and receive wallet earnings.'
    );
  };

  const handleRejectApplication = (app: OrganizerApplication) => {
    persistApplicationDecision(
      app,
      'rechazada',
      isEs ? 'Expediente rechazado. El organizador conserva el Plan Gratis sin beneficios de publicación.' : 'File rejected. The organizer keeps the Free Plan without publishing benefits.'
    );
  };

  const handleRenewOrganizerBenefit = (app: OrganizerApplication) => {
    persistApplicationDecision(
      app,
      'aprobada',
      isEs ? 'Beneficio del organizador ocasional renovado por 30 días.' : 'Occasional organizer benefit renewed for 30 days.'
    );
  };

  const persistWithdrawalDecision = (wd: WithdrawalRequest, status: 'transferido' | 'rechazado', note: string) => {
    const updated: WithdrawalRequest = { ...wd, status, paidAt: status === 'transferido' ? Date.now() : null };
    setAdminWithdrawals(prev => prev.map(w => w.id === wd.id ? updated : w));
    void updateRemoteWithdrawal(updated);
    const localWds = loadWithdrawals();
    if (localWds.some(w => w.id === wd.id)) saveWithdrawals(localWds.map(w => w.id === wd.id ? updated : w));
    showToast(note);
  };

  const handleWithdrawalPaid = (wd: WithdrawalRequest) => {
    persistWithdrawalDecision(
      wd,
      'transferido',
      isEs ? 'Retiro marcado como transferido dentro del SLA de 24 horas.' : 'Withdrawal marked as transferred within the 24-hour SLA.'
    );
  };

  const handleWithdrawalReject = (wd: WithdrawalRequest) => {
    persistWithdrawalDecision(
      wd,
      'rechazado',
      isEs ? 'Retiro rechazado: el monto se devuelve a la cartera del organizador.' : 'Withdrawal rejected: the amount returns to the organizer wallet.'
    );
  };

  const handleSaveEventFee = () => {
    const mx = Number(eventFeeMx);
    const us = Number(eventFeeUs);
    if (!mx || mx <= 0 || !us || us <= 0) {
      showToast(isEs ? 'Las tarifas deben ser mayores a cero.' : 'Fees must be greater than zero.', 'error');
      return;
    }
    saveEventPublishFee('MX', Math.round(mx * 100) / 100);
    saveEventPublishFee('US', Math.round(us * 100) / 100);
    showToast(isEs ? 'Tarifa de publicación actualizada. El IVA de 16% se calcula automáticamente.' : 'Publishing fee updated. The 16% VAT is calculated automatically.');
  };

  const orgRoleMeta = (role: OrganizerRole): { label: string; className: string } => {
    switch (role) {
      case 'agencia':
        return { label: isEs ? 'AGENCIA' : 'AGENCY', className: 'text-purple-300' };
      case 'asociado':
        return { label: isEs ? 'ASOCIADO' : 'ASSOCIATE', className: 'text-sky-300' };
      default:
        return { label: isEs ? 'ORGANIZADOR' : 'ORGANIZER', className: 'text-amber-300' };
    }
  };

  const ineSourceMeta = (source: IneRecordSource): { label: string; className: string } => {
    switch (source) {
      case 'organizador':
        return { label: 'ORGANIZADOR', className: 'text-purple-300' };
      case 'registro':
        return { label: 'REGISTRO', className: 'text-amber-300' };
      default:
        return { label: 'COLABORACIÓN', className: 'text-sky-300' };
    }
  };

  const appStatusMeta = (status: OrganizerApplication['status']): { label: string; className: string } => {
    switch (status) {
      case 'aprobada':
        return { label: isEs ? 'APROBADO' : 'APPROVED', className: 'bg-emerald-500/20 text-emerald-300' };
      case 'rechazada':
        return { label: isEs ? 'RECHAZADO' : 'REJECTED', className: 'bg-rose-500/20 text-rose-300' };
      default:
        return { label: isEs ? 'EN REVISIÓN' : 'UNDER REVIEW', className: 'bg-amber-500/20 text-amber-300' };
    }
  };

  const wdStatusMeta = (status: WithdrawalRequest['status']): { label: string; className: string } => {
    switch (status) {
      case 'transferido':
        return { label: isEs ? 'TRANSFERIDO' : 'TRANSFERRED', className: 'bg-emerald-500/20 text-emerald-300' };
      case 'rechazado':
        return { label: isEs ? 'RECHAZADO' : 'REJECTED', className: 'bg-rose-500/20 text-rose-300' };
      default:
        return { label: isEs ? 'SOLICITADO' : 'REQUESTED', className: 'bg-amber-500/20 text-amber-300' };
    }
  };

  const speiStatusMeta = (status: SpeiOrderStatus): { label: string; className: string } => {
    switch (status) {
      case 'verificado':
        return { label: isEs ? 'VERIFICADO' : 'VERIFIED', className: 'bg-purple-500/20 text-purple-300' };
      case 'aprobado':
        return { label: isEs ? 'APROBADO' : 'APPROVED', className: 'bg-emerald-500/20 text-emerald-300' };
      case 'rechazado':
        return { label: isEs ? 'RECHAZADO' : 'REJECTED', className: 'bg-rose-500/20 text-rose-300' };
      case 'expirado':
        return { label: isEs ? 'EXPIRADO' : 'EXPIRED', className: 'bg-white/10 text-white/50' };
      default:
        return { label: isEs ? 'PENDIENTE' : 'PENDING', className: 'bg-amber-500/20 text-amber-300' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 overflow-y-auto">
      <div className="w-full max-w-lg p-5 rounded-3xl bg-zinc-950 border border-purple-500/40 shadow-2xl flex flex-col gap-5 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 border border-rose-500/40 shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            {isEs ? 'Panel Admin & Business Analytics' : 'Admin & Business Analytics'}
          </h2>
          <p className="text-[11px] text-purple-200/70 mt-0.5">
            {isEs ? 'Acceso exclusivo del propietario' : 'Owner-only access'}
          </p>
          <p className="text-[10px] text-amber-300/80 mt-1">
            {isEs ? 'Métricas de demostración: backend comercial en desarrollo' : 'Demo metrics: commercial backend in development'}
          </p>
        </div>

        {!isLoggedIn ? (
          !signedInAdminEmail ? (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold text-center leading-relaxed">
              {isEs
                ? 'Panel exclusivo de las cuentas administradoras autorizadas. Inicia sesión con tu cuenta de administrador para administrar la plataforma.'
                : 'Exclusive panel for the authorized administrator accounts. Sign in with your administrator account to manage the platform.'}
            </div>
          ) : (
          <form onSubmit={isAdminConfigured ? handleLogin : handleFirstSetup} className="flex flex-col gap-3.5">
            {!isAdminConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold text-center">
                {isEs ? 'Primer uso: define tu correo, contraseña (mín. 8 caracteres) y NIP de 6 dígitos. Se guardan solo en este dispositivo.' : 'First use: set your email, password (min. 8 chars) and 6-digit PIN. Stored on this device only.'}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Correo Electrónico Admin' : 'Admin Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@dominio.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                {isEs ? 'Contraseña' : 'Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {isEs ? 'NIP de Segunda Verificación (6 dígitos)' : 'Secondary PIN (6 digits)'}
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500 tracking-widest text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:opacity-95 transition mt-1 active:scale-95"
            >
              {isAdminConfigured ? (isEs ? 'Verificar e Ingresar al Sistema' : 'Verify & Enter System') : (isEs ? 'Configurar y Entrar' : 'Configure & Enter')}
            </button>
          </form>
          )
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Admin Header Bar */}
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-xs">{isEs ? 'Sesión Autorizada (Root Admin)' : 'Authorized Session'}</h4>
                  <p className="text-[10px] text-emerald-200">{signedInAdminEmail || storedEmail}</p>
                </div>
              </div>
              {!signedInAdminEmail && (
                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition"
                >
                  {isEs ? 'Salir' : 'Logout'}
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 rounded-xl bg-black/60 border border-white/10 gap-1 text-xs">
              <button
                onClick={() => setActiveAdminTab('monetizacion')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'monetizacion' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isEs ? 'Finanzas & IVA' : 'Finances'}
              </button>
              <button
                onClick={() => setActiveAdminTab('push')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'push' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {isEs ? 'Push Lookup' : 'Push'}
              </button>
              <button
                onClick={() => setActiveAdminTab('seguridad')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'seguridad' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {isEs ? 'Seguridad' : 'Security'}
              </button>
              <button
                onClick={() => setActiveAdminTab('spei')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'spei' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                {isEs ? 'Pagos SPEI' : 'SPEI'}
              </button>
              <button
                onClick={() => setActiveAdminTab('eventos')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'eventos' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <TicketCheck className="w-3.5 h-3.5" />
                {isEs ? 'Eventos' : 'Events'}
              </button>
              <button
                onClick={() => setActiveAdminTab('organizadores')}
                className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 transition ${
                  activeAdminTab === 'organizadores' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                {isEs ? 'Organizadores' : 'Organizers'}
              </button>
            </div>

            {/* TAB 1: MONETIZACIÓN & FINANZAS */}
            {activeAdminTab === 'monetizacion' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos México (MXN)' : 'Mexico Revenue'}</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">$148,450 MXN</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Incluye 16% IVA ($20,475)</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-purple-500/30">
                    <span className="text-[10px] text-white/60 uppercase font-bold block">{isEs ? 'Ingresos USA (USD)' : 'USA Revenue'}</span>
                    <span className="text-xl font-black text-pink-400 mt-1 block">$12,380 USD</span>
                    <span className="text-[10px] text-purple-200/70 block mt-0.5">Incluye 16% Tax Rate</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Silver ($408 MXN / $100 USD 15d):' : 'Silver Plan:'}</span>
                    <span className="font-bold text-white">312 suscriptores</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Plan Gold ($800 MXN / $180 USD mes):' : 'Gold Plan:'}</span>
                    <span className="font-bold text-amber-300">184 miembros VIP</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Sponsored Profiles ($1,500 MXN / $800 USD):' : 'Sponsored Profiles:'}</span>
                    <span className="font-bold text-pink-400">18 agencias / clubes</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <span className="text-white/80">{isEs ? 'Propuestas Colaboración ($350 MXN / $80 USD):' : 'Collab Proposals:'}</span>
                    <span className="font-bold text-emerald-300">42 revisadas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80">{isEs ? 'Comisión Creadoras (15% neta + 10% cobro):' : 'Creator Net Commission:'}</span>
                    <span className="font-bold text-purple-300">15% retenido activo</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PUSH & NOTIFICACIONES MASIVAS */}
            {activeAdminTab === 'push' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-white">1,842</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Dispositivos Registrados' : 'Registered Devices'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                    <span className="text-lg font-bold text-emerald-400">99.4%</span>
                    <span className="text-[10px] text-white/50 block">{isEs ? 'Tasa de Entrega Push' : 'Delivery Rate'}</span>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <span className="text-[11px] font-bold text-pink-300 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                    {isEs ? 'Enviar Alerta Push Masiva a la Red' : 'Broadcast Push Notification'}
                  </span>
                  
                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Título de la Notificación:' : 'Title:'}</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-white/60 block mb-0.5">{isEs ? 'Mensaje / Cuerpo:' : 'Body:'}</label>
                    <textarea
                      rows={2}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white text-xs resize-none"
                    />
                  </div>

                  {broadcastSuccess && (
                    <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold text-center">
                      {isEs ? 'Alerta simulada registrada. La difusión real requiere el backend de notificaciones.' : 'Simulated broadcast registered. Real delivery requires the notifications backend.'}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-md active:scale-95 transition"
                  >
                    {isEs ? 'Difundir Alerta Push Inmediata' : 'Send Push Broadcast'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: SEGURIDAD, CIBERSEGURIDAD & COOKIES */}
            {activeAdminTab === 'seguridad' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Ciberseguridad del APK' : 'APK Cybersecurity'}</span>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cifrado TLS 1.3 & Tokens con expiración segura</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Validación biométrica facial e INE contra duplicados</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cero tolerancia a extorsión o estafas financieras</span>
                  </div>
                </div>

                {isChangingCreds ? (
                  <form onSubmit={handleUpdateCreds} className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">{isEs ? 'Cambiar Credenciales Admin' : 'Change Admin Credentials'}</h4>
                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">{isEs ? 'Nueva Contraseña' : 'New Password'}</label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/60 block mb-1">{isEs ? 'Nuevo NIP (6 dígitos)' : 'New PIN (6 digits)'}</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Nuevo NIP"
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs tracking-widest text-center"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsChangingCreds(false)}
                        className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                      >
                        {isEs ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                      >
                        {isEs ? 'Guardar Cambios' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsChangingCreds(true)}
                    className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
                  >
                    {isEs ? 'Modificar Contraseña o NIP de Verificación' : 'Modify Password or Verification PIN'}
                  </button>
                )}

                {/* Purge cookies and local data */}
                <button
                  onClick={handleClearCookiesAndStorage}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isEs ? 'Purgar Todo en Cookies y Dejar APK Limpia en 0' : 'Purge All Cookies & Reset APK to 0'}
                </button>
              </div>
            )}

            {/* TAB 4: PAGOS SPEI - VALIDACIÓN AUTOMÁTICA Y APROBACIÓN MANUAL */}
            {activeAdminTab === 'spei' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Cuenta receptora de pagos SPEI' : 'SPEI receiving account'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={speiBank}
                      onChange={(e) => setSpeiBank(e.target.value)}
                      placeholder="Banco"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                    />
                    <input
                      value={speiClabe}
                      onChange={(e) => setSpeiClabe(e.target.value)}
                      placeholder="CLABE (18 dígitos)"
                      maxLength={18}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono"
                    />
                  </div>
                  <input
                    value={speiBeneficiary}
                    onChange={(e) => setSpeiBeneficiary(e.target.value)}
                    placeholder={isEs ? 'Beneficiario (nombre completo)' : 'Beneficiary (full name)'}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSpeiConfig}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
                  >
                    {isEs ? 'Guardar cuenta receptora' : 'Save receiving account'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60 leading-relaxed">
                  {isEs
                    ? 'El bot valida referencia, concepto y monto de cada orden; la decisión final de aprobar o rechazar es del administrador. Al aprobar, el beneficio contratado se activa automáticamente en la cuenta del usuario; al rechazar, el usuario permanece en Plan Gratis.'
                    : 'The bot validates each order reference, concept and amount; the final approve/reject decision belongs to the admin. On approval the purchased benefit activates automatically on the user account; on rejection the user stays on the Free Plan.'}
                </div>

                {speiOrders.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">
                    {isEs ? 'Sin órdenes de pago por ahora.' : 'No payment orders yet.'}
                  </p>
                ) : (
                  speiOrders.map((order) => {
                    const meta = speiStatusMeta(order.status);
                    const decisionPending = order.status === 'pendiente' || order.status === 'verificado';
                    return (
                      <div key={order.id} className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white">#{order.reference}</span>
                          <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + meta.className}>{meta.label}</span>
                        </div>
                        <div className="text-[11px] text-white/80">
                          {order.label} — <span className="font-bold text-emerald-400">${order.amount.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-white/50">
                          {isEs ? 'Usuario' : 'User'}: {order.userName} · {order.userEmail}
                        </div>
                        <div className="text-[10px] text-white/40 font-mono truncate">{isEs ? 'Concepto' : 'Concept'}: {order.concept}</div>
                        <div className="space-y-0.5 border-l border-white/10 pl-2">
                          {order.timeline.slice(-3).map((t, i) => (
                            <p key={i} className="text-[10px] text-white/50">
                              [{new Date(t.ts).toLocaleTimeString()}] {t.text}
                            </p>
                          ))}
                        </div>
                        {decisionPending && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleSpeiBotValidate(order)} className="flex-1 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Validar (bot)' : 'Validate (bot)'}
                            </button>
                            <button type="button" onClick={() => handleSpeiApprove(order)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Aprobar' : 'Approve'}
                            </button>
                            <button type="button" onClick={() => handleSpeiReject(order)} className="flex-1 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Rechazar' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 5: EVENTOS - LIQUIDACIONES, REPUTACIÓN, DONACIONES Y SOPORTE */}
            {activeAdminTab === 'eventos' && (
              <div className="space-y-3">

                {/* Settlement payout queue (harmonized anti-scam logic) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Liquidaciones de eventos' : 'Event settlements'}</span>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/60 leading-relaxed">
                    {isEs
                      ? 'Regla armonizada: se paga al organizador por asistentes confirmados e inasistencias no reembolsables (regla aceptada antes de pagar), menos 30% de comisión e ISR. Si la asistencia declarada es menor al 50% de los pases pagados, la liquidación llega aquí en revisión: liberar si es legítima o rechazar para reembolsar todo (evento fantasma).'
                      : 'Harmonized rule: the organizer is paid for confirmed attendees and non-refunded no-shows (rule accepted before paying), minus 30% commission and ISR. If declared attendance is below 50% of paid passes, the payout arrives here under review: release if legitimate or reject to refund everyone (phantom event).'}
                  </div>
                  {adminPayouts.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin liquidaciones registradas.' : 'No settlements registered.'}</p>
                  ) : adminPayouts.map((payout) => (
                    <div key={payout.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{payout.eventTitle}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (
                          payout.status === 'liberado' ? 'bg-emerald-500/20 text-emerald-300'
                          : payout.status === 'rechazado' ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                        )}>
                          {payout.status === 'liberado' ? (isEs ? 'LIBERADO' : 'RELEASED') : payout.status === 'rechazado' ? (isEs ? 'RECHAZADO' : 'REJECTED') : (isEs ? 'EN REVISIÓN' : 'UNDER REVIEW')}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/60">
                        {payout.organizerName} · {isEs ? 'asistieron' : 'attended'} {payout.attendedCount}/{payout.paidCount} · no-show {payout.noShowCount} · {isEs ? 'reembolsos' : 'refunds'} {payout.refundCount} (${payout.refundTotal.toLocaleString()})
                      </div>
                      <div className="text-[10px] text-white/80 font-bold">
                        {isEs ? 'Neto al organizador' : 'Organizer net'}: ${payout.net.toLocaleString()}
                        <span className="text-white/40 font-normal"> ({isEs ? 'bruto' : 'gross'} ${payout.gross.toLocaleString()} · -${payout.commission.toLocaleString()} {isEs ? 'comisión' : 'commission'} · -${payout.isrRetained.toLocaleString()} ISR)</span>
                      </div>
                      {payout.status === 'revision' && (
                        <>
                          <textarea
                            value={payoutNotes[payout.id] || ''}
                            onChange={(e) => setPayoutNotes(prev => ({ ...prev, [payout.id]: e.target.value }))}
                            rows={2}
                            placeholder={isEs ? 'Nota de decisión (opcional)' : 'Decision note (optional)'}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-[11px]"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void handlePayoutRelease(payout)} disabled={payoutBusyId === payout.id} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition disabled:opacity-50">
                              {isEs ? 'Liberar pago' : 'Release payout'}
                            </button>
                            <button type="button" onClick={() => void handlePayoutReject(payout)} disabled={payoutBusyId === payout.id} className="flex-1 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold transition disabled:opacity-50">
                              {isEs ? 'Rechazar y reembolsar todo' : 'Reject and refund all'}
                            </button>
                          </div>
                        </>
                      )}
                      {payout.note && <p className="text-[10px] text-white/40">{payout.note}</p>}
                    </div>
                  ))}
                </div>

                {/* Reputation alerts from post-event ratings */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Reputación de agencias y organizadores' : 'Agency and organizer reputation'}</span>
                  {(() => {
                    const rep = reputationByOrganizer(adminRatings);
                    const entries = Object.entries(rep);
                    if (entries.length === 0) {
                      return <p className="text-[11px] text-white/50">{isEs ? 'Sin calificaciones de eventos todavía.' : 'No event ratings yet.'}</p>;
                    }
                    return entries.map(([name, r]) => (
                      <div key={name} className={'p-2.5 rounded-xl border flex items-center justify-between gap-2 ' + (r.alert ? 'bg-rose-500/10 border-rose-500/40' : 'bg-black/50 border-white/10')}>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate">{name}</p>
                          <p className="text-[10px] text-white/50">
                            {r.count} {isEs ? 'calificación(es)' : 'rating(s)'}
                            {r.alert && (
                              <span className="text-rose-300 font-bold"> · {isEs ? `promedio ${r.avg} < ${RATING_ALERT_THRESHOLD}: revisar referencias y denuncias` : `avg ${r.avg} < ${RATING_ALERT_THRESHOLD}: review references and reports`}</span>
                            )}
                          </p>
                        </div>
                        <span className={'text-xs font-black shrink-0 flex items-center gap-1 ' + (r.alert ? 'text-rose-300' : 'text-amber-300')}>
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {r.avg > 0 ? r.avg.toFixed(1) : '—'}
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Donations overview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Donaciones a creadoras' : 'Creator donations'}</span>
                  {adminDonations.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin donaciones registradas.' : 'No donations registered.'}</p>
                  ) : adminDonations.slice(0, 12).map((don) => (
                    <div key={don.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/80 truncate">{don.donorProfileName || don.donorName} → {don.creatorName}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (don.status === 'aprobada' ? 'bg-emerald-500/20 text-emerald-300' : don.status === 'rechazada' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300')}>
                          {don.status === 'aprobada' ? (isEs ? 'ACREDITADA' : 'CREDITED') : don.status === 'rechazada' ? (isEs ? 'RECHAZADA' : 'REJECTED') : (isEs ? 'PENDIENTE' : 'PENDING')}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50">
                        ${don.amount.toLocaleString()} + ${don.tax.toLocaleString()} {isEs ? 'IVA' : 'tax'} = ${don.total.toLocaleString()} · {new Date(don.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* VIP passes overview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? `Pases VIP emitidos (${adminEventPasses.length})` : `Issued VIP passes (${adminEventPasses.length})`}</span>
                  <p className="text-[10px] text-white/50">
                    {isEs
                      ? 'Los pases se purgan por completo después de 30 días (purga automática al abrir este panel y con el botón de la pestaña Seguridad). Esto evita que el registro acumule códigos y que se repitan.'
                      : 'Passes are fully purged after 30 days (automatic purge on opening this panel and via the Security tab button). This keeps the registry small and avoids repeated codes.'}
                  </p>
                  {adminEventPasses.slice(0, 8).map((p) => (
                    <div key={p.id} className="p-2 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-white/80">{p.code}</span>
                      <span className="text-[10px] text-white/50 truncate">{p.eventTitle}</span>
                      <span className={'text-[10px] font-bold shrink-0 ' + (p.status === 'activo' ? 'text-emerald-300' : p.status === 'usado' ? 'text-blue-300' : 'text-rose-300')}>{p.status}</span>
                    </div>
                  ))}
                </div>

                {/* Support tickets: satisfaction first for agencies, promoters, associates, creators */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <LifeBuoy className="w-3.5 h-3.5 text-emerald-400" />
                    {isEs ? 'Soporte a agencias, promotoras, asociados y creadoras' : 'Support for agencies, promoters, associates and creators'}
                  </span>
                  {adminTickets.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin solicitudes de soporte.' : 'No support requests.'}</p>
                  ) : adminTickets.map((tk) => (
                    <div key={tk.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-white truncate">{tk.subject}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (tk.status === 'abierto' ? 'bg-amber-500/20 text-amber-300' : tk.status === 'respondido' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50')}>
                          {tk.status === 'abierto' ? (isEs ? 'ABIERTO' : 'OPEN') : tk.status === 'respondido' ? (isEs ? 'RESPONDIDO' : 'ANSWERED') : (isEs ? 'CERRADO' : 'CLOSED')}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/60">
                        {tk.userName} · {tk.userEmail} · {tk.requester}
                      </div>
                      <p className="text-[10px] text-white/70">{tk.message}</p>
                      {tk.reply && (
                        <p className="text-[10px] text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">{tk.reply}</p>
                      )}
                      {tk.status !== 'cerrado' && (
                        <>
                          <textarea
                            value={ticketReplies[tk.id] || ''}
                            onChange={(e) => setTicketReplies(prev => ({ ...prev, [tk.id]: e.target.value }))}
                            rows={2}
                            placeholder={isEs ? 'Respuesta (busca la satisfacción más que ganar la controversia)' : 'Reply (seek satisfaction over winning the controversy)'}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-[11px]"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => void handleTicketReply(tk)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Responder y notificar' : 'Reply and notify'}
                            </button>
                            <button type="button" onClick={() => void handleTicketClose(tk)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition">
                              {isEs ? 'Cerrar' : 'Close'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: ORGANIZADORES - EXPEDIENTES, TARIFAS, CARTERA Y RETIROS */}
            {activeAdminTab === 'organizadores' && (
              <div className="space-y-3">
                {/* Event publishing fee editor */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Tarifa de publicación de eventos (+16% IVA)' : 'Event publishing fee (+16% VAT)'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-white/50 block">MX (MXN)</span>
                      <input
                        value={eventFeeMx}
                        onChange={(e) => setEventFeeMx(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-white/50 block">US (USD)</span>
                      <input
                        value={eventFeeUs}
                        onChange={(e) => setEventFeeUs(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs"
                      />
                    </div>
                  </div>
                  <button type="button" onClick={handleSaveEventFee} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                    {isEs ? 'Guardar tarifas' : 'Save fees'}
                  </button>
                </div>

                {/* Wallet summary: platform commission, ISR retention and net credited */}
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10">
                  <span className="text-xs font-bold text-white block mb-1">{isEs ? 'Resumen de cartera (colaboradores)' : 'Wallet summary (collaborators)'}</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-white/50 block">{isEs ? 'Comisión' : 'Commission'} {PLATFORM_COMMISSION_PCT}%</span>
                      <span className="text-sm font-black text-amber-300">${adminWallet.reduce((s, t) => s + t.commission, 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/50 block">ISR {ISR_RETENTION_PCT}%</span>
                      <span className="text-sm font-black text-sky-300">${adminWallet.reduce((s, t) => s + t.isrRetained, 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/50 block">{isEs ? 'Neto acreditado' : 'Net credited'}</span>
                      <span className="text-sm font-black text-emerald-300">${adminWallet.filter(t => t.net > 0).reduce((s, t) => s + t.net, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Legal INE archive: identity documents stored for potential legal disputes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white block">{isEs ? 'Archivo legal INE (identificaciones)' : 'INE legal archive (ID documents)'}</span>
                    <button
                      type="button"
                      onClick={() => { void handleManualPurge(); }}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[9px] font-bold text-white/80 shrink-0 transition"
                    >
                      {isEs ? 'Purgar retenciones vencidas' : 'Purge expired retentions'}
                    </button>
                  </div>
                  {purgeNote && (
                    <p className="text-[10px] text-amber-300/90 px-2">{purgeNote}</p>
                  )}
                  {adminIneRecords.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin identificaciones resguardadas por ahora.' : 'No identification records stored yet.'}</p>
                  ) : adminIneRecords.map((rec) => {
                    const srcInfo = ineSourceMeta(rec.source);
                    const verdict = ineRecordVerdict(rec);
                    const verdictMeta: Record<string, { label: string; cls: string }> = {
                      pendiente: { label: isEs ? 'En revisión' : 'Pending review', cls: 'bg-amber-500/20 text-amber-300' },
                      aprobada: { label: isEs ? 'Aprobada' : 'Approved', cls: 'bg-emerald-500/20 text-emerald-300' },
                      rechazada: { label: isEs ? 'Rechazada' : 'Rejected', cls: 'bg-rose-500/20 text-rose-300' },
                      baneada: { label: isEs ? 'Baneada' : 'Banned', cls: 'bg-rose-600/30 text-rose-200' },
                    };
                    const vm = verdictMeta[verdict];
                    const retentionLeft = rec.retainedUntil ? Math.max(0, rec.retainedUntil - Date.now()) : null;
                    const retentionDays = retentionLeft !== null ? Math.ceil(retentionLeft / (24 * 60 * 60 * 1000)) : null;
                    return (
                      <div key={rec.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">{rec.legalName}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + vm.cls}>{vm.label}</span>
                            <span className={'px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold ' + srcInfo.className}>{srcInfo.label}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-white/60">
                          {rec.alias} · {rec.userEmail} · {rec.context}
                        </div>
                        <div className="text-[10px] text-white/40">{new Date(rec.createdAt).toLocaleDateString()}</div>
                        {retentionDays !== null && (
                          <div className="text-[10px] text-amber-300/80">
                            {isEs ? `Retención legal activa: ${retentionDays} día(s) restantes antes de la purga permanente.` : `Legal retention active: ${retentionDays} day(s) left before permanent purge.`}
                          </div>
                        )}
                        {rec.verdictNote && (
                          <div className="text-[10px] text-white/50 px-2 py-1 rounded-lg bg-white/5 leading-relaxed">{rec.verdictNote}</div>
                        )}
                        <div className="flex gap-1.5">
                          {rec.ineFront && <img src={rec.ineFront} alt="INE" className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                          {rec.ineBack && <img src={rec.ineBack} alt="INE reverso" className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                          {rec.selfie && <img src={rec.selfie} alt="Selfie" className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                        </div>
                        {verdict === 'pendiente' && rec.userUid && (
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              type="button"
                              disabled={identityBusyId === rec.id}
                              onClick={() => { void handleIdentityVerdict(rec, 'aprobada'); }}
                              className="flex-1 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50 transition"
                            >
                              {isEs ? 'Aprobar' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={identityBusyId === rec.id}
                              onClick={() => { void handleIdentityVerdict(rec, 'rechazada'); }}
                              className="flex-1 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold disabled:opacity-50 transition"
                            >
                              {isEs ? 'Rechazar y eliminar cuenta' : 'Reject & delete account'}
                            </button>
                            <button
                              type="button"
                              disabled={identityBusyId === rec.id}
                              onClick={() => { void handleIdentityVerdict(rec, 'baneada'); }}
                              className="flex-1 py-1.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-black text-[10px] font-bold disabled:opacity-50 transition"
                            >
                              {isEs ? `Banear (${Math.round(INE_BAN_RETENTION_MS / (24 * 60 * 60 * 1000))} días)` : `Ban (${Math.round(INE_BAN_RETENTION_MS / (24 * 60 * 60 * 1000))} days)`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Active premium state passes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white block">{isEs ? 'Pases de búsqueda por estado (24 h)' : 'State-search passes (24 h)'}</span>
                    <span className="text-[10px] text-white/40">{adminStatePasses.filter(p => p.expiresAt > Date.now()).length} {isEs ? 'activos' : 'active'}</span>
                  </div>
                  {adminStatePasses.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin pases activos por ahora.' : 'No active passes yet.'}</p>
                  ) : adminStatePasses.map(p => {
                    const left = Math.max(0, p.expiresAt - Date.now());
                    const active = left > 0;
                    return (
                      <div key={p.userUid} className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{p.stateName}</span>
                          <span className="text-[10px] text-white/50 truncate block">{p.userUid}</span>
                        </div>
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + (active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40')}>
                          {active
                            ? (isEs ? `${Math.ceil(left / 3600000)} h restantes` : `${Math.ceil(left / 3600000)} h left`)
                            : (isEs ? 'Vencido' : 'Expired')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Organizer applications with document thumbnails */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Expedientes de organizadores' : 'Organizer files'}</span>
                  {orgApplications.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin solicitudes de registro por ahora.' : 'No registration requests yet.'}</p>
                  ) : orgApplications.map((app) => {
                    const roleInfo = orgRoleMeta(app.role);
                    const benefit = organizerBenefitState(app);
                    return (
                      <div key={app.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">{app.legalName}</span>
                          <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ' + appStatusMeta(app.status).className}>{appStatusMeta(app.status).label}</span>
                        </div>
                        <div className="text-[10px] text-white/60">
                          <span className={'font-bold ' + roleInfo.className}>{roleInfo.label}</span> · {app.userEmail}
                          {app.status === 'aprobada' && app.role === 'organizador' && (
                            <span className="text-amber-300"> · {benefit.active ? (isEs ? 'Beneficio activo' : 'Benefit active') : (isEs ? 'Beneficio vencido (renovar)' : 'Benefit expired (renew)')}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/50">{isEs ? 'Retiros a' : 'Withdrawals to'}: {app.payoutBank} · CLABE {app.payoutClabe} · {isEs ? 'Titular' : 'Holder'}: {app.payoutHolder}</div>
                        <div className="flex gap-1.5">
                          {app.ineFront && <img src={app.ineFront} alt="INE" className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                          {app.ineBack && <img src={app.ineBack} alt="INE reverso" className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                          {app.bankStatement && <img src={app.bankStatement} alt={isEs ? 'Estado de cuenta' : 'Bank statement'} className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                          {app.fiscalProof && <img src={app.fiscalProof} alt={isEs ? 'Comprobante fiscal' : 'Fiscal proof'} className="w-14 h-14 object-cover rounded-lg border border-white/10" />}
                        </div>
                        {(app.status === 'en revisión' || app.status === 'rechazada') && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleApproveApplication(app)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Aprobar' : 'Approve'}
                            </button>
                            {app.status === 'en revisión' && (
                              <button type="button" onClick={() => handleRejectApplication(app)} className="flex-1 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold transition">
                                {isEs ? 'Rechazar' : 'Reject'}
                              </button>
                            )}
                          </div>
                        )}
                        {app.status === 'aprobada' && app.role === 'organizador' && !benefit.active && (
                          <button type="button" onClick={() => handleRenewOrganizerBenefit(app)} className="w-full py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-[11px] font-bold transition">
                            {isEs ? 'Renovar beneficio 30 días' : 'Renew benefit 30 days'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Withdrawal queue with 24h SLA */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">{isEs ? 'Cola de retiros (SLA máx. 24 h)' : 'Withdrawal queue (24 h max SLA)'}</span>
                  {adminWithdrawals.length === 0 ? (
                    <p className="text-[11px] text-white/50">{isEs ? 'Sin retiros solicitados por ahora.' : 'No withdrawal requests yet.'}</p>
                  ) : adminWithdrawals.map((wd) => {
                    const wdMeta = wdStatusMeta(wd.status);
                    const overdue = wd.status === 'solicitado' && Date.now() > wd.slaDeadline;
                    return (
                      <div key={wd.id} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">${wd.amount.toLocaleString()}</span>
                          <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + wdMeta.className}>{wdMeta.label}</span>
                        </div>
                        <div className="text-[10px] text-white/60">{wd.userName} · {wd.bank} · CLABE {wd.clabe} · {isEs ? 'Titular' : 'Holder'}: {wd.holder}</div>
                        <div className="text-[10px] text-white/40">
                          {isEs ? 'Solicitado' : 'Requested'}: {new Date(wd.createdAt).toLocaleString()}
                          {wd.status === 'solicitado' && (overdue
                            ? <span className="text-rose-400 font-bold"> · {isEs ? 'SLA vencido' : 'SLA overdue'}</span>
                            : <span> · {isEs ? 'Límite' : 'Deadline'}: {new Date(wd.slaDeadline).toLocaleString()}</span>)}
                        </div>
                        {wd.status === 'solicitado' && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleWithdrawalPaid(wd)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Marcar transferido' : 'Mark transferred'}
                            </button>
                            <button type="button" onClick={() => handleWithdrawalReject(wd)} className="flex-1 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-[11px] font-bold transition">
                              {isEs ? 'Rechazar' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

