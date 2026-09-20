(function () {
  'use strict';

  var host = document.querySelector('[data-release-detail]');
  if (!host) return;

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '').replace(/^v/i, '').toLowerCase();
  }

  function currentTag() {
    if (host.dataset.releaseLatest === 'true') {
      var releases = window.UM_RELEASES && Array.isArray(window.UM_RELEASES.releases) ? window.UM_RELEASES.releases : [];
      var latest = window.UMContract && typeof window.UMContract.pickLatestStable === 'function'
        ? window.UMContract.pickLatestStable(releases)
        : releases.find(function (release) { return !release.prerelease && release.asset; });
      return latest ? latest.tag : '';
    }
    return host.dataset.releaseTag || decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  }

  function date(value) {
    if (!value) return 'Date unavailable';
    var parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderRelease(release) {
    if (!release) {
      document.title = 'Release ' + currentTag() + ' pending | Ultimate Macro';
      host.innerHTML = '<div class="release-detail-empty"><p class="kicker">Release archive</p><h1>That build is not in the local snapshot.</h1><p>This staging copy has not captured that version yet. Check the official release archive for the latest public build.</p><a class="btn primary" href="https://github.com/UltimateMacro/Ultimate-Macro-New-Era/releases" target="_blank" rel="noopener noreferrer">Open GitHub releases ↗</a><a class="btn" href="../../download/">Back to downloads</a></div>';
      return;
    }

    document.title = (release.name || release.tag) + ' | Ultimate Macro';
    var asset = release.asset;
    var notes = window.UM && typeof window.UM.renderMarkdown === 'function'
      ? window.UM.renderMarkdown(release.body)
      : '<p>' + esc(release.body || 'No release notes were published for this version.') + '</p>';

    host.innerHTML = '<div class="release-detail-head"><a class="back-link" href="../../download/">← Back to downloads</a><p class="kicker">Release archive <b>/</b> ' + esc(release.tag) + '</p><h1>' + esc(release.name || release.tag) + '</h1><div class="release-detail-meta"><span>' + esc(release.tag) + '</span><span>' + esc(date(release.published)) + '</span><span>' + (release.prerelease ? 'Prerelease' : 'Stable') + '</span></div></div>' +
      '<div class="release-detail-grid"><article class="release-detail-card"><div class="release-detail-card-head"><div><p class="kicker">' + (asset ? 'Official download' : 'Release information') + '</p><h2>' + esc(asset ? asset.name : 'No public archive attached') + '</h2></div><span class="release-detail-status">' + (asset ? 'Available' : 'GitHub only') + '</span></div>' +
      (asset ? '<p class="release-detail-size">' + esc(UM.fileSize(asset.size)) + ' · ' + esc(UM.count(asset.downloads)) + ' downloads</p><a class="btn signal lg" href="' + esc(asset.url) + '" download>Download ' + esc(release.tag) + ' ↓</a><dl class="release-detail-asset"><div><dt>SHA-256</dt><dd>' + esc((asset.digest || '').replace(/^sha256:/, '')) + '</dd></div><div><dt>File</dt><dd>' + esc(asset.name) + '</dd></div></dl>' : '<p class="release-detail-size">Open the release on GitHub to see the published assets.</p>') +
      '<a class="btn" href="' + esc(release.url) + '" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a></article><aside class="release-detail-side"><p class="kicker">Before you run it</p><h2>Keep the whole archive.</h2><p>Extract every file into its own folder, install AutoHotkey v2.0, then run <code>Main.ahk</code>. Use the setup guide if this is your first install.</p><a class="btn sm" href="../../guide/">Setup guide</a></aside></div>' +
      '<section class="release-notes"><p class="kicker">Changelog</p><h2>What changed</h2><div class="rel-body">' + notes + '</div></section>';
  }

  var releases = window.UM_RELEASES && Array.isArray(window.UM_RELEASES.releases) ? window.UM_RELEASES.releases : [];
  var wanted = normalize(currentTag());
  renderRelease(releases.find(function (release) { return normalize(release.tag) === wanted; }));
})();
