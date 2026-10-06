# Ultimate Macro poll — Phase 3

`/poll/team` provides a private overview, question explorer, anonymous response viewer, and searchable written feedback. The public poll HTML/CSS/controller, definitions, save protocol and API remain unchanged. There are no new runtime dependencies, accounts, OAuth, role tiers, AI summaries, exports or public results.

## Staff access and operations

The server generates a 256-bit individual invite and stores only its SHA-256 hash. Opening the link shows a confirmation; GET/link previews never consume it. A same-origin POST atomically consumes the invite and creates a separate random staff session, then redirects to `/poll/team`. Confirmation uses `Referrer-Policy: strict-origin` so native form POSTs retain a valid Origin without disclosing the token path. Other private responses use `no-referrer`.

The `um_poll_staff` cookie is HttpOnly, SameSite=Strict, has a 30-day absolute expiration and is Secure on HTTPS/in production. Staff and public cookies are independent. Sessions are stored as hashes and linked to their invite; revoking a consumed invite also blocks its session. Tokens never appear in management listings or dashboard JSON. Sign out revokes the session and clears its cookie.

Use the existing server environment and PostgreSQL connection after the required poll migrations have been applied through the VPS-specific deployment procedure. **Do not run the generic migration runner on this VPS:** its migration directory includes server-only migrations. Apply only missing `005_poll.sql` and `006_poll_staff.sql` as required; the PR #17 origin fix needs no migrations:

```sh
node scripts/poll-staff.mjs create "Pizza laptop"
node scripts/poll-staff.mjs create "Aiden iPad" 48
node scripts/poll-staff.mjs list
node scripts/poll-staff.mjs revoke invite UUID_FROM_LIST
node scripts/poll-staff.mjs revoke session UUID_FROM_LIST
```

Invite lifetimes default to 24 hours and may be 1–168 hours. Creation prints the link once; treat it as a credential and deliver it privately. Labels identify a staff device for the operator, rather than creating an account. Listings include up to 200 active invites and sessions with their opaque management IDs, labels and timestamps. `POLL_PUBLIC_ORIGIN` optionally changes the generated link origin; the default is `https://ultmacro.xyz`. Node does not implicitly load `.env`.

## Views and filters

- Overview: total/completed responses, completion rate, mean satisfaction and distribution, top reported issue, mostly successful-run percentage, development priority, feature interest and 14-day recent activity.
- Questions: counts and percentages for every option, rating distributions, average selected-shortlist rank/first-place counts, explicit skips, answered denominator and links to conditional follow-ups. Branch links retain the other filters and show their parent answer. Text questions link to written feedback.
- Responses: pages of 25 anonymous responses with stable response numbers, submission/activity timestamps and actual saved adaptive paths. Irrelevant questions are omitted. Conditional and explicitly skipped questions are marked; current unanswered questions are shown for in-progress responses. No token/hash/identity is returned.
- Written feedback: question selection, literal case-insensitive search, combined segment filters, pages of 25, expand/collapse and links to the rest of the response. Text is rendered with DOM textContent, never interpreted as HTML.

Filters combine with AND: satisfaction minimum/maximum, frequency, experience, Strategy Lab use, run reliability, development focus, Discord purpose, up to four selected feature interests, completion state and inclusive UTC completion-date range. Branch parent/value is an additional validated segment. All views use the same server-side segment builder and current immutable survey version.

Percentages use respondents who answered that question, not all responses. Multiple-choice totals may exceed 100%. Ranking averages refer to position within each respondent's chosen shortlist; they are not an overall score across equally eligible features. Completion-rate denominators follow the chosen segment (e.g. completed-only gives 100%). Activity counts each response's latest save/submission, rather than every autosave, and its labels/dates use UTC.

Phase 2's active duration remains browser-local and is not available to staff. The response view shows real timestamps and path information; it deliberately does not calculate misleading wall-clock completion durations.

## Private endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/poll/team/access/:token` | Validate invite and show confirmation; no consumption. |
| POST | `/poll/team/access/:token` | Consume invite, set staff cookie, 303 redirect. |
| GET | `/api/poll-team` | Segmented overview. |
| GET | `/api/poll-team/questions` | Current question/filter metadata. |
| GET | `/api/poll-team/question?question=ID` | Question distribution and branch links. |
| GET | `/api/poll-team/responses?page=0` | Paginated anonymous response index. |
| GET | `/api/poll-team/response?id=UUID` | One response path within the selected segment. |
| GET | `/api/poll-team/feedback?question=ID&search=TEXT&page=0` | Searchable written answers. |
| POST | `/api/poll-team/logout` | Revoke current staff session. |

