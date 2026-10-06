# Ultimate Macro poll — Phase 1

The new survey lives at `/poll`, alongside the existing static pages. It uses the existing Node server, Web Request/Response API handlers, PostgreSQL `pg` pool, HTTP response helpers, and database-backed rate limiter. There are no new runtime dependencies. Phase 2 and Phase 3 are intentionally absent.

## Files

Created:
- `poll/index.html`: branded landing page and survey shell.
- `styles/poll.css`: isolated dark responsive styling, focus states and reduced-motion handling.
- `src/poll.js`: question controls, ranking buttons, save queue, local unsaved-draft recovery, resume, Back and completion.
- `api/_lib/poll-definition.mjs`: immutable `um-feedback-v1` question configuration, durations and declarative conditions.
- `api/_lib/poll-engine.mjs`: validation, calculated paths, dependent-answer pruning, wording, ETA, navigation and completion.
- `api/_lib/poll-store.mjs`: PostgreSQL transactions and response revisions.
- `api/poll.mjs`: public anonymous session API, request validation, cookie authorization and abuse limits.
- `db/migrations/005_poll.sql`: poll response and answer tables.
- `tests/poll-engine.test.mjs`, `tests/poll-api.test.mjs`, `tests/poll-server.test.mjs`, `tests/poll-storage.test.mjs`, `tests/poll-browser.mjs`: engine, handler, HTTP, SQL and optional browser verification.
- `docs/superpowers/plans/2026-10-05-poll-phase-1.md`: implementation plan and execution decisions.
- This document: architecture and deployment handoff.

Modified: `server.mjs` adds poll routing and a 16 KiB poll-body limit; `package.json` includes poll tests in the existing Node test command. No existing website UI or Strategy Network code was refactored.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/poll/start` | Create an anonymous response, or resume the current cookie's response. Body `{}`. |
| GET | `/api/poll` | Retrieve only this browser session's state. |
| POST | `/api/poll/answer` | Save the current question. `{revision, questionId, value, advance?}`. |
| POST | `/api/poll/navigate` | Persist Back/Next. `{revision, direction: "back" \| "next"}`. |
| POST | `/api/poll/submit` | Complete an answered survey. `{revision}`. |

Writes require `Content-Type: application/json` and `X-Poll-Request: 1`. POST Origin is checked against the server-owned `POLL_PUBLIC_ORIGIN` (default `https://ultmacro.xyz`), independently of the internal proxy URL. `www` is not automatically accepted. `Sec-Fetch-Site: cross-site` is always rejected; absent Origin remains permitted only with the custom header and JSON, without CORS access. Same-origin loopback URLs work outside `NODE_ENV=production`. Forwarded host/proto headers cannot expand the origin allowlist. HTTPS browser origins receive Secure cookies even when the upstream URL is HTTP. Unexpected fields and query parameters are rejected. Requests do not accept a response ID. GET state and writes require the random 256-bit `um_poll` cookie; only its SHA-256 hash is stored. The cookie is HttpOnly, SameSite=Lax, restricted to `/api/poll`, and Secure over HTTPS/production, with a 90-day lifetime. Completion responses omit answers and question paths. Submitted responses are immutable; repeated Submit is idempotent.

The server validates every option, rating, text length, exclusive multiple choice and ranking permutation. The browser never controls branching or completion. Mutations lock one response with `FOR UPDATE`; revision mismatches return 409. Branch changes delete irrelevant answer rows in the same transaction. Optional skips are stored as JSON `null`, rather than SQL NULL.

The existing rate limiter allows 10 start/resume requests per IP per 10 minutes, and 240 other requests per IP per 10 minutes. It stores keyed bucket hashes and returns 429 with Retry-After. This assumes nginx overwrites forwarded IP headers; shared networks can reach the same limit. No identity, Discord ID, email, or account login is requested.

## Adaptive flow

- Satisfaction 1–2 → cause of low rating; 3 → what prevents a 4; 4–5 → what to preserve.
- Reliability focus → most frustrating issue; features focus → missing functionality; both → reason plus optional next-release tie-breaker.
- Strategy Lab never → no details; stopped → why; sometimes → editing ease; often → editing ease and improvements.
- Failed runs → common failure type; insufficient run experience skips it.
- Difficult navigation changes later UI-question wording.
- Select up to four feature ideas, or “None of these”; selecting two or more enables ranking of exactly those choices. Feature-selection changes invalidate incompatible rankings.
- Regular/occasional Cloud use → sync reliability; other usage skips it.
- Discord non-users skip support questions.
- Optional final feedback can be skipped.

