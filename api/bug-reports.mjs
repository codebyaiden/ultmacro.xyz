import { randomBytes } from 'node:crypto';
import { json, requestOriginMatches, clientIp } from './_lib/http.mjs';
import { rateLimit } from './_lib/security.mjs';

export const MAX_BUG_REPORT_BYTES = 12 * 1024;
const CATEGORIES = new Set(['macro', 'setup', 'strategy', 'website', 'other']);
const FREQUENCIES = new Set(['once', 'sometimes', 'every-time', 'unknown']);
const SYSTEMS = new Set(['Windows 10', 'Windows 11', 'macOS', 'iOS / iPadOS', 'Android', 'Linux', 'Other', 'Unknown']);
const versions = /^(?:v1\.3\.[3-6][ab]?|older|unknown|not-applicable)$/;
const limits = { title: 100, steps: 950, expected: 550, actual: 850, notes: 600, logExcerpt: 1200 };
const allowedKeys = new Set([...Object.keys(limits), 'category', 'version', 'system', 'frequency', 'consent', 'website', 'startedAt']);
const sensitive = /(?:https?:\/\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:password|secret|token|authorization|cookie|api[_-]?key|webhook)\s*[:=]|[a-z]:\\users\\|\/users\/[^/\s]+)/i;

function webhookValid(raw) {
  try {
    const url = new URL(raw || '');
    return url.protocol === 'https:' && ['discord.com', 'discordapp.com'].includes(url.hostname) &&
      !url.port && !url.username && !url.password && !url.search && !url.hash &&
      /^\/api\/webhooks\/\d{12,25}\/[A-Za-z0-9_-]{40,160}$/.test(url.pathname);
  } catch { return false; }
}

function cleaned(value, max) {
  if (typeof value !== 'string' || value.length > max * 2) return null;
  const text = value.trim().replace(/\r\n?/g, '\n');
  if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return null;
  return text;
}

function validated(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !allowedKeys.has(key))) return null;
  if (!CATEGORIES.has(body.category) || !versions.test(body.version || '') ||
      !SYSTEMS.has(body.system) || !FREQUENCIES.has(body.frequency) ||
      body.consent !== true || body.website !== '') return null;
  // Low-effort bot traffic will be rejected before the webhook is contacted.
  if (!Number.isFinite(body.startedAt) || body.startedAt > Date.now() + 60000 ||
      Date.now() - body.startedAt < 2500 || Date.now() - body.startedAt > 86400000) return null;
  const data = { category: body.category, version: body.version, system: body.system, frequency: body.frequency };
  for (const [key, limit] of Object.entries(limits)) {
    const value = cleaned(body[key] ?? '', limit);
    if (value === null) return null;
    data[key] = value;
  }
  if (data.title.length < 8 || data.steps.length < 15 ||
      data.expected.length < 8 || data.actual.length < 8) return null;
  // Reject potentially private data rather than silently forwarding it.
  if (Object.values(data).some(value => typeof value === 'string' && sensitive.test(value))) return { privateData: true };
  return data;
}

const safeDiscord = value => String(value).replace(/@/g, '@\u200b');
function discordBody(data, receipt) {
  const fields = [
    { name: 'Category / release', value: safeDiscord(data.category + ' · ' + data.version), inline: true },
    { name: 'System / frequency', value: safeDiscord(data.system + ' · ' + data.frequency), inline: true },
    { name: 'Steps to reproduce', value: safeDiscord(data.steps) },
    { name: 'Expected result', value: safeDiscord(data.expected) },
    { name: 'What actually happened', value: safeDiscord(data.actual) }
  ];
  if (data.notes) fields.push({ name: 'Extra context', value: safeDiscord(data.notes) });
  if (data.logExcerpt) fields.push({ name: 'User-reviewed log excerpt', value: safeDiscord(data.logExcerpt) });
  return {
    username: 'UM Bug Reports',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: safeDiscord(data.title),
      color: 0x7598db,
      fields,
      footer: { text: 'Unverified user report · ' + receipt },
      timestamp: new Date().toISOString()
    }]
  };
}

export function createBugReportsHandler({
  webhook = () => process.env.UM_BUG_REPORT_WEBHOOK || '',
  limiter = rateLimit,
  fetcher = fetch,
  ready = () => Boolean(process.env.DATABASE_URL && process.env.STRATEGY_HASH_SECRET)
} = {}) {
  return async function bugReports(request) {
    const route = new URL(request.url).pathname;
    if (route === '/api/bug-reports/v1/health' && request.method === 'GET')
      return json({ ok: true, receiving: ready() && webhookValid(webhook()) });
    if (route !== '/api/bug-reports/v1/reports')
      return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const origin = request.headers.get('origin');
    if (!origin || !/^https:\/\/(?:www\.)?ultmacro\.xyz$/.test(origin) || !requestOriginMatches(request))
      return json({ error: 'Invalid submission origin.' }, 403);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || ''))
      return json({ error: 'Use JSON.' }, 415);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > MAX_BUG_REPORT_BYTES)
      return json({ error: 'Report too large.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid report.' }, 422); }
    const data = validated(body);
    if (!data) return json({ error: 'Complete the required fields and try again.' }, 422);
    if (data.privateData) return json({ error: 'The report may contain a link, account path or private information. Remove it before sending.' }, 422);
    const destination = webhook();
    if (!ready() || !webhookValid(destination)) return json({ error: 'Staff delivery is not configured yet. Copy your report instead.' }, 503);
    try {
      // Shared and per-IP limits bound anonymous traffic. No public webhook or credential.
      const [global, ip] = await Promise.all([
        limiter('um-bugs:global', 100, 3600),
        limiter('um-bugs:ip:' + clientIp(request), 5, 3600)
      ]);
      if (!global.allowed || !ip.allowed) return json({ error: 'Too many reports. Please try again later.' }, 429);
      const receipt = 'UM-' + randomBytes(6).toString('hex').toUpperCase();
      const response = await fetcher(destination, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(discordBody(data, receipt)),
        redirect: 'error',
        signal: AbortSignal.timeout(10000)
      });
      if (![200, 204].includes(response.status))
        return json({ error: 'Staff delivery failed. Copy your report and try again later.' }, 503);
      return json({ ok: true, delivered: true, receipt }, 202);
    } catch {
      return json({ error: 'Staff delivery is currently unavailable. Copy your report and try again later.' }, 503);
    }
  };
}
export default createBugReportsHandler();
