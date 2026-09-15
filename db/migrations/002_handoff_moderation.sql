-- statement
create table if not exists strategy_install_intents (
  token_hash text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  version_id text not null references strategy_versions(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

-- statement
alter table strategy_versions add column if not exists status text not null default 'published';

-- statement
alter table strategy_versions add column if not exists community_tested boolean not null default false;

-- statement
alter table strategy_versions add column if not exists manually_verified boolean not null default false;

-- statement
create index if not exists strategy_install_intents_expiry_idx on strategy_install_intents(expires_at);

-- statement
create index if not exists strategy_versions_status_idx on strategy_versions(strategy_id, status, created_at desc);
