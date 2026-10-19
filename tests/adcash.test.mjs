import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('src/adcash.js',root),'utf8');
async function pages(dir=''){
 const result=[];
 for(const e of await readdir(new URL(dir,root),{withFileTypes:true})){
  if(e.name.startsWith('.')||['node_modules','tests','audit-evidence'].includes(e.name))continue;
  if(e.isDirectory())result.push(...await pages(`${dir}${e.name}/`));
  else if(e.name.endsWith('.html'))result.push(`${dir}${e.name}`);
 }
 return result;
}
test('every public HTML content page uses one shared current ad loader; protected pages have none',async()=>{
 let count=0;
 for(const path of await pages()){
  const html=await readFile(new URL(path,root),'utf8');
  if(!/<head\b/i.test(html))continue;
  const exempt=/^(internal\/|poll\/team\/)/.test(path)||/http-equiv="refresh"/i.test(html);
  assert.equal((html.match(/src="\/src\/adcash\.js\?v=20261019"/g)||[]).length,exempt?0:1,path);
  assert.doesNotMatch(html,/runAutoTag|acscdn\.com|wyaaxdqzpl/,path);
  if(!exempt)count++;
 }
 assert.ok(count>=30,`only ${count} public pages covered`);
});
function environment(path='/',config={enabled:true,reviewApproved:true}){
 const appended=[],calls=[];
 const context={location:{pathname:path},fetch:async()=>({ok:true,json:async()=>config}),window:{},document:{getElementById:()=>null,createElement:()=>({addEventListener(event,fn){this[event]=fn;}}),head:{appendChild(s){appended.push(s);}}}};
 vm.createContext(context);return {context,appended,calls};
}
test('explicit reviewed enable loads HTTPS library and initializes once',async()=>{
 const e=environment();await vm.runInContext(code,e.context);await vm.runInContext(code,e.context);
 assert.equal(e.appended.length,1);assert.equal(e.appended[0].src,'https://acscdn.com/script/aclib.js');
 e.context.window.aclib={runAutoTag:arg=>e.calls.push(arg.zoneId)};e.appended[0].load();
 e.appended[0].load();
 assert.deepEqual(e.calls,['nvfhwgcmud']);
});
test('reuses an existing library, tolerates provider failure, excludes sensitive paths and frames',async()=>{
 const e=environment();e.context.window.aclib={runAutoTag(){throw Error('blocked')}};await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);
 for(const path of ['/internal/qa-logs/','/poll/team/','/api/auth','/poll/','/moderatorapplication/','/privacy/','/terms/','/memberships/','/strategies/','/p/test/']){const x=environment(path);await vm.runInContext(code,x.context);assert.equal(x.appended.length,0);}
 const frame=environment();frame.context.window.top={};frame.context.window.self={};await vm.runInContext(code,frame.context);assert.equal(frame.appended.length,0);
 const blocked=environment();await vm.runInContext(code,blocked.context);assert.doesNotThrow(()=>blocked.appended[0].load());
});
test('checked-in production configuration is off and never loads provider even if aclib exists',async()=>{
 const config=JSON.parse(await readFile(new URL('data/advertising.json',root),'utf8'));
 assert.equal(config.enabled,false);assert.equal(config.reviewApproved,false);
 const e=environment('/',config);e.context.window.aclib={runAutoTag:()=>e.calls.push('unexpected')};await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);assert.deepEqual(e.calls,[]);
});
test('missing, malformed, rejected and unavailable config fail closed',async()=>{
 for(const config of [null,{}, {enabled:'true',reviewApproved:true},{enabled:true,reviewApproved:false}]){const e=environment('/',config);await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);}
 for(const fetcher of [async()=>{throw Error('offline')},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('bad json')}})]){const e=environment();e.context.fetch=fetcher;await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);}
});
test('loader never binds input, navigation, click rewards or query/storage reactivation',()=>{
 assert.doesNotMatch(code,/preventDefault|stopPropagation|stopImmediatePropagation|window\.open|location\.(?:assign|replace|href|search)|localStorage|sessionStorage|setInterval|setTimeout/);
 assert.match(code,/cache: 'no-store'/);
});
test('actual download feedback keeps the very first anchor click and modifier-click uncancelled with ads off',async()=>{
 const handlers={};let cancelled=0;const label={textContent:'Download'};
 const link={querySelector:()=>label,classList:{add(){},remove(){}},getAttribute:()=> 'Download v1.3.6 for Windows',closest:()=>null,addEventListener:(event,fn)=>{handlers[event]=fn;}};
 const e=environment('/',{enabled:false,reviewApproved:false});
 e.context.clearTimeout=()=>{};e.context.setTimeout=()=>0;
 e.context.window.matchMedia=()=>({matches:true,addEventListener(){}});
 const year={},status={};
 e.context.document.querySelector=selector=>selector==='.download-page'?{}:selector==='[data-year]'?year:selector==='[data-download-status]'?status:null;
 e.context.document.querySelectorAll=selector=>selector==='[data-download]'?[link]:[];
 await vm.runInContext(code,e.context);
 vm.runInContext(await readFile(new URL('src/download.js',root),'utf8'),e.context);
 handlers.click({button:0,preventDefault(){cancelled++}});
 assert.equal(cancelled,0);assert.match(status.textContent,/Starting download/);assert.equal(e.appended.length,0);
 handlers.click({button:0,ctrlKey:true,preventDefault(){cancelled++}});assert.equal(cancelled,0);
});
