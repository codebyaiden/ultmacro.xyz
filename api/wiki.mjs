import { createHash } from 'node:crypto';
import { articles, categories } from '../wiki/content.mjs';
import { searchWiki, wikiSummary, wikiManifest, markdownWikiArticle } from '../wiki/retrieval.mjs';

const root = '/api/wiki/v1';
const slugs = new Map(articles.map(a => [a.slug, a]));
const cache = 'public, max-age=300, stale-while-revalidate=600';
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'Accept, If-None-Match',
  'access-control-max-age': '86400',
  'cache-control': cache,
  'x-content-type-options': 'nosniff'
};

function respond(value, status = 200, request, type = 'application/json; charset=utf-8') {
  const body = type.startsWith('application/json') ? JSON.stringify(value) : value;
  const etag = '"' + createHash('sha256').update(body).digest('hex') + '"';
  const h = { ...headers, 'content-type': type, etag };
  if (status === 200 && request?.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: h });
  return new Response(request?.method === 'HEAD' ? null : body, { status, headers: h });
}
const json = (data,status,request) => respond(data,status,request);
const fail = (reason,status,request) => json({ error: { code:status,message:reason } },status,request);

function numberParam(raw, fallback, maximum, minimum = 0) {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= minimum && n <= maximum ? n : null;
}

function paging(url, total, defaultLimit, maxLimit) {
  const sp = url.searchParams;
  const limit = numberParam(sp.get('limit'),defaultLimit,maxLimit,1);
  const pageRaw = sp.get('page');
  const offsetRaw = sp.get('offset');
  if (limit === null || (pageRaw !== null && offsetRaw !== null)) return null;
  const page = pageRaw === null ? null : numberParam(pageRaw,1,100000,1);
  const offset = offsetRaw === null ? (page === null ? 0 : (page - 1) * limit) :
    numberParam(offsetRaw,0,100000);
  if (offset === null || page === null && pageRaw !== null) return null;
  const current = Math.floor(offset / limit) + 1;
  const pages = Math.max(1,Math.ceil(total / limit));
  const link = nextOffset => {
    const next = new URL(url);
    if (pageRaw !== null) {
      next.searchParams.set('page', String(Math.floor(nextOffset / limit) + 1));
    } else {
      next.searchParams.set('offset', String(nextOffset));
    }
    next.searchParams.set('limit',String(limit));
    return next.pathname + next.search;
  };
  return {
    total,limit,offset,page:current,pages,
    hasMore:offset + limit < total,
    next:offset + limit < total ? link(offset + limit) : null,
    previous:offset > 0 && offset < total + limit ? link(Math.max(0,offset - limit)) : null
  };
}

const result = hit => ({ ...wikiSummary(hit.article), score:hit.score,
  matchedSection:hit.section, snippet:hit.snippet });

function openapi() {
  const query = (name, schema, required = false) => ({name,in:'query',required,schema});
  const pagination = [
    query('limit',{type:'integer',minimum:1,maximum:50,default:20}),
    query('page',{type:'integer',minimum:1,default:1}),
    query('offset',{type:'integer',minimum:0}),
    query('category',{type:'string'})
  ];
  return {openapi:'3.1.0',info:{title:'Ultimate Macro Wiki API',version:'1.1.0',
    description:'Read-only access to source-linked published guides; research candidates are excluded.'},
    servers:[{url:'https://ultmacro.xyz'}],
    paths:{
      [root]:{get:{summary:'Discover the API',responses:{'200':{description:'Available endpoints'}}}},
      [root+'/index']:{get:{summary:'Compact guide catalog',responses:{'200':{description:'Metadata only'}}}},
      [root+'/categories']:{get:{summary:'Published categories',responses:{'200':{description:'Category counts'}}}},
      [root+'/articles']:{get:{summary:'Browse articles',parameters:pagination,responses:{'200':{description:'Paginated summaries'}}}},
      [root+'/articles/{slug}']:{get:{summary:'Read one guide as JSON or Markdown',
        parameters:[{name:'slug',in:'path',required:true,schema:{type:'string'}},
          query('format',{type:'string',enum:['json','md']})],
        responses:{'200':{description:'Article content'},'404':{description:'Unknown slug'}}}},
      [root+'/search']:{get:{summary:'Search with snippets and pagination',
        parameters:[query('q',{type:'string',minLength:1,maxLength:160},true),
          ...pagination.map(x=>x.name==='limit'?{...x,schema:{...x.schema,maximum:30,default:10}}:x)],
        responses:{'200':{description:'Ranked, paginated matches'}}}},
      [root+'/context']:{get:{summary:'Small citation-ready context for AI assistants',
        parameters:[query('q',{type:'string',minLength:1,maxLength:160},true),
          query('limit',{type:'integer',minimum:1,maximum:5,default:3})],
        responses:{'200':{description:'Top matching guide excerpts and sources'}}}},
      [root+'/openapi.json']:{get:{summary:'OpenAPI 3.1 contract',responses:{'200':{description:'OpenAPI specification'}}}}
    }};
}

