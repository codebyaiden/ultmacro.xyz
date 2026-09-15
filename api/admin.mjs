import { databaseConfigured, query } from './_lib/db.mjs';
import { error, json, methodNotAllowed, readJson, requestOriginMatches, routePath, clientIp } from './_lib/http.mjs';
import { clearSessionCookie, createAdminSession, getAdminSession, hashSecret, id, rateLimit, revokeAdminSession, sessionCookie, sha256, verifySecret } from './_lib/security.mjs';

function adminConfigured() {
  return databaseConfigured() && Boolean(process.env.STRATEGY_ADMIN_PASSWORD_HASH) && Boolean(process.env.STRATEGY_HASH_SECRET);
}

async function requireAdmin(request) {
  const session = await getAdminSession(request);
  return session ? null : error('Admin access is required.', 401);
}

async function audit(action, targetType, targetId, metadata = {}) {
  await query('insert into admin_audit_log (id, action, target_type, target_id, metadata) values ($1, $2, $3, $4, $5::jsonb)', [id(), action, targetType, targetId, JSON.stringify(metadata)]);
}

async function login(request) {
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const limiter = await rateLimit(`admin-login:${clientIp(request)}`, 8, 900);
  if (!limiter.allowed) return error('Too many login attempts. Try again later.', 429, { retryAfter: limiter.retryAfter });
  const body = await readJson(request);
  if (!await verifySecret(String(body.password || ''), process.env.STRATEGY_ADMIN_PASSWORD_HASH)) return error('Password is incorrect.', 401);
  const session = await createAdminSession();
  return json({ ok: true, expiresAt: session.expiresAt }, 200, { 'set-cookie': sessionCookie(session.raw) });
}

async function action(strategyId, request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const allowed = new Set(['feature', 'unfeature', 'verify', 'unverify', 'hide', 'unhide', 'remove', 'restore', 'resolve-duplicate', 'reject-duplicate']);
  const actionName = String(body.action || '');
  if (!allowed.has(actionName)) return error('Admin action is invalid.');
  const state = {
    feature: ['featured', true], unfeature: ['featured', false], verify: ['verified', true], unverify: ['verified', false],
    hide: ['status', 'hidden'], unhide: ['status', 'published'], remove: ['status', 'removed'], restore: ['status', 'published']
  }[actionName];
  if (state) {
    await query(`update strategies set ${state[0]} = $2, updated_at = now() where id = $1`, [strategyId, state[1]]);
    if (actionName === 'verify' || actionName === 'unverify') await query('update strategies set trust_label = $2 where id = $1', [strategyId, state[1] ? 'Admin verified' : 'New']);
  } else {
    const status = actionName === 'resolve-duplicate' ? 'resolved' : 'rejected';
    await query('update duplicate_reviews set status = $2, resolved_at = now() where (version_id in (select id from strategy_versions where strategy_id = $1) or candidate_version_id in (select id from strategy_versions where strategy_id = $1)) and status = $3', [strategyId, status, 'open']);
    if (actionName === 'resolve-duplicate') await query("update strategies set status = 'published', updated_at = now() where id = $1", [strategyId]);
    if (actionName === 'reject-duplicate') await query("update strategies set status = 'hidden', updated_at = now() where id = $1", [strategyId]);
  }
  await audit(actionName, 'strategy', strategyId, { source: 'admin-access' });
  return json({ ok: true, action: actionName });
}

async function versionAction(strategyId, versionId, request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const actionName = String(body.action || '');
  const allowed = new Set(['hide', 'unhide', 'remove', 'restore', 'community-test', 'uncommunity-test', 'verify', 'unverify']);
  if (!allowed.has(actionName)) return error('Version admin action is invalid.');
  const versionRows = await query('select id from strategy_versions where id = $1 and strategy_id = $2', [versionId, strategyId]);
  if (!versionRows[0]) return error('Strategy version was not found.', 404);
  const status = { hide: 'hidden', unhide: 'published', remove: 'removed', restore: 'published' }[actionName];
  if (status) await query('update strategy_versions set status = $3 where id = $1 and strategy_id = $2', [versionId, strategyId, status]);
  if (actionName === 'community-test' || actionName === 'uncommunity-test') await query('update strategy_versions set community_tested = $3 where id = $1 and strategy_id = $2', [versionId, strategyId, actionName === 'community-test']);
  if (actionName === 'verify' || actionName === 'unverify') await query('update strategy_versions set manually_verified = $3 where id = $1 and strategy_id = $2', [versionId, strategyId, actionName === 'verify']);
  await audit(`version-${actionName}`, 'strategy-version', versionId, { strategyId });
  return json({ ok: true, action: actionName });
}

