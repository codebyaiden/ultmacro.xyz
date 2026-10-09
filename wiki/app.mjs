import { articles, categories } from './content.mjs';

const $ = id => document.getElementById(id);
const docs = new Map(articles.map(a => [a.slug, a]));
const view = $('view');
const sidebar = $('sidebar');
const scrim = $('mobile-scrim');
const navToggle = $('nav-toggle');
const overlay = $('search-overlay');
const searchInput = $('search-field');
const searchResults = $('search-results');
const helper = $('helper-panel');
const helperToggle = $('helper-toggle');
const helperHistory = $('helper-history');
const helperInput = $('helper-input');

function node(tag, className = '', content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}
function link(text, href, className = '') {
  const a = node('a', className, text);
  a.href = href;
  return a;
}
function articleURL(slug) { return './?article=' + encodeURIComponent(slug); }
function categoryURL(name) { return './?category=' + encodeURIComponent(name); }
function articleLink(a, className = '') {
  const el = link(a.title, articleURL(a.slug), className);
  el.dataset.article = a.slug;
  return el;
}
function categoryLink(name, className = '') {
  const el = link(name, categoryURL(name), className);
  el.dataset.category = name;
  return el;
}
function queryState() {
  const p = new URL(location.href).searchParams;
  return { article: p.get('article'), category: p.get('category') };
}
function go(type = '', value = '') {
  const dest = new URL('./', location.href);
  if (type && value) dest.searchParams.set(type, value);
  history.pushState(null, '', dest);
  closeSearch(false);
  closeMenu();
  render();
  window.scrollTo(0, 0);
}
function closeMenu() {
  sidebar.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  scrim.hidden = true;
}
function nav() {
  const root = $('sidebar-nav');
  root.replaceChildren();
  const { article, category } = queryState();
  $('sidebar-home').classList.toggle('active', !article && !category);
  const activeCategory = docs.get(article)?.category || category;
  for (const name of categories) {
    const group = node('details', 'nav-group');
    if (activeCategory === name || (!activeCategory && (name === 'Start here' || name === 'Troubleshooting'))) group.open = true;
    const summary = node('summary', '', name);
    summary.setAttribute('aria-label', 'Toggle ' + name + ' articles');
    group.append(summary);
    const items = node('div', 'nav-items');
    for (const a of articles.filter(x => x.category === name)) {
      const aLink = articleLink(a, article === a.slug ? 'active' : '');
      if (article === a.slug) aLink.setAttribute('aria-current', 'page');
      items.append(aLink);
    }
    group.append(items);
    root.append(group);
  }
}
const categoryDetails = {
  'Start here': 'Install and run your first match',
  'Setup & settings': 'Windows, Roblox and TDS',
  'Strategies': 'Recording, editing and sharing',
  'Sessions & tools': 'Long runs, parties and utilities',
  'Troubleshooting': 'Symptoms and fixes',
  'Community': 'Discord and project information'
};
function sectionHeading(title, subtitle = '') {
  const section = node('div', 'section-heading');
  section.append(node('h2', '', title));
  if (subtitle) section.append(node('span', '', subtitle));
  return section;
}
function home() {
  document.title = 'Ultimate Macro Wiki · Setup, strategies and fixes';
  const hero = node('section', 'home-hero');
  hero.append(node('p', 'wiki-kicker', 'DOCUMENTATION'));
  hero.append(node('h1', '', 'Ultimate Macro Wiki'));
  hero.append(node('p', '', 'Setup instructions, strategy recording, and troubleshooting for the Tower Defense Simulator macro.'));
  const searchButton = node('button', 'search-large');
  searchButton.type = 'button';
  searchButton.setAttribute('aria-label', 'Search wiki articles');
  searchButton.append(node('span', '', 'Search an error, setting, or feature…'), node('kbd', '', '/'));
  searchButton.addEventListener('click', () => openSearch());
  hero.append(searchButton);
  view.append(hero);

  const entry = node('div', 'home-entry');
  const groups = [
    {
      className: 'home-lane',
      title: 'Set up Ultimate Macro',
      entries: [
        ['install', '01', 'Install the macro', 'Download and launch Main.ahk'],
        ['windows-display', '02', 'Configure Windows', 'Resolution, scaling and OCR'],
        ['tds-settings', '03', 'Configure TDS', 'Required in-game settings'],
        ['first-run', '04', 'Run a strategy', 'Check a full match before leaving']
      ]
    },
    {
      className: 'home-lane issue-lane',
      title: 'Troubleshoot',
      entries: [
        ['launch-fails', '', "Main.ahk won't open", ''],
        ['wrong-clicks', '', 'Towers not placing', ''],
        ['upgrade-not-working', '', 'Upgrades skipped', ''],
        ['ocr-errors', '', 'Wave or cash detection wrong', '']
      ]
    }
  ];
  for (const group of groups) {
    const section = node('section', group.className);
    const heading = node('div', 'lane-head');
    heading.append(node('h2', '', group.title));
    section.append(heading);
    const list = node('div', 'lane-list');
    for (const [slug, number, title, subtitle] of group.entries) {
      const a = articleLink(docs.get(slug), 'lane-link');
      a.textContent = '';
      if (number) a.append(node('span', 'number', number));
      const body = node('span', 'label');
      body.append(node('strong', '', title));
      if (subtitle) body.append(node('small', '', subtitle));
      a.append(body, node('span', 'arrow', '↗'));
      list.append(a);
    }
    section.append(list);
    entry.append(section);
  }
  view.append(entry);

  const browse = node('section', 'home-section');
  browse.append(sectionHeading('Browse articles'));
  const topicList = node('div', 'topic-list');
  for (const name of categories) {
    const a = categoryLink(name, 'topic-link');
    a.textContent = '';
    a.append(node('strong', 'topic-name', name), node('span', 'topic-arrow', '↗'));
    topicList.append(a);
  }
  browse.append(topicList);
  view.append(browse);
}
function categoryView(name) {
  document.title = name + ' · Ultimate Macro Wiki';
  view.append(breadcrumb(name));
  const head = node('header','article-header');
  head.append(node('span','article-category','Articles'),node('h1','',name),node('p','article-summary',categoryDetails[name]));
  view.append(head);
  const list = node('div','category-articles');
  for(const a of articles.filter(x => x.category === name)) {
    const l = articleLink(a);
    l.textContent = '';
    const content = node('div');
    content.append(node('strong','',a.title),node('small','',a.summary));
    l.append(content,node('span','','↗'));
    list.append(l);
  }
  view.append(list);
}
function breadcrumb(category, articleTitle) {
  const b=node('nav','breadcrumb');
  b.setAttribute('aria-label','Breadcrumb');
  const overview=link('Wiki','./');
  overview.dataset.home='true';
  b.append(overview,node('span','','/'));
  if(articleTitle) {
    b.append(categoryLink(category),node('span','','/'),node('span','',articleTitle));
  } else {
    b.append(node('span','',category));
  }
  return b;
}
function articleView(article) {
  document.title=article.title+' · Ultimate Macro Wiki';
  view.append(breadcrumb(article.category,article.title));
  const header=node('header','article-header');
  header.append(node('span','article-category',article.category),node('h1','',article.title),node('p','article-summary',article.summary));
  view.append(header);
  const columns=node('div','article-columns');
  const body=node('div','article-sections');
  const toc=node('nav','page-toc');
  toc.setAttribute('aria-label','On this page');
  toc.append(node('strong','','On this page'));
  for(const [i,sec] of article.sections.entries()) {
    const id='section-'+(i+1),section=node('section','doc-section');
    section.id=id;
    section.append(node('h2','',sec.title));
    for(const p of sec.paragraphs||[])section.append(node('p','',p));
    if(sec.rows?.length){
      const table=node('table','setting-table'),tbody=node('tbody');
      for(const [key,val] of sec.rows){const tr=node('tr');tr.append(node('th','',key),node('td','',val));tr.firstElementChild?.setAttribute('scope','row');tbody.append(tr);}
      table.append(tbody);section.append(table);
    }
    if(sec.steps?.length){const ol=node('ol');for(const step of sec.steps)ol.append(node('li','',step));section.append(ol);}
    if(sec.checks?.length){const ul=node('ul');for(const check of sec.checks)ul.append(node('li','',check));section.append(ul);}
    body.append(section);
    toc.append(link(sec.title,'#'+id));
  }
  const actions = node('div', 'article-actions');
  const copy = node('button', 'text-button', 'Copy article link');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(new URL(articleURL(article.slug), location.href).href);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Copy from address bar';
    }
  });
  actions.append(copy);
  if (article.category === 'Troubleshooting') {
    const help = link('Still stuck? Get support ↗', 'https://discord.gg/ultmacro', 'text-button');
    help.target = '_blank'; help.rel = 'noopener noreferrer';
    actions.append(help);
  }
  const sources = {
    install: [
      ['Download Ultimate Macro', '/download/'],
      ['Get AutoHotkey v2', 'https://www.autohotkey.com/v2/']
    ],
    'community-strategies': [['Browse Strategy Network', '/strategies/']],
    'discord-community': [['Join Discord', 'https://discord.gg/ultmacro']]
  };
  if (sources[article.slug]) {
    const resources = node('div', 'article-resources');
    for (const [label, url] of sources[article.slug]) {
      const a = link(label + ' ↗', url);
      if (url.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      resources.append(a);
    }
    header.append(resources);
  }
  const original = link('Source ↗', article.source, 'article-source');
  if (article.source.startsWith('https:')) {
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
  }
  actions.append(original);
  body.append(actions);
  const relatedBySlug = {
    install: ['requirements', 'windows-display', 'launch-fails'],
    requirements: ['install', 'windows-display'],
    'first-run': ['tds-settings', 'hotkeys'],
    'windows-display': ['roblox-settings', 'tds-settings', 'wrong-clicks'],
    'roblox-settings': ['tds-settings', 'ocr-errors'],
    'tds-settings': ['wrong-clicks', 'upgrade-not-working'],
    hotkeys: ['record-strategy', 'abilities-not-working'],
    'record-strategy': ['hotkeys', 'edit-strategy'],
    'edit-strategy': ['record-strategy', 'community-strategies'],
    'wrong-clicks': ['windows-display', 'tds-settings'],
    'ocr-errors': ['windows-display', 'roblox-settings'],
    'upgrade-not-working': ['tds-settings', 'hotkeys'],
    'abilities-not-working': ['hotkeys'],
    'legacy-mode': ['wrong-clicks'],
    'discord-not-working': ['discord-webhooks', 'discord-remote'],
    'discord-webhooks': ['discord-not-working', 'discord-remote'],
    'stuck-between-matches': ['session-settings'],
    'party-vip': ['session-settings']
  };
  const related = (relatedBySlug[article.slug] || []).map(slug => docs.get(slug)).filter(Boolean);
  if (related.length) {
    const more = node('section', 'related-section');
    more.append(sectionHeading('See also'));
    const list = node('div', 'issue-list');
    for (const a of related) {
      const l = articleLink(a);
      l.textContent = '';
      l.append(node('span', '', a.title), node('span', '', '↗'));
      list.append(l);
    }
    more.append(list);
    body.append(more);
  }
  columns.append(body,toc);view.append(columns);
}
function render() {
  view.replaceChildren();
  const {article,category}=queryState();
  if(article && docs.has(article)) articleView(docs.get(article));
  else if(category && categories.includes(category)) categoryView(category);
  else if(article || category){
    document.title='Page not found · Ultimate Macro Wiki';
    const fail=node('section','not-found');
    fail.append(node('h1','','Page not found'),node('p','','That guide does not exist. Try searching the wiki.'));
    const l=link('← Back to wiki','./');l.dataset.home='true';fail.append(l);view.append(fail);
  }else home();
  nav();
}
function tokens(s){
  return s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(x=>x.length>2 && !['the','and','for','how','does','are','what','can','not','with','my','why','isn','aren','don','won'].includes(x));
}
function search(query,limit=9){
  const words=tokens(query);
  if(!words.length)return articles.filter(a=>['install','first-run','wrong-clicks','record-strategy','hotkeys'].includes(a.slug)).slice(0,limit);
  return articles.map(a=>{
    const title=a.title.toLowerCase(),sum=a.summary.toLowerCase(),key=(a.keywords||[]).join(' ').toLowerCase(),
          body=a.sections.map(s=>[s.title,...(s.paragraphs||[]),...(s.steps||[]),...(s.checks||[]),...(s.rows||[]).flat()].join(' ')).join(' ').toLowerCase();
    let score=0,hits=0;
    for(const w of words){
      const variants=[w,w.replace(/ing$/,'').replace(/s$/,''),w==='placing'?'placement':w,w==='failed'?'fail':w];
      const has=v=>variants.some(t=>t.length>2&&v.includes(t));
      if(has(title)){score+=13;hits++}
      else if(has(key)){score+=11;hits++}
      else if(has(sum)){score+=5;hits++}
      else if(has(body)){score+=2;hits++}
    }
    if(hits===words.length)score+=15;
    return {a,score,hits};
  }).filter(x=>x.hits>0).sort((a,b)=>b.score-a.score||b.hits-a.hits||a.a.title.localeCompare(b.a.title)).slice(0,limit).map(x=>x.a);
}
function showResults(q){
  searchResults.replaceChildren();
  const hits=search(q);
  if(!hits.length){searchResults.append(node('p','search-empty','No guide matches that search. Try a shorter term or check Discord support.'));return;}
  for(const a of hits){
    const l=articleLink(a,'search-hit');
    l.textContent='';
    l.append(node('span','group',a.category),node('strong','',a.title),node('small','',a.summary));
    searchResults.append(l);
  }
}
function openSearch(query=''){
  overlay.hidden=false;document.body.style.overflow='hidden';
  searchInput.value=query;showResults(query);searchInput.focus();searchInput.select();
}
function closeSearch(focus=true){
  if(overlay.hidden)return;
  overlay.hidden=true;document.body.style.overflow='';
  if(focus)$('search-trigger').focus();
}
function toggleHelper(open){
  helper.hidden=!open;
  helperToggle.setAttribute('aria-expanded',String(open));
  helperToggle.setAttribute('aria-label',open?'Close wiki help':'Open wiki help');
  if(open)helperInput.focus();
}
function ask(question){
  $('helper-suggestions')?.remove();
  helperHistory.append(node('div','help-question',question));
  const matches=search(question,3);
  if(matches.length){
    helperHistory.append(node('div','help-answer','Try these guides:'));
    const list=node('div','help-links');
    for(const a of matches){const l=articleLink(a);l.textContent=a.title+' →';list.append(l);}
    helperHistory.append(list);
  }else{
    const message=node('div','help-answer','No matching article yet. Try a simpler search or contact the Discord support team.');
    const list=node('div','help-links');
    const discord=link('Open Discord support ↗','https://discord.gg/ultmacro');
    discord.target='_blank';discord.rel='noopener noreferrer';
    list.append(discord);helperHistory.append(message,list);
  }
  helperHistory.scrollTop=helperHistory.scrollHeight;
}
document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[data-article],a[data-category],a[data-home]');
  if(!anchor||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  event.preventDefault();
  if(anchor.dataset.article)go('article',anchor.dataset.article);
  else if(anchor.dataset.category)go('category',anchor.dataset.category);
  else go();
});
window.addEventListener('popstate',()=>{render();closeMenu();});
$('search-trigger').addEventListener('click',()=>openSearch());
$('search-close').addEventListener('click',()=>closeSearch());
searchInput.addEventListener('input',()=>showResults(searchInput.value));
overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearch();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSearch();closeMenu();if(!helper.hidden)toggleHelper(false);}
  const target=e.target;
  const writing=target instanceof HTMLElement&&target.matches('input,textarea,select,[contenteditable="true"]');
  if((e.key==='/'&&!writing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();openSearch();}
  if(e.key==='Enter'&&document.activeElement===searchInput){
    const result=search(searchInput.value,1)[0];
    if(result)go('article',result.slug);
  }
});
navToggle.addEventListener('click',()=>{
  const open=!sidebar.classList.contains('open');
  sidebar.classList.toggle('open',open);scrim.hidden=!open;navToggle.setAttribute('aria-expanded',String(open));
});
scrim.addEventListener('click',closeMenu);
helperToggle.addEventListener('click',()=>toggleHelper(helper.hidden));
$('helper-close').addEventListener('click',()=>toggleHelper(false));
$('helper-suggestions').addEventListener('click',e=>{
  const choice=e.target.closest('button[data-ask]');
  if(choice)ask(choice.dataset.ask);
});
$('helper-form').addEventListener('submit',e=>{
  e.preventDefault();
  const question=helperInput.value.trim();
  if(question){helperInput.value='';ask(question);}
});
render();
