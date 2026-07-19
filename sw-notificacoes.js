/* Assistência Gerencial — Service Worker de Notificações V48.2 */

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({
            type: 'SOPHIA_NOTIFICATION_CLICK',
            notificationId: data.notificationId || '',
            itemType: data.type || '',
            itemId: data.itemId || ''
          });
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
