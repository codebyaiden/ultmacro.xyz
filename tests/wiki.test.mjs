import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { articles, categories } from '../wiki/content.mjs';
import { proposedTopics, topicCategories } from '../wiki/catalog.mjs';
import { sourceVerifiedArticles } from '../wiki/content-v135-source.mjs';
import { resolveTopicGuidance } from '../wiki/topic-support.mjs';

const read = path => readFile(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8');

test('wiki articles contain original instructions, useful sections, and real sources', () => {
  assert.ok(articles.length >= 75);
  assert.equal(new Set(articles.map(a => a.slug)).size, articles.length);
  assert.equal(new Set(categories).size, categories.length);
  for (const article of articles) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.includes(article.category), article.slug);
    assert.ok(article.title.length >= 5 && article.summary.length >= 12, article.slug);
    assert.ok(article.source.startsWith('/') || article.source.startsWith('https://'), article.slug);
    assert.ok(article.sections.length > 0, article.slug);
    for (const section of article.sections) {
      assert.ok(section.title, article.slug);
      assert.ok([...(section.paragraphs || []), ...(section.steps || []), ...(section.checks || []), ...(section.rows || [])].length, article.slug + ': ' + section.title);
      for (const pair of section.rows || []) assert.equal(pair.length, 2, article.slug + ': ' + section.title);
    }
  }
});

test('every major setup workflow has a dedicated article', () => {
  const slugs = new Set(articles.map(a => a.slug));
  for (const slug of [
    'install', 'requirements', 'first-run', 'windows-display', 'roblox-settings', 'tds-settings',
    'hotkeys', 'record-strategy', 'edit-strategy', 'strategy-rotation', 'session-settings',
    'party-vip', 'launch-fails', 'wrong-clicks', 'ocr-errors', 'upgrade-not-working',
    'abilities-not-working', 'legacy-mode', 'stuck-between-matches', 'discord-webhooks',
    'report-issue', 'slow-inputs', 'record-abilities', 'timescale-tickets'
  ]) assert.ok(slugs.has(slug), slug);
});

