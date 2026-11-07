import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import health from './api/health.mjs';
import strategies from './api/strategy-network.mjs';
import admin from './api/admin.mjs';
import poll, { MAX_POLL_BYTES } from './api/poll.mjs';
import pollTeam from './api/poll-team.mjs';
import wikiApi from './api/wiki.mjs';
import automatedLogs from './api/automated-logs.mjs';
import bugReports, { MAX_BUG_REPORT_BYTES } from './api/bug-reports.mjs';
import dashboardPairing from './api/dashboard-pairing.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const siteRoot = path.resolve(process.env.SITE_ROOT || import.meta.dirname);
const storageRoot = process.env.STRATEGY_STORAGE_ROOT ? path.resolve(process.env.STRATEGY_STORAGE_ROOT) : null;
const maxRequestBytes = 8 * 1024 * 1024;
// The static host and Node server consume the same generated download redirects.
const downloadRedirects = new Map((await readFile(path.join(siteRoot, '_redirects'), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
})).split('\n').map(line => line.trim().split(/\s+/)).filter(([from, to, status]) =>
  from.startsWith('/download') && to?.startsWith('/download/') && /^(301|302)$/.test(status)
).map(([from, to, status]) => [from, { to, status: Number(status) }]));

function safePath(root, relative) {
  const clean = relative.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  if (!clean || clean.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\0'))) return null;
  const target = path.resolve(root, clean);
  return target.startsWith(`${path.resolve(root)}${path.sep}`) ? target : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', ...headers });
  res.end(body);
}

async function requestBody(req, limit = maxRequestBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function toRequest(req, body) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const url = `${forwardedProto}://${req.headers.host || `${host}:${port}`}${req.url}`;
  return new Request(url, { method: req.method, headers: req.headers, body: body.length ? body : undefined });
}

async function serveStoredFile(relative, req, res) {
  let decoded;
  try { decoded = relative.split('/').map(decodeURIComponent).join('/'); } catch { return send(res, 400, 'bad path\n'); }
  const target = safePath(storageRoot, decoded);
  if (!target) return send(res, 400, 'bad path\n');
  try {
    const info = await stat(target);
    if (!info.isFile()) return send(res, 404, 'not found\n');
    const body = await readFile(target);
    const type = target.endsWith('.strat') ? 'text/plain; charset=utf-8' : target.endsWith('.png') ? 'image/png' : target.endsWith('.jpeg') || target.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
    return send(res, 200, req.method === 'HEAD' ? null : body, { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'content-disposition': target.endsWith('.strat') ? `attachment; filename="${path.basename(target)}"` : 'inline' });
  } catch (caught) { return send(res, caught.code === 'ENOENT' ? 404 : 500, 'not found\n'); }
}

async function handleApi(req, res, body) {
  const request = toRequest(req, body);
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/files' || pathname.startsWith('/api/files/')) {
    if (!storageRoot) return send(res, 503, 'strategy storage is not configured\n');
    return serveStoredFile(pathname.slice('/api/files/'.length), req, res);
  }
  let response;
  if (pathname === '/api/wiki/v1' || pathname.startsWith('/api/wiki/v1/')) response = await wikiApi(request);
  else if (pathname === '/api/health') response = await health(request);
  else if (pathname === '/api/bug-reports/v1' || pathname.startsWith('/api/bug-reports/v1/')) response = await bugReports(request);
  else if (pathname === '/api/automated-logs/v1' || pathname.startsWith('/api/automated-logs/v1/')) response = await automatedLogs(request);
  else if (pathname === '/api/dashboard/v1' || pathname.startsWith('/api/dashboard/v1/')) response = await dashboardPairing(request);
  else if (pathname === '/api/strategies' || pathname.startsWith('/api/strategies/')) response = await strategies(request);
  else if (pathname === '/api/poll-team' || pathname.startsWith('/api/poll-team/')) response = await pollTeam(request);
  else if (pathname === '/api/poll' || pathname.startsWith('/api/poll/')) response = await poll(request);
  else if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) response = await admin(request);
  else return send(res, 404, 'not found\n', { 'content-type': 'text/plain; charset=utf-8' });
  const headers = Object.fromEntries(response.headers.entries());
  const responseBody = req.method === 'HEAD' ? null : Buffer.from(await response.arrayBuffer());
  return send(res, response.status, responseBody, headers);
}

async function serveStatic(req, res, body = Buffer.alloc(0)) {
  let requestPath;
  try { requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(res, 400, 'bad path\n'); }
  requestPath = requestPath.replaceAll('\\', '/').replace(/^\/+/, '/');
  // The static root is a source checkout, not a sanitized build directory.
  // Never serve hidden files (including .env/.git), dependencies or server code.
  if (requestPath.split('/').some(part => part.startsWith('.')) ||
      /^\/(?:node_modules|db|scripts|tests|docs|audit-evidence)(?:\/|$)/.test(requestPath) ||
      /\.(?:mjs|cjs|sql|log)$/i.test(requestPath)) return send(res, 404, 'not found\n');
  const downloadRedirect = downloadRedirects.get(requestPath);
  if (downloadRedirect) {
    const query = new URL(req.url, 'http://localhost').search;
    return send(res, downloadRedirect.status, null, { location: downloadRedirect.to + query, 'cache-control': 'no-cache' });
  }
  if (requestPath === '/poll/team' || requestPath.startsWith('/poll/team/')) {
    const request = toRequest(req, body);
    const canonical = new URL(request.url); canonical.pathname = requestPath;
    const response = await pollTeam(new Request(canonical, request));
    return send(res, response.status, req.method === 'HEAD' ? null : Buffer.from(await response.arrayBuffer()), Object.fromEntries(response.headers));
  }
  if (requestPath.startsWith('/api/')) return send(res, 404, 'not found\n');
  let target = safePath(siteRoot, requestPath === '/' ? 'index.html' : requestPath.slice(1));
  if (!target) return send(res, 400, 'bad path\n');
  try {
    let info = await stat(target);
    if (info.isDirectory()) { target = path.join(target, 'index.html'); info = await stat(target); }
    if (!info.isFile()) throw Object.assign(new Error(), { code: 'ENOENT' });
    const body = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.strat': 'text/plain; charset=utf-8' };
    return send(res, 200, req.method === 'HEAD' ? null : body, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': requestPath === '/data/advertising.json' || ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
  } catch (caught) { return send(res, caught.code === 'ENOENT' ? 404 : 500, 'not found\n'); }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(req.method)) return send(res, 405, 'method not allowed\n', { allow: 'GET, HEAD, POST, OPTIONS' });
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const body = req.method === 'POST' ? await requestBody(req, pathname === '/api/dashboard/v1/events' ? 32768 : pathname.startsWith('/api/dashboard/v1/') ? 4096 : pathname === '/api/automated-logs/v1/reports' ? 140000 : pathname === '/api/bug-reports/v1/reports' ? MAX_BUG_REPORT_BYTES : pathname === '/api/wiki/v1/ask' ? 2048 : pathname === '/api/poll-team' || pathname.startsWith('/api/poll-team/') || pathname.startsWith('/poll/team/') ? 1024 : pathname === '/api/poll' || pathname.startsWith('/api/poll/') ? MAX_POLL_BYTES : maxRequestBytes) : Buffer.alloc(0);
    if (pathname.startsWith('/api/')) await handleApi(req, res, body);
    else await serveStatic(req, res, body);
  } catch (caught) { send(res, Number(caught.status || 500), Number(caught.status) === 413 ? 'request too large\n' : 'internal server error\n'); }
});

server.listen(port, host, () => console.log(`ultmacro server listening on http://${host}:${server.address().port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
