# Ultimate Macro Wiki

The wiki is served statically at /wiki/ without an additional framework or database.

## Files
- content.mjs: reviewed source-backed articles.
- index.html: accessible page shell and floating helper.
- site.css: responsive documentation design.
- app.mjs: navigation, article categories, full-text search, and helper.

## Links
Articles: /wiki/?article=install
Topics: /wiki/?category=Getting%20started
Stable deep links work without additional rewrite rules on existing hosts.

## Content maintenance
Add articles to the array in content.mjs. Use unique slugs, a supported category, an informative summary, nonempty sections, and the original source. Verify real behavior and fixes before publishing. Public v1.3.x is the initial documentation baseline.

## Assistant status
The floating helper currently searches the published wiki. It is not a generative AI assistant. Never put AI API keys in browser scripts. A future AI service needs server-side secrets, rate limiting, article retrieval, source citations, and an honest unknown-answer fallback.

## Tests
Run npm test at the repository root. tests/wiki.test.mjs checks content quality, essential topics, front-end syntax, and route integration.
