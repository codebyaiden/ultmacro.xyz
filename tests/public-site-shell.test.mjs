import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const publicPages = [
  "guide/index.html",
  "guide/requirements/index.html",
  "guide/install/index.html",
  "guide/display/index.html",
  "guide/first-run/index.html",
  "guide/recording/index.html",
  "guide/sessions/index.html",
  "guide/discord/index.html",
  "guide/tools/index.html",
  "guide/troubleshooting/index.html",
  "guide/safety/index.html",
  "early-access/index.html",
  "strategies/index.html",
  "download/index.html",
  "download/v1.3.3/index.html",
  "download/v1.3.4/index.html",
  "download/v1.3.4a/index.html",
  "download/v1.3.4b/index.html",
  "download/v1.3.5/index.html",
  "download/v1.3.6/index.html",
  "wiki/index.html",
  "wiki/api/index.html",
  "interestcalculator/index.html"
];

test('every supported public content route loads the same site header and sky', async () => {
  for (const path of publicPages) {
    const html = await read(path);
    if (path.startsWith('download/')) {
      assert.match(html, /<header class="download-header">/, path);
      assert.match(html, /class="download-menu-toggle"/, path);
      assert.match(html, /<main\b/, path);
      continue;
    }
    assert.match(html, /\/styles\/unified-shell\.css\?v=\d+/, path);
    assert.match(html, /\/src\/unified-shell\.js\?v=[\w-]+/, path);
    assert.match(html, /<header\b/, 'fallback header missing: ' + path);
    assert.match(html, /<main\b/, 'content missing: ' + path);
    assert.equal((html.match(/\/src\/unified-shell\.js\?v=[\w-]+/g) || []).length, 1, path);
  }
});

test('shared public navigation is semantic, centered, keyboard accessible and preserves search', async () => {
  const js = await read('src/unified-shell.js');
  const css = await read('styles/unified-shell.css');
  new vm.Script(js);
  assert.match(js, /document\.querySelector\('body > header'\)/);
  assert.match(js, /const destinations = \[/);
  for (const value of ['/features/','/wiki/','/early-access/','/about/','/dashboard/','/download/']) {
    assert.ok(js.includes(value), value);
  }
  assert.match(js, /document\.getElementById\('search-trigger'\)\?\.click\(\)/);
  assert.match(js, /mobile\.inert = !open/);
  assert.match(js, /if\(e\.key==='Escape'\)/);
  assert.match(js, /if\(e\.key!=='Tab'\)return/);
  assert.match(js, /legacyHeader/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/);
  assert.match(css, /\.um-site-header/);
  assert.match(css, /\.um-atmosphere/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /body\.um-unified-page > header:not\(\.um-site-header\)/);
});

test('guide detail routes show their own article and active section', async () => {
  const pages = {
    requirements:'Requirements', install:'Install', display:'Display settings', 'first-run':'Your first run',
    recording:'Recording a strategy', sessions:'Longer sessions', discord:'Discord &amp; profiles', tools:'Tools',
    troubleshooting:'Troubleshooting', safety:'Safety &amp; licence'
  };
  for (const [section, title] of Object.entries(pages)) {
    const html = await read('guide/' + section + '/index.html');
    assert.match(html, new RegExp(`<title>${title} — Ultimate Macro Guide<\\/title>`));
    assert.match(html, new RegExp(`<h1>${title}<\\/h1>`));
    assert.match(html, new RegExp(`href="\\.\\./${section}/" aria-current="page"`));
    assert.doesNotMatch(html, /data-guide-section="/);
  }
});

test('special-purpose workflows keep their own product-specific chrome', async () => {
  // Poll pages now load the shared header (shared-header rollout); they still keep their own poll scripts and styles.
  for (const path of ['poll/index.html','poll/team/index.html']) {
    const html = await read(path);
    assert.match(html, /\/src\/unified-shell\.js\?v=[\w-]+/, path);
  }
  const main = await read('index.html');
  assert.match(main, /href="styles\/homepage\.css\?v=1"/);
  assert.match(main, /src="src\/homepage\.js\?v=\d+"/);
  assert.doesNotMatch(main, /hero-moon|hero-wave|site\.js\?v=6/);
});
