import { createHash, randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

const app = initializeApp();
const databaseId = process.env.FIRESTORE_DATABASE_ID;
if (!databaseId) {
  // Configure FIRESTORE_DATABASE_ID to the Firebase database used by the web client.
  // Functions fail closed rather than writing payment records into an unintended DB.
  throw new Error("Missing FIRESTORE_DATABASE_ID secret/environment setting");
}
const db = getFirestore(app, databaseId);
const REGION = "us-central1";
const IVA = 0.16;
const CATALOG = {
  vip_plus: { label: "VIP Plus", subtotal: 350, days: 10 },
  ultra_vip: { label: "Ultra VIP", subtotal: 650, days: 20 },
  event_listing: { label: "Publicación de evento", subtotal: 1500, quota: 1, maxGuests: 40 },
  featured_campaign: { label: "Campaña destacada", subtotal: 2500, quota: 1 },
  profile_boost: { label: "Impulso de perfil", subtotal: 300, days: 15 },
  host_tools: { label: "Herramientas para anfitriones", subtotal: 1500, quota: 2, maxGuests: 40 },
} as const;
type BenefitKey = keyof typeof CATALOG;

function requireUser(request: { auth?: { uid: string; token: Record<string, unknown> } | null }) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Inicia sesión para continuar.");
  return request.auth;
}
function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } | null }) {
  const auth = requireUser(request);
  if (auth.token.admin !== true) throw new HttpsError("permission-denied", "Se requiere autorización de administrador.");
  return auth;
}
function catalogItem(key: unknown) {
  if (typeof key !== "string" || !(key in CATALOG)) throw new HttpsError("invalid-argument", "Producto no válido.");
  return CATALOG[key as BenefitKey];
}
function safeText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Creates a server-priced SPEI order. The client cannot choose the price,
 * currency, IVA, order status or granted benefit.
 */
