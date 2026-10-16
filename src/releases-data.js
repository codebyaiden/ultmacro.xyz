var UMContract = (function () {
	'use strict';

	var REPO = 'UltimateMacro/Ultimate-Macro-New-Era';
	var RELEASE_BASE = 'https://github.com/' + REPO;
	var RELEASES_PAGE = RELEASE_BASE + '/releases';
	var RELEASES_API = 'https://api.github.com/repos/' + REPO + '/releases?per_page=100';

	var TAG = /^v?([0-9]+(?:\.[0-9]+){1,3}[a-z]?)(-[0-9a-z.]+)?$/i;
	var DIGEST = /^sha256:[0-9a-f]{64}$/i;
	var ZIP = /^(?:TDS_Macro|Ultimate-Macro)(?:[_-][\w.-]+)?\.zip$|^(?:TDS|Ultimate)\.Macro\.v[\w.-]+\.zip$/i;

	function isRecord(v) {
		return typeof v === 'object' && v !== null && !Array.isArray(v);
	}

	function selectAsset(release) {
		if (!isRecord(release) || typeof release.tag_name !== 'string') return null;
		var tag = release.tag_name;
		if (release.draft !== false) return null;
		if (!TAG.test(tag)) return null;
		if (release.html_url !== RELEASE_BASE + '/releases/tag/' + tag) return null;
		if (!Array.isArray(release.assets) || !release.assets.every(isRecord)) return null;

		var zips = release.assets.filter(function (a) {
			return typeof a.name === 'string' && ZIP.test(a.name);
		});
		var stable = zips.filter(function (a) {
			return a.name === 'TDS_Macro.zip';
		});
		var candidates = stable.length ? stable : zips;
		if (candidates.length !== 1) return null;

		var asset = candidates[0];
		var expected = RELEASE_BASE + '/releases/download/' + tag + '/' + asset.name;
		if (asset.browser_download_url !== expected) return null;
		if (typeof asset.digest !== 'string' || !DIGEST.test(asset.digest)) return null;
		if (asset.state !== 'uploaded') return null;
		if (!Number.isSafeInteger(asset.size) || asset.size <= 0) return null;

		return {
			name: asset.name,
			url: expected,
			size: asset.size,
			digest: asset.digest,
			downloads: Number.isSafeInteger(asset.download_count) ? asset.download_count : 0
		};
	}

	function selectExtras(release, primaryName) {
		if (!Array.isArray(release.assets)) return [];
		return release.assets
			.filter(function (a) {
				return (
					isRecord(a) &&
					typeof a.name === 'string' &&
					a.name !== primaryName &&
					a.state === 'uploaded' &&
					a.browser_download_url ===
					RELEASE_BASE + '/releases/download/' + release.tag_name + '/' + a.name &&
					Number.isSafeInteger(a.size) &&
					a.size > 0
				);
			})
			.map(function (a) {
				return { name: a.name, url: a.browser_download_url, size: a.size };
			});
	}

	function normalizeRelease(release) {
		if (!isRecord(release) || typeof release.tag_name !== 'string') return null;
		if (release.draft !== false) return null;
		if (!TAG.test(release.tag_name)) return null;
		if (release.html_url !== RELEASE_BASE + '/releases/tag/' + release.tag_name) return null;

		var asset = selectAsset(release);
		var name =
			typeof release.name === 'string' && release.name.trim()
				? release.name.trim()
				: release.tag_name;

		return {
			tag: release.tag_name,
			name: name,
			url: release.html_url,
			published: typeof release.published_at === 'string' ? release.published_at : null,
			prerelease: release.prerelease === true,
			body: typeof release.body === 'string' ? release.body : '',
			asset: asset,
			extras: asset ? selectExtras(release, asset.name) : []
		};
	}

	function sortReleases(list) {
		return list.slice().sort(function (a, b) {
			var ta = a.published ? Date.parse(a.published) : 0;
			var tb = b.published ? Date.parse(b.published) : 0;
			if (tb !== ta) return tb - ta;
			return b.tag.localeCompare(a.tag, 'en', { numeric: true });
		});
	}

	function normalizePayload(payload) {
		if (!Array.isArray(payload)) return [];
		return sortReleases(
			payload.map(normalizeRelease).filter(function (r) {
				return r;
			})
		);
	}

	function pickLatestStable(releases) {
		var stable = releases.find(function (r) {
			return !r.prerelease && r.asset;
		});
		if (stable) return stable;
		return (
			releases.find(function (r) {
				return r.asset;
			}) || null
		);
	}

	return {
		REPO: REPO,
		RELEASE_BASE: RELEASE_BASE,
		RELEASES_PAGE: RELEASES_PAGE,
		RELEASES_API: RELEASES_API,
		selectAsset: selectAsset,
		normalizeRelease: normalizeRelease,
		normalizePayload: normalizePayload,
		sortReleases: sortReleases,
		pickLatestStable: pickLatestStable
	};
})();

if (typeof module === 'object' && module.exports) module.exports = UMContract;
