import { docGet, docUpdate } from './store';
import { ProfileKind } from './types';

// ---------- Onboarding profile (local funnel state) ----------
// The onboarding wizard result is stored inside the local user record so the
// user does not repeat the funnel while using this device.
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
  if (!uid) return false;
  try {
    return docUpdate('users', uid, { onboardingProfile: profile });
  } catch {
    return false;
  }
}

export async function fetchOnboardingProfile(uid: string): Promise<StoredOnboardingProfile | null> {
  if (!uid) return null;
  try {
    const user = docGet<{ onboardingProfile?: StoredOnboardingProfile }>('users', uid);
    return user?.onboardingProfile || null;
  } catch {
    return null;
  }
}

