import test from 'node:test';
import assert from 'node:assert/strict';
import { probe, diagnose, runAudit } from '../scripts/check-wiki-deployment.mjs';

const pass = id => ({id,ok:true,status:200});
const miss = id => ({id,ok:false,status:404});
const wiki = fn => ['discovery','search','context'].map(fn);
const healthy = [pass('health'),...wiki(pass)];
const missingWiki = [pass('health'),...wiki(miss)];

test('deployment diagnosis separates local service revision from origin proxy', () => {
  assert.match(diagnose({
    publicResults:missingWiki,originResults:missingWiki,localResults:healthy
  }),/ORIGIN FAILS/);
  assert.match(diagnose({
    publicResults:missingWiki,originResults:missingWiki,localResults:missingWiki
  }),/LOCAL NODE WIKI ROUTES FAIL/);
  assert.match(diagnose({
    publicResults:missingWiki,originResults:missingWiki,
    localResults:[miss('health'),...wiki(miss)]
  }),/LOCAL SERVICE UNHEALTHY/);
  assert.match(diagnose({
    publicResults:missingWiki,originResults:healthy,localResults:healthy
  }),/PUBLIC FAILS/);
  assert.match(diagnose({
    publicResults:missingWiki,originResults:missingWiki,localResults:null
  }),/BOTH HOSTS RETURN 404/);
  assert.match(diagnose({
    publicResults:healthy,originResults:healthy,localResults:null
  }),/PASS/);
});

test('live probes are read-only, reject malformed 200 and report HTTP errors', async () => {
  let method, path;
  const fakeFetch = async (url,init) => {
    path = url;
    method = init.method;
    return new Response(JSON.stringify({totallyWrong:true}),{
      status:200,headers:{'content-type':'application/json'}
    });
  };
  const check = {id:'search',path:'/api/wiki/v1/search?q=ocr'};
  const malformed = await probe('https://example.org',check,fakeFetch);
  assert.equal(method,'GET');
  assert.match(path,/\/api\/wiki\/v1\/search/);
  assert.equal(malformed.ok,false);
  assert.equal(malformed.problem,'Unexpected response shape');

  const gone = await probe('https://example.org',check,async()=>new Response('missing',{status:404}));
  assert.equal(gone.status,404);
  assert.equal(gone.ok,false);
});

test('full audit validates static and dynamic endpoints with injected fetch', async () => {
  const calls=[];
  const staticBodies = {
    '/wiki/api/':'Find the right guide. Not a giant JSON file.',
    '/wiki/api/v1/index.json':JSON.stringify({total:1,articles:[{slug:'install',markdown:'https://e/docs/install.md',source:'/guide/install/'}]}),
    '/wiki/llms.txt':'# Ultimate Macro Wiki\n...',
    '/wiki/api/v1/docs/install.md':'# Install Ultimate Macro\nStatus: published\n'
  };
  const fakeFetch = async (url,init) => {
    const u=new URL(url);
    calls.push({host:u.host,path:u.pathname,method:init.method});
    let body=staticBodies[u.pathname];
    if(u.pathname==='/api/health') body=JSON.stringify({ok:true,service:'strategy-network'});
    if(u.pathname==='/api/wiki/v1') body=JSON.stringify({name:'Ultimate Macro Wiki API',totalPublished:127});
    if(u.pathname==='/api/wiki/v1/search' || u.pathname==='/api/wiki/v1/context')
      body=JSON.stringify({query:'test',data:[{slug:'install'}],total:1});
    if (u.host==='origin.example' && u.pathname.startsWith('/api/wiki/v1'))
      return new Response('missing',{status:404});
    return new Response(body||'missing',{status:body?200:404});
  };
  const result=await runAudit({
    publicBase:'https://public.example',
    originBase:'https://origin.example',
    fetchImpl:fakeFetch
  });
  assert.equal(result.staticReady,true);
  assert.equal(result.dynamicReady,true);
  assert.match(result.diagnosis,/ORIGIN/);
  assert.equal(calls.filter(c=>c.host==='public.example').length,8);
  assert.equal(calls.filter(c=>c.host==='origin.example').length,4);
  assert.ok(calls.every(c=>c.method==='GET'));
});

test('local audit resolves origin failure without changing server state',async()=>{
  const fakeFetch=async (url) => {
    const u=new URL(url);
    const isMissing=u.hostname==='origin.example' && u.pathname.startsWith('/api/wiki/v1');
    if (isMissing) return new Response('not found',{status:404});
    if (u.pathname==='/api/wiki/v1')
      return Response.json({name:'Ultimate Macro Wiki API',totalPublished:127});
    if (u.pathname.endsWith('/search') || u.pathname.endsWith('/context'))
      return Response.json({query:'test',total:1,data:[{slug:'install'}]});
    if (u.pathname==='/api/health')return Response.json({ok:true,service:'strategy-network'});
    if (u.pathname.endsWith('index.json'))
      return Response.json({total:1,articles:[{slug:'install',markdown:'https://e/a.md',source:'/guide/install/'}]});
    if (u.pathname.endsWith('install.md')) return new Response('# Install Ultimate Macro\nStatus: published');
    if (u.pathname.endsWith('llms.txt')) return new Response('# Ultimate Macro Wiki\n');
    return new Response('Find the right guide.');
  };
  const result=await runAudit({publicBase:'https://public.example',originBase:'https://origin.example',
    localBase:'http://127.0.0.1:3000',fetchImpl:fakeFetch});
  assert.equal(result.localResults.length,4);
  assert.match(result.diagnosis,/LOCAL NODE WORKS, ORIGIN FAILS/);
});
