import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('homepage links to the full roadmap and keeps roadmap styling available', async () => {
  const home = await read('index.html');
  const css = await read('styles/coming.css');
  assert.match(home, /href="\/coming\/"/);
  assert.match(home, /href="styles\/coming\.css\?v=2"/);
  assert.doesNotMatch(home, /<section class="coming-preview"|src\/coming\.js|data-coming-spotlight/);
  assert.match(css, /roadmap-item/);
  assert.match(css, /roadmap-icon-ai/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.ok(Buffer.byteLength(css, 'utf8') < 8000, 'keep roadmap styling small');
});

test('full roadmap still lists all ten user-proposed directions under MAJOR and USEFUL', async () => {
  const page = await read('coming/index.html');
  const features = [...page.matchAll(/data-roadmap-feature="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(features, ['ai', 'cloud', 'record', 'goals', 'remote', 'macos', 'games', 'updates', 'automation', 'language']);
  for (const term of [
    'ChatGPT', 'AI Assistant Integration', 'Ultimate Cloud', 'Accounts', 'Smart Recording',
    'AI-Powered Goals', 'phone', 'watch', 'macOS', 'Bee Swarm Simulator',
    'Murder Mystery 2', 'Automatic Updates', 'Automations', 'Multi-Language'
  ]) assert.ok(page.toLowerCase().includes(term.toLowerCase()), term);
  assert.match(page, /id="coming-major">MAJOR/);
  assert.match(page, /id="coming-useful">USEFUL/);
  assert.match(page, /Download and install updates directly inside Ultimate Macro/);
  assert.match(page, /within the limits you approve/);
  assert.match(page, /Details and priorities may change/);
  assert.match(page, /\/styles\/coming\.css\?v=2/);
  assert.match(page, /href="https:\/\/discord\.gg\/ultmacro"/);
  assert.match(page, /href="https:\/\/ultmacro\.xyz\/coming\/"/);
  assert.match(page, /src="\/src\/advertising\.js\?v=adcash-selfhost-20261021"/);
  const main = page.match(/<main class="roadmap-page-main">[\s\S]*?<\/main>/)?.[0];
  assert.ok(main, 'roadmap main content exists');
  assert.doesNotMatch(main, /<table|<button|coming-spotlight|coming-card|aria-pressed/);
  assert.doesNotMatch(page, /\b\d{1,3}% complete\b|launching on|coming this week|guaranteed release/i);
});

test('features page has no duplicate roadmap and the full page remains indexed', async () => {
  const page = await read('features/index.html');
  const sitemap = await read('sitemap.xml');
  assert.doesNotMatch(page, /class="future-section"/);
  assert.match(page, /href="(?:\.\.|)\/coming\/"/);
  assert.match(sitemap, /https:\/\/ultmacro\.xyz\/coming\//);
});
