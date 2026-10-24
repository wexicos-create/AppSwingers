import { docSet, docQuery } from './store';
import { ProfileRating } from './types';

// ---------- Calificaciones anonimas de perfil tras abandonar un chat ----------
// Coleccion 'profile_ratings' (tabla app_profile_ratings en Supabase):
// estrellas 1-5 + tipo de encuentro + etiquetas de reputacion + comentario.

export function newProfileRating(params: {
  raterUid: string | null;
  raterName: string;
  targetProfileId: string;
  targetName: string;
  stars: number;
  encounterType: string;
  tags: string[];
  comment: string;
}): ProfileRating {
  return {
    id: 'pr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    raterUid: params.raterUid,
    raterName: params.raterName,
    targetProfileId: params.targetProfileId,
    targetName: params.targetName,
    stars: params.stars,
    encounterType: params.encounterType,
    tags: params.tags,
    comment: params.comment,
    ts: Date.now(),
  };
}

export async function saveProfileRating(rating: ProfileRating): Promise<boolean> {
  try {
    return docSet('profile_ratings', rating.id, rating);
  } catch {
    return false;
  }
}

export async function fetchRatingsForProfile(targetProfileId: string): Promise<ProfileRating[]> {
  try {
    return docQuery<ProfileRating>('profile_ratings', 'targetProfileId', targetProfileId);
  } catch {
    return [];
  }
}

export interface ProfileRatingSummary {
  avg: number;
  count: number;
  good: number; // 4-5 estrellas
  regular: number; // 3 estrellas
  bad: number; // 1-2 estrellas
}

export function summarizeProfileRatings(ratings: ProfileRating[]): ProfileRatingSummary {
  if (ratings.length === 0) return { avg: 0, count: 0, good: 0, regular: 0, bad: 0 };
  const good = ratings.filter(r => r.stars >= 4).length;
  const regular = ratings.filter(r => r.stars === 3).length;
  const bad = ratings.filter(r => r.stars <= 2).length;
  const avg = Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10;
  return { avg, count: ratings.length, good, regular, bad };
}
