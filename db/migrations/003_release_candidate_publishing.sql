-- statement
alter table strategies add column if not exists modifiers jsonb not null default '[]'::jsonb;

-- statement
create table if not exists ownership_transfers (
  id text primary key,
  strategy_id text not null references strategies(id) on delete cascade,
  previous_creator_id text references creators(id) on delete set null,
  new_creator_id text not null references creators(id),
  action text not null check (action in ('reset', 'transfer')),
  created_at timestamptz not null default now()
);

-- statement
create index if not exists ownership_transfers_strategy_idx on ownership_transfers(strategy_id, created_at desc);
