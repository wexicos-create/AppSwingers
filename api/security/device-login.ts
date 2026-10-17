import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

async function notifyBan(email: string, caseId: string, reason: string) {
  if (!email || !process.env.RESEND_API_KEY || !process.env.SECURITY_EMAIL_FROM) {
    return { sent: false, reason: 'email_not_configured' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.SECURITY_EMAIL_FROM,
        to: [email],
        subject: `AppSwinger: aviso de suspensión ${caseId}`,
        text: `Tu cuenta de AppSwinger fue suspendida por una señal de acceso desde más de un dispositivo registrado. Folio: ${caseId}. Motivo registrado: ${reason}. Si crees que es un error, solicita aclaración desde el flujo de revisión de cuenta o contacta al soporte oficial. La suspensión queda sujeta a revisión; no respondas con documentos de identidad por correo.`
      })
    });
    return response.ok ? { sent: true } : { sent: false, reason: `provider_http_${response.status}` };
  } catch {
    return { sent: false, reason: 'provider_unreachable' };
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const app = adminApp();
    const decoded = await getAuth(app).verifyIdToken(token, true);
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId : '';
    if (!/^[a-f0-9-]{32,64}$/i.test(deviceId)) return res.status(400).json({ error: 'Invalid device identifier' });
    const db = getFirestore(app);
    const userRef = db.collection('users').doc(decoded.uid);
    const deviceRef = userRef.collection('deviceRegistry').doc(deviceId);
    const caseRef = db.collection('securityCases').doc();
    const result = await db.runTransaction(async tx => {
      const [userSnap, deviceSnap, registrySnap] = await Promise.all([
        tx.get(userRef), tx.get(deviceRef), tx.get(userRef.collection('deviceRegistry').limit(10))
      ]);
      if (userSnap.get('accountSecurity.status') === 'banned') return { banned: true, caseId: userSnap.get('accountSecurity.caseId') || null, existing: true };
      if (deviceSnap.exists) {
        tx.set(deviceRef, { lastSeenAt: FieldValue.serverTimestamp(), lastSeenIp: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || null }, { merge: true });
        return { banned: false, knownDevice: true };
      }
      const knownDevices = registrySnap.docs.length;
      const email = decoded.email || '';
      if (knownDevices === 0) {
        tx.set(deviceRef, { deviceId, firstSeenAt: FieldValue.serverTimestamp(), lastSeenAt: FieldValue.serverTimestamp(), active: true });
        tx.set(userRef, { accountSecurity: { status: 'active', registeredDeviceId: deviceId, updatedAt: FieldValue.serverTimestamp() } }, { merge: true });
        return { banned: false, knownDevice: false };
      }
      const reason = 'Inicio de sesión desde un segundo dispositivo distinto al registrado. Se requiere aclaración de titularidad.';
      tx.set(caseRef, {
        caseId: caseRef.id, userId: decoded.uid, email, plan: userSnap.get('subscriptionTier') || 'unknown',
        reasonCode: 'MULTIPLE_DEVICES', reason, evidence: { knownDeviceCount: knownDevices, newDeviceId: deviceId, registeredDeviceId: userSnap.get('accountSecurity.registeredDeviceId') || null },
        status: 'suspended_pending_review', observations: [], appeal: null, createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(), notification: { status: 'pending', attempts: 0 }, reviewerUid: null, resolution: null
      });
      tx.set(deviceRef, { deviceId, firstSeenAt: FieldValue.serverTimestamp(), lastSeenAt: FieldValue.serverTimestamp(), flagged: true });
      tx.set(userRef, { accountSecurity: { status: 'banned', caseId: caseRef.id, reasonCode: 'MULTIPLE_DEVICES', bannedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() } }, { merge: true });
      return { banned: true, caseId: caseRef.id, existing: false, email };
    });
    if (!result.banned) return res.status(200).json({ allowed: true });
    if (!result.existing && 'email' in result && result.email) {
      const mail = await notifyBan(result.email, result.caseId || 'sin-folio', 'Acceso detectado desde un segundo dispositivo registrado.');
      if (result.caseId) await db.collection('securityCases').doc(result.caseId).set({
        notification: { status: mail.sent ? 'sent' : 'failed', attempts: 1, failureReason: mail.reason || null, updatedAt: FieldValue.serverTimestamp() }
      }, { merge: true });
    }
    if (!result.existing) await getAuth(app).revokeRefreshTokens(decoded.uid);
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', caseId: result.caseId, appealAvailable: true });
  } catch (error) {
    console.error('Device security check failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Security check unavailable' });
  }
}
