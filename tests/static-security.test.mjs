import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
test('source checkout static server blocks hidden/server files and leaves config public and no-cache',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'um-static-security-'));
 await writeFile(path.join(root,'.env'),'synthetic-not-a-real-secret');
 await writeFile(path.join(root,'server.mjs'),'synthetic-server-code');
 await writeFile(path.join(root,'index.html'),'<h1>Public</h1>');
 await import('node:fs/promises').then(fs=>fs.mkdir(path.join(root,'data')));
 await writeFile(path.join(root,'data','advertising.json'),'{"enabled":false}');
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:'0',SITE_ROOT:root},stdio:['ignore','pipe','pipe']});
 try {
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout')),15000);child.stdout.on('data',b=>{const match=b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',()=>{clearTimeout(timer);reject(Error('server exited before ready'));});});
  for(const route of ['/.env','/%2eenv','/.git/config','/server.mjs','/node_modules/pkg/index.js','/db/test.sql','/tests/private.js','/docs/internal.md'])assert.equal((await fetch(base+route)).status,404,route);
  assert.equal((await fetch(base+'/')).status,200);
  const config=await fetch(base+'/data/advertising.json');assert.equal(config.status,200);assert.equal(config.headers.get('cache-control'),'no-cache');assert.equal((await config.json()).enabled,false);
 } finally {
  if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}
  assert.ok(root.startsWith(path.join(tmpdir(),'um-static-security-')));
  await rm(root,{recursive:true,force:true});
 }
});