Each completed path contains roughly 17–24 questions. Durations are estimates by question type. ETA reserves likely follow-ups while controlling answers are unknown, then shrinks/expands with the actual path. Progress uses estimated answered time, without a fixed question count. Phase 2 replaces the displayed wall-clock duration with locally preserved active time, excluding hidden and idle periods; see `POLL_PHASE2.md`.

Answers autosave after a short debounce; Continue also waits for pending saves. Inputs lock during navigation to prevent a later edit being overwritten. An unsaved draft stays locally when offline or closed before saving. In-flight save metadata reconciles a newer draft after an older save commits; divergent cross-tab drafts offer an explicit restore choice. Clearing cookies/browser storage, switching browsers, or private browsing can prevent resume. This is anonymous browser persistence, not cross-device identity.

## Deploy with the existing VPS setup

The repository documents nginx in front of the localhost Node server. It does not include the live nginx/systemd configuration or deployment automation, and those live settings were not inspected. Do not assume a GitHub push deploys this change.

1. Check out the reviewed feature commit in the existing deployment checkout, using the existing deployment procedure.
2. Install runtime dependencies with `npm ci --omit=dev` if needed, using the existing server-only environment. **Do not run the generic migration runner on this VPS.** Its production migration directory includes server-only migrations, and the runner replays every `.sql` file. Apply only the poll migrations required by the deployed version through the existing VPS-specific deployment procedure: `005_poll.sql` for poll storage and `006_poll_staff.sql` for the staff dashboard, only if not already applied. The PR #17 origin fix requires no database migrations.
3. Confirm `DATABASE_URL` and `STRATEGY_HASH_SECRET` are set. Poll does not require strategy-file storage. No new secrets are needed. Ensure the service actually receives the environment; Node does not automatically load `.env`.
4. Restart the existing Node service through its normal service manager.
5. Confirm nginx serves `/poll` and `/poll/` as `poll/index.html` and proxies all `/api/poll` routes to Node. Configure `POLL_PUBLIC_ORIGIN=https://ultmacro.xyz` in the actual service environment (the same default applies if unset). Origin validation does not depend on preserving the public Host/protocol. nginx must still sanitize forwarded headers and overwrite `X-Forwarded-For` with the trusted client address. A static-only deployment cannot save answers.
6. Smoke-test HTTPS start, answer/save, refresh/resume, Back/edit, skip, and Submit. Verify the cookie is Secure/HttpOnly and public requests cannot select another response. Ensure `/api/poll*` is not cached.

If rolling back, restore the previous Node/static files. Leaving the additive tables in place preserves responses; no destructive rollback is required.

## Verification

- `npm test` runs the existing Strategy Network suite plus engine/API/server tests. SQL integration skips by default when no isolated test database is configured.
- `TEST_POLL_DATABASE_URL=... node --test tests/poll-storage.test.mjs` tests native PostgreSQL in an isolated random schema, removed afterwards. Use a dedicated test database, never production.
- `POLL_TEST_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/poll-storage.test.mjs` supports local PostgreSQL WASM verification using test tooling outside the application. PGlite is not an application dependency. Its single-connection adapter serializes transactions; this does not verify multi-process native PostgreSQL locking behavior.
- `TEST_POLL_BROWSER_URL=http://localhost:... PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/poll-browser.mjs` runs optional browser flows against a dedicated local/staging backend. It creates anonymous test submissions, so do not aim it at production. Browser tooling is not installed as an application dependency.

Phase 1 was checked with the full suite and PGlite SQL integration, including optional skips, stale-row deletion, resume and completion. Chromium browser checks cover 320/390/820/1440px layouts, complete adaptive flows, ranking, refresh/resume, immediate-close recovery, offline retry, keyboard focus, reduced motion and save-race recovery. Actual iOS Safari, physical devices, live VPS migration/service restart/nginx headers, and native PostgreSQL concurrency were not verified.

## Phase 2 extension

Visual changes can be made in `styles/poll.css`, `poll/index.html` and the frontend renderers without altering API/storage/branching. New renderer types need matching validation and durations. Question edits that change meaning should use a new immutable survey version and retain a handler for old in-progress responses. Keep analytics/staff access out of the public API; Phase 3 can query these tables through a separate authorized staff interface.
