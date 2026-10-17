import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('moderator application embeds only the public responder form and has an accessible fallback',async()=>{
 const html=await readFile(new URL('../moderatorapplication/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>Moderator applications \| Ultimate Macro<\/title>/);
 assert.match(html,/rel="canonical" href="https:\/\/ultmacro.xyz\/moderatorapplication\/"/);
 assert.match(html,/<iframe title="Ultimate Macro Moderator Application"/);
 assert.match(html,/viewform\?embedded=true/);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
 assert.match(html,/Email collection is off/);
 assert.doesNotMatch(html,/\/edit(?:[?"#])|viewanalytics|api\/webhooks/);
 assert.match(html,/\/privacy\//);
});
