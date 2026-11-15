const fs = require('node:fs/promises');
const path = require('node:path');
const contract = require('./releases-data.js');
const view = require('./release-detail.js');
const ASSET_VERSION = 37;
const SITE = 'https://ultmacro.xyz';
const ROOT = path.join(__dirname, '..');
const SAFE_TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;
const esc = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const NAV = [['/#features', 'Features'], ['/#requirements', 'Requirements'], ['/guide/', 'Guide'], ['/strategies/', 'Strategy Network'], ['/early-access/', 'Early Access'], ['/about/', 'About Us'], ['/dashboard/', 'Dashboard'], ['/download/', 'Download'], ['/#faq', 'FAQ']];

function documentPage({ tag, latest, content, release }) {
  const url = SITE + (tag ? view.versionUrl(tag) : '/download/');
  const title = tag ? `Ultimate Macro ${tag} — ${release.asset ? 'download & changelog' : 'release notes'}` : release.asset ? `Download ${release.tag} | Ultimate Macro` : `Ultimate Macro ${release.tag} release notes`;
  const description = tag ? (release.asset ? `Download Ultimate Macro ${tag} for Windows. Release notes and SHA-256 checksum.` : `Read the Ultimate Macro ${tag} release notes and view the source release on GitHub.`) : release.asset ? `Download Ultimate Macro ${release.tag} for Windows, see what changed, and browse previous releases.` : `Read the Ultimate Macro ${release.tag} release notes and view the source release on GitHub.`;
  const nav = NAV.map(([href, label]) => `<a href="${href}"${label === 'Download' ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const schema = release ? JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Ultimate Macro', softwareVersion: release.tag.replace(/^v/, ''), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Windows 10, Windows 11', datePublished: release.published, downloadUrl: release.asset?.url, fileSize: release.asset ? String(release.asset.size) : undefined, url, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }).replace(/</g, '\\u003c') : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="/src/advertising.js?v=adcash-selfhost-20261021" defer></script>
  <script>document.documentElement.classList.add('download-nav-starting');</script>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#090b10">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ultimate Macro">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/assets/ui/ultimate-macro-1.4.1.5-preview.png">
  <meta property="og:image:alt" content="Ultimate Macro 1.4.1.5 interface with two-strategy cycling">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE}/assets/ui/ultimate-macro-1.4.1.5-preview.png">
  <link rel="icon" href="/assets/icon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles/base.css?v=28">
  <link rel="stylesheet" href="/styles/releases.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/styles/unified-shell.css?v=8">
  ${schema ? `<script type="application/ld+json">${schema}</script>` : ''}
  <script src="/src/download.js?v=${ASSET_VERSION}" defer></script>
  <script src="/src/unified-shell.js?v=shared-header-20261115-dashboard" defer></script>
</head>
<body class="download-page">
  <div class="download-atmosphere" aria-hidden="true"><div class="ambient-light ambient-primary"></div><div class="ambient-light ambient-secondary"></div><div class="ambient-grid"></div></div>
  <a class="download-skip" href="#main">Skip to content</a>
  <header class="download-header"><div class="download-header-inner">
    <a class="download-brand" href="/" aria-label="Ultimate Macro home"><img src="/assets/icon.png" alt="" width="28" height="28"><span>Ultimate Macro</span></a>
    <nav class="download-nav" aria-label="Primary">${nav}</nav>
    <button class="download-menu-toggle" type="button" aria-expanded="false" aria-controls="download-mobile-nav" aria-label="Toggle navigation" hidden>Menu</button>
  </div><nav class="download-mobile-nav" id="download-mobile-nav" aria-label="Mobile">${nav}</nav></header>
  <script>
  (function () {
    var button = document.querySelector('.download-menu-toggle');
    var menu = document.querySelector('.download-mobile-nav');
    function closeMenu() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
    button.addEventListener('click', function () {
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) { closeMenu(); button.focus(); }
    });
    menu.addEventListener('click', function (event) { if (event.target.closest('a')) closeMenu(); });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', function (event) { if (event.matches) closeMenu(); });
    closeMenu();
    button.hidden = false;
    document.documentElement.classList.remove('download-nav-starting');
  })();
  </script>
  <main class="download-main${tag ? ' is-version' : ''}" id="main" tabindex="-1">${content}</main>
  <footer class="download-footer"><span>© <span data-year>2026</span> Ultimate Macro</span><nav aria-label="Footer"><a href="/guide/">Guide</a>${tag ? '' : '<a href="/report/">Report a bug</a>'}<a href="https://discord.gg/ultmacro" target="_blank" rel="noopener noreferrer">Discord</a><a href="${contract.RELEASES_PAGE}" target="_blank" rel="noopener noreferrer">GitHub</a></nav></footer>
  <p class="sr-only" role="status" data-download-status></p>
</body>
</html>
`;
}
function latestPage(latestTag) {
  const target = view.versionUrl(latestTag);
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Latest Ultimate Macro release</title><meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${SITE}${esc(target)}">
  <meta http-equiv="refresh" content="0; url=${esc(target)}">
  <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head><body><p><a href="${esc(target)}">Continue to ${esc(latestTag)}</a></p></body></html>
`;
}
// Keep the current, hand-designed index shell. Previously a release sync
// regenerated the obsolete full-page template over it (including its CSS,
// header, accessibility handlers and advertising cache version).
function refreshDesignedIndex(source, releases, latest) {
  const replace = (pattern, content) => {
    if (!pattern.test(source)) throw new Error('Download index anchor changed: ' + pattern);
    source = source.replace(pattern, content);
  };
  const title = `Download ${latest.tag} | Ultimate Macro`;
  const description = `Download Ultimate Macro ${latest.tag} for Windows, see what changed, and browse previous releases.`;
  const preview = `${SITE}/assets/ui/ultimate-macro-1.4.1.5-preview.png`;
  replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  for (const [name, value] of [['description', description], ['og:title', title], ['og:description', description],
    ['twitter:title', title], ['twitter:description', description], ['og:image', preview], ['twitter:image', preview],
    ['og:image:alt', 'Ultimate Macro 1.4.1.5 interface with two-strategy cycling']]) {
    replace(new RegExp(`(<meta (?:name|property)="${name}" content=")[^"]*(")`), (_, open, close) => open + esc(value) + close);
  }
  const schema = documentPage({ latest, release: latest, content: '' }).match(/<script type="application\/ld\+json">[^]*?<\/script>/)[0];
  replace(/<script type="application\/ld\+json">[^]*?<\/script>/, () => schema);
  replace(/(<a class="index-download-button"[^>]*href=")[^"]*(")/, (_, open, close) => open + esc(latest.asset.url) + close);
  replace(/(<a class="index-download-button"[^>]*aria-label=")[^"]*(")/, (_, open, close) => open + esc(`Download ${latest.tag} for Windows`) + close);
  replace(/(<span data-download-label>)[^<]*(<\/span>)/, (_, open, close) => open + esc('Download ' + latest.tag) + close);
  const date = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  // Remove only the checksum block owned by this generator before re-inserting.
  source = source.replace(/\s*<details class="checksum-disclosure" data-latest-checksum>[^]*?<\/details>/, '');
  const digest = latest.asset.digest || '';
  const checksum = /^sha256:[a-f0-9]{64}$/i.test(digest)
    ? `\n      <details class="checksum-disclosure" data-latest-checksum><summary>SHA-256</summary><code data-checksum>${esc(digest.slice(7))}</code></details>` : '';
  replace(/<p class="index-release-meta">[^]*?<\/p>/, () => `<p class="index-release-meta"><span>${Math.round(latest.asset.size / 1024 / 1024)} MB</span><span aria-hidden="true">·</span><time datetime="${esc(latest.published)}">${esc(date(latest.published))}</time></p>` + checksum);
  replace(/(<h2 id="highlights-title">)[^<]*(<\/h2>)/, (_, open, close) => open + esc(`What’s new in ${latest.tag}?`) + close);
  const bullets = [];
  let current = -1;
  for (const line of view.cleanNotes(latest).split('\n')) {
    const item = /^\s*[-*+]\s+(.+)/.exec(line);
    if (item) { current = bullets.length; bullets.push(item[1]); }
    else if (line.trim() && current >= 0) bullets[current] += ' ' + line.trim();
    else current = -1;
  }
  const inline = text => esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const highlights = bullets.slice(0, 4).map(item => '        <li>' + inline(item) + '</li>').join('\n');
  replace(/(<section class="index-highlights"[^]*?<ul>)[^]*?(<\/ul>)/, (_, open, close) => open + '\n' + highlights + '\n      ' + close);
  replace(/(<a class="index-notes-link" href=")[^"]*(")/, (_, open, close) => open + esc(view.versionUrl(latest.tag)) + close);
  const history = releases.filter(release => !release.prerelease).map(release => {
    const hotfix = /^v?\d+\.\d+\.\d+[a-z]$/i.test(release.tag);
    const unstable = ['v1.3.5', 'v1.3.4'].includes(release.tag);
    const state = release.tag === latest.tag ? 'LATEST' : hotfix ? 'HOTFIX' : unstable ? 'NOT STABLE' : 'STABLE';
    const kind = hotfix ? 'hotfix' : unstable ? 'unstable' : 'stable';
    return `          <li><a href="${esc(view.versionUrl(release.tag))}"><span class="version-tag">${esc(release.tag)}</span><span class="version-status status-${kind}">${state}</span><time datetime="${esc(release.published)}">${esc(date(release.published))}</time><span class="version-open" aria-hidden="true">↗</span></a></li>`;
  }).join('\n');
  replace(/(<ul class="version-picker-menu">)[^]*?(<\/ul>)/, (_, open, close) => open + '\n' + history + '\n        ' + close);
  return source;
}
async function writeVersionPages(releases) {
  const downloadDir = path.join(ROOT, 'download');
  const latest = contract.pickLatestPublished(releases);
  const available = contract.pickLatestStable(releases);
  const written = [];
  await fs.mkdir(downloadDir, { recursive: true });
  for (const release of releases) {
    if (typeof release.tag !== 'string' || !SAFE_TAG.test(release.tag)) continue;
    const dir = path.join(downloadDir, release.tag);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), documentPage({ tag: release.tag, latest, release, content: view.renderVersion(release, latest, available) }));
    written.push(release.tag);
  }
  if (latest) {
    const indexPath = path.join(downloadDir, 'index.html');
    let existingIndex = '';
    try { existingIndex = await fs.readFile(indexPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const index = latest.asset && existingIndex.includes('class="download-page download-index"')
      ? refreshDesignedIndex(existingIndex, releases, latest)
      : documentPage({ latest, release: latest, content: view.renderMain(releases, latest, available) });
    await fs.writeFile(indexPath, index);
    await fs.mkdir(path.join(downloadDir, 'latest'), { recursive: true });
    await fs.writeFile(path.join(downloadDir, 'latest/index.html'), latestPage(latest.tag));
    const redirectFile = path.join(ROOT, '_redirects');
    let redirects = '';
    try { redirects = await fs.readFile(redirectFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    redirects = redirects.replace(/\n?# BEGIN DOWNLOAD REDIRECTS[\s\S]*?# END DOWNLOAD REDIRECTS\n?/g, '\n').trimEnd();
    const rules = ['/download /download/ 301', '/download/index.html /download/ 301'];
    for (const alias of ['/download/latest', '/download/latest/', '/download/latest/index.html']) rules.push(`${alias} ${view.versionUrl(latest.tag)} 302`);
    // Keep old page directories and their redirects when GitHub returns a partial history.
    const dirs = await fs.readdir(downloadDir, { withFileTypes: true });
    for (const dir of dirs) if (dir.isDirectory() && dir.name !== 'latest' && SAFE_TAG.test(dir.name)) {
      rules.push(`/download/${dir.name} ${view.versionUrl(dir.name)} 301`, `/download/${dir.name}/index.html ${view.versionUrl(dir.name)} 301`);
    }
    await fs.writeFile(redirectFile, `${redirects}\n\n# BEGIN DOWNLOAD REDIRECTS\n${rules.join('\n')}\n# END DOWNLOAD REDIRECTS\n`);
  }
  return { written, removed: [], latest: latest ? latest.tag : null };
}
async function writeVersionChips(latestTag) {
  const updated = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.html')) {
        const source = await fs.readFile(full, 'utf8');
        const next = source.replace(/<a\b[^>]*\bdata-latest-release\b[^>]*>/g, open => open.replace(/\bhref="[^"]*"/, `href="${esc(view.versionUrl(latestTag))}"`)).replace(/(<([a-zA-Z][\w-]*)\b[^>]*\bdata-latest-version\b[^>]*>)([^<]*)(<\/\2>)/g, (match, open, tagName, text, close) => open.replace(/\s*class="([^"]*)"/, (full, classes) => {
          const kept = classes.split(/\s+/).filter(name => name && name !== 'is-loading');
          return kept.length ? ` class="${kept.join(' ')}"` : '';
        }) + esc(latestTag) + close);
        if (next !== source) { await fs.writeFile(full, next); updated.push(path.relative(ROOT, full).replace(/\\/g, '/')); }
      }
    }
  }
  await walk(ROOT);
  return updated;
}
module.exports = { writeVersionPages, writeVersionChips };

