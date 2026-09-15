(function () {
	'use strict';

	var qs = UM.qs;
	var on = UM.on;
	var esc = UM.esc;

	UM.initChrome();

	var host = qs('[data-version-view]');
	if (!host) return;

	var tag = host.getAttribute('data-version') || pathTag();

	var downloadIcon =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
		'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		'<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/></svg>';

	function pathTag() {
		var parts = location.pathname.replace(/\/+$/, '').split('/');
		var last = parts[parts.length - 1] || '';
		return last === 'download' ? '' : decodeURIComponent(last);
	}

	function versionUrl(tag) {
		return '/download/' + encodeURIComponent(tag);
	}

	function releaseTitle(release) {
		var name = (release.name || '').trim();
		if (!name) return '';
		function strip(value) {
			return value.toLowerCase().replace(/^v/, '').replace(/[\s._-]/g, '');
		}
		return strip(name) === strip(release.tag) ? '' : name;
	}

	function badges(release, isLatest) {
		var out = [];
		if (isLatest) out.push('<span class="tag live">Latest</span>');
		if (release.prerelease) out.push('<span class="tag warn">Prerelease</span>');
		else out.push('<span class="tag blue">Stable</span>');
		if (!release.asset) out.push('<span class="tag quiet">No download</span>');
		return out.join('');
	}

	function notFound() {
		host.innerHTML =
			'<div class="load-fail"><strong>' + esc(tag || 'This version') +
			' could not be found in the release data.</strong><br>' +
			'It may have been removed. Browse <a href="/download/">every published version</a> or check ' +
			'<a href="' + esc(UMContract.RELEASES_PAGE) +
			'" target="_blank" rel="noopener noreferrer">the GitHub releases page</a>.</div>';
	}

	function neighbourNav(releases, index) {
		var newer = releases[index - 1];
		var older = releases[index + 1];
		if (!newer && !older) return '';
		return (
			'<nav class="ver-nav" aria-label="Other versions">' +
			(newer
				? '<a class="ver-nav-link" href="' + esc(versionUrl(newer.tag)) + '">' +
				'<span>Newer</span><b>' + esc(newer.tag) + '</b></a>'
				: '<span class="ver-nav-link is-empty"><span>Newer</span><b>—</b></span>') +
			(older
				? '<a class="ver-nav-link align-end" href="' + esc(versionUrl(older.tag)) + '">' +
				'<span>Older</span><b>' + esc(older.tag) + '</b></a>'
				: '<span class="ver-nav-link align-end is-empty"><span>Older</span><b>—</b></span>') +
			'</nav>'
		);
	}

	function render(releases, source) {
		var list = Array.isArray(releases) ? releases : [];
		var index = -1;
		for (var i = 0; i < list.length; i++) {
			if (list[i].tag === tag) {
				index = i;
				break;
			}
		}
		if (index < 0) {
			notFound();
			return;
		}

		var release = list[index];
		var latest = UMContract.pickLatestStable(list);
		var isLatest = !!latest && latest.tag === release.tag;
		var asset = release.asset;
		var extras = release.extras || [];
		var rel = UM.relativeDate(release.published);
		var title = releaseTitle(release);
		var digest = asset ? asset.digest.replace('sha256:', '') : '';

		host.innerHTML =
			'<div class="latest panel bracket">' +
			'<div class="latest-main">' +
			'<p class="kicker">Release</p>' +
			'<div class="ver-line">' +
			'<span class="ver-num">' + esc(release.tag) + '</span>' +
			badges(release, isLatest) +
			'</div>' +
			(title ? '<p class="ver-name">' + esc(title) + '</p>' : '') +
			'<div class="ver-sub">' +
			'<span>PUBLISHED <b>' + esc(UM.shortDate(release.published)) + '</b>' +
			(rel ? ' <b>· ' + esc(rel) + '</b>' : '') + '</span>' +
			(asset ? '<span>SIZE <b>' + esc(UM.fileSize(asset.size)) + '</b></span>' : '') +
			(asset ? '<span>DOWNLOADS <b>' + esc(UM.count(asset.downloads)) + '</b></span>' : '') +
			'</div>' +

			'<div class="dl-row">' +
			(asset
				? '<a class="btn signal lg" href="' + esc(asset.url) + '" download>' +
				downloadIcon + ' Download ' + esc(release.tag) + '</a>'
				: '<a class="btn primary lg" href="' + esc(release.url) +
				'" target="_blank" rel="noopener noreferrer">' + downloadIcon +
				' Open on GitHub</a>') +
			'<a class="btn lg" href="' + esc(release.url) +
			'" target="_blank" rel="noopener noreferrer">Release on GitHub</a>' +
			'</div>' +

			(asset
				? '<dl class="asset">' +
				'<div class="asset-row"><dt>File</dt><dd>' + esc(asset.name) + '</dd></div>' +
				'<div class="asset-row"><dt>SHA-256</dt><dd>' + esc(digest) + '</dd></div>' +
				extras.map(function (x) {
					return '<div class="asset-row"><dt>Also</dt><dd><a href="' + esc(x.url) + '">' +
						esc(x.name) + '</a> · ' + esc(UM.fileSize(x.size)) + '</dd></div>';
				}).join('') +
				'</dl>'
				: '<p class="no-asset mt">This build does not publish a public ZIP. ' +
				'Open it on GitHub for details.</p>') +

			'<div class="ver-notes">' +
			'<h2 class="ver-notes-head">Release notes</h2>' +
			'<div class="rel-body">' + UM.renderMarkdown(release.body) + '</div>' +
			'</div>' +
			'</div>' +

			'<div class="latest-side">' +
			(isLatest
				? ''
				: '<div class="side-block side-warn">' +
				'<h3>Not the current build</h3>' +
				'<p class="side-copy">A newer release is available' +
				(latest ? ' (<b>' + esc(latest.tag) + '</b>)' : '') +
				'. Install this one only if you need this exact version.</p>' +
				(latest
					? '<a class="btn sm mt" href="' + esc(versionUrl(latest.tag)) + '">Go to ' +
					esc(latest.tag) + '</a>'
					: '') +
				'</div>') +

			'<div class="side-block">' +
			'<h3>After downloading</h3>' +
			'<p class="side-copy">Extract the <em>entire</em> archive into its own folder, install ' +
			'<a href="https://www.autohotkey.com/v2/" target="_blank" rel="noopener noreferrer">' +
			'AutoHotkey v2.0</a>, then run <code>Main.ahk</code>. It walks you through the ' +
			'required Roblox and TDS settings the first time it starts.</p>' +
			'<a class="btn sm mt" href="/guide/">Setup guide</a>' +
			'</div>' +

			'<div class="side-block">' +
			'<h3>Requirements</h3>' +
			'<ul class="req-list">' +
			'<li class="tag">Windows 10 / 11</li>' +
			'<li class="tag">AutoHotkey v2.0</li>' +
			'<li class="tag">1920×1080 display</li>' +
			'<li class="tag">100% display scale</li>' +
			'</ul>' +
			'</div>' +
			'</div>' +
			'</div>' +
			neighbourNav(list, index);

		var stamp = qs('[data-source-stamp]');
		if (stamp) {
			stamp.textContent = source === 'live'
				? 'Live from the GitHub releases API'
				: 'From the bundled release snapshot';
		}
	}

	UM.withReleases(render);
})();