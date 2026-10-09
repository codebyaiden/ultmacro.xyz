// node scripts/build-wiki-retrieval.mjs [--check]
// Builds an intentionally small static index and one Markdown document per published guide.
import { readFile, writeFile, readdir, mkdir, unlink } from 'node:fs/promises';
import { articles } from '../wiki/content.mjs';
import { wikiManifest, wikiLlmsIndex, markdownWikiArticle } from '../wiki/retrieval.mjs';

const check = process.argv.includes('--check');
const root = new URL('../wiki/',import.meta.url);
const docs = new URL('api/v1/docs/',root);
const generated = new Map([
  ['api/v1/index.json',JSON.stringify(wikiManifest(articles))+'\n'],
  ['llms.txt',wikiLlmsIndex(articles)]
]);
for (const article of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug))
    throw new Error('Invalid guide slug: '+article.slug);
  generated.set('api/v1/docs/'+article.slug+'.md',markdownWikiArticle(article));
}
if (new Set(articles.map(a=>a.slug)).size !== articles.length) throw new Error('Duplicate published guide slug');
if (!check) await mkdir(docs,{recursive:true});
const existing = await readdir(docs).catch(error => {
  if (check) throw error;
  if (error.code==='ENOENT') return [];
  throw error;
});
const expected = new Set(articles.map(a=>a.slug+'.md'));
for (const filename of existing) {
  if (!filename.endsWith('.md')) continue;
  if (expected.has(filename)) continue;
  if (check) throw new Error('Stale generated Markdown: '+filename);
  await unlink(new URL('api/v1/docs/'+filename,root));
}
for (const [file,content] of generated) {
  const location = new URL(file,root);
  if (check) {
    const current = await readFile(location,'utf8').catch(()=>null);
    if (current !== content) throw new Error('Outdated static retrieval asset: '+file);
  } else await writeFile(location,content);
}
console.log((check?'Validated ':'Generated ')+articles.length+' published Markdown guides, compact index and llms.txt');
