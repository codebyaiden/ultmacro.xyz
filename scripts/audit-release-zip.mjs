// Run manually with Node 22+: npm run wiki:release-audit
// Downloads and verifies the latest official release ZIP; no binaries are executed.
import { createHash } from 'node:crypto';

const repository='UltimateMacro/Ultimate-Macro-New-Era';
const response=await fetch('https://api.github.com/repos/'+repository+'/releases/latest',{
 headers:{Accept:'application/vnd.github+json','User-Agent':'UltimateMacro-Wiki-Release-Audit'}
});
if(!response.ok)throw Error('GitHub release metadata request returned '+response.status);
const release=await response.json();
const assets=release.assets||[];
const zips=assets.filter(x=>x.name?.toLowerCase().endsWith('.zip')&&
 x.browser_download_url?.startsWith('https://github.com/'+repository+'/releases/download/'));
if(zips.length!==1)throw Error('Expected one official ZIP asset; found '+zips.length);
const asset=zips[0];
const digest=asset.digest||'';
if(!/^sha256:[0-9a-f]{64}$/i.test(digest))throw Error('Release asset has no valid SHA-256 digest');
console.log('Release:',release.tag_name,'ZIP:',asset.name,'size:',asset.size);
const download=await fetch(asset.browser_download_url,{headers:{'User-Agent':'UltimateMacro-Wiki-Release-Audit'}});
if(!download.ok)throw Error('ZIP download returned HTTP '+download.status);
const bytes=Buffer.from(await download.arrayBuffer());
if(bytes.length!==asset.size)throw Error('ZIP size differs from GitHub asset metadata');
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha.toLowerCase()!==digest.slice(7).toLowerCase())throw Error('ZIP hash mismatch; aborting');
console.log('SHA-256 verified:',sha);
function entriesFromZip(b){
  // Read central directory only. Never extract or run code.
  let eocd=-1;
  for(let pos=b.length-22;pos>=Math.max(0,b.length-65557);pos--){
    if(b.readUInt32LE(pos)===0x06054b50){eocd=pos;break;}
  }
  if(eocd<0)throw Error('ZIP end of central directory not found');
  const count=b.readUInt16LE(eocd+10),centralSize=b.readUInt32LE(eocd+12),start=b.readUInt32LE(eocd+16);
  if(count===65535||start===0xffffffff)throw Error('ZIP64 archive requires separate inspector');
  if(start+centralSize>b.length)throw Error('Invalid central directory bounds');
  let position=start;
  const names=[];
  for(let i=0;i<count;i++){
    if(position+46>b.length||b.readUInt32LE(position)!==0x02014b50)throw Error('Invalid ZIP central directory entry');
    const nameLen=b.readUInt16LE(position+28),extraLen=b.readUInt16LE(position+30),commentLen=b.readUInt16LE(position+32);
    const end=position+46+nameLen+extraLen+commentLen;
    if(end>b.length)throw Error('ZIP entry beyond archive bounds');
    const name=b.toString('utf8',position+46,position+46+nameLen);
    if(name.startsWith('/')||name.split('/').includes('..')||name.includes('\\'))throw Error('Unsafe ZIP path '+name);
    names.push(name);
    position=end;
  }
  if(position!==start+centralSize)throw Error('ZIP central directory size mismatch');
  return names;
}
const names=entriesFromZip(bytes);
const needed=['Main.ahk','StrategyLab.exe','submacros/safe_update.ps1','lib/Profiles.ahk','lib/auto_settings.ahk'];
const exists=path=>names.some(name=>name.replace(/^[^/]+\//,'')===path||name===path);
const missing=needed.filter(path=>!exists(path));
console.log('Archive entries:',names.length);
console.log('Required files:',needed.map(x=>(exists(x)?'OK ':'MISSING ')+x).join(', '));
if(missing.length)throw Error('Missing required packaged files: '+missing.join(', '));
console.log('PASS: official release ZIP downloaded, integrity checked and required files present');
