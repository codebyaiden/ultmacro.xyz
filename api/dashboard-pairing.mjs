import { randomInt, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { clientIp, json } from './_lib/http.mjs';
import { databaseConfigured, sql } from './_lib/db.mjs';
import { indexedHash, parseCookies, rateLimit, sha256, token } from './_lib/security.mjs';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIVITY_EVENT_TYPES = new Set([
  'run.started', 'run.stopped', 'run.paused', 'run.resumed',
  'strategy.action.requested', 'strategy.action.succeeded', 'reward.claimed'
]);
const ACTIVITY_ACTIONS = new Set([
  'spawntower', 'upgradetower', 'selltower', 'clonetower', 'changetargets',
  'toggleautoskip', 'activateraisethedead', 'activateenforcervan',
  'brawlerreposition', 'enforcerreposition', 'setdjtrack', 'click', 'send',
  'sleep', 'commander', 'other'
]);
const CODE_TTL_MS = 15 * 60 * 1000;
const OWNER_COOKIE = 'um_dashboard_owner';
const OWNER_COOKIE_AGE = 180 * 24 * 60 * 60;
const HEARTBEAT_FRESH_MS = 60 * 1000;
const localCodes = new Map();
const localDevices = new Map();
const localLimits = new Map();
const localBrowserSessions = new Map();
const localBrowserLinks = new Map();
const localActivityEvents = new Map();
const localPushSubscriptions = new Map();

function pairingCode() {
  const raw = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function pairingCodeHash(code) {
  return databaseConfigured() ? indexedHash(code) : sha256(code);
}

function ownerSessionCookie(value) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${OWNER_COOKIE}=${encodeURIComponent(value)}; Max-Age=${OWNER_COOKIE_AGE}; Path=/; HttpOnly; SameSite=Strict${secure}`;
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const requestUrl = new URL(request.url);
    const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host).split(',')[0].trim().toLowerCase();
    const protocol = (request.headers.get('x-forwarded-proto') || requestUrl.protocol.slice(0, -1)).split(',')[0].trim().toLowerCase();
    return source.host.toLowerCase() === host && source.protocol === `${protocol}:`;
  } catch { return false; }
}

function secureApiMode() {
  return databaseConfigured() || process.env.NODE_ENV !== 'production';
}

async function limited(key, limit, seconds) {
  if (databaseConfigured()) return rateLimit(key, limit, seconds);
  const now = Date.now();
  const current = localLimits.get(key);
  if (!current || current.start + seconds * 1000 <= now) {
    localLimits.set(key, { start: now, hits: 1 });
    return { allowed: true, retryAfter: seconds };
  }
  current.hits += 1;
  return { allowed: current.hits <= limit, retryAfter: Math.max(1, Math.ceil((current.start + seconds * 1000 - now) / 1000)) };
}

function localStore() {
  return process.env.NODE_ENV !== 'production' && !databaseConfigured();
}

async function issueCode(ownerHash) {
  const code = pairingCode();
  const codeHash = pairingCodeHash(code.replace('-', ''));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  if (localStore()) {
    for (const device of localDevices.values()) {
      if (device.ownerHash === ownerHash && !device.revokedAt && !device.lastSeenAt && Date.now() - device.pairedAt > HEARTBEAT_FRESH_MS)
        device.revokedAt = Date.now();
    }
    for (const entry of localCodes.values()) if (entry.ownerHash === ownerHash && !entry.claimedAt) entry.revokedAt = Date.now();
    localCodes.set(codeHash, { ownerHash, createdAt: Date.now(), expiresAt: expiresAt.getTime(), claimedAt: 0, revokedAt: 0, deviceId: '' });
    return { code, expiresAt: expiresAt.toISOString() };
  }

  const client = await sql().connect();
  try {
    await client.query('begin');
    await client.query("delete from dashboard_pairing_codes where expires_at < now() - interval '2 days'");
    await client.query(`update dashboard_devices set revoked_at = now()
      where owner_hash = $1 and revoked_at is null and last_seen_at is null
        and paired_at < now() - interval '60 seconds'`, [ownerHash]);
    await client.query('update dashboard_pairing_codes set revoked_at = now() where owner_hash = $1 and claimed_at is null and revoked_at is null', [ownerHash]);
    await client.query('insert into dashboard_pairing_codes (code_hash, owner_hash, expires_at) values ($1, $2, $3)', [codeHash, ownerHash, expiresAt]);
    await client.query('commit');
    return { code, expiresAt: expiresAt.toISOString() };
  } catch (caught) {
    await client.query('rollback').catch(() => {});
    throw caught;
  } finally { client.release(); }
}

async function claimCode(code, deviceName, appVersion) {
  const codeHash = pairingCodeHash(code);
  const deviceId = randomUUID();
  const rawDeviceToken = token(32);
  const tokenHash = sha256(rawDeviceToken);
  const now = Date.now();

  if (localStore()) {
    const pairing = localCodes.get(codeHash);
    if (!pairing || pairing.revokedAt || pairing.claimedAt || pairing.expiresAt <= now) return null;
    const device = { id: deviceId, ownerHash: pairing.ownerHash, tokenHash, deviceName, appVersion, pairedAt: now, lastSeenAt: 0, revokedAt: 0, snapshot: null, snapshotUpdatedAt: 0 };
    localDevices.set(deviceId, device);
    pairing.claimedAt = now;
    pairing.deviceId = deviceId;
    return { deviceId, deviceToken: rawDeviceToken };
  }

  const client = await sql().connect();
  try {
    await client.query('begin');
    const rows = await client.query(`select owner_hash from dashboard_pairing_codes
      where code_hash = $1 and claimed_at is null and revoked_at is null and expires_at > now() for update`, [codeHash]);
    if (!rows.rows[0]) {
      await client.query('rollback');
      return null;
    }
    const ownerHash = rows.rows[0].owner_hash;
    await client.query(`insert into dashboard_devices (id, owner_hash, token_hash, device_name, app_version)
      values ($1, $2, $3, $4, $5)`, [deviceId, ownerHash, tokenHash, deviceName, appVersion]);
    await client.query('update dashboard_pairing_codes set claimed_at = now(), device_id = $2 where code_hash = $1', [codeHash, deviceId]);
    await client.query('commit');
    return { deviceId, deviceToken: rawDeviceToken };
  } catch (caught) {
    await client.query('rollback').catch(() => {});
    throw caught;
  } finally { client.release(); }
}

async function getPairingStatus(ownerHash) {
  if (localStore()) {
    const pairing = [...localCodes.values()].filter(item => item.ownerHash === ownerHash && !item.revokedAt).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!pairing) return { state: 'none' };
    if (!pairing.claimedAt) return { state: pairing.expiresAt > Date.now() ? 'pending' : 'expired', expiresAt: new Date(pairing.expiresAt).toISOString() };
    const device = localDevices.get(pairing.deviceId);
    if (!device || device.revokedAt) return { state: 'revoked' };
    const state = !device.lastSeenAt ? (Date.now() - device.pairedAt <= HEARTBEAT_FRESH_MS ? 'connecting' : 'offline') : Date.now() - device.lastSeenAt <= HEARTBEAT_FRESH_MS ? 'connected' : 'offline';
    return { state, device: { id: device.id, name: device.deviceName, version: device.appVersion, lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null } };
  }

  const rows = await sql().query(`select p.expires_at, p.claimed_at, p.device_id, p.revoked_at,
      d.device_name, d.app_version, d.paired_at, d.last_seen_at, d.revoked_at as device_revoked_at
    from dashboard_pairing_codes p left join dashboard_devices d on d.id = p.device_id
    where p.owner_hash = $1 order by p.created_at desc limit 1`, [ownerHash]);
  const row = rows.rows[0];
  if (!row) return { state: 'none' };
  if (row.revoked_at && !row.claimed_at) return { state: 'expired' };
  if (!row.claimed_at) return { state: new Date(row.expires_at).getTime() > Date.now() ? 'pending' : 'expired', expiresAt: new Date(row.expires_at).toISOString() };
  if (row.device_revoked_at) return { state: 'revoked' };
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const pairedAt = new Date(row.paired_at).getTime();
  const state = !lastSeen ? (Date.now() - pairedAt <= HEARTBEAT_FRESH_MS ? 'connecting' : 'offline') : Date.now() - lastSeen.getTime() <= HEARTBEAT_FRESH_MS ? 'connected' : 'offline';
  return { state, device: { id: row.device_id, name: row.device_name, version: row.app_version, lastSeenAt: lastSeen?.toISOString() || null } };
}

async function heartbeat(deviceToken, appVersion, snapshot = null) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    if (!device) return false;
    device.lastSeenAt = Date.now();
    if (appVersion) device.appVersion = appVersion;
    if (snapshot) {
      device.snapshot = snapshot;
      device.snapshotUpdatedAt = Date.now();
    }
    return true;
  }
  let result;
  try {
    result = await sql().query(`update dashboard_devices set last_seen_at = now(),
        app_version = coalesce($2, app_version),
        state_snapshot = coalesce($3::jsonb, state_snapshot),
        state_updated_at = case when $3::jsonb is null then state_updated_at else now() end
      where token_hash = $1 and revoked_at is null returning id`, [tokenHash, appVersion || null, snapshot ? JSON.stringify(snapshot) : null]);
  } catch (error) {
    // Keep older deployments paired until migration 017 has been applied.
    if (error?.code !== '42703') throw error;
    result = await sql().query(`update dashboard_devices set last_seen_at = now(),
        app_version = coalesce($2, app_version)
      where token_hash = $1 and revoked_at is null returning id`, [tokenHash, appVersion || null]);
  }
  return Boolean(result.rows[0]);
}

function normalizeMacroSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = ['runState', 'activeStrategy', 'activeSlot', 'rotationEnabled', 'map', 'mode', 'strategySlots'];
  if (Object.keys(value).some(key => !allowed.includes(key)) ||
      !['stopped', 'running', 'paused'].includes(value.runState) ||
      ![1, 2].includes(value.activeSlot) || typeof value.rotationEnabled !== 'boolean' ||
      !Array.isArray(value.strategySlots) || value.strategySlots.length > 2 ||
      (value.activeStrategy !== null && (typeof value.activeStrategy !== 'string' || value.activeStrategy.length > 80)) ||
      (value.map !== '' && (typeof value.map !== 'string' || value.map.length > 64)) ||
      (value.mode !== '' && (typeof value.mode !== 'string' || value.mode.length > 32))) return null;

  const slots = [];
  const seen = new Set();
  for (const item of value.strategySlots) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).some(key => !['slot', 'name'].includes(key)) ||
        ![1, 2].includes(item.slot) || seen.has(item.slot) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || /[\r\n\0]/.test(item.name)) return null;
    seen.add(item.slot);
    slots.push({ slot: item.slot, name: item.name.trim() });
  }
  return {
    runState: value.runState,
    activeStrategy: value.activeStrategy?.trim() || null,
    activeSlot: value.activeSlot,
    rotationEnabled: value.rotationEnabled,
    map: value.map.trim(),
    mode: value.mode.trim(),
    strategySlots: slots
  };
}

async function getMacroState(ownerHash) {
  if (localStore()) {
    return [...localDevices.values()].filter(device => device.ownerHash === ownerHash && !device.revokedAt)
      .sort((a, b) => (b.lastSeenAt || b.pairedAt) - (a.lastSeenAt || a.pairedAt))
      .map(device => ({
        id: device.id,
        name: device.deviceName,
        version: device.appVersion,
        state: device.lastSeenAt && Date.now() - device.lastSeenAt <= HEARTBEAT_FRESH_MS ? 'connected' : 'offline',
        lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null,
        snapshotUpdatedAt: device.snapshotUpdatedAt ? new Date(device.snapshotUpdatedAt).toISOString() : null,
        snapshot: device.snapshot || null
      }));
  }
  const rows = await sql().query(`select id, device_name, app_version, last_seen_at, state_snapshot, state_updated_at
      from dashboard_devices where owner_hash = $1 and revoked_at is null
      order by last_seen_at desc nulls last, paired_at desc`, [ownerHash]);
  return rows.rows.map(row => ({
    id: row.id,
    name: row.device_name,
    version: row.app_version,
    state: row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() <= HEARTBEAT_FRESH_MS ? 'connected' : 'offline',
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    snapshotUpdatedAt: row.state_updated_at ? new Date(row.state_updated_at).toISOString() : null,
    snapshot: row.state_snapshot && Object.keys(row.state_snapshot).length ? row.state_snapshot : null
  }));
}

async function disconnectDevice(deviceToken) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    if (!device) return false;
    device.revokedAt = Date.now();
    return true;
  }
  const result = await sql().query('update dashboard_devices set revoked_at = now() where token_hash = $1 and revoked_at is null returning id', [tokenHash]);
  return Boolean(result.rows[0]);
}

async function revokeDevice(ownerHash, deviceId) {
  if (localStore()) {
    const device = localDevices.get(deviceId);
    if (!device || device.ownerHash !== ownerHash) return false;
    device.revokedAt = Date.now();
    return true;
  }
  const result = await sql().query('update dashboard_devices set revoked_at = now() where id = $1 and owner_hash = $2 and revoked_at is null returning id', [deviceId, ownerHash]);
  return Boolean(result.rows[0]);
}

async function bodyJson(request, maxBytes = 4096) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return null;
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

function normalizeActivityEvent(value) {
  const keys = ['eventId', 'sequence', 'type', 'occurredAt', 'appVersion', 'runId', 'source', 'confidence', 'data'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key)) ||
      !/^[a-f0-9]{32}$/i.test(value.eventId || '') || !Number.isSafeInteger(value.sequence) || value.sequence < 1 ||
      !ACTIVITY_EVENT_TYPES.has(value.type) || typeof value.occurredAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.occurredAt) || !Number.isFinite(Date.parse(value.occurredAt)) ||
      typeof value.appVersion !== 'string' || value.appVersion.length < 1 || value.appVersion.length > 32 ||
      !/^[a-f0-9]{32}$/i.test(value.runId || '') || !['macro', 'screen'].includes(value.source) ||
      !['confirmed', 'observed'].includes(value.confidence) || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) return null;

  const dataKeys = Object.keys(value.data);
  if (dataKeys.some(key => !['action', 'rewardType'].includes(key)) ||
      (value.data.action !== undefined && !ACTIVITY_ACTIONS.has(value.data.action)) ||
      (value.data.rewardType !== undefined && value.data.rewardType !== 'playtime')) return null;
  if (value.type.startsWith('strategy.action.') && !value.data.action) return null;
  if (value.type === 'reward.claimed' && value.data.rewardType !== 'playtime') return null;

  return {
    eventId: value.eventId.toLowerCase(), sequence: value.sequence, type: value.type,
    occurredAt: new Date(value.occurredAt).toISOString(), appVersion: value.appVersion,
    runId: value.runId.toLowerCase(), source: value.source, confidence: value.confidence,
    data: { ...(value.data.action ? { action: value.data.action } : {}), ...(value.data.rewardType ? { rewardType: value.data.rewardType } : {}) }
  };
}

async function uploadActivityEvents(deviceToken, events) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    if (!device) return null;
    let accepted = 0;
    for (const event of events) {
      const key = `${device.id}:${event.eventId}`;
      const duplicate = [...localActivityEvents.values()].some(item => item.deviceId === device.id && (item.eventId === event.eventId || (item.runId === event.runId && item.sequence === event.sequence)));
      if (duplicate) continue;
      localActivityEvents.set(key, { ...event, deviceId: device.id, deviceName: device.deviceName, ownerHash: device.ownerHash });
      accepted++;
    }
    return accepted;
  }

  const deviceResult = await sql().query('select id, owner_hash from dashboard_devices where token_hash = $1 and revoked_at is null', [tokenHash]);
  const device = deviceResult.rows[0];
  if (!device) return null;
  const values = [];
  const params = [];
  for (const event of events) {
    const offset = params.length;
    params.push(device.id, device.owner_hash, event.eventId, event.runId, event.sequence, event.type,
      event.source, event.confidence, event.appVersion, event.occurredAt, JSON.stringify(event.data));
    values.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10},$${offset + 11}::jsonb)`);
  }
  const inserted = await sql().query(`insert into dashboard_activity_events
      (device_id, owner_hash, event_id, run_id, sequence, event_type, source, confidence, app_version, occurred_at, data)
    values ${values.join(',')}
    on conflict do nothing returning event_id`, params);
  await sql().query("delete from dashboard_activity_events where owner_hash = $1 and occurred_at < now() - interval '30 days'", [device.owner_hash]);
  return inserted.rows.length;
}

