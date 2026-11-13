-- Track actual file downloads and one install per dashboard account and strategy.
-- statement
alter table strategy_library_items
  add column if not exists download_count bigint not null default 0 check (download_count >= 0);

-- statement
create table if not exists strategy_library_installs (
  source_attachment_id text not null references strategy_library_items(source_attachment_id) on delete cascade,
  owner_hash char(64) not null,
  installed_at timestamptz not null default now(),
  primary key (source_attachment_id, owner_hash)
);

-- statement
create index if not exists strategy_library_installs_attachment_idx
  on strategy_library_installs(source_attachment_id, installed_at desc);
