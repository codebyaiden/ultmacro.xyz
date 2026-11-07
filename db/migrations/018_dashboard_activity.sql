-- Durable, idempotent dashboard activity and device labels for linked installs.

-- statement
alter table dashboard_browser_sessions
  add column if not exists device_type text not null default 'device';

-- statement
create table if not exists dashboard_activity_events (
  device_id text not null references dashboard_devices(id) on delete cascade,
  owner_hash text not null,
  event_id text not null,
  run_id text not null,
  sequence bigint not null,
  event_type text not null,
  source text not null,
  confidence text not null,
  app_version text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  primary key (device_id, event_id),
  unique (device_id, run_id, sequence)
);

-- statement
create index if not exists dashboard_activity_owner_time_idx
  on dashboard_activity_events (owner_hash, occurred_at desc);
