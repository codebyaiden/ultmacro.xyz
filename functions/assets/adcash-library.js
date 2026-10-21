// Pages removes the final .js extension: route = /assets/adcash-library.
// Only this fixed, public VPS file is exposed. Never forward visitor headers.
const UPSTREAM = 'https://api-origin.ultmacro.xyz/assets/adcash-library.js';
const LIMIT = 2 * 1024 * 1024;

function unavailable() {
  return new Response('Ad library unavailable', {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function onRequest({ request }) {
  const url = new URL(request.url);
  if (url.pathname !== '/assets/adcash-library' || url.search) {
    return new Response('Not found', { status: 404 });
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'GET', redirect: 'error', credentials: 'omit',
      headers: { Accept: 'application/javascript' },
      signal: AbortSignal.timeout(10000),
    });
    if (upstream.status !== 200 || !upstream.body ||
        !/^(?:application|text)\/(?:javascript|x-javascript|ecmascript)(?:;|$)/i.test(upstream.headers.get('Content-Type') || '')) {
      await upstream.body?.cancel();
      return unavailable();
    }
    // Bound the actual stream, not just a potentially missing Content-Length.
    const reader = upstream.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LIMIT) { await reader.cancel(); return unavailable(); }
      chunks.push(value);
    }
    if (!size) return unavailable();
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    if (/^\s*</.test(new TextDecoder().decode(bytes.subarray(0, 256)))) return unavailable();
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch {
    // No raw upstream responses, visitor data or credentials in diagnostics.
    console.error(JSON.stringify({ event: 'adcash_library_unavailable' }));
    return unavailable();
  }
}
