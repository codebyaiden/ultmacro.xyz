import test from 'node:test';
import assert from 'node:assert/strict';
import { constants, createHash, generateKeyPairSync, sign } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadSignedUpdaterRelease, parseOffer } = require('../scripts/signed-updater-release.cjs');
const contract = require('../src/releases-data.js');
const view = require('../src/release-detail.js');
const feed = 'https://keys.ultmacro.xyz/keys/ahk-updates/';
const version = '1.4.0.39';
const commit = 'a'.repeat(40);
const zip = Buffer.from('signed-package-fixture');
const bytes = createHash('sha256').update(zip).digest('hex');
const now = Date.parse('2026-11-05T23:45:00Z');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 4096 });
const verification = { key: publicKey, now };
const notes = '* Smoother interface.\n* Private servers.';
const manifest = {
  Version: version, Channel: 'ahk-stable', Url: feed + version + '.zip', Sha256: bytes, Bytes: zip.length,
  IssuedAt: '2026-11-05T23:32:32Z', ExpiresAt: '2026-11-12T23:32:32Z'
};

function seal(offer) {
  const raw = Buffer.from(JSON.stringify(offer));
  return { raw, signature: sign('sha256', raw, { key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }) };
}

function fakeFetch({ raw, signature } = seal(manifest), packageBytes = zip, { changed = false } = {}) {
  let manifests = 0;
  return async (url, opts) => {
    assert.equal(opts.redirect, 'error');
    if (url === feed + 'stable.json') return new Response(changed && manifests++ > 0 ? raw.subarray(1) : raw);
    if (url === feed + 'stable.sig') return new Response(signature);
    assert.equal(url, manifest.Url, 'No arbitrary download destination is allowed');
    return new Response(packageBytes);
  };
}

test('a verified updater build produces a real immutable ZIP and source link in the release pages', async () => {
  const release = await loadSignedUpdaterRelease({ version, commit, notes, fetcher: fakeFetch(), verification });
  assert.equal(release.tag, 'v' + version);
  assert.equal(release.source, 'signed-updater');
  assert.equal(release.asset.url, manifest.Url);
  assert.equal(release.asset.digest, 'sha256:' + bytes);
  assert.equal(release.asset.size, zip.length);
  const page = view.renderVersion(release, release);
  assert.ok(page.includes(manifest.Url) && page.includes(bytes) && page.includes('/tree/' + commit));
  assert.match(page, /View source on GitHub/);
});

test('untrusted or tampered signatures, stale metadata, and alternate hosts are rejected', async () => {
  const { raw, signature } = seal(manifest);
  assert.throws(() => parseOffer(raw, signature, { now }), /signature rejected/);
  assert.throws(() => parseOffer(Buffer.concat([raw, Buffer.from('\n')]), signature, verification), /signature rejected/);
  assert.throws(() => parseOffer(raw, signature, { ...verification, now: Date.parse('2026-11-13T00:00:00Z') }),
    /expired/);
  const otherHost = seal({ ...manifest, Url: 'https://example.com/1.4.0.39.zip' });
  assert.throws(() => parseOffer(otherHost.raw, otherHost.signature, verification), /ZIP URL/);
  await assert.rejects(loadSignedUpdaterRelease({ version: '1.4.0.40', commit, notes, fetcher: fakeFetch(), verification }),
    /not the requested version/);
});

test('ZIP verification fails closed on changed bytes, length, or a changing live offer', async () => {
  const different = Buffer.from(zip);
  different[0] ^= 1;
  const run = fetcher => loadSignedUpdaterRelease({ version, commit, notes, fetcher, verification });
  await assert.rejects(run(fakeFetch(undefined, different)), /differs from the signed/);
  await assert.rejects(run(fakeFetch(undefined, zip.subarray(1))), /differs from the signed/);
  await assert.rejects(run(fakeFetch(undefined, Buffer.concat([zip, zip]))), /exceeds/);
  await assert.rejects(run(fakeFetch(undefined, zip, { changed: true })), /changed during verification/);
});

test('GitHub sync preserves the signed offer and refuses different ZIPs for the same build', async () => {
  const release = await loadSignedUpdaterRelease({ version, commit, notes, fetcher: fakeFetch(), verification });
  const github = { ...release, source: undefined, url: contract.RELEASE_BASE + '/releases/tag/' + release.tag };
  assert.deepEqual(contract.mergeHistory([release], [{ ...github, asset: null }]), [release]);
  assert.deepEqual(contract.mergeHistory([release], [github]), [release]);
  assert.throws(() => contract.mergeHistory([release], [{ ...github, asset: { ...release.asset, size: 1 } }]), /conflicting ZIP/);
  const renewed = { ...release, published: '2026-11-06T00:00:00Z', body: 'Revised notes' };
  assert.deepEqual(contract.mergeHistory([release], [renewed]), [{ ...release, body: 'Revised notes' }]);
});
