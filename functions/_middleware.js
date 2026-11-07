const ACCESS_COOKIE = 'um_dashboard_preview';
const ACCESS_MS = 7 * 24 * 60 * 60 * 1000;
const PAIRED_ACCESS_MS = 180 * 24 * 60 * 60 * 1000;
const API_ORIGIN = 'https://api-origin.ultmacro.xyz';
const encoder = new TextEncoder();

function password(env) {
  const value = env.DASHBOARD_ACCESS_PASSWORD || '';
  return value.length >= 32 ? value : '';
}

function cookieValue(request) {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [name, ...pieces] = part.trim().split('=');
    if (name === ACCESS_COOKIE) {
      try { return decodeURIComponent(pieces.join('=')); } catch { return ''; }
    }
  }
  return '';
}

function decodeBase64Url(value) {
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch { return new Uint8Array(); }
}

async function signature(key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

async function hasAccess(request, env) {
  const key = password(env);
  if (!key) return false;
  const [expiryText, nonce, suppliedText, extra] = cookieValue(request).split('.');
  if (!expiryText || !nonce || !suppliedText || extra) return false;
  const expires = Number(expiryText), now = Date.now();
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + PAIRED_ACCESS_MS + 60_000) return false;
  const expected = await signature(key, `${expiryText}.${nonce}`);
  const supplied = decodeBase64Url(suppliedText);
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ supplied[i];
  return difference === 0;
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function accessPage(invalid = false) {
  const error = invalid ? '<p class="error" role="alert">That password did not match. Try again.</p>' : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#09090b"><title>Private preview · Ultimate Macro</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#09090b;color:#f4f4f5;font:16px/1.5 Geist,Inter,system-ui,sans-serif}.panel{width:min(100%,420px);padding:32px;border:1px solid #29292e;border-radius:24px;background:#101012;box-shadow:0 28px 90px #0008}a{color:inherit;text-decoration:none;font-weight:600}h1{font-size:26px;letter-spacing:-.04em;margin:38px 0 8px}p{color:#a1a1aa;margin:0 0 22px}.error{color:#ffaaa9;margin:0 0 14px}label{display:block;font-size:13px;color:#c4c4ca;margin-bottom:8px}input{width:100%;height:48px;border:1px solid #35353b;border-radius:14px;background:#0b0b0d;color:#fff;padding:0 14px;font:inherit;outline:none}input:focus{border-color:#a78bfa}button{width:100%;height:48px;margin-top:14px;border:0;border-radius:999px;background:#f4f4f5;color:#111;font:600 15px/1.2 Geist,Inter,system-ui,sans-serif;cursor:pointer}button:hover{background:#fff}button:active{transform:scale(.99)}
</style></head><body><main class="panel"><a href="/">Ultimate Macro</a><h1>Private dashboard preview</h1><p>Enter the preview password to continue.</p>${error}<form method="post" action="/dashboard/access/login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Open Dashboard</button></form></main></body></html>`;
}

function html(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
}

function cookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ACCESS_COOKIE}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict${secure}`;
}

async function accessCookie(request, env, lifetime = ACCESS_MS) {
  const expires = Date.now() + lifetime;
  const payload = `${expires}.${base64Url(crypto.getRandomValues(new Uint8Array(24)))}`;
  const signed = `${payload}.${base64Url(await signature(password(env), payload))}`;
  return cookie(request, signed, lifetime / 1000);
}

async function readLoginBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 4096) { await reader.cancel(); throw new Error('request too large'); }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(data);
}

async function login(request, env) {
  const key = password(env);
  if (!key) return new Response('Private dashboard access is not configured.', { status: 503, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'POST' } });
  let body;
  try { body = new URLSearchParams(await readLoginBody(request)); }
  catch { return new Response('Request too large.', { status: 413 }); }
  const supplied = encoder.encode(body.get('password') || '');
  const expected = encoder.encode(key);
  let valid = supplied.length === expected.length;
  if (valid) {
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ supplied[i];
    valid = difference === 0;
  }
  if (!valid) return html(accessPage(true), 401);
  const signedCookie = await accessCookie(request, env);
  return new Response(null, { status: 303, headers: { location: '/dashboard/overview/', 'set-cookie': signedCookie, 'cache-control': 'no-store' } });
}

function isUnauthenticatedApiEndpoint(request, pathname) {
  return pathname === '/api/dashboard/v1/pairing/claim' || pathname === '/api/dashboard/v1/heartbeat' || pathname === '/api/dashboard/v1/device/disconnect'
    || (pathname === '/api/dashboard/v1/events' && request.method === 'POST');
}

async function proxyDashboardApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, API_ORIGIN);
  const forwarded = new Request(target, request);
  forwarded.headers.set('origin', API_ORIGIN);
  forwarded.headers.set('x-forwarded-proto', 'https');
  forwarded.headers.delete('x-forwarded-host');
  return fetch(forwarded);
}

async function claimBrowserLink(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin) return new Response('Cross-site request rejected.', { status: 403 });
  if (!password(env)) return new Response('Private dashboard access is not configured.', { status: 503, headers: { 'cache-control': 'no-store' } });

  const upstream = await proxyDashboardApi(request);
  if (!upstream.ok) return upstream;
  const headers = new Headers(upstream.headers);
  headers.append('set-cookie', await accessCookie(request, env, PAIRED_ACCESS_MS));
  headers.set('cache-control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  const pathname = new URL(request.url).pathname;

  if (pathname === '/dashboard/access/login') return login(request, env);

  if (pathname === '/api/dashboard/v1/browser-links/claim') return claimBrowserLink(request, env);

  if (pathname === '/dashboard/access' || pathname === '/dashboard/access/') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (!password(env)) return new Response('Private dashboard access is not configured.', { status: 503, headers: { 'cache-control': 'no-store' } });
    return html(accessPage());
  }

  if (pathname === '/api/dashboard/v1' || pathname.startsWith('/api/dashboard/v1/')) {
    if (!isUnauthenticatedApiEndpoint(request, pathname) && pathname !== '/api/dashboard/v1/browser-links/claim' && !await hasAccess(request, env)) return new Response('Not found.', { status: 404, headers: { 'cache-control': 'no-store' } });
    return proxyDashboardApi(request);
  }

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (!password(env) || !await hasAccess(request, env)) {
      if (pathname === '/dashboard' || pathname === '/dashboard/') return context.next();
      return Response.redirect(new URL('/dashboard/', request.url), 302);
    }
    if (pathname === '/dashboard' || pathname === '/dashboard/') return Response.redirect(new URL('/dashboard/overview/', request.url), 302);
  }

  return context.next();
}
