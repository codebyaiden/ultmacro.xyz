import { articles, categories } from './content.mjs?v=10';
import { proposedTopics, topicCategories } from './catalog.mjs?v=6';
import { resolveTopicGuidance } from './topic-support.mjs?v=10';

const $ = id => document.getElementById(id);
const docs = new Map(articles.map(a => [a.slug, a]));
const topics = new Map(proposedTopics.map(t => [t.slug, t]));
const view = $('view');
const sidebar = $('sidebar');
const scrim = $('mobile-scrim');
const navToggle = $('nav-toggle');
const mobileNavigation = window.matchMedia('(max-width: 1110px)');
const expandedGroups = new Set(['Start here', 'Troubleshooting']);
let sectionObserver;
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
function topicURL(slug) { return './?topic=' + encodeURIComponent(slug); }
function libraryURL() { return './?library=1'; }
function topicLink(t, cls = '') { const a = link(t.title, topicURL(t.slug), cls); a.dataset.topic = t.slug; return a; }
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
  return { article: p.get('article'), category: p.get('category'), topic: p.get('topic'), library: p.get('library') };
}
function go(type = '', value = '') {
  const dest = new URL('./', location.href);
  if (type && value) dest.searchParams.set(type, value);
  history.pushState(null, '', dest);
  closeSearch(false);
  closeMenu();
  render();
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}
function syncSidebarAccessibility() {
  sidebar.inert = mobileNavigation.matches && !sidebar.classList.contains('open');
}
function closeMenu({ restoreFocus = false } = {}) {
  const wasOpen = sidebar.classList.contains('open');
  sidebar.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  scrim.hidden = true;
  document.body.classList.remove('wiki-menu-open');
  syncSidebarAccessibility();
  if (restoreFocus && wasOpen && mobileNavigation.matches) {
    (document.querySelector('.um-wiki-browse') || navToggle).focus();
  }
}
function openMenu() {
  closeSearch(false);
  sidebar.classList.add('open');
  navToggle.setAttribute('aria-expanded', 'true');
  scrim.hidden = false;
  document.body.classList.add('wiki-menu-open');
  syncSidebarAccessibility();
  $('sidebar-close').focus();
}
function nav() {
  const root = $('sidebar-nav');
  root.replaceChildren();
  const { article, category, library, topic } = queryState();
  $('sidebar-home').classList.toggle('active', !article && !category && !library && !topic);

  const activeCategory = docs.get(article)?.category || category;
  for (const name of categories) {
    const group = node('details', 'nav-group');
    group.open = activeCategory === name || expandedGroups.has(name);
    group.addEventListener('toggle', () => {
      if (group.open) expandedGroups.add(name);
      else expandedGroups.delete(name);
    });
    const summary = node('summary');
    summary.setAttribute('aria-label', 'Toggle ' + name + ' articles');
    const groupArticles = articles.filter(x => x.category === name);
    summary.append(node('span', 'nav-group-label', name), node('span', 'nav-count', String(groupArticles.length)));
    group.append(summary);
    const items = node('div', 'nav-items');
    const visible = groupArticles.slice(0, 7);
    const current = groupArticles.find(x => x.slug === article);
    if (current && !visible.includes(current)) visible.push(current);
    for (const a of visible) {
      const aLink = articleLink(a, article === a.slug ? 'active' : '');
      if (article === a.slug) aLink.setAttribute('aria-current', 'page');
      items.append(aLink);
    }
    if (groupArticles.length > visible.length) {
      const more = categoryLink(name, 'sidebar-more');
      more.textContent = 'All ' + groupArticles.length + ' guides →';
      items.append(more);
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
  const copy = node('div', 'hero-content');
  const heading = node('h1');
  heading.append(document.createTextNode('Your guide to '), node('em', '', 'Ultimate Macro.'));
  copy.append(heading);
  copy.append(node('p', '', 'Set up Roblox and TDS, record a strategy, or find out why a run stopped working.'));
  const actions = node('div', 'hero-actions');
  const start = articleLink(docs.get('install'), 'hero-action');
  start.textContent = 'Get started ↗';
  const fix = categoryLink('Troubleshooting', 'hero-secondary');
  fix.textContent = 'Find a fix →';
  actions.append(start, fix);
  copy.append(actions);
  hero.append(copy);
  const image = node('div', 'hero-device');
  const frame = node('div', 'device-frame');
  const screenshot = node('img');
  screenshot.src = '../assets/ui/ultimate-macro-main-new.png';
  screenshot.alt = 'Ultimate Macro desktop app main screen';
  screenshot.width = 702;
  screenshot.height = 567;
  screenshot.loading = 'lazy';
  frame.append(screenshot);
  image.append(frame);
  hero.append(image);
  view.append(hero);

  const searchButton = node('button', 'hero-search');
  searchButton.type = 'button';
  searchButton.setAttribute('aria-label', 'Search all wiki articles');
  const icon = node('span', 'search-glyph');
  icon.setAttribute('aria-hidden', 'true');
  searchButton.append(icon, node('span', '', 'Search setup, hotkeys, errors, strategies…'), node('kbd', '', '/'));
  searchButton.addEventListener('click', () => openSearch());
  view.append(searchButton);

  const entry = node('div', 'home-entry');
  const groups = [
    {
      className: 'home-lane',
      title: 'Set up Ultimate Macro',
      entries: [
        ['install', '01', 'Install the macro', 'Download and open Main.ahk'],
        ['windows-display', '02', 'Configure Windows', 'Resolution, scaling and OCR'],
        ['tds-settings', '03', 'Configure TDS', 'UI Scale, upgrades and screen shake'],
        ['first-run', '04', 'Run a strategy', 'Watch the first match']
      ]
    },
    {
      className: 'home-lane issue-lane',
      title: 'Something not working?',
      entries: [
        ['launch-fails', '', "Main.ahk won't open", ''],
        ['wrong-clicks', '', "Towers won't place", ''],
        ['upgrade-not-working', '', 'Upgrades get skipped', ''],
        ['ocr-errors', '', 'Wrong wave or cash detection', '']
      ]
    }
  ];
  for (const group of groups) {
    const section = node('section', group.className);
    const head = node('div', 'lane-head');
    head.append(node('h2', '', group.title));
    section.append(head);
    const list = node('div', 'lane-list');
    for (const [slug, number, title, subtitle] of group.entries) {
      const a = articleLink(docs.get(slug), 'lane-link');
      a.textContent = '';
      if (number) a.append(node('span', 'number', number));
      const label = node('span', 'label');
      label.append(node('strong', '', title));
      if (subtitle) label.append(node('small', '', subtitle));
      a.append(label, node('span', 'arrow', '↗'));
      list.append(a);
    }
    section.append(list);
    entry.append(section);
  }
  view.append(entry);

  const browse = node('section', 'home-section');
  browse.append(sectionHeading('Explore the wiki'));
  const topics = node('div', 'topic-list');
  for (const name of categories) {
    const a = categoryLink(name, 'topic-link');
    a.textContent = '';
    a.append(node('span', 'topic-name', name), node('span', 'topic-arrow', '↗'));
    topics.append(a);
  }
  browse.append(topics);
  const apiLink = link('Building a bot? Use the Wiki API →', './api/', 'catalog-home-link');
  browse.append(apiLink);
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

function researchLabel(item) {
  if (item.priority === 'P3') return 'Release or policy verification needed';
  return 'Not yet verified';
}

function libraryView() {
  document.title = 'Documentation research backlog · Ultimate Macro';
  const head = node('section', 'library-header');
  head.append(node('h1', '', 'Research backlog'));
  head.append(node('p', '', proposedTopics.length + ' candidates for future documentation. These are not tested problems or published solutions. For help, use the main wiki search.'));
  view.append(head);

  const controls = node('div', 'library-controls');
  const params = new URL(location.href).searchParams;
  const filter = node('input', 'library-query');
  filter.type = 'search'; filter.placeholder = 'Filter research topics…'; filter.setAttribute('aria-label', 'Filter research topics'); filter.value = params.get('find') || '';
  const area = node('select', 'library-select');
  area.setAttribute('aria-label', 'Filter by subject');
  const all = node('option', '', 'All subjects'); all.value = ''; area.append(all);
  for (const category of topicCategories) { const option = node('option', '', category); option.value = category; area.append(option); }
  const priority = node('select', 'library-select');
  priority.setAttribute('aria-label', 'Filter by editorial priority');
  for (const [value, title] of [['', 'All priorities'],['P1','First priority'],['P2','Later'],['P3','Release-dependent']]) {
    const opt = node('option', '', title);opt.value = value;priority.append(opt);
  }
  area.value = topicCategories.includes(params.get('subject')) ? params.get('subject') : '';
  priority.value = ['P1','P2','P3'].includes(params.get('priority')) ? params.get('priority') : '';
  controls.append(filter, area, priority);
  view.append(controls);
  const count = node('p', 'library-count');
  count.setAttribute('aria-live', 'polite');
  view.append(count);
  const listing = node('div', 'library-list');
  view.append(listing);
  let shown = 50;
  function refresh() {
    const needle = filter.value.toLowerCase().trim();
    const matches = proposedTopics.filter(t => (!area.value || t.category === area.value) &&
      (!priority.value || t.priority === priority.value) &&
      (!needle || (t.title + ' ' + t.category).toLowerCase().includes(needle)));
    count.textContent = matches.length + ' research topics';
    listing.replaceChildren();
    if (!matches.length) {
      listing.append(node('p', 'library-empty', 'No topics match. Try another term or category.'));
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const topic of matches.slice(0,shown)) {
      const item = topicLink(topic, 'catalog-row');
      item.textContent = '';
      const left = node('span','catalog-row-body');
      left.append(node('strong','',topic.title),node('small','',topic.category + ' · ' + researchLabel(topic)));
      item.append(left,node('span','catalog-arrow','↗'));
      fragment.append(item);
    }
    listing.append(fragment);
    if (matches.length > shown) {
      const more = node('button','catalog-more','Show more topics');
      more.type = 'button';
      more.addEventListener('click', () => { shown += 50; refresh(); });
      listing.append(more);
    }
  }
  const onChange = () => {
    shown=50;
    const url = new URL(location.href);
    for (const [name, value] of [['find',filter.value.trim()],['subject',area.value],['priority',priority.value]]) {
      if (value) url.searchParams.set(name,value); else url.searchParams.delete(name);
    }
    history.replaceState(null,'',url);
    refresh();
  };
  filter.addEventListener('input',onChange);
  area.addEventListener('change',onChange);
  priority.addEventListener('change',onChange);
  refresh();
}

function topicView(topic) {
  document.title = topic.title + ' · Ultimate Macro Wiki topics';
  view.append(breadcrumb('Research backlog'));
  const guidance = resolveTopicGuidance(topic, docs);
  const head = node('header', 'article-header');
  head.append(node('span', 'article-category', topic.category));
  head.append(node('h1', '', topic.title));
  head.append(node('p', 'article-summary', guidance.kind === 'related'
    ? 'Relevant documented steps are shown below. This exact topic has not been independently tested as a standalone guide.'
    : 'This requires release evidence or a reproducible test before instructions can be published.'));
  view.append(head);

  const body = node('div', 'topic-detail');
  body.append(node('h2', '', guidance.headline));
  if (guidance.guide && guidance.section) {
    const section = guidance.section;
    const documented = node('section', 'topic-evidence');
    documented.append(node('h3', '', section.title));
    for (const paragraph of (section.paragraphs || []).slice(0,3)) documented.append(node('p','',paragraph));
    if (section.steps?.length) {
      const ol = node('ol');
      for (const step of section.steps.slice(0,8)) ol.append(node('li','',step));
      documented.append(ol);
    }
    if (section.checks?.length) {
      const ul = node('ul');
      for (const check of section.checks.slice(0,8)) ul.append(node('li','',check));
      documented.append(ul);
    }
    if (section.rows?.length) {
      const table = node('table','setting-table'), tbody = node('tbody');
      for (const [key,val] of section.rows.slice(0,10)) {
        const tr=node('tr');
        const th=node('th','',key);th.setAttribute('scope','row');
        tr.append(th,node('td','',val));tbody.append(tr);
      }
      table.append(tbody);documented.append(table);
    }
    body.append(documented);
    const source = link('Source: '+guidance.guide.title+' ↗',guidance.guide.source,'topic-reference');
    if(guidance.guide.source.startsWith('https:')){source.target='_blank';source.rel='noopener noreferrer';}
    body.append(source);
    const read=articleLink(guidance.guide,'topic-guide');
    read.textContent='';
    read.append(node('strong','','Read the full '+guidance.guide.title+' guide'),
      node('span','',guidance.guide.summary),node('span','','Open guide →'));
    body.append(read);
    if(guidance.guide.version)body.append(node('p','article-version','Documented for '+guidance.guide.version));
  } else {
    body.append(node('p','topic-note',guidance.note));
    if (guidance.guide) {
      const related = articleLink(guidance.guide,'topic-guide');
      related.textContent = '';
      related.append(node('strong','','Related reading: '+guidance.guide.title),
        node('span','','This guide may provide context, not a verified fix for this exact topic.'),
        node('span','','Open guide →'));
      body.append(related);
    }
  }
  if(guidance.kind==='related')body.append(node('p','topic-note',guidance.note));
  const actions=node('div','topic-actions');
  const back=link('← Research backlog',libraryURL(),'text-button');back.dataset.library='1';
  const issue=link('Request or report evidence ↗','https://github.com/UltimateMacro/Ultimate-Macro-New-Era/issues','text-button');
  issue.target='_blank';issue.rel='noopener noreferrer';
  actions.append(back,issue);body.append(actions);
  view.append(body);
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
  if (article.version) header.append(node('p','article-version','Documented for '+article.version));
  if(article.illustration){
    const figure=node('figure','article-figure');
    const img=node('img');img.src=article.illustration.src;img.alt=article.illustration.alt;img.loading='lazy';
    figure.append(img,node('figcaption','',article.illustration.caption));header.append(figure);
  }
  view.append(header);
  const mobileToc = node('details', 'mobile-toc');
  const mobileSummary = node('summary', '', 'On this page');
  const sectionCount = node('span', 'mobile-toc-count', article.sections.length + ' sections');
  mobileSummary.append(sectionCount);
  const mobileLinks = node('nav', 'mobile-toc-links');
  mobileLinks.setAttribute('aria-label', 'Article sections');
  mobileToc.append(mobileSummary, mobileLinks);
  view.append(mobileToc);
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
    if(sec.code){
      const box=node('div','doc-code');
      const button=node('button','doc-code-copy','Copy code');button.type='button';
      button.setAttribute('aria-label','Copy example for '+sec.title);
      button.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(sec.code);button.textContent='Copied';}
        catch{button.textContent='Select the example to copy';}
      });
      const pre=node('pre'),code=node('code','',sec.code);pre.append(code);box.append(button,pre);section.append(box);
    }
    body.append(section);
    toc.append(link(sec.title,'#'+id));
    mobileLinks.append(link(sec.title,'#'+id));
  }
  mobileLinks.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) mobileToc.open = false;
  });
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
  if ('IntersectionObserver' in window) {
    sectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const anchor of toc.querySelectorAll('a')) {
          if (anchor.getAttribute('href') === '#' + entry.target.id) anchor.setAttribute('aria-current', 'location');
          else anchor.removeAttribute('aria-current');
        }
      }
    }, { rootMargin: '-110px 0px -65% 0px', threshold: 0 });
    for (const section of body.querySelectorAll('.doc-section')) sectionObserver.observe(section);
  }
}
function render() {
  if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = undefined; }
  view.replaceChildren();
  const {article,category,topic,library}=queryState();
  if(article && docs.has(article)) articleView(docs.get(article));
  else if(category && categories.includes(category)) categoryView(category);
  else if(topic && topics.has(topic)) topicView(topics.get(topic));
  else if(library) libraryView();
  else if(article || category || topic){
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
function searchTopics(q, limit = 4) {
  const words = tokens(q);
  if (!words.length) return [];
  return proposedTopics.map(t => {
    const title = t.title.toLowerCase();
    const category = t.category.toLowerCase();
    let score = 0, hits = 0;
    for (const word of words) {
      if (title.includes(word)) { score += 12; hits++; }
      else if (category.includes(word)) { score += 2; hits++; }
    }
    if (hits === words.length) score += 12;
    return {topic:t,score};
  }).filter(x => x.score > 0).sort((a,b)=>b.score-a.score || a.topic.title.localeCompare(b.topic.title)).slice(0,limit).map(x=>x.topic);
}
function showResults(q) {
  searchResults.replaceChildren();
  const hits = search(q, 8);
  if (!hits.length) {
    searchResults.append(node('p','search-empty','No published guide matches. Try a shorter term, or ask in Discord support.'));
    return;
  }
  for (const article of hits) {
    const item = articleLink(article,'search-hit');
    item.textContent = '';
    item.append(node('span','group',article.category),node('strong','',article.title),node('small','',article.summary));
    searchResults.append(item);
  }
}
let searchCloseTimer = 0;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function openSearch(query=''){
  closeMenu();
  window.clearTimeout(searchCloseTimer);
  overlay.classList.remove('is-closing');
  overlay.hidden=false;
  overlay.inert=false;
  overlay.removeAttribute('aria-hidden');
  document.body.style.overflow='hidden';
  searchInput.value=query;showResults(query);searchInput.focus();searchInput.select();
}
function closeSearch(focus=true){
  if(overlay.hidden)return;
  window.clearTimeout(searchCloseTimer);
  overlay.inert=true;
  overlay.setAttribute('aria-hidden','true');
  overlay.classList.add('is-closing');
  document.body.style.overflow='';
  if(focus)(document.querySelector('button.um-wiki-search') || $('search-trigger')).focus();
  const finish = () => { overlay.hidden=true;overlay.classList.remove('is-closing'); };
  if(prefersReducedMotion.matches) finish();
  else searchCloseTimer=window.setTimeout(finish,150);
}
function toggleHelper(open){
  if (open && sidebar.classList.contains('open')) closeMenu();
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
  const anchor=event.target.closest('a[data-article],a[data-category],a[data-topic],a[data-library],a[data-home]');
  if(!anchor||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  event.preventDefault();
  if(anchor.dataset.article)go('article',anchor.dataset.article);
  else if(anchor.dataset.category)go('category',anchor.dataset.category);
  else if(anchor.dataset.topic)go('topic',anchor.dataset.topic);
  else if(anchor.dataset.library)go('library','1');
  else go();
});
window.addEventListener('popstate',()=>{render();closeMenu();});
$('search-trigger').addEventListener('click',()=>openSearch());
$('search-close').addEventListener('click',()=>closeSearch());
searchInput.addEventListener('input',()=>showResults(searchInput.value));
overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearch();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSearch();closeMenu({ restoreFocus: true });if(!helper.hidden)toggleHelper(false);}
  if (!overlay.hidden && e.key === 'Tab') {
    const focusables = [...overlay.querySelectorAll('input,button,a[href]')].filter(el => !el.disabled && !el.hidden);
    if (focusables.length) {
      const first = focusables[0], last = focusables[focusables.length-1];
      if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  }
  const target=e.target;
  const writing=target instanceof HTMLElement&&target.matches('input,textarea,select,[contenteditable="true"]');
  if((e.key==='/'&&!writing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();openSearch();}
  if(e.key==='Enter'&&document.activeElement===searchInput){
    const result=search(searchInput.value,1)[0];
    if(result)go('article',result.slug);
  }
});
navToggle.addEventListener('click', () => {
  if (sidebar.classList.contains('open')) closeMenu({ restoreFocus: true });
  else openMenu();
});
scrim.addEventListener('click', () => closeMenu({ restoreFocus: true }));
$('sidebar-close').addEventListener('click', () => closeMenu({ restoreFocus: true }));
mobileNavigation.addEventListener('change', () => closeMenu());
syncSidebarAccessibility();
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
