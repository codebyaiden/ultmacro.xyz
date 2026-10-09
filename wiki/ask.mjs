// Answer engine for source-linked, published Wiki sections.
// No language model, API key, embeddings, database or network needed for default answers.
import { wikiArticleUrl } from './retrieval.mjs';

const STOP = new Set(('a an and are as at be but by can could do does did for from had has have how i in into is it its me my of on or our please right the their them there these this those to use using was were what when where which who why will with won wont would you your not dont doesn t s get make fix help issue problem problems macro ultimate wiki').split(' '));
const ALIASES = [
  ['upgrade','upgrades','upgrading','upgraded'],
  ['tower','towers'],
  ['record','records','recorded','recording','recordings'],
  ['read','reading','reads'],
  ['wave','waves'],
  ['strategy','strategies','strat','strats'],
  ['place','placed','placing','placement','placements'],
  ['location','locations','position','positions','coordinate','coordinates'],
  ['save','saved','saving'],
  ['hotkey','hotkeys','keybind','keybinds'],
  ['cash','money','currency'],
  ['screen','display','resolution'],
  ['ocr','recognition'],
  ['reconnect','rejoin','rejoining','rejoined'],
  ['disconnect','disconnected','disconnection'],
  ['config','configuration','settings','setting'],
  ['backup','backups','backing'],
  ['download','downloads','downloading'],
  ['install','installation','installing'],
  ['import','importing','imported'],
  ['export','exporting','exported'],
  ['missing','disappeared','gone'],
  ['start','starting','startup'],
  ['press','pressed','pressing'],
  ['folder','folders','directory','directories'],
];
const aliases = new Map(ALIASES.flatMap(group => group.map(term=>[term,group[0]])));
const normalize = text => String(text||'').toLowerCase().normalize('NFKD')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens = text => normalize(text).split(/\s+/).filter(Boolean)
  .map(t=>aliases.get(t)||t);
const significant = text => [...new Set(tokens(text).filter(t=>t.length>1&&!STOP.has(t)))];
const wordset = text => new Set(tokens(text));
const has = (set,term) => set.has(term);
const normalizeVersion = version => String(version||'').trim().toLowerCase();
const versionMatch = (article, requested) => {
  if (!requested) return true;
  const match = /^v?(\d+)\.(\d+)\.(\d+|x)$/.exec(normalizeVersion(requested));
  if (!match) return false;
  const actual = /^v?(\d+)\.(\d+)\.(\d+|x)/.exec(normalizeVersion(article.version));
  if (!actual || actual[1]!==match[1] || actual[2]!==match[2]) return false;
  return actual[3]==='x'||match[3]==='x'||actual[3]===match[3];
};

function sectionLines(section) {
  return [
    ...(section.paragraphs||[]),
    ...(section.steps||[]),
    ...(section.checks||[]),
    ...(section.rows||[]).map(row=>row.join(': ')),
    section.code||''
  ].filter(Boolean);
}
function sectionAnswer(section,maxChars=1200) {
  const lines = [
    ...(section.paragraphs||[]),
    ...(section.steps||[]).map((s,i)=>String(i+1)+'. '+s),
    ...(section.checks||[]).map(s=>'- '+s),
    ...(section.rows||[]).map(r=>'- '+r[0]+': '+r[1]),
  ];
  if (section.code) lines.push(section.code);
  let result='';
  for (const line of lines) {
    if ((result+line).length>maxChars) break;
    result+=(result?'\n':'')+line;
  }
  return result.trim();
}

function createSectionIndex(articles) {
  return articles.flatMap(article=>(article.sections||[]).map((section,sectionIndex)=>({
    article,section,sectionIndex,
    titleWords:wordset(article.title), keywordWords:wordset((article.keywords||[]).join(' ')),
    summaryWords:wordset(article.summary), headingWords:wordset(section.title),
    bodyWords:wordset(sectionLines(section).join(' ')),
  })));
}

function rank(index,question,version,limit) {
  const terms = significant(question);
  if (!terms.length) return [];
  const phrasing = normalize(question);
  const asksLocation = /^where\b/.test(phrasing);
  const asksFailure = /\b(won t|doesn t|can t|wont|doesnt|cant|cannot|broken|fail|fails|failed|wrong|error|errors|stuck|trouble|troubleshooting|fix)\b/.test(phrasing);
  const asksProcedure = /^(how|steps|guide)\b/.test(phrasing) || asksFailure;
  const ranked=[];
  for (const candidate of index) {
    if (!versionMatch(candidate.article,version)) continue;
    let matched=0,score=0,headingMatch=0,titleMatch=0;
    for (const term of terms) {
      const {titleWords,keywordWords,summaryWords,headingWords,bodyWords}=candidate;
      const title=has(titleWords,term),keyword=has(keywordWords,term),
        summary=has(summaryWords,term),heading=has(headingWords,term),
        body=has(bodyWords,term);
      if (!(title||keyword||summary||heading||body)) continue;
      matched++;
      if (heading) headingMatch++;
      if (title) titleMatch++;
      score+=(heading?12:0)+(title?8:0)+(keyword?5:0)+(summary?3:0)+(body?2:0);
    }
    if (!matched) continue;
    const coverage=matched/terms.length;
    // Don't let many repeated incidental mentions outrank a precise match.
    score+=coverage===1?18:0;
    score+=titleMatch*17;
    if (phrasing.includes(normalize(candidate.article.title)) && normalize(candidate.article.title).length>8) score+=28;
    if (asksLocation && /^where\b/.test(normalize(candidate.article.title))) score+=28;
    if (asksLocation && (candidate.section.rows||[]).some(row=>row.some(cell=>/[%\\]/.test(cell)))) score+=6;
    if (asksFailure && candidate.article.category==='Troubleshooting') score+=25;
    if (asksProcedure && candidate.section.steps?.length) score+=7;
    ranked.push({...candidate,score,matched,coverage,headingMatch,titleMatch});
  }
  ranked.sort((a,b)=>b.coverage-a.coverage||b.score-a.score||b.headingMatch-a.headingMatch||
    a.article.title.localeCompare(b.article.title)||a.sectionIndex-b.sectionIndex);
  const picked=[],used=new Set();
  for(const candidate of ranked) {
    if(used.has(candidate.article.slug))continue;
    used.add(candidate.article.slug);picked.push(candidate);
    if(picked.length>=limit)break;
  }
  return picked;
}

