import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { integrations, staticFallbackCode } from '../wiki/api/examples.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const disk = path => fileURLToPath(new URL('../wiki/api/' + path, import.meta.url));

test('Wiki API developer page prioritizes direct Ask and platform setup', async () => {
  const html = await read('wiki/api/index.html');
  assert.match(html, /<h1 id="title">Give your bot/);
  assert.match(html, /POST<\/span><code>\/api\/wiki\/v1\/ask/);
  assert.match(html, /id="platform-tabs"[^>]*role="tablist"|role="tablist"[^>]*id="platform-tabs"/);
  assert.match(html, /role="tabpanel" aria-labelledby="tab-javascript"/);
  assert.match(html, /id="copy-code"/);
  assert.match(html, /id="platform-steps"/);
  assert.match(html, /id="api-status"/);
  assert.match(html, /id="fallback-code"/);
  assert.match(html, /role="search"/);
  assert.match(html, /class="mobile-index"/);
  assert.match(html, /site\.css\?v=2/);
  assert.match(html, /app\.mjs\?v=2/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/);
  const sections = ['overview','quickstart','integrations','response','fallback','search-guides','resources'];
  for (const id of sections) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(html, new RegExp('href="#' + id + '"'));
  }
});

test('each menu item has real setup instructions and a source-backed HTTP example', async () => {
  const html = await read('wiki/api/index.html');
  const ids = integrations.map(item => item.id);
  assert.deepEqual(ids, ['javascript','python','discord','agents','curl']);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of integrations) {
    assert.match(html, new RegExp('data-platform="' + item.id + '"'));
    assert.match(item.code, /\/api\/wiki\/v1\/ask|askWiki|ask_wiki|handleWikiCommand|callWikiAskTool/);
    assert.ok(item.steps.length >= 3);
    assert.ok(item.install.length >= 12);
    assert.ok(item.code.length > 70);
    for (const key of ['source', 'extraSource']) if (item[key]) await access(disk(item[key]));
  }
  assert.match(integrations[0].code, /async function askWiki\(/);
  assert.match(integrations[0].code, /method: 'POST'/);
  assert.match(integrations[0].code, /result\.status === 'answered'/);
  assert.match(integrations[1].code, /def ask_wiki\(/);
  assert.match(integrations[1].code, /User-Agent.*UltimateMacroWiki/);
  assert.match(integrations[1].code, /result\["status"\] == "answered"/);
  assert.match(integrations[2].code, /handleWikiCommand/);
  assert.match(integrations[2].code, /SlashCommandBuilder/);
  assert.match(integrations[2].code, /Routes\.applicationCommands/);
  assert.match(integrations[2].code, /await rest\.post\(/);
  assert.doesNotMatch(integrations[2].code, /await rest\.put\(/);
  assert.match(integrations[2].code, /process\.env\.DISCORD_BOT_TOKEN/);
  assert.match(integrations[3].code, /wikiAskTool, callWikiAskTool/);
  assert.match(integrations[4].code, /curl -sS -X POST/);
});

test('Python example identifies itself to public edge protections', async () => {
  const python = await read('wiki/examples/ask.py');
  assert.match(python, /User-Agent.*UltimateMacroWiki/);
});

test('developer docs show the live Ask API and retain the static fallback', async () => {
  const html = await read('wiki/api/index.html');
  const js = await read('wiki/api/app.mjs');
  const ask = await read('wiki/api/ASK.md');
  const css = await read('wiki/api/site.css');
  assert.match(js, /data\.endpoints\?\.ask !== '\/api\/wiki\/v1\/ask'/);
  assert.match(js, /title\.textContent = 'Ask API available'/);
  assert.match(js, /static index and Markdown documents below are available/);
  assert.match(html, /The source-backed Ask API is live/);
  assert.doesNotMatch(html, /cannot return answers publicly until the dynamic API is deployed/);
  assert.match(ask, /\*\*Status: live/);
  assert.doesNotMatch(ask, /not publicly live until/);
  assert.match(js, /setPlatform\(/);
  assert.match(js, /ArrowRight/);
  assert.match(js, /ArrowLeft/);
  assert.match(js, /navigator\.clipboard\.writeText/);
  assert.match(js, /pageSize = 6/);
  assert.match(js, /history\.replaceState/);
  assert.match(staticFallbackCode, /\/wiki\/api\/v1\/index\.json/);
  assert.match(staticFallbackCode, /guide\.markdown/);
  assert.doesNotMatch(staticFallbackCode, /\/api\/wiki\/v1\/ask/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.platform-tabs/);
  assert.match(css, /\.mobile-index/);
});
