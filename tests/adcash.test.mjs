import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('src/advertising.js',root),'utf8');
const config=JSON.parse(await readFile(new URL('data/advertising.json',root),'utf8'));
async function pages(dir=''){
 const result=[];
 for(const e of await readdir(new URL(dir,root),{withFileTypes:true})){
  if(e.name.startsWith('.')||['node_modules','tests','audit-evidence'].includes(e.name))continue;
  if(e.isDirectory())result.push(...await pages(`${dir}${e.name}/`));
  else if(e.name.endsWith('.html'))result.push(`${dir}${e.name}`);
 }
 return result;
}
function environment(path='/',value=config){
 const appended=[];const context={window:{},location:{pathname:path},fetch:async()=>({ok:true,json:async()=>value}),document:{getElementById:()=>null,createElement:()=>({attributes:{},setAttribute(key,value){this.attributes[key]=value;}}),head:{appendChild:s=>appended.push(s)}}};vm.createContext(context);return {context,appended};
}
test('dashboard pages never load ads; public pages use at most one approved loader',async()=>{
 let count=0;
 for(const file of await pages()){
  const html=await readFile(new URL(file,root),'utf8');if(!/<head\b/i.test(html))continue;
  const dashboard=file.startsWith('dashboard/');
  const loaders=(html.match(/src="\/src\/advertising\.js\?v=adcash-selfhost-20261021"/g)||[]).length;
  assert.ok(loaders<=1,file);
  if(dashboard)assert.equal(loaders,0,file);else count+=loaders;
  assert.doesNotMatch(html,/runAutoTag|acscdn\.com|src="[^" ]*adcash\.js|accountut\.com|bellnewyork\.org/,file);
 }
 assert.ok(count>0,'approved loader remains available on opted-in public pages');
});
test('approved Adcash library loads once and invokes the screenshot zone only after loading',async()=>{
 assert.equal(config.provider,'Adcash');assert.equal(config.enabled,true);assert.equal(config.ownerApproved,true);assert.equal(config.reviewApproved,true);assert.equal(config.format,'AutoTag');assert.equal(config.zoneId,'nmmtb0xi2i');
 const e=environment();const calls=[];e.context.window.aclib={runAutoTag:value=>calls.push(value.zoneId)};
 await vm.runInContext(code,e.context);await vm.runInContext(code,e.context);assert.equal(e.appended.length,1);assert.equal(e.appended[0].src,config.scriptUrl);assert.equal(e.appended[0].id,'aclib');assert.equal(calls.length,0);e.appended[0].onload();assert.deepEqual(calls,['nmmtb0xi2i']);
 const existing=environment();existing.context.document.getElementById=()=>({});await vm.runInContext(code,existing.context);assert.equal(existing.appended.length,0);
});
test('disabled, malformed or changed-provider config cannot load ads',async()=>{
 for(const value of [null,{}, {...config,enabled:false},{...config,ownerApproved:false},{...config,reviewApproved:false},{...config,enabled:'true'},{...config,provider:'Adsterra'},{...config,zoneId:'old-zone'},{...config,format:'Social Bar'},{...config,scriptUrl:'https://example.com/other.js'}]){const e=environment('/',value);await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);}
 for(const fetcher of [async()=>{throw Error('offline')},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('invalid')}})]){const e=environment();e.context.fetch=fetcher;await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);}
});
test('sensitive workflows and frames never load popunders',async()=>{
 for(const path of ['/internal/qa-logs/','/poll/team/','/api/auth','/poll/','/moderatorapplication/','/privacy/','/terms/','/memberships/','/strategies/','/report/','/p/test/','/dashboard/','/dashboard/activity/']){const e=environment(path);await vm.runInContext(code,e.context);assert.equal(e.appended.length,0,path);}
 const frame=environment();frame.context.window.top={};frame.context.window.self={};await vm.runInContext(code,frame.context);assert.equal(frame.appended.length,0);
});

test('self-hosted library requires an explicit matching switch and URL',async()=>{
 const enabled={...config,selfHostedEnabled:true,scriptUrl:'/assets/adcash-library'};
 const e=environment('/',enabled);await vm.runInContext(code,e.context);assert.equal(e.appended.length,1);assert.equal(e.appended[0].src,'/assets/adcash-library');
 for(const value of [{...enabled,selfHostedEnabled:false},{...enabled,selfHostedEnabled:'true'},{...enabled,scriptUrl:'https://example.com/library'},{...config,selfHostedEnabled:true,scriptUrl:'https://acscdn.com/script/aclib.js'}]){const e=environment('/',value);await vm.runInContext(code,e.context);assert.equal(e.appended.length,0);}
 const standard=environment('/',{...config,selfHostedEnabled:false,scriptUrl:'https://acscdn.com/script/aclib.js'});await vm.runInContext(code,standard.context);assert.equal(standard.appended.length,1);assert.equal(standard.appended[0].src,'https://acscdn.com/script/aclib.js');
});
test('cached old Adcash entry point is inert and first-party loader never intercepts navigation',async()=>{
 const legacy=await readFile(new URL('src/adcash.js',root),'utf8');assert.doesNotMatch(legacy,/runAutoTag|acscdn|createElement/);
 assert.doesNotMatch(code,/preventDefault|stopPropagation|stopImmediatePropagation|window\.open|localStorage|sessionStorage|setInterval|setTimeout|bellnewyork/);
 const download=await readFile(new URL('src/download.js',root),'utf8');assert.doesNotMatch(download.slice(download.indexOf("link.addEventListener('click'"),download.indexOf('var reveals')),/preventDefault/);
});