async function listActivityEvents(ownerHash, limit = 100) {
  if (localStore()) {
    return [...localActivityEvents.values()].filter(event => event.ownerHash === ownerHash && Date.now() - Date.parse(event.occurredAt) <= 30 * 86400000)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sequence - a.sequence)
      .slice(0, limit).map(({ ownerHash: _ownerHash, ...event }) => event);
  }
  const result = await sql().query(`select event_id as "eventId", device_id as "deviceId", run_id as "runId",
      sequence, event_type as type, occurred_at as "occurredAt", app_version as "appVersion",
      source, confidence, data, device_name as "deviceName"
    from dashboard_activity_events e join dashboard_devices d on d.id = e.device_id
    where e.owner_hash = $1 and e.occurred_at > now() - interval '30 days'
    order by e.occurred_at desc, e.sequence desc limit $2`, [ownerHash, limit]);
  return result.rows;
}

async function ownerFrom(request) {
  const raw = parseCookies(request)[OWNER_COOKIE] || '';
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(raw)) return null;
  const sessionHash = sha256(raw);
  if (localStore()) {
    const session = localBrowserSessions.get(sessionHash);
    if (session) {
      if (session.revokedAt || session.expiresAt <= Date.now()) return null;
      session.lastSeenAt = Date.now();
      return { raw, hash: session.ownerHash, sessionHash, session };
    }
  } else {
    const rows = await sql().query(`select owner_hash, device_name, device_type, created_at, last_seen_at, expires_at, revoked_at
      from dashboard_browser_sessions where token_hash = $1`, [sessionHash]);
    if (rows.rows[0]) {
      if (rows.rows[0].revoked_at || new Date(rows.rows[0].expires_at).getTime() <= Date.now()) return null;
      await sql().query(`update dashboard_browser_sessions set last_seen_at = now()
        where token_hash = $1 and last_seen_at < now() - interval '1 minute'`, [sessionHash]);
      return { raw, hash: rows.rows[0].owner_hash, sessionHash, session: rows.rows[0] };
    }
  }
  // Keep sessions created by the original pairing flow valid until they are
  // naturally replaced by the newer per-browser session records.
  return { raw, hash: sessionHash, sessionHash, legacy: true };
}

