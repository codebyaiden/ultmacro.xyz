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
  document.title = 'Ultimate Macro Wiki · Guides and troubleshooting';
  const hero = node('section', 'home-hero');
  const left = node('div');
  left.append(node('p', 'eyebrow', 'ULTIMATE MACRO / WIKI'));
  const title = node('h1');
  title.append(document.createTextNode('Find what you '), node('span', '', 'need.'));
  left.append(title, node('p', 'hero-description', 'Install the macro, set up your game, record strategies, or fix a problem.'));
  const searchButton = node('button', 'search-large');
  searchButton.type = 'button';
  searchButton.append(node('span', '', 'Search guides, settings, errors…'), node('kbd', '', '/'));
  searchButton.addEventListener('click', () => openSearch());
  left.append(searchButton);
  hero.append(left);
  const setup = node('aside', 'quick-setup');
  setup.append(node('h2', '', 'Quick setup reference'), node('p', '', 'Recommended starting values'));
  for (const [label, val] of [['Windows', '1920 × 1080 / 100%'], ['Roblox', '60 FPS / Classic'], ['TDS UI Scale', 'Large'], ['Screen Shake', 'Off']]) {
    const row = node('div', 'setup-value');
    row.append(node('span', '', label), node('strong', '', val));
    setup.append(row);
  }
  const setupLink = articleLink(docs.get('windows-display'));
  setupLink.textContent = 'Full configuration guide →';
  setup.append(setupLink);
  hero.append(setup);
  view.append(hero);

  const start = node('section', 'home-section');
  start.append(sectionHeading('Start here'));
  const startGrid = node('div', 'start-list');
  const entries = [
    { slug:'install', subtitle:'Download and open Main.ahk' },
    { slug:'first-run', subtitle:'Start and stop your first match' },
    { slug:'record-strategy', subtitle:'Save actions as a .strat file' },
    { slug:'wrong-clicks', subtitle:'Fix misplaced clicks and placements' }
  ];
  for (const [i, item] of entries.entries()) {
    const a = docs.get(item.slug), l = articleLink(a, 'start-link');
    l.textContent = '';
    const content = node('div');
    content.append(node('strong', '', a.title), node('small', '', item.subtitle));
    l.append(node('span', 'number', String(i + 1).padStart(2, '0')), content, node('span', 'arrow', '↗'));
    startGrid.append(l);
  }
  start.append(startGrid);
  view.append(start);

  const browse = node('section', 'home-section');
  browse.append(sectionHeading('Browse topics'));
  const topicList = node('div', 'topic-list');
  for (const name of categories) {
    const count = articles.filter(a => a.category === name).length;
    const row = categoryLink(name, 'topic-link');
    row.textContent = '';
    row.append(node('strong', 'topic-name', name), node('span', 'topic-description', categoryDetails[name]), node('span', 'topic-count', String(count)), node('span', 'topic-arrow', '↗'));
    topicList.append(row);
  }
  browse.append(topicList);
  view.append(browse);

  const fixes = node('section', 'home-section');
  fixes.append(sectionHeading('Common problems', 'Quick fixes'));
  const list = node('div', 'issue-list');
  for (const slug of ['launch-fails','wrong-clicks','ocr-errors','upgrade-not-working','abilities-not-working','stuck-between-matches']) {
    const a = docs.get(slug), l = articleLink(a);
    l.textContent = '';
    l.append(node('span', '', a.title), node('span', '', '↗'));
    list.append(l);
  }
  fixes.append(list);
  view.append(fixes);
}
function categoryView(name) {
  document.title = name + ' · Ultimate Macro Wiki';
  view.append(breadcrumb(name));
  const head = node('header','article-header');
  head.append(node('span','article-category','WIKI / TOPIC'),node('h1','',name),node('p','article-summary',categoryDetails[name]));
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
  const src=node('p','article-source');
  src.append(document.createTextNode('Reference: '));
  const sourceLabel=article.source.startsWith('/guide/')?'Ultimate Macro setup guide':article.source.includes('/issues')?'GitHub issues':article.source.includes('discord.gg')?'Official Discord':article.source==='/strategies/'?'Strategy Network': 'Official project repository';
  const source=link(sourceLabel+' ↗',article.source);
  if(article.source.startsWith('https:')){source.target='_blank';source.rel='noopener noreferrer';}
  src.append(source);
  body.append(src);
  const actions=node('div','article-actions');
  const copy=node('button','text-button','Copy link');
  copy.type='button';
  copy.addEventListener('click', async()=> {
    try{await navigator.clipboard.writeText(new URL(articleURL(article.slug),location.href).href);copy.textContent='Copied';}
    catch{copy.textContent='Use your address bar';}
  });
  const support=link('Report a problem ↗','https://github.com/UltimateMacro/Ultimate-Macro-New-Era/issues','text-button');
  support.target='_blank';support.rel='noopener noreferrer';
  actions.append(copy,support);body.append(actions);

  const nearby=articles.filter(a=>a.category===article.category&&a.slug!==article.slug).slice(0,3);
  if(nearby.length){
    const more=node('section','related-section');
    more.append(sectionHeading('Related guides'));
    const list=node('div','issue-list');
    for(const a of nearby){const l=articleLink(a);l.textContent='';l.append(node('span','',a.title),node('span','','↗'));list.append(l);}
    more.append(list);body.append(more);
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
    helperHistory.append(node('div','help-answer','These guides are the closest matches:'));
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
