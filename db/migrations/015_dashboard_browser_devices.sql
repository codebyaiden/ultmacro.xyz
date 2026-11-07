-- Per-browser dashboard sessions and single-use device links.

-- statement
create table if not exists dashboard_browser_sessions (
  token_hash text primary key,
  owner_hash text not null,
  device_name text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- statement
create index if not exists dashboard_browser_sessions_owner_idx on dashboard_browser_sessions (owner_hash, last_seen_at desc) where revoked_at is null;

-- statement
create table if not exists dashboard_browser_links (
  token_hash text primary key,
  owner_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz
);

-- statement
create index if not exists dashboard_browser_links_expiry_idx on dashboard_browser_links (expires_at) where used_at is null and revoked_at is null;
