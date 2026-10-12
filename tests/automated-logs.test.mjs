import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomatedLogsHandler, reportIsSafe } from '../api/automated-logs.mjs';
import { createHash } from 'node:crypto';
const fakeToken='q'.repeat(64);
const fakeDigest=createHash('sha256').update(fakeToken).digest('hex');
const prefix = 'https://ultmacro.xyz/api/automated-logs/v1';
const run='0123456789abcdef0123456789abcdef';
const text='ULTIMATE MACRO - AUTOMATED LOGS v1\nrun_id='+run+'\nconsent=yes\nstart=launch\nfinished_at=2026-10-12 13:00:00\nresult=Triumph\n';
function fixture() {
  let encrypted, enabled=false, posts=0, deny=false;
  const runs=new Map();
  const db=async (sql,args=[])=>{
    const query=sql.toLowerCase();
    if(query.startsWith('create table'))return [];
    if(query.startsWith('select enabled,encrypted_webhook'))return encrypted?[{enabled,encrypted_webhook:encrypted}]:[];
    if(query.startsWith('select enabled, encrypted_webhook'))return encrypted?[{enabled,encrypted_webhook:encrypted}]:[];
    if(query.startsWith('insert into um_qa_logs_config')){encrypted=args[0];enabled=true;return []}
    if(query.startsWith('update um_qa_logs_config')){enabled=false;return []}
    if(query.startsWith('insert into um_qa_log_runs')){
      if(!runs.has(args[0])){runs.set(args[0],'processing');return [{run_id:args[0]}];}
      if(runs.get(args[0])==='failed'){runs.set(args[0],'processing');return [{run_id:args[0]}];}
      return [];
    }
    if(query.startsWith('select status'))return [{status:runs.get(args[0])}];
    if(query.startsWith('update um_qa_log_runs')){runs.set(args[0],query.includes("status='sent'")?'sent':'failed');return []}
    throw new Error('Unexpected DB SQL: '+sql);
  };
  const fetcher=async(url,args)=>{posts++;assert.match(url,/discord\.com\/api\/webhooks/);assert.equal(args.redirect,'error');const payload=JSON.parse(args.body.get('payload_json'));assert.deepEqual(payload.allowed_mentions,{parse:[]});assert.ok(args.body.get('files[0]'));return {status:deny?503:204};};
  const handler=createAutomatedLogsHandler({db,fetcher,getSession:async()=>({ok:true}),limiter:async()=>({allowed:true}),secret:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',tokenDigest:fakeDigest});
  return {handler,posts:()=>posts,deny:v=>deny=v};
}
async function req(fn,route,method='GET',body,headers={}){
  const request=new Request(prefix+route,{method,headers,body});const response=await fn(request);return [response.status,await response.json()];
}
const validWebhook='https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvWXYZABCDEFGHIJKLMNOPQRSTuvwxYZabcd';
test('validation drops private data and requires consent',()=>{
  assert.equal(reportIsSafe(text,run),true);
  assert.equal(reportIsSafe(text.replace('consent=yes','consent=no'),run),false);
  assert.equal(reportIsSafe(text+'password=hello\n',run),false);
  assert.equal(reportIsSafe(text+'https://example.com\n',run),false);
  assert.equal(reportIsSafe(text+'a@b.com\n',run),false);
  assert.equal(reportIsSafe(text,'z'.repeat(32)),false);
});
test('missing auth returns 401, invalid report 422, health redacted',async()=>{
  const f=fixture();assert.equal((await req(f.handler,'/reports','POST',text,{'x-um-run-id':run,'content-type':'text/plain'}))[0],401);
  const [health,data]=await req(f.handler,'/health');assert.equal(health,200);assert.equal(data.receiving,false);
});
test('admin config requires valid webhook and delivers test, can disable',async()=>{
  const f=fixture();
  assert.equal((await req(f.handler,'/admin/config','POST',JSON.stringify({webhook:'http://127.0.0.1:3000/evil'}),{'content-type':'application/json'}))[0],422);
  assert.equal((await req(f.handler,'/admin/config','POST',JSON.stringify({webhook:validWebhook}),{'content-type':'application/json'}))[0],200);
  assert.equal((await req(f.handler,'/health'))[1].receiving,true);
  assert.equal((await req(f.handler,'/admin/test','POST','{}',{'content-type':'application/json'}))[0],200);
  assert.equal(f.posts(),1);
  assert.equal((await req(f.handler,'/admin/disable','POST','{}',{'content-type':'application/json'}))[0],200);
  assert.equal((await req(f.handler,'/health'))[1].receiving,false);
});
test('admin config blocks non-admin',async()=>{
 const f=createAutomatedLogsHandler({db:async()=>[],getSession:async()=>null,secret:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
 assert.equal((await req(f,'/admin/config','POST',JSON.stringify({webhook:validWebhook}),{'content-type':'application/json'}))[0],401);
});

test('valid upload forwards to Discord once, never repeats',async()=>{
 const f=fixture();await req(f.handler,'/admin/config','POST',JSON.stringify({webhook:validWebhook}),{'content-type':'application/json'});
 const headers={'authorization':'Bearer '+fakeToken,'x-um-run-id':run,'content-type':'text/plain'};
 assert.equal((await req(f.handler,'/reports','POST',text,headers))[0],202);
 assert.equal(f.posts(),1);
 assert.equal((await req(f.handler,'/reports','POST',text,headers))[0],200);
 assert.equal(f.posts(),1);
});
test('invalid uploaded report rejected before Discord and safe retry on delivery error',async()=>{
 const f=fixture();await req(f.handler,'/admin/config','POST',JSON.stringify({webhook:validWebhook}),{'content-type':'application/json'});
 const headers={'authorization':'Bearer '+fakeToken,'x-um-run-id':run,'content-type':'text/plain'};
 assert.equal((await req(f.handler,'/reports','POST',text.replace('consent=yes','consent=no'),headers))[0],422);
 assert.equal(f.posts(),0);
 f.deny(true);assert.equal((await req(f.handler,'/reports','POST',text,headers))[0],503);
 f.deny(false);assert.equal((await req(f.handler,'/reports','POST',text,headers))[0],202);
 assert.equal(f.posts(),2);
});
