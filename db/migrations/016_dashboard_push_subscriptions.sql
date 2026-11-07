-- Browser push endpoints and encryption keys for Dashboard notifications.

-- statement
create table if not exists dashboard_push_subscriptions (
  endpoint_hash text primary key,
  owner_hash text not null,
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- statement
create index if not exists dashboard_push_subscriptions_owner_idx on dashboard_push_subscriptions (owner_hash);