function citation(candidate) {
  const a=candidate.article;
  return {
    slug:a.slug,title:a.title,section:candidate.section.title,
    url:wikiArticleUrl(a.slug),source:a.source,version:a.version||null,
  };
}

const safeVersion = version => version === undefined || version === null || version === '' ||
  /^v?\d+\.\d+\.(?:\d+|x)$/.test(String(version).trim().toLowerCase());
const EMPTY = 'I could not find sufficiently relevant published Wiki instructions for that question. Try a more specific topic or check the full Wiki.';
const MAX_QUESTION=300;

export function createWikiAskEngine(articles, {
  synthesizer=null, now=()=>Date.now(), cacheTtlMs=300000, cacheSize=120,
  maxAiCallsPerHour=30, maxAiConcurrent=2,
}={}) {
  const index=createSectionIndex(articles);
  const cache=new Map();
  const callTimes=[];
  let active=0;

  async function ask({question,version=null,mode='sourced'}={}) {
    if(typeof question!=='string'||question.trim().length<3||question.length>MAX_QUESTION)
      return {error:'question must contain 3–300 characters'};
    if(!safeVersion(version))return {error:'version must be vMAJOR.MINOR.PATCH or vMAJOR.MINOR.x'};
    if(!['sourced','ai'].includes(mode))return {error:'mode must be sourced or ai'};
    const q=question.trim();
    const versionRequested=version?normalizeVersion(version):null;
    const key=JSON.stringify([normalize(q),versionRequested,mode]);
    const cached=cache.get(key);
    const time=now();
    if(cached && cached.until>time) return {...cached.value,cache:'hit'};
    if(cached)cache.delete(key);

    const top=rank(index,q,versionRequested,3);
    const best=top[0];
    const terms=significant(q);
    // 1-term questions require an exact guide title, keyword or section heading;
    // longer questions require full token coverage and a meaningful section match.
    const strong=Boolean(best&&(
      terms.length===1
        ? best.headingWords.has(terms[0])||best.titleWords.has(terms[0])||best.keywordWords.has(terms[0])
        : best.coverage===1 && best.score>=19 && (best.headingMatch>0||terms.some(t=>best.titleWords.has(t)))
    ));
    let result;
    if(!strong||!sectionAnswer(best.section)) {
      result={
        status:'not_found',answer:null,answer_type:null,
        reason:top.length?'insufficient_evidence':'no_published_match',
        message:EMPTY,
        citations:[],related:top.slice(0,3).map(citation),
        version:versionRequested,ai_used:false
      };
    } else {
      const candidates=top.filter(hit=>hit.coverage===1&&
        hit.article.slug!==best.article.slug&&hit.score>=best.score*0.65).slice(0,2);
      const citations=[citation(best)];
      const evidence=sectionAnswer(best.section);
      result={
        status:'answered',answer:evidence,answer_type:'extractive',
        citations,related:top.slice(1).map(citation),
        version:versionRequested||best.article.version||null,
        source_scope:'published_documentation',ai_used:false,
        note:'This is source material from the Wiki, not a verified diagnosis of the user’s device.'
      };
      // AI never runs on unknown or weakly matched questions. Production must configure
      // a trusted server-side synthesizer; the anonymous caller cannot choose a provider.
      if(mode==='ai') {
        if(typeof synthesizer!=='function') result.ai_status='disabled';
        else {
          while(callTimes.length&&time-callTimes[0]>=3600000)callTimes.shift();
          if(callTimes.length>=maxAiCallsPerHour||active>=maxAiConcurrent)result.ai_status='budget_exhausted';
          else {
            callTimes.push(time);active++;
            try {
              const synthesized=await synthesizer({
                question:q,version:versionRequested,
                evidence:[best,...candidates].map(hit=>({
                  ...citation(hit),text:sectionAnswer(hit.section,900)
                }))
              });
              if(typeof synthesized==='string'&&synthesized.trim().length>=12&&
                 synthesized.length<=1300&&!/^\s*UNSUPPORTED\s*$/i.test(synthesized)) {
                result.answer=synthesized.trim();result.answer_type='ai_draft';result.ai_used=true;
                result.citations=[citation(best),...candidates.map(citation)];
                result.note='AI-composed summary of cited Wiki sources; verify the original guides.';
              } else result.ai_status='invalid_response';
            } catch {result.ai_status='provider_unavailable';}
            finally {active--;}
          }
        }
      }
    }
    cache.set(key,{value:result,until:time+cacheTtlMs});
    while(cache.size>cacheSize)cache.delete(cache.keys().next().value);
    return {...result,cache:'miss'};
  }
  return {ask,search:(q,version=null,limit=3)=>rank(index,q,version,limit).map(hit=>({
    ...citation(hit),score:hit.score,coverage:hit.coverage
  }))};
}
