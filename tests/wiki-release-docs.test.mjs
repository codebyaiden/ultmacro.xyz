import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseVerifiedArticles } from '../wiki/content-release-v135.mjs';
import { stratReferenceArticles } from '../wiki/content-strat-reference.mjs';
import { articles } from '../wiki/content.mjs';

const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');

test('release-based sources are explicit and pinned to v1.3.5', () => {
  assert.equal(releaseVerifiedArticles.length,19);
  assert.equal(stratReferenceArticles.length,18);
  const pinned = [...releaseVerifiedArticles,...stratReferenceArticles];
  for (const item of pinned){
    assert.match(item.source,/^https:\/\/github.com\/UltimateMacro\/Ultimate-Macro-New-Era\/blob\/v1\.3\.5\//);
    assert.ok(item.version.includes('v1.3.5'));
    assert.ok(item.summary.length>=20);
    assert.ok(item.sections.length>=2);
  }
});

test('strategy command pages have usable syntax, example and parameters', () => {
  const slugs = new Set(stratReferenceArticles.map(x=>x.slug));
  assert.equal(slugs.size,stratReferenceArticles.length);
  for(const item of stratReferenceArticles){
    const body=item.sections.map(x=>x.paragraphs.join(' ')).join(' ');
    assert.match(body,/Syntax:/);
    assert.ok(item.sections.some(x=>typeof x.code==='string'&&x.code.trim().length>4));
    assert.ok(item.sections.every(s=>s.title));
  }
  for(const slug of ['strat-spawntower','strat-upgradetower','strat-changetargets','strat-setdjtrack','strat-enforcerreposition']){
    assert.ok(slugs.has(slug),slug);
  }
});

test('static Wiki JSON mirrors article source and includes copyable examples',async()=>{
  const dataset=JSON.parse(await read('wiki/api/v1/articles.json'));
  assert.equal(dataset.articles.length,articles.length);
  assert.equal(articles.length,127);
  const known=new Map(articles.map(a=>[a.slug,a]));
  for(const guide of dataset.articles) {
    assert.ok(known.has(guide.slug),'unexpected '+guide.slug);
    assert.equal(guide.source,known.get(guide.slug).source);
  }
  assert.ok(dataset.articles.some(a=>a.sections.some(s=>s.code?.includes('SpawnTower('))));
});

test('the wiki renderer shows copyable source code and real project imagery',async()=>{
  const app=await read('wiki/app.mjs');
  const css=await read('wiki/site.css');
  assert.match(app,/if\(sec\.code\)/);
  assert.match(app,/navigator\.clipboard\.writeText\(sec\.code\)/);
  assert.match(css,/\.doc-code-copy/);
  const first=articles.find(a=>a.slug==='first-run');
  assert.match(first.illustration.src,/assets\/ui\/ultimate-macro-main-new\.png/);
  assert.match(first.illustration.caption,/may differ between installed releases/);
});

test('no research topic can masquerade as a confirmed bug', async()=>{
  const catalog=await read('wiki/catalog.mjs');
  const app=await read('wiki/app.mjs');
  assert.match(catalog,/Proposed article index/);
  assert.match(app,/resolveTopicGuidance/);
  assert.match(app,/This exact topic has not been independently tested/);
});
