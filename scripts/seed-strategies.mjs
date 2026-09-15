import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { query } from '../api/_lib/db.mjs';
import { sha256 } from '../api/_lib/security.mjs';
import { uploadPublicBlob } from '../api/_lib/media.mjs';
import { normalizeStrategyText, parseStrategy, strategyFingerprint } from '../api/_lib/strategy-validation.mjs';

const source = await readFile(new URL('../data/strategy-network.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { timeout: 1000 });
const seed = Array.isArray(sandbox.window.STRATEGY_NETWORK_SEED) ? sandbox.window.STRATEGY_NETWORK_SEED : [];

async function readRelease(version) {
  const releaseFile = String(version.releaseFile || '');
  if (!/^[A-Za-z0-9._-]+\.strat$/.test(releaseFile)) throw new Error(`Seed version ${version.version} is missing a safe releaseFile.`);
  const fileUrl = new URL(`../strategies/releases/${releaseFile}`, import.meta.url);
  const bytes = new Uint8Array(await readFile(fileUrl));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const parsed = parseStrategy(text);
  if (!parsed.ok) throw new Error(`${releaseFile} failed validation: ${parsed.errors.slice(0, 4).join(' ')}`);
  const contentHash = sha256(bytes);
  const normalizedHash = sha256(normalizeStrategyText(text));
  const contentUrl = await uploadPublicBlob(`strategies/seed/${releaseFile}`, bytes, 'text/plain; charset=utf-8');
  return { bytes, parsed, contentHash, normalizedHash, contentUrl };
}

for (const item of seed) {
  const creatorId = `seed-creator-${item.creator.username}`;
  await query(`
    insert into creators (id, display_name, username, username_normalized)
    values ($1, $2, $3, $4)
    on conflict (username_normalized) do update set display_name = excluded.display_name, updated_at = now()
  `, [creatorId, item.creator.display, item.creator.username, item.creator.username.toLowerCase()]);

  const creatorRows = await query('select id from creators where username_normalized = $1', [item.creator.username.toLowerCase()]);
  const resolvedCreatorId = creatorRows[0]?.id || creatorId;
  await query(`
    insert into strategies (id, slug, creator_id, title, summary, description, map, mode, grind, timescale, no_skill_tree, towers, metric, metric_type, status, featured, verified, trust_label, installs, rating_sum, rating_count, created_at, updated_at, published_at)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13, $14, 'published', $15, $16, $17, $18, $19, $20, $21, $22, $23)
    on conflict (id) do update set updated_at = excluded.updated_at
  `, [
    item.id,
    item.slug,
    resolvedCreatorId,
    item.title,
    item.summary,
    item.description,
    item.map,
    item.mode,
    JSON.stringify(item.grind || []),
    item.timescale,
    Boolean(item.noSkillTree),
    JSON.stringify(item.towers || []),
    item.metric,
    item.metricType,
    Boolean(item.featured),
    item.trust === 'Verified',
    item.trust || 'New',
    Number(item.installs || 0),
    Math.round(Number(item.rating || 0) * Number(item.ratingCount || 0)),
    Number(item.ratingCount || 0),
    item.published,
    item.updated,
    item.published
  ]);

  for (const version of item.versions || []) {
    const release = await readRelease(version);
    await query(`
      insert into strategy_versions (id, strategy_id, version, content_url, content_sha256, normalized_sha256, content_bytes, compatible, changelog, validation_result, detected_metadata, created_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12)
      on conflict (strategy_id, version) do update set
        content_url = excluded.content_url,
        content_sha256 = excluded.content_sha256,
        normalized_sha256 = excluded.normalized_sha256,
        content_bytes = excluded.content_bytes,
        compatible = excluded.compatible,
        changelog = excluded.changelog,
        validation_result = excluded.validation_result,
        detected_metadata = excluded.detected_metadata
    `, [
      `${item.id}-${version.version.replace(/[^0-9a-z]+/gi, '-')}`,
      item.id,
      version.version,
      release.contentUrl,
      release.contentHash,
      release.normalizedHash,
      release.bytes.length,
      version.compatible,
      version.notes,
      JSON.stringify({ ok: true, errors: [], warnings: release.parsed.warnings, source: version.releaseFile }),
      JSON.stringify({ ...release.parsed.metadata, fingerprint: strategyFingerprint(release.parsed) }),
      version.date
    ]);
  }
}

console.log(`seeded ${seed.length} Strategy Network strategies`);