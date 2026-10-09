import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';

async function unusedPort() {
  const listener=net.createServer();
  await new Promise((resolve,reject)=>{
    listener.once('error',reject);
    listener.listen(0,'127.0.0.1',resolve);
  });
  const port=listener.address().port;
  await new Promise(resolve=>listener.close(resolve));
  return port;
}

test('standalone HTTP server routes Wiki Ask without changing other APIs', { timeout: 20000 }, async()=>{
  const port=await unusedPort();
  const child=spawn(process.execPath,['server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,
      HOST:'127.0.0.1',PORT:String(port),
      DATABASE_URL:'',STRATEGY_HASH_SECRET:'',
      WIKI_ASK_AI_ENABLED:'0',
    },
    stdio:['ignore','pipe','pipe'],
  });
  let errors='';
  child.stderr.on('data',chunk=>{errors+=String(chunk).slice(0,1000)});
  try {
    await new Promise((resolve,reject)=>{
      child.stdout.once('data',resolve);
      child.once('exit',code=>reject(new Error('Test HTTP server exited '+code+': '+errors)));
      child.once('error',reject);
    });
    const base='http://127.0.0.1:'+port;
    const discovery=await fetch(base+'/api/wiki/v1');
    assert.equal(discovery.status,200);
    assert.equal((await discovery.json()).endpoints.ask,'/api/wiki/v1/ask');

    const search=await fetch(base+'/api/wiki/v1/search?q=ocr&limit=2');
    assert.equal(search.status,200);
    assert.equal((await search.json()).data.length,2);

    const context=await fetch(base+'/api/wiki/v1/context?q=upgrade&limit=2');
    assert.equal(context.status,200);
    assert.ok((await context.json()).data.length>0);

    const markdown=await fetch(base+'/api/wiki/v1/articles/install?format=md');
    assert.equal(markdown.status,200);
    assert.match(markdown.headers.get('content-type'),/text\/markdown/);
    assert.match(await markdown.text(),/^# Install Ultimate Macro/);

    const request=body=>fetch(base+'/api/wiki/v1/ask',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(body),
    });
    const answered=await request({question:"Why won't my towers upgrade?"});
    assert.equal(answered.status,200);
    assert.equal(answered.headers.get('cache-control'),'no-store');
    const answer=await answered.json();
    assert.equal(answer.status,'answered');
    assert.equal(answer.ai_used,false);
    assert.equal(answer.citations[0].slug,'upgrade-not-working');
    assert.ok(answer.answer.includes('cash'));

    const unknown=await request({question:'How do I make coffee?'});
    assert.equal(unknown.status,200);
    const missing=await unknown.json();
    assert.equal(missing.status,'not_found');
    assert.equal(missing.answer,null);
    assert.deepEqual(missing.citations,[]);

    const unreleased=await request({question:'How do I record a strategy?',version:'v1.4.0'});
    assert.equal((await unreleased.json()).status,'not_found');

    assert.equal((await fetch(base+'/api/wiki/v1/ask')).status,405);
    const options=await fetch(base+'/api/wiki/v1/ask',{method:'OPTIONS'});
    assert.equal(options.status,204);
    assert.match(options.headers.get('access-control-allow-headers'),/Content-Type/);
    assert.equal((await request({question:'a'.repeat(2200)})).status,413);
    assert.equal((await fetch(base+'/api/not-a-real-route')).status,404);
  } finally {
    if(child.exitCode===null) {
      const finished=new Promise(resolve=>child.once('exit',resolve));
      child.kill('SIGTERM');
      await finished;
    }
  }
});
