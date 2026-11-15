import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('homepage has concise, accessible mobile-first sections', async () => {
  const home = await read('index.html');
  const css = await read('styles/homepage.css');
  const menu = await read('src/homepage.js');
  assert.match(home, /youtube\.com\/@UltimateMacro/);
  assert.match(home, /styles\/homepage\.css\?v=1/);
  assert.match(home, /<body class="home-rework">/);
  for (const title of ['Record it once. Run it again.', 'Get ready for a run.', 'Good to know.', 'Find your next run.', 'Watch one complete match.']) {
    assert.ok(home.includes(title), title);
  }
  for (const removed of ['interface-section', 'runtime-section', 'recorder-section', 'requirements-heading', 'download-panel', 'field-notes', 'id="record-action"']) {
    assert.ok(!home.includes(removed), 'retired UI should not be on homepage: ' + removed);
  }
  assert.equal((home.match(/<section\b/g) || []).length, 7);
  assert.match(home, /styles\/coming\.css\?v=2/);
  assert.match(home, /href="\/coming\/"/);
  assert.match(css, /home-value-section/);
  assert.match(css, /home-setup-steps/);
  assert.doesNotMatch(home, /styles\.css\?v=19|site\.js\?v=6|home-rework\.css/);
  assert.match(home, /src\/advertising\.js/);
  assert.match(menu, /aria-expanded/);
  assert.match(menu, /Escape/);
  assert.match(menu, /menu\.inert = true/);
  assert.doesNotMatch(home, /class="hero-moon"|class="hero-wave"|class="hero-ambient"/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /footer\{display:grid/);
});

test('every guide variant uses F3 to stop a v1.3.6 main strategy', async () => {
  for (const name of ['', 'requirements/', 'install/', 'display/', 'first-run/', 'recording/', 'sessions/', 'discord/', 'tools/', 'troubleshooting/', 'safety/']) {
    const page = await read('guide/' + name + 'index.html');
    assert.match(page, /F2<\/span> pauses or resumes/);
    assert.match(page, /F3<\/span> to stop it/);
    assert.doesNotMatch(page, /F2<\/span> stops the macro/);
  }
});

test('homepage easter egg and menu stay lightweight and valid', async () => {
  const home = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles/homepage.css');
  new vm.Script(app);
  new vm.Script(await read('src/homepage.js'));
  assert.ok(Buffer.byteLength(css, 'utf8') < 24000, 'homepage CSS should stay compact');
  // The homepage easter egg was retired with the redesign; app.js is no longer loaded by index.html.
  assert.doesNotMatch(home, /id="wish-star"|id="secret-toast"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
