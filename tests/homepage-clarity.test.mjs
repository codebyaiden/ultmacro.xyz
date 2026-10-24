import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('homepage has concise, accessible mobile-first sections', async () => {
  const home = await read('index.html');
  const css = await read('styles/home-rework.css');
  assert.match(home, /Watch on YouTube/);
  assert.match(home, /earlier build/);
  assert.match(home, /styles\/home-rework\.css\?v=1/);
  assert.match(home, /<body class="home-rework">/);
  for (const key of ['F1', 'F2', 'F3']) assert.match(home, new RegExp('<kbd>' + key + '</kbd>'));
  for (const title of ['Your strategy.', 'Replay a full run', 'Cut repetitive setup', 'Use shared strategies', 'Three steps. One run.']) {
    assert.ok(home.includes(title), title);
  }
  for (const removed of ['interface-section', 'runtime-section', 'recorder-section', 'requirements-heading', 'download-panel', 'field-notes', 'id="record-action"']) {
    assert.ok(!home.includes(removed), 'retired UI should not be on homepage: ' + removed);
  }
  assert.equal((home.match(/<section\b/g) || []).length, 6);
  assert.match(css, /home-value-section/);
  assert.match(css, /home-setup-steps/);
  assert.match(css, /site-sky-moon/);
  assert.match(css, /@media\(max-width:520px\)/);
});

test('every guide variant uses F3 to stop a v1.3.6 main strategy', async () => {
  for (const name of ['', 'requirements/', 'install/', 'display/', 'first-run/', 'recording/', 'sessions/', 'discord/', 'tools/', 'troubleshooting/', 'safety/']) {
    const page = await read('guide/' + name + 'index.html');
    assert.match(page, /F2<\/span> pauses or resumes/);
    assert.match(page, /F3<\/span> to stop it/);
    assert.doesNotMatch(page, /F2<\/span> stops the macro/);
  }
});

test('optional sky secrets and recorder sample are syntactically valid', async () => {
  const home = await read('index.html');
  const app = await read('app.js');
  const css = await read('styles.css');
  new vm.Script(app);
  assert.match(home, /id="wish-star"/);
  assert.match(home, /id="secret-toast"/);
  assert.match(app, /ArrowUp/);
  assert.match(app, /\[contenteditable\]/);
  assert.match(app, /Wish logged/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});