export const createSpeiOrder = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const key = request.data?.benefitKey as BenefitKey;
  const item = catalogItem(key);
  const subtotalMxn = item.subtotal;
  const ivaMxn = Math.round(subtotalMxn * IVA * 100) / 100;
  const totalMxn = Math.round((subtotalMxn + ivaMxn) * 100) / 100;
  const reference = `AS${Date.now().toString(36).toUpperCase()}${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
  const order = {
    userId: auth.uid, benefitKey: key, productLabel: item.label, currency: "MXN",
    subtotalMxn, ivaRate: IVA, ivaMxn, totalMxn, reference,
    status: "awaiting_payment", createdAt: now, expiresAt,
    paymentMethod: "SPEI", entitlementGranted: false,
  };
  const docRef = await db.collection("paymentOrders").add(order);
  await db.collection("auditLogs").add({
    actorUid: auth.uid, action: "spei_order_created", orderId: docRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { orderId: docRef.id, reference, currency: "MXN", subtotalMxn, ivaMxn, totalMxn, expiresAt: expiresAt.toDate().toISOString(), productLabel: item.label };
});

/** User submits an SPEI tracking key; submission never proves the transfer or activates a benefit. */
export const reportSpeiTransfer = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const orderId = safeText(request.data?.orderId, 128);
  const trackingNumber = safeText(request.data?.trackingNumber ?? request.data?.transferReference, 120);
  if (!orderId || trackingNumber.length < 5) {
    throw new HttpsError("invalid-argument", "Falta el pedido o la clave de rastreo (mínimo 5 caracteres).");
  }
  const ref = db.collection("paymentOrders").doc(orderId);
  const trackingHash = createHash("sha256").update(trackingNumber.trim().toUpperCase()).digest("hex");
  const trackingRef = db.collection("speiTrackingSubmissions").doc(trackingHash);
  let duplicateTrackingDetected = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Pedido no encontrado.");
    const order = snap.data()!;
    if (order.userId !== auth.uid) throw new HttpsError("permission-denied", "El pedido no pertenece a tu cuenta.");
    if (order.status !== "awaiting_payment") throw new HttpsError("failed-precondition", "El pedido ya no acepta reportes de pago.");
    if (order.expiresAt?.toMillis?.() <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "El pedido venció. Genera uno nuevo.");
    }
    // This anti-fraud check detects reuse across orders; it does NOT query Banxico
    // and must never be displayed as proof that a transfer exists.
    const trackingSnap = await tx.get(trackingRef);
    duplicateTrackingDetected = trackingSnap.exists && trackingSnap.data()?.orderId !== orderId;
    const trackingStatus = duplicateTrackingDetected ? "duplicate_needs_review" : "submitted_unverified";
    const now = FieldValue.serverTimestamp();
    tx.update(ref, {
      status: "payment_reported",
      transferReference: trackingNumber,
      transferTrackingNumber: trackingNumber,
      trackingStatus,
      trackingSubmittedAt: now,
      reportedAt: now,
    });
    tx.set(db.collection("adminReviewQueue").doc(orderId), {
      orderId, userId: auth.uid, type: "spei", status: "under_review",
      amount: order.totalMxn, currency: "MXN", reference: order.reference,
      transferReference: trackingNumber, transferTrackingNumber: trackingNumber,
      trackingStatus, duplicateTrackingDetected,
      riskSignals: duplicateTrackingDetected ? ["La misma clave de rastreo ya fue reportada en otro pedido; verificar antes de aprobar."] : [],
      productLabel: order.productLabel, createdAt: now,
    });
    if (!trackingSnap.exists) {
      tx.create(trackingRef, {
        trackingHash, orderId, userId: auth.uid,
        trackingNumber, submittedAt: now,
      });
    }
    tx.set(db.collection("auditLogs").doc(), {
      actorUid: auth.uid, action: "spei_transfer_reported", orderId,
      trackingHash, duplicateTrackingDetected, createdAt: now,
    });
  });
  return {
    success: true,
    status: "under_review",
    trackingStatus: duplicateTrackingDetected ? "duplicate_needs_review" : "submitted_unverified",
    message: duplicateTrackingDetected
      ? "Rastreo recibido, pero la clave ya aparece en otro pedido. Se requiere revisión reforzada."
      : "Rastreo recibido. El dato no confirma por sí solo la existencia del pago; falta validar MI-SPEI/CEP y el abono en la cuenta receptora.",
  };
});

/**
 * Admin confirms a real bank ledger entry. This must be used only after
 * comparing the actual bank statement, exact amount, MXN currency and reference.
 */
export const reviewSpeiOrder = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const admin = requireAdmin(request);
  const orderId = safeText(request.data?.orderId, 128);
  const decision = request.data?.decision;
  const notes = safeText(request.data?.notes, 500);
  const bankTransactionId = safeText(request.data?.bankTransactionId, 160);
  const bankConfirmed = request.data?.bankConfirmed === true;
  if (!orderId || !["approve", "reject", "request_info"].includes(decision)) throw new HttpsError("invalid-argument", "Decisión no válida.");
  if (decision === "approve" && (!bankConfirmed || bankTransactionId.length < 5)) {
    throw new HttpsError("failed-precondition", "Para aprobar debes confirmar el depósito en el banco y registrar su identificador real.");
  }
  const orderRef = db.collection("paymentOrders").doc(orderId);
  const queueRef = db.collection("adminReviewQueue").doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new HttpsError("not-found", "Pedido no encontrado.");
    const order = snap.data()!;
    if (order.status !== "payment_reported" && order.status !== "under_review") throw new HttpsError("failed-precondition", "El pedido no está pendiente de revisión.");
    if (decision === "approve") {
      const transactionKey = createHash("sha256").update(bankTransactionId).digest("hex");
      const bankLedgerRef = db.collection("bankTransactionLedger").doc(transactionKey);
      const duplicate = await tx.get(bankLedgerRef);
      if (duplicate.exists) throw new HttpsError("already-exists", "Ese movimiento bancario ya fue aplicado a otro pedido.");
      if (order.currency !== "MXN" || typeof order.totalMxn !== "number") throw new HttpsError("failed-precondition", "Importe o moneda del pedido no válido.");
      const item = catalogItem(order.benefitKey);
      const now = Timestamp.now();
      const entitlementRef = db.collection("entitlements").doc(orderId);
      const entitlement: Record<string, unknown> = {
        userId: order.userId, orderId, benefitKey: order.benefitKey, productLabel: item.label,
        status: "active", paymentStatus: "approved", activatedAt: now,
        createdAt: now, approvalReference: bankTransactionId, notification3dSentAt: null,
      };
      if ("days" in item) entitlement.expiresAt = Timestamp.fromMillis(now.toMillis() + item.days * 86400000);
      if ("quota" in item) entitlement.remainingQuota = item.quota;
      if ("maxGuests" in item) entitlement.maxGuests = item.maxGuests;
      tx.create(entitlementRef, entitlement);
      tx.create(bankLedgerRef, { transactionKey, orderId, bankTransactionId, amountMxn: order.totalMxn, currency: order.currency, confirmedBy: admin.uid, confirmedAt: now });
      tx.update(orderRef, {
        status: "paid", bankTransactionId, bankConfirmed: true,
        reviewedBy: admin.uid, reviewedAt: now, reviewNotes: notes,
        entitlementGranted: true, updatedAt: now,
      });
      tx.set(db.collection("userNotifications").doc(order.userId).collection("items").doc(`payment-${orderId}`), {
        type: "payment_approved", title: "Pago confirmado",
        body: `${item.label}: beneficio activado correctamente.`,
        orderId, read: false, createdAt: now,
      });
    } else if (decision === "reject") {
      tx.update(orderRef, { status: "rejected", reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp(), reviewNotes: notes, updatedAt: FieldValue.serverTimestamp() });
      tx.set(db.collection("userNotifications").doc(order.userId).collection("items").doc(`payment-${orderId}`), {
        type: "payment_rejected", title: "Pago no aprobado",
        body: notes || "No se pudo confirmar el depósito. Contacta a soporte si necesitas ayuda.",
        orderId, read: false, createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(orderRef, { status: "under_review", reviewedBy: admin.uid, reviewNotes: notes, updatedAt: FieldValue.serverTimestamp() });
    }
    tx.set(queueRef, { status: decision === "approve" ? "paid" : decision === "reject" ? "rejected" : "under_review", decision, reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp(), notes }, { merge: true });
    tx.set(db.collection("auditLogs").doc(), {
      actorUid: admin.uid, action: `spei_${decision}`, orderId,
      bankTransactionId: decision === "approve" ? bankTransactionId : null,
      notes, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true, status: decision === "approve" ? "paid" : decision === "reject" ? "rejected" : "under_review" };
});

/** User can read their own server-created entitlement summary. */
export const getMyBenefits = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const snap = await db.collection("entitlements").where("userId", "==", auth.uid).get();
  const notificationSnap = await db.collection("userNotifications").doc(auth.uid).collection("items").where("read", "==", false).limit(10).get();
  const now = Date.now();
  return {
    notifications: notificationSnap.docs.map((d) => {
      const n = d.data();
      return { id: d.id, type: n.type ?? "notice", title: n.title ?? "AppSwinger", body: n.body ?? "", createdAt: n.createdAt?.toDate?.().toISOString() ?? null };
    }),
    items: snap.docs.map((d) => {
    const e = d.data();
    const expiresAt = e.expiresAt?.toDate?.() ?? null;
    return { id: d.id, benefitKey: e.benefitKey, productLabel: e.productLabel, status: expiresAt && expiresAt.getTime() <= now ? "expired" : e.status, paymentStatus: e.paymentStatus, activatedAt: e.activatedAt?.toDate?.().toISOString() ?? null, expiresAt: expiresAt?.toISOString() ?? null, remainingQuota: e.remainingQuota ?? null };
  }) };
});

/**
 * Hourly idempotent lifecycle: expire terms and create one in-app reminder
 * during the 72h window. Push delivery is intentionally not claimed/configured.
 */
export const processBenefitLifecycle = onSchedule({ schedule: "every 60 minutes", region: REGION, timeZone: "America/Mexico_City" }, async () => {
  const now = Timestamp.now();
  const nowMs = now.toMillis();
  const active = await db.collection("entitlements").where("status", "==", "active").get();
  const candidateOrders = await db.collection("paymentOrders").where("status", "in", ["awaiting_payment", "payment_reported"]).get();
  const expiredOrders = candidateOrders.docs.filter(order => (order.data().expiresAt?.toMillis?.() ?? Infinity) <= now.toMillis());
  for (let offset = 0; offset < expiredOrders.length; offset += 200) {
    const orderBatch = db.batch();
    for (const order of expiredOrders.slice(offset, offset + 200)) {
      const data = order.data();
      orderBatch.update(order.ref, { status: "expired", updatedAt: now });
      orderBatch.set(db.collection("adminReviewQueue").doc(order.id), { status: "expired", expiredAt: now }, { merge: true });
    }
    await orderBatch.commit();
  }
  const batchLimit = 200;
  for (let offset = 0; offset < active.docs.length; offset += batchLimit) {
    const batch = db.batch();
    for (const snap of active.docs.slice(offset, offset + batchLimit)) {
      const e = snap.data();
      const expiry = e.expiresAt?.toMillis?.();
      if (typeof expiry !== "number") continue;
      if (expiry <= nowMs) {
        batch.update(snap.ref, { status: "expired", expiredAt: now, updatedAt: now });
        batch.set(db.collection("userNotifications").doc(e.userId).collection("items").doc(`expired-${snap.id}`), {
          type: "benefit_expired", title: "Tu beneficio venció",
          body: `${e.productLabel || e.benefitKey}: el periodo terminó. Renueva mediante un nuevo pago aprobado.`,
          entitlementId: snap.id, read: false, createdAt: now,
        }, { merge: true });
      } else if (expiry - nowMs <= 72 * 3600000 && !e.notification3dSentAt) {
        batch.update(snap.ref, { notification3dSentAt: now });
        batch.set(db.collection("userNotifications").doc(e.userId).collection("items").doc(`expiry-reminder-${snap.id}`), {
          type: "benefit_expiry_reminder", title: "Tu beneficio está por vencer",
          body: `${e.productLabel || e.benefitKey} vence el ${new Date(expiry).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}. Renueva con un nuevo pago aprobado; no hay cobro automático.`,
          entitlementId: snap.id, expiresAt: Timestamp.fromMillis(expiry), read: false, createdAt: now,
        }, { merge: true });
      }
    }
    await batch.commit();
  }
});

/** Creator payments remain disabled until an adult-content-approved processor and payout rails are configured. */
export const createCreatorCommerceCheckout = onCall({ region: REGION, enforceAppCheck: true }, async (_request) => {
  requireUser(_request);
  if (process.env.CREATOR_COMMERCE_ENABLED !== "true" || !process.env.ADULT_CONTENT_PROCESSOR) {
    throw new HttpsError("failed-precondition", "Las suscripciones, PPV y propinas a creadoras aún no están habilitadas: falta configurar y validar un procesador autorizado para contenido adulto.");
  }
  throw new HttpsError("unimplemented", "El adaptador del procesador y la liquidación a creadoras deben integrarse y probarse antes de activar este módulo.");
});


/** Creator wallet is a server-derived ledger view, not a client-editable balance.
 * The "virtual card" is a display-only wallet card, not an issued bank/payment card. */
export const getCreatorWallet = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const [creatorSnap, ledgerSnap, payoutSnap, withdrawalSnap] = await Promise.all([
    db.collection("creators").doc(auth.uid).get(),
    db.collection("creatorLedger").where("creatorUid", "==", auth.uid).get(),
    db.collection("creatorPayoutProfiles").doc(auth.uid).get(),
    db.collection("creatorWithdrawals").where("creatorUid", "==", auth.uid).get(),
  ]);
  if (!creatorSnap.exists) throw new HttpsError("failed-precondition", "Primero debes completar el alta de creadora.");
  const creator = creatorSnap.data()!;
  let availableMxn = 0, pendingMxn = 0, paidMxn = 0;
  for (const row of ledgerSnap.docs) {
    const e = row.data(), amount = typeof e.amountMxn === "number" && Number.isFinite(e.amountMxn) ? e.amountMxn : 0;
    if (e.status === "available" && e.direction === "credit") availableMxn += amount;
    if (e.status === "pending" && e.direction === "credit") pendingMxn += amount;
    if (e.status === "paid" && e.direction === "debit") paidMxn += amount;
  }
  const withdrawals = withdrawalSnap.docs.map((d) => {
    const w = d.data();
    return { id: d.id, amountMxn: w.amountMxn, status: w.status, createdAt: w.createdAt?.toDate?.().toISOString() ?? null };
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10);
  const payout = payoutSnap.data();
  return {
    currency: "MXN",
    card: { label: "AppSwinger Wallet", maskedId: "AS-" + createHash("sha256").update(auth.uid).digest("hex").slice(0, 4).toUpperCase() + "-••••", kind: "internal_wallet_display_only", actualPaymentCardIssued: false },
    balances: { availableMxn: Math.round(availableMxn * 100) / 100, pendingMxn: Math.round(pendingMxn * 100) / 100, paidMxn: Math.round(paidMxn * 100) / 100 },
    payoutReadiness: {
      creatorApproved: creator.status === "approved", identityVerified: creator.identityStatus === "verified",
      taxDocumentVerified: payout?.taxDocumentStatus === "verified", bankStatementVerified: payout?.bankStatementStatus === "verified",
      bankAccountVerified: payout?.bankAccountStatus === "verified", legalNameMatch: payout?.legalNameMatch === true,
    }, withdrawals,
  };
});

/** Request only; it never transfers money. Documents must be private Storage objects and verified by staff. */
export const requestCreatorWithdrawal = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const amountMxn = Number(request.data?.amountMxn);
  const legalName = safeText(request.data?.legalName, 160);
  const bankName = safeText(request.data?.bankName, 100);
  const clabe = safeText(request.data?.clabe, 18).replace(/\s/g, "");
  const taxDocumentRef = safeText(request.data?.taxDocumentRef, 500);
  const bankStatementRef = safeText(request.data?.bankStatementRef, 500);
  const taxId = safeText(request.data?.taxId, 20).toUpperCase();
  if (!Number.isFinite(amountMxn) || amountMxn <= 0 || Math.round(amountMxn * 100) !== amountMxn * 100)
    throw new HttpsError("invalid-argument", "Importe de retiro no válido.");
  if (legalName.length < 5 || bankName.length < 2 || !/^\d{18}$/.test(clabe) || !taxDocumentRef || !bankStatementRef || taxId.length < 10)
    throw new HttpsError("invalid-argument", "Se requiere nombre fiscal, banco, CLABE de 18 dígitos, constancia fiscal y estado de cuenta.");
  const creatorRef = db.collection("creators").doc(auth.uid);
  const payoutRef = db.collection("creatorPayoutProfiles").doc(auth.uid);
  const withdrawalRef = db.collection("creatorWithdrawals").doc();
  const withdrawalAllowed = await db.runTransaction(async (tx) => {
    const creatorSnap = await tx.get(creatorRef);
    const payoutSnap = await tx.get(payoutRef);
    const ledgerSnap = await tx.get(db.collection("creatorLedger").where("creatorUid", "==", auth.uid));
    const pendingSnap = await tx.get(db.collection("creatorWithdrawals").where("creatorUid", "==", auth.uid).where("status", "in", ["requested", "under_review", "approved", "processing"]));
    const creator = creatorSnap.data();
    if (!creatorSnap.exists || creator?.status !== "approved" || creator?.identityStatus !== "verified")
      throw new HttpsError("failed-precondition", "La cuenta de creadora y su identidad deben estar verificadas.");
    let available = 0;
    for (const row of ledgerSnap.docs) {
      const e = row.data();
      if (e.direction === "credit" && e.status === "available") available += Number(e.amountMxn || 0);
      if (e.direction === "debit" && ["reserved", "paid"].includes(e.status)) available -= Number(e.amountMxn || 0);
    }
    const alreadyReserved = pendingSnap.docs.reduce((sum, row) => sum + Number(row.data().amountMxn || 0), 0);
    if (amountMxn > Math.round((available - alreadyReserved) * 100) / 100) {
      tx.set(db.collection("adminAlerts").doc(), { type: "creator_withdrawal_exceeds_balance", severity: "high", creatorUid: auth.uid, requestedAmountMxn: amountMxn, calculatedAvailableMxn: Math.round(available * 100) / 100, status: "open", createdAt: FieldValue.serverTimestamp() });
      return false;
    }
    const existing = payoutSnap.data();
    const normalizeName = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const nameMatches = Boolean(existing?.verifiedLegalName && normalizeName(existing.verifiedLegalName) === normalizeName(legalName));
    tx.set(payoutRef, {
      legalName, bankName, clabe, taxId, taxDocumentRef, bankStatementRef,
      taxDocumentStatus: existing?.taxDocumentRef === taxDocumentRef ? existing.taxDocumentStatus : "pending_review",
      bankStatementStatus: existing?.bankStatementRef === bankStatementRef ? existing.bankStatementStatus : "pending_review",
      bankAccountStatus: "pending_review", legalNameMatch: nameMatches, submittedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.create(withdrawalRef, { creatorUid: auth.uid, amountMxn, currency: "MXN", status: "under_review", payoutProfileUid: auth.uid, taxWithholdingStatus: "pending_tax_review", nameMatchAtRequest: nameMatches, createdAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("adminAlerts").doc(), { type: "creator_withdrawal_requested", severity: "high", creatorUid: auth.uid, withdrawalId: withdrawalRef.id, amountMxn, currency: "MXN", status: "open", createdAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("adminReviewQueue").doc("withdrawal-" + withdrawalRef.id), { type: "creator_withdrawal", status: "under_review", creatorUid: auth.uid, withdrawalId: withdrawalRef.id, amountMxn, currency: "MXN", createdAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("auditLogs").doc(), { actorUid: auth.uid, action: "creator_withdrawal_requested", withdrawalId: withdrawalRef.id, amountMxn, createdAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!withdrawalAllowed) throw new HttpsError("failed-precondition", "El importe supera el saldo disponible. La operación fue bloqueada y se registró una alerta de seguridad.");
  return { success: true, withdrawalId: withdrawalRef.id, status: "under_review", message: "Solicitud registrada. No se ha transferido dinero; la liberación exige validación documental, bancaria y fiscal." };
});

/** Admin-only integrity scan for malformed or non-server-approved ledger entries. */
export const auditCreatorLedger = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const admin = requireAdmin(request);
  const ledger = await db.collection("creatorLedger").get();
  const alerts: string[] = [];
  for (const row of ledger.docs) {
    const e = row.data(), amount = Number(e.amountMxn);
    if (!e.creatorUid || !Number.isFinite(amount) || amount <= 0 ||
        !["credit", "debit"].includes(e.direction) ||
        !["pending", "available", "reserved", "paid", "reversed"].includes(e.status) ||
        !e.sourceType || !e.sourceId || e.serverApproved !== true) {
      await db.collection("adminAlerts").doc("ledger-" + row.id).set({
        type: "creator_ledger_integrity", severity: "critical", ledgerEntryId: row.id,
        creatorUid: e.creatorUid ?? null, status: "open",
        reason: "Ledger entry missing valid amount, source, status or server approval",
        detectedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      alerts.push(row.id);
    }
  }
  await db.collection("auditLogs").add({ actorUid: admin.uid, action: "creator_ledger_audit", flaggedCount: alerts.length, flaggedLedgerEntryIds: alerts.slice(0, 100), createdAt: FieldValue.serverTimestamp() });
  return { scanned: ledger.size, flagged: alerts.length, alertIds: alerts.slice(0, 100) };
});
