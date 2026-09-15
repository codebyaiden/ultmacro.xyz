-- Strategy Network schema. The migration runner executes each `-- statement` block
-- separately so this remains compatible with Neon serverless connections.

-- statement
create table if not exists creators (
  id text primary key,
  display_name text not null,
  username text not null,
  username_normalized text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- statement
create table if not exists strategies (
  id text primary key,
  slug text not null unique,
  creator_id text not null references creators(id),
  title text not null,
  summary text not null,
  description text not null,
  map text not null,
  mode text not null,
  grind jsonb not null default '[]'::jsonb,
  timescale text not null,
  no_skill_tree boolean not null default false,
  towers jsonb not null default '[]'::jsonb,
  metric text not null default 'Not provided',
  metric_type text not null default 'Creator reported',
  thumbnail_url text,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed', 'pending_duplicate')),
  featured boolean not null default false,
  verified boolean not null default false,
  trust_label text not null default 'New',
  installs integer not null default 0 check (installs >= 0),
  successful_runs integer not null default 0 check (successful_runs >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  rating_sum integer not null default 0 check (rating_sum >= 0),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

-- statement
create table if not exists strategy_owners (
  strategy_id text primary key references strategies(id) on delete cascade,
  key_hash text not null,
  key_hint text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- statement
create table if not exists strategy_versions (
  id text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  version text not null,
  content_url text,
  content_sha256 text not null,
  normalized_sha256 text not null,
  content_bytes integer not null check (content_bytes > 0),
  compatible text not null,
  changelog text not null default '',
  validation_result jsonb not null default '{}'::jsonb,
  detected_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (strategy_id, version),
  unique (normalized_sha256)
);

-- statement
create table if not exists ratings (
  id text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  fingerprint_hash text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (strategy_id, fingerprint_hash)
);

-- statement
create table if not exists reports (
  id text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  fingerprint_hash text not null,
  reason text not null check (reason in ('does_not_work', 'misleading_metric', 'outdated', 'malicious', 'copied', 'wrong_requirements', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  unique (strategy_id, fingerprint_hash)
);

-- statement
create table if not exists install_events (
  id text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  version_id text references strategy_versions(id) on delete set null,
  fingerprint_hash text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- statement
create table if not exists admin_sessions (
  token_hash text primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- statement
create table if not exists rate_limit_buckets (
  bucket_key text primary key,
  window_started timestamptz not null,
  hit_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- statement
create table if not exists duplicate_reviews (
  id text primary key,
  version_id text not null references strategy_versions(id) on delete cascade,
  candidate_version_id text references strategy_versions(id) on delete cascade,
  candidate_hash text not null,
  classification text not null default 'likely' check (classification in ('exact', 'likely', 'legitimate')),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

-- statement
create table if not exists admin_audit_log (
  id text primary key,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- statement
create index if not exists strategies_status_updated_idx on strategies(status, updated_at desc);

-- statement
create index if not exists strategies_discovery_idx on strategies(status, featured, installs desc, rating_count desc, updated_at desc);

-- statement
create index if not exists strategy_versions_normalized_hash_idx on strategy_versions(normalized_sha256);

-- statement
create index if not exists reports_status_created_idx on reports(status, created_at desc);

-- statement
create index if not exists duplicate_reviews_status_idx on duplicate_reviews(status, created_at desc);
