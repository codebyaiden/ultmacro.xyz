import { query, transaction, backendConfigured } from './_lib/db.mjs';
import { error, json, methodNotAllowed, readJson, requestOriginMatches, routePath } from './_lib/http.mjs';
import { clientFingerprint, hashSecret, id, rateLimit, sha256, token, verifySecret } from './_lib/security.mjs';
import { MAX_THUMBNAIL_SIZE, uploadPublicBlob, validateThumbnail } from './_lib/media.mjs';
import { normalizeStrategyText, parseStrategy, similarity, strategyFingerprint, MAX_STRATEGY_BYTES } from './_lib/strategy-validation.mjs';
import { findStrategy, getVersions, listStrategies, publicVersion } from './_lib/strategy-store.mjs';

const MAX_TEXT_FIELD = 500;
const MAX_TITLE = 80;
const MAX_SUMMARY = 160;
const VALID_MODES = new Set(['Easy', 'Casual', 'Intermediate', 'Molten', 'Fallen', 'Frost', 'Hardcore', 'Voidcore', 'Arcade']);
const VALID_GRINDS = new Set(['Coins', 'Gems', 'XP']);
const VALID_TIMESCALES = new Set(['1x', '1.5x', '2x']);
const STRATEGY_NETWORK_ENABLED = process.env.STRATEGY_NETWORK_ENABLED !== 'false';

function textField(form, name, max = MAX_TEXT_FIELD) {
  return String(form.get(name) || '').trim().slice(0, max);
}

function inputError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function boolField(form, name) {
  const value = form.get(name);
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function listField(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 24);
}

function validateIdentity(display, username) {
  if (display.length < 2 || display.length > 40) throw inputError('Display name must be between 2 and 40 characters.');
  if (!/^[a-z0-9][a-z0-9._-]{1,29}$/i.test(username)) throw inputError('Username must use letters, numbers, dots, underscores or hyphens.');
  if (/(^|[-_.])(admin|administrator|official|moderator|mod|staff|support|owner|developer|dev|system|bot|ultimatemacro|verified)([-_.]|$)/i.test(username)) throw inputError('That username is reserved for official or moderation use.');
}

function validateMetadata(form, parsed, inherited = null) {
  const detected = parsed?.metadata || {};
  const inheritedTowers = Array.isArray(inherited?.towers) ? inherited.towers.join(',') : inherited?.towers;
  const inheritedGrind = Array.isArray(inherited?.grind) ? inherited.grind[0] : inherited?.grind;
  const title = textField(form, 'title', MAX_TITLE) || detected.title || inherited?.title || '';
  const summary = textField(form, 'description', MAX_SUMMARY) || detected.description || inherited?.summary || '';
  const map = detected.map || textField(form, 'map', 80) || inherited?.map || '';
  const mode = detected.mode || textField(form, 'mode', 30) || inherited?.mode || '';
  const grind = textField(form, 'grind', 20) || detected.grind || inheritedGrind || 'Coins';
  const detectedTimescale = detected.timescale || textField(form, 'timescale', 10) || inherited?.timescale || '1x';
  const timescale = detectedTimescale.toUpperCase() === 'OFF' ? '1x' : detectedTimescale;
  const towers = listField(detected.requiredTowers?.join(',') || textField(form, 'towers', 300) || inheritedTowers);
  const modifiers = listField(detected.modifiers || textField(form, 'modifiers', 300));
  const compatible = textField(form, 'compatible', 40) || inherited?.compatible || '1.3.4+';
  const changelog = textField(form, 'changelog', 500);
  if (title.length < 3) throw inputError('Strategy name must be at least 3 characters.');
  if (summary.length < 10) throw inputError('Add a short description of at least 10 characters.');
  if (!map) throw inputError('Choose a map.');
  if (!VALID_MODES.has(mode)) throw inputError('Choose a supported mode.');
  if (!VALID_GRINDS.has(grind)) throw inputError('Choose a supported grind type.');
  if (!VALID_TIMESCALES.has(timescale)) throw inputError('Choose a supported timescale.');
  return { title, summary, description: textField(form, 'longDescription', 1000) || inherited?.description || summary, map, mode, grind, timescale, towers, modifiers, compatible, changelog, noSkillTree: form.has('noSkillTree') ? boolField(form, 'noSkillTree') : Boolean(inherited?.no_skill_tree), metric: textField(form, 'expected', 80) || inherited?.metric || 'Not provided' };
}

