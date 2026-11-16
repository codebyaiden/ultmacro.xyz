import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const contract = require('../src/releases-data.js');
const context = { window: {} };
vm.runInNewContext(await readFile(new URL('../data/releases.js', import.meta.url), 'utf8'), context);
const releases = JSON.parse(JSON.stringify(context.window.UM_RELEASES.releases));
const current = contract.pickLatestPublished(releases);

test('newer prereleases stay out of stable history and do not replace latest stable', () => {
  const view = require('../src/release-detail.js');
  const prerelease = { ...current, tag: 'v1.4.0-test.1', prerelease: true, published: '2099-10-06T00:00:00Z',
    asset: { ...releases[0].asset, url: 'https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/v1.4.0-test.1/Ultimate-Macro-v1.4.0-test.1.zip' } };
  const history = contract.mergeHistory(releases, [prerelease]);
  const latest = contract.pickLatestPublished(history);
  assert.equal(latest.tag, current.tag);
  const html = view.renderMain(history, latest);
  assert.ok(!html.includes(prerelease.tag), 'prerelease has no ordinary archive row or download');
  assert.ok(!html.includes(prerelease.asset.url));
  assert.ok(html.split('id="history"')[1].includes(`href="/download/${current.tag}/"`));
  assert.match(html.split('id="history"')[1], /<h2 id="history-title">Release history<\/h2>/);
  assert.equal(html.split('id="history"')[1].match(/class="version-link" href="([^"]+)"/)[1], `/download/${current.tag}/`);
  for (const stable of releases) {
    assert.ok(history.some(release => release.tag === stable.tag), 'historical metadata remains intact');
    if (stable.asset) assert.ok(html.includes(stable.asset.url), 'every stable download remains available');
  }
});

test('latest published source release has release notes and no fabricated ZIP', () => {
  const available = contract.pickLatestStable(releases);
  const source = { ...available, tag: 'v9.0.0', published: '2099-01-01T00:00:00Z', asset: null,
    url: contract.RELEASE_BASE + '/releases/tag/v9.0.0' };
  const history = contract.mergeHistory(releases, [source]);
  const latest = contract.pickLatestPublished(history);
  assert.equal(latest.tag, source.tag);
  assert.equal(contract.pickLatestStable(history).tag, available.tag);
  const view = require('../src/release-detail.js');
  for (const html of [view.renderMain(history, latest, available), view.renderVersion(source, latest, available)]) {
    const hero = html.split('</section>')[0];
    assert.match(hero, /View source release on GitHub/);
    assert.match(hero, /No packaged Windows ZIP is attached/);
    assert.ok(hero.includes(`href="/download/${available.tag}/"`));
    assert.doesNotMatch(hero, /data-download/);
  }
});

