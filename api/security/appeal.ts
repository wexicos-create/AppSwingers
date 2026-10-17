import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    // Deliberately do not check token revocation here: a suspended user must still be able to appeal.
    const app = adminApp();
    const decoded = await getAuth(app).verifyIdToken(token, false);
    const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!caseId || message.length < 20 || message.length > 3000) {
      return res.status(400).json({ error: 'Provide a case ID and an explanation of 20–3000 characters' });
    }
    const db = getFirestore(app);
    const caseRef = db.collection('securityCases').doc(caseId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(caseRef);
      if (!snap.exists || snap.get('userId') !== decoded.uid) throw new Error('CASE_NOT_FOUND');
      const status = snap.get('status');
      if (status === 'resolved_lifted' || status === 'resolved_confirmed') throw new Error('CASE_CLOSED');
      tx.update(caseRef, {
        appeal: { message, submittedAt: FieldValue.serverTimestamp(), status: 'pending' },
        status: 'appeal_pending', updatedAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(200).json({ submitted: true, caseId });
  } catch (error) {
    if (error instanceof Error && error.message === 'CASE_NOT_FOUND') return res.status(404).json({ error: 'Case not found' });
    if (error instanceof Error && error.message === 'CASE_CLOSED') return res.status(409).json({ error: 'Case already closed' });
    console.error('Security appeal failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Could not submit appeal' });
  }
}
