const API_ORIGIN = 'https://api-origin.ultmacro.xyz';

async function proxyDashboardApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN);
  const forwarded = new Request(target, request);
  forwarded.headers.set('origin', API_ORIGIN);
  forwarded.headers.set('x-forwarded-proto', 'https');
  forwarded.headers.delete('x-forwarded-host');
  return fetch(forwarded);
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const { pathname } = url;

  // The preview password flow is retired. Keep its old links useful by sending
  // visitors to the public pairing entry point.
  if (pathname === '/dashboard/access/login') {
    return new Response(null, { status: 303, headers: { location: '/dashboard/', 'cache-control': 'no-store' } });
  }
  if (pathname === '/dashboard/access' || pathname === '/dashboard/access/') {
    return Response.redirect(new URL('/dashboard/', url), 302);
  }

  if (pathname === '/api/dashboard/v1' || pathname.startsWith('/api/dashboard/v1/')) {
    if (pathname === '/api/dashboard/v1/browser-links/claim') {
      if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers: { allow: 'POST' } });
      if (request.headers.get('origin') !== url.origin) return new Response('Cross-site request rejected.', { status: 403 });
    }
    // Dashboard data routes enforce per-browser owner sessions in the API;
    // desktop upload and control routes enforce the paired device token.
    return proxyDashboardApi(request);
  }

  if (pathname === '/dashboard') return Response.redirect(new URL('/dashboard/', url), 308);
  return context.next();
}