function browserName(request) {
  const agent = request.headers.get('user-agent') || '';
  if (/iPad/i.test(agent) || (/Macintosh/i.test(agent) && /Mobile/i.test(agent))) return { name: 'iPad', type: 'tablet' };
  if (/iPhone|iPod/i.test(agent)) return { name: 'iPhone', type: 'phone' };
  if (/Android/i.test(agent)) return /Mobile/i.test(agent) ? { name: 'Android phone', type: 'phone' } : { name: 'Android tablet', type: 'tablet' };
  if (/Windows/i.test(agent)) return { name: 'Windows PC', type: 'device' };
  if (/Macintosh|Mac OS/i.test(agent)) return { name: 'Mac', type: 'device' };
  if (/Linux/i.test(agent)) return { name: 'Linux device', type: 'device' };
  return { name: 'Device', type: 'device' };
}

async function saveBrowserSession(ownerHash, sessionHash, name, type = 'device') {
  const expiresAt = Date.now() + OWNER_COOKIE_AGE * 1000;
  if (localStore()) {
    const existing = localBrowserSessions.get(sessionHash);
    localBrowserSessions.set(sessionHash, existing || { ownerHash, name, type, createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt, revokedAt: 0 });
    return;
  }
  await sql().query(`insert into dashboard_browser_sessions (token_hash, owner_hash, device_name, device_type, expires_at)
    values ($1, $2, $3, $4, now() + interval '180 days')
    on conflict (token_hash) do update set last_seen_at = now(), device_name = excluded.device_name, device_type = excluded.device_type
    where dashboard_browser_sessions.revoked_at is null`, [sessionHash, ownerHash, name, type]);
}

