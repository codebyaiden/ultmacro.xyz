// Read-only, tracked-source inventory. Never executes vendor code or visits ads.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const inventory={baseline:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:files.length,adPages:[],externalScripts:[],frames:[],redirects:[],inputAndNavigation:[]};
for(const file of files){
 if(!/\.(?:html|js|mjs|cjs|svg|yml)$/.test(file)||file.startsWith('tests/'))continue;
 const text=await readFile(file,'utf8');
 text.split(/\r?\n/).forEach((line,index)=>{
  const ref={file,line:index+1};
  if(/<script[^>]+src="\/src\/(?:adcash|advertising)/.test(line))inventory.adPages.push(ref);
  for(const match of line.matchAll(/<script[^>]+src=["']((?:https?:)?\/\/[^"']+)/g))inventory.externalScripts.push({...ref,url:match[1]});
  if(/<iframe|createElement\(['"]iframe/.test(line))inventory.frames.push(ref);
  if(/http-equiv=["']refresh|location\.(?:replace|assign)/.test(line))inventory.redirects.push(ref);
  if(/window\.open|preventDefault|stopImmediatePropagation|stopPropagation|addEventListener\(['"](?:click|pointerdown|mousedown)/.test(line))inventory.inputAndNavigation.push(ref);
 });
}
await mkdir('audit-evidence',{recursive:true});
await writeFile('audit-evidence/surface-inventory.json',JSON.stringify(inventory,null,2)+'\n');
const vendor=await readFile('audit-evidence/vendor-aclib.js.txt').catch(()=>null);
console.log(JSON.stringify({files:inventory.files,adPages:inventory.adPages.length,externalScripts:inventory.externalScripts,frames:inventory.frames,redirects:inventory.redirects,vendorSha256:vendor?createHash('sha256').update(vendor).digest('hex'):null},null,2));
