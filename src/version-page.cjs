const fs = require('node:fs/promises');
const path = require('node:path');
const contract = require('./releases-data.js');
const view = require('./release-detail.js');
const ASSET_VERSION = 37;
const SITE = 'https://ultmacro.xyz';
const ROOT = path.join(__dirname, '..');
const SAFE_TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;
const esc = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const NAV = [['/#features', 'Features'], ['/#requirements', 'Requirements'], ['/guide/', 'Guide'], ['/strategies/', 'Strategy Network'], ['/early-access/', 'Early Access'], ['/download/', 'Download'], ['/#faq', 'FAQ']];

function documentPage({ tag, latest, content, release }) {
  const url = SITE + (tag ? view.versionUrl(tag) : '/download/');
  const title = tag ? `Ultimate Macro ${tag} — download & changelog` : 'Download Ultimate Macro';
  const description = tag ? `Download Ultimate Macro ${tag} for Windows. Release notes and SHA-256 checksum.` : 'Download Ultimate Macro for Windows. Latest release, changelog, and older versions.';
  const nav = NAV.map(([href, label]) => `<a href="${href}"${label === 'Download' ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const schema = release ? JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Ultimate Macro', softwareVersion: release.tag.replace(/^v/, ''), applicationCategory: 'UtilitiesApplication', operatingSystem: 'Windows 10, Windows 11', datePublished: release.published, downloadUrl: release.asset?.url, fileSize: release.asset ? String(release.asset.size) : undefined, url, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }).replace(/</g, '\\u003c') : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
  <meta property="og:image" content="${SITE}/assets/icon.png">
  <meta property="og:image:alt" content="Ultimate Macro logo">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/assets/icon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles/base.css?v=28">
  <link rel="stylesheet" href="/styles/releases.css?v=${ASSET_VERSION}">
  ${schema ? `<script type="application/ld+json">${schema}</script>` : ''}
  <script src="/src/download.js?v=${ASSET_VERSION}" defer></script>
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
  <footer class="download-footer"><span>© <span data-year>2026</span> Ultimate Macro</span><nav aria-label="Footer"><a href="/guide/">Guide</a><a href="https://discord.gg/ultmacro" target="_blank" rel="noopener noreferrer">Discord</a><a href="${contract.RELEASES_PAGE}" target="_blank" rel="noopener noreferrer">GitHub</a></nav></footer>
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
async function writeVersionPages(releases) {
  const downloadDir = path.join(ROOT, 'download');
  const latest = contract.pickLatestStable(releases);
  const written = [];
  await fs.mkdir(downloadDir, { recursive: true });
  for (const release of releases) {
    if (typeof release.tag !== 'string' || !SAFE_TAG.test(release.tag)) continue;
    const dir = path.join(downloadDir, release.tag);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), documentPage({ tag: release.tag, latest, release, content: view.renderVersion(release, latest) }));
    written.push(release.tag);
  }
  if (latest) {
    await fs.writeFile(path.join(downloadDir, 'index.html'), documentPage({ latest, release: latest, content: view.renderMain(releases, latest) }));
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
        const next = source.replace(/(<([a-zA-Z][\w-]*)\b[^>]*\bdata-latest-version\b[^>]*>)([^<]*)(<\/\2>)/g, (match, open, tagName, text, close) => open.replace(/\s*class="([^"]*)"/, (full, classes) => {
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
