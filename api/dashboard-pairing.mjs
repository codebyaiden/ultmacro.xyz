import { randomInt, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { clientIp, json } from './_lib/http.mjs';
import { databaseConfigured, sql } from './_lib/db.mjs';
import { indexedHash, parseCookies, rateLimit, sha256, token } from './_lib/security.mjs';
import { MAX_STRATEGY_BYTES, parseStrategy } from './_lib/strategy-validation.mjs';

const require = createRequire(import.meta.url);
const webpush = require('web-push');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIVITY_EVENT_TYPES = new Set([
  'run.started', 'run.stopped', 'run.paused', 'run.resumed',
  'strategy.action.requested', 'strategy.action.succeeded', 'strategy.action.failed', 'wave.skip_clicked', 'reward.claimed',
  'mode.selected', 'game.joined', 'match.started',
  'boss.appeared', 'boss.defeated', 'match.victory', 'match.loss'
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
const localNotificationPreferences = new Map();
const localNotifications = new Map();
const localRemoteCommands = new Map();
const localEarningsProgress = new Map();
const localEarningsMilestones = new Set();
const localLibraryInstalls = new Set();
const NOTIFICATION_TTL_MS = 12 * 60 * 60 * 1000;
const NOTIFICATION_DEFAULTS = Object.freeze({ results: 'errors', runEvents: 'off', connection: 'offline', hourlySummary: 'off', milestones: 'off' });
const NOTIFICATION_ALLOWED = Object.freeze({
  results: new Set(['all', 'errors', 'off']),
  runEvents: new Set(['runs', 'all', 'off']),
  connection: new Set(['all', 'offline', 'off']),
  hourlySummary: new Set(['hourly', 'off']),
  milestones: new Set(['on', 'off'])
});

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
    const reconnected = Boolean(device.offlineAt);
    const offlineAt = device.offlineAt;
    device.offlineAt = 0;
    device.lastSeenAt = Date.now();
    if (appVersion) device.appVersion = appVersion;
    if (snapshot) {
      device.snapshot = snapshot;
      device.snapshotUpdatedAt = Date.now();
    }
    if (reconnected) void sendConnectionPush(device.ownerHash, device.id, 'connection.restored', 'Your PC is back', 'The Dashboard connection has been restored.', offlineAt, new Date(device.lastSeenAt)).catch(() => {});
    return true;
  }
  const before = await sql().query(`select id, owner_hash, notification_offline_at from dashboard_devices
    where token_hash = $1 and revoked_at is null`, [tokenHash]);
  if (!before.rows[0]) return false;
  const reconnected = Boolean(before.rows[0].notification_offline_at);
  let result;
  try {
    result = await sql().query(`update dashboard_devices set last_seen_at = now(), notification_offline_at = null,
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
  if (result.rows[0] && reconnected) void sendConnectionPush(before.rows[0].owner_hash, before.rows[0].id, 'connection.restored', 'Your PC is back', 'The Dashboard connection has been restored.', before.rows[0].notification_offline_at, new Date()).catch(() => {});
  return Boolean(result.rows[0]);
}

function normalizeMacroSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = ['runState', 'activeStrategy', 'activeSlot', 'rotationEnabled', 'map', 'mode', 'strategySlots', 'availableStrategies', 'capabilities'];
  if (Object.keys(value).some(key => !allowed.includes(key)) ||
      !['stopped', 'running', 'paused'].includes(value.runState) ||
      ![1, 2].includes(value.activeSlot) || typeof value.rotationEnabled !== 'boolean' ||
      !Array.isArray(value.strategySlots) || value.strategySlots.length > 2 ||
      (value.availableStrategies !== undefined && (!Array.isArray(value.availableStrategies) || value.availableStrategies.length > 200)) ||
      (value.capabilities !== undefined && (!Array.isArray(value.capabilities) || value.capabilities.length > 16 ||
        value.capabilities.some(item => item !== 'strategy_library_install'))) ||
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
  const availableStrategies = [];
  const fileIds = new Set();
  for (const item of value.availableStrategies || []) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        Object.keys(item).some(key => !['id', 'name', 'modified', 'size'].includes(key)) ||
        typeof item.id !== 'string' || item.id.length > 180 || !/^[^\\/:\0-\x1f]+\.strat$/i.test(item.id) ||
        fileIds.has(item.id.toLowerCase()) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || /[\r\n\0]/.test(item.name) ||
        typeof item.modified !== 'string' || !/^\d{14}$/.test(item.modified) ||
        !Number.isSafeInteger(item.size) || item.size < 0 || item.size > MAX_STRATEGY_BYTES) return null;
    fileIds.add(item.id.toLowerCase());
    availableStrategies.push({ id: item.id, name: item.name.trim(), modified: item.modified, size: item.size });
  }
  return {
    runState: value.runState,
    activeStrategy: value.activeStrategy?.trim() || null,
    activeSlot: value.activeSlot,
    rotationEnabled: value.rotationEnabled,
    map: value.map.trim(),
    mode: value.mode.trim(),
    strategySlots: slots,
    availableStrategies,
    capabilities: value.capabilities || []
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

const REMOTE_COMMANDS = new Set(['start', 'pause', 'resume', 'stop', 'select_strategy_1', 'select_strategy_2', 'read_strategy_1', 'read_strategy_2', 'stage_strategy_edit', 'install_library_strategy']);

async function requestRemoteCommand(ownerHash, deviceId, command, payload = null) {
  if (!REMOTE_COMMANDS.has(command)) return { error: 'invalid' };
  if (localStore()) {
    for (const item of localRemoteCommands.values()) {
      if (item.expiresAt <= Date.now()) { item.payload = null; item.resultData = null; if (['pending', 'delivered'].includes(item.status)) item.status = 'expired'; }
    }
    const device = localDevices.get(deviceId);
    if (!device || device.ownerHash !== ownerHash || device.revokedAt) return { error: 'device' };
    if (!device.lastSeenAt || Date.now() - device.lastSeenAt > HEARTBEAT_FRESH_MS || !device.snapshot) return { error: 'offline' };
    if (command === 'install_library_strategy' && !device.snapshot.capabilities?.includes('strategy_library_install')) return { error: 'capability' };
    const state = device.snapshot.runState;
    const selectedSlot = command === 'select_strategy_2' ? 2 : command === 'select_strategy_1' ? 1 : 0;
    const payloadFileId = payload?.strategyId;
    const payloadSlot = command === 'read_strategy_2' ? 2 : command === 'read_strategy_1' && !payloadFileId ? 1 : command === 'stage_strategy_edit' ? payload?.slot : 0;
    if (selectedSlot && state !== 'stopped') return { error: 'state' };
    if (selectedSlot && !device.snapshot.strategySlots?.some((slot) => slot.slot === selectedSlot)) return { error: 'strategy' };
    if (payloadSlot && !device.snapshot.strategySlots?.some((slot) => slot.slot === payloadSlot)) return { error: 'strategy' };
    if (payloadFileId && !device.snapshot.availableStrategies?.some((file) => file.id === payloadFileId)) return { error: 'strategy' };
    if (command === 'start' && !device.snapshot.strategySlots?.length) return { error: 'strategy' };
    if ((command === 'start' && state !== 'stopped') || (command === 'pause' && state !== 'running') ||
        (command === 'resume' && state !== 'paused') || (command === 'stop' && state === 'stopped')) return { error: 'state' };
    if ([...localRemoteCommands.values()].some(item => item.deviceId === deviceId && ['pending', 'delivered'].includes(item.status) && item.expiresAt > Date.now())) return { error: 'pending' };
    const item = { id: randomUUID(), ownerHash, deviceId, command, payload, status: 'pending', requestedAt: Date.now(), expiresAt: Date.now() + 30000 };
    localRemoteCommands.set(item.id, item);
    return { command: item };
  }
  await sql().query("update dashboard_remote_commands set status = 'expired', payload = null where status in ('pending','delivered') and expires_at <= now()");
  await sql().query('update dashboard_remote_commands set payload = null, result_data = null where expires_at <= now() and (payload is not null or result_data is not null)');
  let result;
  try { result = await sql().query(`insert into dashboard_remote_commands (owner_hash, device_id, command, payload, expires_at)
    select $1, d.id, $3, $4::jsonb, now() + interval '30 seconds'
    from dashboard_devices d
    where d.id = $2 and d.owner_hash = $1 and d.revoked_at is null
      and d.last_seen_at > now() - interval '60 seconds'
      and d.state_snapshot is not null
      and ($3 <> 'start' or jsonb_array_length(coalesce(d.state_snapshot->'strategySlots', '[]'::jsonb)) > 0)
      and (($3 = 'start' and d.state_snapshot->>'runState' = 'stopped')
        or ($3 = 'pause' and d.state_snapshot->>'runState' = 'running')
        or ($3 = 'resume' and d.state_snapshot->>'runState' = 'paused')
        or ($3 = 'stop' and d.state_snapshot->>'runState' in ('running','paused'))
        or ($3 = 'select_strategy_1' and d.state_snapshot->>'runState' = 'stopped' and d.state_snapshot->'strategySlots' @> '[{"slot":1}]'::jsonb)
        or ($3 = 'select_strategy_2' and d.state_snapshot->>'runState' = 'stopped' and d.state_snapshot->'strategySlots' @> '[{"slot":2}]'::jsonb)
        or ($3 = 'read_strategy_1' and (($4::jsonb is null and d.state_snapshot->'strategySlots' @> '[{"slot":1}]'::jsonb)
          or d.state_snapshot->'availableStrategies' @> jsonb_build_array(jsonb_build_object('id', $4::jsonb->>'strategyId'))))
        or ($3 = 'read_strategy_2' and d.state_snapshot->'strategySlots' @> '[{"slot":2}]'::jsonb)
        or ($3 = 'stage_strategy_edit' and (($4::jsonb->>'slot') is not null and d.state_snapshot->'strategySlots' @> jsonb_build_array(jsonb_build_object('slot', ($4::jsonb->>'slot')::int))
          or ($4::jsonb->>'strategyId') is not null and d.state_snapshot->'availableStrategies' @> jsonb_build_array(jsonb_build_object('id', $4::jsonb->>'strategyId'))))
        or ($3 = 'install_library_strategy' and d.state_snapshot->'capabilities' @> '["strategy_library_install"]'::jsonb))
      and not exists (select 1 from dashboard_remote_commands c where c.device_id = d.id and c.status in ('pending','delivered') and c.expires_at > now())
    returning id, command, status, expires_at`, [ownerHash, deviceId, command, payload ? JSON.stringify(payload) : null]); }
  catch (error) { if (error?.code !== '23505') throw error; result = { rows: [] }; }
  if (result.rows[0]) return { command: result.rows[0] };
  const device = await sql().query(`select id, last_seen_at, state_snapshot from dashboard_devices where id = $1 and owner_hash = $2 and revoked_at is null`, [deviceId, ownerHash]);
  if (!device.rows[0]) return { error: 'device' };
  if (!device.rows[0].last_seen_at || Date.now() - new Date(device.rows[0].last_seen_at).getTime() > HEARTBEAT_FRESH_MS || !device.rows[0].state_snapshot) return { error: 'offline' };
  if (command === 'install_library_strategy' && !device.rows[0].state_snapshot.capabilities?.includes('strategy_library_install')) return { error: 'capability' };
  const state = device.rows[0].state_snapshot.runState;
  const selectedSlot = command === 'select_strategy_2' ? 2 : command === 'select_strategy_1' ? 1 : 0;
  const requiredSlot = command === 'read_strategy_2' ? 2 : command === 'read_strategy_1' && !payload?.strategyId ? 1 : command === 'stage_strategy_edit' ? payload?.slot : 0;
  const requiredFileId = payload?.strategyId;
  if (selectedSlot && state !== 'stopped') return { error: 'state' };
  if (requiredSlot && !device.rows[0].state_snapshot.strategySlots?.some((slot) => slot.slot === requiredSlot)) return { error: 'strategy' };
  if (requiredFileId && !device.rows[0].state_snapshot.availableStrategies?.some((file) => file.id === requiredFileId)) return { error: 'strategy' };
  if (command === 'start' && !device.rows[0].state_snapshot.strategySlots?.length) return { error: 'strategy' };
  if ((command === 'start' && state !== 'stopped') || (command === 'pause' && state !== 'running') || (command === 'resume' && state !== 'paused') || (command === 'stop' && state === 'stopped')) return { error: 'state' };
  return { error: 'pending' };
}

async function pollRemoteCommands(deviceToken) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    if (!device) return null;
    const item = [...localRemoteCommands.values()].find(command => command.deviceId === device.id && command.status === 'pending' && command.expiresAt > Date.now());
    if (!item) return [];
    item.status = 'delivered';
    return [{ id: item.id, action: item.command, payload: item.payload, expiresAt: new Date(item.expiresAt).toISOString() }];
  }
  const result = await sql().query(`with device as (
      select id from dashboard_devices where token_hash = $1 and revoked_at is null
    ), picked as (
      select c.id from dashboard_remote_commands c join device d on d.id = c.device_id
      where c.status = 'pending' and c.expires_at > now()
      order by c.requested_at asc limit 1 for update skip locked
    )
    update dashboard_remote_commands c set status = 'delivered', delivered_at = now()
    from picked where c.id = picked.id
    returning c.id, c.command, c.payload, c.expires_at`, [tokenHash]);
  const valid = await sql().query('select id from dashboard_devices where token_hash = $1 and revoked_at is null', [tokenHash]);
  if (!valid.rows[0]) return null;
  return result.rows.map(row => ({ id: row.id, action: row.command, payload: row.payload, expiresAt: new Date(row.expires_at).toISOString() }));
}

async function completeRemoteCommand(deviceToken, id, result, message, data = null) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    const command = localRemoteCommands.get(id);
    if (!device || !command || command.deviceId !== device.id || command.status !== 'delivered') return false;
    command.status = result;
    command.result = message;
    command.resultData = data;
    command.payload = null;
    command.completedAt = Date.now();
    return true;
  }
  const updated = await sql().query(`update dashboard_remote_commands c set status = $3, result = $4, result_data = $5, payload = null, completed_at = now()
    from dashboard_devices d where c.id = $1 and c.device_id = d.id and d.token_hash = $2
      and d.revoked_at is null and c.status = 'delivered' returning c.id`, [id, tokenHash, result, message, data]);
  return Boolean(updated.rows[0]);
}

async function getRemoteCommand(ownerHash, id, consume = false) {
  if (localStore()) {
    const command = localRemoteCommands.get(id);
    if (!command || command.ownerHash !== ownerHash) return null;
    const response = { id, status: command.status, message: command.result || '', data: command.resultData || null };
    if (consume && command.command.startsWith('read_strategy_')) command.resultData = null;
    return response;
  }
  const result = await sql().query(`select c.id, c.command, c.status, c.result, c.result_data
    from dashboard_remote_commands c join dashboard_devices d on d.id = c.device_id
    where c.id = $1 and c.owner_hash = $2 and d.owner_hash = $2 and d.revoked_at is null`, [id, ownerHash]);
  const row = result.rows[0];
  if (!row) return null;
  const data = row.result_data || null;
  if (consume && row.command.startsWith('read_strategy_') && data) {
    await sql().query(`update dashboard_remote_commands set result_data = null where id = $1 and owner_hash = $2 and status in ('succeeded','failed')`, [id, ownerHash]);
  }
  return { id, status: row.status, message: row.result || '', data };
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
  if (dataKeys.some(key => !['action', 'detail', 'rewardType', 'map', 'mode', 'coins', 'gems', 'towerXp', 'durationSeconds'].includes(key)) ||
      (value.data.action !== undefined && !ACTIVITY_ACTIONS.has(value.data.action)) ||
      (value.data.rewardType !== undefined && value.data.rewardType !== 'playtime') ||
      (value.data.detail !== undefined && (typeof value.data.detail !== 'string' || value.data.detail.length > 64 || /[\r\n\0]/.test(value.data.detail))) ||
      ['map', 'mode'].some(key => value.data[key] !== undefined && (typeof value.data[key] !== 'string' || value.data[key].length > 64 || /[\r\n\0]/.test(value.data[key]))) ||
      ['coins', 'gems', 'towerXp', 'durationSeconds'].some(key => value.data[key] !== undefined &&
        (!Number.isSafeInteger(value.data[key]) || value.data[key] < 0 || value.data[key] > (key === 'durationSeconds' ? 86400 : 1000000000)))) return null;
  if (value.type.startsWith('strategy.action.') && !value.data.action) return null;
  if (value.type === 'reward.claimed' && value.data.rewardType !== 'playtime') return null;
  if (['coins', 'gems', 'towerXp', 'durationSeconds'].some(key => value.data[key] !== undefined) &&
      !['match.victory', 'match.loss'].includes(value.type)) return null;

  return {
    eventId: value.eventId.toLowerCase(), sequence: value.sequence, type: value.type,
    occurredAt: new Date(value.occurredAt).toISOString(), appVersion: value.appVersion,
    runId: value.runId.toLowerCase(), source: value.source, confidence: value.confidence,
    data: {
      ...(value.data.action ? { action: value.data.action } : {}),
      ...(value.data.detail ? { detail: value.data.detail.trim() } : {}),
      ...(value.data.rewardType ? { rewardType: value.data.rewardType } : {}),
      ...(value.data.map ? { map: value.data.map.trim() } : {}),
      ...(value.data.mode ? { mode: value.data.mode.trim() } : {}),
      ...Object.fromEntries(['coins', 'gems', 'towerXp', 'durationSeconds']
        .filter(key => value.data[key] !== undefined).map(key => [key, value.data[key]]))
    }
  };
}

async function uploadActivityEvents(deviceToken, events) {
  const tokenHash = sha256(deviceToken);
  if (localStore()) {
    const device = [...localDevices.values()].find(item => item.tokenHash === tokenHash && !item.revokedAt);
    if (!device) return null;
    let accepted = 0;
    const insertedEvents = [];
    for (const event of events) {
      const key = `${device.id}:${event.eventId}`;
      const duplicate = [...localActivityEvents.values()].some(item => item.deviceId === device.id && (item.eventId === event.eventId || (item.runId === event.runId && item.sequence === event.sequence)));
      if (duplicate) continue;
      localActivityEvents.set(key, { ...event, deviceId: device.id, deviceName: device.deviceName, ownerHash: device.ownerHash });
      insertedEvents.push(event);
      if (event.type === 'match.victory' || event.type === 'match.loss') {
        const progress = localEarningsProgress.get(device.ownerHash) || { coins: 0, gems: 0, towerXp: 0, victories: 0 };
        progress.coins += event.data.coins || 0;
        progress.gems += event.data.gems || 0;
        progress.towerXp += event.data.towerXp || 0;
        if (event.type === 'match.victory') progress.victories += 1;
        localEarningsProgress.set(device.ownerHash, progress);
      }
      void sendActivityPush(device.ownerHash, device.id, event).catch(() => {});
      accepted++;
    }
    if (insertedEvents.length) await processEarningsMilestones(device.ownerHash, insertedEvents).catch(() => {});
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
    on conflict do nothing returning event_id, event_type, run_id, sequence, occurred_at, data`, params);
  await sql().query("delete from dashboard_activity_events where owner_hash = $1 and occurred_at < now() - interval '30 days'", [device.owner_hash]);
  const insertedEvents = [];
  for (const event of inserted.rows) {
    const normalized = events.find(item => item.eventId === event.event_id);
    if (normalized) {
      insertedEvents.push(normalized);
      void sendActivityPush(device.owner_hash, device.id, normalized).catch(() => {});
    }
  }
  if (insertedEvents.length) await processEarningsMilestones(device.owner_hash, insertedEvents).catch(() => {});
  return inserted.rows.length;
}

async function listActivityEvents(ownerHash, limit = 100) {
  if (localStore()) {
    return [...localActivityEvents.values()].filter(event => event.ownerHash === ownerHash && Date.now() - Date.parse(event.occurredAt) <= 30 * 86400000)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sequence - a.sequence)
      .slice(0, limit).map(({ ownerHash: _ownerHash, ...event }) => event);
  }
  const result = await sql().query(`select e.event_id as "eventId", e.device_id as "deviceId", e.run_id as "runId",
      e.sequence, e.event_type as type, e.occurred_at as "occurredAt", e.app_version as "appVersion",
      e.source, e.confidence, e.data, d.device_name as "deviceName"
    from dashboard_activity_events e join dashboard_devices d on d.id = e.device_id
    where e.owner_hash = $1 and e.occurred_at > now() - interval '30 days'
    order by e.occurred_at desc, e.sequence desc limit $2`, [ownerHash, limit]);
  return result.rows;
}

const EARNINGS_RANGES = Object.freeze({
  hour: { ms: 60 * 60 * 1000, count: 12, step: 5 * 60 * 1000, sql: "date_trunc('hour', occurred_at) + floor(extract(minute from occurred_at) / 5) * interval '5 minutes'" },
  day: { ms: 24 * 60 * 60 * 1000, count: 24, step: 60 * 60 * 1000, sql: "date_trunc('hour', occurred_at)" },
  week: { ms: 7 * 24 * 60 * 60 * 1000, count: 7, step: 24 * 60 * 60 * 1000, sql: "date_trunc('day', occurred_at)" },
  month: { ms: 30 * 24 * 60 * 60 * 1000, count: 30, step: 24 * 60 * 60 * 1000, sql: "date_trunc('day', occurred_at)" }
});

function earningsBucketStart(value, range) {
  const date = new Date(value);
  if (range === 'hour') date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  else if (range === 'day') date.setMinutes(0, 0, 0);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function earningsResponse(range, rangeInfo, bucketRows, recentRows, now = Date.now()) {
  const currentBucket = Math.floor(now / rangeInfo.step) * rangeInfo.step;
  const firstBucket = currentBucket - (rangeInfo.count - 1) * rangeInfo.step;
  const totals = { coins: 0, gems: 0, towerXp: 0 };
  const valuesByBucket = new Map();
  for (const row of bucketRows) {
    const at = earningsBucketStart(row.bucket, range).getTime();
    const values = {
      coins: Number(row.coins) || 0,
      gems: Number(row.gems) || 0,
      towerXp: Number(row.towerXp ?? row.tower_xp) || 0
    };
    valuesByBucket.set(at, values);
    totals.coins += values.coins;
    totals.gems += values.gems;
    totals.towerXp += values.towerXp;
  }
  const buckets = Array.from({ length: rangeInfo.count }, (_, index) => {
    const start = firstBucket + index * rangeInfo.step;
    return { start: new Date(start).toISOString(), ...(valuesByBucket.get(start) || { coins: 0, gems: 0, towerXp: 0 }) };
  });
  const latest = recentRows.map(row => ({
    eventId: row.eventId ?? row.event_id,
    type: row.type ?? row.event_type,
    occurredAt: new Date(row.occurredAt ?? row.occurred_at).toISOString(),
    map: row.data?.map || null,
    coins: Number.isSafeInteger(row.data?.coins) ? row.data.coins : null,
    gems: Number.isSafeInteger(row.data?.gems) ? row.data.gems : null,
    towerXp: Number.isSafeInteger(row.data?.towerXp) ? row.data.towerXp : null
  }));
  return { range, totals, buckets, latest };
}

async function listEarnings(ownerHash, range) {
  const rangeInfo = EARNINGS_RANGES[range];
  const cutoff = Date.now() - rangeInfo.ms;
  if (localStore()) {
    const events = [...localActivityEvents.values()].filter(event => event.ownerHash === ownerHash &&
      ['match.victory', 'match.loss'].includes(event.type) && Date.parse(event.occurredAt) >= cutoff);
    const grouped = new Map();
    for (const event of events) {
      const key = earningsBucketStart(event.occurredAt, range).toISOString();
      const row = grouped.get(key) || { bucket: key, coins: 0, gems: 0, towerXp: 0 };
      row.coins += event.data.coins || 0;
      row.gems += event.data.gems || 0;
      row.towerXp += event.data.towerXp || 0;
      grouped.set(key, row);
    }
    events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.sequence - a.sequence);
    return earningsResponse(range, rangeInfo, [...grouped.values()], events.slice(0, 20));
  }

  const buckets = await sql().query(`select ${rangeInfo.sql} as bucket,
      coalesce(sum((data->>'coins')::bigint), 0) as coins,
      coalesce(sum((data->>'gems')::bigint), 0) as gems,
      coalesce(sum((data->>'towerXp')::bigint), 0) as "towerXp"
    from dashboard_activity_events
    where owner_hash = $1 and event_type in ('match.victory', 'match.loss') and occurred_at >= $2
    group by 1 order by 1`, [ownerHash, new Date(cutoff)]);
  const recent = await sql().query(`select event_id as "eventId", event_type as type, occurred_at as "occurredAt", data
    from dashboard_activity_events
    where owner_hash = $1 and event_type in ('match.victory', 'match.loss') and occurred_at >= $2
    order by occurred_at desc, sequence desc limit 20`, [ownerHash, new Date(cutoff)]);
  return earningsResponse(range, rangeInfo, buckets.rows, recent.rows);
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

const notificationExpiryTimer = setInterval(() => { void cleanupExpiredNotifications().catch(() => {}); }, 15 * 60 * 1000);
notificationExpiryTimer.unref?.();
const notificationConnectionTimer = setInterval(() => { void scanOfflineDevices().catch(() => {}); }, 15 * 1000);
notificationConnectionTimer.unref?.();

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

function validNotificationPreferences(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === Object.keys(NOTIFICATION_ALLOWED).length &&
    Object.entries(NOTIFICATION_ALLOWED).every(([key, values]) => values.has(value[key]));
}

async function notificationPreferences(ownerHash, deviceHash = '') {
  let rows;
  if (localStore()) {
    rows = [...localNotificationPreferences.values()].filter(row => row.ownerHash === ownerHash);
  } else {
    rows = (await sql().query(`select device_hash, results, run_events as "runEvents", connection,
        hourly_summary as "hourlySummary", milestones
      from dashboard_notification_preferences where owner_hash = $1 and device_hash = any($2::text[])`,
    [ownerHash, deviceHash ? ['account', deviceHash] : ['account']])).rows;
  }
  const account = rows.find(row => row.device_hash === 'account' || row.deviceHash === 'account');
  const device = deviceHash && rows.find(row => (row.device_hash || row.deviceHash) === deviceHash);
  const normalize = row => row ? ({ results: row.results, runEvents: row.runEvents ?? row.run_events, connection: row.connection,
    hourlySummary: row.hourlySummary ?? row.hourly_summary ?? 'off', milestones: row.milestones || 'off' }) : { ...NOTIFICATION_DEFAULTS };
  const accountPreferences = normalize(account);
  const devicePreferences = device ? normalize(device) : null;
  return {
    account: accountPreferences, device: devicePreferences, effective: devicePreferences || accountPreferences,
    accountConfigured: Boolean(account), deviceConfigured: Boolean(device)
  };
}

async function notificationPreferencesForDevices(ownerHash, deviceHashes) {
  const hashes = [...new Set(deviceHashes)];
  let rows;
  if (localStore()) rows = [...localNotificationPreferences.values()].filter(row => row.ownerHash === ownerHash && (row.deviceHash === 'account' || hashes.includes(row.deviceHash)));
  else rows = (await sql().query(`select device_hash, results, run_events as "runEvents", connection,
      hourly_summary as "hourlySummary", milestones
    from dashboard_notification_preferences where owner_hash = $1 and device_hash = any($2::text[])`, [ownerHash, ['account', ...hashes]])).rows;
  const accountRow = rows.find(row => row.device_hash === 'account' || row.deviceHash === 'account');
  const normalize = row => ({ results: row.results, runEvents: row.runEvents ?? row.run_events, connection: row.connection,
    hourlySummary: row.hourlySummary ?? row.hourly_summary ?? 'off', milestones: row.milestones || 'off' });
  const account = accountRow ? normalize(accountRow) : { ...NOTIFICATION_DEFAULTS };
  return new Map(hashes.map(hash => {
    const override = rows.find(row => (row.device_hash || row.deviceHash) === hash);
    return [hash, override ? normalize(override) : account];
  }));
}

async function saveNotificationPreferences(ownerHash, deviceHash, preferences) {
  if (localStore()) {
    localNotificationPreferences.set(`${ownerHash}:${deviceHash}`, { ownerHash, deviceHash, ...preferences });
    return;
  }
  await sql().query(`insert into dashboard_notification_preferences
      (owner_hash, device_hash, results, run_events, connection, hourly_summary, milestones)
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (owner_hash, device_hash) do update set results = excluded.results,
      run_events = excluded.run_events, connection = excluded.connection, hourly_summary = excluded.hourly_summary,
      milestones = excluded.milestones, updated_at = now()`,
  [ownerHash, deviceHash, preferences.results, preferences.runEvents, preferences.connection, preferences.hourlySummary, preferences.milestones]);
}

async function cleanupExpiredNotifications() {
  if (localStore()) {
    const now = Date.now();
    for (const [id, row] of localNotifications) if (row.expiresAt <= now) localNotifications.delete(id);
    return;
  }
  await sql().query('delete from dashboard_notifications where expires_at <= now()');
}

async function saveNotification(ownerHash, eventId, eventType, title, body, category, details, occurredAt = new Date()) {
  const id = randomUUID();
  const createdAt = Date.now();
  if (localStore()) {
    const duplicate = [...localNotifications.values()].find(row => row.ownerHash === ownerHash && row.eventId === eventId && row.eventType === eventType);
    if (duplicate) return null;
    localNotifications.set(id, { id, ownerHash, eventId, eventType, title, body, category, details, occurredAt: new Date(occurredAt).toISOString(), expiresAt: createdAt + NOTIFICATION_TTL_MS });
    return id;
  }
  const result = await sql().query(`insert into dashboard_notifications
      (id, owner_hash, event_id, event_type, title, body, category, details, occurred_at, expires_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now() + interval '12 hours')
    on conflict (owner_hash, event_id, event_type) do nothing returning id`,
  [id, ownerHash, eventId, eventType, title, body, category, JSON.stringify(details), occurredAt]);
  return result.rows[0]?.id || null;
}

async function getNotification(ownerHash, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (localStore()) {
    const row = localNotifications.get(id);
    return row && row.ownerHash === ownerHash && row.expiresAt > Date.now() ? row : null;
  }
  const result = await sql().query(`select id, event_type as "eventType", title, body, category, details,
      occurred_at as "occurredAt", expires_at as "expiresAt"
    from dashboard_notifications where id = $1 and owner_hash = $2 and expires_at > now()`, [id, ownerHash]);
  return result.rows[0] || null;
}

function activityNotification(event) {
  if (event.type === 'match.victory' || event.type === 'match.loss') {
    const rewards = [];
    if (Number.isSafeInteger(event.data.coins)) rewards.push(`+${event.data.coins.toLocaleString()} coins`);
    if (Number.isSafeInteger(event.data.gems)) rewards.push(`+${event.data.gems.toLocaleString()} gems`);
    if (Number.isSafeInteger(event.data.towerXp)) rewards.push(`+${event.data.towerXp.toLocaleString()} XP`);
    const result = event.type === 'match.victory' ? 'Victory!' : 'Run ended';
    const context = [event.data.map, ...rewards].filter(Boolean).join(' · ');
    return {
      title: result,
      body: context || (event.type === 'match.victory' ? 'Your macro finished the match.' : 'Your macro reached the end of the match.'),
      category: 'results',
      details: { eventId: event.eventId, eventType: event.type, occurredAt: event.occurredAt }
    };
  }
  const names = {
    'run.started': ['Run started', 'Your macro started a run.'],
    'run.paused': ['Run paused', 'Your macro paused the current run.'],
    'run.resumed': ['Run resumed', 'Your macro resumed the current run.'],
    'run.stopped': ['Run stopped', 'Your macro stopped the current run.'],
    'strategy.action.succeeded': ({
      spawntower: ['Tower placed', 'A tower was placed successfully.'],
      upgradetower: ['Tower upgraded', 'A tower upgrade was confirmed.'],
      selltower: ['Tower sold', 'A tower sale was confirmed.']
    })[event.data.action]
  };
  const message = names[event.type];
  if (!message) return null;
  return { title: message[0], body: message[1], category: 'runEvents', details: { eventId: event.eventId, eventType: event.type, action: event.data.action || null, occurredAt: event.occurredAt } };
}

async function sendStoredPush(ownerHash, recordId, eventId, category, onlyDeviceHash = '') {
  let subscriptions;
  if (localStore()) {
    subscriptions = [...localPushSubscriptions.entries()].filter(([, row]) => row.ownerHash === ownerHash && (!onlyDeviceHash || rowHashMatches(row, onlyDeviceHash)))
      .map(([deviceHash, row]) => ({ deviceHash, subscription: row.subscription }));
  } else {
    const rows = (await sql().query(`select endpoint_hash as "deviceHash", endpoint, p256dh, auth_secret as "authSecret"
      from dashboard_push_subscriptions where owner_hash = $1 and ($2 = '' or endpoint_hash = $2)`, [ownerHash, onlyDeviceHash])).rows;
    subscriptions = rows.map(row => ({ deviceHash: row.deviceHash, subscription: { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.authSecret } } }));
  }
  if (!subscriptions.length) return { sent: 0, removed: 0, failed: 0 };
  const payload = JSON.stringify({ title: recordId.title, body: recordId.body, tag: `um-${eventId}`, url: `/dashboard/notification/?id=${encodeURIComponent(recordId.id)}` });
  const preferences = await notificationPreferencesForDevices(ownerHash, subscriptions.map(row => row.deviceHash));
  let sent = 0, removed = 0, failed = 0;
  for (const { deviceHash, subscription } of subscriptions) {
    const selected = preferences.get(deviceHash) || NOTIFICATION_DEFAULTS;
    const allowed = category === 'results' ? (selected.results === 'all' || (selected.results === 'errors' && recordId.eventType === 'run.error'))
      : category === 'connection' ? (selected.connection === 'all' || (selected.connection === 'offline' && String(recordId.eventType || '').endsWith('.offline')))
      : category === 'summary' ? selected.hourlySummary === 'hourly'
      : category === 'milestone' ? selected.milestones === 'on'
      : selected.runEvents === 'all' || (selected.runEvents === 'runs' && String(recordId.eventType || '').startsWith('run.'));
    if (!allowed) continue;
    try {
      await webpush.sendNotification(subscription, payload, { TTL: 43200 });
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

function rowHashMatches(row, hash) { return sha256(row.subscription.endpoint) === hash; }

async function sendActivityPush(ownerHash, deviceId, event) {
  const notification = activityNotification(event);
  if (!notification) return;
  const recordId = await saveNotification(ownerHash, event.eventId, event.type, notification.title, notification.body, notification.category,
    { ...notification.details, deviceId }, event.occurredAt);
  if (!recordId) return;
  const record = localStore() ? localNotifications.get(recordId) : { id: recordId, title: notification.title, body: notification.body, eventType: event.type };
  void sendStoredPush(ownerHash, record, event.eventId, notification.category).catch(() => {});
}

const EARNINGS_MILESTONES = Object.freeze({
  coins: { step: 100000, label: 'coins earned' },
  gems: { step: 10000, label: 'gems earned' },
  towerXp: { step: 1000, label: 'Tower XP earned' },
  victories: { step: 10, label: 'victories' }
});

export function crossedEarningsMilestone(previous, current, step) {
  if (![previous, current, step].every(Number.isSafeInteger) || previous < 0 || current <= previous || step < 1) return 0;
  const threshold = Math.floor(current / step) * step;
  return threshold > previous ? threshold : 0;
}

async function currentEarningsProgress(ownerHash) {
  if (localStore()) return localEarningsProgress.get(ownerHash) || { coins: 0, gems: 0, towerXp: 0, victories: 0 };
  const row = (await sql().query(`select coins, gems, tower_xp as "towerXp", victories
    from dashboard_earnings_progress where owner_hash = $1`, [ownerHash])).rows[0];
  return row ? Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value) || 0]))
    : { coins: 0, gems: 0, towerXp: 0, victories: 0 };
}

