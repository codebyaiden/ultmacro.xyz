import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from './_lib/db.mjs';
import { getAdminSession, rateLimit } from './_lib/security.mjs';
import { requestOriginMatches, clientIp, json } from './_lib/http.mjs';

// The shared QA token can upload strictly validated text reports. It cannot read
// reports, see the private webhook, access the database or send arbitrary Discord messages.
const QA_TOKEN_DIGEST = 'c6f1ab68f35a9ddf9849d092cf60bb11b124cbbff68e29c3517a78ef939ee999';
const MAX_REPORT = 140000;
const RUN_ID = /^[a-f0-9]{32}$/;
let schemaReady;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const respond = (data, status = 200) => json(data, status);

function validateWebhook(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['discord.com', 'discordapp.com'].includes(url.hostname) && url.protocol === 'https:' && !url.port &&
      !url.username && !url.password && !url.search && !url.hash &&
      /^\/api\/webhooks\/[0-9]{12,25}\/[a-zA-Z0-9_-]{40,160}$/.test(url.pathname);
  } catch { return false; }
}
function keyFor(secret) {
  if (!secret || secret.length < 24) throw new Error('STRATEGY_HASH_SECRET must be configured');
  return createHash('sha256').update('um-qa-logs-webhook-v1:').update(secret).digest();
}
function encrypt(text, secret) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(secret), nonce);
  const bytes = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), bytes]).toString('base64url');
}
function decrypt(text, secret) {
  const bytes = Buffer.from(text, 'base64url');
  if (bytes.length < 29) throw new Error('Invalid webhook configuration');
  const decipher = createDecipheriv('aes-256-gcm', keyFor(secret), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}
export function reportIsSafe(text, runId) {
  if (!RUN_ID.test(runId) || Buffer.byteLength(text, 'utf8') < 70 || Buffer.byteLength(text, 'utf8') > MAX_REPORT) return false;
  if (!text.startsWith('ULTIMATE MACRO - AUTOMATED LOGS v1') ||
      !text.includes('\nrun_id=' + runId + '\n') ||
      !text.includes('\nconsent=yes\n') ||
      !/(?:^|\n)finished_at=\d{4}-\d{2}-\d{2} /.test(text)) return false;
  if (/https?:\/\/|[a-z0-9_.+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:password|secret|authorization|api[_-]?key|uploadtoken)\s*[:=]|[a-z]:\\users\\/i.test(text)) return false;
  return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
}
async function initialize(db) {
  await db("create table if not exists um_qa_logs_config (id integer primary key check (id=1), encrypted_webhook text, enabled boolean not null default false, updated_at timestamptz not null default now())");
  await db("create table if not exists um_qa_log_runs (run_id text primary key, status text not null check (status in ('processing','sent','failed')), attempts integer not null default 1, updated_at timestamptz not null default now(), sent_at timestamptz)");
}
function prepare(db) {
  if (db !== query) return initialize(db);
  schemaReady ||= initialize(db).catch(error => { schemaReady = undefined; throw error; });
  return schemaReady;
}
async function sendDiscord(webhook, text, runId, fetcher) {
  const form = new FormData();
  form.set('payload_json', JSON.stringify({
    username: 'UM QA Diagnostics',
    content: 'Ultimate Macro private QA report | run ' + runId.slice(0, 12),
    allowed_mentions: { parse: [] }
  }));
  form.set('files[0]', new Blob([text], { type: 'text/plain;charset=utf-8' }), 'um-qa-' + runId + '.txt');
  const r = await fetcher(webhook, { method: 'POST', body: form, signal: AbortSignal.timeout(13000), redirect: 'error' });
  return r.status === 200 || r.status === 204;
}
function validBearer(header, expectedDigest) {
  const m = /^Bearer ([A-Za-z0-9_-]{40,128})$/.exec(header || '');
  return Boolean(m) && timingSafeEqual(Buffer.from(sha256(m[1]), 'hex'), Buffer.from(expectedDigest, 'hex'));
}

export function createAutomatedLogsHandler({ db = query, fetcher = fetch, getSession = getAdminSession,
  limiter = rateLimit, secret = process.env.STRATEGY_HASH_SECRET || '',
  tokenDigest = QA_TOKEN_DIGEST } = {}) {
  return async function automatedLogs(request) {
    const pathname = new URL(request.url).pathname;
    const prefix = '/api/automated-logs/v1';
    if (!pathname.startsWith(prefix + '/')) return respond({ error: 'Not found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    const route = pathname.slice(prefix.length);
    if (route === '/health' && request.method === 'GET') {
      try {
        await prepare(db);
        const row = (await db('select enabled, encrypted_webhook from um_qa_logs_config where id=1'))[0];
        return respond({ ok: true, receiving: Boolean(row?.enabled && row?.encrypted_webhook), service: 'um-qa-logs' });
      } catch { return respond({ ok: false, receiving: false }, 503); }
    }
    if (route.startsWith('/admin/')) {
      if (!['GET', 'POST'].includes(request.method)) return respond({ error: 'Method not allowed' }, 405);
      try {
        if (!await getSession(request)) return respond({ error: 'Admin access required' }, 401);
        if (request.method === 'POST' && !requestOriginMatches(request)) return respond({ error: 'Origin mismatch' }, 403);
        await prepare(db);
        if (route === '/admin/status' && request.method === 'GET') {
          const row = (await db('select enabled,encrypted_webhook,updated_at from um_qa_logs_config where id=1'))[0];
          return respond({ configured: Boolean(row?.encrypted_webhook), enabled: Boolean(row?.enabled), updatedAt: row?.updated_at || null });
        }
        if (route === '/admin/config' && request.method === 'POST') {
          const data = await request.json();
          if (!validateWebhook(data?.webhook)) return respond({ error: 'Invalid Discord webhook URL' }, 422);
          const sealed = encrypt(data.webhook.trim(), secret);
          await db('insert into um_qa_logs_config (id,encrypted_webhook,enabled) values (1,$1,true) on conflict(id) do update set encrypted_webhook=excluded.encrypted_webhook,enabled=true,updated_at=now()', [sealed]);
          return respond({ ok: true, configured: true, enabled: true });
        }
        if (route === '/admin/disable' && request.method === 'POST') {
          await db('update um_qa_logs_config set enabled=false,updated_at=now() where id=1');
          return respond({ ok: true, enabled: false });
        }
        if (route === '/admin/test' && request.method === 'POST') {
          const row = (await db('select enabled,encrypted_webhook from um_qa_logs_config where id=1'))[0];
          if (!row?.enabled || !row?.encrypted_webhook) return respond({ error: 'Configure webhook first' }, 503);
          const id = randomBytes(16).toString('hex');
          const report = 'ULTIMATE MACRO - AUTOMATED LOGS v1\nrun_id=' + id + '\nconsent=yes\nsource=admin_delivery_test\nfinished_at=' + new Date().toISOString().replace('T', ' ').slice(0, 19) + '\nresult=API_DELIVERY_TEST\n';
          const good = await sendDiscord(decrypt(row.encrypted_webhook, secret), report, id, fetcher);
          return respond(good ? { ok: true, delivered: true } : { ok: false, delivered: false, error: 'Discord rejected delivery' }, good ? 200 : 502);
        }
        return respond({ error: 'Not found' }, 404);
      } catch { return respond({ error: 'Admin operation failed' }, 503); }
    }
    if (route !== '/reports') return respond({ error: 'Not found' }, 404);
    if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
    if (!validBearer(request.headers.get('authorization'), tokenDigest)) return respond({ error: 'Unauthorized' }, 401);
    const runId = request.headers.get('x-um-run-id') || '';
    if (!RUN_ID.test(runId)) return respond({ error: 'Invalid run id' }, 422);
    if (!String(request.headers.get('content-type') || '').toLowerCase().startsWith('text/plain')) return respond({ error: 'Invalid content type' }, 415);
    let bytes;
    try { bytes = new Uint8Array(await request.arrayBuffer()); } catch { return respond({ error: 'Invalid report body' }, 422); }
    if (bytes.length > MAX_REPORT) return respond({ error: 'Report too large' }, 413);
    let report;
    try { report = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return respond({ error: 'Invalid UTF-8' }, 422); }
    if (!reportIsSafe(report, runId)) return respond({ error: 'Invalid report' }, 422);
    try {
      await prepare(db);
      const ip = clientIp(request);
      const [accountRate, ipRate] = await Promise.all([limiter('um-qa:shared', 120, 600), limiter('um-qa:ip:' + ip, 35, 600)]);
      if (!accountRate.allowed || !ipRate.allowed) return respond({ error: 'Rate limited' }, 429);
      const config = (await db('select enabled,encrypted_webhook from um_qa_logs_config where id=1'))[0];
      if (!config?.enabled || !config?.encrypted_webhook) return respond({ error: 'Discord relay not configured' }, 503);
      const reserved = await db("insert into um_qa_log_runs (run_id,status) values ($1,'processing') on conflict (run_id) do update set status='processing',attempts=um_qa_log_runs.attempts+1,updated_at=now() where um_qa_log_runs.status='failed' and um_qa_log_runs.updated_at < now() - interval '20 seconds' returning run_id", [runId]);
      if (!reserved.length) {
        const old = (await db('select status from um_qa_log_runs where run_id=$1', [runId]))[0];
        return old?.status === 'sent' ? respond({ ok: true, duplicate: true }, 200) : respond({ error: 'Delivery in progress; retry later' }, 429);
      }
      let delivered = false;
      try { delivered = await sendDiscord(decrypt(config.encrypted_webhook, secret), report, runId, fetcher); } catch {}
      if (!delivered) {
        await db("update um_qa_log_runs set status='failed',updated_at=now() where run_id=$1 and status='processing'", [runId]);
        return respond({ error: 'Discord delivery unavailable, retry later' }, 503);
      }
      await db("update um_qa_log_runs set status='sent',sent_at=now(),updated_at=now() where run_id=$1 and status='processing'", [runId]);
      return respond({ ok: true, delivered: true }, 202);
    } catch { return respond({ error: 'Relay unavailable' }, 503); }
  };
}
export default createAutomatedLogsHandler();
