import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_DOWNLOAD_URL || 'http://127.0.0.1:3100';
let server;
if (!process.env.TEST_DOWNLOAD_URL) {
  const { spawn } = await import('node:child_process');
  server = spawn(process.execPath, ['server.mjs'], { cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: '3100' }, stdio: ['ignore','pipe','pipe'] });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.on('error', reject); });
}
const shots = process.env.DOWNLOAD_SCREENSHOTS;
if (shots) await mkdir(shots, { recursive: true });
const versions = [
  ['v1.3.5', 'Sep 20, 2026', '35 MB', '0ed035163585586fbba5c74a87a247eb6d0f9dce8df1ec5212680eecfae547d3', 'TDS.Macro.v1.3.5.zip'],
  ['v1.3.4b', 'Sep 5, 2026', '34 MB', '0ddd38e8b333b37fa1d0dfef00e0a6242ce6f252261b1c9c21b5ce24e63deb93', 'TDS_Macro_1.3.4b-final.zip'],
  ['v1.3.4a', 'Sep 5, 2026', '34 MB', 'b44faa487c680b94e1b119a27f6530f4dfd6c1a2288238258f6ff21b75ea026e', 'TDS_Macro_1.3.4a.zip'],
  ['v1.3.4', 'Sep 5, 2026', '33 MB', '67d6d6099af7cccd1415cd450e37a8b8b1ca52bbe1421b31959e1af406d851a6', 'TDS_Macro.zip'],
  ['v1.3.3', 'Aug 26, 2026', '32 MB', '6d4cae2e3be38b4df70dc38be84c38cef89f1086d6db7f530d210762fc5cdde3', 'TDS_Macro.zip']
];
const paths = ['/download', '/download/latest', ...versions.map(v => '/download/' + v[0])];
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ['--no-sandbox'] });
let checks = 0;
try {
  let navigationChecks = 0;
  for (const width of [320,390,430,820,1100]) {
    for (const javaScriptEnabled of [false,true]) {
      for (const reducedMotion of ['no-preference','reduce']) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, javaScriptEnabled, reducedMotion });
        await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
        // Menu enhancement must not depend on the deferred download script loading.
        await context.route('**/src/download.js?*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
        const page = await context.newPage();
        if (javaScriptEnabled) await page.addInitScript(() => {
          window.navFlashes = [];
          window.navOverflows = [];
          function check() {
            const menu = document.querySelector('.download-mobile-nav');
            const button = document.querySelector('.download-menu-toggle');
            // Stylesheets block paint; ignore the parser's unstyled DOM before CSS is ready.
            if (menu && button && button.hidden && getComputedStyle(menu).display === 'grid') window.navFlashes.push(true);
            if (document.querySelector('.download-main') && document.documentElement.scrollWidth !== innerWidth) window.navOverflows.push(true);
            requestAnimationFrame(check);
          }
          requestAnimationFrame(check);
        });
        for (const path of paths) {
          await page.goto(base + path);
          const menu = page.getByRole('navigation', { name: 'Mobile', exact: true });
          const button = page.locator('.download-menu-toggle');
          assert.equal(await button.isVisible(), javaScriptEnabled);
          if (javaScriptEnabled) {
            assert.equal(await menu.isVisible(), false);
            await button.click();
            assert.equal(await button.getAttribute('aria-expanded'), 'true');
          }
          for (const label of ['Requirements','Guide','Strategy Network','Early Access','Download','FAQ']) {
            const link = menu.getByRole('link', { name: label, exact: true });
            assert.equal(await link.isVisible(), true, `${path} ${width} JS=${javaScriptEnabled}: ${label}`);
            assert.ok((await link.boundingBox()).height >= 44);
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
          if (javaScriptEnabled) {
            await page.keyboard.press('Escape');
            assert.equal(await menu.isVisible(), false);
            assert.deepEqual(await page.evaluate(() => window.navFlashes), []);
            assert.deepEqual(await page.evaluate(() => window.navOverflows), []);
          }
          navigationChecks++;
        }
        await context.close();
      }
    }
    console.log(`${width}px navigation: JS/no-JS + normal/reduced motion PASS`);
  }
  console.log(`${navigationChecks} navigation checks PASS`);
  for (const [width, height] of [[320,640],[375,812],[390,844],[430,932],[820,1180],[844,390],[1440,900]]) {
    for (const reducedMotion of ['no-preference','reduce']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion, timezoneId: 'America/Bogota', permissions: ['clipboard-read','clipboard-write'] });
      // External fonts are optional; test the fallback as well. Asset URLs are verified separately.
      await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      await context.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.addInitScript(() => {
        window.overflows = [];
        const check = () => {
          if (document.querySelector('.download-main') && document.documentElement.scrollWidth !== innerWidth) window.overflows.push([document.documentElement.scrollWidth, innerWidth]);
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
      for (const path of paths) {
        await page.goto(base + path);
        await page.locator('[data-download]').first().waitFor();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'download-skip');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
        const menuToggle = page.locator('.download-menu-toggle');
        if (await menuToggle.isVisible()) {
          await menuToggle.click();
          assert.equal(await menuToggle.getAttribute('aria-expanded'), 'true');
          await page.keyboard.press('Escape');
          assert.equal(await menuToggle.getAttribute('aria-expanded'), 'false');
        }
        await page.addStyleTag({ content: 'html,body{overflow-x:visible!important}' });
        const main = path === '/download';
        const v = path === '/download/latest' || main ? versions[0] : versions.find(v => path.endsWith(v[0]));
        assert.equal(await page.locator('main h1').innerText(), v[0]);
        assert.equal(await page.locator('.download-hero time').innerText(), v[1]);
        assert.ok((await page.locator('.release-meta').innerText()).includes(v[2]));
        assert.equal(await page.locator('[data-checksum]').textContent(), v[3]);
        assert.equal(await page.locator('[data-download]').first().getAttribute('href'), `https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases/download/${v[0]}/${v[4]}`);
        assert.equal(await page.locator('.older-notice').count(), v[0] === 'v1.3.5' ? 0 : 1);
        assert.equal(await page.locator('.latest-label').count(), v[0] === 'v1.3.5' ? 1 : 0);
        assert.equal(await page.locator('.version-heading .hotfix-label').count(), !main && /[ab]$/.test(v[0]) ? 1 : 0);
        assert.ok(!(await page.locator('main').innerText()).match(/\d[\d,]* downloads/));
        assert.equal(await page.locator('a[download]').count(), 0, 'do not pretend browsers can rename cross-origin assets');
        const bounds = await page.locator('[data-download]').first().boundingBox();
        assert.ok(bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width);
        if (main) {
          assert.ok(bounds.y + bounds.height <= height, 'primary download visible in first viewport');
          assert.equal(await page.locator('.version-row').count(), 4);
          assert.equal(await page.locator('.changelog').getAttribute('open'), null);
          const summary = page.locator('.changelog summary');
          await summary.focus(); await page.keyboard.press('Enter');
          await page.waitForTimeout(260);
          assert.equal(await page.locator('.changelog').getAttribute('open'), '');
          await page.keyboard.press('Enter'); await page.waitForTimeout(260);
          assert.equal(await page.locator('.changelog').getAttribute('open'), null);
          await page.locator('.checksum-disclosure summary').click();
        }
        const copy = page.locator('[data-copy]');
        await copy.click();
        await page.waitForFunction(() => document.querySelector('[data-copy]').textContent === 'Copied');
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), v[3]);
        const cta = page.locator('[data-download]').first();
        // Simulate attachment response to verify immediate browser download + feedback without inflating GitHub counts.
        await page.route('https://github.com/**/releases/download/**', route => route.fulfill({ status: 200, headers: { 'content-disposition': 'attachment; filename="fixture.zip"' }, body: 'test attachment' }));
        const download = page.waitForEvent('download');
        await cta.click(); await download;
        assert.equal(await cta.locator('[data-download-label]').innerText(), 'Starting download…');
        await page.waitForTimeout(1300);
        assert.equal(await cta.locator('[data-download-label]').innerText(), main ? 'Download for Windows' : 'Download ' + v[0]);
        assert.deepEqual(await page.evaluate(() => [...new Set(window.overflows.map(JSON.stringify))]), [], `${path} ${width} ${reducedMotion}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
        assert.equal(canonical, 'https://ultmacro.xyz' + (main ? '/download/' : '/download/' + v[0] + '/'));
        for (const link of await page.locator('main a[href^="/"]').all()) {
          const href = await link.getAttribute('href');
          assert.equal((await context.request.get(base + href)).status(), 200, href);
        }
        if (reducedMotion === 'reduce') assert.equal(await page.locator('.download-hero').evaluate(e => getComputedStyle(e).animationName), 'none');
        if (main) await page.locator('.checksum-disclosure summary').click();
        if (shots && reducedMotion === 'no-preference' && [390,1440].includes(width)) {
          await page.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
          await page.screenshot({ path: `${shots}/${main ? 'main' : v[0]}-${width}.png`, fullPage: true });
        }
        assert.deepEqual(errors, []);
        checks++;
      }
      await context.close();
      console.log(`${width}×${height} ${reducedMotion}: all 7 routes PASS`);
    }
  }
  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 640 } });
  const page = await noJS.newPage();
  for (const path of paths) {
    await page.goto(base + path); await page.locator('[data-download]').first().waitFor();
    assert.equal(await page.locator('main h1').count(), 1);
    if (path === '/download') { await page.locator('.changelog summary').click(); assert.equal(await page.locator('.changelog').getAttribute('open'), ''); }
  }
  console.log(`${checks} page/viewport/motion checks + 7 no-JS routes PASS`);
} finally { await browser.close(); server?.kill('SIGTERM'); }
