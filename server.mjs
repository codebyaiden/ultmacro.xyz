import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import health from './api/health.mjs';
import strategies from './api/strategy-network.mjs';
import admin from './api/admin.mjs';
import poll, { MAX_POLL_BYTES } from './api/poll.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const siteRoot = path.resolve(process.env.SITE_ROOT || import.meta.dirname);
const storageRoot = process.env.STRATEGY_STORAGE_ROOT ? path.resolve(process.env.STRATEGY_STORAGE_ROOT) : null;
const maxRequestBytes = 8 * 1024 * 1024;

function safePath(root, relative) {
  const clean = relative.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
  if (!clean || clean.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\0'))) return null;
  const target = path.resolve(root, clean);
  return target.startsWith(`${path.resolve(root)}${path.sep}`) ? target : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'x-content-type-options': 'nosniff', ...headers });
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
  if (pathname === '/api/health') response = await health(request);
  else if (pathname === '/api/strategies' || pathname.startsWith('/api/strategies/')) response = await strategies(request);
  else if (pathname === '/api/poll' || pathname.startsWith('/api/poll/')) response = await poll(request);
  else if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) response = await admin(request);
  else return send(res, 404, 'not found\n', { 'content-type': 'text/plain; charset=utf-8' });
  const headers = Object.fromEntries(response.headers.entries());
  const responseBody = req.method === 'HEAD' ? null : Buffer.from(await response.arrayBuffer());
  return send(res, response.status, responseBody, headers);
}

async function serveStatic(req, res) {
  let requestPath;
  try { requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(res, 400, 'bad path\n'); }
  if (requestPath.startsWith('/api/')) return send(res, 404, 'not found\n');
  let target = safePath(siteRoot, requestPath === '/' ? 'index.html' : requestPath.slice(1));
  if (!target) return send(res, 400, 'bad path\n');
  try {
    let info = await stat(target);
    if (info.isDirectory()) { target = path.join(target, 'index.html'); info = await stat(target); }
    if (!info.isFile()) throw Object.assign(new Error(), { code: 'ENOENT' });
    const body = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.strat': 'text/plain; charset=utf-8' };
    return send(res, 200, req.method === 'HEAD' ? null : body, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
  } catch (caught) { return send(res, caught.code === 'ENOENT' ? 404 : 500, 'not found\n'); }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(req.method)) return send(res, 405, 'method not allowed\n', { allow: 'GET, HEAD, POST, OPTIONS' });
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const body = req.method === 'POST' ? await requestBody(req, pathname === '/api/poll' || pathname.startsWith('/api/poll/') ? MAX_POLL_BYTES : maxRequestBytes) : Buffer.alloc(0);
    if (pathname.startsWith('/api/')) await handleApi(req, res, body);
    else await serveStatic(req, res);
  } catch (caught) { send(res, Number(caught.status || 500), Number(caught.status) === 413 ? 'request too large\n' : 'internal server error\n'); }
});

server.listen(port, host, () => console.log(`ultmacro server listening on http://${host}:${port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
