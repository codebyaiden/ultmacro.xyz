(function () {
	'use strict';

	var qs = UM.qs;
	var qsa = UM.qsa;
	var on = UM.on;
	var esc = UM.esc;

	UM.initChrome();

	var latestHost = qs('[data-latest]');
	var historyHost = qs('[data-history]');
	var historyToggle = qs('[data-history-toggle]');
	var historyBody = qs('[data-history-body]');
	var historyCount = qs('[data-history-count]');
	var stampOut = qs('[data-source-stamp]');
	if (!latestHost || !historyHost) return;

	var openRows = {};
	var historyOpen = false;

	var downloadIcon =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
		'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		'<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/></svg>';
	var chevIcon =
		'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
		'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

	function releaseTitle(release) {
		var name = (release.name || '').trim();
		if (!name) return '';
		function strip(v) {
			return v.toLowerCase().replace(/^v/, '').replace(/[\s._-]/g, '');
		}
		return strip(name) === strip(release.tag) ? '' : name;
	}

	function releaseNotes(release) {
		var body = release.body || '';
		if (release.tag === 'v1.3.6') {
			body += '\n\n> **Auto Equip notice:** Auto Equip may still miss towers. Check your loadout before starting a match.';
		}
		return UM.renderMarkdown(body);
	}

	function badges(release, isLatest) {
		var out = [];
		if (isLatest) out.push('<span class="tag live">Latest</span>');
		if (release.prerelease) out.push('<span class="tag warn">Prerelease</span>');
		else out.push('<span class="tag blue">Stable</span>');
		if (!release.asset) out.push('<span class="tag quiet">No download</span>');
		return out.join('');
	}

	function renderLatest(release) {
		if (!release) {
			latestHost.innerHTML =
				'<div class="load-fail"><strong>Release data could not be loaded.</strong><br>' +
				'Every official build is always available on <a href="' +
				UMContract.RELEASES_PAGE +
				'" target="_blank" rel="noopener noreferrer">the GitHub releases page</a>.</div>';
			return;
		}

		var asset = release.asset;
		var rel = UM.relativeDate(release.published);
		var extras = release.extras || [];
		var title = releaseTitle(release);
		var digest = asset ? asset.digest.replace('sha256:', '') : '';

		latestHost.innerHTML =
			'<div class="latest panel bracket">' +
			'<div class="latest-main">' +
			'<p class="kicker">Latest release</p>' +
			'<div class="ver-line">' +
			'<span class="ver-num">' + esc(release.tag) + '</span>' +
			badges(release, true) +
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
				? '<a class="btn signal lg" href="' + asset.url + '" download>' +
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

			'<details class="notes">' +
			'<summary class="notes-toggle"><span>Release notes</span>' + chevIcon + '</summary>' +
			'<div class="notes-body">' +
			'<div class="rel-body">' + releaseNotes(release) + '</div>' +
			'</div>' +
			'</details>' +
			'</div>' +

			'<div class="latest-side">' +
			'<div class="side-block">' +
			'<h3>After downloading</h3>' +
			'<p class="side-copy">Extract the <em>entire</em> archive into its own folder, install ' +
			'<a href="https://www.autohotkey.com/v2/" target="_blank" rel="noopener noreferrer">' +
			'AutoHotkey v2.0</a>, then run <code>Main.ahk</code>. It walks you through the ' +
			'required Roblox and TDS settings the first time it starts.</p>' +
			'<a class="btn sm mt" href="../guide/">Setup guide</a>' +
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
			'</div>';

	}

	function renderHistory(releases, latestTag) {
		if (!releases.length) {
			historyHost.innerHTML =
				'<p class="no-asset">No version history is available right now. Browse every build on ' +
				'<a href="' + UMContract.RELEASES_PAGE +
				'" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>';
			return;
		}

		historyHost.innerHTML = releases
			.map(function (r) {
				var open = !!openRows[r.tag];
				var rel = UM.relativeDate(r.published);
				var title = releaseTitle(r);
				return (
					'<article class="vrow' + (open ? ' open' : '') + '" data-tag="' + esc(r.tag) + '">' +
					'<button class="vrow-head" type="button" aria-expanded="' + open +
					'" aria-controls="notes-' + esc(r.tag) + '">' +
					'<span>' +
					'<span class="vrow-id">' +
					'<span class="vrow-tag">' + esc(r.tag) + '</span>' +
					badges(r, r.tag === latestTag) +
					(title ? '<span class="vrow-name">' + esc(title) + '</span>' : '') +
					'</span>' +
					'<span class="vrow-meta">' +
					'<span>' + esc(UM.shortDate(r.published)) +
					(rel ? ' · ' + esc(rel) : '') + '</span>' +
					(r.asset ? '<span>' + esc(UM.fileSize(r.asset.size)) + '</span>' : '') +
					(r.asset ? '<span>' + esc(UM.count(r.asset.downloads)) + ' downloads</span>' : '') +
					'</span>' +
					'</span>' +
					'<span class="vrow-right"><span>Changelog</span>' + chevIcon + '</span>' +
					'</button>' +
					'<div class="vrow-body" id="notes-' + esc(r.tag) + '"><div>' +
					'<div class="vrow-inner">' +
					'<div class="rel-body">' + releaseNotes(r) + '</div>' +
					'<div class="vrow-actions">' +
					(r.asset
						? '<a class="btn primary block" href="' + r.asset.url + '" download>' +
						downloadIcon + ' Download</a>'
						: '<p class="no-asset">This build publishes no public download.</p>') +
					'<a class="btn ghost block sm" href="' + esc(r.url) +
					'" target="_blank" rel="noopener noreferrer">View on GitHub</a>' +
					'<dl>' +
					'<div><span>Tag</span><b>' + esc(r.tag) + '</b></div>' +
					(r.asset ? '<div><span>File</span><b>' + esc(r.asset.name) + '</b></div>' : '') +
					(r.asset ? '<div><span>Size</span><b>' + esc(UM.fileSize(r.asset.size)) + '</b></div>' : '') +
					'<div><span>Channel</span><b>' + (r.prerelease ? 'Prerelease' : 'Stable') + '</b></div>' +
					'</dl>' +
					'</div>' +
					'</div>' +
					'</div></div>' +
					'</article>'
				);
			})
			.join('');

		qsa('.vrow-head', historyHost).forEach(function (head) {
			on(head, 'click', function () {
				var row = head.closest('.vrow');
				var next = !row.classList.contains('open');
				row.classList.toggle('open', next);
				head.setAttribute('aria-expanded', String(next));
				if (next) openRows[row.dataset.tag] = true;
				else delete openRows[row.dataset.tag];
			});
		});
	}

	function render(releases, source) {
		var list = Array.isArray(releases) ? releases : [];
		var latest = UMContract.pickLatestStable(list);
		var older = latest
			? list.filter(function (r) {
				return r.tag !== latest.tag;
			})
			: list;

		renderLatest(latest);
		renderHistory(older, latest ? latest.tag : null);

		if (historyCount) {
			historyCount.textContent = older.length
				? older.length + ' earlier ' + (older.length === 1 ? 'build' : 'builds')
				: 'No earlier builds';
		}
		if (historyToggle) historyToggle.disabled = !older.length;
		if (stampOut) {
			stampOut.textContent =
				source === 'live'
					? 'Live from the GitHub releases API'
					: 'From the bundled release snapshot';
		}
	}

	if (historyToggle && historyBody) {
		var label = qs('[data-history-label]', historyToggle);
		on(historyToggle, 'click', function () {
			historyOpen = !historyOpen;
			historyBody.classList.toggle('open', historyOpen);
			historyToggle.setAttribute('aria-expanded', String(historyOpen));
			if (label) label.textContent = historyOpen ? 'Hide other versions' : 'See other versions';
		});
	}

	function openHistory() {
		if (historyOpen || !historyToggle || historyToggle.disabled) return;
		historyToggle.click();
	}

	qsa('a[href$="#history"]').forEach(function (link) {
		on(link, 'click', openHistory);
	});

	UM.withReleases(render).then(function () {
		if (UM.initialHash() === 'history') openHistory();
	});
})();
