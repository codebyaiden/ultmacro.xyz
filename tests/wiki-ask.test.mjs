import test from 'node:test';
import assert from 'node:assert/strict';
import { articles } from '../wiki/content.mjs';
import { proposedTopics } from '../wiki/catalog.mjs';
import { createWikiAskEngine } from '../wiki/ask.mjs';
import { makeWikiSynthesizer } from '../api/wiki-synthesis.mjs';
import api from '../api/wiki.mjs';

const ask = createWikiAskEngine(articles).ask;
const post = (payload, headers={'content-type':'application/json'}) =>
  api(new Request('https://ultmacro.xyz/api/wiki/v1/ask',{
    method:'POST',headers,body:typeof payload==='string'?payload:JSON.stringify(payload),
  }));

test('source answer routes canonical questions to the correct section',async()=>{
  for(const [question,slug] of [
    ["Why won't my towers upgrade?",'upgrade-not-working'],
    ['How do I record a strategy?','record-strategy'],
    ['Where are recordings saved?','where-recordings-are-saved'],
    ['How do I reinstall without losing my strategies?','profiles'],
    ['Why is OCR not reading waves?','ocr-errors'],
    ['How do I import a profile safely?','profile-import'],
    ['What is UpgradeTower syntax?','strat-upgradetower'],
    ["My towers won't place in the right position.",'wrong-clicks'],
  ]) {
    const result=await ask({question});
    assert.equal(result.status,'answered',question);
    assert.equal(result.citations[0].slug,slug,question);
    assert.equal(result.answer_type,'extractive');
    assert.equal(result.citations.length,1,'Extractive answers cite only the section actually used');
    assert.equal(result.ai_used,false);
    assert.ok(result.answer.length>20);
    assert.ok(result.citations[0].url.includes('/wiki/?article='));
    assert.ok(result.citations[0].source);
    assert.ok(result.citations[0].version);
  }
});

test('no invented answers for unrelated, unsupported or insufficient questions',async()=>{
  for(const question of [
    'How do I make coffee?',
    "What's my Bancolombia password?",
    'What are the v1.4 remote features?',
    'Tell me how to hack someone’s Roblox account',
  ]) {
    const result=await ask({question});
    assert.equal(result.status,'not_found',question);
    assert.equal(result.answer,null);
    assert.deepEqual(result.citations,[]);
  }
});

test('release filter is enforced and future versions do not inherit old instructions',async()=>{
  const source=await ask({question:'How do I record a strategy?',version:'v1.3.5'});
  assert.equal(source.status,'answered');
  const future=await ask({question:'How do I record a strategy?',version:'v1.4.0'});
  assert.equal(future.status,'not_found');
  assert.equal(future.answer,null);
  const invalid=await ask({question:'How do I record a strategy?',version:'v1.4; rm -rf /'});
  assert.match(invalid.error,/version/);
});

test('candidate research topics cannot be cited as published guides',async()=>{
  const known=new Set(articles.map(a=>a.slug));
  const research=new Set(proposedTopics.filter(t=>!known.has(t.slug)).map(t=>t.slug));
  for(const question of ['upgrade wrong path','record strategy','OCR wave','profile import','Roblox disconnect']) {
    const result=await ask({question});
    for(const ref of [...(result.citations||[]),...(result.related||[])]) {
      assert.ok(known.has(ref.slug),ref.slug);
      assert.ok(!research.has(ref.slug),ref.slug);
    }
  }
});

test('cache is bounded and repeat questions avoid rerunning a synthesizer',async()=>{
  let calls=0;
  const engine=createWikiAskEngine(articles,{
    synthesizer:async()=>{calls++;return 'Here is a sourced summary of the relevant instructions.';},
  });
  const input={question:'How do I record a strategy?',mode:'ai'};
  const first=await engine.ask(input);
  const second=await engine.ask(input);
  assert.equal(first.cache,'miss');
  assert.equal(second.cache,'hit');
  assert.equal(first.answer_type,'ai_draft');
  assert.equal(second.ai_used,true);
  assert.equal(calls,1);
});

