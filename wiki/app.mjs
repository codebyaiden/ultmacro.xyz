import { articles, categories } from './content.mjs';

const byId = new Map(articles.map(article => [article.slug, article]));
const $ = id => document.getElementById(id);
const view = $('view');
const sidebar = $('sidebar');
const navToggle = $('nav-toggle');
const scrim = $('mobile-scrim');
const overlay = $('search-overlay');
const searchField = $('search-field');
const searchResults = $('search-results');
const helperPanel = $('helper-panel');
const helperToggle = $('helper-toggle');
const helperHistory = $('helper-history');
const helperInput = $('helper-input');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function hrefFor(slug) {
  return slug ? './?article=' + encodeURIComponent(slug) : './';
}

function articleLink(article, className) {
  const a = element('a', className);
  a.href = hrefFor(article.slug);
  a.dataset.article = article.slug;
  return a;
}

function clear(node) {
  node.replaceChildren();
}

function selectedArticle() {
  return new URL(window.location.href).searchParams.get('article');
}
function selectedCategory() {
  return new URL(window.location.href).searchParams.get('category');
}

function navigate(slug) {
  const url = new URL('./', window.location.href);
  if (slug) url.searchParams.set('article', slug);
  history.pushState({}, '', url);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  closeNavigation();
  closeSearch(false);
}

function navigateCategory(category) {
  const url = new URL('./', window.location.href);
  url.searchParams.set('category', category);
  history.pushState({}, '', url);
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  closeNavigation();
  closeSearch(false);
}

function renderSidebar(activeSlug = null) {
  const nav = $('sidebar-nav');
  clear(nav);
  $('sidebar-home').classList.toggle('active', !activeSlug);
  for (const category of categories) {
    const group = element('section', 'nav-group');
    const heading = element('div', 'nav-group-name', category);
    group.append(heading);
    for (const article of articles.filter(a => a.category === category)) {
      const link = articleLink(article, activeSlug === article.slug ? 'active' : '');
      link.textContent = article.title;
      if (activeSlug === article.slug) link.setAttribute('aria-current', 'page');
      group.append(link);
    }
    nav.append(group);
  }
}

const categorySymbols = {
  'Getting started': '↗',
  'Configuration': '⚙',
  'Strategies': '◇',
  'Features': '✳',
  'Troubleshooting': '+',
  'Discord & community': '◎'
};

function searchButton(className, label) {
  const button = element('button', className, label);
  button.type = 'button';
  button.addEventListener('click', () => openSearch());
  return button;
}

