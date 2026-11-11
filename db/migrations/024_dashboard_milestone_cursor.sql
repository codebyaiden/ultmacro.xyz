-- Keep one durable high-water mark per metric so milestone pushes remain idempotent.

-- statement
alter table dashboard_earnings_milestones
  drop constraint if exists dashboard_earnings_milestones_pkey,
  add constraint dashboard_earnings_milestones_pkey primary key (owner_hash, metric);

-- statement
insert into dashboard_earnings_milestones (owner_hash, metric, threshold)
select owner_hash, metric, threshold from (
  select owner_hash, 'coins'::text as metric, floor(coins / 100000.0)::bigint * 100000 as threshold from dashboard_earnings_progress
  union all
  select owner_hash, 'gems'::text, floor(gems / 10000.0)::bigint * 10000 from dashboard_earnings_progress
  union all
  select owner_hash, 'towerXp'::text, floor(tower_xp / 1000.0)::bigint * 1000 from dashboard_earnings_progress
  union all
  select owner_hash, 'victories'::text, floor(victories / 10.0)::bigint * 10 from dashboard_earnings_progress
) reached where threshold > 0
on conflict (owner_hash, metric) do update set threshold = greatest(dashboard_earnings_milestones.threshold, excluded.threshold);
