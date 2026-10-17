import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

async function requireAdmin(req: any) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new Error('UNAUTHORIZED');
  const decoded = await getAuth(adminApp()).verifyIdToken(token, true);
  if (decoded.admin !== true) throw new Error('FORBIDDEN');
  return decoded;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const admin = await requireAdmin(req);
    const db = getFirestore(adminApp());
    if (req.method === 'GET') {
      const queryText = typeof req.query?.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 160) : '';
      const status = typeof req.query?.status === 'string' ? req.query.status : '';
      const snapshot = await db.collection('securityCases').orderBy('createdAt', 'desc').limit(200).get();
      const cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => {
        const value = item as any;
        const matchesText = !queryText || [value.caseId, value.userId, value.email, value.reason, value.reasonCode, value.plan]
          .some(part => String(part || '').toLowerCase().includes(queryText));
        return matchesText && (!status || value.status === status);
      });
      return res.status(200).json({ cases });
    }
    if (req.method === 'PATCH') {
      const caseId = typeof req.body?.caseId === 'string' ? req.body.caseId.trim() : '';
      const action = req.body?.action;
      if (!caseId || !['add_observation', 'lift_suspension', 'confirm_ban'].includes(action)) {
        return res.status(400).json({ error: 'Invalid case action' });
      }
      const caseRef = db.collection('securityCases').doc(caseId);
      const userId = await db.runTransaction(async tx => {
        const snap = await tx.get(caseRef);
        if (!snap.exists) throw new Error('CASE_NOT_FOUND');
        const userId = String(snap.get('userId') || '');
        if (action === 'add_observation') {
          const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 2000) : '';
          if (!note) throw new Error('NOTE_REQUIRED');
          tx.update(caseRef, { observations: FieldValue.arrayUnion({ note, adminUid: admin.uid, at: new Date().toISOString() }), updatedAt: FieldValue.serverTimestamp() });
        } else {
          const status = action === 'lift_suspension' ? 'resolved_lifted' : 'resolved_confirmed';
          tx.update(caseRef, { status, resolution: action === 'lift_suspension' ? 'Suspension lifted after review' : 'Ban confirmed after review', reviewerUid: admin.uid, resolvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          if (action === 'lift_suspension') {
            tx.set(db.collection('users').doc(userId), { accountSecurity: { status: 'active', caseId: null, reasonCode: null, updatedAt: FieldValue.serverTimestamp() } }, { merge: true });
          }
        }
        return userId;
      });
      if (action === 'lift_suspension') {
        try { await getAuth(adminApp()).revokeRefreshTokens(userId); } catch { /* Keep the case resolution even if token revocation fails. */ }
      }
      return res.status(200).json({ updated: true, caseId, action });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return res.status(401).json({ error: 'Authentication required' });
    if (error instanceof Error && error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Administrator role required' });
    if (error instanceof Error && error.message === 'CASE_NOT_FOUND') return res.status(404).json({ error: 'Case not found' });
    if (error instanceof Error && error.message === 'NOTE_REQUIRED') return res.status(400).json({ error: 'Observation required' });
    console.error('Security case API failed', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({ error: 'Security case operation failed' });
  }
}
