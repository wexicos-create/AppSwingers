import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();
const databaseId = process.env.FIRESTORE_DATABASE_ID;
if (!databaseId) {
  // Configure FIRESTORE_DATABASE_ID to the Firebase database used by the web client.
  // Functions fail closed rather than writing payment records into an unintended DB.
  throw new Error("Missing FIRESTORE_DATABASE_ID secret/environment setting");
}
const db = getFirestore(undefined, databaseId);
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

/** User reports a transfer; this never activates a benefit. */
export const reportSpeiTransfer = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  const auth = requireUser(request);
  const orderId = safeText(request.data?.orderId, 128);
  const transferReference = safeText(request.data?.transferReference, 120);
  if (!orderId || transferReference.length < 5) throw new HttpsError("invalid-argument", "Falta el pedido o la referencia bancaria.");
  const ref = db.collection("paymentOrders").doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Pedido no encontrado.");
    const order = snap.data()!;
    if (order.userId !== auth.uid) throw new HttpsError("permission-denied", "El pedido no pertenece a tu cuenta.");
    if (order.status !== "awaiting_payment") throw new HttpsError("failed-precondition", "El pedido ya no acepta reportes de pago.");
    if (order.expiresAt?.toMillis?.() <= Date.now()) {
      tx.update(ref, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
      throw new HttpsError("deadline-exceeded", "El pedido venció. Genera uno nuevo.");
    }
    tx.update(ref, { status: "payment_reported", transferReference, reportedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("adminReviewQueue").doc(orderId), {
      orderId, userId: auth.uid, type: "spei", status: "under_review",
      amount: order.totalMxn, currency: "MXN", reference: order.reference,
      transferReference, productLabel: order.productLabel, createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("auditLogs").doc(), {
      actorUid: auth.uid, action: "spei_transfer_reported", orderId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { success: true, status: "under_review", message: "Reporte recibido. No se activa el beneficio hasta confirmar el depósito real." };
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
      const duplicate = await tx.get(db.collection("paymentOrders").where("bankTransactionId", "==", bankTransactionId).limit(1));
      if (!duplicate.empty) throw new HttpsError("already-exists", "Ese movimiento bancario ya fue aplicado a otro pedido.");
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
  const now = Date.now();
  return { items: snap.docs.map((d) => {
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
  const expiredOrders = await db.collection("paymentOrders").where("status", "in", ["awaiting_payment", "payment_reported"]).where("expiresAt", "<=", now).get();
  for (let offset = 0; offset < expiredOrders.docs.length; offset += 400) {
    const orderBatch = db.batch();
    for (const order of expiredOrders.docs.slice(offset, offset + 400)) {
      const data = order.data();
      if (data.status === "paid" || data.status === "rejected") continue;
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
