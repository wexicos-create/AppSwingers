/**
 * AppSwinguer Ultra Plus - Cloud Functions (servidor real de push).
 *
 * Alarma "hoy es tu evento": la funcion programada recorre los pases de
 * evento activos, detecta cuales asistentes tienen su evento HOY (zona
 * America/Mexico_City, con el mismo parser tolerante de fechas que usa la
 * app) y les envia una notificacion push real via Firebase Cloud Messaging
 * a todos los dispositivos registrados bajo users/{uid}/fcm_tokens. Tambien
 * escribe la notificacion en la coleccion `notifications` para que aparezca
 * dentro de la app, y avisa al organizador con un resumen de asistentes
 * confirmados.
 *
 * Despues del primer envio del dia, el pase queda marcado con
 * pushNotifiedOn = 'YYYY-MM-DD', por lo que cada pase recibe la alarma una
 * sola vez por dia aunque la funcion corra varias veces (09:00, 14:00 y
 * 19:00 hora de Mexico) para cubrir compras de ultimo momento.
 *
 * Despliegue:
 *   npm install -g firebase-tools
 *   firebase login
 *   firebase deploy --only functions
 * (Las funciones programadas requieren el plan Blaze.)
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const functions = require('firebase-functions');

// La app usa una base de datos Firestore con identificador propio
// (firestoreDatabaseId en firebase-applet-config.json). El Admin SDK permite
// apuntar a esa base; se puede sobreescribir con la variable de entorno
// FIREBASE_DATABASE_ID al desplegar.
const DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID || 'ai-studio-bae18161-c5ba-4b69-99f2-4a83f48a6d69';

const app = initializeApp();
const db = getFirestore(app, DATABASE_ID);
const messaging = getMessaging(app);

const TIME_ZONE = 'America/Mexico_City';

/** ISO 'YYYY-MM-DD' de HOY en la zona horaria de Mexico. */
function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const MONTH_TOKENS = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/**
 * Parser tolerante de fechas de evento (puerto de src/eventflow.ts):
 * acepta ISO 'YYYY-MM-DD' y texto libre como "Sab 24 oct".
 * Devuelve null cuando no se puede interpretar.
 */
function parseEventDate(dateStr, todayIsoStr) {
  const s = String(dateStr || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dayMatch = s.match(/(\d{1,2})/);
  const monthMatch = s.toLowerCase().match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)/);
  if (!dayMatch || !monthMatch) return null;
  const day = Number(dayMatch[1]);
  const month = MONTH_TOKENS[monthMatch[1]];
  if (!day || !month || day > 31) return null;
  const [yStr, mStr, dStr] = todayIsoStr.split('-');
  const year = Number(yStr);
  const nowMonth = Number(mStr);
  const nowDay = Number(dStr);
  // Si ese dia/mes ya paso este anio, el evento es del anio entrante.
  const eventYear = month < nowMonth || (month === nowMonth && day < nowDay) ? year + 1 : year;
  return `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Envia el push a todos los dispositivos del usuario y depura tokens invalidos. */
async function sendPushToUser(uid, title, body, tag) {
  const tokensSnap = await db.collection('users').doc(uid).collection('fcm_tokens').get();
  if (tokensSnap.empty) return 0;

  const tokens = tokensSnap.docs.map((d) => d.id);
  const messages = tokens.map((token) => ({
    token,
    notification: { title, body },
    data: { tag: tag || 'appswinguer-event', url: '/' },
    android: { priority: 'high' },
    webpush: {
      notification: { icon: '/icon.svg', badge: '/icon.svg' },
      fcmOptions: { link: '/' },
    },
  }));

  const response = await messaging.sendEach(messages);
  // Limpieza de tokens que el navegador ya no reconoce.
  await Promise.all(
    tokens.map(async (token, i) => {
      const failed = response.responses[i] && response.responses[i].error;
      if (failed && String(failed.code || '').includes('messaging/registration-token-not-registered')) {
        await db.collection('users').doc(uid).collection('fcm_tokens').doc(token).delete().catch(() => {});
      }
    })
  );
  return response.successCount || 0;
}

/** Notificacion dentro de la app (misma forma que pushRemoteNotification). */
async function writeInAppNotification(uid, kind, title, body) {
  const id = `nt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.collection('notifications').doc(id).set({
    id,
    userUid: uid,
    kind,
    title,
    body,
    ts: Date.now(),
    read: false,
  });
}

