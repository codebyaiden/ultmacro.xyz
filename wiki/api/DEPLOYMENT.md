# Wiki API: deployment and operational checks

## Verified live state (October 9, 2026)

Direct public checks confirmed:

- https://ultmacro.xyz/wiki/api/ — new API page served.
- https://ultmacro.xyz/wiki/api/v1/index.json — 127 published guide metadata records served.
- https://ultmacro.xyz/wiki/llms.txt — accessible.
- https://ultmacro.xyz/wiki/api/v1/docs/install.md — accessible source-linked Markdown.
- https://ultmacro.xyz/api/health and /api/strategies — working existing Node APIs.
- https://api-origin.ultmacro.xyz/api/health and /api/strategies — also working.
- /api/wiki/v1, /api/wiki/v1/search, /api/wiki/v1/context — 404 on both public and api-origin domains.

**Not yet established:** whether local 127.0.0.1:3000 already implements the new Wiki API. The first safe check must be on the VPS, not a guessed redirect.

Run this from the deployed website checkout using the Node process already installed:

    npm run wiki:deployment-check -- --local=http://127.0.0.1:3000
    npm run wiki:deployment-check -- --local=http://127.0.0.1:3000 --json

The command is read-only and checks static files, existing health, origin, public and local Wiki endpoints. It exits nonzero while the public Wiki API is incomplete.

If local Wiki returns 200 but api-origin 404, inspect the **api-origin nginx/edge route**, not application logic. If local returns 404, first inspect which commit and working directory systemd actually runs; an old Node server may not include the Wiki dispatcher even while the separate static website serves the latest published docs.

Read-only investigation commands (do not paste tokens or full private environment output into a ticket):

    sudo systemctl show ultmacro-strategy-network.service -p WorkingDirectory -p ExecStart
    sudo systemctl status ultmacro-strategy-network.service --no-pager
    cd /opt/ultmacro/website && git rev-parse --short HEAD
    curl -si http://127.0.0.1:3000/api/wiki/v1
    curl -si 'http://127.0.0.1:3000/api/wiki/v1/search?q=ocr'
    curl -si 'https://api-origin.ultmacro.xyz/api/wiki/v1/search?q=ocr'
    curl -si 'https://ultmacro.xyz/api/wiki/v1/search?q=ocr'

**Only after determining the failing layer:**

1. Old or missing Node code: deploy the tested website revision to the actual systemd working directory and restart only the `ultmacro-strategy-network.service` after confirming no unrelated changes.
2. Local good / origin bad: add or correct a **scoped** origin proxy location matching /api/wiki/v1 and /api/wiki/v1/*, preserving path and using the existing healthy /api/strategies upstream and headers. Validate nginx syntax before a reload; don't change accounts, poll or admin routes.
3. Origin good / public bad: inspect the public edge rule for just /api/wiki/v1 and forward it to the verified working origin; do not replace an API-wide rule based on one endpoint.

Run the smoke command again, then confirm search pagination, context citations, JSON/Markdown formats and CORS from the public URL. No deploy or systemd/nginx mutation is performed by this PR.

---

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

## Wiki Ask activation (after the original 404 issue is resolved)

After activating /api/wiki/v1 at the website Node service, also verify the POST route with a short JSON question, expected excerpt, article link and source version:

    curl -si -X POST 'https://ultmacro.xyz/api/wiki/v1/ask' \
      -H 'Content-Type: application/json' \
      --data '{"question":"Why won'\''t my towers upgrade?"}'

Expected: HTTP 200, JSON status "answered", answer_type "extractive" and source slug "upgrade-not-working". An unrelated question should return status "not_found" without an invented answer. GET /api/wiki/v1/ask must return 405. The origin or edge must forward POST, OPTIONS and the Content-Type header without exposing unrelated routes.

Do not enable optional paid AI synthesis until source-only mode passes, operational rate limits exist, and spending limits have been reviewed. See [ASK.md](./ASK.md) for scope, risks and examples. The live deployment diagnostic above is independent of the Ask feature.
