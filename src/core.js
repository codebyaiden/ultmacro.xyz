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
			.split(/(`[^`]+`)/)
			.map(function (part, index) {
				if (index % 2) return '<code>' + part.slice(1, -1) + '</code>';
				return part
					.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
					.replace(/__([^_]+)__/g, '<strong>$1</strong>')
					.replace(/~~([^~]+)~~/g, '<del>$1</del>')
					.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
					.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
					.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, label, href) {
						return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
					});
			})
			.join('');
	}

	var MD_BULLET = /^( *)([-*+])( +)(.*)$/;
	var MD_NUMBER = /^( *)(\d{1,9}[.)])( +)(.*)$/;
	var MD_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
	var MD_RULE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,}) *$/;
	var MD_HEADING = /^ {0,3}(#{1,6}) +(.*?) *#*$/;
	var MD_QUOTE = /^ {0,3}> ?(.*)$/;
	var MD_MAX_DEPTH = 6;

	function mdIndent(line) {
		return line.length - line.replace(/^ +/, '').length;
	}

	function mdBlockStart(line) {
		return MD_RULE.test(line) || MD_HEADING.test(line) || MD_FENCE.test(line) || MD_QUOTE.test(line);
	}

	function mdMarker(line) {
		var match = MD_BULLET.exec(line);
		var type = 'ul';
		if (!match) {
			match = MD_NUMBER.exec(line);
			type = 'ol';
		}
		if (!match) return null;
		return {
			type: type,
			indent: match[1].length,
			content: match[1].length + match[2].length + match[3].length,
			text: match[4]
		};
	}

	function mdList(lines, start, depth) {
		var opening = mdMarker(lines[start]);
		var type = opening.type;
		var base = opening.indent;
		var items = [];
		var i = start;

		while (i < lines.length) {
			var line = lines[i].replace(/\s+$/, '');
			var owner = items[items.length - 1];

			if (!line) {
				var ahead = i + 1;
				while (ahead < lines.length && !lines[ahead].trim()) ahead++;
				if (ahead >= lines.length) break;
				var nextLine = lines[ahead].replace(/\s+$/, '');
				var nextMarker = mdMarker(nextLine);
				var continues = nextMarker ? nextMarker.indent >= base : mdIndent(nextLine) > base;
				if (!continues) break;
				if (owner) owner.lines.push('');
				i = ahead;
				continue;
			}

			var marker = mdMarker(line);
			if (marker && marker.indent < base) break;

			if (marker && (!owner || marker.indent < owner.content)) {
				if (marker.type !== type) break;
				items.push({ content: marker.content, lines: [marker.text] });
				i++;
				continue;
			}

			if (!owner) break;
			if (mdIndent(line) < owner.content && mdBlockStart(line)) break;
			owner.lines.push(line.slice(Math.min(mdIndent(line), owner.content)));
			i++;
		}

		var html = '<' + type + '>';
		for (var k = 0; k < items.length; k++) {
			html += '<li>' + mdItem(items[k].lines, depth) + '</li>';
		}
		return { html: html + '</' + type + '>', next: i };
	}

	function mdItem(lines, depth) {
		return mdBlocks(lines, depth + 1).replace(/^<p>([\s\S]*?)<\/p>/, '$1');
	}

	function mdBlocks(lines, depth) {
		var out = [];
		var para = [];
		var i = 0;

		function flushPara() {
			if (para.length) {
				out.push('<p>' + inline(para.join(' ')) + '</p>');
				para = [];
			}
		}

		while (i < lines.length) {
			var line = lines[i].replace(/\s+$/, '');

			if (!line) {
				flushPara();
				i++;
				continue;
			}

			var fence = MD_FENCE.exec(line);
			if (fence) {
				flushPara();
				var buffer = [];
				i++;
				while (i < lines.length) {
					var end = MD_FENCE.exec(lines[i].replace(/\s+$/, ''));
					if (
						end &&
						end[1].charAt(0) === fence[1].charAt(0) &&
						end[1].length >= fence[1].length &&
						!end[2].trim()
					) {
						i++;
						break;
					}
					buffer.push(lines[i]);
					i++;
				}
				out.push('<pre><code>' + esc(buffer.join('\n')) + '</code></pre>');
				continue;
			}

			if (MD_RULE.test(line)) {
				flushPara();
				out.push('<hr>');
				i++;
				continue;
			}

			var heading = MD_HEADING.exec(line);
			if (heading) {
				flushPara();
				var level = Math.min(6, heading[1].length + 3);
				out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
				i++;
				continue;
			}

			if (MD_QUOTE.test(line)) {
				flushPara();
				var quoted = [];
				while (i < lines.length) {
					var current = lines[i].replace(/\s+$/, '');
					var quote = MD_QUOTE.exec(current);
					if (quote) {
						quoted.push(quote[1]);
						i++;
						continue;
					}
					if (!current) break;
					quoted.push(current.trim());
					i++;
				}
				out.push('<blockquote>' + mdBlocks(quoted, depth + 1) + '</blockquote>');
				continue;
			}

			if (mdMarker(line) && depth < MD_MAX_DEPTH) {
				flushPara();
				var list = mdList(lines, i, depth);
				out.push(list.html);
				i = list.next;
				continue;
			}

			para.push(line.trim());
			i++;
		}

		flushPara();
		return out.join('');
	}

	function renderMarkdown(source) {
		if (typeof source !== 'string' || !source.trim()) {
			return '<p class="md-empty">No release notes were published for this version.</p>';
		}

		var lines = source
			.replace(/\r\n?/g, '\n')
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
			.replace(/\t/g, '    ')
			.split('\n');

		return mdBlocks(lines, 0);
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
		if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
		target.focus({ preventScroll: true });
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
		document.documentElement.classList.add('js', 'booted');
		initAnchors();
		initHeader();
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