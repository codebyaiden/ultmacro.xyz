import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../functions/assets/adcash-library.js', import.meta.url), 'utf8');
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const request = (path = '/assets/adcash-library', method = 'GET') => new Request(`https://ultmacro.xyz${path}`, { method, headers: { Cookie: 'private=never-forward', Authorization: 'never-forward' } });

test('routing is restricted to exactly the ad-library path', async () => {
  const routes = JSON.parse(await readFile(new URL('../_routes.json', import.meta.url)));
  // Functions now also serve dashboard API proxying and short links, so the include is broad and static files are excluded instead.
  assert.deepEqual(routes.include, ['/*']);
  assert.ok(!routes.exclude.includes('/assets/adcash-library'), 'ad library path must stay routed to Functions');
  assert.ok(!routes.exclude.some(p => p === '/api' || p.startsWith('/api/')), 'API routes must stay routed to Functions');
  assert.equal((await onRequest({ request: request('/api/auth') })).status, 404);
  assert.equal((await onRequest({ request: request('/assets/adcash-library?url=https://example.com') })).status, 404);
  assert.equal((await onRequest({ request: request(undefined, 'POST') })).status, 405);
});

test('fixed upstream, no visitor credentials, unchanged bytes, and HEAD support', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api-origin.ultmacro.xyz/assets/adcash-library.js');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.credentials, undefined);
      assert.deepEqual(options.headers, { Accept: 'application/javascript' });
      return new Response('/* vendor bytes */\nwindow.aclib = {};', { headers: { 'Content-Type': 'application/javascript' } });
    };
    const response = await onRequest({ request: request() });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await response.text(), '/* vendor bytes */\nwindow.aclib = {};');
    assert.equal(await (await onRequest({ request: request(undefined, 'HEAD') })).text(), '');
  } finally { globalThis.fetch = original; }
});

test('upstream failures, HTML, empty and oversized responses fail closed', async () => {
  const original = globalThis.fetch;
  try {
    for (const factory of [
      () => new Response('missing', { status: 404 }),
      () => new Response(null, { status: 302, headers: { Location: 'https://example.com/never-follow' } }),
      () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } }),
      () => new Response('<html>error</html>', { headers: { 'Content-Type': 'application/javascript' } }),
      () => new Response('', { headers: { 'Content-Type': 'application/javascript' } }),
      () => new Response('x'.repeat(2 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'application/javascript' } }),
      () => { throw new Error('offline'); },
    ]) {
      globalThis.fetch = async () => factory();
      const response = await onRequest({ request: request() });
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  } finally { globalThis.fetch = original; }
});
