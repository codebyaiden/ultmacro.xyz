import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('shared navigation exposes Wiki guides at the exact sidebar collapse breakpoint', async () => {
  const js = await read('src/unified-shell.js');
  const css = await read('styles/unified-shell.css');
  new vm.Script(js);
  assert.match(js, /um-wiki-browse/);
  assert.match(js, /document\.getElementById\('nav-toggle'\)\?\.click\(\)/);
  assert.match(js, /attributeFilter:\['aria-expanded'\]/);
  assert.match(js, /min-width:1111px/);
  assert.match(css, /@media\(max-width:1110px\)/);
  assert.match(css, /\.um-menu-toggle,\.um-wiki-browse\{display:inline-flex\}/);
  assert.match(css, /\.um-primary\{display:none\}/);
  assert.match(css, /body\.um-unified-page \.search-overlay:not\(\[hidden\]\)\{z-index:180\}/);
});

test('shared menu supports animated dismissal without losing focus or keyboard access', async () => {
  const js = await read('src/unified-shell.js');
  const css = await read('styles/unified-shell.css');
  assert.match(js, /window\.clearTimeout\(closeTimer\)/);
  assert.match(js, /if \(menuOpen\) setOpen\(false\)/);
  assert.match(js, /document\.getElementById\('search-trigger'\)\?\.click\(\)/);
  assert.match(js, /mobile\.inert = !open/);
  assert.match(js, /mobile\.setAttribute\('aria-hidden',String\(!open\)\)/);
  assert.match(js, /setOpen\(false,true\)/);
  assert.match(js, /if\(e\.key==='Escape'\)/);
  assert.match(js, /if\(e\.key!=='Tab'\)return/);
  assert.match(js, /reduceMotion\.matches/);
  assert.match(css, /@keyframes um-nav-in/);
  assert.match(css, /@keyframes um-nav-out/);
  assert.match(css, /@keyframes um-scrim-in/);
  assert.match(css, /@keyframes um-scrim-out/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('Wiki search and sidebar return focus to visible controls', async () => {
  const js = await read('wiki/app.mjs');
  const css = await read('wiki/site.css');
  assert.match(js, /document\.querySelector\('\.um-wiki-browse'\) \|\| navToggle/);
  assert.match(js, /document\.querySelector\('button\.um-wiki-search'\)/);
  assert.match(js, /overlay\.inert=true/);
  assert.match(js, /overlay\.classList\.add\('is-closing'\)/);
  assert.match(js, /window\.clearTimeout\(searchCloseTimer\)/);
  assert.match(css, /body\.um-unified-page \.sidebar\{top:68px;z-index:152\}/);
  assert.match(css, /\.search-overlay\{z-index:190/);
  assert.match(css, /\.nav-group\[open\] \.nav-items/);
  assert.match(css, /\.helper-panel:not\(\[hidden\]\)/);
});

test('docs, guides and Strategy Network menus share fast, accessible motion', async () => {
  const apiJs = await read('wiki/api/app.mjs');
  const apiCss = await read('wiki/api/site.css');
  const guide = await read('styles/guide.css');
  const network = await read('styles/strategy-network.css');
  assert.match(apiJs, /panel\.getAnimations\(\)\.forEach/);
  assert.match(apiJs, /prefers-reduced-motion: reduce/);
  assert.match(apiCss, /\.mobile-index\[open\] nav/);
  assert.match(guide, /body\.um-unified-page \.toc a\.current/);
  assert.match(guide, /@keyframes um-guide-reveal/);
  assert.match(network, /@keyframes um-modal-in/);
  assert.match(network, /\.custom-select-trigger:focus-visible/);
  for (const css of [apiCss, guide, network]) assert.match(css, /prefers-reduced-motion:reduce/);
});
