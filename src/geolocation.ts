// ---------- Geolocation & search-radius recommendation ----------
// The app already requests GPS on startup; this module centralizes the
// helpers used to recommend a sensible search radius around the user.

export interface GeoPoint {
  lat: number;
  lng: number;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function requestLocationOnce(): Promise<GeoPoint | null> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * Radius recommendation for the discovery slider.
 * With the exact GPS position, nearby profiles are dense within ~5-6 km, so
 * the platform suggests starting at 6 km (and offers 5 km as a tighter,
 * privacy-preserving option). The user can widen the radius at any time.
 */
export function recommendRadiusKm(): number {
  return 6;
}

export const RADIUS_QUICK_OPTIONS = [5, 6, 15, 30, 50, 100];