async function readStrategyFile(form) {
  const file = form.get('strategyFile');
  if (!file || typeof file.arrayBuffer !== 'function') throw inputError('Upload a .strat file.');
  if (file.size > MAX_STRATEGY_BYTES) throw inputError('Strategy file must be 2 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_STRATEGY_BYTES) throw inputError('Strategy file must be 2 MB or smaller.');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw Object.assign(new Error('Strategy file must be valid UTF-8 text.'), { status: 400 }); }
  const parsed = parseStrategy(text);
  if (!parsed.ok) throw Object.assign(new Error(parsed.errors.slice(0, 4).join(' ')), { status: 400 });
  return { file, bytes, text, parsed, contentHash: sha256(bytes), normalizedHash: sha256(normalizeStrategyText(text)), fingerprint: strategyFingerprint(parsed) };
}

async function readThumbnail(form) {
  const file = form.get('thumbnail');
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return null;
  if (file.size > MAX_THUMBNAIL_SIZE) throw inputError('Thumbnail must be 2 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let media;
  try { media = validateThumbnail(bytes, file.type); }
  catch (caught) { throw inputError(caught?.message || 'Thumbnail is invalid.'); }
  return { bytes, ...media };
}

async function duplicateCheck(normalizedHash, fingerprint) {
  const exact = await query('select id, strategy_id from strategy_versions where normalized_sha256 = $1 limit 1', [normalizedHash]);
  if (exact[0]) return { type: 'exact', match: exact[0] };
  const candidates = await query("select id, strategy_id, detected_metadata from strategy_versions where created_at > now() - interval '2 years' order by created_at desc limit 300");
  let best = null;
  for (const candidate of candidates) {
    let metadata = candidate.detected_metadata;
    if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch { metadata = {}; } }
    const score = similarity(fingerprint, metadata?.fingerprint);
    if (score >= 0.86 && (!best || score > best.score)) best = { ...candidate, score };
  }
  return best ? { type: 'likely', match: best } : null;
}

async function upsertCreator(display, username) {
  const normalized = username.toLowerCase();
  const creatorId = `creator-${sha256(normalized).slice(0, 24)}`;
  const existing = await query('select id from creators where username_normalized = $1', [normalized]);
  if (existing[0]) throw Object.assign(new Error('That username is already claimed. Choose another username or publish a new version using its creator key.'), { status: 409 });
  await query(`
    insert into creators (id, display_name, username, username_normalized)
    values ($1, $2, $3, $4)
    on conflict (username_normalized) do update set display_name = excluded.display_name, username = excluded.username, updated_at = now()
  `, [creatorId, display, username, normalized]);
  const rows = await query('select id from creators where username_normalized = $1', [normalized]);
  return rows[0].id;
}

async function nextVersion(strategyId) {
  const rows = await query('select version from strategy_versions where strategy_id = $1 order by created_at desc limit 1', [strategyId]);
  const current = Number(rows[0]?.version || 0);
  return (Math.round((current + 0.1) * 10) / 10).toFixed(1);
}

async function publishInitial(form) {
  const display = textField(form, 'display', 40);
  const username = textField(form, 'username', 30).replace(/^@+/, '').toLowerCase();
  validateIdentity(display, username);
  const upload = await readStrategyFile(form);
  const metadata = validateMetadata(form, upload.parsed);
  const duplicate = await duplicateCheck(upload.normalizedHash, upload.fingerprint);
  if (duplicate?.type === 'exact') throw Object.assign(new Error('An exact strategy release already exists.'), { status: 409, duplicate });
  const creatorId = await upsertCreator(display, username);
  const strategyId = id();
  const slug = `${metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'strategy'}-${strategyId.slice(0, 8)}`;
  const version = '1.0';
  const key = `umk_${id().replaceAll('-', '')}`;
  const keyHash = await hashSecret(key);
  const contentUrl = await uploadPublicBlob(`strategies/${strategyId}/versions/${version}-${upload.contentHash}.strat`, upload.bytes, 'text/plain; charset=utf-8');
  const thumbnail = await readThumbnail(form);
  const thumbnailUrl = thumbnail ? await uploadPublicBlob(`thumbnails/${strategyId}/${sha256(thumbnail.bytes)}.${thumbnail.contentType.split('/')[1]}`, thumbnail.bytes, thumbnail.contentType) : null;
  const pending = duplicate?.type === 'likely';
  await query(`
    insert into strategies (id, slug, creator_id, title, summary, description, map, mode, grind, timescale, no_skill_tree, towers, modifiers, metric, metric_type, thumbnail_url, status, trust_label, created_at, updated_at, published_at)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb, $14, 'Creator reported', $15, $16, 'New', now(), now(), now())
  `, [strategyId, slug, creatorId, metadata.title, metadata.summary, metadata.description, metadata.map, metadata.mode, JSON.stringify([metadata.grind]), metadata.timescale, metadata.noSkillTree, JSON.stringify(metadata.towers), JSON.stringify(metadata.modifiers), metadata.metric, thumbnailUrl, pending ? 'pending_duplicate' : 'published']);
  await query('insert into strategy_owners (strategy_id, key_hash, key_hint) values ($1, $2, $3)', [strategyId, keyHash, `${key.slice(0, 7)}…${key.slice(-4)}`]);
  const versionId = id();
  await query(`
    insert into strategy_versions (id, strategy_id, version, content_url, content_sha256, normalized_sha256, content_bytes, compatible, changelog, validation_result, detected_metadata)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
  `, [versionId, strategyId, version, contentUrl, upload.contentHash, upload.normalizedHash, upload.bytes.length, metadata.compatible, metadata.changelog || 'Initial community release.', JSON.stringify({ ok: true, errors: [], warnings: upload.parsed.warnings }), JSON.stringify({ ...upload.parsed.metadata, fingerprint: upload.fingerprint })]);
  if (pending) await query('insert into duplicate_reviews (id, version_id, candidate_version_id, candidate_hash, classification) values ($1, $2, $3, $4, $5)', [id(), versionId, duplicate.match.id, upload.normalizedHash, 'likely']);
  return { strategyId, strategy: await findStrategy(strategyId, true), creatorKey: key, pendingDuplicate: pending };
}

async function publishVersion(strategyIdentifier, form) {
  const strategyRows = await query('select s.*, o.key_hash from strategies s join strategy_owners o on o.strategy_id = s.id where (s.id = $1 or s.slug = $1) and o.revoked_at is null limit 1', [strategyIdentifier]);
  const strategy = strategyRows[0];
  if (!strategy) throw Object.assign(new Error('Strategy or creator ownership key was not found.'), { status: 404 });
  if (!await verifySecret(textField(form, 'creatorKey', 200) || textField(form, 'key', 200), strategy.key_hash)) throw Object.assign(new Error('Creator management key is invalid.'), { status: 403 });
  const upload = await readStrategyFile(form);
  const latestVersion = (await query('select compatible from strategy_versions where strategy_id = $1 order by created_at desc limit 1', [strategy.id]))[0];
  const inherited = { ...strategy, compatible: latestVersion?.compatible };
  const metadata = validateMetadata(form, upload.parsed, inherited);
  const duplicate = await duplicateCheck(upload.normalizedHash, upload.fingerprint);
  if (duplicate?.type === 'exact') throw Object.assign(new Error('An exact strategy release already exists.'), { status: 409, duplicate });
  const version = await nextVersion(strategy.id);
  const contentUrl = await uploadPublicBlob(`strategies/${strategy.id}/versions/${version}-${upload.contentHash}.strat`, upload.bytes, 'text/plain; charset=utf-8');
  const thumbnail = await readThumbnail(form);
  const thumbnailUrl = thumbnail ? await uploadPublicBlob(`thumbnails/${strategy.id}/${sha256(thumbnail.bytes)}.${thumbnail.contentType.split('/')[1]}`, thumbnail.bytes, thumbnail.contentType) : strategy.thumbnail_url;
  const pending = duplicate?.type === 'likely';
  const versionId = id();
  await query(`
    insert into strategy_versions (id, strategy_id, version, content_url, content_sha256, normalized_sha256, content_bytes, compatible, changelog, validation_result, detected_metadata)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
  `, [versionId, strategy.id, version, contentUrl, upload.contentHash, upload.normalizedHash, upload.bytes.length, metadata.compatible, metadata.changelog || 'New community version.', JSON.stringify({ ok: true, errors: [], warnings: upload.parsed.warnings }), JSON.stringify({ ...upload.parsed.metadata, fingerprint: upload.fingerprint })]);
  await query(`update strategies set title = $2, summary = $3, description = $4, map = $5, mode = $6, grind = $7::jsonb, timescale = $8, no_skill_tree = $9, towers = $10::jsonb, modifiers = $11::jsonb, metric = $12, thumbnail_url = $13, status = $14, updated_at = now() where id = $1`, [strategy.id, metadata.title, metadata.summary, metadata.description, metadata.map, metadata.mode, JSON.stringify([metadata.grind]), metadata.timescale, metadata.noSkillTree, JSON.stringify(metadata.towers), JSON.stringify(metadata.modifiers), metadata.metric, thumbnailUrl, pending ? 'pending_duplicate' : 'published']);
  if (pending) await query('insert into duplicate_reviews (id, version_id, candidate_version_id, candidate_hash, classification) values ($1, $2, $3, $4, $5)', [id(), versionId, duplicate.match.id, upload.normalizedHash, 'likely']);
  return { strategyId: strategy.id, strategy: await findStrategy(strategy.id, true), version, pendingDuplicate: pending };
}

async function rateStrategy(strategyId, request) {
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Rating request must be a JSON object.');
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return error('Rating must be an integer from 1 to 5.');
  if (!await findStrategy(strategyId)) return error('Strategy not found.', 404);
  const fingerprint = clientFingerprint(request);
  const limiter = await rateLimit(`rating:${fingerprint}`, 12, 600);
  if (!limiter.allowed) return error('Too many rating attempts. Try again later.', 429, { retryAfter: limiter.retryAfter });
  await transaction([
    { text: 'insert into ratings (id, strategy_id, fingerprint_hash, rating) values ($1, $2, $3, $4) on conflict (strategy_id, fingerprint_hash) do update set rating = excluded.rating, updated_at = now()', params: [id(), strategyId, fingerprint, rating] },
    { text: 'update strategies set rating_sum = coalesce((select sum(rating) from ratings where strategy_id = $1), 0), rating_count = coalesce((select count(*) from ratings where strategy_id = $1), 0) where id = $1', params: [strategyId] }
  ]);
  return json({ ok: true, strategy: await findStrategy(strategyId) });
}

async function reportStrategy(strategyId, request) {
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const reasons = new Set(['does_not_work', 'misleading_metric', 'outdated', 'malicious', 'copied', 'wrong_requirements', 'other']);
  const reason = String(body.reason || 'other');
  const details = String(body.details || '').trim().slice(0, 500);
  if (!reasons.has(reason)) return error('Report reason is invalid.');
  if (!await findStrategy(strategyId)) return error('Strategy not found.', 404);
  const fingerprint = clientFingerprint(request);
  const limiter = await rateLimit(`report:${fingerprint}`, 5, 3600);
  if (!limiter.allowed) return error('Too many reports. Try again later.', 429, { retryAfter: limiter.retryAfter });
  const rows = await query(`insert into reports (id, strategy_id, fingerprint_hash, reason, details) values ($1, $2, $3, $4, $5) on conflict (strategy_id, fingerprint_hash) do nothing returning id`, [id(), strategyId, fingerprint, reason, details]);
  if (!rows[0]) return error('This browser has already reported this strategy.', 409);
  await query('update strategies set report_count = report_count + 1 where id = $1', [strategyId]);
  return json({ ok: true });
}

async function installEvent(strategyId, request) {
  if (!await findStrategy(strategyId)) return error('Strategy not found.', 404);
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.version !== 'string' || typeof body.token !== 'string' || typeof body.status !== 'string') return error('The desktop install confirmation is invalid.', 400);
  const version = String(body.version || '').trim();
  const handoffToken = String(body.token || '').trim();
  const status = String(body.status || '').trim();
  if (!/^([a-z0-9][a-z0-9._+ -]{0,63})$/i.test(version) || !/^[a-z0-9_-]{32,128}$/i.test(handoffToken) || body.success !== true || !new Set(['installed', 'updated', 'already-installed']).has(status)) return error('The desktop install confirmation is invalid.', 400);
  const rows = await query('select id from strategy_versions where strategy_id = $1 and version = $2 and status = $3', [strategyId, version, 'published']);
  if (!rows[0]) return error('Strategy version was not found.', 404);
  const limiter = await rateLimit(`install-event:${clientFingerprint(request)}`, 20, 600);
  if (!limiter.allowed) return error('Too many install confirmations. Try again later.', 429, { retryAfter: limiter.retryAfter });
  const fingerprint = clientFingerprint(request);
  const result = await query(`
    with consumed as (
      update strategy_install_intents
      set consumed_at = now()
      where token_hash = $1 and strategy_id = $2 and version_id = $6 and consumed_at is null and expires_at > now()
      returning version_id
    ), inserted as (
      insert into install_events (id, strategy_id, version_id, fingerprint_hash, succeeded)
      select $4, $2, version_id, $3, true from consumed where $5 <> 'already-installed'
      on conflict do nothing
      returning id
    ), updated as (
      update strategies
      set installs = installs + 1
      where id = $2 and exists (select 1 from inserted)
      returning installs
    )
    select exists (select 1 from consumed) as consumed,
      exists (select 1 from inserted) as recorded,
      coalesce((select installs from updated), (select installs from strategies where id = $2)) as installs
  `, [sha256(handoffToken), strategyId, fingerprint, id(), status, rows[0].id]);
  if (!result[0]?.consumed) return error('This desktop install confirmation is expired or already used.', 409);
  return json({ ok: true, recorded: Boolean(result[0].recorded), installs: Number(result[0].installs || 0), status });
}