test('generation serves real downloads without JS and retains history after a partial sync', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'um-downloads-'));
  try {
    await cp(new URL('../src/', import.meta.url), path.join(root, 'src'), { recursive: true });
    await mkdir(path.join(root, 'download', 'v1.2.0'), { recursive: true });
    await writeFile(path.join(root, 'download', 'v1.2.0', 'index.html'), '<main data-version-view>historical release</main>');
    await writeFile(path.join(root, '_redirects'), '/tester https://example.com 302\n');
    const generator = require(path.join(root, 'src/version-page.cjs'));
    await generator.writeVersionPages(releases);
    const main = await readFile(path.join(root, 'download/index.html'), 'utf8');
    assert.match(main, /class="download-menu-toggle"[^>]* hidden>/, 'Menu starts hidden until enhancement is ready');
    assert.match(main, /<nav class="download-mobile-nav"[^>]*aria-label="Mobile">/, 'mobile links are not hidden in the default HTML');
    assert.match(main, /href="https:\/\/github.com\/UltimateMacro\/Ultimate-Macro-New-Era\/releases\/download\/v1.3.5\/TDS.Macro.v1.3.5.zip"/);
    for (const release of releases) {
      const html = await readFile(path.join(root, 'download', release.tag, 'index.html'), 'utf8');
      if (release.asset) {
        assert.ok(html.includes(release.asset.url));
        assert.ok(html.includes(release.asset.digest.slice(7)));
      } else assert.match(html, /No packaged Windows ZIP is attached/);
      assert.ok(html.includes(`https://ultmacro.xyz/download/${release.tag}/`));
      assert.ok(!html.includes('downloads</p>'));
    }
    const alias = await readFile(path.join(root, 'download/latest/index.html'), 'utf8');
    assert.ok(alias.includes(`http-equiv="refresh" content="0; url=/download/${current.tag}/"`));
    const redirects = await readFile(path.join(root, '_redirects'), 'utf8');
    assert.ok(redirects.includes(`/download/latest/ /download/${current.tag}/ 302`));
    assert.match(redirects, /\/tester https:\/\/example.com 302/);
    await generator.writeVersionPages(releases.slice(0, 1));
    assert.match(await readFile(path.join(root, 'download/v1.2.0/index.html'), 'utf8'), /historical release/);
    const olderRelease = releases.find(release => release.tag === 'v1.3.4b');
    assert.ok((await readFile(path.join(root, 'download/v1.3.4b/index.html'), 'utf8')).includes(olderRelease.asset.url));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('ambiguous ZIP assets never silently pick one download', () => {
  const asset = name => ({ name, browser_download_url: `https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/v1.3.5/${name}`, state: 'uploaded', size: 100, digest: 'sha256:' + 'a'.repeat(64), download_count: 1 });
  const release = { tag_name: 'v1.3.5', draft: false, html_url: 'https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/tag/v1.3.5', assets: [asset('TDS_Macro.zip'), asset('Ultimate-Macro-v1.3.5.zip')] };
  assert.equal(contract.selectAsset(release), null);
});

test('bare version ZIP names are accepted only when they match the release tag', () => {
  const make = (tag, name) => ({
    tag_name: tag, draft: false,
    html_url: `https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/tag/${tag}`,
    assets: [{ name, browser_download_url: `https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/${tag}/${name}`, state: 'uploaded', size: 100, digest: 'sha256:' + 'a'.repeat(64), download_count: 0 }]
  });
  assert.equal(contract.selectAsset(make('v1.4.2', 'v1.4.2.zip')).name, 'v1.4.2.zip');
  assert.equal(contract.selectAsset(make('v1.4.2', 'v1.4.1.zip')), null);
});

test('v1.3.6 dotted ZIP appears on the download page with its Auto Equip caveat', () => {
  const name = 'Ultimate.Macro.v1.3.6.zip';
  const release = contract.normalizeRelease({
    tag_name: 'v1.3.6', draft: false, prerelease: false,
    html_url: 'https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/tag/v1.3.6',
    published_at: '2026-10-16T02:05:49Z', body: '`1` Added playtime rewards collection\n`4a` Faster blocked-spot detection',
    assets: [{
      name,
      browser_download_url: `https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/v1.3.6/${name}`,
      state: 'uploaded', size: 36314309,
      digest: 'sha256:40fb60f03e3689ace032915632ddd6c700da7cb30aca779a13393328641ca703',
      download_count: 0
    }]
  });
  assert.equal(release.asset.name, name);
  const html = require('../src/release-detail.js').renderMain([release], release);
  assert.ok(html.includes(release.asset.url));
  assert.ok(html.includes('Added playtime rewards collection'));
  assert.match(html, /<li>Faster blocked-spot detection<\/li>/);
  assert.ok(html.includes('Auto Equip may still miss towers'));
  assert.ok(html.includes('Run Solar Requiem Night 1 on Easy or Hard with the recorded loadout (beta).'));
  assert.ok(html.includes('Choose any map as an override and wait for enough cash before upgrades (beta).'));
});

test('server canonicalizes download aliases without losing query strings', async () => {
  const { spawn } = await import('node:child_process');
  const { createServer } = await import('node:net');
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('server startup timed out')), 5000);
      child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
      child.on('error', reject);
    });
    for (const alias of ['/download/latest', '/download/latest/', '/download/latest/index.html']) {
      const response = await fetch(`http://127.0.0.1:${port}${alias}?from=old-link`, { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), `/download/${current.tag}/?from=old-link`);
    }
    for (const alias of ['/download/v1.3.4b', '/download/v1.3.4b/index.html']) {
      const response = await fetch(`http://127.0.0.1:${port}${alias}`, { redirect: 'manual', method: 'HEAD' });
      assert.equal(response.status, 301);
      assert.equal(response.headers.get('location'), '/download/v1.3.4b/');
    }
  } finally { child.kill('SIGTERM'); }
});

test('partial release metadata sync keeps absent historical releases and fails on lost assets', () => {
  const existing = [{ tag: 'v1.0.0', asset: { url: 'old.zip' } }, { tag: 'v1.1.0', asset: { url: 'new.zip' } }];
  const incoming = [{ tag: 'v1.1.0', asset: { url: 'updated.zip' } }];
  const merged = contract.mergeHistory(existing, incoming);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(r => r.tag === 'v1.0.0').asset.url, 'old.zip');
  assert.equal(merged.find(r => r.tag === 'v1.1.0').asset.url, 'updated.zip');
  assert.throws(() => contract.mergeHistory(existing, [{ tag: 'v1.1.0', asset: null }]), /lost.*asset/i);
});
