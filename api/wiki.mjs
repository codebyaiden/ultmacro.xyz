import { createHash } from 'node:crypto';
import { articles, categories } from '../wiki/content.mjs';

const BASE = 'https://ultmacro.xyz/wiki/';
const slugs = new Map(articles.map(a => [a.slug, a]));
const version = '1';
const expiresIn = 'public, max-age=300, stale-while-revalidate=600';
const baseHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'Accept, If-None-Match',
  'access-control-max-age': '86400',
  'content-type': 'application/json; charset=utf-8',
  'cache-control': expiresIn,
  'x-content-type-options': 'nosniff',
};

function json(data, status = 200, method = 'GET', request) {
  const content = JSON.stringify(data);
  const etag = '"' + createHash('sha256').update(content).digest('hex') + '"';
  const headers = { ...baseHeaders, etag };
  if (request?.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(method === 'HEAD' ? null : content, { status, headers });
}

function error(message, status, method = 'GET') {
  return json({ error: { code: status, message } }, status, method);
}

const urlFor = slug => BASE + '?article=' + encodeURIComponent(slug);
function summary(a) {
  return { slug: a.slug, title: a.title, category: a.category, summary: a.summary,
    url: urlFor(a.slug), source: a.source, version: a.version || null,
    keywords: Array.isArray(a.keywords) ? a.keywords : [] };
}

function words(input) {
  return String(input || '').toLowerCase().normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/)
    .filter(x => x.length > 2 && !['the','for','and','how','are','with','can','what','why'].includes(x));
}

function search(q) {
  const terms = words(q);
  if (!terms.length) return [];
  return articles.map(a => {
    const title = a.title.toLowerCase(), category = a.category.toLowerCase();
    const keyword = (a.keywords || []).join(' ').toLowerCase(), synopsis = a.summary.toLowerCase();
    const full = a.sections.map(s => [s.title, ...(s.paragraphs || []), ...(s.steps || []),
      ...(s.checks || []), ...(s.rows || []).flat()].join(' ')).join(' ').toLowerCase();
    let score = 0, matched = 0;
    for (const term of terms) {
      const variants = [term, term.replace(/ing$/, '').replace(/s$/, '')].filter(x => x.length > 2);
      const has = text => variants.some(x => text.includes(x));
      if (has(title)) { score += 14; matched++; }
      else if (has(keyword)) { score += 10; matched++; }
      else if (has(synopsis)) { score += 5; matched++; }
      else if (has(category)) { score += 3; matched++; }
      else if (has(full)) { score += 2; matched++; }
    }
    if (matched === terms.length) score += 18;
    return { article: a, score };
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .map(x => x.article);
}

function intParam(value, fallback, max) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n <= max ? n : null;
}

export default async function wikiApi(request) {
  const { pathname, searchParams } = new URL(request.url);
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
  if (!['GET','HEAD'].includes(method)) return new Response(JSON.stringify({ error: { code:405,message:'Method not allowed' }}),
    { status: 405, headers: { ...baseHeaders, allow: 'GET, HEAD, OPTIONS' } });

  const root = '/api/wiki/v1';
  const suffix = pathname.slice(root.length);
  if (!['', '/', '/articles', '/search', '/categories', '/openapi.json'].includes(suffix)
      && !suffix.startsWith('/articles/')) return error('Not found', 404, method);

  if (suffix === '' || suffix === '/') {
    return json({ name:'Ultimate Macro Wiki API', version, scope:'Published documentation only',
      documentation:'https://ultmacro.xyz/wiki/api/',
      endpoints: { articles:root+'/articles', article:root+'/articles/{slug}',
        search:root+'/search?q=placement', categories:root+'/categories', openapi:root+'/openapi.json' },
      totalPublished:articles.length, researchTopicsIncluded:false }, 200, method, request);
  }

  if (suffix === '/categories') {
    return json({ data: categories.map(name => ({ name, count:articles.filter(a => a.category === name).length })) },
      200, method, request);
  }

  if (suffix === '/articles') {
    const limit = intParam(searchParams.get('limit'), 20, 50);
    const offset = intParam(searchParams.get('offset'), 0, articles.length);
    if (limit === null || limit < 1 || offset === null) return error('Invalid limit or offset', 400, method);
    const category = searchParams.get('category');
    if (category && !categories.includes(category)) return error('Unknown category', 400, method);
    const pool = category ? articles.filter(a => a.category === category) : articles;
    return json({ data:pool.slice(offset,offset + limit).map(summary),
      pagination:{ total:pool.length,limit,offset,hasMore:offset + limit < pool.length } },200,method,request);
  }

  if (suffix.startsWith('/articles/')) {
    const slug = suffix.slice('/articles/'.length);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return error('Invalid article slug', 400, method);
    const a = slugs.get(slug);
    if (!a) return error('Article not found', 404, method);
    return json({ ...summary(a), sections:a.sections, status:'published' },200,method,request);
  }

  if (suffix === '/search') {
    const q = (searchParams.get('q') || '').trim();
    const limit = intParam(searchParams.get('limit'), 10, 30);
    if (q.length > 160 || !q || limit === null || limit < 1) return error('Provide q (1–160 characters) and limit (1–30)',400,method);
    const results = search(q);
    return json({ query:q, total:results.length, data:results.slice(0,limit).map(summary),
      note:'Only published wiki articles are searched. Results are lexical matches, not generated answers.' },200,method,request);
  }

  if (suffix === '/openapi.json') {
    return json({ openapi:'3.1.0',info:{title:'Ultimate Macro Wiki API',version:'1.0.0',
      description:'Read-only, CORS-enabled access to published wiki articles. No research topics or AI-generated answers.'},
      servers:[{url:'https://ultmacro.xyz'}],
      paths:{
        '/api/wiki/v1':{get:{summary:'API discovery',responses:{'200':{description:'API links'}}}},
        '/api/wiki/v1/categories':{get:{summary:'List published categories',responses:{'200':{description:'Category counts'}}}},
        '/api/wiki/v1/articles':{get:{summary:'List published articles',parameters:[
          {name:'category',in:'query',schema:{type:'string'}},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:50,default:20}},
          {name:'offset',in:'query',schema:{type:'integer',minimum:0,default:0}}],responses:{'200':{description:'Paginated articles'}}}},
        '/api/wiki/v1/articles/{slug}':{get:{summary:'Read an article',parameters:[
          {name:'slug',in:'path',required:true,schema:{type:'string'}}],responses:{'200':{description:'Article with sections'},'404':{description:'Not found'}}}},
        '/api/wiki/v1/search':{get:{summary:'Search published articles',parameters:[
          {name:'q',in:'query',required:true,schema:{type:'string',maxLength:160}},
          {name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:30,default:10}}],responses:{'200':{description:'Matching article summaries'}}}}
      } },200,method,request);
  }
}
