import { doc, setDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';

// ---------- Real server push (Firebase Cloud Messaging) ----------
// The "hoy es tu evento" alarm is now a REAL server push: a scheduled Cloud
// Function (functions/index.js) reads event_passes, finds every attendee whose
// event happens today and sends the FCM notification to the tokens registered
// here, so the user is alerted even with the app closed.

// Web Push VAPID public key. Generate it in Firebase Console → Project
// settings → Cloud Messaging → Web Push certificates, then set it as
// VITE_FIREBASE_VAPID_KEY (Vercel → Settings → Environment Variables).
const VAPID_PUBLIC_KEY: string =
  ((import.meta as any).env && (import.meta as any).env.VITE_FIREBASE_VAPID_KEY) || '';

let messaging: Messaging | null = null;

export function notificationsBrowserSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsBrowserSupported()) return 'unsupported';
  return Notification.permission;
}

async function ensureMessaging(): Promise<boolean> {
  if (!notificationsBrowserSupported()) return false;
  try {
    if (!(await isSupported())) return false;
    if (!messaging) messaging = getMessaging(getApp());
    return true;
  } catch {
    return false;
  }
}

// Registers the device token under users/{uid}/fcm_tokens/{token} so the
// scheduled Cloud Function can target this device. The users subcollection is
// already covered by the owner rules in firestore.rules.
export async function registerPushToken(uid: string): Promise<boolean> {
  try {
    if (!uid || !(await ensureMessaging())) return false;
    const token = await getToken(
      messaging!,
      VAPID_PUBLIC_KEY ? { vapidKey: VAPID_PUBLIC_KEY } : undefined
    );
    if (!token) return false;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    await setDoc(
      doc(db, 'users', uid, 'fcm_tokens', token),
      {
        token,
        uid,
        platform: /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'ios' : 'web',
        userAgent: ua,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (e) {
    console.warn('[push] token registration failed:', e);
    return false;
  }
}

// User-facing ask: requests the browser permission and, if granted, binds the
// device token to the signed-in account.
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
  if (permission === 'granted' && auth.currentUser) {
    await registerPushToken(auth.currentUser.uid);
  }
  return permission;
}

// Called once from main.tsx. Wires the foreground message handler and keeps
// the token registered across login/logout cycles.
export function initPushNotifications(): void {
  if (!notificationsBrowserSupported()) return;

  void (async () => {
    if (!(await ensureMessaging())) return;
    // Foreground messages: surface them as system notifications (the service
    // worker only handles background deliveries).
    onMessage(messaging!, (payload) => {
      try {
        const title = payload.notification?.title || 'AppSwinguer';
        const options: NotificationOptions = {
          body: payload.notification?.body || '',
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'appswinguer',
          data: (payload.data as any) || {},
        };
        navigator.serviceWorker
          .getRegistration('/firebase-messaging-sw.js')
          .then((reg) => (reg ? reg.showNotification(title, options) : undefined))
          .catch(() => undefined);
      } catch {
        /* display unsupported */
      }
    });
  })();

  onAuthStateChanged(auth, (user) => {
    if (user && Notification.permission === 'granted') {
      void registerPushToken(user.uid);
    }
  });
}
