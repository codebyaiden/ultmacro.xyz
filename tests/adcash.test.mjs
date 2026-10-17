import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('src/adcash.js',root),'utf8');
async function pages(dir=''){
 const result=[];
 for(const e of await readdir(new URL(dir,root),{withFileTypes:true})){
  if(e.name.startsWith('.')||['node_modules','tests'].includes(e.name))continue;
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
  assert.equal((html.match(/src="\/src\/adcash\.js\?v=20261017"/g)||[]).length,exempt?0:1,path);
  assert.doesNotMatch(html,/runAutoTag|acscdn\.com|wyaaxdqzpl/,path);
  if(!exempt)count++;
 }
 assert.ok(count>=30,`only ${count} public pages covered`);
});
function environment(path='/'){
 const appended=[],calls=[];
 const context={location:{pathname:path},window:{},document:{getElementById:()=>null,createElement:()=>({addEventListener(event,fn){this[event]=fn;}}),head:{appendChild(s){appended.push(s);}}}};
 vm.createContext(context);return {context,appended,calls};
}
test('loads HTTPS library once and initializes current zone once',()=>{
 const e=environment();vm.runInContext(code,e.context);vm.runInContext(code,e.context);
 assert.equal(e.appended.length,1);assert.equal(e.appended[0].src,'https://acscdn.com/script/aclib.js');
 e.context.window.aclib={runAutoTag:arg=>e.calls.push(arg.zoneId)};e.appended[0].load();
 assert.deepEqual(e.calls,['nvfhwgcmud']);
});
test('reuses an existing library, tolerates provider failure, and excludes private paths',()=>{
 const e=environment();e.context.window.aclib={runAutoTag(){throw Error('blocked')}};assert.doesNotThrow(()=>vm.runInContext(code,e.context));assert.equal(e.appended.length,0);
 for(const path of ['/internal/qa-logs/','/poll/team/','/api/auth']){const x=environment(path);vm.runInContext(code,x.context);assert.equal(x.appended.length,0);}
 const blocked=environment();vm.runInContext(code,blocked.context);assert.doesNotThrow(()=>blocked.appended[0].load());
});
