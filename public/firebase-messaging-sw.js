/* AppSwinguer Ultra Plus - Firebase Cloud Messaging service worker.
 * Background push delivery: the scheduled Cloud Function
 * (functions/index.js) sends the "hoy es tu evento" alarm to every attendee
 * with an event today; this worker displays it while the app is closed or in
 * the background. The Firebase JS SDK registers this file automatically at
 * the root scope. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'appswinger-efa68',
  appId: '1:509755916067:web:bd84d5a2b78035954d1696',
  apiKey: 'AIzaSyCe_fgowPvASAJeTD9QkgHo-Hi4LekLt3A',
  authDomain: 'appswinger-efa68.firebaseapp.com',
  messagingSenderId: '509755916067',
  storageBucket: 'appswinger-efa68.firebasestorage.app',
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
