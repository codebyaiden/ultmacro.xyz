-- Latest read-only macro state reported with the authenticated device heartbeat.

-- statement
alter table dashboard_devices
  add column if not exists state_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists state_updated_at timestamptz;
