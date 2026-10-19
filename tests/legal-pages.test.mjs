import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('policy pages have accessible navigation, dated terms and the shared ad loader', async () => {
  for (const route of ['terms', 'privacy', 'memberships']) {
    const page = await read(route + '/index.html');
    assert.match(page, /<html lang="en">/);
    assert.match(page, /<h1>/);
    assert.match(page, /tdsultimatemacro@gmail\.com/);
    assert.match(page, /href="\/terms\/"/);
    assert.match(page, /href="\/privacy\/"/);
    assert.doesNotMatch(page, /\[INSERT|\[CONFIRM/);
    assert.match(page, /src="\/src\/adcash\.js\?v=20261019" defer/);
    assert.match(await read('sitemap.xml'), new RegExp('https://ultmacro.xyz/' + route + '/'));
  }
});
test('terms preserve software rights and do not sell unavailable memberships', async () => {
  const terms = await read('terms/index.html');
  assert.match(terms, /existing GPL releases/);
  assert.match(terms, /statutory refund/);
  assert.match(terms, /Ultimate Max are not launched/);
  assert.match(await read('memberships/index.html'), /not available to purchase/);
});
test('privacy distinguishes optional sharing, payment minimization and undeployed referrals', async () => {
  const page = await read('privacy/index.html');
  assert.match(page, /defaults optional economy sharing off/);
  assert.match(page, /no universal automatic deletion period/);
  assert.match(page, /not activated by this notice/);
  assert.match(page, /not anonymous data/);
  const home = await read('index.html');
  assert.match(home, /href="\/terms\/"/);
  assert.doesNotMatch(home, /releases under GPL-3.0/);
});
