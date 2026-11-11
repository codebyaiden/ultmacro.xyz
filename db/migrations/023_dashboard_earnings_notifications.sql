-- Optional earnings recaps and durable milestone tracking.

-- statement
alter table dashboard_notification_preferences
  add column if not exists hourly_summary text not null default 'off'
    check (hourly_summary in ('hourly', 'off')),
  add column if not exists milestones text not null default 'off'
    check (milestones in ('on', 'off'));

-- statement
create table if not exists dashboard_earnings_progress (
  owner_hash text primary key,
  coins bigint not null default 0,
  gems bigint not null default 0,
  tower_xp bigint not null default 0,
  victories bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- statement
insert into dashboard_earnings_progress (owner_hash, coins, gems, tower_xp, victories)
select owner_hash,
  coalesce(sum(coalesce((data->>'coins')::bigint, 0)), 0),
  coalesce(sum(coalesce((data->>'gems')::bigint, 0)), 0),
  coalesce(sum(coalesce((data->>'towerXp')::bigint, 0)), 0),
  count(*) filter (where event_type = 'match.victory')
from dashboard_activity_events
where event_type in ('match.victory', 'match.loss')
group by owner_hash
on conflict (owner_hash) do nothing;

-- statement
create table if not exists dashboard_earnings_milestones (
  owner_hash text not null,
  metric text not null check (metric in ('coins', 'gems', 'towerXp', 'victories')),
  threshold bigint not null check (threshold > 0),
  reached_at timestamptz not null default now(),
  primary key (owner_hash, metric, threshold)
);

-- statement
create or replace function dashboard_track_earnings_progress() returns trigger language plpgsql as $$
begin
  if new.event_type not in ('match.victory', 'match.loss') then
    return new;
  end if;
  insert into dashboard_earnings_progress (owner_hash, coins, gems, tower_xp, victories, updated_at)
  values (
    new.owner_hash,
    coalesce((new.data->>'coins')::bigint, 0),
    coalesce((new.data->>'gems')::bigint, 0),
    coalesce((new.data->>'towerXp')::bigint, 0),
    case when new.event_type = 'match.victory' then 1 else 0 end,
    now()
  )
  on conflict (owner_hash) do update set
    coins = dashboard_earnings_progress.coins + excluded.coins,
    gems = dashboard_earnings_progress.gems + excluded.gems,
    tower_xp = dashboard_earnings_progress.tower_xp + excluded.tower_xp,
    victories = dashboard_earnings_progress.victories + excluded.victories,
    updated_at = now();
  return new;
end;
$$;

-- statement
drop trigger if exists dashboard_activity_earnings_progress on dashboard_activity_events;
create trigger dashboard_activity_earnings_progress
after insert on dashboard_activity_events
for each row execute function dashboard_track_earnings_progress();
