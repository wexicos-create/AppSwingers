// ---------- Device permissions: camera, microphone, location, notifications ----------
// Centralized manager so every feature (identity verification INE capture,
// WebRTC video calls, geolocation radius search) requests permissions the
// same way, and users can pre-grant or review them from their profile.
// Web apps request these at runtime through the browser; the PWA manifest
// (public/manifest.webmanifest) plus the Permissions-Policy header in
// vercel.json declare the app as a legitimate consumer of each API.

export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';

// Reads the current status without prompting (Permissions API).
export async function queryPermissionState(
  name: 'camera' | 'microphone' | 'geolocation'
): Promise<PermState> {
  try {
    if (typeof navigator === 'undefined' || !(navigator as any).permissions?.query) {
      return 'unsupported';
    }
    const status = await (navigator as any).permissions.query({ name });
    if (status?.state === 'granted' || status?.state === 'denied' || status?.state === 'prompt') {
      return status.state as PermState;
    }
    return 'unsupported';
  } catch {
    // Firefox throws on camera/microphone queries; treat as not reportable.
    return 'unsupported';
  }
}

// getUserMedia probe: triggers the real browser prompt, then immediately
// releases the stream so no indicator stays on.
async function probeMedia(constraints: MediaStreamConstraints): Promise<PermState> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'unsupported';
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') return 'denied';
    return 'unsupported';
  }
}

export function requestCameraPermission(): Promise<PermState> {
  return probeMedia({ video: true });
}

export function requestMicrophonePermission(): Promise<PermState> {
  return probeMedia({ audio: true });
}

export function requestGeolocationPermission(): Promise<PermState> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'unsupported'),
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Called before a WebRTC video call: guarantees both camera and microphone in
// one step so the call never starts half-permitted.
export async function ensureCallPermissions(): Promise<{ camera: PermState; microphone: PermState }> {
  const camera = await requestCameraPermission();
  const microphone = await requestMicrophonePermission();
  return { camera, microphone };
}

export async function getPermissionsReport(): Promise<{
  camera: PermState;
  microphone: PermState;
  geolocation: PermState;
}> {
  const [camera, microphone, geolocation] = await Promise.all([
    queryPermissionState('camera'),
    queryPermissionState('microphone'),
    queryPermissionState('geolocation'),
  ]);
  return { camera, microphone, geolocation };
}