function renderHome() {
  document.title = 'Ultimate Macro Wiki · Guides, fixes & community';
  const welcome = element('section', 'welcome');
  welcome.append(element('p', 'eyebrow', 'ULTIMATE MACRO / KNOWLEDGE BASE'));
  const heading = element('h1');
  heading.append(document.createTextNode('Everything you need to know about '), element('span', '', 'Ultimate Macro.'));
  welcome.append(heading);
  welcome.append(element('p', '', 'Learn how to get started, build strategies, solve problems, and get more from the macro. Clear documentation in one place.'));
  const search = searchButton('hero-search');
  search.append(element('span', '', 'Search setup, features, errors and more…'), element('kbd', '', '/'));
  const magnifier = element('span', '', '⌕');
  magnifier.setAttribute('aria-hidden', 'true');
  search.prepend(magnifier);
  welcome.append(search);
  const quick = element('div', 'quick-questions');
  for (const phrase of ['How do I install?', 'Tower placement fails', 'Discord webhooks', 'Recording hotkeys']) {
    const item = element('button', '', phrase);
    item.type = 'button';
    item.addEventListener('click', () => openSearch(phrase));
    quick.append(item);
  }
  welcome.append(quick);
  view.append(welcome);

  const start = element('section', 'home-section');
  start.append(sectionHeader('Start here', 'New to Ultimate Macro?'));
  const startGrid = element('div', 'start-grid');
  for (const [slug, icon, desc] of [
    ['install', '↓', 'Download, extract and get the app running.'],
    ['first-run', '▶', 'Pick a strategy and complete a safe first match.']
  ]) {
    const doc = byId.get(slug);
    const link = articleLink(doc, 'card-link');
    link.append(element('span', 'card-icon', icon), element('strong', '', doc.title), element('p', '', desc));
    startGrid.append(link);
  }
  start.append(startGrid);
  view.append(start);

  const categoriesSection = element('section', 'home-section');
  categoriesSection.append(sectionHeader('Explore the wiki', articles.length + ' reviewed guides'));
  const grid = element('div', 'topic-grid');
  for (const category of categories) {
    const matched = articles.filter(doc => doc.category === category);
    const card = element('button', 'topic-card');
    card.type = 'button';
    card.setAttribute('aria-label', 'Explore ' + category);
    const top = element('div', 'topic-top');
    top.append(element('span', '', categorySymbols[category] || '·'), element('span', 'count', matched.length + ' articles'));
    card.append(top, element('strong', '', category), element('p', '', categoryDescription(category)));
    card.addEventListener('click', () => navigateCategory(category));
    grid.append(card);
  }
  categoriesSection.append(grid);
  view.append(categoriesSection);

  const popular = element('section', 'home-section');
  popular.append(sectionHeader('Commonly needed', 'Direct answers'));
  const list = element('div', 'article-list');
  for (const slug of ['windows-display', 'record-strategy', 'hotkeys', 'wrong-clicks', 'ocr-errors', 'discord-webhooks']) {
    const doc = byId.get(slug);
    const link = articleLink(doc);
    link.append(element('span', '', doc.title), element('span', '', '↗'));
    list.append(link);
  }
  popular.append(list);
  view.append(popular);

  view.append(element('div', 'wiki-note', 'Documentation is based on verified public release information. New versions can behave differently; always check the release notes before assuming a guide applies. The wiki is expanding beyond this initial collection.'));
}

function categoryDescription(category) {
  return ({
    'Getting started': 'Install and launch',
    'Configuration': 'Windows, Roblox and TDS',
    'Strategies': 'Record, edit and replay',
    'Features': 'Session and editor tools',
    'Troubleshooting': 'Common problems and fixes',
    'Discord & community': 'Support and community'
  })[category] || 'Documentation';
}

function sectionHeader(title, detail) {
  const head = element('div', 'section-head');
  head.append(element('h2', '', title), element('span', '', detail));
  return head;
}

