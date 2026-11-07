self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Ultimate Macro';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: '/assets/pwa/dashboard-192.png',
    badge: '/assets/pwa/dashboard-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    data: { url: typeof payload.url === 'string' && payload.url.startsWith('/dashboard/') ? payload.url : '/dashboard/notifications/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = event.notification.data?.url || '/dashboard/notifications/';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin && client.url.includes('/dashboard/'));
    if (existing) { await existing.focus(); await existing.navigate(destination); return; }
    await self.clients.openWindow(destination);
  })());
});