test('optional AI is off by default and falls back to sources on failure or exhausted budget',async()=>{
  const offline=await ask({question:'How do I record a strategy?',mode:'ai'});
  assert.equal(offline.ai_used,false);
  assert.equal(offline.ai_status,'disabled');
  assert.equal(offline.answer_type,'extractive');

  let calls=0;
  const engine=createWikiAskEngine(articles,{
    maxAiCallsPerHour:1,
    synthesizer:async()=>{calls++;return 'A concise source-linked summary of the relevant Wiki section.';}
  });
  const first=await engine.ask({question:'How do I record a strategy?',mode:'ai'});
  const second=await engine.ask({question:'Why won’t my towers upgrade?',mode:'ai'});
  assert.equal(first.ai_used,true);
  assert.equal(second.ai_used,false);
  assert.equal(second.ai_status,'budget_exhausted');
  assert.equal(second.answer_type,'extractive');
  assert.equal(calls,1);

  const broken=createWikiAskEngine(articles,{synthesizer:async()=>{throw Error('provider down');}});
  const fallback=await broken.ask({question:'How do I record a strategy?',mode:'ai'});
  assert.equal(fallback.ai_status,'provider_unavailable');
  assert.ok(fallback.answer);
  const refusal=createWikiAskEngine(articles,{synthesizer:async()=> 'UNSUPPORTED'});
  const refused=await refusal.ask({question:'How do I record a strategy?',mode:'ai'});
  assert.equal(refused.ai_used,false);
  assert.equal(refused.answer_type,'extractive');
});

test('AI provider adapter needs explicit server-side configuration',async()=>{
  assert.equal(makeWikiSynthesizer({}),null);
  assert.equal(makeWikiSynthesizer({WIKI_ASK_AI_ENABLED:'1',WIKI_ASK_AI_URL:'http://localhost:9000/v1/chat/completions',WIKI_ASK_AI_MODEL:'m',WIKI_ASK_AI_KEY:'hidden'}),null);
  let received;
  const adapter=makeWikiSynthesizer({
    WIKI_ASK_AI_ENABLED:'1',
    WIKI_ASK_AI_URL:'https://ai.example.org/v1/chat/completions',
    WIKI_ASK_AI_MODEL:'small',
    WIKI_ASK_AI_KEY:'hidden',
  },async(url,init)=>{
    received={url:String(url),method:init.method,options:JSON.parse(init.body),headers:init.headers};
    return new Response(JSON.stringify({choices:[{message:{content:'This is a draft based on the provided excerpt.'}}]}),{status:200});
  });
  const answer=await adapter({question:'How do I record a strategy?',evidence:[{
    title:'Record a strategy',section:'Record and save',version:'v1.3.5',
    url:'https://ultmacro.xyz/wiki/?article=record-strategy',text:'Open Create → Record a Strategy.'
  }]});
  assert.match(answer,/draft/);
  assert.equal(received.method,'POST');
  assert.equal(received.options.max_tokens,240);
  assert.ok(received.options.messages[1].content.includes('Record a strategy'));
  assert.equal(received.headers.authorization,'Bearer hidden');
});

test('POST /ask returns cited answers and no-store; GET /ask and other POST routes are denied',async()=>{
  const response=await post({question:'Why won’t my towers upgrade?'});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();
  assert.equal(body.status,'answered');
  assert.equal(body.citations[0].slug,'upgrade-not-working');
  assert.equal((await api(new Request('https://ultmacro.xyz/api/wiki/v1/ask'))).status,405);
  assert.equal((await api(new Request('https://ultmacro.xyz/api/wiki/v1/search',{method:'POST'}))).status,405);
  const options=await api(new Request('https://ultmacro.xyz/api/wiki/v1/ask',{method:'OPTIONS'}));
  assert.equal(options.status,204);
  assert.match(options.headers.get('access-control-allow-headers'),/Content-Type/);
});

test('POST /ask enforces bounded JSON schema and rejects oversized payloads',async()=>{
  for(const payload of [
    {question:'x'},
    {question:'How do I record a strategy?',mode:'invent'},
    {question:'How do I record a strategy?',version:'vNext'},
    {question:'How do I record a strategy?',other:'bad'},
    {question:42},
  ]) assert.equal((await post(payload)).status,400);
  assert.equal((await post('garbled JSON')).status,400);
  assert.equal((await post({question:'How do I record a strategy?'},{'content-type':'text/plain'})).status,415);
  assert.equal((await post({question:'Z'.repeat(2050)})).status,413);
  const notFound=await (await post({question:'How do I make coffee?'})).json();
  assert.equal(notFound.status,'not_found');
  assert.equal(notFound.answer,null);
});

test('OpenAPI advertises POST /ask and API discovery includes it',async()=>{
  const spec=await (await api(new Request('https://ultmacro.xyz/api/wiki/v1/openapi.json'))).json();
  assert.ok(spec.paths['/api/wiki/v1/ask'].post);
  assert.equal(spec.paths['/api/wiki/v1/ask'].post.requestBody.content['application/json'].schema.required[0],'question');
  const home=await (await api(new Request('https://ultmacro.xyz/api/wiki/v1'))).json();
  assert.equal(home.endpoints.ask,'/api/wiki/v1/ask');
});
