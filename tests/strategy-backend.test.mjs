import assert from 'node:assert/strict';
import test from 'node:test';
import { confidenceWeightedRating, popularScore, sortStrategies, trendingScore } from '../api/_lib/discovery.mjs';
import { uploadPublicBlob, validateThumbnail } from '../api/_lib/media.mjs';
import { clientFingerprint, hashSecret, verifySecret } from '../api/_lib/security.mjs';
import { publicVersion } from '../api/_lib/strategy-store.mjs';
import { normalizeStrategyText, parseStrategy, similarity, strategyFingerprint } from '../api/_lib/strategy-validation.mjs';

const valid = `[Info]\ntitle=Test farm\nauthor=tester\ndesc=Short test\n\n[Settings]\nmap=Dead Ahead\ndifficulty=Easy\nrequiredTowers=Farm, Soldier\n\n[Steps]\nSpawnTower(500, 400, 1, 1)\nUpgradeTower(1)`;
const desktopFormat = `[Settings]\nmap=Wretched Front\ndifficulty=Hardcore\nrequiredTowers=Crook Boss, Farm, Juggernaut\ntimescale=OFF\n\n[DO NOT EDIT]\nwidth=2560\nheight=1369\n\n[Steps]\nSpawnTower(764, 588, 2, Farm1)\nUpgradeTower(Farm1)\nChangeTargets(Farm1, Weakest)\nSetDJTrack("RED")\nSend("w", hold:=1000)`;

test('server parser accepts the same safe strategy contract as the browser', () => {
  const result = parseStrategy(valid);
  assert.equal(result.ok, true);
  assert.equal(result.commands.length, 2);
  assert.equal(result.metadata.map, 'Dead Ahead');
});

test('server parser accepts real desktop strategy syntax', () => {
  const result = parseStrategy(desktopFormat);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.metadata.map, 'Wretched Front');
  assert.equal(result.metadata.towerStatus, 'recognized');
  assert.equal(result.metadata.width, '2560');
  assert.equal(result.commands.length, 5);
});

test('normalization makes formatting-only duplicates exact matches', () => {
  const formatted = `[Info]\n title=Test farm\n[Settings]\nmap=Dead Ahead\n[Steps]\nSpawnTower(500,400,1,1)`;
  const spaced = `[Info]\ntitle=Test farm\n\n[Settings]\nmap=Dead Ahead\n[Steps]\nSpawnTower(500, 400, 1, 1)\n`;
  assert.equal(normalizeStrategyText(formatted), normalizeStrategyText(spaced));
});

test('near-duplicate comparison is based on command overlap', () => {
  const first = strategyFingerprint(parseStrategy(valid));
  const second = strategyFingerprint(parseStrategy(`${valid}\nAutoSkip(1)`));
  assert.ok(similarity(first, second) > 0.6);
  assert.equal(similarity(first, 'UseAbility(99)'), 0);
});

test('confidence scoring gives new ratings a neutral prior', () => {
  assert.equal(confidenceWeightedRating(0, 0), 3);
  assert.ok(confidenceWeightedRating(50, 10) < 5);
  assert.ok(confidenceWeightedRating(500, 100) > confidenceWeightedRating(50, 10));
});

test('discovery ranking keeps popular and trending as separate signals', () => {
  const now = Date.now();
  const items = [
    { id: 'old', installs: 5000, ratingSum: 20, ratingCount: 5, updatedAt: new Date(now - 90 * 86400000).toISOString(), momentum: 1 },
    { id: 'new', installs: 100, ratingSum: 18, ratingCount: 4, updatedAt: new Date(now - 2 * 86400000).toISOString(), momentum: 90 }
  ];
  assert.equal(sortStrategies(items, 'popular')[0].id, 'old');
  assert.equal(sortStrategies(items, 'trending')[0].id, 'new');
  assert.ok(trendingScore(items[1], now) > trendingScore(items[0], now));
  assert.ok(popularScore(items[0]) > popularScore(items[1]));
});

test('creator and admin secrets are stored as verifiable password-grade hashes', async () => {
  const encoded = await hashSecret('correct horse battery staple');
  assert.match(encoded, /^scrypt\$/);
  assert.equal(await verifySecret('correct horse battery staple', encoded), true);
  assert.equal(await verifySecret('wrong password', encoded), false);
});

test('public version metadata omits the internal duplicate fingerprint', () => {
  const version = publicVersion({
    id: 'version-1',
    version: '1.0',
    compatible: '1.3.4+',
    created_at: '2026-09-10T00:00:00.000Z',
    changelog: 'Initial release.',
    content_sha256: 'content-hash',
    content_url: '/api/files/strategy.strat',
    detected_metadata: JSON.stringify({ map: 'Dead Ahead', fingerprint: 'SpawnTower(1,2,1,Farm)' })
  });
  assert.deepEqual(version.metadata, { map: 'Dead Ahead' });
  assert.equal('fingerprint' in version.metadata, false);
});

test('fingerprinting fails closed when its secret is missing', () => {
  const previous = process.env.STRATEGY_HASH_SECRET;
  delete process.env.STRATEGY_HASH_SECRET;
  try {
    assert.throws(() => clientFingerprint(new Request('https://ultmacro.xyz/api/strategies', { headers: { 'user-agent': 'test' } })), /STRATEGY_HASH_SECRET/);
  } finally {
    if (previous === undefined) delete process.env.STRATEGY_HASH_SECRET;
    else process.env.STRATEGY_HASH_SECRET = previous;
  }
});

test('blob writes fail closed when storage is not configured', async () => {
  const previous = process.env.STRATEGY_STORAGE_ROOT;
  delete process.env.STRATEGY_STORAGE_ROOT;
  try {
    await assert.rejects(uploadPublicBlob('strategies/test.strat', new Uint8Array([1]), 'text/plain'), /STRATEGY_STORAGE_ROOT/);
  } finally {
    if (previous === undefined) delete process.env.STRATEGY_STORAGE_ROOT;
    else process.env.STRATEGY_STORAGE_ROOT = previous;
  }
});

test('thumbnail validation rejects untrusted formats before upload', () => {
  assert.throws(() => validateThumbnail(new Uint8Array([0x3c, 0x73, 0x76, 0x67]), 'image/svg+xml'), /PNG, JPEG, or WebP/);
});