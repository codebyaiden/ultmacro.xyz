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
test('terms remove retired desktop advertising without changing optional-feature consent', async () => {
  const page = await read('terms/index.html');
  assert.match(page, /Version: October 29, 2026/);
  assert.doesNotMatch(page, /Optional desktop advertising|desktop-advertising|Continue with ads|Continue without ads|app-banner\/privacy/);
  assert.match(page, /Agreement to these terms is not permission for every optional upload, screenshot, remote command or statistics-sharing feature/);
  assert.match(page, /Enable optional features only after reviewing their controls and recipients/);
});
test('privacy removes retired desktop banners but retains active-service and retention disclosures', async () => {
  const page = await read('privacy/index.html');
  assert.match(page, /Updated October 29, 2026/);
  assert.match(page, /current 1\.4 desktop tester does not display or request desktop banner advertisements/);
  assert.doesNotMatch(page, /Optional desktop banner|desktop-advertising|Continue with ads|Continue without ads|app-banner\/privacy/);
  assert.match(page, /Web requests disclose network information such as IP address/);
  assert.match(page, /Selected public pages load Adcash AutoTag advertising/);
  assert.match(page, /Turning sharing off stops future reports, but does not automatically erase prior aggregates or ledger records/);
  assert.match(page, /There is no universal automatic deletion period/);
  // Preserve the newer origin/main disclosure; never replace this page with an older checkout.
  assert.match(page, /optional website bug reporter sends the title/);
  assert.match(page, /does not automatically upload device files, screenshots or logs/);
});
