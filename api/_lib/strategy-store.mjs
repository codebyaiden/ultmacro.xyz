import { query } from './db.mjs';
import { confidenceWeightedRating, popularScore, trendingScore, sortStrategies } from './discovery.mjs';

function jsonValue(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function publicMetadata(value) {
  const metadata = jsonValue(value, {});
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const { fingerprint, ...safe } = metadata;
  return safe;
}

export function publicVersion(row) {
  return {
    id: row.id,
    version: row.version,
    compatible: row.compatible,
    date: row.created_at,
    notes: row.changelog,
    sha256: row.content_sha256,
    installable: Boolean(row.content_url),
    validated: Boolean(jsonValue(row.validation_result, {})?.ok),
    communityTested: Boolean(row.community_tested),
    manuallyVerified: Boolean(row.manually_verified),
    contentUrl: row.content_url || null,
    validation: jsonValue(row.validation_result, {}),
    metadata: publicMetadata(row.detected_metadata)
  };
}

export function publicStrategy(row, versions = []) {
  const ratingSum = Number(row.rating_sum || 0);
  const ratingCount = Number(row.rating_count || 0);
  const strategy = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    creator: { display: row.creator_display || row.display_name || '', username: row.creator_username || row.username || '', verified: false, label: 'Unverified creator' },
    thumb: row.thumbnail_url || 'community',
    thumbnailUrl: row.thumbnail_url || null,
    summary: row.summary,
    description: row.description,
    map: row.map,
    mode: row.mode,
    grind: jsonValue(row.grind, []),
    metric: row.metric,
    metricType: row.metric_type,
    rating: ratingCount ? Number((ratingSum / ratingCount).toFixed(2)) : 0,
    ratingSum,
    ratingCount,
    installs: Number(row.installs || 0),
    successfulRuns: Number(row.successful_runs || 0),
    reportCount: Number(row.report_count || 0),
    featured: Boolean(row.featured),
    verified: Boolean(row.verified),
    validated: Boolean(row.validated),
    communityTested: Boolean(row.community_tested || row.version_community_tested),
    manuallyVerified: Boolean(row.manually_verified || row.version_manually_verified || row.verified),
    trust: row.trust_label || 'New',
    noSkillTree: Boolean(row.no_skill_tree),
    timescale: row.timescale,
    towers: jsonValue(row.towers, []),
    modifiers: jsonValue(row.modifiers, []),
    updated: row.updated_at,
    published: row.published_at,
    updatedAt: row.updated_at,
    momentum: Number(row.momentum || 0),
    recentInstalls: Number(row.recent_installs || 0),
    recentRatings: Number(row.recent_ratings || 0),
    popularity: popularScore({ ...row, ratingSum, ratingCount }),
    versions
  };
  strategy.ratingConfidence = confidenceWeightedRating(ratingSum, ratingCount);
  strategy.trending = trendingScore(strategy);
  return strategy;
}

export async function getVersions(strategyId) {
  const rows = await query("select * from strategy_versions where strategy_id = $1 and status = 'published' order by created_at desc", [strategyId]);
  return rows.map(publicVersion);
}

export async function findStrategy(identifier, includeHidden = false) {
  const visibility = includeHidden ? '' : "and s.status = 'published'";
  const rows = await query(`
    select s.*, c.display_name as creator_display, c.username as creator_username,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and coalesce((v.validation_result->>'ok')::boolean, false)) as validated,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and v.community_tested = true) as version_community_tested,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and v.manually_verified = true) as version_manually_verified
    from strategies s join creators c on c.id = s.creator_id
    where (s.id = $1 or s.slug = $1) ${visibility}
    limit 1
  `, [identifier]);
  if (!rows[0]) return null;
  return publicStrategy(rows[0], await getVersions(rows[0].id));
}

export async function listStrategies(params = {}) {
  const queryText = String(params.q || '').trim().slice(0, 80);
  const filters = [queryText, params.map || '', params.mode || '', params.grind || '', params.timescale || '', params.tower || ''];
  const rows = await query(`
    select s.*, c.display_name as creator_display, c.username as creator_username,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and coalesce((v.validation_result->>'ok')::boolean, false)) as validated,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and v.community_tested = true) as version_community_tested,
      exists(select 1 from strategy_versions v where v.strategy_id = s.id and v.status = 'published' and v.manually_verified = true) as version_manually_verified,
      coalesce(recent.recent_installs, 0) as recent_installs,
      coalesce(recent_rating.recent_ratings, 0) as recent_ratings
    from strategies s
    join creators c on c.id = s.creator_id
    left join (
      select strategy_id,
        count(*) filter (where created_at > now() - interval '30 days') as recent_installs
      from install_events
      where succeeded = true
      group by strategy_id
    ) recent on recent.strategy_id = s.id
    left join (
      select strategy_id,
        count(*) filter (where created_at > now() - interval '30 days') as recent_ratings
      from ratings group by strategy_id
    ) recent_rating on recent_rating.strategy_id = s.id
    where s.status = 'published'
      and ($1 = '' or s.title ilike '%' || $1 || '%' or s.summary ilike '%' || $1 || '%' or s.map ilike '%' || $1 || '%' or s.mode ilike '%' || $1 || '%' or c.username ilike '%' || $1 || '%' or s.towers::text ilike '%' || $1 || '%')
      and ($2 = '' or s.map = $2)
      and ($3 = '' or s.mode = $3)
      and ($4 = '' or s.grind::text ilike '%' || $4 || '%')
      and ($5 = '' or s.timescale = $5)
      and ($6 = '' or s.towers::text ilike '%' || $6 || '%')
      and ($7 = false or s.no_skill_tree = true)
    order by s.updated_at desc
    limit 500
  `, [...filters, Boolean(params.noSkillTree)]);
  const strategies = rows.map((row) => publicStrategy(row));
  const sorted = sortStrategies(strategies, params.sort || 'featured');
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.min(60, Math.max(1, Number(params.pageSize || 24)));
  const start = (page - 1) * pageSize;
  return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize };
}