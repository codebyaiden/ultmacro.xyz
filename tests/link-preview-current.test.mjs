import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
test('homepage and generated download previews use the current immutable UI image', () => {
  const name = 'ultimate-macro-1.4.1.5-preview.png';
  const image = readFileSync(join(root, 'assets/ui', name));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 1000);
  assert(existsSync(join(root, 'assets/ui/ultimate-macro-main-new.png')), 'Preserve historical image URLs');
  const pages = ['index.html', 'download/index.html'];
  for (const dir of readdirSync(join(root, 'download'), { withFileTypes: true }))
    if (dir.isDirectory() && dir.name !== 'latest' && existsSync(join(root, 'download', dir.name, 'index.html')))
      pages.push('download/' + dir.name + '/index.html');
  for (const path of pages) {
    const html = readFileSync(join(root, path), 'utf8');
    for (const tag of ['og:image', 'twitter:image']) {
      const meta = html.match(new RegExp('<meta (?:property|name)="' + tag + '" content="([^"]+)"'));
      assert.equal(meta?.[1], 'https://ultmacro.xyz/assets/ui/' + name, path + ' ' + tag);
    }
  }
  assert(readFileSync(join(root, 'src/version-page.cjs'), 'utf8').includes(name));
  assert(readFileSync(join(root, 'download/latest/index.html'), 'utf8').includes('/download/v1.4.1.5/'));
});

test('release sync preserves the designed download index and is idempotent', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'um-designed-index-'));
  try {
    await cp(join(root, 'src'), join(scratch, 'src'), { recursive: true });
    await cp(join(root, 'download'), join(scratch, 'download'), { recursive: true });
    const context = { window: {} };
    vm.runInNewContext(await readFile(join(root, 'data/releases.js'), 'utf8'), context);
    const releases = JSON.parse(JSON.stringify(context.window.UM_RELEASES.releases));
    const latest = releases[0];
    const future = { ...latest, tag: 'v99.0.0', published: '2033-01-01T00:00:00Z', body: '* Wrapped highlight\n  continues here.\n\n* Next highlight.',
      asset: { ...latest.asset, url: 'https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/v99.0.0/new.zip', digest: 'sha256:' + 'b'.repeat(64) } };
    const before = await readFile(join(scratch, 'download/index.html'), 'utf8');
    const generator = createRequire(import.meta.url)(join(scratch, 'src/version-page.cjs'));
    await generator.writeVersionPages([future, ...releases]);
    const after = await readFile(join(scratch, 'download/index.html'), 'utf8');
    assert.equal(after.match(/<header[^]*?<\/header>/)[0], before.match(/<header[^]*?<\/header>/)[0]);
    assert.equal(after.match(/<body[^>]+>/)[0], before.match(/<body[^>]+>/)[0]);
    assert.equal(after.match(/<link rel="stylesheet" href="\/styles\/releases[^>]+>/)[0], before.match(/<link rel="stylesheet" href="\/styles\/releases[^>]+>/)[0]);
    assert(after.includes(future.asset.url) && after.includes('b'.repeat(64)));
    assert(after.includes('Wrapped highlight continues here.'));
    assert(after.includes('/download/' + latest.tag + '/'));
    await generator.writeVersionPages([future, ...releases]);
    assert.equal(await readFile(join(scratch, 'download/index.html'), 'utf8'), after);
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