exports.eventDayPushAlarm = functions.pubsub
  .schedule('0 9,14,19 * * *')
  .timeZone(TIME_ZONE)
  .onRun(async () => {
    const today = todayIso();
    const passesSnap = await db.collection('event_passes').get();
    const passes = passesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

    // 1. Pases de asistentes con evento hoy y sin alarma enviada todavia.
    const todayPasses = passes.filter((p) => {
      if (p.status !== 'activo' || !p.userUid) return false;
      if (p.pushNotifiedOn === today) return false;
      const iso = parseEventDate(p.eventDate, today);
      return iso !== null && iso === today;
    });

    // Agrupa por usuario para un solo push con la lista de sus eventos.
    const byUser = {};
    for (const p of todayPasses) {
      if (!byUser[p.userUid]) byUser[p.userUid] = [];
      byUser[p.userUid].push(p);
    }

    let pushedUsers = 0;
    for (const [uid, userPasses] of Object.entries(byUser)) {
      const first = userPasses[0];
      const moreCount = userPasses.length - 1;
      const body =
        `${first.eventTitle} - ${first.eventTime} - ${first.eventZone}` +
        (moreCount > 0 ? ` (+${moreCount} ${moreCount === 1 ? 'evento mas' : 'eventos mas'})` : '') +
        `. La ubicacion exacta se libera hoy. Tu codigo de acceso: ${first.code}.`;
      try {
        const sent = await sendPushToUser(uid, 'Hoy es tu evento', body, 'appswinguer-event');
        await writeInAppNotification(uid, 'evento', 'Hoy es tu evento', body);
        pushedUsers++;
        console.log(`[eventDayPushAlarm] ${uid}: ${sent} dispositivo(s) notificado(s).`);
      } catch (err) {
        console.error(`[eventDayPushAlarm] fallo el push para ${uid}:`, err);
      }
      // Marca los pases notificados hoy (una alarma por pase y por dia).
      await Promise.all(
        userPasses.map((p) => p.ref.set({ pushNotifiedOn: today }, { merge: true }).catch(() => {}))
      );
    }

    // 2. Aviso unico al organizador por cada evento distinto de hoy.
    const orgNotified = new Set();
    const eventsToday = {};
    for (const p of passes) {
      if (p.status !== 'activo' && p.status !== 'usado') continue;
      const iso = parseEventDate(p.eventDate, today);
      if (iso !== null && iso === today) {
        if (!eventsToday[p.eventId]) {
          eventsToday[p.eventId] = { title: p.eventTitle, time: p.eventTime, organizerUid: p.organizerUid || null, count: 0 };
        }
        eventsToday[p.eventId].count++;
      }
    }
    for (const [eventId, ev] of Object.entries(eventsToday)) {
      const key = `${ev.organizerUid || 'null'}:${eventId}`;
      if (!ev.organizerUid || orgNotified.has(key)) continue;
      orgNotified.add(key);
      try {
        await sendPushToUser(
          ev.organizerUid,
          'Hoy es tu evento (organizador)',
          `${ev.title} - ${ev.time}. Tienes ${ev.count} pase(s) validado(s) para hoy. Recuerda registrar la asistencia en la app.`,
          'appswinguer-organizer'
        );
        await writeInAppNotification(
          ev.organizerUid,
          'evento',
          'Hoy es tu evento (organizador)',
          `${ev.title} - ${ev.time}. Tienes ${ev.count} pase(s) validado(s) para hoy. Recuerda registrar la asistencia en la app.`
        );
      } catch (err) {
        console.error(`[eventDayPushAlarm] fallo el push al organizador ${ev.organizerUid}:`, err);
      }
    }

    console.log(
      `[eventDayPushAlarm] ${today}: ${todayPasses.length} pase(s) de hoy, ${pushedUsers} asistente(s) notificado(s), ${orgNotified.size} organizador(es) avisado(s).`
    );
    return null;
  });

// Utilidad para probar el circuito completo desde la consola de Firebase:
// firebase functions:shell -> eventDayPushAlarm()
// (requiere al menos un pase activo con eventDate = hoy).
exports.pushHealthCheck = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesion.');
  }
  const uid = context.auth.uid;
  const sent = await sendPushToUser(
    uid,
    'Prueba de notificaciones',
    'Si lee este mensaje, la alarma de eventos funcionara en este dispositivo.',
    'appswinguer-test'
  );
  return { ok: true, devicesNotified: sent, databaseId: DATABASE_ID, today: todayIso() };
});
