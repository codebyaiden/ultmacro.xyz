import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('hero explains current controls, avoids false demo promises and offers manual checks', async () => {
  const home = await read('index.html');
  const css = await read('styles.css');
  assert.match(home, /Watch on YouTube/);
  assert.doesNotMatch(home, /See it in action/);
  assert.match(home, /earlier build/);
  for (const key of ['F1', 'F2', 'F3']) assert.match(home, new RegExp('<kbd>' + key + '</kbd>'));
  assert.doesNotMatch(home, /class="runtime-section section"/);
  assert.match(home, /Manual ready check/);
  assert.equal((home.match(/<input type="checkbox" \/>/g) || []).length, 9);
  assert.doesNotMatch(home, /<input type="checkbox" checked disabled \/>/);
  assert.match(css, /\.hero-actions \.button\{color:#f9fbff!important/);
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
  assert.match(app, /no strategy file was saved/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});