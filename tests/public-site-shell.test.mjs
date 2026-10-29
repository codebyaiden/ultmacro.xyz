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
    assert.match(html, /\/styles\/unified-shell\.css\?v=2/, path);
    assert.match(html, /\/src\/unified-shell\.js\?v=logo-20261029/, path);
    assert.match(html, /<header\b/, 'fallback header missing: ' + path);
    assert.match(html, /<main\b/, 'content missing: ' + path);
    assert.equal((html.match(/\/src\/unified-shell\.js\?v=logo-20261029/g) || []).length, 1, path);
  }
});

test('shared public navigation is semantic, centered, keyboard accessible and preserves search', async () => {
  const js = await read('src/unified-shell.js');
  const css = await read('styles/unified-shell.css');
  new vm.Script(js);
  assert.match(js, /document\.querySelector\('body > header'\)/);
  assert.match(js, /const destinations = \[/);
  for (const value of ['/wiki/','/strategies/','/early-access/','/download/']) {
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

test('active guide routes get distinct browser titles without losing original documentation', async () => {
  for (const section of ['requirements','install','display','first-run','recording','sessions','discord','tools','troubleshooting','safety']) {
    const html = await read('guide/' + section + '/index.html');
    assert.doesNotMatch(html, /<title>Setup guide — Ultimate Macro<\/title>/);
    assert.match(html, /<h1>Setup guide<\/h1>/);
    assert.match(html, /data-guide-section="/);
  }
});

test('special-purpose workflows keep their own product-specific chrome', async () => {
  for (const path of ['poll/index.html','poll/team/index.html']) {
    const html = await read(path);
    assert.doesNotMatch(html, /unified-shell\.js/, path);
  }
  const main = await read('index.html');
  assert.match(main, /href="styles\/homepage\.css\?v=1"/);
  assert.match(main, /src="src\/homepage\.js\?v=1"/);
  assert.doesNotMatch(main, /hero-moon|hero-wave|site\.js\?v=6/);
});
