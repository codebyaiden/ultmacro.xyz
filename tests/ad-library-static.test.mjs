import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { AD_LIBRARY, verifyAdLibrary, downloadAdLibrary } from '../scripts/sync-ad-library.mjs';

const root = new URL('../', import.meta.url);
const asset = await readFile(new URL('assets/adcash-library', root));

test('static library contains exactly the pinned approved bytes with JavaScript headers', async () => {
  assert.equal(verifyAdLibrary(asset), asset);
  const headers = await readFile(new URL('_headers', root), 'utf8');
  assert.match(headers, /^\/assets\/adcash-library\n\s+Content-Type: application\/javascript; charset=utf-8/m);
  for (const header of ['X-Content-Type-Options: nosniff', 'Cross-Origin-Resource-Policy: same-origin', 'Cache-Control: no-store']) assert(headers.includes(header));
  const routes = JSON.parse(await readFile(new URL('_routes.json', root)));
  assert(routes.exclude.includes('/assets/adcash-library'));
  assert.match(await readFile(new URL('.gitattributes', root), 'utf8'), /^\/assets\/adcash-library -text$/m);
  const config = JSON.parse(await readFile(new URL('data/advertising.json', root)));
  assert.equal(config.provider, 'Adcash');
  assert.equal(config.scriptUrl, '/assets/adcash-library');
  assert.equal(config.zoneId, 'nmmtb0xi2i');
});

test('maintenance copies only the fixed public library without visitor information', async () => {
  const result = await downloadAdLibrary(async (url, options) => {
    assert.equal(url, AD_LIBRARY.source);
    assert.deepEqual(options.headers, { Accept: 'application/javascript' });
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    return new Response(asset, { headers: { 'content-type': 'application/javascript' } });
  });
  assert.deepEqual(result, asset);
});

test('maintenance rejects HTML, redirects, changed code, oversized responses and network errors', async () => {
  const changed = Buffer.from(asset); changed[changed.length - 2] ^= 1;
  for (const response of [
    () => new Response('not found', { status: 404 }),
    () => new Response(null, { status: 302, headers: { location: 'https://example.com' } }),
    () => new Response('<html>wrong page</html>', { headers: { 'content-type': 'text/html' } }),
    () => new Response('<html>wrong page</html>', { headers: { 'content-type': 'application/javascript' } }),
    () => new Response(changed, { headers: { 'content-type': 'application/javascript' } }),
    () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/javascript' } }),
    () => { throw Error('offline'); },
  ]) await assert.rejects(downloadAdLibrary(async () => response()));
});

test('static server sends the real library instead of the homepage, including HEAD and query safety', async () => {
  const child = spawn(process.execPath, ['server.mjs'], { cwd: root, windowsHide: true, env: { ...process.env, HOST: '127.0.0.1', PORT: '0', DATABASE_URL: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Static server startup timeout')), 10000);
      child.stdout.on('data', chunk => {
        const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(Error('Static server exited before startup')); });
    });
    for (const path of ['/assets/adcash-library', '/assets/adcash-library?url=https://example.com/never-fetch']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^application\/javascript/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      verifyAdLibrary(Buffer.from(await response.arrayBuffer()));
    }
    const head = await fetch(base + '/assets/adcash-library', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const post = await fetch(base + '/assets/adcash-library', { method: 'POST', body: '' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
  } finally {
    if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
  }
});
