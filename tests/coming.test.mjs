import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('homepage previews three meaningful upcoming features without a fake mockup', async () => {
  const home = await read('index.html');
  const css = await read('styles/coming.css');
  const js = await read('src/coming.js');
  assert.match(home, /id="coming"/);
  assert.match(home, /href="coming\/"/);
  assert.match(home, /Coming<\/a>/);
  assert.match(home, /id="coming-spotlight-title"/);
  assert.match(home, /id="coming-spotlight-description"/);
  assert.equal((home.match(/data-coming-spotlight(?=\s)/g) || []).length, 3);
  assert.match(home, /Ultimate Cloud/);
  assert.match(home, /Smarter runs/);
  assert.match(home, /Remote control/);
  assert.match(home, /macOS &amp; more games/);
  assert.match(css, /coming-preview-inner/);
  assert.match(css, /coming-spotlight-switches/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  new vm.Script(js);
  assert.match(js, /aria-pressed/);
  assert.match(js, /reduced\.matches/);
});

test('full roadmap lists all ten requested directions with no false release dates', async () => {
  const page = await read('coming/index.html');
  const terms = [
    'Ultimate Cloud', 'Account system', 'Smart recording', 'AI-powered goals',
    'phone', 'watch', 'MCP', 'Automations',
    'Automatic updates', 'More languages', 'macOS support', 'Bee Swarm Simulator',
    'Murder Mystery 2'
  ];
  for (const term of terms) assert.ok(page.toLowerCase().includes(term.toLowerCase()), term);
  assert.match(page, /No release dates are confirmed/);
  assert.match(page, /neither is supported|Neither is supported/);
  assert.match(page, /current Windows and AutoHotkey implementation/);
  assert.match(page, /\/styles\/coming\.css\?v=1/);
  assert.match(page, /href="https:\/\/discord\.gg\/ultmacro"/);
  assert.match(page, /href="https:\/\/ultmacro\.xyz\/coming\/"/);
  assert.match(page, /src="\/src\/advertising\.js\?v=adcash-selfhost-20261021"/);
  assert.doesNotMatch(page, /\b\d{1,3}% complete\b|launching on|coming this week|guaranteed release/i);
});

test('roadmap does not leave duplicate or stale promises on features page', async () => {
  const page = await read('features/index.html');
  const siteMap = await read('sitemap.xml');
  assert.doesNotMatch(page, /class="future-section"/);
  assert.match(page, /href="\.\.\/coming\/"/);
  assert.match(siteMap, /https:\/\/ultmacro\.xyz\/coming\//);
});
