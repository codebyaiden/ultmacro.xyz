import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { articles, categories } from '../wiki/content.mjs';

const read = path => readFile(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8');

test('every wiki article has unique navigation, nonempty instructions and a source', () => {
  assert.ok(articles.length >= 25);
  assert.equal(new Set(articles.map(a => a.slug)).size, articles.length);
  assert.equal(new Set(categories).size, categories.length);
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.includes(article.category), article.slug);
    assert.ok(article.title.length >= 5, article.slug);
    assert.ok(article.summary.length >= 16, article.slug);
    assert.ok(article.source.startsWith('/') || article.source.startsWith('https://'), article.slug);
    assert.ok(article.sections.length > 0, article.slug);
    for (const section of article.sections) {
      assert.ok(section.title, article.slug);
      assert.ok([...(section.paragraphs || []), ...(section.steps || []), ...(section.checks || []), ...(section.rows || [])].length, article.slug + ': ' + section.title);
      for (const pair of section.rows || []) assert.equal(pair.length, 2, article.slug + ': ' + section.title);
    }
  }
});

test('every advertised setup and troubleshooting topic has an article', () => {
  const slugs = new Set(articles.map(a => a.slug));
  for (const slug of [
    'install','requirements','first-run','windows-display','roblox-settings','tds-settings',
    'hotkeys','record-strategy','edit-strategy','strategy-rotation','session-settings',
    'party-vip','launch-fails','wrong-clicks','ocr-errors','upgrade-not-working',
    'abilities-not-working','legacy-mode','stuck-between-matches','discord-webhooks','report-issue'
  ]) assert.ok(slugs.has(slug), slug);
  for (const old of ['download-safely','safe-stop','goals','timescale','potato-mode','auto-configure']) {
    assert.ok(!slugs.has(old), 'redundant page remains: ' + old);
  }
});

test('wiki UI uses real controls, native links and transparent helper description', async () => {
  const html = await read('wiki/index.html');
  const app = await read('wiki/app.mjs');
  const css = await read('wiki/site.css');
  assert.match(html, /id="search-trigger"/);
  assert.match(html, /id="search-overlay"/);
  assert.match(html, /id="nav-toggle"/);
  assert.match(html, /id="helper-panel"/);
  assert.match(html, /Searches wiki articles\. AI responses are not enabled\./);
  assert.match(app, /function search\(/);
  assert.match(app, /function categoryView\(/);
  assert.match(app, /function articleView\(/);
  assert.match(app, /setting-table/);
  assert.match(html, /\.\.\/styles\/base\.css\?v=28/);
  assert.match(html, /class="site-head wiki-head"/);
  assert.match(html, /href="\.\.\/strategies\/">Strategy Network/);
  assert.match(css, /--bg:#0e0e10/);
  assert.match(css, /--acc:#3a86ff/);
  assert.match(css, /border-radius:15px/);
  assert.match(app, /Towers not placing/);
  assert.doesNotMatch(app, /Quick setup reference|Quick fixes|Find what you need|WIKI \/ TOPIC/);
  assert.doesNotMatch(html, /AI answers coming later|Guides based on public documentation/);
  assert.match(css, /prefers-reduced-motion/);
  new vm.Script(app.replace(/^import[^\n]*\n/, ''));
});

test('wiki remains linked from the site and the existing server serves modules', async () => {
  assert.match(await read('server.mjs'), /'\.mjs': 'text\/javascript; charset=utf-8'/);
  assert.match(await read('index.html'), /href="wiki\/">Wiki/);
  assert.match(await read('sitemap.xml'), /https:\/\/ultmacro\.xyz\/wiki\//);
});

test('source-backed help does not invent live AI capabilities', async () => {
  const html = await read('wiki/index.html');
  const app = await read('wiki/app.mjs');
  assert.match(html, /AI responses are not enabled/);
  assert.match(app, /function ask\(/);
  assert.match(app, /const relatedBySlug =/);
  assert.match(app, /AutoHotkey v2/);
  assert.match(app, /discord\.gg\/ultmacro/);
});
