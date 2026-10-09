# Ultimate Macro Wiki: long-term documentation plan

This is a **planning inventory**, not 778 completed pages or evidence that all 778 problems exist. The currently written wiki has **127 source-linked published guides**. The `topics.json` file proposes **778 additional distinct topics**, each with a category, priority, content type, verification requirement and visual-evidence hint.

Never automatically publish these topics or generate 778 filler pages. One clear, verified page with screenshots is better than ten thin pages. If two planned topics need exactly the same answer, merge them into one article with clear headings and searchable aliases.

## Scope (778 candidates)

| Category | Planned |
|---|---:|
| Installation and first use | 50 |
| Windows, display and OCR | 49 |
| Roblox and TDS configuration | 52 |
| Macro interface and settings | 50 |
| Strategies and recording | 57 |
| Strategy Lab and editing | 45 |
| Playback, towers and combat | 50 |
| Sessions, goals and recovery | 54 |
| Troubleshooting: startup and environment | 69 |
| Troubleshooting: TDS runtime and OCR | 79 |
| Discord, reports and remote controls | 46 |
| Strategy Network and sharing | 46 |
| Profiles, exports and local files | 41 |
| Version changes, accounts and future releases | 45 |
| Community, support and maintenance | 45 |
| **Total planned** | **778** |

## Priority and execution

- **P1: 106 specific topics.** Divide into four review batches of about 25–27. First: reliable installation, Windows/TDS settings and first-match checks. Then tower placement/upgrades, cash/wave OCR, recording and editing, and Discord/Strategy Network.
- **P2: 580 topics.** Expand only where release functionality is present, users ask repeatedly, or source/log evidence justifies a standalone guide.
- **P3: 92 conditional topics.** Primarily version-specific, community-policy, migration or new-release behavior. Do not claim an unreleased 1.4 feature works.
- **Existing 127:** Keep maintained and link them rather than publishing duplicate variations.

Suggested sequence:

1. **Stabilize the existing 127** with real screens, verified instructions, and version applicability.
2. **Release first 25 P1 guides**: install, screen setup, OCR, Roblox and TDS settings, controls, first strategy.
3. **Expand troubleshooting and strategies** in the next ~25-article batches using tested symptoms and reproducible fixes.
4. **Build out integration and editing** with screenshots/GIFs of the actual app on Windows.
5. **Move into the hundreds only when evidence warrants it**. High-volume pages need scalable navigation, source checks and a maintainable content model.

## What each article must contain

**Technical procedure:** Exact version, prerequisites, named UI location, steps, expected result and at least one way to tell whether it worked.

**Troubleshooting:** One observable symptom, common causes *confirmed by evidence*, ordered fixes, a quick test, what logs to capture if unresolved, and links to closely related causes. Never invent a known issue from a candidate title.

**UI / setting reference:** Exact UI label and available values, recommendation with context, screenshot from the matching release, and known incompatibilities.

**Community or release note:** Official source, timestamp or release version as needed, and reviewer confirmation.

**Visual requirement:** Use real cropped screenshots, short GIFs, or annotated captures taken from the matching macro build, Windows settings, Roblox or TDS. Do not fabricate UI images. Remove private data before publishing; screenshots should communicate a click target or expected state, not decorate empty space.

## Evidence pipeline

1. Compare a user request, support report, existing docs, source files, and the exact release ZIP.
2. Mark the topic `in-research`; identify the relevant version.
3. Run a Windows test for UI/how-to topics, or reproduce the issue for fixes.
4. Capture before/after states and redact sensitive content.
5. Write the smallest correct article, link to its source and related guides.
6. Get developer/editor review before publishing. Mark uncertain work `draft`, not public.
7. Add search keywords, tags, accessible visuals, and update the wiki search index.
8. On a confirmed release change, revalidate affected docs; archive or mark old-version instructions.

## Architecture for hundreds of documents

The current 32-article `content.mjs` array is fine for the initial wiki but is **not** a good 500-page authoring system. Before adding 100+ pages:

- Move to **one file per article** with front matter: slug, section, aliases, relevant version, evidence link, author/reviewer, status, and last verified date.
- Use a build step to validate front matter, links, duplicate titles/aliases, version ranges and orphan pages.
- Generate a prebuilt search index and sitemap. Avoid loading hundreds of full articles into the browser at once.
- Keep the left sidebar **short**: top-level topics and a handful of relevant subtopics. Use category pages, filters and search for the rest.
- Give every article a stable URL; redirect old links when consolidating topics.
- Store reusable screenshots/GIFs under versioned folders and note the app version they depict.
- Eventually ground the floating AI assistant in **published verified pages only** and include citations; do not let raw speculative backlog entries become AI answers.

## Visual baseline

The wiki should match ultmacro.xyz's dark-blue personality **across the whole reading experience**, including navigation, article backgrounds, tables, search, and modals. Use deep navy surfaces, readable light text, precise blue accents, measured radius, purposeful screenshots, and no filler labels or decorative cards. Do not switch large documentation sections to a near-white theme without a user-directed theme setting.

## Tracking

The source of truth is [topics.json](./topics.json). All items start `planned-unverified`. Status is not a badge to make speculative content look published. A verified P1 topic can be implemented as a standalone article **or** as a focused section inside an existing article, provided search can still find it.

## Implemented topic catalog

All 778 candidate titles are now accessible in the wiki's **All wiki topics** index, with subject filters, priority filters, search, and a permalink. Their detail views link to related published articles when available. Research topics are **not** presented as confirmed fixes or ready-made documentation. The published-article count is separate. The index is backed by `wiki/catalog.mjs`, generated from `topics.json`.

## Related guidance on research-topic pages

The research index preserves all 778 titles, but their detail pages now show matching **source-linked excerpts of existing published instructions** when available, instead of only a generic related-article card. These excerpts are not independent validation of every title. Items whose exact behavior requires a v1.4 build are explicitly gated. More authoritative content must come from tested releases, reproducible issue reports and real Windows screenshots.

## Expanded v1.3.5 source references

Another **37 detailed guides** are available: 19 settings/updater/diagnostic topics and 18 Strategy Lab .strat command reference pages, with exact signatures, parameter tables and examples. The total is **127 source-linked articles**, still distinct from the 778 unverified research-topic candidates. The release ZIP itself was not transferred into the working environment, and the screenshots/GIFs require real Windows/TDS captures; there are no invented screen states.
