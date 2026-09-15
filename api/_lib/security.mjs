import { createHash, createHmac, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { clientIp } from './http.mjs';
import { query } from './db.mjs';

const scrypt = promisify(nodeScrypt);
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 32;
const ADMIN_COOKIE = 'strategy_admin';

export function id() {
  return randomUUID();
}

export function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function indexedHash(value) {
  const secret = process.env.STRATEGY_HASH_SECRET;
  if (!secret) throw new Error('STRATEGY_HASH_SECRET is not configured.');
  return createHmac('sha256', secret).update(String(value)).digest('hex');
}

export async function hashSecret(value) {
  const salt = randomBytes(16);
  const derived = await scrypt(String(value), salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifySecret(value, encoded) {
  try {
    const [algorithm, n, r, p, saltText, hashText] = String(encoded || '').split('$');
    if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
    const derived = await scrypt(String(value), Buffer.from(saltText, 'base64url'), Buffer.from(hashText, 'base64url').length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 32 * 1024 * 1024
    });
    const expected = Buffer.from(hashText, 'base64url');
    return expected.length === derived.length && timingSafeEqual(expected, Buffer.from(derived));
  } catch {
    return false;
  }
}

export function parseCookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map((entry) => {
    const index = entry.indexOf('=');
    return index === -1 ? ['', ''] : [entry.slice(0, index).trim(), decodeURIComponent(entry.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function sessionCookie(value, maxAge = 60 * 60 * 12) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  return `${ADMIN_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

export function getAdminCookie(request) {
  return parseCookies(request)[ADMIN_COOKIE] || '';
}

export function clientFingerprint(request) {
  const device = parseCookies(request)['um_device'] || '';
  const userAgent = request.headers.get('user-agent') || '';
  return indexedHash(`${device}|${clientIp(request)}|${userAgent}`);
}

export async function createAdminSession() {
  const raw = token(32);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  await query('insert into admin_sessions (token_hash, expires_at) values ($1, $2)', [sha256(raw), expiresAt]);
  return { raw, expiresAt };
}

export async function getAdminSession(request) {
  const raw = getAdminCookie(request);
  if (!raw) return null;
  const rows = await query('select token_hash, expires_at from admin_sessions where token_hash = $1 and revoked_at is null and expires_at > now()', [sha256(raw)]);
  if (!rows[0]) return null;
  await query('update admin_sessions set last_seen_at = now() where token_hash = $1', [rows[0].token_hash]);
  return rows[0];
}

export async function revokeAdminSession(request) {
  const raw = getAdminCookie(request);
  if (!raw) return;
  await query('update admin_sessions set revoked_at = now() where token_hash = $1', [sha256(raw)]);
}

async function pruneStaleRows() {
  try {
    await query("delete from rate_limit_buckets where updated_at < now() - interval '24 hours'");
    await query("delete from admin_sessions where expires_at < now() - interval '7 days'");
  } catch {
  }
}

export async function rateLimit(bucket, limit, windowSeconds) {
  if (Math.random() < 0.01) await pruneStaleRows();
  const key = indexedHash(bucket);
  const rows = await query(`
    insert into rate_limit_buckets (bucket_key, window_started, hit_count)
    values ($1, now(), 1)
    on conflict (bucket_key) do update set
      window_started = case when rate_limit_buckets.window_started < now() - ($2 * interval '1 second') then now() else rate_limit_buckets.window_started end,
      hit_count = case when rate_limit_buckets.window_started < now() - ($2 * interval '1 second') then 1 else rate_limit_buckets.hit_count + 1 end,
      updated_at = now()
    returning hit_count, window_started
  `, [key, windowSeconds]);
  const row = rows[0];
  return { allowed: Number(row?.hit_count || 0) <= limit, retryAfter: Math.max(1, windowSeconds - Math.floor((Date.now() - new Date(row?.window_started || Date.now()).getTime()) / 1000)) };
}