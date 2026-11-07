-- One-time dashboard pairing and revocable desktop credentials.

-- statement
create table if not exists dashboard_devices (
  id text primary key,
  owner_hash text not null,
  token_hash text not null unique,
  device_name text not null,
  app_version text not null,
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

-- statement
create index if not exists dashboard_devices_owner_idx on dashboard_devices (owner_hash, paired_at desc);

-- statement
create table if not exists dashboard_pairing_codes (
  code_hash text primary key,
  owner_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  device_id text references dashboard_devices(id),
  revoked_at timestamptz
);

-- statement
create index if not exists dashboard_pairing_owner_created_idx on dashboard_pairing_codes (owner_hash, created_at desc);

-- statement
create index if not exists dashboard_pairing_expiry_idx on dashboard_pairing_codes (expires_at) where claimed_at is null and revoked_at is null;
