-- Short-lived, single-device commands for explicit dashboard remote controls.

-- statement
create table if not exists dashboard_remote_commands (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null,
  device_id text not null references dashboard_devices(id) on delete cascade,
  command text not null check (command in ('start', 'pause', 'resume', 'stop')),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'succeeded', 'failed', 'expired')),
  result text not null default '',
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null
);

-- statement
create index if not exists dashboard_remote_commands_device_idx
  on dashboard_remote_commands (device_id, requested_at)
  where status in ('pending', 'delivered');

-- statement
create unique index if not exists dashboard_remote_commands_one_active_idx
  on dashboard_remote_commands (device_id)
  where status in ('pending', 'delivered');

-- statement
create index if not exists dashboard_remote_commands_expiry_idx
  on dashboard_remote_commands (expires_at);
