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
    assert.match(page, /src="\/src\/advertising\.js\?v=adcash-selfhost-20261021" defer/);
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
test('desktop advertising terms require a real choice without restricting macro features', async () => {
  const page = await read('terms/index.html');
  assert.match(page, /Version: October 26, 2026/);
  assert.match(page, /<h2 id="desktop-advertising">Optional desktop advertising<\/h2>/);
  assert.match(page, /"Continue with ads" or "Continue without ads"/);
  assert.match(page, /Declining advertising does not restrict macro features/);
  assert.match(page, /Accepting these terms or merely opening the app is not advertising consent/);
  assert.match(page, /IP address, browser details and referring site/);
  assert.match(page, /cookies or similar technologies/);
  assert.match(page, /href="\/privacy\/#desktop-advertising"/);
  assert.match(page, /href="https:\/\/keys\.ultmacro\.xyz\/app-banner\/privacy"/);
});
test('desktop privacy distinguishes technical data and local cleanup from provider retention', async () => {
  const page = await read('privacy/index.html');
  assert.match(page, /Updated October 26, 2026/);
  assert.match(page, /<h2 id="desktop-advertising">Optional desktop banner<\/h2>/);
  assert.match(page, /Before any desktop banner loads, choose "Continue with ads" or "Continue without ads"/);
  assert.match(page, /Opening the app or accepting its terms is not advertising consent/);
  assert.match(page, /turning ads off unloads the current banner and stops future banner requests/);
  assert.match(page, /IP address, browser details and referring site/);
  assert.match(page, /cookies, similar technologies and device information/);
  assert.match(page, /not guaranteed to be anonymous/);
  assert.match(page, /does not attach email addresses, Discord IDs, strategy files or app session tokens/);
  assert.match(page, /local browsing data is discarded when its temporary profile is destroyed/);
  assert.match(page, /does not delete records already held by Adcash or its partners/);
  assert.match(page, /processed under their own policies/);
  assert.match(page, /href="https:\/\/keys\.ultmacro\.xyz\/app-banner\/privacy"/);
  // Preserve the newer origin/main disclosure; never replace this page with an older checkout.
  assert.match(page, /optional website bug reporter sends the title/);
  assert.match(page, /does not automatically upload device files, screenshots or logs/);
});
