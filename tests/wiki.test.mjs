import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { articles, categories } from '../wiki/content.mjs';

const relative = async path => readFile(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8');

test('wiki content has unique slugs and source-backed, useful sections', () => {
  assert.ok(articles.length >= 25);
  assert.equal(new Set(articles.map(article => article.slug)).size, articles.length);
  assert.ok(categories.length >= 5);
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.includes(article.category), article.slug);
    assert.ok(article.title.length >= 5 && article.summary.length >= 20, article.slug);
    assert.ok(article.source.startsWith('/') || article.source.startsWith('https://'), article.slug);
    assert.ok(article.sections.length, article.slug);
    for (const section of article.sections) assert.ok(section.title && (section.paragraphs.length || section.steps.length || section.checks.length), article.slug);
  }
});

test('critical setup and troubleshooting guides exist', () => {
  const slugs = new Set(articles.map(article => article.slug));
  for (const slug of ['install', 'requirements', 'first-run', 'windows-display', 'roblox-settings', 'tds-settings', 'record-strategy', 'wrong-clicks', 'launch-fails', 'ocr-errors', 'discord-community']) {
    assert.ok(slugs.has(slug), slug);
  }
});

test('wiki shell, client syntax, and assistant transparency', async () => {
  const html = await relative('wiki/index.html');
  const script = await relative('wiki/app.mjs');
  assert.match(html, /href="\.\/site\.css"/);
  assert.match(html, /type="module" src="\.\/app\.mjs"/);
  assert.match(html, /id="search-overlay"/);
  assert.match(html, /id="helper-panel"/);
  assert.match(html, /documentation search, not a generative AI assistant yet/i);
  assert.match(script, /function findArticles/);
  assert.match(script, /function navigateCategory/);
  new vm.Script(script.replace(/^import[^\n]*\n/, ''));
});

test('web server serves JS modules and the homepage/sitemap include wiki', async () => {
  assert.match(await relative('server.mjs'), /'\.mjs': 'text\/javascript; charset=utf-8'/);
  assert.match(await relative('index.html'), /href="wiki\/">Wiki/);
  assert.match(await relative('sitemap.xml'), /https:\/\/ultmacro\.xyz\/wiki\//);
});
