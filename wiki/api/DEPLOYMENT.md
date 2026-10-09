# Wiki API: deployment and operational checks

## What works without proxy changes

The following files are static and require no dynamic API handler:

- https://ultmacro.xyz/wiki/api/v1/index.json — compact metadata for published guides.
- https://ultmacro.xyz/wiki/api/v1/docs/install.md — individual source-backed Markdown guide.
- https://ultmacro.xyz/wiki/llms.txt — short curated map for AI readers.
- https://ultmacro.xyz/wiki/api/v1/articles.json — backwards-compatible complete export.
- https://ultmacro.xyz/wiki/api/ — human-friendly search and paginated results.

Run the scripts npm run wiki:build-retrieval after editing published guides and npm run wiki:check-retrieval before deploying. Commit generated assets.

## Dynamic search still requires production routing

The Node service implements /api/wiki/v1/* in server.mjs. The public route previously returned 404 even though the Node handler existed. **A source merge cannot itself guarantee that production proxy forwarding is active.**

An infrastructure maintainer should verify public requests to /api/wiki/v1/ are forwarded to the website Node service, not treated as missing static files. Conceptual nginx example (check location precedence, actual upstream and external edge first):

    location ^~ /api/wiki/v1 {
      proxy_pass http://127.0.0.1:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

Do not paste this unreviewed into production. External routing may require separate configuration, and production Node may run elsewhere. Preserve existing API, accounts and poll routes.

## Live smoke test checklist

1. GET /api/wiki/v1 returns discovery metadata and published count.
2. GET /api/wiki/v1/search?q=ocr&limit=3&page=1 returns ranked guide links, snippets and pagination.
3. GET /api/wiki/v1/context?q=wrong%20upgrade&limit=2 returns a maximum of two short sourced excerpts, not generated answers.
4. GET /api/wiki/v1/articles/install?format=md returns a guide as text/markdown.
5. GET /api/wiki/v1/articles?limit=10&page=2 returns paged summaries.
6. POST /api/wiki/v1/search returns 405; OPTIONS returns 204 with CORS.
7. Static index.json and docs/install.md remain accessible if dynamic routing is unavailable.

## Diagnosis

- Public static files 200, public dynamic path 404: inspect edge and nginx forwarding.
- Local Node handler 200, external handler 404: the problem is routing, not search ranking.
- Dynamic API 500: inspect sanitized Node service logs.
- Static index stale: regenerate and commit the outputs before deployment.
- Old browser data: check cache TTL, CDN propagation and ETag.

## Integration guidance

**When dynamic routing is live:** request /api/wiki/v1/search?q=...&limit=3, optionally read /api/wiki/v1/articles/{slug}?format=md. For brief answer context, request /api/wiki/v1/context?q=... .

**Without dynamic routing:** cache the small static index.json, search its metadata locally and fetch only the relevant /docs/{slug}.md files. Do not download the full articles.json per user question.

All answer generators should retain the published guide source, URL and applicable version. The 778 unverified research candidates remain excluded.