async function bootstrapSession(request) {
  const existing = await ownerFrom(request);
  if (existing) {
    const identity = browserName(request);
    await saveBrowserSession(existing.hash, existing.sessionHash, existing.session?.device_name || existing.session?.name || identity.name,
      existing.session?.device_type || existing.session?.type || identity.type);
    return { owner: existing, cookie: null };
  }
  const raw = token(32);
  const ownerHash = sha256(raw);
  const sessionHash = sha256(raw);
  const identity = browserName(request);
  await saveBrowserSession(ownerHash, sessionHash, identity.name, identity.type);
  return { owner: { raw, hash: ownerHash, sessionHash }, cookie: ownerSessionCookie(raw) };
}

async function listDevices(owner) {
  if (localStore()) {
    const browsers = [...localBrowserSessions.entries()].filter(([, item]) => item.ownerHash === owner.hash && !item.revokedAt && item.expiresAt > Date.now())
      .map(([id, item]) => ({ id, type: item.type || 'device', name: item.name, state: 'connected', lastSeenAt: new Date(item.lastSeenAt).toISOString(), isCurrent: id === owner.sessionHash }));
    const desktops = [...localDevices.values()].filter(item => item.ownerHash === owner.hash && !item.revokedAt)
      .map(item => ({ id: item.id, type: 'desktop', name: item.deviceName, version: item.appVersion, state: !item.lastSeenAt ? (Date.now() - item.pairedAt <= HEARTBEAT_FRESH_MS ? 'connecting' : 'offline') : Date.now() - item.lastSeenAt <= HEARTBEAT_FRESH_MS ? 'connected' : 'offline', lastSeenAt: item.lastSeenAt ? new Date(item.lastSeenAt).toISOString() : null }));
    return [...browsers, ...desktops].sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')));
  }
  const rows = await sql().query(`select id, device_name as name, 'desktop'::text as type, app_version as version, paired_at, last_seen_at
      from dashboard_devices where owner_hash = $1 and revoked_at is null
    union all
    select token_hash as id, device_name as name, device_type as type, null::text as version, created_at as paired_at, last_seen_at
      from dashboard_browser_sessions where owner_hash = $1 and revoked_at is null and expires_at > now()
    order by last_seen_at desc nulls last, paired_at desc`, [owner.hash]);
  return rows.rows.map(row => {
    const type = row.version ? 'desktop' : row.type || 'device';
    const state = type !== 'desktop' ? 'connected' : row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() <= HEARTBEAT_FRESH_MS ? 'connected' : row.last_seen_at ? 'offline' : Date.now() - new Date(row.paired_at).getTime() <= HEARTBEAT_FRESH_MS ? 'connecting' : 'offline';
    return { id: row.id, type, name: row.name, version: row.version || null, state, lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null, isCurrent: row.id === owner.sessionHash };
  });
}

