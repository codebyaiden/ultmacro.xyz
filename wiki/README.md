# Ultimate Macro Wiki

A static documentation site at `/wiki/` using the existing website server. No extra framework.

## Site design contract

The homepage and Strategy Network are the visual references. The wiki must belong to the same product, without copying the homepage's decorative hero into documentation.

- Use the existing site tokens and `styles/base.css` for the header, typefaces and blue accents.
- Use **purposeful** rounding on search, active navigation, article groups, inputs and the help bubble. Neither raw square tiles nor giant generic pills.
- Let typography and spacing create hierarchy. Avoid a border, icon, badge or card around every sentence.
- Show real Ultimate Macro information: TDS settings, F1/F2 shortcuts, .strat recording, exact error fixes. Do not invent gameplay screenshots, release dates, status data or features.
- Keep the homepage as task navigation, not a second marketing landing page. No generic taglines, meaningless metrics, decorative stat cards, repetitive CTAs or duplicated topic lists.
- Don't use gradient-glass blobs, neon/cyberpunk UI, fake dashboards or a symmetrical three-card SaaS template.
- Every visible control must have a useful outcome. Every related link must actually relate to the article.
- Match the site's visual personality while allowing documentation to be denser and more readable than the homepage.

## Editorial rules

- If a sentence could appear in the help center of any unrelated product, delete it or rewrite it with specific Ultimate Macro details.
- Troubleshooting should start with **the fix**, then clarify the cause where needed.
- Use actual in-app setting names and values. Prefer a table for settings, ordered steps for procedures and concise paragraphs for context.
- Avoid "the documentation says", "the public guide suggests", generic caution copy, and filler headings.
- Do not publish speculative bug explanations or unsupported v1.4 details.
- Give external resources as **real links**, not unclicable URLs in paragraph text.
- Every article should keep a source URL and should be reviewed after version-dependent changes. A source is shown unobtrusively, not as an oversized warning.

## Content and navigation

`content.mjs` exports category labels and articles. Each article needs a unique slug, source URL, factual summary, optional keywords, and sections with paragraphs, steps, bullets or setting rows. Article content is rendered as text rather than injected HTML.

Article URLs: `/wiki/?article=wrong-clicks`
Category URLs: `/wiki/?category=Troubleshooting`

The current material is based on official public v1.3.x documentation, not unreleased builds.

## Assistant

The floating widget is currently **article search**, not a generative AI. It shows links to documentation without pretending to diagnose a problem. A future AI backend needs server-only credentials, rate limits, source-grounded retrieval and honest unknown-answer handling.

## Quality gate

Run `npm test`, then check the homepage, a settings table, a troubleshooting article, category view, search dialog and helper on desktop and a narrow phone. Confirm real link targets, active navigation, dark-mode contrast, keyboard accessibility and no horizontal overflow.
