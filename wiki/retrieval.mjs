// Canonical retrieval helpers shared by the API and the generated static artifacts.
// Only published, source-linked articles are passed to these functions.
export const WIKI_BASE = 'https://ultmacro.xyz/wiki/';
export const wikiArticleUrl = slug => WIKI_BASE + '?article=' + encodeURIComponent(slug);
export const wikiMarkdownUrl = slug => WIKI_BASE + 'api/v1/docs/' + encodeURIComponent(slug) + '.md';

export function wikiSummary(article) {
  return {
    slug: article.slug, title: article.title, summary: article.summary,
    category: article.category, version: article.version || null,
    keywords: article.keywords || [], url: wikiArticleUrl(article.slug),
    markdown: wikiMarkdownUrl(article.slug), source: article.source,
  };
}

export function wikiManifest(articles) {
  return {
    apiVersion: '1', scope: 'published-documentation-only',
    researchTopicsIncluded: false, total: articles.length,
    articles: articles.map(wikiSummary),
  };
}

function sectionText(section) {
  return [
    section.title,
    ...(section.paragraphs || []),
    ...(section.steps || []),
    ...(section.checks || []),
    ...(section.rows || []).flat(),
    section.code || '',
  ].join(' ');
}

function searchTerms(input) {
  const stop = new Set(['the','for','and','how','are','with','can','what','why','does','this','that','please','about','when','where','from','your','you','wiki','macro','ultimate']);
  return [...new Set(String(input || '').toLowerCase().normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/)
    .filter(t => t.length >= 2 && !stop.has(t)))];
}

function matchWord(haystack, term) {
  const variants = [term];
  if (term.length > 5 && term.endsWith('ing')) variants.push(term.slice(0,-3));
  if (term.length > 4 && term.endsWith('s')) variants.push(term.slice(0,-1));
  return variants.some(t => haystack.some(word => word === t || (t.length >= 4 && word.startsWith(t))));
}

const asWords = value => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);

function excerpt(section, maximum = 350) {
  const lines = [
    ...(section.paragraphs || []),
    ...(section.steps || []),
    ...(section.checks || []),
    ...(section.rows || []).map(row => row.join(': ')),
    section.code || '',
  ].filter(Boolean);
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > maximum ? text.slice(0,maximum - 1).trimEnd() + '…' : text;
}

export function searchWiki(articles, query, { category } = {}) {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const found = [];
  for (const article of articles) {
    if (category && article.category !== category) continue;
    const title = asWords(article.title);
    const keywords = asWords((article.keywords || []).join(' '));
    const synopsis = asWords(article.summary);
    const scored = article.sections.map(section => ({
      section, heading: asWords(section.title), content: asWords(sectionText(section))
    }));
    let score = 0, coverage = 0;
    for (const term of terms) {
      let termScore = 0;
      if (matchWord(title,term)) termScore = 16;
      else if (matchWord(keywords,term)) termScore = 11;
      else if (matchWord(synopsis,term)) termScore = 8;
      else if (scored.some(s => matchWord(s.heading,term))) termScore = 6;
      else if (scored.some(s => matchWord(s.content,term))) termScore = 2;
      if (termScore) { coverage++; score += termScore; }
    }
    if (!score) continue;
    if (coverage === terms.length) score += 20;
    // Prefer a section matching the question, not an arbitrary first paragraph.
    const sections = scored.map(s => ({
      section: s.section,
      relevance: terms.reduce((sum,term) => sum +
        (matchWord(s.heading,term) ? 5 : 0) +
        (matchWord(s.content,term) ? 1 : 0), 0),
    })).sort((a,b) => b.relevance - a.relevance);
    const best = sections[0]?.section || article.sections[0];
    found.push({
      article, score, coverage, section: best?.title || null,
      snippet: best ? excerpt(best) : '',
    });
  }
  return found.sort((a,b) => b.score - a.score ||
    b.coverage - a.coverage || a.article.title.localeCompare(b.article.title));
}

export function markdownWikiArticle(article) {
  const out = [
    '# ' + article.title,
    '',
    '> ' + article.summary,
    '',
    'Status: published',
    'Version: ' + (article.version || 'not specified'),
    'Category: ' + article.category,
    'Article: ' + wikiArticleUrl(article.slug),
    'Source: ' + article.source,
  ];
  for (const section of article.sections) {
    out.push('', '## ' + section.title, '');
    for (const p of section.paragraphs || []) out.push(p, '');
    for (const [index,step] of (section.steps || []).entries()) out.push((index + 1) + '. ' + step);
    if (section.steps?.length) out.push('');
    for (const check of section.checks || []) out.push('- ' + check);
    if (section.checks?.length) out.push('');
    if (section.rows?.length) {
      out.push('| Setting | Value |', '| --- | --- |');
      for (const row of section.rows) out.push('| ' + String(row[0]).replace(/\|/g,'\\|') + ' | ' + String(row[1]).replace(/\|/g,'\\|') + ' |');
      out.push('');
    }
    if (section.code) out.push('~~~text',section.code,'~~~','');
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd() + '\n';
}

export function wikiLlmsIndex(articles) {
  const main = [
    'install','requirements','first-run','tds-settings','roblox-settings',
    'windows-display','record-strategy','upgrade-not-working','wrong-clicks',
    'ocr-errors','strategy-lab-start','profiles','profile-import',
    'where-recordings-are-saved','recording-hotkey-defaults',
    'strat-file-layout','strat-spawntower','strat-upgradetower',
    'how-to-get-early-access'
  ];
  const bySlug = new Map(articles.map(a => [a.slug,a]));
  const out = [
    '# Ultimate Macro Wiki',
    '',
    '> Source-linked documentation for the Ultimate Macro Windows/Tower Defense Simulator automation tool.',
    '',
    'Published guides only. Research-topic candidates are not verified fixes.',
    'Use the compact index to find a guide, then fetch its individual Markdown document. Do not download the full articles.json for every question.',
    '',
    '## Find documentation',
    '- [Search and API guide](https://ultmacro.xyz/wiki/api/): human-friendly search and integration instructions',
    '- [Compact index](https://ultmacro.xyz/wiki/api/v1/index.json): titles, summaries, keywords and individual Markdown URLs',
    '- [Complete JSON export](https://ultmacro.xyz/wiki/api/v1/articles.json): optional bulk/backup dataset, not needed for normal retrieval',
    '',
    '## Key guides',
  ];
  for (const slug of main) {
    const article = bySlug.get(slug);
    if (article) out.push('- [' + article.title + '](' + wikiMarkdownUrl(slug) + '): ' + article.summary);
  }
  out.push('', '## Scope', '- Published guide count: ' + articles.length,
    '- Unverified research topics: excluded from this index and retrieval API',
    '- Respect the version and source stated inside each Markdown guide',
    '');
  return out.join('\n');
}
