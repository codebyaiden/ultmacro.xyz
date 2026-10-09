# Ultimate Macro Wiki

A static, searchable wiki at \`/wiki/\`, served by the website's existing Node/static setup. No separate documentation framework.

## Design direction

**Use the actual \`ultmacro.xyz\` homepage as the visual reference.** Its deep-navy hero, rich blue accents, serif display headings, clean typography, authentic product screenshot and carefully rounded buttons are the baseline. The wiki itself uses dark-blue reading surfaces throughout, including articles, tables, search and navigation. Strategy Network is the reference for functional browsing and search.

- The homepage hero uses the real \`assets/ui/ultimate-macro-main-new.png\` screenshot, not decorative generated artwork.
- Keep information dense but legible on dark-blue editorial surfaces, with high-contrast text and lighter blue highlights. Do not switch to a white article background. Use structured tables, numbered steps, and compact related links on article pages.
- Rounded controls should feel related to the main site's buttons. Avoid both square system controls and giant randomly rounded icon circles.
- On mobile, search and menu are simple, transparent icons without bubbles around them. Mobile navigation opens and closes as a drawer.
- Animate functional hover and focus states subtly; respect \`prefers-reduced-motion\`.
- Use content that is specific to the macro. Never fill space with meaningless labels such as "DOCUMENTATION", fake metrics, generic taglines, gradient blobs, or speculative screenshots.
- Link to exact installation and troubleshooting resources. Don't advertise an AI assistant as operational until a real backend exists.

## Content

\`content.mjs\` exports categories and guides; add real features or verified fixes with exact instructions and sources. The current material is based on official public v1.3.x documentation. Reconcile changes before describing a new release.

Article URLs: \`/wiki/?article=wrong-clicks\`
Category URLs: \`/wiki/?category=Troubleshooting\`

The homepage routes visitors into setup, common problems and all topic categories. The floating helper is presently **wiki article search**, not an LLM. The research catalog at `?library=1` contains 778 candidate topics. Each topic can now display exact related steps from a source-linked published guide without pretending its specific problem has been independently reproduced. v1.4-dependent topics stay gated. The primary wiki search continues to show only published articles.

## QA

Run \`npm test\`, then check keyboard search, sidebar drawer, article deep links, settings tables, support links, hero image and chat search. Review desktop and narrow-screen layouts in a real browser. All links and interactive surfaces must do what they say.

## Expansion backlog

The editorial plan lives in [`roadmap/PLAN.md`](./roadmap/PLAN.md), with 778 evidence-gated candidate topics in [`roadmap/topics.json`](./roadmap/topics.json). These are **not yet published documentation**. Add a topic only after verifying it, and merge redundant topics into stronger articles rather than generating hundreds of empty pages.

## Content organization

`content.mjs` combines baseline source-backed guides with `content-expanded.mjs` (44 additional public-release topics) and `content-v135-source.mjs` (14 guides checked against the tagged v1.3.5 Main.ahk code). `catalog.mjs` holds the separate 778-topic research index and must stay aligned with `roadmap/topics.json`. A planned topic is not an article and should not appear as a confirmed AI answer. Main navigation deliberately shows only the first few documents in each category.

## Public read-only Wiki API

The versioned Node JSON API lives in `api/wiki.mjs`, routed by `server.mjs` at `/api/wiki/v1`. It exposes paginated published articles, full article sections, categories, keyword search, discovery and OpenAPI. It has anonymous read-only access, CORS `*`, ETags, 5-minute caching and bounded query/limit input. It does **not** return roadmap-only entries, user data or AI-generated answers.

The developer page is `/wiki/api/` and the guaranteed static fallback snapshot is `/wiki/api/v1/articles.json`. **Production routing requirement:** forward `/api/wiki/v1/*` through the site's edge/nginx proxy to the Node website service. A source merge alone cannot establish that edge route. The static JSON snapshot should remain accessible as a file without the API proxy.

Keep `wiki/api/v1/articles.json` synchronized when editing published docs; `npm run wiki:check` verifies the snapshot's article slugs and count. Tests in `tests/wiki-api.test.mjs` cover API shape, search, method safety and caching.

## Navigation decisions

Primary site navigation has five tasks: Features, Wiki, Strategy Network, Early Access and Download. Existing `/guide/`, `/faq/` and background routes remain available via links and direct URLs to avoid breaking bookmarks. The 778-topic research backlog stays accessible from the wiki footer, but does not appear in main search results or the primary sidebar. Public API results include only published guides.

## Tagged source verification

See [`verification/v1.3.5-source-review.md`](verification/v1.3.5-source-review.md) for the exact release code that supports newly documented paths, hotkeys, defaults and reset behavior. The official ZIP could not be transferred into this environment, so ZIP-only runtime content, real Windows screenshots and GIFs still require an actual Windows capture session. `topic-support.mjs` extracts relevant published steps for research-topic detail pages, but does not promote those candidate pages into the public Wiki JSON API as independently verified articles.

## Strategy syntax and packaged release verification

The Wiki now combines the original 76 guides, 14 source-reviewed public-release guides, 19 additional source-pinned settings/updater/diagnostic guides and **18 precise Strategy Lab command reference pages**. The latter are derived from Strategy Lab's COMMAND_REFERENCE at the official v1.3.5 tag and include parameters and code examples. They document syntax, not a claim that every example has been replay-tested in TDS.

Run `npm run wiki:release-audit` on a network-enabled Node 22+ machine to download the latest stable official ZIP, check its GitHub SHA-256, and inspect the archive's expected file inventory, without executing binaries. The ZIP could not be transferred into the working environment for this change. Before publishing Windows screenshots or GIFs, inspect the actual package and capture the installed version on a real Windows/TDS session. Do not fabricate gameplay screenshots.

## Fast AI and bot retrieval

Preferred public, proxy-independent integration: read the compact JSON index at /wiki/api/v1/index.json (metadata only), choose relevant published guides by title/keywords, and fetch individual /wiki/api/v1/docs/{slug}.md files. /wiki/llms.txt is a short curated guide map. The old /wiki/api/v1/articles.json remains available for bulk exports.

The Node API at /api/wiki/v1 provides ranked search excerpts, pagination (page or offset, with next/previous links), short citation-ready context and Markdown responses. Production edge/nginx forwarding still has to be verified and activated before advertising this dynamic API as live. See wiki/api/DEPLOYMENT.md.

After editing articles, run npm run wiki:build-retrieval and commit its generated outputs; npm run wiki:check-retrieval confirms they are in sync. The retrieval test checks that the 127 per-guide Markdown documents contain the same material as the published source guides and that unverified research topics are excluded. No LLM-generated answers are returned as documentation.
