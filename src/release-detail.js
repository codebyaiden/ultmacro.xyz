/* Shared static download rendering. Raw release metadata stays in data/releases.js. */
(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(text) {
    return esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function versionUrl(tag) { return '/download/' + encodeURIComponent(tag) + '/'; }
  function date(iso) {
    var value = new Date(iso);
    return Number.isNaN(value.getTime()) ? 'Date unavailable' : value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  function size(bytes) { return Math.round(bytes / 1024 / 1024) + ' MB'; }
  function hotfix(release) { return /^v?\d+\.\d+\.\d+[a-z]$/i.test(release.tag); }
  function cleanNotes(release) {
    var body = String(release.body || '').replace(/\r/g, '').split('\n').filter(function (line) {
      return !/^> \*\*The biggest and most polished Ultimate Macro update yet is here\.\*\*$/.test(line) &&
        !/^\*\*Ultimate Macro 1\.3\.5 is faster, cleaner, more reliable, and ready for every supported setup\.\*\*$/.test(line) &&
        line.trim() !== '# ' + release.tag;
    }).join('\n').trim();
    if (release.tag === 'v1.3.6') {
      body += '\n\n**Auto Equip notice:** Auto Equip may still miss towers. Check your loadout before starting a match.';
    }
    return body;
  }
  function notes(release) {
    var lines = cleanNotes(release).split('\n');
    var html = '', list = false, paragraph = [];
    function flush() {
      if (list) { html += '</ul>'; list = false; }
      if (paragraph.length) { html += '<p>' + inline(paragraph.join(' ')) + '</p>'; paragraph = []; }
    }
    lines.forEach(function (line) {
      line = line.trim();
      var label = line.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '');
      var headings = { 'New Features': 'New', Improvements: 'Improved', 'Bug Fixes': 'Fixed', Removals: 'Removed' };
      var item = /^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/.exec(line.replace(/^`(\d+)[a-z]?`\s+/i, '$1. '));
      if (!line) { flush(); }
      else if (headings[label]) { flush(); html += '<h3>' + headings[label] + '</h3>'; }
      else if (item) {
        if (paragraph.length) flush();
        if (!list) { html += '<ul>'; list = true; }
        html += '<li>' + inline(item[1]) + '</li>';
      } else { if (list) flush(); paragraph.push(line.replace(/^#{1,6}\s+/, '')); }
    });
    flush();
    return html || '<p>No release notes were published.</p>';
  }
  function highlights(release) {
    if (release.tag === 'v1.3.5') return [
      'Adaptive 16:9 resolution support from 720p to 4K, with 8K scaling.',
      'Updated Discord personal-bot menus, screenshots, status controls, and strategy selection.',
      'Strategy Lab and expanded strategy metadata.',
      'Placement, upgrade, recovery, and action-confirmation fixes.'
    ];
    if (release.tag === 'v1.3.6') return [
      'Collect playtime rewards automatically.',
      'Run Solar Requiem Night 1 on Easy or Hard with the recorded loadout (beta).',
      'Recover faster from blocked tower spots and save confirmed fixes for future runs.',
      'Choose any map as an override and wait for enough cash before upgrades (beta).'
    ];
    return cleanNotes(release).split('\n').map(function (line) {
      var item = /^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/.exec(line.trim().replace(/^`(\d+)[a-z]?`\s+/i, '$1. '));
      return item ? item[1] : null;
    }).filter(Boolean).slice(0, 4);
  }
  function download(release, main) {
    return release.asset ? '<a class="download-button' + (main ? ' primary-download' : '') + '" href="' + esc(release.asset.url) + '" data-download aria-label="Download ' + esc(release.tag) + ' for Windows"><span data-download-label>' + (main ? 'Download for Windows' : 'Download ' + esc(release.tag)) + '</span><span class="download-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4v12m-5-5 5 5 5-5M5 17v3h14v-3"/></svg></span></a>' : '';
  }
  function checksum(release, collapsed) {
    var digest = release.asset && release.asset.digest;
    if (!/^sha256:[a-f0-9]{64}$/i.test(digest || '')) return '';
    var hash = digest.slice(7);
    var extras = (release.extras || []).map(function (asset) { return '<a class="checksum-file" href="' + esc(asset.url) + '">' + esc(asset.name) + '</a>'; }).join('');
    var content = '<div class="checksum-line"><code data-checksum>' + esc(hash) + '</code><button type="button" class="copy-button" data-copy aria-label="Copy SHA-256 for ' + esc(release.tag) + '">Copy</button></div>' + extras;
    return collapsed ? '<details class="checksum-disclosure"><summary>SHA-256</summary>' + content + '</details>' : '<section class="checksum-section" aria-labelledby="checksum-title"><h2 id="checksum-title">SHA-256</h2>' + content + '</section>';
  }
  function metadata(release) {
    return '<p class="release-meta">' + (release.asset ? '<span>' + size(release.asset.size) + '</span><span aria-hidden="true">·</span>' : '') + '<time datetime="' + esc(release.published) + '">' + esc(date(release.published)) + '</time></p>';
  }
  function packageVisual(release) {
    return '<div class="release-visual" aria-hidden="true"><div class="package-light"></div><div class="package-track"></div><div class="package-enter"><div class="package-tilt"><div class="package-float"><div class="package-sheet sheet-back"></div><div class="package-sheet sheet-middle"></div><div class="release-package"><div class="package-top"><span class="package-mark">UM</span><span class="package-format">.ZIP</span></div><div class="package-icon"><img src="/assets/icon.png" alt="" width="112" height="112"></div><div class="package-name">Ultimate Macro</div><div class="package-version">' + esc(release.tag) + '</div><div class="package-bottom"><span>Windows</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/></svg></div><div class="package-signal"></div></div></div></div></div></div>';
  }
  function highlightIcon(index) {
    var paths = ['<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8m-4-3v3M7 9h3m4 0h3M7 14h3m4 0h3"/>', '<path d="M5 4h14v12H9l-4 4V4Z"/><path d="M9 8h6m-6 4h4"/>', '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v9h9m0-12h5m-3-3 3 3-3 3"/>', '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>'];
    return '<span class="highlight-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths[index % paths.length] + '</svg></span>';
  }
  function renderMain(releases, latest) {
    if (!latest) return '<h1>Ultimate Macro</h1><p>No public download is available.</p>';
    var items = highlights(latest);
    return '<section class="download-hero is-current" id="latest" aria-labelledby="download-title"><div class="hero-copy"><p class="product-name">Ultimate Macro</p><div class="version-heading"><h1 id="download-title">' + esc(latest.tag) + '</h1><span class="latest-label">Latest release</span></div>' + download(latest, true) + metadata(latest) + '<div class="hero-links"><a href="' + versionUrl(latest.tag) + '">Release notes <span aria-hidden="true">↗</span></a><a href="/guide/install/">First time installing? Setup guide <span aria-hidden="true">→</span></a></div></div>' + packageVisual(latest) + '</section>' +
      '<section class="changes-section" data-reveal aria-labelledby="changes-title"><h2 id="changes-title">What changed</h2><ul class="highlights">' + items.map(function (item, index) { return '<li>' + highlightIcon(index) + '<span>' + inline(item) + '</span></li>'; }).join('') + '</ul><details class="changelog" data-changelog data-reveal><summary>View full changelog <span class="changelog-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m7 10 5 5 5-5"/></svg></span></summary><div class="changelog-content"><div class="release-notes">' + notes(latest) + '</div></div></details>' + checksum(latest, true) + '</section>' +
      '<section class="history-section" data-reveal id="history" aria-labelledby="history-title"><h2 id="history-title">Older versions</h2><ul class="version-list">' + releases.filter(function (r) { return !r.prerelease && r.tag !== latest.tag; }).map(function (r) {
        return '<li class="version-row"><div class="version-row-info"><a class="version-link" href="' + versionUrl(r.tag) + '">' + esc(r.tag) + '</a>' + (hotfix(r) ? '<span class="hotfix-label">Hotfix</span>' : '') + '<time datetime="' + esc(r.published) + '">' + esc(date(r.published)) + '</time></div>' + download(r, false) + '</li>';
      }).join('') + '</ul></section>';
  }
  function renderVersion(release, latest) {
    var current = latest && latest.tag === release.tag;
    return '<a class="back-link" href="/download/">← Downloads</a><section class="download-hero version-hero ' + (current ? 'is-current' : 'is-historical') + '" aria-labelledby="download-title"><div class="hero-copy"><p class="product-name">Ultimate Macro</p><div class="version-heading"><h1 id="download-title">' + esc(release.tag) + '</h1>' + (current ? '<span class="latest-label">Latest</span>' : hotfix(release) ? '<span class="hotfix-label">Hotfix</span>' : '') + '</div>' + metadata(release) + download(release, false) +
      (!current && latest ? '<p class="older-notice"><span>Older version</span><a href="' + versionUrl(latest.tag) + '">Latest release: ' + esc(latest.tag) + ' <span aria-hidden="true">→</span></a></p>' : '') +
      '<div class="hero-links"><a href="/guide/install/">First time installing? Setup guide <span aria-hidden="true">→</span></a></div></div>' + packageVisual(release) + '</section><section class="changes-section" data-reveal aria-labelledby="changes-title"><h2 id="changes-title">What changed</h2><div class="release-notes">' + notes(release) + '</div></section>' + checksum(release, false) + '<a class="github-link" href="' + esc(release.url) + '" target="_blank" rel="noopener noreferrer">View on GitHub <span aria-hidden="true">↗</span></a>';
  }
  if (typeof module === 'object' && module.exports) module.exports = { renderMain: renderMain, renderVersion: renderVersion, cleanNotes: cleanNotes, versionUrl: versionUrl };
})();
