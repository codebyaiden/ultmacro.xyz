const DASHBOARD_PAGE_CACHE = 'um-dashboard-pages-v1';
const DASHBOARD_PAGE_PATHS = new Set([
  '/dashboard/overview/', '/dashboard/manage/', '/dashboard/activity/', '/dashboard/remote/',
  '/dashboard/earnings/', '/dashboard/strategies/', '/dashboard/health/', '/dashboard/devices/',
  '/dashboard/notifications/', '/dashboard/settings/'
]);

async function storeDashboardPage(url, response) {
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) return;
  const headers = new Headers(response.headers);
  headers.set('x-um-dashboard-cached-at', String(Date.now()));
  const cachedResponse = new Response(response.clone().body, { status: response.status, statusText: response.statusText, headers });
  const cache = await caches.open(DASHBOARD_PAGE_CACHE);
  await cache.put(url, cachedResponse);
}

async function refreshDashboardPage(url) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache', headers: { accept: 'text/html' } });
  await storeDashboardPage(url, response);
}

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const oldCaches = (await caches.keys()).filter(name => name.startsWith('um-dashboard-pages-') && name !== DASHBOARD_PAGE_CACHE);
  await Promise.all(oldCaches.map(name => caches.delete(name)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  const url = new URL(event.data?.url || '/', self.location.origin);
  if (event.data?.type !== 'prefetch-dashboard-page' || url.origin !== self.location.origin ||
      url.search || !DASHBOARD_PAGE_PATHS.has(url.pathname)) return;
  event.waitUntil(refreshDashboardPage(url.href).catch(() => {}));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search || !DASHBOARD_PAGE_PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(DASHBOARD_PAGE_CACHE);
    const cached = await cache.match(url.href);
    if (cached) {
      event.waitUntil(refreshDashboardPage(url.href).catch(() => {}));
      return cached;
    }
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.toLowerCase().includes('text/html'))
      event.waitUntil(storeDashboardPage(url.href, response.clone()).catch(() => {}));
    return response;
  })());
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Ultimate Macro';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: '/assets/pwa/dashboard-192.png?v=site-icon-20261107',
    badge: '/assets/pwa/dashboard-192.png?v=site-icon-20261107',
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
