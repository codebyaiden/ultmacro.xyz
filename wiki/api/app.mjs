import { integrations, staticFallbackCode } from './examples.mjs';

const byId = id => document.getElementById(id);
const platformTabs = [...document.querySelectorAll('[role="tab"][data-platform]')];
const byPlatform = new Map(integrations.map(entry => [entry.id, entry]));
const platformLinks = byId('platform-links');

function setPlatform(id, { focus = false, updateURL = true } = {}) {
  const entry = byPlatform.get(id) || integrations[0];
  for (const tab of platformTabs) {
    const selected = tab.dataset.platform === entry.id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  byId('platform-panel').setAttribute('aria-labelledby', 'tab-' + entry.id);
  byId('platform-eyebrow').textContent = entry.eyebrow;
  byId('platform-title').textContent = entry.title;
  byId('platform-description').textContent = entry.intro;
  byId('platform-install').textContent = entry.install;
  byId('snippet-language').textContent = entry.label;
  byId('snippet-code').textContent = entry.code;
  byId('platform-steps').replaceChildren();
  for (const step of entry.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    byId('platform-steps').append(li);
  }
  platformLinks.replaceChildren();
  for (const [href, title] of [[entry.source, entry.sourceLabel], [entry.extraSource, entry.extraLabel]]) {
    if (!href || !title) continue;
    const a = document.createElement('a');
    a.href = href;
    a.textContent = title + ' ↗';
    platformLinks.append(a);
  }
  if (updateURL) {
    const url = new URL(location.href);
    if (entry.id === 'javascript') url.searchParams.delete('platform');
    else url.searchParams.set('platform', entry.id);
    history.replaceState(null, '', url);
  }
}

for (const tab of platformTabs) {
  tab.addEventListener('click', () => setPlatform(tab.dataset.platform));
  tab.addEventListener('keydown', event => {
    let index = platformTabs.indexOf(tab);
    if (event.key === 'ArrowRight') index = (index + 1) % platformTabs.length;
    else if (event.key === 'ArrowLeft') index = (index - 1 + platformTabs.length) % platformTabs.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = platformTabs.length - 1;
    else return;
    event.preventDefault();
    setPlatform(platformTabs[index].dataset.platform, { focus: true });
  });
}

async function copy(text, button) {
  const original = button.dataset.label || button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    const target = button.id === 'copy-code' ? byId('snippet-code') :
      button.id === 'copy-fallback' ? byId('fallback-code') :
      document.querySelector('.endpoint-path code');
    button.textContent = 'Selected: copy manually';
    const selection = getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  window.setTimeout(() => { button.textContent = original; }, 1800);
}

byId('copy-code').addEventListener('click', () => {
  copy(byId('snippet-code').textContent, byId('copy-code'));
});
byId('copy-endpoint').addEventListener('click', () => {
  copy('https://ultmacro.xyz/api/wiki/v1/ask', byId('copy-endpoint'));
});
byId('fallback-code').textContent = staticFallbackCode;
byId('copy-fallback').addEventListener('click', () => {
  copy(staticFallbackCode, byId('copy-fallback'));
});

const initial = new URLSearchParams(location.search);
setPlatform(initial.get('platform'), { updateURL: false });

byId('main').addEventListener('click', event => {
  const index = event.target.closest('.mobile-index a[href^="#"]');
  if (index) byId('main').querySelector('.mobile-index').open = false;
});

const sideLinks = [...document.querySelectorAll('.side-link')];
for (const anchor of sideLinks) {
  anchor.addEventListener('click', () => {
    for (const link of sideLinks) link.classList.toggle('active', link === anchor);
  });
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of sideLinks) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
      }
    }
  }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
  for (const section of document.querySelectorAll('main section[id]')) observer.observe(section);
}

async function checkLiveAskApi() {
  const dot = byId('api-status-dot');
  const title = byId('api-status-title');
  const description = byId('api-status-description');
  try {
    const response = await fetch('/api/wiki/v1', {
      cache: 'no-store', signal: AbortSignal.timeout(5500)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data.endpoints?.ask !== '/api/wiki/v1/ask') throw new Error('Ask not advertised');
    dot.className = 'status-dot ready';
    title.textContent = 'Ask API available';
    description.textContent = 'The public API advertises POST /api/wiki/v1/ask. You can use the snippets below.';
  } catch {
    dot.className = 'status-dot offline';
    title.textContent = 'Ask API not deployed publicly yet';
    description.textContent = 'The code samples are ready, but live requests currently fail. The static index and Markdown documents below are available.';
  }
}
checkLiveAskApi();

const input = byId('query');
const count = byId('result-count');
const list = byId('result-list');
const pager = byId('pagination');
const previous = byId('previous-page');
const next = byId('next-page');
const pageLabel = byId('page-label');
const pageSize = 6;
let articles = [];
let matches = [];
let page = 1;

const words = value => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
function filterGuides(query) {
  const terms = words(query);
  if (!terms.length) return articles.slice();
  return articles.map(article => {
    const title = (article.title || '').toLowerCase();
    const keywords = (article.keywords || []).join(' ').toLowerCase();
    const summary = (article.summary || '').toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 12;
      else if (keywords.includes(term)) score += 8;
      else if (summary.includes(term)) score += 4;
    }
    return { article, score };
  }).filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .map(hit => hit.article);
}

function renderGuides() {
  list.replaceChildren();
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  page = Math.min(page, pageCount);
  count.textContent = matches.length + ' published guides';
  for (const article of matches.slice((page - 1) * pageSize, page * pageSize)) {
    const row = document.createElement('article');
    row.className = 'result';
    const title = document.createElement('a');
    title.className = 'title-link';
    title.href = article.url;
    title.textContent = article.title;
    const summary = document.createElement('p');
    summary.textContent = article.summary;
    const foot = document.createElement('div');
    foot.className = 'result-foot';
    const meta = document.createElement('span');
    meta.className = 'result-meta';
    meta.textContent = article.category + (article.version ? ' · ' + article.version : '');
    const markdown = document.createElement('a');
    markdown.className = 'result-markdown';
    markdown.href = article.markdown;
    markdown.textContent = 'Markdown ↗';
    foot.append(meta, markdown);
    row.append(title, summary, foot);
    list.append(row);
  }
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No published guide matches. Try another phrase or browse the main Wiki.';
    list.append(empty);
  }
  pager.hidden = pageCount <= 1;
  pageLabel.textContent = 'Page ' + page + ' of ' + pageCount;
  previous.disabled = page === 1;
  next.disabled = page === pageCount;
}

function search() {
  matches = filterGuides(input.value.trim());
  page = 1;
  renderGuides();
  const url = new URL(location.href);
  if (input.value.trim()) url.searchParams.set('q', input.value.trim());
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

byId('search-form').addEventListener('submit', event => { event.preventDefault(); search(); });
input.addEventListener('input', search);
previous.addEventListener('click', () => { page--; renderGuides(); });
next.addEventListener('click', () => { page++; renderGuides(); });

fetch('./v1/index.json')
  .then(response => {
    if (!response.ok) throw new Error('Index HTTP ' + response.status);
    return response.json();
  })
  .then(data => {
    articles = data.articles || [];
    input.value = new URLSearchParams(location.search).get('q') || '';
    matches = filterGuides(input.value);
    renderGuides();
  })
  .catch(() => {
    count.textContent = 'Index unavailable';
    list.textContent = 'Could not load published guides. The main Wiki remains available.';
    pager.hidden = true;
  });
