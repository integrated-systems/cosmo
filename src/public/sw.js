// Cosmo — push notification-ий минимал service worker (2026-08-27,
// дэвшилтэт зүйл #7). Зөвхөн 'push' болон 'notificationclick' event-үүдийг
// барьдаг, өөр ямар ч cache/offline логик агуулаагүй.

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Cosmo';
  const options = {
    body: data.body || '',
    icon: '/cosmo/android-chrome-192x192.png',
    badge: '/cosmo/favicon-32x32.png',
    data: { url: data.url || '/cosmo/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/cosmo/';
  event.waitUntil(clients.openWindow(url));
});
