# Adcash library delivery

The existing `/assets/adcash-library` URL is now a regular Pages static asset.
It contains the exact owner-approved bytes already served by the fixed HTTPS
VPS library URL, not a new ad provider, zone or modified vendor script.
The vendor's code and licensing remain Adcash's; it is not project-authored code.

The Functions proxy could fall through to the homepage instead of JavaScript.
Static delivery removes the request-time Functions/VPS dependency, including
Functions quota/fail-open behavior. `_routes.json` excludes only this exact
additional path; dashboard API and short-link routing are preserved. `_headers`
sets the JavaScript MIME type, `nosniff`, same-origin policy and `no-store`.

No redirect, alternate provider or browser fallback is added. The first-party
loader, publisher approvals, zone, page exclusions and opt-out behavior are
unchanged. Download and dashboard pages remain ad-free. Browser ad blockers
may still prevent ads, and serving the library does not guarantee an impression.

Verify the checked-in bytes offline:

    node scripts/sync-ad-library.mjs --check

Re-copy the exact pinned approved file from the fixed VPS URL:

    node scripts/sync-ad-library.mjs --sync

The maintenance script rejects redirects, HTML, changed hashes and oversized
responses. A vendor update requires reviewing the new public library and then
changing its pinned size/hash deliberately. Never run the vendor script during
tests or generate ad clicks/impressions to test delivery.
