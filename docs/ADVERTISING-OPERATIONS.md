# Advertising incident controls — local changes only

> Historical Adcash remediation record. Superseded by [ADSTERRA-MIGRATION.md](ADSTERRA-MIGRATION.md) for the owner-approved October 19 replacement. The current switch is `enabled` in `data/advertising.json`; set it to `false` to disable Adsterra. The old Adcash entry point is inert. The sections below describe the earlier, unpublished default-off audit state, not the current provider configuration.

Site: ultmacro.xyz; Adcash Site ID 1662562; AutoTag nvfhwgcmud.

## Current switch

`data/advertising.json` has `enabled: false` and `reviewApproved: false`. The shared loader fetches it from the same origin without credentials and with cache bypass. Both values must be literal booleans `true` to permit Adcash loading. Missing/invalid/unavailable configuration disables loading. URL parameters, browser storage and member inputs cannot activate it. This is deployment-controlled public configuration, not a secret.

Do not enable either switch until Adcash confirms site acceptance and acceptable format/frequency settings in writing and the applicable privacy/consent requirements are addressed. The switch is not a consent-management implementation. The library and tag are not modified, proxied, cloaked or patched. No anti-adblock feature is added.

Even when enabled, no ads load on API/internal routes, staff dashboards, poll or application forms, policy/membership pages, Strategy Network (which includes publisher/admin forms), opaque poll landing routes, or framed pages. Redirect and verification documents do not contain the loader. This deliberately limits the earlier all-public-page rollout.

## Deployment — requires explicit owner approval; NOT performed by this audit

1. Review local changes on `codex/adcash-compliance-default-off` against baseline 39738df95e89764d3d0367f366fedc53a9dcb58d. Merge/publish only after approval. Do not push main just to run CI: previous pushes updated production automatically even though the tracked GitHub workflow contains only tests.
2. Publish `data/advertising.json`, the updated loader and all 34 cache-versioned public HTML references atomically. Purge old HTML/loader/config caches where the host or Cloudflare caches them. Keep advertising.json uncached or revalidated; the local Node server uses no-cache. Environment variables alone do not alter a static deployment.
3. Hard-reload an existing visitor tab: already-executed third-party handlers cannot be safely unloaded by a feature flag. Check that no aclib script is inserted, no Adcash requests occur and first-click navigation works. Do not click live ads or generate test impressions.
4. The Node server changes protect a checkout-root deployment. Static hosting/CDN origins must separately exclude hidden files, .env, .git, server sources, dependencies, database dumps, tests, logs and audit evidence. Never publish the raw checkout indiscriminately. Do not verify this by requesting real production secret files.
5. Confirm nginx/Cloudflare rules and the real deployment mechanism; neither is managed in this repository. Retain existing API proxy/auth configuration. No blanket bot challenge or geographic block was installed.

## Required traffic evidence and abuse controls

Export aggregate Cloudflare/server analytics for the earnings spike and surrounding days: requests vs page views vs ad users, verified bots, bot scores if your plan provides them, country/ASN, status codes, source/referrer distribution, paths, repetition and rate over time. Use hashed/redacted identifiers, no access tokens or raw personal data in public reports. Preserve reporting timezone and note whether counts are unique users, impressions or visits. Do not treat repeated NAT/shared-IP use as proof of fraud.

Existing database-backed rate limits on mutations and authenticated staff workflows are preserved. The app currently trusts forwarded-IP headers: the real reverse proxy must overwrite spoofable client forwarding headers and prevent direct public access to the loopback origin. Confirm this before relying on IP-based limits. Apply narrow, measured edge rate limits to verified abuse; allow ordinary navigation and verified crawlers. No new paid service or CAPTCHA is enabled.

Inventory is reproducible with `node scripts/audit-ad-surface.mjs`. Evidence output is ignored and blocked by the local static server; do not deploy it. Do not send synthetic/paid-to-click traffic, reward ad interaction or ask members to click ads. A previously discussed creator engagement reward scheme is not found implemented here; confirm what was actually promoted off-site before telling Adcash otherwise.