async function reserveEarningsMilestone(ownerHash, metric, threshold) {
  const prefix = `${ownerHash}:${metric}:`;
  if (localStore()) {
    for (const key of localEarningsMilestones) {
      if (key.startsWith(prefix) && Number(key.slice(prefix.length)) >= threshold) return false;
    }
    localEarningsMilestones.add(`${prefix}${threshold}`);
    return true;
  }
  const inserted = await sql().query(`insert into dashboard_earnings_milestones (owner_hash, metric, threshold)
    values ($1, $2, $3)
    on conflict (owner_hash, metric) do update set threshold = excluded.threshold, reached_at = now()
    where dashboard_earnings_milestones.threshold < excluded.threshold
    returning threshold`, [ownerHash, metric, threshold]);
  return inserted.rows.length > 0;
}

async function processEarningsMilestones(ownerHash, events) {
  const delta = { coins: 0, gems: 0, towerXp: 0, victories: 0 };
  for (const event of events) {
    if (!['match.victory', 'match.loss'].includes(event.type)) continue;
    delta.coins += event.data.coins || 0;
    delta.gems += event.data.gems || 0;
    delta.towerXp += event.data.towerXp || 0;
    if (event.type === 'match.victory') delta.victories++;
  }
  if (!Object.values(delta).some(Boolean)) return;
  const current = await currentEarningsProgress(ownerHash);
  for (const [metric, definition] of Object.entries(EARNINGS_MILESTONES)) {
    const threshold = Math.floor(current[metric] / definition.step) * definition.step;
    if (!threshold || !await reserveEarningsMilestone(ownerHash, metric, threshold)) continue;
    const eventId = `milestone:${metric}:${threshold}`;
    const title = 'Milestone reached';
    const body = `${new Intl.NumberFormat().format(threshold)} ${definition.label}.`;
    const id = await saveNotification(ownerHash, eventId, 'earnings.milestone', title, body, 'milestone', {
      metric, threshold, occurredAt: new Date().toISOString()
    });
    if (!id) continue;
    const record = localStore() ? localNotifications.get(id) : { id, title, body, eventType: 'earnings.milestone' };
    await sendStoredPush(ownerHash, record, eventId, 'milestone').catch(() => {});
  }
}

