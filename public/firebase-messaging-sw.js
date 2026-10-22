/* AppSwinguer Ultra Plus - Firebase Cloud Messaging service worker.
 * Background push delivery: the scheduled Cloud Function
 * (functions/index.js) sends the "hoy es tu evento" alarm to every attendee
 * with an event today; this worker displays it while the app is closed or in
 * the background. The Firebase JS SDK registers this file automatically at
 * the root scope. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'groovy-outcome-g8f9p',
  appId: '1:750229453194:web:f0c2a489c124dc7056b073',
  apiKey: 'AIzaSyC6R5ozuM9NUaA641_9tDxIMt6tZ26P6ik',
  authDomain: 'groovy-outcome-g8f9p.firebaseapp.com',
  messagingSenderId: '750229453194',
  storageBucket: 'groovy-outcome-g8f9p.firebasestorage.app',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'AppSwinguer';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: (payload.data && payload.data.tag) || 'appswinguer-event',
    data: (payload.data || {}),
  });
});

/* Focus the app when the user taps the notification. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow('/');
    })()
  );
});
