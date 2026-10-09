import test from 'node:test';
import assert from 'node:assert/strict';
import api from '../api/wiki.mjs';
import { articles } from '../wiki/content.mjs';
import { proposedTopics } from '../wiki/catalog.mjs';

const request = (path, init = {}) => new Request('https://ultmacro.xyz' + path, init);
const get = path => api(request(path));

test('API discovery and OpenAPI spec', async () => {
  const res = await get('/api/wiki/v1');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  const data = await res.json();
  assert.equal(data.totalPublished, articles.length);
  assert.equal(data.researchTopicsIncluded, false);
  const doc = await (await get('/api/wiki/v1/openapi.json')).json();
  assert.equal(doc.openapi, '3.1.0');
  assert.ok(doc.paths['/api/wiki/v1/articles/{slug}']);
});

test('paginated list returns source-linked published articles only', async () => {
  const r = await get('/api/wiki/v1/articles?limit=8&offset=1');
  const data = await r.json();
  assert.equal(data.data.length, 8);
  assert.equal(data.pagination.total, articles.length);
  assert.ok(data.data.every(x => x.source && x.url.startsWith('https://ultmacro.xyz/wiki/?article=')));
  assert.ok(!data.data.some(x => 'status' in x && x.status !== 'published'));
});

test('full article includes sections and a canonical citation URL', async () => {
  const r = await get('/api/wiki/v1/articles/wrong-clicks');
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.slug, 'wrong-clicks');
  assert.equal(data.status, 'published');
  assert.ok(data.sections.length);
  assert.match(data.url, /wiki\/\?article=wrong-clicks$/);
});

test('search returns real guides and excludes research-only topics', async () => {
  const result = await (await get('/api/wiki/v1/search?q=ocr')).json();
  assert.ok(result.data.length);
  assert.equal(result.note.includes('Only published'), true);
  const known = new Set(articles.map(x => x.slug));
  assert.ok(result.data.every(x => known.has(x.slug)));
  const researchOnly = proposedTopics.find(t => !known.has(t.slug));
  assert.ok(researchOnly);
  assert.ok(!result.data.some(x => x.slug === researchOnly.slug));
});

test('invalid requests have bounded errors, no accidental write methods', async () => {
  for (const p of ['/api/wiki/v1/search?q=', '/api/wiki/v1/articles?limit=900', '/api/wiki/v1/articles/NOPE',
    '/api/wiki/v1/articles/not-real']) assert.ok([400,404].includes((await get(p)).status));
  assert.equal((await api(request('/api/wiki/v1/articles',{method:'POST'}))).status,405);
  assert.equal((await api(request('/api/wiki/v1/search?q=ocr',{method:'OPTIONS'}))).status,204);
  const head = await api(request('/api/wiki/v1/articles/install',{method:'HEAD'}));
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
});

test('ETag allows conditional requests and CORS caching', async () => {
  const first = await get('/api/wiki/v1/articles/install');
  const etag = first.headers.get('etag');
  assert.ok(etag);
  const second = await api(request('/api/wiki/v1/articles/install',{headers:{'if-none-match':etag}}));
  assert.equal(second.status,304);
  assert.equal(second.headers.get('access-control-allow-origin'), '*');
});