Every private API route checks a valid staff session before querying data. The HTML page, direct `index.html`, and encoded/backslash path variants route through the same guard. Invite POST requires matching Origin; logout requires a custom `X-Poll-Team-Request: 1` header and rejects cross-origin requests. There is no browser invite-management endpoint.

Private responses are no-store, vary by cookie, deny framing, and use a restrictive same-origin CSP. API filters reject unknown/duplicate keys, invalid values/dates, invalid branch pairs, invalid UUIDs and excessive page/search values. SQL uses parameter bindings; query identifiers/fragments come only from fixed code/configuration. Staff mutations have a 1 KiB transport/body cap. The existing database-backed rate limiter allows 20 access requests and 180 other staff requests per IP per ten minutes, returning Retry-After on rejection.

## Database and deployment

Migration `006_poll_staff.sql` adds `poll_staff_invites`, `poll_staff_sessions`, an identity response number plus unique index, a question/response answer index and a version/activity response index. It is additive and idempotent; analytics reuse the existing responses/answers, and aggregate in SQL. Only one response path and bounded 25-item lists are loaded into application memory.

Apply only missing poll migrations (`005_poll.sql` and `006_poll_staff.sql`, as required) through the existing VPS-specific procedure; do not use the generic migration runner. Restart the existing Node service. Ensure nginx proxies **all** `/poll/team*` and `/api/poll-team*` paths to Node, including `/poll/team/index.html`; do not serve that HTML directly from nginx. Preserve Host/HTTPS forwarding and overwrite client IP headers through the trusted proxy. Private endpoints must not be cached. Suppress/redact invite URL paths in proxy/ingress logs, since links contain credentials. The Node app does not log request URLs or tokens. No new secret or database service is needed.

PRs remain stacked: Phase 1 #12, then Phase 2 #13, then Phase 3. Retarget each successor after merging its parent. GitHub changes are not assumed to deploy automatically. No production invite was generated or deployment performed.

## Files

Added: `api/_lib/poll-staff.mjs`, `api/_lib/poll-analytics.mjs`, `api/poll-team.mjs`, `db/migrations/006_poll_staff.sql`, `scripts/poll-staff.mjs`, `poll/team/index.html`, `styles/poll-team.css`, `src/poll-team.js`, `tests/poll-team.test.mjs`, `tests/poll-team-storage.test.mjs`, `tests/poll-team-browser.mjs`, `tests/helpers/poll-team-browser-server.mjs`, this document.

Modified: `server.mjs` (guarded staff routes and payload cap), `tests/poll-server.test.mjs` (private route/encoded-path checks).

## Verification

Full Node suite with SQL integration through external PGlite tooling: 53/53 pass with no skips, including all Phase 1, Phase 2 and Strategy Network tests. Staff tests cover one-time concurrent consumption, hashes, expiry/revocation, unauthorized endpoints, cookies/CSRF/rate limits, combined filters, distributions/rankings, branch drill-down, private paths, literal text search/pagination, UTC date boundaries in a non-UTC database session, and bounded aggregation with 2,004 responses. The PGlite aggregate/list check took roughly 38 ms locally; this is not a production performance benchmark.

Chromium staff flows and actual screenshots were inspected at 390/820/1440px: invite confirmation, filters/reset, branch drill-down, rankings, feedback/search/XSS text, response paths, pagination, empty/offline/retry states, fast view changes, browser resume, session revocation and sign out. Phone uses reduced motion. Screenshot iteration improved segment chips, collapsed filters, chart height/whitespace and response metadata. Browser tests reproduced and fixed form Origin handling and a Reset control shadowing the form's reset method.

Public poll browser regressions also passed at 320/390/820/1440px with motion, including adaptive completion, Back, ranking, autosave/resume, offline/immediate-close recovery, in-flight draft races, navigation lock, keyboard and repeated submits. Public frontend files were not edited.

Not verified: physical iPhone/iPad or Safari, native PostgreSQL multi-process races, production query plans/latency, live nginx/logging/service behavior and deployment. PGlite uses a single-connection test adapter; the invite's conditional SQL UPDATE/transaction is atomic by design, but real multi-process PostgreSQL concurrency was not exercised.
