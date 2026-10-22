import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ProfileKind } from './types';

// ---------- Onboarding profile (cross-device funnel state) ----------
// The onboarding wizard result is stored inside users/{uid} so a user who logs
// in on another device does not repeat the funnel. syncUserProfile uses merge,
// so this field survives subsequent auth syncs.
export interface StoredOnboardingProfile {
  alias: string;
  kind: ProfileKind;
  seeking: string[]; // interest tags selected during onboarding
  age: number; // age declared by the user (cross-checked by the admin against the INE)
  bio: string; // guided self-presentation text
  ageMin: number; // age range sought (18..65)
  ageMax: number;
  photo: string; // compressed profile photo dataURL ('' when none)
  docType: 'ine' | 'pasaporte'; // document used for identity verification
  onboardedAt: number;
}

export async function saveOnboardingProfile(uid: string, profile: StoredOnboardingProfile): Promise<boolean> {
  try {
    await setDoc(doc(db, 'users', uid), { onboardingProfile: profile }, { merge: true });
    return true;
  } catch { return false; }
}

export async function fetchOnboardingProfile(uid: string): Promise<StoredOnboardingProfile | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<{ onboardingProfile: StoredOnboardingProfile }>;
    return data.onboardingProfile || null;
  } catch { return null; }
}
