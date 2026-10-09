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

The homepage routes visitors into setup, common problems and all topic categories. The floating helper is presently **wiki article search**, not an LLM.

## QA

Run \`npm test\`, then check keyboard search, sidebar drawer, article deep links, settings tables, support links, hero image and chat search. Review desktop and narrow-screen layouts in a real browser. All links and interactive surfaces must do what they say.

## Expansion backlog

The editorial plan lives in [`roadmap/PLAN.md`](./roadmap/PLAN.md), with 778 evidence-gated candidate topics in [`roadmap/topics.json`](./roadmap/topics.json). These are **not yet published documentation**. Add a topic only after verifying it, and merge redundant topics into stronger articles rather than generating hundreds of empty pages.