test('wiki uses homepage brand language and real Ultimate Macro media', async () => {
  const html = await read('wiki/index.html');
  const app = await read('wiki/app.mjs');
  const css = await read('wiki/site.css');
  assert.match(html, /class="wiki-header"/);
  assert.match(html, /class="mobile-nav-button"/);
  assert.match(html, /id="search-overlay"/);
  assert.match(html, /id="helper-panel"/);
  assert.match(html, /<strong>Wiki helper<\/strong><small>Find matching articles<\/small>/);
  assert.match(app, /Your guide to /);
  assert.match(app, /assets\/ui\/ultimate-macro-main-new\.png/);
  assert.match(app, /function search\(/);
  assert.match(app, /function articleView\(/);
  assert.match(app, /function categoryView\(/);
  assert.match(css, /--navy:#07111f/);
  assert.match(css, /font:400 clamp\(43px,4\.5vw,68px\).*Georgia/);
  assert.match(css, /\.mobile-nav-button\{display:none.*border:0;background:transparent/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(app + html, /Quick setup reference|Quick fixes|DOCUMENTATION|WIKI \/ TOPIC|AI answers coming later/);
  new vm.Script(app.replace(/^import[^\n]*\n/gm, ''));
});

test('all wiki links stay routed and the existing website can serve modules', async () => {
  const app = await read('wiki/app.mjs');
  assert.match(app, /function articleURL\(/);
  assert.match(app, /function categoryURL\(/);
  assert.match(app, /sidebar-close/);
  assert.match(await read('server.mjs'), /'\.mjs': 'text\/javascript; charset=utf-8'/);
  assert.match(await read('index.html'), /href="wiki\/">Wiki/);
  assert.match(await read('sitemap.xml'), /https:\/\/ultmacro\.xyz\/wiki\//);
});


test('wiki retains its dark theme using consolidated component styles', async () => {
  const css = await read('wiki/site.css');
  const html = await read('wiki/index.html');
  assert.match(css, /--paper:#081625/);
  assert.match(css, /\.sidebar\{background:#0a1b2e/);
  assert.match(css, /\.home-lane\{background:#11263d/);
  assert.match(css, /\.topic-link\{[^}]*background:#10243a/);
  assert.match(css, /\.article-header h1\{[^}]*color:#f3f7ff/);
  assert.match(css, /\.setting-table\{[^}]*background:#10253b/);
  assert.match(css, /\.search-dialog\{[^}]*background:#101f33/);
  assert.match(css, /\.category-articles a\{[^}]*background:#10263f/);
  assert.doesNotMatch(css, /\/\* Wiki dark reading theme\./);
  assert.match(html, /content="#07111f"/);
});

test('wiki UI polish preserves routing and adds accessible mobile navigation', async () => {
  const app = await read('wiki/app.mjs');
  const css = await read('wiki/site.css');
  const html = await read('wiki/index.html');
  assert.match(app, /mobileNavigation = window\.matchMedia/);
  assert.match(app, /sidebar\.inert = mobileNavigation\.matches/);
  assert.match(app, /restoreFocus: true/);
  assert.match(app, /function syncSidebarAccessibility\(/);
  assert.match(app, /expandedGroups = new Set/);
  assert.match(app, /className = ''/);
  assert.match(app, /node\('details', 'mobile-toc'\)/);
  assert.match(app, /article\.sections\.length \+ ' sections'/);
  assert.match(app, /mobileLinks\.append\(link\(sec\.title,'#'\+id\)\)/);
  assert.match(app, /sectionObserver\.disconnect\(\)/);
  assert.match(css, /\.mobile-toc\{display:block;position:sticky/);
  assert.match(css, /\.nav-count\{/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /site\.css\?v=10/);
  assert.match(html, /app\.mjs\?v=11/);
});

test('500+ topic inventory is separate from published wiki docs', async () => {
  const plan = JSON.parse(await read('wiki/roadmap/topics.json'));
  const overview = await read('wiki/roadmap/PLAN.md');
  assert.equal(plan.existingPublishedArticles, articles.length);
  assert.equal(plan.totalPlanned, plan.topics.length);
  assert.ok(plan.totalPlanned > 500);
  assert.equal(new Set(plan.topics.map(t => t.slug)).size, plan.totalPlanned);
  assert.equal(new Set(plan.topics.map(t => t.id)).size, plan.totalPlanned);
  assert.equal(new Set(plan.topics.map(t => t.category)).size, 15);
  assert.ok(plan.topics.some(t => t.priority === 'P1'));
  assert.ok(plan.topics.some(t => t.priority === 'P3'));
  for (const topic of plan.topics) {
    assert.ok(topic.title && topic.slug && topic.validation && topic.visual);
    assert.equal(topic.status, 'planned-unverified');
    assert.ok(['P1', 'P2', 'P3'].includes(topic.priority));
  }
  assert.match(overview, /Never automatically publish these topics/);
  assert.match(overview, /Move to \*\*one file per article\*\*/);
});


test('all 778 candidate topics appear in the public, separate research index', async () => {
  const roadmap = JSON.parse(await read('wiki/roadmap/topics.json'));
  const source = await read('wiki/catalog.mjs');
  assert.equal(proposedTopics.length, 778);
  assert.equal(roadmap.totalPlanned, proposedTopics.length);
  assert.equal(roadmap.existingPublishedArticles, articles.length);
  assert.equal(topicCategories.length, 15);
  assert.equal(new Set(proposedTopics.map(t => t.slug)).size, proposedTopics.length);
  assert.ok(source.length < 200000, 'compact client index');
  const known = new Set(articles.map(a => a.slug));
  for (const topic of proposedTopics) {
    assert.ok(known.has(topic.relatedGuide), 'missing related guide ' + topic.slug);
    assert.ok(topic.title && topic.category && topic.priority && topic.slug);
    assert.ok(topicCategories.includes(topic.category), topic.slug);
    assert.ok(['P1', 'P2', 'P3'].includes(topic.priority), topic.slug);
  }
  assert.deepEqual(
    new Set(proposedTopics.map(t => t.slug)),
    new Set(roadmap.topics.map(t => t.slug))
  );
  assert.equal(roadmap.topics.filter(t => t.status !== 'planned-unverified').length, 0);
});

test('topic index supports category filters, search and explicit unverified labels', async () => {
  const app = await read('wiki/app.mjs');
  const html = await read('wiki/index.html');
  const css = await read('wiki/site.css');
  assert.match(app, /function libraryView\(/);
  assert.match(app, /function topicView\(/);
  assert.match(app, /function searchTopics\(/);
  assert.match(app, /No published guide matches/);
  assert.doesNotMatch(app.slice(app.indexOf('function showResults'), app.indexOf('function openSearch')), /searchTopics\(/);
  assert.match(app, /a\[data-article\],a\[data-category\],a\[data-topic\],a\[data-library\]/);
  assert.doesNotMatch(html, /id="sidebar-library"/);
  assert.match(html, /Research backlog/);
  assert.match(html, /href="\.\/api\/"/);
  assert.match(html, /site\.css\?v=10/);
  assert.match(css, /\.library-controls/);
  assert.match(css, /\.catalog-row/);
  assert.match(css, /\.topic-guide/);
  assert.match(css, /\.sidebar-more/);
});

test('expanded guides are distinct and grounded in official sources', () => {
  const mustHave = ['auto-equip','default-tds-keybinds','recording-metadata','strategy-rotation-runs',
    'currency-goals','prerun-checks','discord-screenshot-reports','engineerbot-commands','auto-spin',
    'ocr-language-fix','party-host','party-member','vip-server-link'];
  const slugs = new Set(articles.map(a => a.slug));
  for (const slug of mustHave) assert.ok(slugs.has(slug));
  for (const a of articles) {
    assert.ok(!a.source.includes('example.com'), a.slug);
    assert.ok(a.sections.every(s => [...s.steps, ...s.paragraphs, ...s.checks, ...(s.rows || [])].length), a.slug);
  }
});

test('published help search excludes research-only topic suggestions and article versions are visible', async () => {
  const app = await read('wiki/app.mjs');
  assert.match(app, /Documented for /);
  assert.match(app, /history\.replaceState\(null,'',url\)/);
  assert.match(app, /focusables = \[\.\.\.overlay\.querySelectorAll/);
  const block = app.slice(app.indexOf('function showResults'), app.indexOf('function openSearch'));
  assert.match(block, /search\(q, 8\)/);
  assert.doesNotMatch(block, /research-hit|topicLink/);
});


test('tagged v1.3.5 evidence produces substantive versioned guide pages', () => {
  assert.equal(sourceVerifiedArticles.length, 14);
  const known = new Set(articles.map(a=>a.slug));
  for (const article of sourceVerifiedArticles) {
    assert.ok(known.has(article.slug), article.slug);
    assert.equal(article.version, 'v1.3.5');
    assert.equal(article.source, 'https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/v1.3.5/Main.ahk');
    assert.ok(article.sections.every(s=>
      [...(s.paragraphs||[]),...(s.steps||[]),...(s.checks||[]),...(s.rows||[])].length),article.slug);
  }
});

test('all 778 topic pages have useful published evidence or clear release gates', () => {
  const docs = new Map(articles.map(a=>[a.slug,a]));
  let grounded=0, gated=0;
  for (const topic of proposedTopics) {
    const answer = resolveTopicGuidance(topic,docs);
    assert.ok(['related','requires-release','unverified'].includes(answer.kind),topic.slug);
    if (answer.kind === 'related') {
      assert.ok(answer.guide && answer.section,topic.slug);
      assert.ok(answer.guide.source,topic.slug);
      assert.ok(
        answer.section.steps?.length || answer.section.paragraphs?.length ||
        answer.section.rows?.length || answer.section.checks?.length,
        topic.slug
      );
      grounded++;
    } else gated++;
  }
  assert.equal(grounded+gated,proposedTopics.length);
  assert.ok(gated>0,'future release candidates remain gated');
  assert.ok(grounded>300,'useful verified excerpts remain accessible without forcing weak matches');
});

test('topic mappings prefer relevant guides and gate unsupported fixes', () => {
  const docs = new Map(articles.map(a=>[a.slug,a]));
  const get = slug => {
    const topic = proposedTopics.find(t=>t.slug===slug);
    assert.ok(topic,slug);
    return resolveTopicGuidance(topic,docs);
  };
  const reinstall = get('prepare-for-a-reinstall-without-losing-strategies');
  assert.equal(reinstall.guide.slug,'profiles');
  assert.equal(reinstall.kind,'related');
  assert.match(JSON.stringify(reinstall.section),/Recordings/);
  assert.equal(get('record-first-tower-placement').guide.slug,'record-strategy');
  assert.equal(get('choose-roblox-classic-camera-mode').guide.slug,'roblox-settings');
  assert.equal(get('an-upgrade-is-skipped-without-an-error').guide.slug,'upgrade-not-working');
  const unsupported = get('collect-useful-information-before-reinstalling');
  assert.equal(unsupported.kind,'unverified');
  assert.equal(unsupported.section,null);
});

test('backup and TDS pages include specific checks', () => {
  const profiles = articles.find(x=>x.slug==='profiles');
  assert.match(JSON.stringify(profiles.sections),/APPDATA/);
  assert.match(JSON.stringify(profiles.sections),/Recordings/);
  assert.match(JSON.stringify(profiles.sections),/Resources/);
  assert.ok(articles.find(x=>x.slug==='tds-settings').sections.some(x=>x.steps?.length>=3));
});

test('wiki topic pages display real source-linked steps instead of a placeholder alone', async () => {
  const app = await read('wiki/app.mjs');
  assert.match(app, /resolveTopicGuidance\(topic, docs\)/);
  assert.match(app, /guidance\.section/);
  assert.match(app, /guidance\.guide\.source/);
  assert.match(app, /className|topic-evidence/);
});
