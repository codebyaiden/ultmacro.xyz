# Strategy Network desktop contract

This static site prepares a desktop handoff. It does not write to the local strategy directory and it does not claim an installation succeeded.

## URI handoff

The website opens:

```text
ultimatemacro://install-strategy?id=<strategy-id>&version=<version>
```

The desktop app should register the `ultimatemacro` protocol, validate the id and version against the official Strategy Network API, download the immutable release over HTTPS, run its own secondary `.strat` validation, and install it using the app's existing safe strategy-storage path.

The app must not trust arbitrary query values, filenames, or website-provided metadata. It should show a confirmation when the requested strategy is not compatible with the installed app version.

## Installed-state bridge

After the Strategy Network page loads, it sends this browser message:

```js
window.postMessage({
  source: 'strategy-network',
  type: 'request-strategy-state',
  protocol: 'ultimatemacro://install-strategy'
}, '*');
```

The desktop bridge may respond with:

```js
window.postMessage({
  source: 'ultimatemacro',
  type: 'strategy-state',
  installed: {
    "strategy-id": "version"
  }
}, '*');
```

The website uses the response only to label a strategy `Installed` or `Update available`. The desktop application remains the authority for the actual local state. A future native bridge should restrict accepted messages to the page origin `https://ultmacro.xyz` and expose only installed strategy ids and versions.

## Production API shape

When enabled, the frontend may use server data as a read-only fallback when `/api/strategies` is unavailable. It does not persist strategies, ratings, or reports in browser storage. The server implementation provides these authenticated or rate-limited endpoints without changing the browse UI:

```text
GET  /api/strategies?q=&map=&mode=&grind=&tower=&timescale=&noSkillTree=&sort=&page=
GET  /api/strategies/:id
GET  /api/strategies/:id/versions/:version
POST /api/strategies/:id/install-events
POST /api/strategies/:id/ratings
POST /api/strategies/:id/reports
POST /api/strategies
POST /api/strategies/:id/versions
```

Admin-only endpoints are served inside the existing browse/detail flow:

```text
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/session
GET  /api/admin/reports
GET  /api/admin/duplicates
POST /api/admin/strategies/:id/action
POST /api/admin/reports/:id/action
```

Uploads must be treated as untrusted bytes. The API stores immutable release content by SHA-256 under the configured server storage root, validates it server-side, hashes creator management keys with a password-grade KDF, and enforces admin and creator authorization server-side. The browser never receives an admin secret or a stored creator-key hash.