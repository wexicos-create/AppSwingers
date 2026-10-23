// api/event-day-alarm.js
// Alarma push real "hoy es tu evento" — OPCION 100% GRATUITA.
// Vercel Cron (incluido en el plan Hobby) invoca esta funcion una vez al dia
// (15:00 UTC = 09:00 America/Mexico_City) y envia las notificaciones push con
// Firebase Admin SDK. No requiere el plan Blaze de Firebase: Firestore y FCM
// del plan Spark (gratuito) bastan, porque el unico elemento que exigia
// facturacion eran las Cloud Functions programadas, sustituidas por este
// endpoint. La autenticacion usa CRON_SECRET (Vercel la inyecta
// automaticamente como Authorization: Bearer en cada invocacion del cron).

const TIME_ZONE = 'America/Mexico_City';
const DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID || '(default)';

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

/** Parser tolerante de fechas (puerto de src/eventflow.ts). */
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
  const eventYear =
    month < Number(mStr) || (month === Number(mStr) && day < Number(dStr))
      ? year + 1
      : year;
  return `${eventYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  let key = null;
  try {
    key = new URL(req.url, 'https://appswinger.live').searchParams.get('key');
  } catch {
    key = null;
  }
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  return key === secret || auth === `Bearer ${secret}`;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'method-not-allowed' });
  }
  if (!authorized(req)) {
    return json(res, 401, { ok: false, error: 'unauthorized' });
  }
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    return json(res, 500, {
      ok: false,
      error:
        'Faltan las variables de entorno de la cuenta de servicio: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY (Firebase Console → Configuracion del proyecto → Cuentas de servicio → Generar nueva clave privada).',
    });
  }

  const { cert, initializeApp, getApps, getApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getMessaging } = await import('firebase-admin/messaging');

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
  const db = DATABASE_ID && DATABASE_ID !== '(default)' ? getFirestore(app, DATABASE_ID) : getFirestore(app);
  const messaging = getMessaging(app);

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
    await Promise.all(
      tokens.map(async (token, i) => {
        const failed = response.responses[i] && response.responses[i].error;
        if (
          failed &&
          String(failed.code || '').includes('messaging/registration-token-not-registered')
        ) {
          await db
            .collection('users')
            .doc(uid)
            .collection('fcm_tokens')
            .doc(token)
            .delete()
            .catch(() => {});
        }
      })
    );
    return response.successCount || 0;
  }

  /** Notificacion dentro de la app (coleccion notifications). */
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

  const today = todayIso();
  let mode = null;
  let testUid = null;
  try {
    const u = new URL(req.url, 'https://appswinger.live');
    mode = u.searchParams.get('mode');
    testUid = u.searchParams.get('uid');
  } catch {
    mode = null;
  }

  // Modo prueba: envia una notificacion de prueba a un uid especifico.
  if (mode === 'test' && testUid) {
    try {
      const sent = await sendPushToUser(
        testUid,
        'Prueba de notificaciones',
        'Si lee este mensaje, la alarma "hoy es tu evento" funcionara en este dispositivo.',
        'appswinguer-test'
      );
      await writeInAppNotification(
        testUid,
        'sistema',
        'Prueba de notificaciones',
        'Prueba del servidor de push enviada desde Vercel.'
      );
      return json(res, 200, { ok: true, mode: 'test', uid: testUid, devicesNotified: sent, today });
    } catch (err) {
      return json(res, 500, { ok: false, error: String(err && err.message ? err.message : err) });
    }
  }

  // Modo produccion: alarma diaria para asistentes y organizadores.
  const passesSnap = await db.collection('event_passes').get();
  const passes = passesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const todayPasses = passes.filter((p) => {
    if (p.status !== 'activo' || !p.userUid) return false;
    if (p.pushNotifiedOn === today) return false;
    const iso = parseEventDate(p.eventDate, today);
    return iso !== null && iso === today;
  });

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
      (moreCount > 0
        ? ` (+${moreCount} ${moreCount === 1 ? 'evento mas' : 'eventos mas'})`
        : '') +
      `. La ubicacion exacta se libera hoy. Tu codigo de acceso: ${first.code}.`;
    try {
      const sent = await sendPushToUser(uid, 'Hoy es tu evento', body, 'appswinguer-event');
      await writeInAppNotification(uid, 'evento', 'Hoy es tu evento', body);
      pushedUsers++;
      console.log(`[event-day-alarm] ${uid}: ${sent} dispositivo(s).`);
    } catch (err) {
      console.error(`[event-day-alarm] fallo el push para ${uid}:`, err);
    }
    await Promise.all(
      userPasses.map((p) =>
        p.ref.set({ pushNotifiedOn: today }, { merge: true }).catch(() => {})
      )
    );
  }

  // Aviso unico al organizador por cada evento de hoy.
  const orgNotified = new Set();
  const eventsToday = {};
  for (const p of passes) {
    if (p.status !== 'activo' && p.status !== 'usado') continue;
    const iso = parseEventDate(p.eventDate, today);
    if (iso !== null && iso === today) {
      if (!eventsToday[p.eventId]) {
        eventsToday[p.eventId] = {
          title: p.eventTitle,
          time: p.eventTime,
          organizerUid: p.organizerUid || null,
          count: 0,
        };
      }
      eventsToday[p.eventId].count++;
    }
  }
  let pushedOrganizers = 0;
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
      pushedOrganizers++;
    } catch (err) {
      console.error(`[event-day-alarm] fallo el push al organizador ${ev.organizerUid}:`, err);
    }
  }

  return json(res, 200, {
    ok: true,
    mode: 'daily',
    today,
    passesToday: todayPasses.length,
    usersNotified: pushedUsers,
    organizersNotified: pushedOrganizers,
    databaseId: DATABASE_ID,
  });
}
