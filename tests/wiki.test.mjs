import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { articles, categories } from '../wiki/content.mjs';

const read = path => readFile(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8');

test('wiki articles contain original instructions, useful sections, and real sources', () => {
  assert.ok(articles.length >= 30);
  assert.equal(new Set(articles.map(a => a.slug)).size, articles.length);
  assert.equal(new Set(categories).size, categories.length);
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.includes(article.category), article.slug);
    assert.ok(article.title.length >= 5 && article.summary.length >= 12, article.slug);
    assert.ok(article.source.startsWith('/') || article.source.startsWith('https://'), article.slug);
    assert.ok(article.sections.length > 0, article.slug);
    for (const section of article.sections) {
      assert.ok(section.title, article.slug);
      assert.ok([...(section.paragraphs || []), ...(section.steps || []), ...(section.checks || []), ...(section.rows || [])].length, article.slug + ': ' + section.title);
      for (const pair of section.rows || []) assert.equal(pair.length, 2, article.slug + ': ' + section.title);
    }
  }
});

test('every major setup workflow has a dedicated article', () => {
  const slugs = new Set(articles.map(a => a.slug));
  for (const slug of [
    'install', 'requirements', 'first-run', 'windows-display', 'roblox-settings', 'tds-settings',
    'hotkeys', 'record-strategy', 'edit-strategy', 'strategy-rotation', 'session-settings',
    'party-vip', 'launch-fails', 'wrong-clicks', 'ocr-errors', 'upgrade-not-working',
    'abilities-not-working', 'legacy-mode', 'stuck-between-matches', 'discord-webhooks',
    'report-issue', 'slow-inputs', 'record-abilities', 'timescale-tickets'
  ]) assert.ok(slugs.has(slug), slug);
});

test('wiki uses homepage brand language and real Ultimate Macro media', async () => {
  const html = await read('wiki/index.html');
  const app = await read('wiki/app.mjs');
  const css = await read('wiki/site.css');
  assert.match(html, /class="wiki-header"/);
  assert.match(html, /class="mobile-nav-button"/);
  assert.match(html, /id="search-overlay"/);
  assert.match(html, /id="helper-panel"/);
  assert.match(html, /<strong>Wiki helper<\/strong><small>Find matching articles<\/small>/);
  assert.match(app, /Your guide to /);
  assert.match(app, /assets\/ui\/ultimate-macro-main-new\.png/);
  assert.match(app, /function search\(/);
  assert.match(app, /function articleView\(/);
  assert.match(app, /function categoryView\(/);
  assert.match(css, /--navy:#07111f/);
  assert.match(css, /font:400 clamp\(43px,4\.5vw,68px\).*Georgia/);
  assert.match(css, /\.mobile-nav-button\{display:none.*border:0;background:transparent/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(app + html, /Quick setup reference|Quick fixes|DOCUMENTATION|WIKI \/ TOPIC|AI answers coming later/);
  new vm.Script(app.replace(/^import[^\n]*\n/, ''));
});

test('all wiki links stay routed and the existing website can serve modules', async () => {
  const app = await read('wiki/app.mjs');
  assert.match(app, /function articleURL\(/);
  assert.match(app, /function categoryURL\(/);
  assert.match(app, /sidebar-close/);
  assert.match(await read('server.mjs'), /'\.mjs': 'text\/javascript; charset=utf-8'/);
  assert.match(await read('index.html'), /href="wiki\/">Wiki/);
  assert.match(await read('sitemap.xml'), /https:\/\/ultmacro\.xyz\/wiki\//);
});


test('wiki reading surfaces use a dark navy theme throughout', async () => {
  const css = await read('wiki/site.css');
  const html = await read('wiki/index.html');
  const theme = css.slice(css.indexOf('/* Wiki dark reading theme.'));
  assert.ok(theme.startsWith('/* Wiki dark reading theme.'));
  assert.match(theme, /--paper:#081625/);
  assert.match(theme, /\.sidebar\{background:#0a1b2e/);
  assert.match(theme, /\.home-lane\{background:#11263d/);
  assert.match(theme, /\.topic-link\{background:#10243a/);
  assert.match(theme, /\.article-header h1\{color:#f3f7ff/);
  assert.match(theme, /\.setting-table\{background:#10253b/);
  assert.match(theme, /\.search-dialog\{background:#101f33/);
  assert.match(theme, /\.category-articles a\{background:#10263f/);
  assert.match(html, /content="#07111f"/);
});

test('500+ topic inventory is separate from published wiki docs', async () => {
  const plan = JSON.parse(await read('wiki/roadmap/topics.json'));
  const overview = await read('wiki/roadmap/PLAN.md');
  assert.equal(plan.existingPublishedArticles, articles.length);
  assert.equal(plan.totalPlanned, plan.topics.length);
  assert.ok(plan.totalPlanned > 500);
  assert.equal(new Set(plan.topics.map(t => t.slug)).size, plan.totalPlanned);
  assert.equal(new Set(plan.topics.map(t => t.id)).size, plan.totalPlanned);
  assert.equal(new Set(plan.topics.map(t => t.category)).size, 15);
  assert.ok(plan.topics.some(t => t.priority === 'P1'));
  assert.ok(plan.topics.some(t => t.priority === 'P3'));
  for (const topic of plan.topics) {
    assert.ok(topic.title && topic.slug && topic.validation && topic.visual);
    assert.equal(topic.status, 'planned-unverified');
    assert.ok(['P1', 'P2', 'P3'].includes(topic.priority));
  }
  assert.match(overview, /Never automatically publish these topics/);
  assert.match(overview, /Move to \*\*one file per article\*\*/);
});
