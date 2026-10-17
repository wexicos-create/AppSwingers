import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();
const diditApiKey = defineSecret("DIDIT_API_KEY");
const diditWebhookSecret = defineSecret("DIDIT_WEBHOOK_SECRET");
const diditWorkflowId = defineString("DIDIT_WORKFLOW_ID");
const publicAppUrl = defineString("APPSWINGER_PUBLIC_URL");

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

function safeEqualHex(expected: string, supplied: string): boolean {
  if (!/^[a-f0-9]+$/i.test(supplied) || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(supplied, "hex"));
}

/**
 * The same authenticated endpoint is called by web and Android. API keys remain
 * server-side; vendor_data is always the Firebase UID from the verified token.
 */
export const createDiditVerificationSession = onCall(
  { secrets: [diditApiKey], enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para verificar tu identidad.");
    const uid = request.auth.uid;
    const workflowId = diditWorkflowId.value().trim();
    if (!workflowId) throw new HttpsError("failed-precondition", "La verificación todavía no está configurada.");

    const response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: { "x-api-key": diditApiKey.value(), "content-type": "application/json" },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: uid,
        callback: publicAppUrl.value() ? publicAppUrl.value() + "/verification/return" : undefined,
      }),
    });
    if (!response.ok) {
      console.error("Didit session creation failed", response.status);
      throw new HttpsError("unavailable", "No fue posible iniciar la verificación. Intenta más tarde.");
    }
    const payload = await response.json() as { session_id?: string; url?: string; status?: string };
    if (!payload.session_id || !payload.url || !payload.url.startsWith("https://")) {
      throw new HttpsError("internal", "Didit devolvió una respuesta incompleta.");
    }
    await db.collection("verificationSessions").doc(payload.session_id).create({
      uid,
      provider: "didit",
      status: "Pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc(uid).set({
      verificationStatus: "pending",
      verificationProvider: "didit",
      verificationSessionId: payload.session_id,
      verificationUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { sessionId: payload.session_id, url: payload.url, status: "pending" };
  }
);

/**
 * Configure this URL in Didit with status.updated events. Never trust an unsigned
 * callback, a client return URL, or a screenshot as verification evidence.
 */
export const diditVerificationWebhook = onRequest(
  { secrets: [diditWebhookSecret], invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") { res.sendStatus(405); return; }
    const body = req.body as Record<string, unknown> | undefined;
    const signature = String(req.header("X-Signature-V2") || "");
    const timestamp = String(req.header("X-Timestamp") || "");
    const bodyTimestamp = Number(body?.timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!body || !signature || !timestamp || !bodyTimestamp ||
        String(bodyTimestamp) !== timestamp || Math.abs(nowSeconds - bodyTimestamp) > 300) {
      res.sendStatus(401); return;
    }
    const expected = createHmac("sha256", diditWebhookSecret.value())
      .update(canonicalJson(body), "utf8").digest("hex");
    if (!safeEqualHex(expected, signature)) { res.sendStatus(401); return; }

    const sessionId = String(body.session_id || "");
    const status = String(body.status || "");
    if (!sessionId || !status) { res.sendStatus(400); return; }
    const sessionRef = db.collection("verificationSessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      // A valid but unassociated event must not be allowed to verify an arbitrary UID.
      res.sendStatus(202); return;
    }
    const session = sessionSnap.data()!;
    const eventKey = createHmac("sha256", diditWebhookSecret.value())
      .update(sessionId + "|" + status + "|" + timestamp).digest("hex");
    const eventRef = db.collection("diditWebhookEvents").doc(eventKey);
    const userRef = db.collection("users").doc(String(session.uid));
    await db.runTransaction(async (tx) => {
      const prior = await tx.get(eventRef);
      if (prior.exists) return;
      tx.create(eventRef, {
        sessionId, status, receivedAt: FieldValue.serverTimestamp(),
        eventType: String(body.event || "status.updated"),
      });
      tx.set(sessionRef, { status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      // Only Didit's exact Approved verdict sets approved. All other states remain
      // pending/review/declined and must never grant paid access.
      const normalized = status === "Approved" ? "approved"
        : status === "Declined" ? "declined"
        : status === "In Review" ? "in_review" : "pending";
      tx.set(userRef, {
        verificationStatus: normalized,
        verificationSessionId: sessionId,
        verificationProvider: "didit",
        verificationUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    res.sendStatus(200);
  }
);


const reportCategories = new Set([
  "harassment", "threats", "insults", "fraud", "non_consensual_content",
  "impersonation", "spam", "other",
]);

export const submitSafetyReport = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para reportar.");
  const reporterUid = request.auth.uid;
  const targetUid = String(request.data?.targetUid || "");
  const category = String(request.data?.category || "");
  const details = String(request.data?.details || "").trim().slice(0, 1500);
  if (!targetUid || targetUid === reporterUid) throw new HttpsError("invalid-argument", "El perfil reportado no es válido.");
  if (!reportCategories.has(category)) throw new HttpsError("invalid-argument", "Selecciona una categoría válida.");
  const ref = await db.collection("safetyReports").add({
    reporterUid, targetUid, category, details,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    reviewHistory: [],
  });
  await db.collection("adminNotifications").add({
    type: "safety_report",
    reportId: ref.id,
    targetUid,
    category,
    status: "unread",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { reportId: ref.id, status: "open" };
});

export const blockMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para bloquear.");
  const blockerUid = request.auth.uid;
  const targetUid = String(request.data?.targetUid || "");
  if (!targetUid || targetUid === blockerUid) throw new HttpsError("invalid-argument", "El perfil no es válido.");
  await db.collection("userBlocks").doc(blockerUid + "_" + targetUid).set({
    blockerUid, targetUid, active: true, createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { blocked: true };
});

export const updateTrustPreferences = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para guardar preferencias.");
  const soundEnabled = request.data?.soundEnabled;
  const autoDeleteDays = request.data?.autoDeleteDays;
  const mutedUserIds = request.data?.mutedUserIds;
  if (typeof soundEnabled !== "boolean") throw new HttpsError("invalid-argument", "soundEnabled debe ser booleano.");
  if (![0, 7, 30, 90].includes(autoDeleteDays)) throw new HttpsError("invalid-argument", "Período de borrado no válido.");
  if (!Array.isArray(mutedUserIds) || mutedUserIds.length > 100 ||
      mutedUserIds.some((id) => typeof id !== "string" || id.length > 128)) {
    throw new HttpsError("invalid-argument", "La lista de conversaciones silenciadas no es válida.");
  }
  await db.collection("userPreferences").doc(request.auth.uid).set({
    soundEnabled, autoDeleteDays, mutedUserIds: [...new Set(mutedUserIds)],
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { saved: true };
});


export const getTrustPreferences = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para consultar preferencias.");
  const snap = await db.collection("userPreferences").doc(request.auth.uid).get();
  const data = snap.data();
  return {
    soundEnabled: data?.soundEnabled !== false,
    autoDeleteDays: [0, 7, 30, 90].includes(data?.autoDeleteDays) ? data?.autoDeleteDays : 0,
    mutedUserIds: Array.isArray(data?.mutedUserIds) ? data?.mutedUserIds.filter((id) => typeof id === "string").slice(0, 100) : [],
  };
});
