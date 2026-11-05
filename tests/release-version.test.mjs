import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = file => readFile(new URL(file, root), 'utf8');
const context = { window: {} };
vm.runInNewContext(await read('data/releases.js'), context);
const releases = JSON.parse(JSON.stringify(context.window.UM_RELEASES.releases));
const latest = require('../src/releases-data.js').pickLatestPublished(releases);
const chip = html => html.match(/<a\b[^>]*data-latest-release\b[^>]*>[\s\S]*?<\/a>/)?.[0];

test('published homepage announces the same stable version as downloads without JS', async () => {
  const html = await read('index.html');
  const link = chip(html);
  assert.ok(link, 'release link must be in the HTML, not injected by JavaScript');
  assert.ok(link.includes(`href="/download/${latest.tag}/"`));
  assert.ok(link.includes(`>${latest.tag}</b>`));
  assert.ok((await read('download/index.html')).includes(`>${latest.tag}</h1>`));
  assert.ok((await read('download/latest/index.html')).includes(`url=/download/${latest.tag}/`));
});

test('release sync updates homepage text and destination together and is idempotent', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'um-release-version-'));
  try {
    await cp(new URL('src/', root), path.join(dir, 'src'), { recursive: true });
    await cp(new URL('index.html', root), path.join(dir, 'index.html'));
    const generator = require(path.join(dir, 'src/version-page.cjs'));
    const future = { ...releases[0], tag: 'v9.0.0', published: '2030-01-01T00:00:00Z' };
    const beta = { ...future, tag: 'v10.0.0-beta', prerelease: true, published: '2031-01-01T00:00:00Z' };
    const result = await generator.writeVersionPages([beta, future, ...releases]);
    await generator.writeVersionChips(result.latest);
    const html = await readFile(path.join(dir, 'index.html'), 'utf8');
    assert.ok(chip(html)?.includes('href="/download/v9.0.0/"'));
    assert.ok(chip(html)?.includes('>v9.0.0</b>'));
    assert.ok(!chip(html).includes('beta'));
    assert.deepEqual(await generator.writeVersionChips(result.latest), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