async function issueBrowserLink(ownerHash) {
  const raw = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  const hash = sha256(raw);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  if (localStore()) {
    for (const [oldHash, link] of localBrowserLinks) {
      if (link.ownerHash === ownerHash && !link.usedAt && !link.revokedAt) link.revokedAt = Date.now();
      if (link.expiresAt < Date.now() - 86400000) localBrowserLinks.delete(oldHash);
    }
    localBrowserLinks.set(hash, { ownerHash, expiresAt: expiresAt.getTime(), usedAt: 0, revokedAt: 0 });
  } else {
    await sql().query(`update dashboard_browser_links set revoked_at = now()
      where owner_hash = $1 and used_at is null and revoked_at is null`, [ownerHash]);
    await sql().query(`insert into dashboard_browser_links (token_hash, owner_hash, expires_at) values ($1, $2, $3)`, [hash, ownerHash, expiresAt]);
  }
  return { shortCode: raw, expiresAt: expiresAt.toISOString() };
}

async function claimBrowserLink(rawLink, request) {
  const hash = sha256(rawLink);
  let ownerHash = '';
  if (localStore()) {
    const link = localBrowserLinks.get(hash);
    if (!link || link.usedAt || link.revokedAt || link.expiresAt <= Date.now()) return false;
    link.usedAt = Date.now();
    ownerHash = link.ownerHash;
  } else {
    const rows = await sql().query(`update dashboard_browser_links set used_at = now()
      where token_hash = $1 and used_at is null and revoked_at is null and expires_at > now()
      returning owner_hash`, [hash]);
    if (!rows.rows[0]) return false;
    ownerHash = rows.rows[0].owner_hash;
  }
  const rawSession = token(32);
  const sessionHash = sha256(rawSession);
  const identity = browserName(request);
  await saveBrowserSession(ownerHash, sessionHash, identity.name, identity.type);
  return { cookie: ownerSessionCookie(rawSession) };
}

