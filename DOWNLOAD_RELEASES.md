# Download releases

`data/releases.js` is the committed GitHub release snapshot. Run `node sync-releases.cjs` after publishing; it validates GitHub assets, retains absent historical records, and generates `/download/`, all version pages, the `/download/latest` alias, and the download block in `_redirects`. Commit those outputs together. The Node server reads the same redirects on startup; restart it after updating them.

`src/release-detail.js` renders both the index and version content at generation time. Download pages do not fetch the GitHub API or render a separate latest-page state. They remain usable without JavaScript. `src/download.js` only enhances navigation, disclosure motion, checksum copying, and download feedback.

The homepage release badge and mobile Download link are static HTML. `writeVersionChips` stamps both `data-latest-version` labels and `data-latest-release` destinations from the same stable release used by downloads. Run `node sync-releases.cjs` and commit the homepage alongside its generated download outputs. `tests/release-version.test.mjs` blocks a mismatch in CI and exercises a future stable release with a newer prerelease present. Legacy pages without a generated badge use the version-neutral “Latest release” link rather than a hardcoded version.

## Metadata and assets

Source: `GET https://api.github.com/repos/UltimateMacro/Ultimate-Macro-New-Era/releases?per_page=100`. Release dates use `published_at`, formatted in UTC so the Sep 5 sequence stays Sep 5 in every visitor timezone. Size and SHA-256 come from the validated ZIP asset's `size` and `digest`; the existing site convention rounds binary megabytes (`bytes / 1024 / 1024`) and displays MB. Notes come from `body`; the raw history stays intact. The renderer omits the v1.3.5 marketing opener/closer and duplicate version heading and formats the existing change groups. The v1.3.5 index highlights summarize four recorded changes; subsequent versions default to the first four change items.

Exactly one recognized, uploaded ZIP must have the expected repository/tag URL, a positive byte size, and a valid SHA-256 digest. Multiple recognized ZIPs are rejected. Losing a previously validated download asset fails the sync instead of silently removing its download. Missing release records and historical page directories are retained. Other published files are recorded as extras, never counted as ZIP downloads.

## Download counts

The previous index refreshed live/session-cached GitHub data; checked-in version pages only read the Sep 20 snapshot. For v1.3.5, that snapshot contained 17 while the Oct 6 audit returned 3,684. Counts are hidden on all download surfaces. `asset.downloads` in the snapshot is GitHub's `download_count` for the selected ZIP only: no source archives, checksum files, extras, or total-release sums. Unavailable/invalid counts normalize to `null`, never an invented zero. Other site components' existing runtime behavior is unchanged.

## Filenames

Upload future releases as `Ultimate-Macro-v<version>.zip`, for example `Ultimate-Macro-v1.4.0.zip`. The existing validator already accepts this format. Do not upload a second legacy ZIP beside it: two possible primary assets are ambiguous.

Historical GitHub assets and direct URLs are retained:

| Version | Asset |
| --- | --- |
| v1.3.5 | TDS.Macro.v1.3.5.zip |
| v1.3.4b | TDS_Macro_1.3.4b-final.zip |
| v1.3.4a | TDS_Macro_1.3.4a.zip |
| v1.3.4 | TDS_Macro.zip |
| v1.3.3 | TDS_Macro.zip |

Cross-origin `download` attributes cannot reliably rename GitHub attachments. Links use GitHub's actual filename; no cosmetic rename is promised. The v1.3.4 checksum-file metadata now points to the correct release repository.

## Routes

Canonical index: `/download/`. Canonical versions: `/download/<tag>/`. Slashless and `index.html` forms redirect to these. All three `/download/latest` forms issue a temporary 302 to the generated current version, so future releases can change the target. The static alias also contains a canonical, immediate refresh, `location.replace`, and a plain link as fallback. No alias release UI is rendered. Static-host redirects and Node redirects share `_redirects`.

## Validation

- `npm test`: backend, release generation/history, asset ambiguity, redirect/query preservation.
- `PLAYWRIGHT_MODULE=<playwright module> BROWSER_EXECUTABLE=<optional Chromium path> node tests/downloads-browser.mjs`: starts an isolated local server by default. `TEST_DOWNLOAD_URL` can point to a preview instead. `DOWNLOAD_SCREENSHOTS` optionally saves screenshots.
- Browser matrix: all 7 routes × 7 viewports × normal/reduced motion; verifies version/date/size/URL/hash/status/canonical, first-viewport CTA, overflow throughout motion, keyboard disclosure, clipboard copy, immediate attachment feedback, internal links, page errors, and no-JS access. Attachment feedback uses a test response and does not increment GitHub counts.