export default async function wikiApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (!['GET','HEAD'].includes(method)) return new Response(JSON.stringify({error:{code:405,message:'Method not allowed'}}),
    {status:405,headers:{...headers,'content-type':'application/json; charset=utf-8',allow:'GET, HEAD, OPTIONS'}});
  if (!path.startsWith(root)) return fail('Not found',404,request);
  const suffix = path.slice(root.length);

  if (suffix === '' || suffix === '/') return json({
    name:'Ultimate Macro Wiki API', version:'1.1', scope:'Published documentation only',
    documentation:'https://ultmacro.xyz/wiki/api/',
    endpoints:{search:root+'/search?q=ocr',context:root+'/context?q=ocr',
      article:root+'/articles/{slug}',articles:root+'/articles?page=1&limit=20',
      index:root+'/index',categories:root+'/categories',openapi:root+'/openapi.json'},
    static:{index:'https://ultmacro.xyz/wiki/api/v1/index.json',
      markdown:'https://ultmacro.xyz/wiki/api/v1/docs/{slug}.md'},
    totalPublished:articles.length,researchTopicsIncluded:false
  },200,request);

  if (suffix === '/categories') return json({
    data:categories.map(name=>({name,count:articles.filter(a=>a.category===name).length}))
  },200,request);

  if (suffix === '/index') return json(wikiManifest(articles),200,request);

  if (suffix === '/articles') {
    const category = url.searchParams.get('category');
    if (category && !categories.includes(category)) return fail('Unknown category',400,request);
    const subset = category ? articles.filter(a=>a.category===category) : articles;
    const meta = paging(url,subset.length,20,50);
    if (!meta) return fail('Invalid limit, page or offset; choose page OR offset',400,request);
    return json({data:subset.slice(meta.offset,meta.offset+meta.limit).map(wikiSummary),pagination:meta},200,request);
  }

  if (suffix.startsWith('/articles/')) {
    const slug = suffix.slice('/articles/'.length);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail('Invalid article slug',400,request);
    const article = slugs.get(slug);
    if (!article) return fail('Article not found',404,request);
    const format = url.searchParams.get('format');
    if (format && !['json','md'].includes(format)) return fail('Invalid article format',400,request);
    if (format==='md' || (!format && request.headers.get('accept')?.includes('text/markdown')))
      return respond(markdownWikiArticle(article),200,request,'text/markdown; charset=utf-8');
    return json({...wikiSummary(article),sections:article.sections,status:'published'},200,request);
  }

  if (suffix === '/search' || suffix === '/context') {
    const q = (url.searchParams.get('q') || '').trim();
    if (q.length < 1 || q.length > 160) return fail('Provide q (1–160 characters)',400,request);
    const category = url.searchParams.get('category');
    if (category && !categories.includes(category)) return fail('Unknown category',400,request);
    const hits = searchWiki(articles,q,{category});
    if (suffix === '/context') {
      const limit = numberParam(url.searchParams.get('limit'),3,5,1);
      if (limit === null) return fail('Context limit must be between 1 and 5',400,request);
      return json({query:q,total:hits.length,data:hits.slice(0,limit).map(result),
        note:'Source-linked excerpts only. Not an AI answer; verify against each guide.'},200,request);
    }
    const meta = paging(url,hits.length,10,30);
    if (!meta) return fail('Invalid search limit, page or offset',400,request);
    return json({query:q,total:hits.length,
      data:hits.slice(meta.offset,meta.offset+meta.limit).map(result),
      pagination:meta,
      note:'Only published wiki articles are searched. Results are lexical matches, not generated answers.'},200,request);
  }

  if (suffix === '/openapi.json') return json(openapi(),200,request);
  return fail('Not found',404,request);
}
