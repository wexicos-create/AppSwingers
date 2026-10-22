// ---------- Public-photo decency guard ----------
// Policy: public profile information must never show nudes or semi-nudes;
// explicit content may only be shared through private messages. This module
// is an automatic first-level filter: it estimates the skin-like pixel ratio
// of a candidate public photo and blocks the upload when the ratio is high.
// It is a heuristic, not a legal verdict: human review and user reports
// complement it, and visibility 'match' (private) uploads skip the filter.

export const NO_NUDE_PUBLIC_MSG =
  'No permitimos desnudos ni semi-desnudos en fotos públicas de perfil. El contenido explícito únicamente puede compartirse por mensaje privado.';

export const NO_NUDE_PUBLIC_MSG_EN =
  'We do not allow nude or semi-nude photos on public profiles. Explicit content can only be shared through private messages.';

// Skin ratio above which the photo is considered likely explicit. Close-up
// portraits typically stay well under 0.40; full nudity usually exceeds 0.55.
const SKIN_RATIO_THRESHOLD = 0.48;

export interface PhotoInspection {
  ok: boolean;
  skinRatio: number;
  reason?: string;
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  // Classic RGB rule for skin tones.
  const rgbRule =
    r > 95 && g > 40 && b > 20 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
    Math.abs(r - g) > 15 && r > g && r > b;
  // YCbCr rule (Garcia & Tziritas): robust under varying lighting.
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ycbcrRule = y >= 80 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180;
  return rgbRule || ycbcrRule;
}

/**
 * Inspects a dataURL photo before it is attached to a public surface.
 * Returns ok=false when the estimated skin ratio exceeds the threshold.
 */
export async function inspectPublicPhoto(dataUrl: string): Promise<PhotoInspection> {
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    const S = 64;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: true, skinRatio: 0 };
    ctx.drawImage(img, 0, 0, S, S);
    const { data } = ctx.getImageData(0, 0, S, S);
    let skin = 0;
    const total = S * S;
    for (let i = 0; i < data.length; i += 4) {
      if (isSkinPixel(data[i], data[i + 1], data[i + 2])) skin++;
    }
    const skinRatio = skin / total;
    if (skinRatio >= SKIN_RATIO_THRESHOLD) {
      return { ok: false, skinRatio, reason: 'high_skin_ratio' };
    }
    return { ok: true, skinRatio };
  } catch {
    // If analysis is impossible, do not hard-block the upload; the human
    // review layer and reports remain in place.
    return { ok: true, skinRatio: 0, reason: 'analysis_unavailable' };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
