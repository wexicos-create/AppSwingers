import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((out: Record<string, unknown>, key) => {
      out[key] = canonicalize(value[key]);
      return out;
    }, {});
  }
  return value;
}

function validSignature(payload: unknown, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(JSON.stringify(canonicalize(payload)), 'utf8').digest();
  const suppliedHex = signature.replace(/^sha256=/i, '').trim();
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;
  const supplied = Buffer.from(suppliedHex, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Webhook not configured' });
    const signature = String(req.headers['x-signature-v2'] || '');
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!payload || typeof payload !== 'object' || !validSignature(payload, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const uid = typeof payload.vendor_data === 'string' ? payload.vendor_data : '';
    const sessionId = typeof payload.session_id === 'string' ? payload.session_id : '';
    const status = typeof payload.status === 'string' ? payload.status : '';
    if (!uid || !sessionId || !status) return res.status(400).json({ error: 'Missing session fields' });

    const app = getAdminApp();
    const db = getFirestore(app);
    const userRef = db.collection('users').doc(uid);
    const eventId = String(payload.webhook_id || payload.event_id || (sessionId + ':' + status));
    const eventRef = db.collection('diditWebhookEvents').doc(createHmac('sha256', secret).update(eventId).digest('hex'));
    const result = await db.runTransaction(async transaction => {
      const [userSnap, eventSnap] = await Promise.all([transaction.get(userRef), transaction.get(eventRef)]);
      if (eventSnap.exists) return 'duplicate';
      if (!userSnap.exists) throw new Error('Unknown user');
      const current = userSnap.get('identityVerification') || {};
      if (current.sessionId && current.sessionId !== sessionId) {
        transaction.set(eventRef, { processedAt: FieldValue.serverTimestamp(), ignored: true }, { merge: true });
        return 'stale';
      }
      const normalized = status.toLowerCase();
      const mapped = normalized === 'approved' || normalized === 'verified' ? 'approved'
        : normalized === 'declined' || normalized === 'rejected' ? 'declined'
        : normalized.includes('review') ? 'in_review'
        : normalized.includes('expired') ? 'expired'
        : 'pending';
      transaction.set(userRef, {
        identityVerification: {
          status: mapped,
          provider: 'didit',
          sessionId,
          decisionStatus: status,
          updatedAt: FieldValue.serverTimestamp()
        }
      }, { merge: true });
      transaction.set(eventRef, { processedAt: FieldValue.serverTimestamp(), uid, sessionId, status }, { merge: true });
      return 'processed';
    });
    return res.status(200).json({ received: true, result });
  } catch (error) {
    console.error('Didit webhook processing failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