function hourlySummaryRows(start, end) {
  const grouped = new Map();
  for (const event of localActivityEvents.values()) {
    const occurredAt = Date.parse(event.occurredAt);
    if (!['match.victory', 'match.loss'].includes(event.type) || occurredAt < start || occurredAt >= end) continue;
    const row = grouped.get(event.ownerHash) || { ownerHash: event.ownerHash, coins: 0, gems: 0, towerXp: 0, victories: 0, losses: 0 };
    row.coins += event.data.coins || 0;
    row.gems += event.data.gems || 0;
    row.towerXp += event.data.towerXp || 0;
    if (event.type === 'match.victory') row.victories++;
    else row.losses++;
    grouped.set(event.ownerHash, row);
  }
  return [...grouped.values()];
}

export async function runHourlyEarningsSummary(now = Date.now()) {
  const end = Math.floor(now / 3600000) * 3600000;
  const start = end - 3600000;
  let rows;
  if (localStore()) rows = hourlySummaryRows(start, end);
  else rows = (await sql().query(`select owner_hash as "ownerHash",
      coalesce(sum(coalesce((data->>'coins')::bigint, 0)), 0) as coins,
      coalesce(sum(coalesce((data->>'gems')::bigint, 0)), 0) as gems,
      coalesce(sum(coalesce((data->>'towerXp')::bigint, 0)), 0) as "towerXp",
      count(*) filter (where event_type = 'match.victory') as victories,
      count(*) filter (where event_type = 'match.loss') as losses
    from dashboard_activity_events
    where event_type in ('match.victory', 'match.loss') and occurred_at >= $1 and occurred_at < $2
    group by owner_hash`, [new Date(start), new Date(end)])).rows;

  let created = 0;
  for (const row of rows) {
    const rewards = [];
    if (Number(row.coins) > 0) rewards.push(`+${Number(row.coins).toLocaleString()} coins`);
    if (Number(row.gems) > 0) rewards.push(`+${Number(row.gems).toLocaleString()} gems`);
    if (Number(row.towerXp ?? row.tower_xp) > 0) rewards.push(`+${Number(row.towerXp ?? row.tower_xp).toLocaleString()} Tower XP`);
    const runs = [Number(row.victories) ? `${Number(row.victories)} wins` : '', Number(row.losses) ? `${Number(row.losses)} losses` : ''].filter(Boolean);
    const body = [...rewards, ...runs].join(' · ');
    if (!body) continue;
    const hourId = `hourly:${new Date(start).toISOString()}`;
    const title = 'Hourly recap';
    const occurredAt = new Date(start);
    const id = await saveNotification(row.ownerHash, hourId, 'earnings.hourly', title, body, 'summary', {
      start: occurredAt.toISOString(), end: new Date(end).toISOString(), coins: Number(row.coins) || 0,
      gems: Number(row.gems) || 0, towerXp: Number(row.towerXp ?? row.tower_xp) || 0,
      victories: Number(row.victories) || 0, losses: Number(row.losses) || 0
    }, occurredAt);
    if (!id) continue;
    created++;
    const record = localStore() ? localNotifications.get(id) : { id, title, body, eventType: 'earnings.hourly' };
    await sendStoredPush(row.ownerHash, record, hourId, 'summary').catch(() => {});
  }
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), created };
}

