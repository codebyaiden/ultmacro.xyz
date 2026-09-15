-- Retention support for the two tables that otherwise grow without bound:
-- one rate-limit bucket per visitor and one row per admin sign-in. The indexes
-- keep the opportunistic cleanup in api/_lib/security.mjs cheap.

-- statement
create index if not exists rate_limit_buckets_updated_at_idx on rate_limit_buckets (updated_at);

-- statement
create index if not exists admin_sessions_expires_at_idx on admin_sessions (expires_at);
