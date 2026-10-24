// ---------- Local notifications (database-free, no external push service) ----------
// The previous Firebase Cloud Messaging integration was removed together with
// the database. The app now shows its own in-app toasts and can request the
// browser notification permission to surface local reminders while it is open.

export function notificationsBrowserSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsBrowserSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * User-facing ask: requests the browser permission and stores a local
 * opt-in marker for this device. No token and no server involved.
 */
export async function enablePushNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsBrowserSupported()) return 'unsupported';
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }
  if (permission === 'granted') {
    try {
      localStorage.setItem('appswinguer_push_optin', JSON.stringify({ ts: Date.now() }));
    } catch {
      /* ignore */
    }
  }
  return permission;
}

/**
 * Called once from main.tsx. Safe no-op: with no backend there is no
 * background delivery; in-app toasts and local notifications cover the flows.
 */
export function initPushNotifications(): void {
  /* intentionally empty (local mode) */
}