const hourlyEarningsTimer = setInterval(() => { void runHourlyEarningsSummary().catch(() => {}); }, 60 * 1000);
hourlyEarningsTimer.unref?.();

async function sendConnectionPush(ownerHash, deviceId, type, title, body, occurredAt, restoredAt = null) {
  const eventId = `${type}:${deviceId}:${new Date(occurredAt || Date.now()).toISOString()}`;
  const notificationId = await saveNotification(ownerHash, eventId, type, title, body, 'connection', {
    deviceId, occurredAt: new Date(occurredAt || Date.now()).toISOString(), ...(restoredAt ? { restoredAt: new Date(restoredAt).toISOString() } : {})
  }, occurredAt || new Date());
  if (!notificationId) return;
  const record = localStore() ? localNotifications.get(notificationId) : { id: notificationId, title, body, eventType: type };
  void sendStoredPush(ownerHash, record, eventId, 'connection').catch(() => {});
}

async function scanOfflineDevices() {
  if (localStore()) {
    const cutoff = Date.now() - HEARTBEAT_FRESH_MS;
    for (const device of localDevices.values()) {
      if (device.revokedAt || !device.lastSeenAt || device.lastSeenAt >= cutoff || device.offlineAt) continue;
      device.offlineAt = device.lastSeenAt;
      void sendConnectionPush(device.ownerHash, device.id, 'connection.offline', 'Your PC went offline', 'The Dashboard lost its connection to your PC.', device.lastSeenAt).catch(() => {});
    }
    return;
  }
  const rows = await sql().query(`update dashboard_devices set notification_offline_at = last_seen_at
    where revoked_at is null and last_seen_at is not null and last_seen_at < now() - interval '60 seconds'
      and (notification_offline_at is null or notification_offline_at < last_seen_at)
    returning id, owner_hash, device_name, last_seen_at`);
  for (const row of rows.rows) void sendConnectionPush(row.owner_hash, row.id, 'connection.offline', 'Your PC went offline', 'The Dashboard lost its connection to your PC.', row.last_seen_at).catch(() => {});
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

async function sendTestPush(ownerHash, endpoint) {
  const deviceHash = sha256(endpoint);
  let subscription = null;
  if (localStore()) subscription = localPushSubscriptions.get(deviceHash)?.ownerHash === ownerHash ? localPushSubscriptions.get(deviceHash).subscription : null;
  else {
    const row = (await sql().query('select endpoint, p256dh, auth_secret from dashboard_push_subscriptions where endpoint_hash = $1 and owner_hash = $2', [deviceHash, ownerHash])).rows[0];
    if (row) subscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_secret } };
  }
  if (!subscription) return { sent: 0, removed: 0, failed: 0 };
  const eventId = randomUUID();
  const notificationId = await saveNotification(ownerHash, eventId, 'notification.test', 'Test alert', 'Your phone notifications are working.', 'test', { test: true });
  if (!notificationId) return { sent: 0, removed: 0, failed: 1 };
  const record = localStore() ? localNotifications.get(notificationId) : { id: notificationId, title: 'Test alert', body: 'Your phone notifications are working.' };
  const payload = JSON.stringify({ title: record.title, body: record.body, tag: 'um-push-test', url: `/dashboard/notification/?id=${encodeURIComponent(notificationId)}` });
  try {
    await webpush.sendNotification(subscription, payload, { TTL: 43200 });
    return { sent: 1, removed: 0, failed: 0, notificationId };
  } catch (error) {
    const status = Number(error?.statusCode);
    if (status === 404 || status === 410) { await removePushSubscription(ownerHash, endpoint); return { sent: 0, removed: 1, failed: 0, notificationId }; }
    return { sent: 0, removed: 0, failed: 1, notificationId };
  }
}

