self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Task Complete';
  const options = {
    body: data.body || '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: { tabId: data.tabId, workspaceId: data.workspaceId },
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const visible = windowClients.some((c) => c.visibilityState === 'visible');
      if (visible) return;
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { tabId, workspaceId } = event.notification.data || {};
  const url = tabId && workspaceId ? `/?ws=${workspaceId}&tab=${tabId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: 'notification-click', tabId, workspaceId });
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
