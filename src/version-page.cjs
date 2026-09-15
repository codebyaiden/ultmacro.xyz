const fs = require('node:fs/promises');
const path = require('node:path');
const contract = require('./releases-data.js');

const ASSET_VERSION = 29;
const SITE = 'https://ultmacro.xyz';

const SAFE_TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;

function isSafeTag(tag) {
	return typeof tag === 'string' && SAFE_TAG.test(tag) && tag !== '.' && tag !== '..';
}

function esc(value) {
	return String(value === null || value === undefined ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function versionUrl(tag) {
	return `/download/${encodeURIComponent(tag)}`;
}

function summarize(release) {
	const plain = String(release.body || '')
		.replace(/\r/g, '')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^\s*[-*+]\s+/gm, '')
		.replace(/[*_`~>]/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
	const lead = plain.slice(0, 150).trim();
	const detail = lead
		? `${lead}${plain.length > 150 ? '…' : ''}`
		: 'Release notes, checksum and a direct download.';
	return `Download Ultimate Macro ${release.tag} for Tower Defense Simulator. ${detail}`.slice(0, 300);
}

const NAV = [
	['/#capabilities', 'Features'],
	['/#requirements', 'Requirements'],
	['/guide/', 'Guide'],
	['/strategies/', 'Strategy Network'],
	['/early-access/', 'Early Access'],
	['/download/', 'Download'],
	['/#faq', 'FAQ']
];

function page(release, isLatest, latestTag) {
	const tag = release.tag;
	const url = `${SITE}${versionUrl(tag)}`;
	const name = (release.name || '').trim() || tag;
	const title = `Ultimate Macro ${tag} — download & changelog`;
	const description = summarize(release);

	const headNav = NAV.map(([href, label]) =>
		`<a href="${href}"${label === 'Download' ? ' aria-current="page"' : ''}>${label}</a>`
	).join('\n\t\t\t\t');
	const mobileNav = NAV.map(([href, label]) =>
		`<a href="${href}"${label === 'Download' ? ' class="current"' : ''}>${label}</a>`
	).join('\n\t\t');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<!-- Google tag (gtag.js) -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-R80TVJT9LV"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', 'G-R80TVJT9LV');
	</script>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2006821288023174" crossorigin="anonymous"></script>
	<title>${esc(title)}</title>
	<meta name="description" content="${esc(description)}">
	<link rel="canonical" href="${esc(url)}">
	<meta name="theme-color" content="#0e0e10">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Ultimate Macro">
	<meta property="og:url" content="${esc(url)}">
	<meta property="og:title" content="${esc(`Ultimate Macro ${tag}`)}">
	<meta property="og:description" content="${esc(description)}">
	<meta property="og:image" content="${SITE}/assets/icon.png">
	<meta property="og:image:alt" content="The Ultimate Macro logo">
	<meta name="twitter:card" content="summary">
	<meta name="twitter:title" content="${esc(`Ultimate Macro ${tag}`)}">
	<link rel="icon" href="/assets/icon.png" type="image/png">
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link rel="preconnect" href="https://api.github.com">
	<link
		href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet">
	<link rel="stylesheet" href="/styles/base.css?v=${ASSET_VERSION}">
	<link rel="stylesheet" href="/styles/releases.css?v=${ASSET_VERSION}">
	<script type="application/ld+json">
${JSON.stringify(
		{
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: `Ultimate Macro ${tag}`,
			softwareVersion: tag.replace(/^v/, ''),
			applicationCategory: 'UtilitiesApplication',
			operatingSystem: 'Windows 10, Windows 11',
			datePublished: release.published || undefined,
			downloadUrl: release.asset ? release.asset.url : release.url,
			fileSize: release.asset ? String(release.asset.size) : undefined,
			url,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
		},
		null,
		'\t'
	)}
	</script>
	<script>
		document.documentElement.className = 'js';
		setTimeout(function () {
			var d = document.documentElement;
			if (!d.classList.contains('booted')) d.classList.remove('js');
		}, 3000);
	</script>
</head>
<body>
	<a class="sr-only" href="#main">Skip to content</a>
	<header class="site-head">
		<div class="wrap">
			<a class="brand" href="/" aria-label="Ultimate Macro home">
				<img class="brand-mark" src="/assets/icon.png" alt="" width="28" height="28">
				<span class="brand-text">Ultimate<i>Macro</i></span>
			</a>
			<nav class="site-nav" aria-label="Primary">
				${headNav}
			</nav>
			<div class="head-actions">
				<a class="ver-chip" href="/download/latest" title="Latest release">
					<span class="led on" aria-hidden="true"></span>
					<span data-latest-version>${esc(latestTag)}</span>
				</a>
				<a class="btn sm head-cta" href="/download/">All versions</a>
				<button class="burger" type="button" aria-expanded="false" aria-controls="mobileNav"
					aria-label="Toggle navigation"><span></span></button>
			</div>
		</div>
	</header>
	<nav class="mobile-nav" id="mobileNav" aria-label="Mobile">
		${mobileNav}
		<a href="/#community">Community</a>
	</nav>
	<main id="main">
		<section class="rel-hero">
			<div class="wrap">
				<nav class="crumbs" aria-label="Breadcrumb">
					<a href="/">Home</a><span aria-hidden="true">/</span><a href="/download/">Downloads</a><span
						aria-hidden="true">/</span><span aria-current="page">${esc(tag)}</span>
				</nav>
				<p class="kicker">Ultimate Macro <b>/</b> Release</p>
				<h1>${esc(name)}</h1>
				<p class="lede">
					The full changelog, checksum and direct download for this exact build.
					${isLatest ? 'This is the current recommended release.' : 'Newer releases may be available.'}
				</p>
			</div>
		</section>
		<section class="latest-wrap">
			<div class="wrap">
				<div data-version-view data-version="${esc(tag)}">
					<div class="latest panel">
						<div class="latest-main">
							<p class="kicker">Release</p>
							<div class="ver-line"><span class="ver-num">${esc(tag)}</span></div>
							<div class="ver-sub"><span class="skel">Loading release information…</span></div>
							<div class="dl-row"><span class="btn lg skel">Download</span></div>
						</div>
						<div class="latest-side">
							<div class="side-block">
								<h3>Install</h3>
								<p class="no-asset skel">Loading…</p>
							</div>
						</div>
					</div>
				</div>
				<div class="hist-foot">
					<span data-source-stamp>From the bundled release snapshot</span>
					<a href="/download/">Every version →</a>
				</div>
			</div>
		</section>
		<section class="band tight">
			<div class="wrap stack">
				<div class="notice">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
						stroke-linejoin="round" aria-hidden="true">
						<path
							d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
					</svg>
					<span><strong>Official sources only.</strong> Ultimate Macro is distributed through this site
						and the
						<a href="${contract.RELEASES_PAGE}" target="_blank" rel="noopener noreferrer"
							class="notice-link">official GitHub releases</a> only. Automating an online game carries
						risk, and this project is not endorsed by Roblox Corporation or Paradoxum Games &mdash; use it
						at your own discretion.</span>
				</div>
			</div>
		</section>
	</main>
	<footer class="site-foot">
		<div class="wrap">
			<div class="foot-grid">
				<div class="foot-about">
					<a class="brand" href="/">
						<img class="brand-mark" src="/assets/icon.png" alt="" width="28" height="28">
						<span class="brand-text">Ultimate<i>Macro</i></span>
					</a>
					<p>Free, open-source automation for Roblox Tower Defense Simulator. Originally created by
						Darksen, continued by the New Era team.</p>
				</div>
				<div class="foot-col">
					<h3>Product</h3>
					<ul>
						<li><a href="/#capabilities">Features</a></li>
						<li><a href="/#requirements">Requirements</a></li>
						<li><a href="/#faq">FAQ</a></li>
					</ul>
				</div>
				<div class="foot-col">
					<h3>Get it</h3>
					<ul>
						<li><a href="/download/">Download</a></li>
						<li><a href="/early-access/">Early Access</a></li>
						<li><a href="/download/#history">Version history</a></li>
						<li><a href="/guide/">Setup guide</a></li>
					</ul>
				</div>
				<div class="foot-col">
					<h3>Community</h3>
					<ul>
						<li><a href="https://discord.gg/ultmacro" target="_blank"
								rel="noopener noreferrer">Discord</a></li>
						<li><a href="https://github.com/UltimateMacro/Ultimate-Macro-New-Era" target="_blank"
								rel="noopener noreferrer">GitHub</a></li>
						<li><a href="https://www.youtube.com/@UltimateMacro" target="_blank"
								rel="noopener noreferrer">YouTube</a></li>
						<li><a href="https://github.com/UltimateMacro/Ultimate-Macro-New-Era/blob/main/LICENSE"
								target="_blank" rel="noopener noreferrer">GPL-3.0 licence</a></li>
					</ul>
				</div>
			</div>
			<div class="foot-bar">
				<span>© <span data-year>2026</span> Ultimate Macro · The New Era</span>
				<span>Not affiliated with Roblox Corporation or Paradoxum Games.</span>
			</div>
		</div>
	</footer>
	<script src="/data/releases.js?v=${ASSET_VERSION}"></script>
	<script src="/src/releases-data.js?v=${ASSET_VERSION}"></script>
	<script src="/src/core.js?v=${ASSET_VERSION}"></script>
	<script src="/src/version.js?v=${ASSET_VERSION}"></script>
</body>
</html>
`;
}

function latestPage(latestTag) {
	const target = versionUrl(latestTag);
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Latest Ultimate Macro release</title>
	<meta name="robots" content="noindex, follow">
	<link rel="canonical" href="${SITE}${esc(target)}">
	<meta http-equiv="refresh" content="0; url=${esc(target)}">
	<link rel="icon" href="/assets/icon.png" type="image/png">
	<link rel="stylesheet" href="/styles/base.css?v=${ASSET_VERSION}">
	<script src="/data/releases.js?v=${ASSET_VERSION}"></script>
	<script src="/src/releases-data.js?v=${ASSET_VERSION}"></script>
	<script>
		(function () {
			var tag = ${JSON.stringify(latestTag)};
			try {
				var data = window.UM_RELEASES;
				var picked = window.UMContract && data && UMContract.pickLatestStable(data.releases || []);
				if (picked && picked.tag) tag = picked.tag;
			} catch (err) {}
			location.replace('/download/' + encodeURIComponent(tag));
		})();
	</script>
</head>
<body>
	<main class="wrap" style="padding:4rem 0">
		<p>Redirecting to the latest Ultimate Macro release…</p>
		<p><a href="${esc(target)}">Continue to ${esc(latestTag)}</a> · <a href="/download/">All versions</a></p>
	</main>
</body>
</html>
`;
}

async function writeVersionPages(releases) {
	const downloadDir = path.join(__dirname, '..', 'download');
	const latest = contract.pickLatestStable(releases);
	const written = [];
	const keep = new Set(['latest']);

	for (const release of releases) {
		if (!isSafeTag(release.tag)) continue;
		keep.add(release.tag);
		const dir = path.join(downloadDir, release.tag);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(
			path.join(dir, 'index.html'),
			page(release, !!latest && latest.tag === release.tag, latest ? latest.tag : release.tag),
			'utf8'
		);
		written.push(release.tag);
	}

	if (latest) {
		const dir = path.join(downloadDir, 'latest');
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(path.join(dir, 'index.html'), latestPage(latest.tag), 'utf8');
	}

	const removed = [];
	for (const entry of await fs.readdir(downloadDir, { withFileTypes: true })) {
		if (!entry.isDirectory() || keep.has(entry.name)) continue;
		const marker = path.join(downloadDir, entry.name, 'index.html');
		let contents = '';
		try {
			contents = await fs.readFile(marker, 'utf8');
		} catch {
			continue;
		}
		if (!contents.includes('data-version-view') && !contents.includes('Redirecting to the latest')) continue;
		await fs.rm(path.join(downloadDir, entry.name), { recursive: true, force: true });
		removed.push(entry.name);
	}

	return { written, removed, latest: latest ? latest.tag : null };
}

async function writeVersionChips(latestTag) {
	const root = path.join(__dirname, '..');
	const pages = [];

	async function walk(dir) {
		for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
			if (entry.name === 'node_modules' || entry.name === '.git') continue;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.name.endsWith('.html')) pages.push(full);
		}
	}

	await walk(root);

	const updated = [];
	for (const file of pages) {
		const source = await fs.readFile(file, 'utf8');
		const next = source.replace(
			/(<([a-zA-Z][\w-]*)\b[^>]*\bdata-latest-version\b[^>]*>)([^<]*)(<\/\2>)/g,
			(match, open, tagName, text, close) => {
				const cleaned = open.replace(/\s*class="([^"]*)"/, (full, classes) => {
					const kept = classes.split(/\s+/).filter((name) => name && name !== 'is-loading');
					return kept.length ? ` class="${kept.join(' ')}"` : '';
				});
				return cleaned + esc(latestTag) + close;
			}
		);
		if (next !== source) {
			await fs.writeFile(file, next, 'utf8');
			updated.push(path.relative(root, file).replace(/\\/g, '/'));
		}
	}

	return updated;
}

module.exports = { writeVersionPages, writeVersionChips };