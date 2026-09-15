const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

export function error(message, status = 400, details = undefined) {
  return json({ error: message, ...(details ? { details } : {}) }, status);
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 });
  }
}

export function routePath(request, prefix) {
  const url = new URL(request.url);
  const forwarded = url.searchParams.get('path');
  const path = forwarded || url.pathname.replace(prefix, '') || '/';
  return `/${path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export function methodNotAllowed(methods) {
  return json({ error: 'Method not allowed.' }, 405, { allow: methods.join(', ') });
}

export function requestOriginMatches(request) {
  const source = request.headers.get('origin') || request.headers.get('referer');
  if (!source) return true;
  try {
    const sourceUrl = new URL(source);
    const publicHosts = new Set(['ultmacro.xyz', 'www.ultmacro.xyz']);
    if (!publicHosts.has(sourceUrl.hostname)) return false;
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
    const requestHost = String(forwardedHost).split(',')[0].trim().split(':')[0].toLowerCase();
    return !publicHosts.has(requestHost) || requestHost === sourceUrl.hostname;
  } catch {
    return false;
  }
}

export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}