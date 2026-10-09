import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { articles } from '../wiki/content.mjs';
import { proposedTopics } from '../wiki/catalog.mjs';
import { wikiManifest, markdownWikiArticle, wikiLlmsIndex, searchWiki } from '../wiki/retrieval.mjs';
import wikiApi from '../api/wiki.mjs';

const base = 'https://ultmacro.xyz';
const get = (path, options={}) => wikiApi(new Request(base+path,options));
const read = path => readFile(new URL('../'+path,import.meta.url),'utf8');

test('static manifest is compact, generated and excludes unverified research topics',async()=>{
  const raw=await read('wiki/api/v1/index.json');
  const manifest=JSON.parse(raw);
  assert.equal(raw,JSON.stringify(wikiManifest(articles))+'\n');
  assert.equal(manifest.total,articles.length);
  assert.equal(manifest.articles.length,articles.length);
  assert.ok(Buffer.byteLength(raw)<100000,'compact metadata index');
  assert.ok(!manifest.researchTopicsIncluded);
  const known=new Set(articles.map(x=>x.slug));
  assert.ok(manifest.articles.every(x=>known.has(x.slug)&&x.markdown.endsWith('/'+x.slug+'.md')));
  assert.ok(!manifest.articles.some(x=>proposedTopics.some(t=>t.slug===x.slug&&!known.has(t.slug))));
});

test('each published article has an exact readable static Markdown twin',async()=>{
  const unique=new Set();
  for(const a of articles) {
    assert.ok(!unique.has(a.slug),a.slug);
    unique.add(a.slug);
    const markdown=await read('wiki/api/v1/docs/'+a.slug+'.md');
    assert.equal(markdown,markdownWikiArticle(a),'stale Markdown for '+a.slug);
    assert.ok(markdown.startsWith('# '+a.title+'\n'),a.slug);
    assert.ok(markdown.includes('Source: '+a.source),a.slug);
    assert.ok(markdown.includes('Article: https://ultmacro.xyz/wiki/?article='+a.slug),a.slug);
  }
});

test('small llms.txt points to real published guides, not candidates',async()=>{
  const file=await read('wiki/llms.txt');
  assert.equal(file,wikiLlmsIndex(articles));
  assert.ok(file.startsWith('# Ultimate Macro Wiki\n'));
  assert.ok(file.includes('/wiki/api/v1/index.json'));
  assert.ok(!file.includes('778 verified'));
});

test('search ranks precise upgrade and recording guides above unrelated results',()=>{
  const upgrade=searchWiki(articles,'upgrade wrong path');
  assert.equal(upgrade[0].article.slug,'upgrade-not-working');
  assert.ok(upgrade[0].snippet.length>30);
  const recorder=searchWiki(articles,'record tower');
  assert.ok(recorder.slice(0,8).some(x=>x.article.slug==='record-strategy'));
  assert.deepEqual(searchWiki(articles,'the for and how are with can what why'),[]);
});

test('page and offset support bounded navigable pagination',async()=>{
  const page=await (await get('/api/wiki/v1/articles?page=2&limit=7')).json();
  assert.equal(page.data.length,7);
  assert.equal(page.pagination.page,2);
  assert.equal(page.pagination.offset,7);
  assert.ok(page.pagination.previous.includes('page=1'));
  assert.ok(page.pagination.next.includes('page=3'));
  const filtered=await (await get('/api/wiki/v1/articles?page=1&limit=5&category=Strategies')).json();
  assert.ok(filtered.data.every(x=>x.category==='Strategies'));
  assert.equal(filtered.pagination.total,articles.filter(x=>x.category==='Strategies').length);
  const old=await (await get('/api/wiki/v1/articles?offset=7&limit=7')).json();
  assert.deepEqual(old.data.map(x=>x.slug),page.data.map(x=>x.slug));
  assert.equal((await get('/api/wiki/v1/articles?page=2&offset=4')).status,400);
  assert.equal((await get('/api/wiki/v1/articles?page=0')).status,400);
});

test('search paginates ranked results with section excerpts and citations',async()=>{
  const res=await get('/api/wiki/v1/search?q=upgrade&limit=3&page=1');
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.data.length,3);
  assert.ok(body.pagination.next);
  assert.ok(body.data.every(x=>x.source&&x.url&&x.markdown&&x.snippet&&x.matchedSection));
  const second=await (await get(body.pagination.next)).json();
  assert.notEqual(second.data[0].slug,body.data[0].slug);
  assert.equal((await get('/api/wiki/v1/search?q=upgrade&limit=31')).status,400);
});

test('AI context returns only small source-linked excerpts and no synthetic answers',async()=>{
  const res=await get('/api/wiki/v1/context?q=wrong%20tower%20upgrade&limit=2');
  const body=await res.json();
  assert.equal(res.status,200);
  assert.ok(body.data.length<=2);
  assert.ok(body.data.every(x=>x.snippet.length<=350&&x.source&&x.url));
  assert.ok(body.note.includes('Not an AI answer'));
  assert.equal((await get('/api/wiki/v1/context?q=ocr&limit=6')).status,400);
});

test('one article supports JSON, markdown, HEAD and ETag',async()=>{
  const req='/api/wiki/v1/articles/install';
  const markdown=await get(req+'?format=md');
  assert.equal(markdown.status,200);
  assert.match(markdown.headers.get('content-type'),/text\/markdown/);
  assert.equal(await markdown.text(),markdownWikiArticle(articles.find(x=>x.slug==='install')));
  const json=await get(req);
  assert.equal((await json.json()).status,'published');
  const etag=markdown.headers.get('etag');
  assert.equal((await get(req+'?format=md',{headers:{'if-none-match':etag}})).status,304);
  const head=await get(req+'?format=md',{method:'HEAD'});
  assert.equal(await head.text(),'');
  assert.equal((await get(req+'?format=xml')).status,400);
});

test('discovery and OpenAPI describe compact index and context endpoints',async()=>{
  const discovery=await (await get('/api/wiki/v1')).json();
  assert.equal(discovery.totalPublished,articles.length);
  assert.ok(discovery.static.index.endsWith('/index.json'));
  const spec=await (await get('/api/wiki/v1/openapi.json')).json();
  assert.ok(spec.paths['/api/wiki/v1/context']);
  assert.ok(spec.paths['/api/wiki/v1/search']);
  assert.ok(spec.paths['/api/wiki/v1/articles/{slug}']);
});
