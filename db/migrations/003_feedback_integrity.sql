-- Strategy Network rating/install integrity.

-- statement
delete from install_events older
using install_events newer
where older.succeeded = true
  and newer.succeeded = true
  and older.strategy_id = newer.strategy_id
  and older.version_id is not distinct from newer.version_id
  and older.fingerprint_hash = newer.fingerprint_hash
  and older.ctid < newer.ctid;

-- statement
create unique index if not exists install_events_success_unique_idx
  on install_events (strategy_id, coalesce(version_id, ''), fingerprint_hash)
  where succeeded = true;

-- statement
create index if not exists ratings_strategy_created_idx
  on ratings(strategy_id, created_at desc);