function renderArticle(article) {
  document.title = article.title + ' · Ultimate Macro Wiki';
  const crumbs = element('div', 'breadcrumb');
  const home = element('a', '', 'Wiki');
  home.href = './';
  home.dataset.article = '';
  crumbs.append(home, element('span', '', '/'), element('span', '', article.category), element('span', '', '/'), element('span', '', article.title));
  view.append(crumbs);

  const head = element('header', 'article-heading');
  const kind = element('div', 'article-kind');
  kind.append(element('span', '', article.category), element('span', 'version-tag', 'v1.3.x reference'));
  head.append(kind, element('h1', '', article.title), element('p', 'article-summary', article.summary));
  view.append(head);

  const layout = element('div', 'article-layout');
  const body = element('div', 'article-body');
  const toc = element('nav', 'article-toc');
  toc.setAttribute('aria-label', 'On this page');
  toc.append(element('strong', '', 'On this page'));
  for (const [index, section] of article.sections.entries()) {
    const id = 'section-' + (index + 1);
    const item = element('section', 'article-section');
    item.id = id;
    item.append(element('h2', '', section.title));
    for (const paragraph of section.paragraphs || []) item.append(element('p', '', paragraph));
    if (section.steps?.length) {
      const list = element('ol');
      for (const step of section.steps) list.append(element('li', '', step));
      item.append(list);
    }
    if (section.checks?.length) {
      const list = element('ul', 'checklist');
      for (const check of section.checks) list.append(element('li', '', check));
      item.append(list);
    }
    body.append(item);
    const jump = element('a', '', section.title);
    jump.href = '#' + id;
    toc.append(jump);
  }

  const source = element('aside', 'source-box');
  source.append(element('strong', '', 'Source and version'));
  source.append(element('p', '', 'This guide is derived from publicly documented Ultimate Macro features and setup instructions. Confirm version-specific behavior against the linked source.'));
  const external = element('a', '', 'Read the primary source ↗');
  external.href = article.source;
  if (external.href.startsWith('https:')) {
    external.target = '_blank';
    external.rel = 'noopener noreferrer';
  }
  source.append(external);
  body.append(source);

  const actions = element('div', 'article-actions');
  const copyButton = element('button', '', 'Copy article link');
  copyButton.type = 'button';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(new URL(hrefFor(article.slug), location.href).href);
      copyButton.textContent = 'Link copied';
    } catch {
      copyButton.textContent = 'Use the address bar to copy';
    }
  });
  const findMore = element('button', '', 'Find another guide →');
  findMore.type = 'button';
  findMore.addEventListener('click', () => openSearch());
  actions.append(copyButton, findMore);
  body.append(actions);

  const related = articles.filter(a => a.category === article.category && a.slug !== article.slug).slice(0,4);
  if (related.length) {
    const block = element('section', 'more-guides');
    block.append(sectionHeader('Related guides', article.category));
    const list = element('div', 'article-list');
    for (const doc of related) {
      const link = articleLink(doc);
      link.append(element('span', '', doc.title), element('span', '', '↗'));
      list.append(link);
    }
    block.append(list);
    body.append(block);
  }
  layout.append(body, toc);
  view.append(layout);
}

function renderCategory(category) {
  document.title = category + ' · Ultimate Macro Wiki';
  const crumbs = element('div', 'breadcrumb');
  const home = element('a', '', 'Wiki');
  home.href = './';
  home.dataset.article = '';
  crumbs.append(home, element('span', '', '/'), element('span', '', category));
  view.append(crumbs);
  const heading = element('header', 'article-heading');
  heading.append(element('div', 'article-kind', 'BROWSE TOPIC'), element('h1', '', category), element('p', 'article-summary', categoryDescription(category)));
  view.append(heading);
  const section = element('section', 'home-section');
  section.append(sectionHeader('All guides', articles.filter(a => a.category === category).length + ' articles'));
  const list = element('div', 'article-list');
  for (const doc of articles.filter(a => a.category === category)) {
    const link = articleLink(doc);
    link.append(element('span', '', doc.title), element('span', '', '↗'));
    list.append(link);
  }
  section.append(list);
  view.append(section);
}

function render() {
  clear(view);
  const slug = selectedArticle();
  const category = selectedCategory();
  const article = slug ? byId.get(slug) : null;
  if (slug && !article) {
    document.title = 'Article not found · Ultimate Macro Wiki';
    const block = element('div', 'welcome');
    block.append(element('p', 'eyebrow', '404 / WIKI'), element('h1', '', 'That guide does not exist.'), element('p', '', 'Try the search or return to the wiki homepage.'));
    const link = element('a', '', '← Wiki home');
    link.href = './';
    link.dataset.article = '';
    block.append(link);
    view.append(block);
  } else if (article) {
    renderArticle(article);
  } else if (category && categories.includes(category)) {
    renderCategory(category);
  } else {
    renderHome();
  }
  renderSidebar(article?.slug || (category ? '__category__' : null));
}

function tokenize(input) {
  return input.toLocaleLowerCase('en').normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(word => word.length > 1);
}

function findArticles(query, limit = 8) {
  const terms = tokenize(query);
  if (!terms.length) return articles.slice(0, limit);
  return articles.map(article => {
    const title = article.title.toLowerCase();
    const category = article.category.toLowerCase();
    const summary = article.summary.toLowerCase();
    const body = article.sections.map(s => [s.title, ...(s.paragraphs || []), ...(s.steps || []), ...(s.checks || [])].join(' ')).join(' ').toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 8;
      if (category.includes(term)) score += 4;
      if (summary.includes(term)) score += 3;
      if (body.includes(term)) score += 1;
    }
    return { article, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title)).slice(0, limit).map(item => item.article);
}

