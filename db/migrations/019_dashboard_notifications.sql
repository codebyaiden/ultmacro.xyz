-- Dashboard notification preferences and short-lived notification details.

-- statement
alter table dashboard_devices
  add column if not exists notification_offline_at timestamptz;

-- statement
create table if not exists dashboard_notification_preferences (
  owner_hash text not null,
  device_hash text not null,
  results text not null default 'all' check (results in ('all', 'errors', 'off')),
  run_events text not null default 'runs' check (run_events in ('runs', 'all', 'off')),
  connection text not null default 'offline' check (connection in ('all', 'offline', 'off')),
  updated_at timestamptz not null default now(),
  primary key (owner_hash, device_hash)
);

-- statement
create table if not exists dashboard_notifications (
  id uuid primary key,
  owner_hash text not null,
  event_id text not null,
  event_type text not null,
  title text not null,
  body text not null,
  category text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (owner_hash, event_id, event_type)
);

-- statement
create index if not exists dashboard_notifications_expiry_idx on dashboard_notifications (expires_at);
