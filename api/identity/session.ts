import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(token, true);
    if (!process.env.DIDIT_API_KEY || !process.env.DIDIT_WORKFLOW_ID) {
      return res.status(503).json({ error: 'Identity verification is not configured yet' });
    }
    const db = getFirestore(app);
    const userRef = db.collection('users').doc(decoded.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) await userRef.set({ uid: decoded.uid, createdAt: FieldValue.serverTimestamp() }, { merge: true });

    const response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: { 'x-api-key': process.env.DIDIT_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: process.env.DIDIT_WORKFLOW_ID,
        vendor_data: decoded.uid,
        callback: process.env.DIDIT_WEBHOOK_URL || undefined
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.url !== 'string' || typeof payload.session_id !== 'string') {
      console.error('Didit session creation failed', response.status);
      return res.status(502).json({ error: 'Could not start identity verification' });
    }
    await userRef.set({
      identityVerification: {
        status: 'pending',
        provider: 'didit',
        sessionId: payload.session_id,
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }
    }, { merge: true });
    return res.status(200).json({ url: payload.url, status: 'pending' });
  } catch (error) {
    console.error('Identity session error', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Could not start identity verification' });
  }
}
