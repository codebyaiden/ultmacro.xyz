// Read-only, source-aware live Wiki API check. No credentials or infrastructure writes.
// On the VPS: node scripts/check-wiki-deployment.mjs --local=http://127.0.0.1:3000
import { pathToFileURL } from 'node:url';

const DEFAULT_PUBLIC = 'https://ultmacro.xyz';
const DEFAULT_ORIGIN = 'https://api-origin.ultmacro.xyz';

const CHECKS = [
  { id: 'api-page', path: '/wiki/api/', scope: 'static' },
  { id: 'index', path: '/wiki/api/v1/index.json', scope: 'static' },
  { id: 'llms', path: '/wiki/llms.txt', scope: 'static' },
  { id: 'markdown', path: '/wiki/api/v1/docs/install.md', scope: 'static' },
  { id: 'health', path: '/api/health', scope: 'dynamic' },
  { id: 'discovery', path: '/api/wiki/v1', scope: 'dynamic' },
  { id: 'search', path: '/api/wiki/v1/search?q=ocr&limit=2', scope: 'dynamic' },
  { id: 'context', path: '/api/wiki/v1/context?q=upgrade&limit=2', scope: 'dynamic' },
];

function validate(id, body) {
  if (id === 'api-page') return body.includes('Find the right guide.');
  if (id === 'llms') return body.startsWith('# Ultimate Macro Wiki');
  if (id === 'markdown') return body.startsWith('# Install Ultimate Macro') &&
    body.includes('Status: published');
  let data;
  try { data = JSON.parse(body); } catch { return false; }
  if (id === 'index') return Number.isInteger(data.total) && data.total > 0 &&
    Array.isArray(data.articles) && data.articles.length === data.total &&
    data.articles.every(article => article.slug && article.markdown && article.source);
  if (id === 'health') return data.ok === true && data.service === 'strategy-network';
  if (id === 'discovery') return data.name === 'Ultimate Macro Wiki API' &&
    Number.isInteger(data.totalPublished) && data.totalPublished > 0;
  if (id === 'search' || id === 'context') return Array.isArray(data.data) &&
    typeof data.total === 'number' && data.query?.length > 0;
  return false;
}

export async function probe(base, check, fetchImpl = fetch) {
  const address = new URL(check.path, base).toString();
  try {
    const response = await fetchImpl(address, {
      method: 'GET', redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { accept: check.id === 'api-page' ? 'text/html' : '*/*' },
    });
    if (!response.ok) return { id: check.id, status: response.status, ok: false };
    const body = await response.text();
    const ok = validate(check.id,body);
    return { id: check.id, status: response.status, ok,
      ...(ok ? {} : { problem: 'Unexpected response shape' }) };
  } catch (error) {
    return { id: check.id, status: null, ok: false,
      problem: error.name === 'TimeoutError' ? 'Timeout' : 'Request failed: ' + error.name };
  }
}

const good = (results, id) => Boolean(results?.find(x => x.id === id && x.ok));
const failed404 = (results, id) => results?.find(x => x.id === id)?.status === 404;
const WIKI = ['discovery','search','context'];
const allWikiGood = results => WIKI.every(id => good(results,id));
const allWiki404 = results => WIKI.every(id => failed404(results,id));

export function diagnose({ publicResults, originResults, localResults }) {
  if (allWikiGood(publicResults) && allWikiGood(originResults))
    return 'PASS: the public and origin Wiki APIs are reachable. Confirm application flows and cache behavior.';
  if (localResults && allWikiGood(localResults) && !allWikiGood(originResults))
    return 'LOCAL NODE WORKS, ORIGIN FAILS: inspect the api-origin nginx/edge rules for /api/wiki/v1. Preserve other /api routes.';
  if (localResults && !good(localResults,'health'))
    return 'LOCAL SERVICE UNHEALTHY: the local Node health check failed. Inspect systemd status, port, service logs and connectivity before attributing the Wiki failure to code or a proxy.';
  if (localResults && !allWikiGood(localResults))
    return 'LOCAL NODE WIKI ROUTES FAIL: local health responds but Wiki routes do not. Compare the deployed code revision, systemd WorkingDirectory/ExecStart, Node logs and exact local Wiki HTTP status before restarting anything.';
  if (allWikiGood(publicResults) && !allWikiGood(originResults))
    return 'PUBLIC WORKS, ORIGIN FAILS: these hosts may point at different upstream services. Verify both upstream targets before changing proxy rules.';
  if (allWikiGood(originResults) && !allWikiGood(publicResults))
    return 'ORIGIN WORKS, PUBLIC FAILS: inspect ultmacro.xyz edge/nginx forwarding for /api/wiki/v1; do not modify unrelated API paths.';
  if (allWiki404(publicResults) && allWiki404(originResults))
    return 'BOTH HOSTS RETURN 404: run this check on the VPS with --local=http://127.0.0.1:3000 to distinguish stale Node code from origin proxy rules. Do not add a blind redirect.';
  if (good(publicResults,'health') && good(originResults,'health'))
    return 'EXISTING NODE API IS HEALTHY, WIKI IS NOT: compare local Node, origin and public Wiki results; examine routing and service revision before any restart.';
  return 'INCONCLUSIVE: inspect per-endpoint status/response shape and check the website Node service and edge routing independently.';
}

export async function runAudit({
  publicBase = DEFAULT_PUBLIC,
  originBase = DEFAULT_ORIGIN,
  localBase = null,
  fetchImpl = fetch,
} = {}) {
  const staticChecks = CHECKS.filter(x => x.scope === 'static');
  const dynamicChecks = CHECKS.filter(x => x.scope === 'dynamic');
  const [publicResults, originResults, localResults] = await Promise.all([
    Promise.all(CHECKS.map(x=>probe(publicBase,x,fetchImpl))),
    Promise.all(dynamicChecks.map(x=>probe(originBase,x,fetchImpl))),
    localBase ? Promise.all(dynamicChecks.map(x=>probe(localBase,x,fetchImpl))) : Promise.resolve(null),
  ]);
  return {
    publicResults,originResults,localResults,
    staticReady: staticChecks.every(x=>good(publicResults,x.id)),
    dynamicReady: allWikiGood(publicResults),
    diagnosis: diagnose({publicResults,originResults,localResults}),
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const localArg = process.argv.slice(2).find(arg=>arg.startsWith('--local='));
  const localBase = localArg ? localArg.slice('--local='.length) : null;
  if (process.argv.slice(2).some(arg=>arg!==localArg && arg!=='--json')) {
    console.error('Usage: node scripts/check-wiki-deployment.mjs [--local=http://127.0.0.1:3000] [--json]');
    process.exitCode = 2;
  } else {
    const report = await runAudit({localBase});
    if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
    else {
      for (const [host,results] of [['public',report.publicResults],
        ['origin',report.originResults],['local',report.localResults]]) {
        if (!results) continue;
        for (const r of results) console.log(host.padEnd(6),
          (r.ok ? 'PASS' : 'FAIL').padEnd(4),r.id.padEnd(10),
          r.status ?? '-',r.problem ?? '');
      }
      console.log('\n'+report.diagnosis);
    }
    if (!report.staticReady || !report.dynamicReady) process.exitCode = 1;
  }
}
