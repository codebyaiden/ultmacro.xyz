var UM = (function () {
	'use strict';

	function qs(sel, root) {
		return (root || document).querySelector(sel);
	}

	function qsa(sel, root) {
		return Array.prototype.slice.call((root || document).querySelectorAll(sel));
	}

	function on(target, type, handler, opts) {
		if (target) target.addEventListener(type, handler, opts);
	}

	function esc(value) {
		return String(value === null || value === undefined ? '' : value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function fileSize(bytes) {
		if (!isFinite(bytes) || bytes <= 0) return '—';
		var mb = bytes / 1024 / 1024;
		if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
		if (mb >= 10) return Math.round(mb) + ' MB';
		return mb.toFixed(1) + ' MB';
	}

	function shortDate(iso) {
		if (!iso) return '—';
		var d = new Date(iso);
		if (isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function relativeDate(iso) {
		if (!iso) return '';
		var then = new Date(iso);
		if (isNaN(then.getTime())) return '';
		function midnight(d) {
			return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		}
		var days = Math.round((midnight(new Date()) - midnight(then)) / 86400000);
		if (days < 0) return 'scheduled';
		if (days === 0) return 'today';
		if (days === 1) return 'yesterday';
		if (days < 30) return days + ' days ago';
		return '';
	}

	function count(n) {
		return isFinite(n) ? n.toLocaleString('en-US') : '—';
	}

	function inline(text) {
		return esc(text)
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
			.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
			.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, href) {
				return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
			});
	}

	function renderMarkdown(source) {
		if (typeof source !== 'string' || !source.trim()) {
			return '<p class="md-empty">No release notes were published for this version.</p>';
		}

		var lines = source.replace(/\r\n?/g, '\n').split('\n');
		var out = [];
		var list = null;
		var quote = [];
		var para = [];

		function flushList() {
			if (list) {
				out.push('</' + list + '>');
				list = null;
			}
		}
		function flushPara() {
			if (para.length) {
				out.push('<p>' + inline(para.join(' ')) + '</p>');
				para = [];
			}
		}
		function flushQuote() {
			if (quote.length) {
				out.push('<blockquote>' + inline(quote.join(' ')) + '</blockquote>');
				quote = [];
			}
		}
		function flushAll() {
			flushPara();
			flushList();
			flushQuote();
		}

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i].replace(/\s+$/, '');

			if (!line.trim()) {
				flushAll();
				continue;
			}

			var heading = /^(#{1,6})\s+(.*)$/.exec(line);
			if (heading) {
				flushAll();
				var level = Math.min(6, heading[1].length + 3);
				out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
				continue;
			}

			var blockquote = /^>\s?(.*)$/.exec(line);
			if (blockquote) {
				flushPara();
				flushList();
				quote.push(blockquote[1]);
				continue;
			}
			flushQuote();

			var bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
			if (bullet) {
				flushPara();
				if (list !== 'ul') {
					flushList();
					out.push('<ul>');
					list = 'ul';
				}
				out.push('<li>' + inline(bullet[1]) + '</li>');
				continue;
			}

			var numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
			if (numbered) {
				flushPara();
				if (list !== 'ol') {
					flushList();
					out.push('<ol>');
					list = 'ol';
				}
				out.push('<li>' + inline(numbered[1]) + '</li>');
				continue;
			}

			if (list) {
				out.push('<li>' + inline(line.trim()) + '</li>');
				continue;
			}

			para.push(line.trim());
		}

		flushAll();
		return out.join('');
	}

	var CACHE_KEY = 'um.releases.v2';
	var TTL = 30 * 60 * 1000;
	var livePromise = null;

	function readCache() {
		try {
			var raw = sessionStorage.getItem(CACHE_KEY);
			if (!raw) return null;
			var parsed = JSON.parse(raw);
			if (!parsed || Date.now() - parsed.at > TTL) return null;
			return Array.isArray(parsed.releases) ? parsed.releases : null;
		} catch (err) {
			return null;
		}
	}

	function writeCache(releases) {
		try {
			sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), releases: releases }));
		} catch (err) {
		}
	}

	function loadSnapshot() {
		var cached = readCache();
		if (cached) return { releases: cached, live: true };
		var bundled = window.UM_RELEASES;
		return {
			releases: bundled && Array.isArray(bundled.releases) ? bundled.releases : [],
			live: false
		};
	}

	function loadLive() {
		if (livePromise) return livePromise;
		if (readCache()) {
			livePromise = Promise.resolve(null);
			return livePromise;
		}

		var controller = typeof AbortController === 'function' ? new AbortController() : null;
		var timer = setTimeout(function () {
			if (controller) controller.abort();
		}, 8000);

		livePromise = fetch(UMContract.RELEASES_API, {
			headers: { Accept: 'application/vnd.github+json' },
			signal: controller ? controller.signal : undefined,
			credentials: 'omit'
		})
			.then(function (r) {
				return r.ok ? r.json() : null;
			})
			.then(function (payload) {
				var releases = payload ? UMContract.normalizePayload(payload) : [];
				if (!releases.length) return null;
				writeCache(releases);
				return releases;
			})
			.catch(function () {
				return null;
			})
			.then(function (result) {
				clearTimeout(timer);
				return result;
			});

		return livePromise;
	}

	function withReleases(render) {
		var first = loadSnapshot();
		render(first.releases, first.live ? 'live' : 'snapshot');
		return loadLive().then(function (live) {
			if (live && JSON.stringify(live) !== JSON.stringify(first.releases)) render(live, 'live');
		});
	}

	function initHeader() {
		var head = qs('.site-head');
		var burger = qs('.burger');
		var menu = qs('.mobile-nav');
		if (!head) return;

		var scrolled = false;
		function onScroll() {
			var next = window.scrollY > 8;
			if (next !== scrolled) {
				scrolled = next;
				head.classList.toggle('scrolled', next);
			}
		}
		on(window, 'scroll', onScroll, { passive: true });
		onScroll();

		if (!burger || !menu) return;

		function setOpen(open) {
			burger.setAttribute('aria-expanded', String(open));
			menu.classList.toggle('open', open);
			document.body.style.overflow = open ? 'hidden' : '';
		}

		on(burger, 'click', function () {
			setOpen(burger.getAttribute('aria-expanded') !== 'true');
		});
		on(menu, 'click', function (e) {
			if (e.target.closest('a')) setOpen(false);
		});
		on(document, 'keydown', function (e) {
			if (e.key === 'Escape') setOpen(false);
		});
		on(window, 'resize', function () {
			if (window.innerWidth > 860) setOpen(false);
		});
	}

	function initAtmosphere() {
		if (qs('.night-sky')) return;
		var sky = document.createElement('div');
		sky.className = 'night-sky';
		sky.setAttribute('aria-hidden', 'true');
		sky.innerHTML = '<svg class="site-sky-moon" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="site-moon-fill" x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#b8c8e8"/></linearGradient><mask id="site-moon-cutout"><rect width="100" height="100" fill="black"/><circle cx="45" cy="50" r="40" fill="white"/><circle cx="66" cy="42" r="40" fill="black"/></mask></defs><rect width="100" height="100" fill="url(#site-moon-fill)" mask="url(#site-moon-cutout)"/></svg><svg class="site-sky-sun" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="18"/><g><path d="M50 5v16M50 79v16M5 50h16M79 50h16M18 18l11 11M71 71l11 11M82 18 71 29M29 71 18 82"/></g></svg><svg class="site-sky-clouds" viewBox="0 0 500 120" aria-hidden="true"><path d="M25 88c0-22 18-40 40-40 6-21 25-35 48-35 27 0 49 22 49 49h8c20 0 36 16 36 36H25Zm245 8c0-20 16-36 36-36 6-19 23-31 44-31 25 0 45 20 45 45h8c18 0 32 14 32 32H270Z"/></svg>';
		document.body.prepend(sky);
	}

	function initPageContext() {
		var head = qs('.site-head');
		var brand = qs('.site-head .brand');
		if (!head || !brand || qs('.head-context', head)) return;
		var path = location.pathname;
		var label = 'Home';
		if (path.indexOf('/guide/') !== -1) label = 'Guide';
		else if (path.indexOf('/strategies/') !== -1) label = 'Strategy Network';
		else if (path.indexOf('/early-access/') !== -1) label = 'Early Access';
		else if (path.indexOf('/download/') !== -1) label = path.match(/\/download\/v[^/]+/) ? 'Release' : 'Download';
		var context = document.createElement('span');
		context.className = 'head-context';
		context.textContent = label;
		brand.after(context);
	}

	function humanizeLabels() {
		qsa('.kicker, #main h1, #main h2, #main h3, #main h4, .site-nav a, .mobile-nav a:not(.btn), .btn, .foot-col h3').forEach(function (element) {
			element.style.textTransform = 'none';
			var value = (element.textContent || '').trim();
			if (!value || value !== value.toUpperCase()) return;

			var formatted = value.toLowerCase().replace(/\b[a-z]/g, function (character) {
				return character.toUpperCase();
			});

			formatted = formatted
				.replace(/\bTds\b/g, 'TDS')
				.replace(/\bFaq\b/g, 'FAQ')
				.replace(/\bDj\b/g, 'DJ')
				.replace(/\bOcr\b/g, 'OCR')
				.replace(/\bF(\d)\b/g, 'F$1');

			element.textContent = formatted;
		});
	}

	function initPreferences() {
		var host = qs('.head-actions');
		if (!host || qs('.site-settings', host)) return;
		var wrap = document.createElement('div');
		wrap.className = 'site-settings';
		wrap.innerHTML = '<button class="settings-toggle" type="button" aria-label="Open website settings" aria-expanded="false" aria-controls="site-settings-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm9 3.8-2.1-.7a7 7 0 0 0-.6-1.5l1-2-1.9-1.9-2 1a7 7 0 0 0-1.5-.6L13.2 4h-2.4l-.7 2.1a7 7 0 0 0-1.5.6l-2-1-1.9 1.9 1 2a7 7 0 0 0-.6 1.5L3 12v2l2.1.7c.2.5.4 1 .6 1.5l-1 2 1.9 1.9 2-1c.5.3 1 .5 1.5.6l.7 2.1h2.4l.7-2.1c.5-.1 1-.3 1.5-.6l2 1 1.9-1.9-1-2c.3-.5.5-1 .6-1.5L21 14v-2Z"/></svg></button><div class="settings-panel" id="site-settings-panel" hidden><div class="settings-panel-head"><strong>Personalize</strong><span>Shape the way the site feels.</span></div><div class="settings-group"><span class="settings-label">Atmosphere</span><div class="settings-theme" role="group" aria-label="Choose atmosphere"><button type="button" class="settings-choice" data-theme-choice="dark" aria-label="Night sky"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.2A8.6 8.6 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z"/></svg><span>Night</span></button><button type="button" class="settings-choice" data-theme-choice="light" aria-label="Sunrise"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg><span>Day</span></button></div></div><div class="settings-group"><span class="settings-label">Layout</span><div class="settings-layout" role="group" aria-label="Choose layout"><button type="button" class="settings-choice" data-layout-choice="reworked"><span class="layout-mark">✦</span><span>Reworked</span></button><button type="button" class="settings-choice" data-layout-choice="compact"><span class="layout-mark">≡</span><span>Compact</span></button></div></div></div>';
		host.insertBefore(wrap, host.firstChild);
		var button = qs('.settings-toggle', wrap);
		var panel = qs('.settings-panel', wrap);
		var saved = {};
		try { saved = JSON.parse(localStorage.getItem('um.site-settings') || '{}'); } catch (_) { saved = {}; }
		var themeChoices = qsa('[data-theme-choice]', wrap);
		var layoutChoices = qsa('[data-layout-choice]', wrap);
		function savePreferences() {
			try { localStorage.setItem('um.site-settings', JSON.stringify(saved)); } catch (_) { }
		}
		function applyTheme(value, animate) {
			var theme = value === 'light' ? 'light' : 'dark';
			if (animate && document.documentElement.dataset.theme && document.documentElement.dataset.theme !== theme) {
				document.documentElement.classList.add('theme-transitioning');
				window.setTimeout(function () { document.documentElement.classList.remove('theme-transitioning'); }, 720);
			}
			document.documentElement.classList.toggle('light-mode', theme === 'light');
			document.documentElement.dataset.theme = theme;
			themeChoices.forEach(function (choice) { choice.classList.toggle('is-active', choice.getAttribute('data-theme-choice') === theme); });
			saved.theme = theme;
		}
		function applyLayout(value) {
			var layout = value === 'compact' ? 'compact' : 'reworked';
			document.documentElement.classList.toggle('compact-mode', layout === 'compact');
			document.documentElement.dataset.layout = layout;
			layoutChoices.forEach(function (choice) { choice.classList.toggle('is-active', choice.getAttribute('data-layout-choice') === layout); });
			saved.layout = layout;
		}
		applyTheme(saved.theme === 'light' ? 'light' : 'dark', false);
		applyLayout(saved.layout === 'compact' ? 'compact' : 'reworked');
		themeChoices.forEach(function (choice) { on(choice, 'click', function () { applyTheme(choice.getAttribute('data-theme-choice') || 'dark', true); savePreferences(); }); });
		layoutChoices.forEach(function (choice) { on(choice, 'click', function () { applyLayout(choice.getAttribute('data-layout-choice') || 'reworked'); savePreferences(); }); });
		on(button, 'click', function () { var open = panel.hidden; panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); });
		on(document, 'click', function (event) { if (!wrap.contains(event.target)) { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); } });
		on(document, 'keydown', function (event) { if (event.key === 'Escape') { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); } });
	}

	function initReveals() {
		var targets = qsa('[data-reveal]');
		if (!targets.length) return;

		if (!('IntersectionObserver' in window)) {
			targets.forEach(function (el) {
				el.classList.add('shown');
			});
			return;
		}

		var io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					if (!entry.isIntersecting) return;
					entry.target.classList.add('shown');
					io.unobserve(entry.target);
				});
			},
			{ rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
		);
		targets.forEach(function (el) {
			io.observe(el);
		});
	}

	function initScrollspy() {
		var links = qsa('.site-nav a[href*="#"], .mobile-nav a[href*="#"]');
		if (!links.length || !('IntersectionObserver' in window)) return;

		var byId = {};
		links.forEach(function (link) {
			var href = link.getAttribute('href');
			var frag = href.slice(href.indexOf('#') + 1);
			if (!frag || !document.getElementById(frag)) return;
			var base = href.slice(0, href.indexOf('#'));
			if (base && base !== location.pathname.split('/').pop()) return;
			(byId[frag] = byId[frag] || []).push(link);
		});

		var ids = Object.keys(byId);
		if (!ids.length) return;

		var sections = ids
			.map(function (id) {
				return document.getElementById(id);
			})
			.filter(Boolean);

		var visible = {};
		var io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					visible[entry.target.id] = entry.isIntersecting;
				});
				var active = sections.find(function (s) {
					return visible[s.id];
				});
				ids.forEach(function (id) {
					byId[id].forEach(function (a) {
						a.classList.toggle('current', !!active && id === active.id);
					});
				});
			},
			{ rootMargin: '-25% 0px -60% 0px' }
		);
		sections.forEach(function (s) {
			io.observe(s);
		});
	}

	var initialHash = '';

	function currentFile() {
		var last = location.pathname.split('/').pop();
		return last || 'index.html';
	}

	function isSamePage(href) {
		if (href.charAt(0) === '#') return true;
		var hash = href.indexOf('#');
		if (hash < 1) return false;
		var path = href.slice(0, hash);
		return path === currentFile() || path === './' + currentFile();
	}

	function scrollToId(id) {
		var target = id && document.getElementById(id);
		if (!target) return false;
		var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
		return true;
	}

	function cleanUrl() {
		if (!location.hash || !history.replaceState) return;
		history.replaceState(null, '', location.pathname + location.search);
	}

	function initAnchors() {
		initialHash = location.hash.slice(1);

		if (initialHash) {
			setTimeout(function () {
				if (document.getElementById(initialHash)) scrollToId(initialHash);
				cleanUrl();
			}, 0);
		}

		on(document, 'click', function (e) {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
				return;
			}
			var link = e.target.closest('a[href]');
			if (!link || link.target === '_blank') return;

			var href = link.getAttribute('href');
			if (!href || !isSamePage(href)) return;

			var id = href.slice(href.indexOf('#') + 1);
			if (!id) return;
			if (scrollToId(id)) e.preventDefault();
		});
	}

	function initVersionChip() {
		var slots = qsa('[data-latest-version]');
		if (!slots.length) return;
		withReleases(function (releases) {
			var latest = UMContract.pickLatestStable(releases);
			if (!latest) return;
			slots.forEach(function (el) {
				el.textContent = latest.tag;
				el.classList.remove('is-loading');
			});
		});
	}

	function initChrome() {
		if (document.documentElement.classList.contains('booted')) return;
		document.documentElement.classList.add('js', 'booted');
		initAtmosphere();
		initAnchors();
		initHeader();
		initPageContext();
		initPreferences();
		humanizeLabels();
		initReveals();
		initScrollspy();
		initVersionChip();
		qsa('[data-year]').forEach(function (el) {
			el.textContent = String(new Date().getFullYear());
		});
	}

	return {
		initialHash: function () {
			return initialHash;
		},
		qs: qs,
		qsa: qsa,
		on: on,
		esc: esc,
		fileSize: fileSize,
		shortDate: shortDate,
		relativeDate: relativeDate,
		count: count,
		renderMarkdown: renderMarkdown,
		withReleases: withReleases,
		initChrome: initChrome
	};
})();

if (document.querySelector('.site-head') && typeof UM !== 'undefined') UM.initChrome();
