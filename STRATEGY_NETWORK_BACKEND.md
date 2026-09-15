# Strategy Network backend

The site is a static frontend served by the standalone Node server in `server.mjs`. The API handlers under `api/` run behind nginx, while PostgreSQL stores metadata and the configured `STRATEGY_STORAGE_ROOT` filesystem directory stores strategy releases and thumbnails.

Required server-only variables are documented in `.env.example`:

- `DATABASE_URL`
- `STRATEGY_STORAGE_ROOT`
- `STRATEGY_HASH_SECRET` (a long random value used only for keyed fingerprints)
- `STRATEGY_ADMIN_PASSWORD_HASH`

Run `npm ci --omit=dev`, then `npm run migrate` and `npm run seed` with those variables. The seed command validates each checked-in `.strat` release, stores it under the configured storage root, computes its SHA-256 metadata, and updates the local PostgreSQL records.

The API stores only hashed creator management keys and hashed anti-spam fingerprints. Strategy bytes and accepted thumbnails use generated filenames under `strategies/` and `thumbnails/`; metadata, immutable versions, ratings, reports, duplicate reviews, install events, sessions, and audit entries live in PostgreSQL. Internal duplicate fingerprints are not returned by public version responses.

The server binds to localhost only. nginx exposes `/api/*` and static files publicly. If the backend variables are missing, the browser intentionally shows an unavailable read-only page; no Strategy Network seed records are shipped to the public frontend while the feature is disabled.