-- Definitions are immutable versioned configuration in api/_lib/poll-definition.mjs.
-- statement
create table if not exists poll_responses (
  id uuid primary key,
  session_hash char(64) not null unique,
  survey_version text not null,
  current_question text,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
-- statement
create table if not exists poll_answers (
  response_id uuid not null references poll_responses(id) on delete cascade,
  question_id text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (response_id, question_id)
);
-- statement
create index if not exists poll_responses_version_completed_idx on poll_responses (survey_version, completed_at);