async function ownershipAction(strategyId, request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const actionName = String(body.action || '');
  if (!new Set(['reset', 'transfer']).has(actionName)) return error('Ownership action is invalid.');
  const ownerRows = await query('select s.creator_id, c.display_name, c.username from strategies s join creators c on c.id = s.creator_id where s.id = $1 limit 1', [strategyId]);
  if (!ownerRows[0]) return error('Strategy was not found.', 404);
  let creatorId = ownerRows[0].creator_id;
  if (actionName === 'transfer') {
    const display = String(body.display || '').trim().slice(0, 40);
    const username = String(body.username || '').trim().replace(/^@+/, '').toLowerCase();
    if (display.length < 2 || display.length > 40 || !/^[a-z0-9][a-z0-9._-]{1,29}$/i.test(username)) return error('A valid new creator display name and username are required.');
    if (/(^|[-_.])(admin|administrator|official|moderator|mod|staff|support|owner|developer|dev|system|bot|ultimatemacro|verified)([-_.]|$)/i.test(username)) return error('That username is reserved for official or moderation use.');
    const existing = await query('select id from creators where username_normalized = $1 and id <> $2 limit 1', [username, creatorId]);
    if (existing[0]) return error('That username is already claimed.', 409);
    creatorId = `creator-${sha256(username).slice(0, 24)}`;
    await query(`insert into creators (id, display_name, username, username_normalized) values ($1, $2, $3, $4) on conflict (id) do update set display_name = excluded.display_name, username = excluded.username, username_normalized = excluded.username_normalized, updated_at = now()`, [creatorId, display, username, username]);
    await query('update strategies set creator_id = $2, updated_at = now() where id = $1', [strategyId, creatorId]);
  }
  const creatorKey = `umk_${id().replaceAll('-', '')}`;
  await query('update strategy_owners set key_hash = $2, key_hint = $3, revoked_at = null where strategy_id = $1', [strategyId, await hashSecret(creatorKey), `${creatorKey.slice(0, 7)}…${creatorKey.slice(-4)}`]);
  await query('insert into ownership_transfers (id, strategy_id, previous_creator_id, new_creator_id, action) values ($1, $2, $3, $4, $5)', [id(), strategyId, ownerRows[0].creator_id, creatorId, actionName]);
  await audit(`ownership-${actionName}`, 'strategy', strategyId, { previousCreatorId: ownerRows[0].creator_id, newCreatorId: creatorId });
  return json({ ok: true, action: actionName, creatorKey });
}

async function reports(request, duplicateOnly = false) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const rows = duplicateOnly ? await query(`select d.*, s.id as strategy_id, s.title, s.slug from duplicate_reviews d join strategy_versions v on v.id = d.version_id join strategies s on s.id = v.strategy_id where d.status = 'open' order by d.created_at desc limit 100`) : await query(`select r.*, s.title, s.slug from reports r join strategies s on s.id = r.strategy_id where r.status = 'open' order by r.created_at desc limit 100`);
  return json({ items: rows });
}

async function reportAction(reportId, request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const status = body.action === 'resolve' ? 'resolved' : body.action === 'reject' ? 'rejected' : '';
  if (!status) return error('Report action is invalid.');
  const rows = await query('update reports set status = $2, resolved_at = now() where id = $1 and status = $3 returning strategy_id', [reportId, status, 'open']);
  if (!rows[0]) return error('Open report was not found.', 404);
  await audit(`report-${status}`, 'report', reportId, { strategyId: rows[0].strategy_id });
  return json({ ok: true });
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') return json({ ok: true }, 204);
  if (!adminConfigured()) return error('Admin backend is not configured.', 503);
  const route = routePath(request, '/api/admin');
  try {
    const parts = route.split('/').filter(Boolean).map(decodeURIComponent);
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'login') return login(request);
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'logout') {
      const denied = await requireAdmin(request);
      if (denied) return denied;
      await revokeAdminSession(request);
      return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
    }
    if (request.method === 'GET' && parts.length === 1 && parts[0] === 'session') return json({ authenticated: Boolean(await getAdminSession(request)) });
    if (request.method === 'GET' && parts.length === 1 && parts[0] === 'reports') return reports(request);
    if (request.method === 'GET' && parts.length === 1 && parts[0] === 'duplicates') return reports(request, true);
    if (request.method === 'POST' && parts.length === 3 && parts[0] === 'strategies' && parts[2] === 'action') return action(parts[1], request);
    if (request.method === 'POST' && parts.length === 5 && parts[0] === 'strategies' && parts[2] === 'versions' && parts[4] === 'action') return versionAction(parts[1], parts[3], request);
    if (request.method === 'POST' && parts.length === 3 && parts[0] === 'strategies' && parts[2] === 'ownership') return ownershipAction(parts[1], request);
    if (request.method === 'POST' && parts.length === 3 && parts[0] === 'reports' && parts[2] === 'action') return reportAction(parts[1], request);
    return methodNotAllowed(['GET', 'POST', 'OPTIONS']);
  } catch (caught) {
    console.error('strategy-admin-api', caught);
    return error('Admin request failed.', Number(caught?.status || 500));
  }
}