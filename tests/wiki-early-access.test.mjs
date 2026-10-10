import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { articles } from '../wiki/content.mjs';
import { searchWiki } from '../wiki/retrieval.mjs';
import { createWikiAskEngine } from '../wiki/ask.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const slug = 'how-to-get-early-access';

test('Early Access guide covers real membership benefits and conditional alternatives', () => {
  const article = articles.find(entry => entry.slug === slug);
  assert.ok(article, 'published article must exist');
  assert.equal(article.category, 'Community');
  assert.equal(article.source, '/early-access/');
  assert.equal(article.version, 'v1.3.x');
  assert.equal(article.sections.length, 4);
  const text = JSON.stringify(article);
  for (const phrase of ['$1.99', 'Ko-fi', 'Discord', 'green Early Access', 'giveaway', '14 days', 'cancelled']) {
    assert.ok(text.includes(phrase), phrase);
  }
  assert.match(text, /not guaranteed/);
  assert.match(text, /event announcement determines/);
});

test('published indexes and Markdown include the complete new Early Access guide', async () => {
  const staticIndex = JSON.parse(await read('wiki/api/v1/index.json'));
  const bulk = JSON.parse(await read('wiki/api/v1/articles.json'));
  const roadmap = JSON.parse(await read('wiki/roadmap/topics.json'));
  const markdown = await read('wiki/api/v1/docs/' + slug + '.md');
  const llms = await read('wiki/llms.txt');
  assert.equal(staticIndex.total, articles.length);
  assert.equal(roadmap.existingPublishedArticles, articles.length);
  assert.equal(bulk.articles.length, articles.length);
  assert.equal(staticIndex.articles.find(a => a.slug === slug)?.markdown,
    'https://ultmacro.xyz/wiki/api/v1/docs/how-to-get-early-access.md');
  assert.equal(bulk.articles.find(a => a.slug === slug)?.sections.length, 4);
  assert.match(markdown, /^# How to get Early Access/m);
  assert.match(markdown, /Ko-fi/);
  assert.match(markdown, /Giveaways and other opportunities/);
  assert.match(llms, /How to get Early Access/);
});

test('Wiki navigation, purchase link and crosslink make the guide discoverable', async () => {
  const app = await read('wiki/app.mjs');
  const early = await read('early-access/index.html');
  const index = await read('wiki/index.html');
  assert.match(app, /how-to-get-early-access/);
  assert.match(app, /https:\/\/ko-fi\.com\/summary\/9ed0c1ae/);
  assert.match(early, /wiki\/\?article=how-to-get-early-access/);
  assert.match(index, /app\.mjs\?v=13/);
  assert.equal(searchWiki(articles, 'get early access')[0].article.slug, slug);
});

test('source-backed Ask finds Early Access without inventing giveaway entitlements', async () => {
  const ask = createWikiAskEngine(articles).ask;
  for (const question of ['How do I get early access?', 'early access giveaway']) {
    const result = await ask({ question, version: 'v1.3.5' });
    assert.equal(result.status, 'answered', question);
    assert.equal(result.citations[0].slug, slug);
    assert.equal(result.ai_used, false);
  }
  const future = await ask({question:'How do I get early access?',version:'v1.4.0'});
  assert.equal(future.status, 'not_found', 'unverified future-version instructions should remain gated');
});