async function createInstallIntent(strategyId, request) {
  if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
  const body = await readJson(request);
  const version = String(body.version || '').trim();
  if (!/^([a-z0-9][a-z0-9._+ -]{0,63})$/i.test(version)) return error('Strategy version is invalid.');
  const strategy = await findStrategy(strategyId);
  const row = strategy?.versions.find((item) => item.version === version && item.installable);
  if (!row) return error('Strategy version is not available for desktop install.', 404);
  const limiter = await rateLimit(`install-intent:${clientFingerprint(request)}`, 30, 600);
  if (!limiter.allowed) return error('Too many install attempts. Try again later.', 429, { retryAfter: limiter.retryAfter });
  const raw = token(32);
  await query('insert into strategy_install_intents (token_hash, strategy_id, version_id, expires_at) values ($1, $2, $3, now() + interval \'10 minutes\')', [sha256(raw), strategy.id, row.id]);
  return json({ ok: true, token: raw, expiresIn: 600 });
}

export default async function handler(request) {
  const route = routePath(request, '/api/strategies');
  if (request.method === 'OPTIONS') return json({ ok: true }, 204);
  if (!STRATEGY_NETWORK_ENABLED) return error('The Strategy Network is temporarily unavailable.', 503);
  if (!backendConfigured()) return error('Strategy Network backend is not configured.', 503);
  try {
    const parts = route.split('/').filter(Boolean).map(decodeURIComponent);
    if (request.method === 'GET' && parts.length === 0) {
      const url = new URL(request.url);
      return json(await listStrategies({ q: url.searchParams.get('q'), map: url.searchParams.get('map'), mode: url.searchParams.get('mode'), grind: url.searchParams.get('grind'), timescale: url.searchParams.get('timescale'), tower: url.searchParams.get('tower'), noSkillTree: url.searchParams.get('noSkillTree') === 'true', sort: url.searchParams.get('sort') || 'featured', page: url.searchParams.get('page') }));
    }
    if (request.method === 'GET' && parts.length === 1) {
      const strategy = await findStrategy(parts[0]);
      return strategy ? json(strategy) : error('Strategy not found.', 404);
    }
    if (request.method === 'GET' && parts.length === 3 && parts[1] === 'versions') {
      const strategy = await findStrategy(parts[0]);
      const version = strategy?.versions.find((item) => item.version === parts[2]);
      return version ? json({ ...version, strategyId: strategy.id, title: strategy.title, creator: strategy.creator }) : error('Strategy version not found.', 404);
    }
    if (request.method === 'POST' && parts.length === 0) {
      if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
      const limiter = await rateLimit(`publish:${clientFingerprint(request)}`, 5, 3600);
      if (!limiter.allowed) return error('Publishing is temporarily rate limited.', 429, { retryAfter: limiter.retryAfter });
      const result = await publishInitial(await request.formData());
      return json(result, result.pendingDuplicate ? 202 : 201);
    }
    if (request.method === 'POST' && parts.length === 2 && parts[1] === 'versions') {
      if (!requestOriginMatches(request)) return error('Cross-site request rejected.', 403);
      const limiter = await rateLimit(`publish-version:${clientFingerprint(request)}`, 8, 3600);
      if (!limiter.allowed) return error('Publishing is temporarily rate limited.', 429, { retryAfter: limiter.retryAfter });
      const result = await publishVersion(parts[0], await request.formData());
      return json(result, result.pendingDuplicate ? 202 : 201);
    }
    if (request.method === 'POST' && parts.length === 2 && parts[1] === 'ratings') return rateStrategy(parts[0], request);
    if (request.method === 'POST' && parts.length === 2 && parts[1] === 'reports') return reportStrategy(parts[0], request);
    if (request.method === 'POST' && parts.length === 2 && parts[1] === 'install-intents') return createInstallIntent(parts[0], request);
    if (request.method === 'POST' && parts.length === 2 && parts[1] === 'install-events') return installEvent(parts[0], request);
    return methodNotAllowed(['GET', 'POST', 'OPTIONS']);
  } catch (caught) {
    const status = Number(caught?.status || 500);
    if (status < 500) return error(caught.message, status, caught.duplicate ? { type: caught.duplicate.type } : undefined);
    console.error('strategy-network-api', caught);
    return error('Strategy Network request failed.', 500);
  }
}