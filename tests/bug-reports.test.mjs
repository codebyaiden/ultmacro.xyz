import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createBugReportsHandler, MAX_BUG_REPORT_BYTES } from '../api/bug-reports.mjs';

const webhook = 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvWXYZABCDEFGHIJKLMNOPQRSTuvwxYZabcd';
const endpoint = 'https://ultmacro.xyz/api/bug-reports/v1/reports';
const fields = () => ({
  category: 'macro', version: 'v1.3.6', system: 'Windows 11', frequency: 'every-time',
  title: 'Macro stops upgrading at wave 20', steps: '1. Load strategy\n2. Start a game\n3. Wait for wave 20',
  expected: 'It should upgrade the tower normally.', actual: 'The tower stays at level zero.',
  notes: 'Map is Dead Ahead.', logExcerpt: '', website: '', consent: true, startedAt: Date.now() - 6000
});
const req = (body, headers = {}) => new Request(endpoint, {
  method: 'POST', headers: { origin: 'https://ultmacro.xyz', 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});
const fake = (options = {}) => {
  const calls = [], buckets = [];
  const handler = createBugReportsHandler({
    webhook: () => options.webhook === undefined ? webhook : options.webhook,
    limiter: async (bucket, limit, seconds) => { buckets.push({bucket,limit,seconds}); return { allowed: !options.blocked }; },
    ready: () => true,
    fetcher: async (url, request) => { calls.push({ url, request }); return { status: options.discordStatus || 204 }; }
  });
  return { handler, calls, buckets };
};

test('health reveals configuration state but never exposes webhook', async () => {
  const f = fake();
  const response = await f.handler(new Request('https://ultmacro.xyz/api/bug-reports/v1/health'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data, { ok: true, receiving: true });
  assert.ok(!JSON.stringify(data).includes('discord.com'));
  const missing = fake({ webhook: '' });
  assert.equal((await (await missing.handler(new Request('https://ultmacro.xyz/api/bug-reports/v1/health'))).json()).receiving, false);
});

test('valid report sends once, without mentioning users or publishing secrets', async () => {
  const f = fake();
  const response = await f.handler(req(fields()));
  assert.equal(response.status, 202);
  const body = await response.json();
  assert.match(body.receipt, /^UM-[A-F0-9]{12}$/);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, webhook);
  assert.equal(f.calls[0].request.redirect, 'error');
  const payload = JSON.parse(f.calls[0].request.body);
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.match(payload.embeds[0].title, /Macro stops/);
  assert.equal(payload.embeds[0].fields.length, 6);
  assert.ok(payload.embeds[0].footer.text.includes(body.receipt));
  assert.equal(f.buckets.length, 2);
});

test('rejects cross-origin and unreviewed private information', async () => {
  const f = fake();
  assert.equal((await f.handler(req(fields(), {origin:'https://evil.example'}))).status,403);
  assert.equal((await f.handler(req(fields(), {origin:''}))).status,403);
  assert.equal((await f.handler(req({...fields(),logExcerpt:'token=secretvalue'}))).status,422);
  assert.equal((await f.handler(req({...fields(),actual:'read this: https://example.com'}))).status,422);
  assert.equal((await f.handler(req({...fields(),website:'bot-field'}))).status,422);
  assert.equal((await f.handler(req({...fields(),consent:false}))).status,422);
  assert.equal((await f.handler(req({...fields(),title:'short'}))).status,422);
  assert.equal((await f.handler(req({...fields(),notes:'x'.repeat(700)}))).status,422);
  assert.equal((await f.handler(req({...fields(),startedAt:Date.now()}))).status,422);
  assert.equal((await f.handler(req({...fields(),category:'website',version:'not-applicable',system:'iOS / iPadOS'}))).status,202);
  assert.equal(f.calls.length,1);
});

test('limits payload sizes, validates content type and handles Discord errors', async () => {
  const f = fake({discordStatus:429});
  assert.equal((await f.handler(req('x'.repeat(MAX_BUG_REPORT_BYTES + 2)))).status,413);
  assert.equal((await f.handler(req(fields(),{'content-type':'text/plain'}))).status,415);
  assert.equal((await f.handler(req(fields()))).status,503);
  assert.equal(f.calls.length,1);
  const limited = fake({blocked:true});
  assert.equal((await limited.handler(req(fields()))).status,429);
  assert.equal(limited.calls.length,0);
  const unavailable = fake({webhook:''});
  assert.equal((await unavailable.handler(req(fields()))).status,503);
  assert.equal(unavailable.calls.length,0);
});

test('report page is linked, has a privacy review and contains no webhook', async () => {
  const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');
  const html = await read('report/index.html');
  const client = await read('src/bug-report.js');
  const css = await read('styles/bug-report.css');
  const server = await read('server.mjs');
  const home = await read('index.html');
  const download = await read('download/index.html');
  new vm.Script(client);
  assert.match(html, /id="bug-form"/);
  assert.match(html, /id="report-preview"/);
  assert.match(html, /type="checkbox" name="consent"/);
  assert.match(client, /fetch\('\/api\/bug-reports\/v1\/reports'/);
  assert.match(server, /MAX_BUG_REPORT_BYTES/);
  assert.match(home, /href="\/report\/"/);
  assert.match(download, /href="\/report\/"/);
  assert.match(css, /max-width:520px/);
  assert.doesNotMatch(html + client + css, /discord\.com\/api\/webhooks\//);
});