function unavailable() { return json({ error: 'Pairing is temporarily unavailable.' }, 503); }

function pushReady() {
  const { DASHBOARD_VAPID_PUBLIC_KEY, DASHBOARD_VAPID_PRIVATE_KEY, DASHBOARD_VAPID_SUBJECT } = process.env;
  if (!DASHBOARD_VAPID_PUBLIC_KEY || !DASHBOARD_VAPID_PRIVATE_KEY || !DASHBOARD_VAPID_SUBJECT) return false;
  webpush.setVapidDetails(DASHBOARD_VAPID_SUBJECT, DASHBOARD_VAPID_PUBLIC_KEY, DASHBOARD_VAPID_PRIVATE_KEY);
  return true;
}

function validPushSubscription(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (typeof value.endpoint !== 'string' || value.endpoint.length > 2048) return false;
  try {
    const endpoint = new URL(value.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return false;
  } catch { return false; }
  return typeof value.keys?.p256dh === 'string' && /^[A-Za-z0-9_-]{40,180}$/.test(value.keys.p256dh)
    && typeof value.keys?.auth === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value.keys.auth);
}

async function savePushSubscription(ownerHash, subscription) {
  const endpointHash = sha256(subscription.endpoint);
  if (localStore()) {
    localPushSubscriptions.set(endpointHash, { ownerHash, subscription });
    return;
  }
  await sql().query(`insert into dashboard_push_subscriptions (endpoint_hash, owner_hash, endpoint, p256dh, auth_secret)
    values ($1, $2, $3, $4, $5)
    on conflict (endpoint_hash) do update set owner_hash = excluded.owner_hash, endpoint = excluded.endpoint,
      p256dh = excluded.p256dh, auth_secret = excluded.auth_secret, updated_at = now()`,
  [endpointHash, ownerHash, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
}

async function removePushSubscription(ownerHash, endpoint) {
  const endpointHash = sha256(endpoint);
  if (localStore()) {
    const row = localPushSubscriptions.get(endpointHash);
    if (row?.ownerHash === ownerHash) localPushSubscriptions.delete(endpointHash);
    return;
  }
  await sql().query('delete from dashboard_push_subscriptions where endpoint_hash = $1 and owner_hash = $2', [endpointHash, ownerHash]);
}

async function sendTestPush(ownerHash) {
  const rows = localStore()
    ? [...localPushSubscriptions.values()].filter(row => row.ownerHash === ownerHash).map(row => row.subscription)
    : (await sql().query('select endpoint, p256dh, auth_secret from dashboard_push_subscriptions where owner_hash = $1', [ownerHash])).rows
      .map(row => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_secret } }));
  if (!rows.length) return { sent: 0, removed: 0 };
  const payload = JSON.stringify({ title: 'Ultimate Macro', body: 'Phone notifications are working.', tag: 'um-push-test', url: '/dashboard/notifications/' });
  let sent = 0, removed = 0, failed = 0;
  for (const subscription of rows) {
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 });
      sent++;
    } catch (error) {
      const status = Number(error?.statusCode);
      if (status === 404 || status === 410) {
        removed++;
        await removePushSubscription(ownerHash, subscription.endpoint);
      } else failed++;
    }
  }
  return { sent, removed, failed };
}

