# Ultimate Macro Wiki

A static documentation website served at `/wiki/` using the existing website server.

## Design and copy rules

- Keep every heading and paragraph useful. Avoid duplicate warnings, generic marketing, or empty feature pages.
- Lead troubleshooting pages with the exact check or fix. Explain the reason only if it changes what the user should do.
- Match the Ultimate Macro visual system: deep navy, clear blue accents, Archivo headings and restrained corners.
- Use settings tables for pairs of values, ordered steps for procedures, and links for navigation. Do not draw controls that do not function.
- Cite the relevant guide or official resource for each article. Mark future-version material only when it has been checked.

## Content

`content.mjs` exports the six categories and article records. Each article has a unique slug, source URL, summary, optional keywords, and sections with paragraphs, steps, bullets, or setting rows. The browser renders the content as safe text, not unsanitized HTML.

Articles: `/wiki/?article=wrong-clicks`
Topics: `/wiki/?category=Troubleshooting`

The current material is based on the public v1.3.x setup guide and official project resources, not unverified v1.4 behavior.

## Assistant

The floating helper currently searches the articles and links to matching pages. It does not generate LLM answers. A future AI integration should use a secured server-side endpoint, source retrieval, rate limits and an unknown-answer fallback. Do not expose API credentials to the browser.

## Tests

Run `npm test` from the repository root. The wiki tests validate article integrity, key topics, client script syntax, and website integration. Browser QA on mobile and desktop remains required before deployment.
