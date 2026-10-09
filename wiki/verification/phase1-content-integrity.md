# Phase 1 Wiki content-integrity audit

Date: 2026-10-08 (America/Bogota)
Scope: published Wiki content and the separate research-topic catalog, not a Windows/TDS runtime audit.

## Inventory and findings

- Inspected the full 127-article JSON export and all 778 planned topics, plus the resolver and source modules.
- 127 published guides; 293 sections after these edits. All 127 source articles still match the public JSON snapshot by slug, title, metadata and sections.
- Median instructional length is roughly 65 words. 23 guides contain fewer than 50 words and 106 contain fewer than 100. Length alone does not prove a guide is inadequate, but short procedural pages need special review.
- Before this change, the resolver could show irrelevant excerpts for exact-looking questions, including recording a tower placement, Roblox camera settings, skipped upgrades and reinstalling without losing strategies.
- After the change: 549 research-topic pages show related published excerpts, 216 explicitly say the exact topic is unverified (with contextual related reading when available), and 13 are gated on a later release.
- Unverified first-priority (P1) topics remaining: 18. Notable gaps include missing strategy lists, reconnect failures, placement confirmation, insufficient cash and profile-import overwrite scope. Do not improvise fixes for these without source or runtime evidence.

## Changes made

1. Expanded four published guides: in-game TDS settings, profile backups and safe reinstall, profile export scope, and upgrade-failure diagnosis.
2. Added targeted routing for recordings, Roblox settings, upgrades, profiles and backup/reinstall topics before broad fallback rules.
3. Prevented zero-overlap and low-confidence data-loss-related excerpts from being presented as instructions. These still offer clearly labeled related reading.
4. Kept 778 research candidates separate from published documentation and left the API/visual architecture unchanged.
5. Kept the JSON snapshot aligned with source articles and bumped JavaScript module URLs to avoid stale browser caches.
6. Corrected the outdated 90-guide count in the planning document.

## Validation

- Executed 20 Wiki and release-documentation test cases from the repository in an isolated JavaScript V8 runner with mocked Node file-reading and vm primitives: 20 passed, 0 failed, more than 10,000 assertions.
- Executed `resolveTopicGuidance` against all 778 topics with the real published content and source catalog.
- Verified public JSON content parity for all 127 articles and compiled browser app/test JavaScript syntax in the isolated runner.
- The full repository `npm test` was not executed in Node because an authenticated local checkout was not available in this environment.
- No real Windows, Roblox/TDS, release ZIP execution, screenshot/GIF, or end-to-end browser tests were performed. Do not interpret this audit as proof that every guide or candidate is runtime-correct.

## Next editorial batch

1. Verify the 18 currently unverified P1 subjects against tagged source and real support reports; prioritize data loss, failed sessions and first-run blockers.
2. Recheck short procedural guides for prerequisites, exact steps, expected outcome and recovery path; merge duplicates rather than inflate article count.
3. Test the highest-traffic installation, profile import and upgrade procedures on the corresponding Windows release before marking them fully runtime-verified.
4. Use actual anonymized issue/log evidence to fill research-topic gaps. Avoid creating a new framework, speculative AI helper or hundreds of filler articles.
