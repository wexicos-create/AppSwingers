import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

async function sendEmail(email: string, caseId: string, reason: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.SECURITY_EMAIL_FROM,
      to: [email],
      subject: `AppSwinger: aviso de suspensión ${caseId}`,
      text: `Tu cuenta de AppSwinger fue suspendida. Folio: ${caseId}. Motivo: ${reason}. Si consideras que es un error, solicita una aclaración mediante el flujo de revisión de cuenta. No envíes documentos de identidad por correo.`
    })
  });
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SECURITY_CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.SECURITY_CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.SECURITY_EMAIL_FROM) {
    return res.status(503).json({ error: 'Email provider is not configured' });
  }
  const db = getFirestore(adminApp());
  const snapshot = await db.collection('securityCases').where('notification.status', 'in', ['pending', 'failed']).limit(50).get();
  let sent = 0, failed = 0, skipped = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const attempts = Number(data.notification?.attempts || 0);
    if (!data.email || attempts >= 3) { skipped++; continue; }
    try {
      await sendEmail(String(data.email), doc.id, String(data.reason || data.reasonCode || 'Revisión de seguridad'));
      await doc.ref.update({ notification: { status: 'sent', attempts: attempts + 1, updatedAt: FieldValue.serverTimestamp(), failureReason: null } });
      sent++;
    } catch (error) {
      await doc.ref.update({ notification: { status: 'failed', attempts: attempts + 1, updatedAt: FieldValue.serverTimestamp(), failureReason: error instanceof Error ? error.message.slice(0, 250) : 'unknown' } });
      failed++;
    }
  }
  return res.status(200).json({ sent, failed, skipped });
}