export default async function dashboardPairing(request) {
  if (!secureApiMode()) return unavailable();
  const path = new URL(request.url).pathname;
  const route = path.replace(/^\/api\/dashboard\/v1/, '') || '/';

  try {
    if (route === '/notifications/preferences') {
      if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405, { allow: 'GET, PUT, DELETE' });
      if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      if (request.method === 'GET') {
        const deviceHash = new URL(request.url).searchParams.get('device') || '';
        if (deviceHash && !/^[a-f0-9]{64}$/i.test(deviceHash)) return json({ error: 'Invalid notification device.' }, 400);
        if (deviceHash) {
          const exists = localStore() ? localPushSubscriptions.get(deviceHash)?.ownerHash === owner.hash
            : Boolean((await sql().query('select 1 from dashboard_push_subscriptions where endpoint_hash = $1 and owner_hash = $2', [deviceHash, owner.hash])).rows[0]);
          if (!exists) return json({ error: 'Notification device not found.' }, 404);
        }
        return json(await notificationPreferences(owner.hash, deviceHash), 200, { 'cache-control': 'no-store', vary: 'Cookie' });
      }
      const body = await bodyJson(request);
      if (!body || Object.keys(body).some(key => !['scope', 'deviceId', 'preferences'].includes(key)) ||
          (request.method === 'PUT' && (!validNotificationPreferences(body.preferences) || !['account', 'device'].includes(body.scope))) ||
          (request.method === 'DELETE' && (Object.keys(body).length !== 2 || body.scope !== 'device' || typeof body.deviceId !== 'string' || !/^[a-f0-9]{64}$/i.test(body.deviceId))))
        return json({ error: 'Invalid notification preferences.' }, 400);
      if (request.method === 'PUT' && body.scope === 'account' && body.deviceId !== undefined) return json({ error: 'Invalid notification preference scope.' }, 400);
      const deviceHash = body.scope === 'device' ? body.deviceId : 'account';
      if (deviceHash !== 'account') {
        const exists = localStore() ? localPushSubscriptions.get(deviceHash)?.ownerHash === owner.hash
          : Boolean((await sql().query('select 1 from dashboard_push_subscriptions where endpoint_hash = $1 and owner_hash = $2', [deviceHash, owner.hash])).rows[0]);
        if (!exists) return json({ error: 'Notification device not found.' }, 404);
      }
      if (request.method === 'DELETE') {
        if (localStore()) localNotificationPreferences.delete(`${owner.hash}:${deviceHash}`);
        else await sql().query('delete from dashboard_notification_preferences where owner_hash = $1 and device_hash = $2', [owner.hash, deviceHash]);
      } else await saveNotificationPreferences(owner.hash, deviceHash, body.preferences);
      return json({ ok: true, ...(await notificationPreferences(owner.hash, deviceHash === 'account' ? '' : deviceHash)) }, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/notifications/detail') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      const id = new URL(request.url).searchParams.get('id') || '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid notification.' }, 400, { 'cache-control': 'no-store' });
      const notification = await getNotification(owner.hash, id);
      return notification ? json({ notification }, 200, { 'cache-control': 'no-store', vary: 'Cookie' })
        : json({ error: 'This alert has expired. You can still check Activity for recent macro events.' }, 410, { 'cache-control': 'no-store' });
    }

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
        if (body && Object.keys(body).length === 1 && typeof body.endpoint === 'string' && body.endpoint.length <= 2048) {
          const deviceHash = sha256(body.endpoint);
          const exists = localStore() ? localPushSubscriptions.get(deviceHash)?.ownerHash === owner.hash
            : Boolean((await sql().query('select 1 from dashboard_push_subscriptions where endpoint_hash = $1 and owner_hash = $2', [deviceHash, owner.hash])).rows[0]);
          return exists ? json({ ok: true, deviceId: deviceHash }, 200, { 'cache-control': 'no-store' }) : json({ error: 'This device has not enabled alerts.' }, 404);
        }
        if (!body || Object.keys(body).length !== 1 || !validPushSubscription(body.subscription))
          return json({ error: 'This browser returned an invalid push subscription.' }, 400);
        const limit = await limited(`dashboard-push-subscribe:${owner.hash}`, 10, 3600);
        if (!limit.allowed) return json({ error: 'Too many notification changes. Try again later.' }, 429, { 'retry-after': String(limit.retryAfter) });
        await savePushSubscription(owner.hash, body.subscription);
        return json({ ok: true, deviceId: sha256(body.subscription.endpoint) }, 201, { 'cache-control': 'no-store' });
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
      const body = await bodyJson(request);
      if (!body) return json({ error: 'Use a JSON request.' }, 415);
      if (Object.keys(body).length !== 1 || typeof body.endpoint !== 'string' || body.endpoint.length > 2048) return json({ error: 'Enable phone notifications on this device first.' }, 409);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      if (!pushReady()) return json({ error: 'Phone notifications are not configured yet.' }, 503);
      const limit = await limited(`dashboard-push-test:${owner.hash}`, 3, 3600);
      if (!limit.allowed) return json({ error: 'You have sent enough test alerts for now.' }, 429, { 'retry-after': String(limit.retryAfter) });
      const result = await sendTestPush(owner.hash, body.endpoint);
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

    if (route === '/earnings') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      const requested = new URL(request.url).searchParams.get('range') || 'day';
      if (!Object.hasOwn(EARNINGS_RANGES, requested)) return json({ error: 'Choose a valid earnings range.' }, 400);
      return json(await listEarnings(owner.hash, requested), 200, { 'cache-control': 'no-store', vary: 'Cookie' });
    }

    if (route === '/library/installs') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      const body = await bodyJson(request, 256);
      if (!body || Object.keys(body).length !== 1 || typeof body.attachmentId !== 'string' || !/^\d{17,20}$/.test(body.attachmentId))
        return json({ error: 'Choose a valid Library strategy.' }, 400);
      const limit = await limited(`dashboard-library-install:${owner.hash}`, 100, 3600);
      if (!limit.allowed) return json({ error: 'Too many strategy installs. Try again later.' }, 429, { 'retry-after': String(limit.retryAfter) });
      if (localStore()) {
        localLibraryInstalls.add(`${body.attachmentId}:${owner.hash}`);
        return json({ ok: true });
      }
      const exists = await sql().query('select 1 from strategy_library_items where source_attachment_id=$1 and active=true', [body.attachmentId]);
      if (!exists.rows[0]) return json({ error: 'That strategy is no longer in the Library.' }, 404);
      await sql().query(`insert into strategy_library_installs (source_attachment_id, owner_hash)
        values ($1, $2) on conflict (source_attachment_id, owner_hash) do nothing`, [body.attachmentId, owner.hash]);
      const count = await sql().query(`select
          (select count(*)::int from strategy_library_installs where source_attachment_id=$1) as file_installs,
          (select count(distinct installs.owner_hash)::int from strategy_library_installs installs
            join strategy_library_items installed_items using (source_attachment_id)
            where installed_items.source_thread_id = (select source_thread_id from strategy_library_items where source_attachment_id=$1)
              and installed_items.active=true) as post_installs`, [body.attachmentId]);
      return json({ ok: true, installCount: Number(count.rows[0]?.file_installs || 0), postInstallCount: Number(count.rows[0]?.post_installs || 0) }, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/remote/commands') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      if (!sameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401);
      const body = await bodyJson(request, MAX_STRATEGY_BYTES * 6 + 8192);
      if (!body || Object.keys(body).some(key => !['deviceId', 'command', 'payload'].includes(key)) ||
          typeof body.deviceId !== 'string' || body.deviceId.length > 64 || !REMOTE_COMMANDS.has(body.command))
        return json({ error: 'Choose a valid device and action.' }, 400);
      let payload = null;
      if (body.command === 'stage_strategy_edit' || (['read_strategy_1', 'read_strategy_2'].includes(body.command) && body.payload !== undefined)) {
        const value = body.payload;
        if (body.command !== 'stage_strategy_edit') {
          if (!value || Object.keys(value).some(key => key !== 'strategyId') || typeof value.strategyId !== 'string' ||
              value.strategyId.length > 180 || !/^[^\\/:\0-\x1f]+\.strat$/i.test(value.strategyId))
            return json({ error: 'Choose a saved strategy file.' }, 400);
          payload = { strategyId: value.strategyId };
        } else {
          if (!value || Object.keys(value).some(key => !['slot', 'strategyId', 'strategyText', 'baseModified', 'baseSize'].includes(key)) ||
              ((![1, 2].includes(value.slot)) === (typeof value.strategyId !== 'string')) ||
              typeof value.strategyText !== 'string' || Buffer.byteLength(value.strategyText, 'utf8') > MAX_STRATEGY_BYTES ||
              typeof value.baseModified !== 'string' || !/^\d{14}$/.test(value.baseModified) ||
              !Number.isSafeInteger(value.baseSize) || value.baseSize < 0 || value.baseSize > MAX_STRATEGY_BYTES ||
              (value.strategyId !== undefined && (value.strategyId.length > 180 || !/^[^\\/:\0-\x1f]+\.strat$/i.test(value.strategyId))))
            return json({ error: 'The strategy edit is incomplete or too large.' }, 400);
          const parsed = parseStrategy(value.strategyText);
          if (!parsed.ok) return json({ error: parsed.errors[0] || 'This strategy could not be validated.' }, 422);
          payload = value.strategyId !== undefined
            ? { strategyId: value.strategyId, strategyText: value.strategyText, baseModified: value.baseModified, baseSize: value.baseSize }
            : { slot: value.slot, strategyText: value.strategyText, baseModified: value.baseModified, baseSize: value.baseSize };
        }
      } else if (body.command === 'install_library_strategy') {
        const value = body.payload;
        if (!value || Object.keys(value).some(key => !['fileName', 'strategyText'].includes(key)) ||
            typeof value.fileName !== 'string' || value.fileName.length > 180 ||
            !/^[^\\/:<>"|?*\0-\x1f]+\.strat$/i.test(value.fileName) ||
            typeof value.strategyText !== 'string' || Buffer.byteLength(value.strategyText, 'utf8') > MAX_STRATEGY_BYTES)
          return json({ error: 'That strategy file is invalid or too large.' }, 400);
        const parsed = parseStrategy(value.strategyText);
        if (!parsed.ok) return json({ error: parsed.errors[0] || 'This strategy could not be validated.' }, 422);
        payload = { fileName: value.fileName, strategyText: value.strategyText };
      } else if (body.payload !== undefined) return json({ error: 'This action does not accept strategy data.' }, 400);
      const issued = await requestRemoteCommand(owner.hash, body.deviceId, body.command, payload);
      if (issued.command) return json({ ok: true, id: issued.command.id, expiresAt: issued.command.expires_at || new Date(issued.command.expiresAt).toISOString() }, 202, { 'cache-control': 'no-store' });
      const status = { device: 404, offline: 409, state: 409, strategy: 409, capability: 409, pending: 409, invalid: 400 }[issued.error] || 409;
      const message = { device: 'That PC is not linked to this account.', offline: 'That PC is offline. Open Ultimate Macro and try again.', state: 'Stop the macro before changing its strategy.', strategy: 'That strategy is no longer configured on the PC.', capability: 'Update Ultimate Macro to add strategies from the Library.', pending: 'An action is already waiting for the PC.', invalid: 'That action is not available.' }[issued.error] || 'Could not queue that action.';
      return json({ error: message }, status, { 'cache-control': 'no-store' });
    }

    if (route === '/remote/commands/poll') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(request.headers.get('authorization') || '');
      const body = await bodyJson(request);
      if (!match || !body || Object.keys(body).length) return json({ error: 'Invalid device request.' }, 400);
      const commands = await pollRemoteCommands(match[1]);
      return commands === null ? json({ error: 'Device credential is invalid or revoked.' }, 401) : json({ commands }, 200, { 'cache-control': 'no-store' });
    }

    if (route === '/remote/commands/result') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
      const match = /^Bearer ([A-Za-z0-9_-]{40,64})$/.exec(request.headers.get('authorization') || '');
      const body = await bodyJson(request, MAX_STRATEGY_BYTES * 6 + 8192);
      if (!match || !body || Object.keys(body).some(key => !['id', 'status', 'message', 'data'].includes(key)) ||
          typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id) || !['succeeded', 'failed'].includes(body.status) ||
          (body.message !== undefined && (typeof body.message !== 'string' || body.message.length > 120)) ||
          (body.data !== undefined && (!body.data || typeof body.data !== 'object' || Array.isArray(body.data) ||
            Object.keys(body.data).some(key => !['slot', 'strategyId', 'name', 'strategyText', 'modified', 'size'].includes(key)) ||
            ((! [1, 2].includes(body.data.slot)) === (typeof body.data.strategyId !== 'string')) ||
            (body.data.strategyId !== undefined && (typeof body.data.name !== 'string' || body.data.name.length > 80 || body.data.strategyId.length > 180 || !/^[^\\/:\0-\x1f]+\.strat$/i.test(body.data.strategyId))) ||
            typeof body.data.strategyText !== 'string' ||
            Buffer.byteLength(body.data.strategyText, 'utf8') > MAX_STRATEGY_BYTES ||
            typeof body.data.modified !== 'string' || !/^\d{14}$/.test(body.data.modified) ||
            !Number.isSafeInteger(body.data.size) || body.data.size < 0 || body.data.size > MAX_STRATEGY_BYTES)))
        return json({ error: 'Invalid command result.' }, 400);
      const updated = await completeRemoteCommand(match[1], body.id, body.status, body.message || '', body.data || null);
      return updated ? json({ ok: true }) : json({ error: 'Command is no longer active.' }, 409);
    }

    const commandResultMatch = route.match(/^\/remote\/commands\/([a-f0-9-]{36})$/i);
    if (commandResultMatch) {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
      const owner = await ownerFrom(request);
      if (!owner) return json({ error: 'Dashboard session expired.' }, 401, { 'cache-control': 'no-store' });
      const command = await getRemoteCommand(owner.hash, commandResultMatch[1], true);
      return command ? json(command, 200, { 'cache-control': 'no-store' }) : json({ error: 'Command not found.' }, 404, { 'cache-control': 'no-store' });
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
      const body = await bodyJson(request, 131072);
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