function showResults(query = '') {
  clear(searchResults);
  const matches = findArticles(query, 10);
  if (!matches.length) {
    searchResults.append(element('div', 'search-empty', 'No matching article yet. Try a broader term, or ask for help in the official Discord.'));
    return;
  }
  for (const doc of matches) {
    const link = articleLink(doc, 'search-item');
    link.append(element('span', 'search-item-category', doc.category), element('span', 'search-item-title', doc.title), element('span', 'search-item-summary', doc.summary));
    searchResults.append(link);
  }
}

function openSearch(query = '') {
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  searchField.value = query;
  showResults(query);
  searchField.focus();
  searchField.select();
}

function closeSearch(restoreFocus = true) {
  if (overlay.hidden) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
  if (restoreFocus) $('search-trigger').focus();
}

function closeNavigation() {
  sidebar.classList.remove('open');
  scrim.hidden = true;
  navToggle.setAttribute('aria-expanded', 'false');
}

function setHelper(open) {
  helperPanel.hidden = !open;
  helperToggle.setAttribute('aria-expanded', String(open));
  helperToggle.setAttribute('aria-label', open ? 'Close wiki help' : 'Open wiki help');
  if (open) helperInput.focus();
}

function appendHelperMessage(text, user = false) {
  const message = element('div', user ? 'helper-message user' : 'helper-message', text);
  helperHistory.append(message);
}

function handleHelperQuestion(question) {
  appendHelperMessage(question, true);
  const results = findArticles(question, 3);
  if (results.length) {
    appendHelperMessage('These verified wiki articles are the closest matches:');
    const list = element('div', 'helper-results');
    for (const article of results) {
      const link = articleLink(article);
      link.textContent = article.title + ' →';
      list.append(link);
    }
    helperHistory.append(list);
  } else {
    appendHelperMessage('I could not find a matching verified guide. For a new or unusual issue, ask in the official Ultimate Macro Discord and include your version and logs.');
    const support = element('a', '', 'Open official Discord support ↗');
    support.href = 'https://discord.gg/ultmacro';
    support.target = '_blank';
    support.rel = 'noopener noreferrer';
    const list = element('div', 'helper-results');
    list.append(support);
    helperHistory.append(list);
  }
  helperHistory.scrollTop = helperHistory.scrollHeight;
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-article]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.dataset.article || null);
});
window.addEventListener('popstate', () => { render(); closeNavigation(); });

$('search-trigger').addEventListener('click', () => openSearch());
$('search-close').addEventListener('click', () => closeSearch());
searchField.addEventListener('input', () => showResults(searchField.value));
overlay.addEventListener('click', event => { if (event.target === overlay) closeSearch(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeSearch();
    closeNavigation();
    if (!helperPanel.hidden) setHelper(false);
  }
  const target = event.target;
  const isTyping = target instanceof HTMLElement && (target.matches('input,textarea,[contenteditable="true"]'));
  if ((event.key === '/' && !isTyping) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Enter' && document.activeElement === searchField) {
    const first = findArticles(searchField.value, 1)[0];
    if (first) navigate(first.slug);
  }
});
navToggle.addEventListener('click', () => {
  const open = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  scrim.hidden = !open;
  navToggle.setAttribute('aria-expanded', String(open));
});
scrim.addEventListener('click', closeNavigation);
helperToggle.addEventListener('click', () => setHelper(helperPanel.hidden));
$('helper-close').addEventListener('click', () => setHelper(false));
$('helper-form').addEventListener('submit', event => {
  event.preventDefault();
  const question = helperInput.value.trim();
  if (!question) return;
  helperInput.value = '';
  handleHelperQuestion(question);
});

render();