export default async function dashboardPairing(request) {
  if (!secureApiMode()) return unavailable();
  const path = new URL(request.url).pathname;
  const route = path.replace(/^\/api\/dashboard\/v1/, '') || '/';

  try {
    if (route === '/notifications/vapid-public-key') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      if (!await bodyJson(request)) return json({ error: 'Use a JSON request.' }, 415);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      if (!pushReady()) return json({ error: 'Phone notifications are not configured yet.' }, 503);
      return json({ publicKey: process.env.DASHBOARD_VAPID_PUBLIC_KEY }, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/notifications/subscriptions') {
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      if (request.method === 'POST') {
        const body = await bodyJson(request);
        if (!body || Object.keys(body).length !== 1 || !validPushSubscription(body.subscription))
          return json({ error: 'This browser returned an invalid push subscription.' }, 400);
        const limit = await limited(`dashboard-push-subscribe:${owner.hash}`, 10, 3600);
        if (!limit.allowed) return json({ error: 'Too many notification changes. Try again later.' }, 429, { 'retry-after': String(limit.retryAfter) });
        await savePushSubscription(owner.hash, body.subscription);
        return json({ ok: true }, 201, { 'cache-control': 'no-store' });
      }
      if (request.method === 'DELETE') {
        const body = await bodyJson(request);
        if (!body || Object.keys(body).length !== 1 || typeof body.endpoint !== 'string' || body.endpoint.length > 2048)
          return json({ error: 'Invalid push subscription.' }, 400);
        await removePushSubscription(owner.hash, body.endpoint);
        return json({ ok: true }, 200, { 'cache-control': 'no-store' });
      }
      return json({ error: 'Method not allowed.' }, 405, { allow: 'POST, DELETE' });
    }

    if (route === '/notifications/test') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      if (!await bodyJson(request)) return json({ error: 'Use a JSON request.' }, 415);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      if (!pushReady()) return json({ error: 'Phone notifications are not configured yet.' }, 503);
      const limit = await limited(`dashboard-push-test:${owner.hash}`, 3, 3600);
      if (!limit.allowed) return json({ error: 'You have sent enough test alerts for now.' }, 429, { 'retry-after': String(limit.retryAfter) });
      const result = await sendTestPush(owner.hash);
      if (!result.sent && !result.removed && !result.failed) return json({ error: 'Enable phone notifications on this device first.' }, 409);
      if (!result.sent && result.failed) return json({ error: 'Could not deliver the test alert. Reconnect phone notifications and try again.' }, 502);
      return json(result, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/session/bootstrap') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      if (!await bodyJson(request)) return json({ error: 'Use a JSON request.' }, 415);
      const session = await bootstrapSession(request);
      return json({ ok: true }, 200, session.cookie ? { 'set-cookie': session.cookie, 'cache-control': 'no-store' } : { 'cache-control': 'no-store' });
    }

    if (route === '/devices') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      return json({ devices: owner ? await listDevices(owner) : [] }, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/state') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      return json({ devices: await getMacroState(owner.hash) }, 200, { 'cache-control': 'no-store', vary: 'Cookie' });
    }

    if (route === '/events') {
      if (request.method === 'GET') {
        const owner = await ownerFrom(request);
        if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
        const requested = Number(new URL(request.url).searchParams.get('limit') || 100);
        const limit = Number.isSafeInteger(requested) ? Math.max(1, Math.min(requested, 200)) : 100;
        return json({ events: await listActivityEvents(owner.hash, limit) }, 200, { 'cache-control': 'no-store', vary: 'Cookie' });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET, POST' });
      if (request.headers.has('origin') && !sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(request.headers.get('authorization') || '');
      const body = await bodyJson(request, 32768);
      if (!match || !body || Object.keys(body).some(key => key !== 'events') || !Array.isArray(body.events) || body.events.length > 25)
        return json({ error: 'Invalid activity batch.' }, 400);
      const events = body.events.map(normalizeActivityEvent);
      if (events.some(event => !event)) return json({ error: 'An activity event is invalid.' }, 400);
      const accepted = await uploadActivityEvents(match[1], events);
      return accepted === null ? json({ error: 'Device credential is invalid or revoked.' }, 401) : json({ ok: true, accepted, received: events.length });
    }

    if (route === '/browser-links') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      if (!await bodyJson(request)) return json({ error: 'Use a JSON request.' }, 415);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      const limit = await limited(`dashboard-link:${owner.hash}`, 8, 3600);
      if (!limit.allowed) return json({ error: 'Too many links requested. Try again later.' }, 429, { 'retry-after': String(limit.retryAfter) });
      const link = await issueBrowserLink(owner.hash);
      return json({ ...link, lifetimeSeconds: CODE_TTL_MS / 1000 }, 201, { 'cache-control': 'no-store' });
    }

    if (route === '/browser-links/claim') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const body = await bodyJson(request);
      const secret = body && Object.keys(body).length === 1 ? (body.code || body.token || '') : '';
      if (typeof secret !== 'string' || !(/^[A-HJ-NP-Z2-9]{12}$/i.test(secret) || /^[A-Za-z0-9_-]{40,64}$/.test(secret)))
        return json({ error: 'This device link is invalid or expired.' }, 400);
      const limit = await limited(`dashboard-link-claim:${clientIp(request)}`, 12, 600);
      if (!limit.allowed) return json({ error: 'Too many attempts. Try again later.' }, 429, { 'retry-after': String(limit.retryAfter) });
      const claimed = await claimBrowserLink(/^[A-HJ-NP-Z2-9]{12}$/i.test(secret) ? secret.toUpperCase() : secret, request);
      if (!claimed) return json({ error: 'This device link is expired or has already been used.' }, 410);
      return json({ ok: true }, 200, { 'set-cookie': claimed.cookie, 'cache-control': 'no-store' });
    }

    if (route === '/browser-sessions/revoke') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      const body = await bodyJson(request);
      if (!body || Object.keys(body).length !== 1 || typeof body.id !== 'string' || body.id.length > 64)
        return json({ error: 'Invalid browser device.' }, 400);
      if (body.id === owner.sessionHash) return json({ error: 'You cannot remove the device you are using.' }, 409);
      let removed = false;
      if (localStore()) {
        const session = localBrowserSessions.get(body.id);
        if (session && session.ownerHash === owner.hash && !session.revokedAt) { session.revokedAt = Date.now(); removed = true; }
      } else {
        const rows = await sql().query(`update dashboard_browser_sessions set revoked_at = now()
          where token_hash = $1 and owner_hash = $2 and revoked_at is null returning token_hash`, [body.id, owner.hash]);
        removed = Boolean(rows.rows[0]);
      }
      return removed ? json({ ok: true }) : json({ error: 'Device not found.' }, 404);
    }

    if (route === '/pairing-codes') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      if (!await bodyJson(request)) return json({ error: 'Use a JSON request.' }, 415);
      const ipLimit = await limited(`dashboard-code-ip:${clientIp(request)}`, 10, 3600);
      if (!ipLimit.allowed) return json({ error: 'Too many codes requested. Try again later.' }, 429, { 'retry-after': String(ipLimit.retryAfter) });
      const existing = await ownerFrom(request);
      const ownerRaw = existing?.raw || token(32);
      const ownerHash = existing?.hash || sha256(ownerRaw);
      const ownerLimit = await limited(`dashboard-code-owner:${ownerHash}`, 10, 3600);
      if (!ownerLimit.allowed) return json({ error: 'Too many codes requested. Try again later.' }, 429, { 'retry-after': String(ownerLimit.retryAfter) });
      const issued = await issueCode(ownerHash);
      const identity = browserName(request);
      await saveBrowserSession(ownerHash, sha256(ownerRaw), existing?.session?.device_name || existing?.session?.name || identity.name,
        existing?.session?.device_type || existing?.session?.type || identity.type);
      return json({ code: issued.code, expiresAt: issued.expiresAt, lifetimeSeconds: CODE_TTL_MS / 1000 }, 201, {
        'set-cookie': ownerSessionCookie(ownerRaw),
        'vary': 'Cookie'
      });
    }

    if (route === '/pairing-status') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      if (!owner) return json({ state: 'none' });
      return json({
        ...await getPairingStatus(owner.hash),
        providers: {
          openai: Boolean(process.env.OPENAI_API_KEY),
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY)
        }
      }, 200, { 'cache-control': 'no-store', vary: 'Cookie' });
    }

    if (route === '/pairing/claim') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (request.headers.has('origin') && !sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const ip = clientIp(request);
      const [ipLimit, globalLimit] = await Promise.all([
        limited(`dashboard-claim-ip:${ip}`, 6, 600),
        limited('dashboard-claim-global', 180, 3600)
      ]);
      if (!ipLimit.allowed || !globalLimit.allowed) return json({ error: 'Too many pairing attempts. Wait and try again.' }, 429, { 'retry-after': String(Math.max(ipLimit.retryAfter, globalLimit.retryAfter)) });
      const body = await bodyJson(request);
      if (!body || Object.keys(body).some(key => !['code', 'deviceName', 'appVersion'].includes(key)) ||
          typeof body.code !== 'string' || !/^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/i.test(body.code) ||
          typeof body.deviceName !== 'string' || body.deviceName.trim().length < 1 || body.deviceName.length > 80 ||
          typeof body.appVersion !== 'string' || body.appVersion.trim().length < 1 || body.appVersion.length > 32) {
        return json({ error: 'Invalid pairing request.' }, 400);
      }
      const normalizedCode = body.code.trim().toUpperCase().replace('-', '');
      const claimed = await claimCode(normalizedCode, body.deviceName.trim(), body.appVersion.trim());
      if (!claimed) return json({ error: 'That code is invalid, expired, or already used.' }, 410);
      return json({ ok: true, deviceId: claimed.deviceId, deviceToken: claimed.deviceToken, heartbeatSeconds: 20 }, 201);
    }

    if (route === '/heartbeat') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (request.headers.has('origin') && !sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(request.headers.get('authorization') || '');
      const body = await bodyJson(request);
      if (!match || !body || Object.keys(body).some(key => !['appVersion', 'snapshot'].includes(key)) ||
          (body.appVersion !== undefined && (typeof body.appVersion !== 'string' || body.appVersion.length > 32)))
        return json({ error: 'Invalid heartbeat.' }, 401);
      const snapshot = body.snapshot === undefined ? null : normalizeMacroSnapshot(body.snapshot);
      const accepted = await heartbeat(match[1], body.appVersion || '', snapshot);
      return accepted
        ? json({ ok: true, snapshotAccepted: body.snapshot === undefined || Boolean(snapshot), receivedAt: new Date().toISOString() })
        : json({ error: 'Device credential is invalid or revoked.' }, 401);
    }

    if (route === '/device/disconnect') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (request.headers.has('origin') && !sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(request.headers.get('authorization') || '');
      const body = await bodyJson(request);
      if (!match || !body || Object.keys(body).length) return json({ error: 'Invalid disconnect request.' }, 401);
      const disconnected = await disconnectDevice(match[1]);
      return disconnected ? json({ ok: true }) : json({ error: 'Device credential is invalid or already revoked.' }, 401);
    }

    if (route === '/devices/revoke') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      const body = await bodyJson(request);
      if (!body || Object.keys(body).length !== 1 || typeof body.deviceId !== 'string' || body.deviceId.length > 64)
        return json({ error: 'Invalid device.' }, 400);
      return await revokeDevice(owner.hash, body.deviceId) ? json({ ok: true }) : json({ error: 'Device not found.' }, 404);
    }

    return json({ error: 'Not found.' }, 404);
  } catch (caught) {
    console.error('Dashboard pairing request failed.');
    return unavailable();
  }
}
