(function () {
	'use strict';
	const STRATEGY_NETWORK_ENABLED = true;

	const seed = Array.isArray(window.STRATEGY_NETWORK_SEED) ? window.STRATEGY_NETWORK_SEED : [];
	const tdsCatalog = window.TDS_STRATEGY_CATALOG || {};
	const fallbackModes = ['Easy', 'Casual', 'Intermediate', 'Molten', 'Fallen', 'Frost', 'Hidden Wave', 'Challenge Trials', 'Hardcore', 'Voidcore', 'Pizza Party', 'Badlands II', 'Polluted Wasteland II', 'Sandbox', 'Legacy Molten', 'Golden', 'Legacy Fallen', 'PvP', 'Versus', 'PvP Test', 'Story Mode', 'Tutorial', 'Arcade'];
	const catalogModes = tdsCatalog.modes?.length ? tdsCatalog.modes : fallbackModes;
	const catalogMaps = tdsCatalog.maps || [];
	const catalogTowers = tdsCatalog.towers || [];
	const mapArtwork = {
		'Dead Ahead': '../assets/strategy-maps/dead-ahead.webp',
		'Wretched Front': '../assets/strategy-maps/wretched-front.webp',
		'Crossroads': '../assets/strategy-maps/crossroads.webp',
		'Retro Crossroads': '../assets/strategy-maps/retro-crossroads.webp',
		'Cataclysm': '../assets/strategy-maps/cataclysm.webp',
		'Badlands II': '../assets/strategy-maps/badlands-ii.webp',
		'Dusty Bridges': '../assets/strategy-maps/dusty-bridges.webp',
		'Construction Crazy': '../assets/strategy-maps/construction-crazy.webp',
		'Polluted Wasteland II': '../assets/strategy-maps/polluted-wasteland-ii.webp',
		'Space City': '../assets/strategy-maps/space-city.webp',
		'Infernal Abyss': '../assets/strategy-maps/infernal-abyss.webp'
	};
	const validation = window.StrategyValidation;
	const api = window.StrategyNetworkApi;
	const sortLabels = { featured: 'Relevance', popular: 'Most popular', trending: 'Trending', newest: 'Newest', rating: 'Top rated' };
	const els = {
		browse: document.querySelector('#browse-view'), detail: document.querySelector('#detail-view'), publish: document.querySelector('#publish-view'),
		search: document.querySelector('#strategy-search'), sort: document.querySelector('#strategy-sort'), sortTrigger: document.querySelector('#strategy-sort-trigger'), sortMenu: document.querySelector('#strategy-sort-menu'), count: document.querySelector('#result-count'), backendStatus: document.querySelector('#backend-status'),
		filters: document.querySelector('#filters-panel'), filterToggle: document.querySelector('#filters-toggle'), active: document.querySelector('#active-filters'), map: document.querySelector('#filter-map'), mode: document.querySelector('#filter-mode'), tower: document.querySelector('#filter-tower'), noSkillTree: document.querySelector('#filter-no-skill-tree'), grind: document.querySelector('#grind-filter'), timescale: document.querySelector('#timescale-filter'), modal: document.querySelector('#network-modal'), modalContent: document.querySelector('#modal-content'), admin: document.querySelector('#admin-open')
	};
	const state = { query: '', map: '', mode: '', grind: '', timescale: '', tower: '', noSkillTree: false, sort: 'featured', view: 'browse', detail: null, publishFor: null, publishStep: 1, advancedOpen: false, verificationId: 0, serverReady: false, draft: {}, file: null, thumbnail: null, thumbnailPreviewUrl: '', parsed: null, installed: {}, ratings: {}, ratingBusy: {}, backend: 'loading', total: 0, admin: false, apiError: '' };
	let strategies = [];
	let searchTimer = null;
	let modalTrigger = null;
	let requestId = 0;
	let pickerId = 0;

	function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
	function number(value) { return Number(value || 0).toLocaleString('en-US'); }
	function date(value) { const raw = String(value || ''); const parsed = raw ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw) : null; return parsed && !Number.isNaN(parsed.getTime()) ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed) : '—'; }
	function username(value) { return String(value || '').trim().replace(/^@+/, '').toLowerCase(); }
	function latest(strategy) { return strategy.versions?.[0]?.version || '1.0'; }
	function versionCompare(left, right) { return String(left).localeCompare(String(right), undefined, { numeric: true }); }
	function ratingScore(strategy) { const count = Number(strategy.ratingCount || 0); return (Number(strategy.rating || 0) * count + 3 * 20) / (count + 20); }
	function safeUrl(value) { if (typeof value !== 'string' || !value.trim()) return ''; try { const url = new URL(value, window.location.href); return url.protocol === 'https:' || url.origin === window.location.origin ? url.href : ''; } catch (_) { return ''; } }

	function readUrlState() {
		const params = new URLSearchParams(window.location.search);
		state.query = params.get('q') || ''; state.map = params.get('map') || ''; state.mode = params.get('mode') || ''; state.grind = params.get('grind') || ''; state.timescale = params.get('timescale') || ''; state.tower = params.get('tower') || ''; state.noSkillTree = params.get('noSkillTree') === 'true'; state.sort = sortLabels[params.get('sort')] ? params.get('sort') : 'featured';
		state.publishFor = params.get('publish') && params.get('publish') !== '1' ? params.get('publish') : null;
		state.view = params.has('strategy') ? 'detail' : params.has('publish') ? 'publish' : 'browse';
		if (els.search) els.search.value = state.query;
	}

	function syncUrl(push = false) {
		const params = new URLSearchParams();
		if (state.view === 'detail' && state.detail) params.set('strategy', state.detail.slug);
		if (state.view === 'publish') params.set('publish', state.publishFor || '1');
		if (state.view === 'browse') {
			if (state.query) params.set('q', state.query); if (state.map) params.set('map', state.map); if (state.mode) params.set('mode', state.mode); if (state.grind) params.set('grind', state.grind); if (state.timescale) params.set('timescale', state.timescale); if (state.tower) params.set('tower', state.tower); if (state.noSkillTree) params.set('noSkillTree', 'true'); if (state.sort !== 'featured') params.set('sort', state.sort);
		}
		const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
		(push ? history.pushState : history.replaceState).call(history, {}, '', next);
	}

	function filtersForApi() { return { q: state.query, map: state.map, mode: state.mode, grind: state.grind, timescale: state.timescale, tower: state.tower, noSkillTree: state.noSkillTree, sort: state.sort, pageSize: 60 }; }
	function fallbackItems() {
		const query = state.query.trim().toLowerCase();
		const filtered = seed.filter((item) => { const haystack = [item.title, item.creator?.display, item.creator?.username, item.map, item.mode, ...(item.grind || []), ...(item.towers || [])].join(' ').toLowerCase(); return (!query || haystack.includes(query)) && (!state.map || item.map === state.map) && (!state.mode || item.mode === state.mode) && (!state.grind || item.grind?.includes(state.grind)) && (!state.timescale || item.timescale === state.timescale) && (!state.tower || item.towers?.includes(state.tower)) && (!state.noSkillTree || item.noSkillTree); });
		return filtered.sort((a, b) => state.sort === 'popular' ? Number(b.popularity) - Number(a.popularity) : state.sort === 'trending' ? Number(b.momentum) - Number(a.momentum) : state.sort === 'newest' ? String(b.updated).localeCompare(String(a.updated)) : state.sort === 'rating' ? ratingScore(b) - ratingScore(a) : Number(b.featured) - Number(a.featured) || Number(b.popularity) - Number(a.popularity));
	}
	function variantInfo(strategy) {
		const title = String(strategy.title || '').trim();
		const match = title.match(/^(.+?)\s*[·•:]\s*(.+)$/);
		return match ? { familyTitle: match[1].trim(), label: match[2].trim() } : { familyTitle: title, label: '' };
	}
	function groupStrategyVariants(items) {
		const groups = new Map();
		items.forEach((item) => {
			const info = variantInfo(item);
			const key = [item.creator?.username || item.creator?.display || '', item.map || '', item.mode || '', info.familyTitle].join('|').toLowerCase();
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push({ ...item, variantLabel: info.label });
		});
		return [...groups.values()].map((group) => {
			if (group.length < 2 || !group.every((item) => item.variantLabel)) return group[0];
			const primary = group[0];
			const family = { title: variantInfo(primary).familyTitle, variants: group.map((item) => ({ ...item })) };
			return { ...primary, title: family.title, family, installs: group.reduce((total, item) => total + Number(item.installs || 0), 0), summary: `${group.length} loadout variants for the same run.` };
		});
	}
	function strategyByIdentifier(identifier) {
		const direct = strategies.find((item) => item.slug === identifier || item.id === identifier);
		if (direct) return direct;
		for (const family of strategies) {
			const variant = family.family?.variants?.find((item) => item.slug === identifier || item.id === identifier);
			if (variant) return { ...variant, family: family.family };
		}
		const preview = groupStrategyVariants(seed).find((item) => item.slug === identifier || item.id === identifier);
		if (preview) return preview;
		for (const family of groupStrategyVariants(seed)) {
			const variant = family.family?.variants?.find((item) => item.slug === identifier || item.id === identifier);
			if (variant) return { ...variant, family: family.family };
		}
		return null;
	}
	function familyDetail(strategy) {
		const family = strategy.family;
		if (!family?.variants?.length) return strategy;
		const variant = family.variants.find((item) => item.id === strategy.id || item.slug === strategy.slug);
		return { ...strategy, title: family.title, family, variantLabel: variant?.variantLabel || '' };
	}

	function setBackendStatus() {
		if (!els.backendStatus) return;
		els.backendStatus.className = `backend-${state.backend}`;
		els.backendStatus.textContent = '';
	}

	function renderLoading() {
		els.count.textContent = 'Loading strategies…';
		els.browse.innerHTML = `<div class="strategy-grid loading-grid">${Array.from({ length: 6 }, () => '<div class="strategy-skeleton" aria-hidden="true"><span></span><div><b></b><i></i><i></i><em></em></div></div>').join('')}</div>`;
	}

	function renderUnavailable() {
		state.backend = 'unavailable';
		if (els.count) els.count.textContent = 'Temporarily unavailable';
		if (els.backendStatus) els.backendStatus.textContent = '';
		if (els.browse) els.browse.innerHTML = `<section class="network-unavailable" aria-labelledby="network-unavailable-title"><div class="network-unavailable-icon" aria-hidden="true">×</div><p class="kicker">Strategy Network</p><h2 id="network-unavailable-title">Temporarily unavailable</h2><p>We’re pausing the Strategy Network while the desktop connection is being finished. Your existing Ultimate Macro features are unchanged.</p><span class="network-unavailable-note">Please check back later.</span></section>`;
		[els.search, els.filterToggle, els.sortTrigger, document.querySelector('#publish-open'), els.admin].forEach((control) => { if (control) { control.disabled = true; control.setAttribute('aria-disabled', 'true'); } });
		if (els.filters) els.filters.hidden = true;
	}

	async function loadStrategies() {
		if (state.backend === 'preview') { strategies = groupStrategyVariants(fallbackItems()); state.total = strategies.length; renderFilters(); renderBrowse(); return; }
		const currentRequest = ++requestId;
		state.backend = 'loading'; state.apiError = ''; setBackendStatus(); if (!strategies.length) renderLoading();
		try {
			const result = await api.list(filtersForApi());
			if (currentRequest !== requestId) return;
			const rawItems = Array.isArray(result?.items) ? result.items : [];
			strategies = groupStrategyVariants(rawItems); state.total = strategies.length; state.backend = 'live';
		} catch (caught) {
			if (currentRequest !== requestId) return;
			strategies = groupStrategyVariants(fallbackItems()); state.total = strategies.length; state.backend = 'preview'; state.apiError = caught?.message || 'The server could not be reached.';
		}
		setBackendStatus(); renderFilters(); renderBrowse();
		if (state.view === 'detail') await openDetail(state.detail?.slug || new URLSearchParams(window.location.search).get('strategy'), false);
	}

	function activeFilters() { return [[state.map && 'Map', state.map], [state.mode && 'Mode', state.mode], [state.grind && 'Grind', state.grind], [state.timescale && 'Timescale', state.timescale], [state.tower && 'Tower', state.tower], [state.noSkillTree && 'Requirement', 'No Skill Tree']].filter((item) => item[0]); }
	function catalog() { return [...seed, ...strategies].reduce((items, item) => items.some((current) => current.map === item.map && current.mode === item.mode && current.title === item.title) ? items : items.concat(item), []); }
	function swapLabel(label, text) {
		if (!label || label.textContent === text) return;
		label.classList.remove('is-changing');
		void label.offsetWidth;
		label.textContent = text;
		label.classList.add('is-changing');
	}
	function finishAnimatedClose(menu, trigger, wrapper) {
		if (!menu.classList.contains('is-closing')) return;
		menu.hidden = true;
		menu.classList.remove('is-closing');
		if (wrapper) wrapper.classList.remove('is-open');
		if (trigger) trigger.setAttribute('aria-expanded', 'false');
	}
	function closeAnimatedMenu(menu, trigger, wrapper, focus = false) {
		if (!menu || menu.hidden) {
			if (wrapper) wrapper.classList.remove('is-open');
			if (trigger) trigger.setAttribute('aria-expanded', 'false');
			if (focus) trigger?.focus();
			return;
		}
		menu.classList.remove('is-opening');
		menu.classList.add('is-closing');
		const finish = () => { finishAnimatedClose(menu, trigger, wrapper); if (focus) trigger?.focus(); };
		menu.addEventListener('animationend', finish, { once: true });
		window.setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
	}

	function closeCustomMenus(except) {
		document.querySelectorAll('.custom-select.is-open').forEach((picker) => {
			if (picker !== except) {
				closeAnimatedMenu(picker.querySelector('.custom-select-menu'), picker.querySelector('.custom-select-trigger'), picker);
			}
		});
	}
	function syncCustomSelect(select) {
		const picker = select?._customPicker;
		if (!picker) return;
		const selected = [...select.options].find((option) => option.value === select.value) || select.options[0];
		swapLabel(picker.label, selected?.textContent || 'Choose an option');
		picker.menu.querySelectorAll('[role="option"]').forEach((option) => {
			const active = option.dataset.pickerValue === select.value;
			option.setAttribute('aria-selected', String(active));
			option.hidden = false;
		});
	}
	function decorateSelect(select) {
		if (!select) return;
		if (select._customPicker) { syncCustomSelect(select); return; }
		const wrapper = document.createElement('div');
		wrapper.className = 'custom-select';
		select.parentNode.insertBefore(wrapper, select);
		wrapper.append(select);
		select.classList.add('custom-select-native');
		select.tabIndex = -1;
		select.setAttribute('aria-hidden', 'true');
		const id = `${select.id || `custom-select-${++pickerId}`}-menu`;
		const trigger = document.createElement('button');
		trigger.type = 'button';
		trigger.className = 'custom-select-trigger';
		trigger.setAttribute('aria-haspopup', 'listbox');
		trigger.setAttribute('aria-expanded', 'false');
		trigger.setAttribute('aria-controls', id);
		trigger.innerHTML = '<span data-picker-label></span><span class="select-chevron" aria-hidden="true">⌄</span>';
		const menu = document.createElement('div');
		menu.id = id;
		menu.className = 'custom-select-menu';
		menu.setAttribute('role', 'listbox');
		menu.hidden = true;
		menu.setAttribute('aria-label', select.getAttribute('aria-label') || select.name || 'Choose an option');
		if (select.dataset.searchable === 'true') {
			const search = document.createElement('input');
			search.className = 'custom-select-search';
			search.type = 'search';
			search.placeholder = 'Search…';
			search.setAttribute('aria-label', 'Search options');
			search.addEventListener('input', () => {
				const query = search.value.trim().toLowerCase();
				menu.querySelectorAll('[role="option"]').forEach((option) => { option.hidden = query && !option.textContent.toLowerCase().includes(query); });
			});
			menu.append(search);
		}
		menu.insertAdjacentHTML('beforeend', [...select.options].map((option) => `<button type="button" role="option" data-picker-value="${esc(option.value)}" aria-selected="false">${esc(option.textContent)}</button>`).join(''));
		wrapper.append(trigger, menu);
		const picker = { wrapper, trigger, menu, label: trigger.querySelector('[data-picker-label]') };
		select._customPicker = picker;
		const open = () => {
			closeCustomMenus(wrapper);
			wrapper.classList.add('is-open');
			menu.classList.remove('is-closing');
			menu.hidden = false;
			trigger.setAttribute('aria-expanded', 'true');
			const search = menu.querySelector('.custom-select-search');
			if (search) { search.value = ''; search.dispatchEvent(new Event('input')); search.focus(); }
			else [...menu.querySelectorAll('[role="option"]')].find((option) => option.dataset.pickerValue === select.value)?.focus();
		};
		const close = (focus = false) => closeAnimatedMenu(menu, trigger, wrapper, focus);
		trigger.addEventListener('click', () => wrapper.classList.contains('is-open') ? close() : open());
		trigger.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); open(); } else if (event.key === 'ArrowDown') { event.preventDefault(); open(); } });
		menu.addEventListener('click', (event) => {
			const option = event.target.closest('[role="option"]');
			if (!option) return;
			select.value = option.dataset.pickerValue;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			close(true);
		});
		menu.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
			if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
			event.preventDefault();
			const options = [...menu.querySelectorAll('[role="option"]')].filter((option) => !option.hidden);
			const index = options.indexOf(document.activeElement);
			const next = event.key === 'ArrowDown' ? Math.min(options.length - 1, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : options.length - 1;
			options[next]?.focus();
		});
		select.addEventListener('change', () => syncCustomSelect(select));
		syncCustomSelect(select);
	}
	function decorateSelects(root) { root?.querySelectorAll('select:not(.sr-only)').forEach(decorateSelect); }

	function renderFilters() {
		const all = catalog();
		const maps = [...new Set([...catalogMaps, ...all.map((item) => item.map)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
		const towers = [...new Set([...catalogTowers, ...all.flatMap((item) => item.towers || [])].filter(Boolean))].sort((a, b) => a.localeCompare(b));
		els.map.innerHTML = '<option value="">Any map</option>' + maps.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
		els.mode.innerHTML = '<option value="">Any mode</option>' + catalogModes.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
		els.tower.innerHTML = '<option value="">Any tower</option>' + towers.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');
		els.map.dataset.searchable = 'true'; els.tower.dataset.searchable = 'true';
		els.map.value = state.map; els.mode.value = state.mode; els.tower.value = state.tower; els.noSkillTree.checked = state.noSkillTree; els.sort.value = state.sort;
		decorateSelect(els.map); decorateSelect(els.mode); decorateSelect(els.tower);
		swapLabel(els.sortTrigger.querySelector('[data-sort-label]'), sortLabels[state.sort]);
		els.sortMenu.querySelectorAll('[data-sort-option]').forEach((item) => item.setAttribute('aria-selected', String(item.dataset.sortOption === state.sort)));
		els.grind.querySelectorAll('button').forEach((item) => item.classList.toggle('selected', item.dataset.value === state.grind));
		els.timescale.querySelectorAll('button').forEach((item) => item.classList.toggle('selected', item.dataset.value === state.timescale));
		els.active.innerHTML = activeFilters().map(([label, value]) => `<button class="filter-chip" type="button" data-clear-filter="${esc(label)}">${esc(value)} <span aria-hidden="true">×</span></button>`).join('') + (activeFilters().length ? '<button class="text-button clear-inline" type="button" data-clear-all>Clear all</button>' : '');
	}

	function showView(view) { state.view = view; els.browse.hidden = view !== 'browse'; els.detail.hidden = view !== 'detail'; els.publish.hidden = view !== 'publish'; document.querySelector('.network-browse').hidden = view !== 'browse'; document.title = view === 'publish' ? 'Publish a strategy | Ultimate Macro' : 'Strategy Network | Ultimate Macro'; window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
	function showBrowse(push = true) { state.detail = null; showView('browse'); if (push) syncUrl(true); renderBrowse(); }
	function creatorMarkup(strategy) { return `<span class="creator"><b>${esc(strategy.creator?.display || 'Community creator')}</b> <small>@${esc(strategy.creator?.username || 'community')}</small>${strategy.creator?.verified ? '<span class="creator-trust">Verified creator</span>' : '<span class="creator-trust unverified">Unverified creator</span>'}</span>`; }
	function trustMarkup(strategy) { const labels = []; if (strategy.validated) labels.push(['validated', 'Validated']); if (strategy.communityTested) labels.push(['community-tested', 'Community Tested']); if (strategy.manuallyVerified || strategy.verified) labels.push(['admin-verified', 'Admin verified']); return labels.map(([kind, label]) => `<span class="trust trust-${kind}">${label}</span>`).join(''); }
	function coverHue(strategy) { return [...`${strategy.map || 'Map not selected'}/${strategy.mode || 'Mode not selected'}`].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 360, 0); }
	function previewImage(strategy) { const remote = safeUrl(strategy.thumbnailUrl); const local = typeof strategy.thumbnailPreviewUrl === 'string' && strategy.thumbnailPreviewUrl.startsWith('blob:') ? strategy.thumbnailPreviewUrl : ''; const fallback = mapArtwork[String(strategy.map || '').trim()] || ''; return remote || local || fallback; }
	function thumb(strategy, large = false) { const image = previewImage(strategy); const generated = !image && (!strategy.thumb || strategy.thumb === 'community' || strategy.thumb === 'default'); const coverClass = generated ? 'generated-cover' : (strategy.thumb || 'default'); const coverStyle = generated ? ` style="--cover-hue:${coverHue(strategy)}"` : ''; return `<div class="strategy-thumb ${esc(coverClass)} ${large ? 'large' : ''} ${image ? 'has-image' : ''}"${coverStyle} role="img" aria-label="${esc(strategy.map || 'Map not selected')} map artwork">${image ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" data-thumb-image>` : ''}<span>${esc(strategy.map || 'Map not selected')}</span><i aria-hidden="true"></i></div>`; }
	function installState(strategy) { const installed = state.installed[strategy.id]; if (!installed) return ''; return versionCompare(installed, latest(strategy)) < 0 ? '<span class="install-state update">Update available</span>' : '<span class="install-state">Installed</span>'; }
	function communityNotesMarkup(strategy) { const notes = [strategy.credits, strategy.performanceNotes].filter(Boolean); const source = safeUrl(strategy.sourceUrl); if (!notes.length && !source) return ''; return `<div class="detail-community-notes"><span class="detail-notes-label">Notes from the creator</span>${notes.map((note) => `<p>${esc(note)}</p>`).join('')}${source ? `<p><a class="text-button" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Open source reference ↗</a></p>` : ''}</div>`; }
	function adminMarkup(strategy) { if (!state.admin) return ''; const featureAction = strategy.featured ? 'unfeature' : 'feature'; const verifyAction = strategy.verified ? 'unverify' : 'verify'; return `<div class="admin-tools"><span>Admin</span><button type="button" data-admin-action="${featureAction}" data-admin-id="${esc(strategy.id)}">${strategy.featured ? 'Remove feature' : 'Feature'}</button><button type="button" data-admin-action="${verifyAction}" data-admin-id="${esc(strategy.id)}">${strategy.verified ? 'Remove verification' : 'Verify'}</button><button type="button" data-admin-action="hide" data-admin-id="${esc(strategy.id)}">Hide</button><button type="button" data-admin-ownership="${esc(strategy.id)}">Reset creator key</button></div>`; }

	function cardBody(strategy) { const variants = strategy.family?.variants || []; const variantLine = variants.length > 1 ? `<div class="card-variant-line"><span>${variants.length} loadout variants</span>${variants.slice(0, 4).map((item) => `<span>${esc(item.variantLabel || variantInfo(item).label)}</span>`).join('')}${variants.length > 4 ? `<span>+${variants.length - 4}</span>` : ''}</div>` : ''; return `<div class="card-media">${thumb(strategy)}${strategy.featured ? '<span class="featured-mark">Featured</span>' : ''}${installState(strategy)}</div><div class="card-body"><div class="card-title-row"><h3>${esc(strategy.title)}</h3><span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-trust">${trustMarkup(strategy)}</div>${creatorMarkup(strategy)}<p class="card-summary">${esc(strategy.summary)}</p>${variantLine}<div class="card-metric"><strong>${esc(strategy.metric || 'Not provided')}</strong><small>${esc(strategy.metricType || 'Creator reported')}</small></div><div class="card-meta"><span>★ ${Number(strategy.rating || 0).toFixed(1)} <small>(${number(strategy.ratingCount)})</small></span><span>${number(strategy.installs)} installs</span></div><div class="card-tags"><span>${esc(strategy.map)}</span><span>${esc(strategy.mode)}</span><span>${esc(strategy.timescale)}</span>${strategy.noSkillTree ? '<span>No Skill Tree</span>' : ''}</div></div>`; }
	function card(strategy) { return `<article class="strategy-card"><a class="strategy-card-link" href="?strategy=${encodeURIComponent(strategy.slug)}" data-open-strategy="${esc(strategy.slug)}">${cardBody(strategy)}</a>${adminMarkup(strategy)}</article>`; }
	function previewCard(strategy) { return `<article class="strategy-card strategy-card-preview" aria-label="Live strategy card preview">${cardBody(strategy)}</article>`; }
	function previewStrategy(data) { return { title: data.title || 'Untitled strategy', summary: data.description || 'Your short description will appear here.', map: data.map || 'Map not selected', mode: data.mode || 'Mode not selected', grind: data.grind ? [data.grind] : [], timescale: data.timescale || '1x', towers: String(data.towers || '').split(',').map((item) => item.trim()).filter(Boolean), noSkillTree: data.noSkillTree === true || data.noSkillTree === 'true', metric: data.expected || 'Not provided', metricType: 'Creator reported', rating: 0, ratingCount: 0, installs: 0, creator: { display: data.display || 'Your name', username: username(data.username) || 'username' }, thumbnailPreviewUrl: state.thumbnailPreviewUrl }; }
	function enhancePublishComposer() {
		const card = els.publish.querySelector('.publish-card:not(.publish-card-short)');
		if (!card) return;
		card.classList.add('publish-card-wide');
		const composer = document.createElement('div'); composer.className = 'publish-composer';
		const fields = document.createElement('div'); fields.className = 'publish-fields';
		const preview = document.createElement('aside'); preview.className = 'publish-preview-pane'; preview.innerHTML = '<div class="publish-preview-heading"><p class="kicker">Live preview</p><h3>What people will see</h3></div><div id="publish-preview" aria-live="polite"></div><p class="publish-preview-note">Updates from the details you enter. A generated map and mode cover appears until you add a thumbnail.</p>';
		while (card.firstChild) fields.append(card.firstChild);
		composer.append(fields, preview); card.append(composer);
		const target = preview.querySelector('#publish-preview');
		const update = () => { collectDraft(); target.innerHTML = previewCard(previewStrategy(publisherData())); };
		fields.querySelectorAll('input:not([type="file"]), select, textarea').forEach((control) => { control.addEventListener('input', update); control.addEventListener('change', update); });
		update();
	}
	function polishDetailsStep(existing) {
		const card = els.publish.querySelector('.publish-card-wide');
		if (!card) return;
		const heading = card.querySelector('.form-heading');
		if (heading) {
			heading.querySelector('.kicker').textContent = existing ? 'New version' : 'Details';
			heading.querySelector('h2').textContent = existing ? 'Update your strategy' : 'Tell people about your run';
			heading.querySelector('p:last-child').textContent = 'Add the few details people need. Everything else was read from your file.';
		}
		const labels = card.querySelectorAll('.publish-fields > .form-grid > label');
		if (labels[0]) labels[0].firstChild.textContent = 'Title';
		if (labels[1]) labels[1].firstChild.textContent = 'Short description';
		if (labels[2]) labels[2].firstChild.textContent = 'Display name';
		if (labels[3]?.querySelector('small')) labels[3].querySelector('small').textContent = 'Shown publicly as @username.';
		const detected = card.querySelector('.detected-summary');
		if (detected) {
			detected.querySelector('div:first-child b').textContent = 'From your file';
			detected.querySelector('div:first-child small').textContent = 'These details are checked again before publishing.';
		}
		const advanced = card.querySelector('.advanced-options summary');
		if (advanced) {
			advanced.querySelector('b').textContent = 'More details (optional)';
			advanced.querySelector('small').textContent = 'Earnings, requirements, notes, and thumbnail';
		}
		const keyNote = card.querySelector('.publish-fields > .form-note');
		if (keyNote) {
			keyNote.querySelector('b').textContent = existing ? 'Use your creator key to publish another version.' : 'A private creator key comes after publishing.';
			keyNote.querySelector('span').textContent = existing ? 'You will need it again for future updates.' : 'Save it somewhere safe. It will only be shown once.';
		}
		const previewHeading = card.querySelector('.publish-preview-heading');
		if (previewHeading) {
			previewHeading.querySelector('.kicker').textContent = 'Preview';
			previewHeading.querySelector('h3').textContent = 'This is what people will see';
		}
		const previewNote = card.querySelector('.publish-preview-note');
		if (previewNote) previewNote.textContent = 'Updates as you type. Add a thumbnail in More details if you have one.';
	}
	function renderBrowse() {
		const items = state.backend === 'live' ? strategies : groupStrategyVariants(fallbackItems());
		els.count.textContent = `${number(state.backend === 'live' ? state.total : items.length)} ${state.total === 1 || items.length === 1 ? 'strategy' : 'strategies'}`;
		if (!items.length) { els.browse.innerHTML = `<div class="empty-state"><span class="empty-mark">⌕</span><h2>No strategies found</h2><p>Try a different search or clear one of the filters. New community strategies appear here after server validation.</p><button class="btn" data-clear-all type="button">Clear search and filters</button></div>`; return; }
		els.browse.innerHTML = `<div class="strategy-grid">${items.map(card).join('')}</div>`;
	}

	function variantMarkup(strategy) { const variants = strategy.family?.variants || []; if (variants.length < 2) return ''; return `<section class="detail-variants"><div class="section-row"><div><p class="kicker">Loadouts</p><h2>Choose a variant</h2></div><span class="variant-count">${variants.length} versions</span></div><div class="variant-picker">${variants.map((item) => `<button type="button" class="variant-option ${item.id === strategy.id ? 'selected' : ''}" data-open-variant="${esc(item.slug || item.id)}"><b>${esc(item.variantLabel || variantInfo(item).label || 'Loadout')}</b><small>${esc((item.towers || []).join(', ') || 'Requirements vary')}</small></button>`).join('')}</div></section>`; }
	async function openDetail(identifier, push = true) {
		let strategy = strategyByIdentifier(identifier);
		if (!strategy) { showBrowse(false); syncUrl(); return; }
		strategy = familyDetail(strategy); showView('detail'); state.detail = strategy; if (push) syncUrl(true); renderDetail(strategy);
		if (state.backend === 'live') {
			try { const detailed = await api.detail(strategy.id); if (detailed) { const enriched = familyDetail({ ...detailed, family: strategy.family }); state.detail = enriched; strategies = strategies.map((item) => item.id === detailed.id ? { ...item, ...enriched } : item); renderDetail(enriched); } } catch (_) { /* list data remains usable */ }
		}
	}

	function renderDetailBase(strategy) {
		document.title = `${strategy.title} | Strategy Network | Ultimate Macro`;
		const versions = strategy.versions || [];
		const rated = state.ratings[strategy.id] || 0;
		els.detail.innerHTML = `<button class="back-link" type="button" data-back>← Back to strategies</button><div class="detail-head"><div class="detail-visual">${thumb(strategy, true)}</div><div class="detail-head-copy"><div class="detail-flags">${strategy.featured ? '<span class="featured-mark">Featured by Ultimate Macro</span>' : ''}${trustMarkup(strategy)}</div><p class="kicker">${esc(strategy.map)} <b>/</b> ${esc(strategy.mode)}</p><h1>${esc(strategy.title)}</h1>${creatorMarkup(strategy)}<p class="detail-summary">${esc(strategy.summary)}</p><div class="detail-stats"><span><b>★ ${Number(strategy.rating || 0).toFixed(1)}</b><small>${number(strategy.ratingCount)} ratings</small></span><span><b>${number(strategy.installs)}</b><small>installs</small></span><span><b>${esc(strategy.metric || 'Not provided')}</b><small>${esc(strategy.metricType || 'Creator reported')}</small></span></div><div class="detail-actions"><button class="btn primary" type="button" data-install="${esc(strategy.id)}">Add to Ultimate Macro <span aria-hidden="true">↗</span></button><button class="btn" type="button" data-report="${esc(strategy.id)}">Report</button></div>${installState(strategy) ? `<p class="detail-install-note">${installState(strategy)} · status supplied by the Ultimate Macro desktop integration.</p>` : ''}${state.admin ? adminMarkup(strategy) : ''}</div></div><div class="detail-layout"><article class="detail-main"><section><p class="kicker">Overview</p><h2>What this run does</h2><p>${esc(strategy.description)}</p></section><section><p class="kicker">Requirements</p><h2>Before you start</h2><dl class="detail-specs"><div><dt>Map</dt><dd>${esc(strategy.map)}</dd></div><div><dt>Mode</dt><dd>${esc(strategy.mode)}</dd></div><div><dt>Grind</dt><dd>${(strategy.grind || []).map(esc).join(', ')}</dd></div><div><dt>Timescale</dt><dd>${esc(strategy.timescale)}</dd></div><div><dt>Skill Tree</dt><dd>${strategy.noSkillTree ? 'Not required' : 'Required or recommended'}</dd></div><div><dt>Towers</dt><dd>${(strategy.towers || []).map(esc).join(', ')}</dd></div><div><dt>Modifiers</dt><dd>${(strategy.modifiers || []).map(esc).join(', ') || 'None listed'}</dd></div></dl></section>${communityNotesMarkup(strategy)}<section><div class="section-row"><div><p class="kicker">Versions</p><h2>Release history</h2></div><button class="text-button" type="button" data-new-version="${esc(strategy.slug)}">Publish new version</button></div><div class="version-list">${versions.length ? versions.map((version, index) => `<div class="version-row"><div><b>v${esc(version.version)}</b>${index === 0 ? '<span class="latest-label">latest</span>' : ''}<small>${esc(version.compatible)} · ${date(version.date)}</small></div><p>${esc(version.notes || 'No release notes.')}</p><div class="version-actions"><button class="btn sm" type="button" data-install-version="${esc(strategy.id)}" data-version="${esc(version.version)}">Add version</button>${state.admin ? `<button class="text-button" type="button" data-admin-version-action="hide" data-admin-strategy="${esc(strategy.id)}" data-admin-version="${esc(version.id)}">Hide version</button>` : ''}</div></div>`).join('') : '<p class="muted">Release metadata is being prepared.</p>'}</div></section></article><aside class="detail-side"><div class="side-card"><p class="kicker">Rate this strategy</p><h3>How was your run?</h3><div class="rating-control" role="group" aria-label="Rate ${esc(strategy.title)}">${[1, 2, 3, 4, 5].map((value) => `<button type="button" data-rate="${value}" aria-label="${value} out of 5 stars" class="${rated === value ? 'selected' : ''}">${value <= rated ? '★' : '☆'}</button>`).join('')}</div><small class="side-note">${state.backend === 'live' ? 'One rating per strategy from this browser. You can change it later.' : 'Preview data only. Ratings are enabled after the server is connected.'}</small></div><div class="side-card"><p class="kicker">Strategy health</p><div class="health-row"><span class="health-dot"></span><b>${esc(strategy.manuallyVerified || strategy.verified ? 'Admin verified' : strategy.communityTested ? 'Community Tested' : strategy.validated ? 'Validated' : 'Not reviewed')}</b></div><p>Validated, community-tested, and admin verification are separate signals. Featured is curated independently.</p><small>Updated ${date(strategy.updated)}</small></div></aside></div>`;
	}
	function decorateDetail(strategy) {
		const main = els.detail.querySelector('.detail-main');
		const overview = main?.querySelector('section');
		if (overview && strategy.family?.variants?.length > 1) overview.insertAdjacentHTML('beforebegin', variantMarkup(strategy));
		const heading = els.detail.querySelector('.detail-head-copy h1');
		if (heading && strategy.variantLabel) heading.insertAdjacentHTML('beforeend', `<span class="detail-variant-label">${esc(strategy.variantLabel)}</span>`);
	}
	function renderDetail(strategy) { renderDetailBase(strategy); decorateDetail(strategy); }

	function collectDraft() {
		const form = els.publish.querySelector('form'); if (!form) return;
		new FormData(form).forEach((value, key) => { if (key !== 'strategyFile' && key !== 'thumbnail') state.draft[key] = value; });
		state.draft.noSkillTree = form.elements.noSkillTree?.checked ? 'true' : '';
		const file = form.elements.strategyFile?.files?.[0]; if (file) state.file = file;
		const thumbnail = form.elements.thumbnail?.files?.[0]; if (thumbnail) state.thumbnail = thumbnail;
	}
	function publisherLabel() { return state.publishFor ? 'Publish a new version' : 'Publish a strategy'; }
	function publisherData() {
		const existing = state.publishFor ? strategyByIdentifier(state.publishFor) : null;
		return { title: existing?.title || '', description: existing?.summary || '', display: existing?.creator?.display || '', username: existing?.creator?.username || '', map: existing?.map || '', mode: existing?.mode || 'Easy', grind: existing?.grind?.[0] || 'Coins', timescale: existing?.timescale || '1x', towers: existing?.towers?.join(', ') || '', expected: existing?.metric || '', compatible: existing?.versions?.[0]?.compatible || '', changelog: '', creatorKey: '', ...state.draft };
	}
	function replaceThumbnail(file) { if (state.thumbnailPreviewUrl) URL.revokeObjectURL(state.thumbnailPreviewUrl); state.thumbnail = file; state.thumbnailPreviewUrl = file ? URL.createObjectURL(file) : ''; }
	function clearThumbnailPreview() { if (state.thumbnailPreviewUrl) URL.revokeObjectURL(state.thumbnailPreviewUrl); state.thumbnailPreviewUrl = ''; }
	function inputValue(data, key) { return esc(data[key] || ''); }
	function validationMarkup() {
		if (!state.file) return '';
		if (!state.parsed) return '<p class="muted">Reading file…</p>';
		return state.parsed.ok ? `<div class="validation-good"><span class="health-dot"></span><b>File looks good</b><small>${number(state.parsed.commands.length)} supported steps · ${esc(state.parsed.metadata.map || 'map detected')} · ${esc(state.parsed.metadata.mode || 'mode detected')}</small></div>${state.parsed.warnings.map((item) => `<p class="validation-warning">${esc(item)}</p>`).join('')}` : `<div class="validation-bad"><b>Needs correction</b>${state.parsed.errors.slice(0, 6).map((item) => `<small>${esc(item)}</small>`).join('')}${state.parsed.errors.length > 6 ? `<small>+${state.parsed.errors.length - 6} more issues</small>` : ''}</div>`;
	}

	function renderCheck(label, status, detail) { return `<div class="verification-check ${esc(status)}"><span class="check-icon" aria-hidden="true">${status === 'complete' ? '✓' : status === 'failed' ? '!' : '•'}</span><span><b>${esc(label)}</b><small>${esc(detail)}</small></span><strong>${status === 'complete' ? 'Ready' : status === 'failed' ? 'Needs attention' : 'Review'}</strong></div>`; }
	function renderAdvancedOptions(d, existing) {
		return `<details class="advanced-options" id="advanced-options" ${state.advancedOpen ? 'open' : ''}><summary><span><b>Advanced options</b><small>Requirements, compatibility and extra notes</small></span><span class="advanced-chevron" aria-hidden="true">⌄</span></summary><div class="advanced-fields"><div class="form-grid"><label>Grind type<select name="grind"><option ${d.grind === 'Coins' ? 'selected' : ''}>Coins</option><option ${d.grind === 'Gems' ? 'selected' : ''}>Gems</option><option ${d.grind === 'XP' ? 'selected' : ''}>XP</option></select></label><label>Timescale<select name="timescale"><option ${d.timescale === '1x' ? 'selected' : ''}>1x</option><option ${d.timescale === '1.5x' ? 'selected' : ''}>1.5x</option><option ${d.timescale === '2x' ? 'selected' : ''}>2x</option></select></label><label>Required towers<input name="towers" value="${inputValue(d, 'towers')}" placeholder="Farm, Commander, DJ"><small>Optional. Use commas between tower names.</small></label><label>Expected performance<input name="expected" value="${inputValue(d, 'expected')}" placeholder="8.5k coins/h"><small>A creator-reported estimate, not a guarantee.</small></label><label>Compatible Macro versions<input name="compatible" value="${inputValue(d, 'compatible')}" placeholder="e.g. 1.3.4+"><small>Leave blank if you are unsure.</small></label><label class="check-input"><input name="noSkillTree" type="checkbox" ${d.noSkillTree ? 'checked' : ''}><span>No Skill Tree required</span></label><label class="full-field">${existing ? 'Version notes' : 'Notes for players'}<textarea name="changelog" maxlength="500" placeholder="Anything players should know before they start?">${inputValue(d, 'changelog')}</textarea></label></div><div class="upload-zone thumbnail-zone"><input id="thumbnail-file" name="thumbnail" type="file" accept="image/png,image/jpeg,image/webp"><label for="thumbnail-file"><span class="upload-icon">＋</span><b>${state.thumbnail ? esc(state.thumbnail.name) : 'Add a thumbnail (optional)'}</b><small>PNG, JPEG, or WebP · max 2 MB</small></label></div></div></details>`;
	}

	function renderPublisher() {
		const d = publisherData(); const existing = Boolean(state.publishFor); const step = state.publishStep;
		const progress = `<div class="publish-progress" aria-label="Publishing progress"><span class="${step >= 1 ? 'active' : ''}">01 Upload</span><span class="${step >= 2 ? 'active' : ''}">02 Details</span><span class="${step >= 3 ? 'active' : ''}">03 Review</span></div>`;
		let content = '';
		if (step === 1) content = `<div class="publish-card"><div class="form-heading"><p class="kicker">Start with the file</p><h2>Upload your .strat</h2><p>We’ll read the strategy first and fill in the map, mode, towers, timescale, modifiers, and other safe metadata automatically.</p></div><div class="upload-zone upload-zone-primary"><input id="strategy-file" name="strategyFile" type="file" accept=".strat,text/plain" required><label for="strategy-file"><span class="upload-icon">↑</span><b>${state.file ? esc(state.file.name) : 'Choose your .strat file'}</b><small>${state.file ? `${number(state.file.size)} bytes ready to check` : 'Drop it here or browse · max 2 MB'}</small></label><div id="validation-result" class="validation-result" aria-live="polite">${validationMarkup()}</div></div><div class="form-note"><b>Nothing is published yet.</b><span>After the file is checked, you’ll only fill in the details it cannot safely detect.</span></div><div class="publish-actions"><button class="btn" type="button" data-back>← Back</button><button class="btn primary" type="button" data-publish-next ${state.parsed?.ok ? '' : 'disabled'}>Continue to details <span aria-hidden="true">→</span></button></div></div>`;
		if (step === 2) content = `<div class="publish-card"><div class="form-heading"><p class="kicker">A few final details</p><h2>Make it easy to find</h2><p>Detected requirements are already filled in. Add only the human context players need.</p></div><div class="form-grid"><label>Strategy name<input name="title" value="${inputValue(d, 'title')}" required maxlength="80" placeholder="e.g. Bread Toaster"></label><label>Short description<input name="description" value="${inputValue(d, 'description')}" required maxlength="160" placeholder="What does this run help with?"></label><label>Name<input name="display" value="${inputValue(d, 'display')}" required maxlength="40" placeholder="Your display name"></label><label>Username<input name="username" value="${inputValue(d, 'username')}" required maxlength="30" placeholder="your-name"><small>Shown as an unverified @username until ownership is verified.</small></label></div><div class="detected-summary"><div><b>Detected from your file</b><small>These values are checked again on the server.</small></div><div class="detected-summary-grid"><span><small>Map</small><b>${esc(d.map || 'Not detected')}</b></span><span><small>Mode</small><b>${esc(d.mode || 'Not detected')}</b></span><span><small>Towers</small><b>${esc(d.towers || 'Not detected')}</b></span><span><small>Timescale</small><b>${esc(d.timescale || 'Not detected')}</b></span><span><small>Modifiers</small><b>${esc(state.parsed?.metadata?.modifiers || 'None detected')}</b></span></div><input type="hidden" name="map" value="${inputValue(d, 'map')}"><input type="hidden" name="mode" value="${inputValue(d, 'mode')}"><input type="hidden" name="timescale" value="${inputValue(d, 'timescale')}"><input type="hidden" name="towers" value="${inputValue(d, 'towers')}"><input type="hidden" name="modifiers" value="${esc(state.parsed?.metadata?.modifiers || '')}"></div>${existing ? `<label class="modal-field">Creator management key<input name="creatorKey" type="password" required autocomplete="off" placeholder="Paste the key saved after your first release"><small>Used only to publish another immutable version.</small></label>` : '<div class="form-note"><b>A one-time creator key appears after publishing.</b><span>Save it privately. It is the normal way to publish future versions.</span></div>'}${renderAdvancedOptions(d, existing)}<div class="publish-actions"><button class="btn" type="button" data-publish-back>← Back</button><button class="btn primary" type="button" data-publish-next>Review strategy <span aria-hidden="true">→</span></button></div></div>`;
		if (step === 3) {
			const parsed = state.parsed;
			const towerStatus = parsed?.metadata?.towerStatus === 'recognized' ? ['complete', 'Tower requirements', 'Required towers are recognized'] : parsed?.metadata?.towerStatus === 'review' ? ['review', 'Tower requirements', 'A few names will be checked by moderation'] : ['review', 'Tower requirements', 'No tower list was provided'];
			const serverStatus = state.serverReady ? ['complete', 'Publish service', 'Connected and ready'] : ['failed', 'Publish service', 'Connect the publish service before sending'];
			content = `<div class="publish-card review-card"><div class="form-heading"><h2>Here’s what will be shared</h2><p>We’ll check the file, confirm its requirements, and send one immutable release to the Strategy Network.</p></div><div class="post-summary-card"><div class="post-summary-top"><span class="health-dot"></span><span>Community strategy</span><small>First release · immutable</small></div><strong>${inputValue(d, 'title') || 'Untitled strategy'}</strong><p>${inputValue(d, 'description') || 'No description added yet.'}</p><div class="post-summary-meta"><span>${inputValue(d, 'map') || 'Map not selected'}</span><span>${inputValue(d, 'mode') || 'Mode not selected'}</span><span>${inputValue(d, 'timescale') || '1x'}</span></div><div class="post-summary-includes"><span>Includes</span><span>Validated .strat file</span><span>Requirements</span><span>Creator credit</span></div></div><div class="verification-checklist"><div class="checklist-heading"><b>Before we publish</b><small>These checks protect the library from broken uploads.</small></div>${renderCheck('File structure', parsed?.ok ? 'complete' : 'failed', parsed?.ok ? `${number(parsed.commands.length)} supported steps found` : 'Fix the file issues before continuing')}${renderCheck(towerStatus[1], towerStatus[0] === 'review' ? 'review' : 'complete', towerStatus[2])}${renderCheck('Publish service', serverStatus[0], serverStatus[1])}${renderCheck('Community post', parsed?.ok && state.serverReady ? 'complete' : 'review', parsed?.ok && state.serverReady ? 'Ready after the checks above' : 'Waiting for the final checks')}</div><p class="review-footnote">Publishing makes this version immutable. Later changes become a new version. Metrics stay labelled as creator reported.</p><div class="publish-actions"><button class="btn" type="button" data-publish-back>← Back</button><button class="btn primary" type="submit" ${parsed?.ok && state.serverReady ? '' : 'disabled'}>${state.serverReady ? 'Check and publish' : 'Publish unavailable'} <span aria-hidden="true">↗</span></button></div></div>`;
		}
		els.publish.innerHTML = `<button class="back-link" type="button" data-back>← Back to strategies</button><div class="publisher-head"><p class="kicker">Community publishing</p><h1>${esc(publisherLabel())}</h1><p>Share a strategy with the community. Upload the file first, then add the few details it cannot know.</p></div>${progress}<form id="publisher-form" novalidate>${content}</form>`;
		decorateSelects(els.publish); if (step === 2) { enhancePublishComposer(); polishDetailsStep(existing); }
		const file = document.querySelector('#strategy-file'); file?.addEventListener('change', async () => { collectDraft(); state.file = file.files?.[0] || null; await validateUpload(); });
		const thumbnail = document.querySelector('#thumbnail-file'); thumbnail?.addEventListener('change', () => { collectDraft(); replaceThumbnail(thumbnail.files?.[0] || null); renderPublisher(); });
		document.querySelector('#advanced-options')?.addEventListener('toggle', (event) => { state.advancedOpen = event.target.open; });
	}

	async function validateUpload() {
		if (!state.file) { state.parsed = null; renderPublisher(); return; }
		if (!/\.strat$/i.test(state.file.name) || state.file.size > validation.MAX_BYTES) state.parsed = { ok: false, errors: ['Choose a .strat file smaller than 2 MB.'], warnings: [] };
		else {
			try {
				state.parsed = validation.parseStrategy(await state.file.text());
				if (state.parsed.ok) {
					const detected = state.parsed.metadata || {};
					if (!state.draft.title && detected.title) state.draft.title = detected.title;
					if (!state.draft.description && detected.description) state.draft.description = detected.description;
					if (!state.draft.map && detected.map) state.draft.map = detected.map;
					if (!state.draft.mode && detected.mode) state.draft.mode = detected.mode;
					if (!state.draft.towers && detected.requiredTowers?.length) state.draft.towers = detected.requiredTowers.join(', ');
					if (!state.draft.timescale && detected.timescale) state.draft.timescale = detected.timescale.toUpperCase() === 'OFF' ? '1x' : detected.timescale;
				}
			} catch (_) { state.parsed = { ok: false, errors: ['The file could not be read as UTF-8 text.'], warnings: [] }; }
		}
		renderPublisher();
	}
	function creatorError(form) { const display = form?.elements.display?.value.trim(); const name = username(form?.elements.username?.value); if (!display || display.length < 2) return 'Add a display name with at least 2 characters.'; if (!/^[a-z0-9][a-z0-9._-]{1,29}$/i.test(name)) return 'Use a username with letters, numbers, dots, underscores or hyphens.'; if (state.publishFor && !form.elements.creatorKey?.value.trim()) return 'Enter the creator management key for this strategy.'; return ''; }
	function formError(title, message) { openModal(`<p class="kicker">Check this form</p><h2 id="modal-title">${esc(title)}</h2><p>${esc(message)}</p><button class="btn primary" type="button" data-modal-close>Go back</button>`); }

	const verificationStages = [
		['File structure', 'Reading the strategy file'],
		['Tower references', 'Checking tower requirements'],
		['Publish service', 'Checking the publish service'],
		['Community post', 'Preparing the community post'],
		['Final checks', 'Making sure everything is ready']
	];
	function verificationMarkup(statuses, message = '') {
		const complete = statuses.filter((status) => status === 'complete').length;
		const active = statuses.filter((status) => status === 'active').length;
		const width = Math.round(((complete + active * .45) / verificationStages.length) * 100);
		return `<div class="verification-modal"><span class="verification-spinner" aria-hidden="true"></span><p class="kicker">Final checks</p><h2 id="modal-title">We’re checking your strategy</h2><p>We’ll make sure the file is usable, the tower requirements make sense, and the server is ready to publish it.</p><p class="verification-time">Usually just a few seconds.</p><div class="verification-progress" aria-hidden="true"><span style="width:${width}%"></span></div><div class="verification-steps">${verificationStages.map(([label, detail], index) => { const status = statuses[index] || 'pending'; const statusText = status === 'complete' ? 'Ready' : status === 'active' ? detail : status === 'failed' ? (message || 'Needs attention') : 'Waiting'; return `<div class="verification-step ${status}"><span class="check-icon" aria-hidden="true">${status === 'complete' ? '✓' : status === 'failed' ? '!' : status === 'active' ? '•' : ''}</span><span><b>${esc(label)}</b><small>${esc(statusText)}</small></span></div>`; }).join('')}</div><button class="btn" type="button" data-modal-close>Cancel</button></div>`;
	}
	function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
	function buildPublishForm() {
		const d = state.draft; const form = new FormData();
		['display', 'username', 'title', 'description', 'map', 'mode', 'grind', 'timescale', 'towers', 'expected', 'compatible', 'changelog', 'creatorKey'].forEach((key) => form.append(key, d[key] || ''));
		form.append('noSkillTree', d.noSkillTree ? 'true' : 'false'); form.append('strategyFile', state.file, state.file.name); if (state.thumbnail) form.append('thumbnail', state.thumbnail, state.thumbnail.name);
		return form;
	}
	async function publishToServer() {
		try {
			const result = await api.publish(buildPublishForm(), state.publishFor ? strategyByIdentifier(state.publishFor)?.id || state.publishFor : null);
			const title = state.publishFor ? 'New version published' : 'Strategy published';
			const keyNotice = result.creatorKey ? `<div class="key-notice"><p>Save this one-time creator key now. It cannot be recovered later.</p><div class="key-row"><code class="key-display">${esc(result.creatorKey)}</code><button class="btn sm" type="button" data-copy-key="${esc(result.creatorKey)}">Copy key</button></div><small id="creator-key-status">Keep it private. You’ll need it to publish future versions.</small></div>` : '<p>Your new immutable version is ready for moderation and discovery.</p>';
			const locationNotice = `<div class="publish-location-note"><b>Where your file went</b><span>Your <code>.strat</code> file is stored in Strategy Network release storage and attached to this immutable version. It is not copied into your computer automatically. When someone chooses <b>Add to Ultimate Macro</b>, the desktop app downloads it, checks it again, and saves it in My Strats.</span></div>`;
			if (result.strategy) strategies = [...strategies.filter((item) => item.id !== result.strategy.id), result.strategy];
			state.publishStep = 1; state.publishFor = null; state.draft = {}; state.file = null; clearThumbnailPreview(); state.thumbnail = null; state.parsed = null; state.serverReady = false;
			openModal(`<p class="kicker">${result.pendingDuplicate ? 'Needs review' : 'Published'}</p><h2 id="modal-title">${esc(title)}</h2>${result.pendingDuplicate ? '<p>This release is similar to an existing strategy, so it is waiting for admin review before it appears in discovery.</p>' : ''}${keyNotice}${locationNotice}<button class="btn primary" type="button" data-close-and-browse>Return to Strategy Network</button>`); state.view = 'browse'; syncUrl(); renderBrowse();
		} catch (caught) { openModal(`<p class="kicker">Could not publish</p><h2 id="modal-title">The server declined this release</h2><p>${esc(caught?.message || 'Try again after checking the file and server connection.')}</p><button class="btn primary" type="button" data-modal-close>Go back</button>`); }
	}
	async function runPublishVerification() {
		const token = ++state.verificationId;
		const statuses = verificationStages.map(() => 'pending');
		const update = () => { if (token === state.verificationId) els.modalContent.innerHTML = verificationMarkup(statuses); };
		openModal(verificationMarkup(statuses));
		for (let index = 0; index < verificationStages.length; index += 1) {
			statuses[index] = 'active'; update(); await delay(180);
			if (token !== state.verificationId) return;
			if (index === 0 && !state.parsed?.ok) { statuses[index] = 'failed'; els.modalContent.innerHTML = verificationMarkup(statuses, 'Fix the file issues first.'); return; }
			if (index === 1 && state.parsed?.metadata?.towerStatus === 'review') { statuses[index] = 'failed'; els.modalContent.innerHTML = verificationMarkup(statuses, 'Some tower names need review before publishing.'); return; }
			if (index === 2) {
				try { const result = await api.health(); if (!result?.ok || !result.configured) throw new Error('The publish service is not configured yet.'); state.serverReady = true; }
				catch (_) { statuses[index] = 'failed'; state.serverReady = false; els.modalContent.innerHTML = verificationMarkup(statuses, 'The publish service is unavailable.'); return; }
			}
			statuses[index] = 'complete'; update();
		}
		if (token === state.verificationId) await publishToServer();
	}
	async function publishStrategy() {
		if (state.backend !== 'live' || !state.serverReady) { formError('Publish service unavailable', 'The Strategy Network server is not ready, so nothing was saved. Try again when the publish service is connected.'); return; }
		if (!state.file || !state.parsed?.ok) { formError('Valid file required', 'Upload a valid .strat file before publishing.'); return; }
		await runPublishVerification();
	}

	function openModal(content, trigger = document.activeElement) { modalTrigger = trigger; els.modalContent.innerHTML = content; decorateSelects(els.modalContent); els.modal.hidden = false; document.body.classList.add('modal-open'); els.modal.querySelector('.custom-select-trigger, input, textarea, button:not(.modal-close), a')?.focus(); }
	function closeModal() { state.verificationId += 1; els.modal.hidden = true; els.modalContent.innerHTML = ''; document.body.classList.remove('modal-open'); modalTrigger?.focus?.(); modalTrigger = null; }
	function openInstall(strategyId, selectedVersion) {
		const strategy = strategies.find((item) => item.id === strategyId) || seed.find((item) => item.id === strategyId); if (!strategy) return;
		const selected = selectedVersion || latest(strategy); const version = (strategy.versions || []).find((item) => item.version === selected) || strategy.versions?.[0];
		if (!version) { openModal('<p class="kicker">Desktop handoff</p><h2 id="modal-title">Release not ready</h2><p>This strategy has no immutable release attached yet.</p><button class="btn primary" type="button" data-modal-close>Done</button>'); return; }
		const download = safeUrl(version.contentUrl);
		openModal(`<p class="kicker">Coming in v1.4</p><h2 id="modal-title">Add ${esc(strategy.title)}</h2><p>One-click installs are coming in Ultimate Macro v1.4. For now, download the <code>.strat</code> file and open it from your My Strats folder.</p><label class="modal-field">Strategy version<select id="install-version">${(strategy.versions || []).map((item) => `<option value="${esc(item.version)}" ${item.version === selected ? 'selected' : ''}>v${esc(item.version)} · ${esc(item.compatible)}</option>`).join('')}</select></label><div class="install-callout"><b>Manual download for now</b><span>${download ? 'This release is ready. Download the file below and import it into Ultimate Macro manually.' : 'This release has no attached .strat file yet. Please try another version.'}</span></div><div class="modal-actions"><button class="btn" type="button" data-modal-close>Cancel</button>${download ? `<a class="btn primary" id="download-strategy-link" download href="${download}">Download .strat <span aria-hidden="true">↓</span></a>` : ''}</div><p id="install-status" class="modal-status">${download ? 'The desktop connection will be available in v1.4. Manual download is available now.' : 'Ask an admin to attach the immutable .strat file before downloading.'}</p>`);
		document.querySelector('#install-version')?.addEventListener('change', (event) => { const selectedRelease = (strategy.versions || []).find((item) => item.version === event.target.value); const downloadTarget = document.querySelector('#download-strategy-link'); const selectedDownload = safeUrl(selectedRelease?.contentUrl); if (downloadTarget) { downloadTarget.href = selectedDownload || '#'; downloadTarget.hidden = !selectedDownload; } });
	}

	function openReport(strategyId) {
		const strategy = strategies.find((item) => item.id === strategyId) || seed.find((item) => item.id === strategyId); if (!strategy) return;
		openModal(`<p class="kicker">Community moderation</p><h2 id="modal-title">Report ${esc(strategy.title)}</h2><p>Reports help admins remove broken, misleading, outdated, or copied releases.</p><form id="report-form"><label class="modal-field">Reason<select name="reason"><option value="does_not_work">Does not work</option><option value="misleading_metric">Misleading metric</option><option value="outdated">Outdated</option><option value="malicious">Troll or malicious</option><option value="copied">Copied strategy</option><option value="wrong_requirements">Wrong requirements</option><option value="other">Other</option></select></label><label class="modal-field">Details<textarea name="details" maxlength="500" placeholder="What did you observe?"></textarea></label><div class="modal-actions"><button class="btn" type="button" data-modal-close>Cancel</button><button class="btn primary" type="submit">Submit report</button></div></form>`);
		document.querySelector('#report-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.target).entries()); if (state.backend !== 'live') { openModal('<p class="kicker">Preview data</p><h2 id="modal-title">Report not saved</h2><p>The static preview has no server-side moderation queue. Connect the backend before accepting community reports.</p><button class="btn primary" type="button" data-modal-close>Done</button>'); return; } try { await api.report(strategy.id, payload); openModal('<p class="kicker">Report received</p><h2 id="modal-title">Thanks for the signal</h2><p>An admin can now review the report. Your browser cannot submit another report for this strategy.</p><button class="btn primary" type="button" data-modal-close>Done</button>'); } catch (caught) { formError('Report not submitted', caught?.message || 'The server rejected this report.'); } });
	}

	async function rate(strategyId, value) {
		if (state.backend !== 'live') { formError('Preview data', 'Ratings are disabled until the server is connected.'); return; }
		if (!strategyId || state.ratingBusy[strategyId]) return;
		state.ratingBusy[strategyId] = true;
		document.querySelectorAll('[data-rate]').forEach((button) => { button.disabled = true; });
		try { const result = await api.rate(strategyId, value); state.ratings[strategyId] = value; const detailed = result?.strategy || await api.detail(strategyId); state.detail = detailed; strategies = strategies.map((item) => item.id === detailed.id ? detailed : item); renderDetail(detailed); } catch (caught) { formError('Rating not submitted', caught?.message || 'The server rejected this rating.'); } finally { delete state.ratingBusy[strategyId]; document.querySelectorAll('[data-rate]').forEach((button) => { button.disabled = false; }); }
	}

	function adminLoginModal() { openModal('<p class="kicker">Private controls</p><h2 id="modal-title">Admin access</h2><p>Sign in to manage featured status, verification, visibility, reports, and duplicate review. The password never reaches the page after submission.</p><form id="admin-login-form"><label class="modal-field">Admin password<input name="password" type="password" autocomplete="current-password" required></label><div class="modal-actions"><button class="btn" type="button" data-modal-close>Cancel</button><button class="btn primary" type="submit">Sign in</button></div><p class="modal-status" id="admin-status"></p></form>'); }
	async function adminPanel() {
		openModal('<p class="kicker">Private controls</p><h2 id="modal-title">Admin access</h2><p>Contextual controls are active on strategy cards and details.</p><div class="admin-panel" id="admin-panel"><p class="muted">Loading open reports…</p></div><div class="modal-actions"><button class="btn" type="button" data-admin-refresh>Refresh reports</button><button class="btn primary" type="button" data-admin-logout>Sign out</button></div>');
		try {
			const [result, duplicates] = await Promise.all([api.adminRequest('/reports'), api.adminRequest('/duplicates')]);
			const reports = result?.items || [];
			const duplicateItems = duplicates?.items || [];
			const reportHtml = reports.length ? `<p class="admin-panel-label">Open reports</p>${reports.slice(0, 8).map((item) => `<div class="admin-report"><b>${esc(item.title)}</b><span>${esc(item.reason.replaceAll('_', ' '))}</span><p>${esc(item.details || 'No details supplied.')}</p><button class="text-button" type="button" data-report-action="resolve" data-report-id="${esc(item.id)}">Resolve report</button></div>`).join('')}` : '<p class="muted">No open reports.</p>';
			const duplicateHtml = duplicateItems.length ? `<p class="admin-panel-label">Duplicate review</p>${duplicateItems.slice(0, 8).map((item) => `<div class="admin-report"><b>${esc(item.title)}</b><span>Likely duplicate</span><p>Review candidate release ${esc(item.candidate_hash || 'unavailable')}.</p><button class="text-button" type="button" data-admin-action="resolve-duplicate" data-admin-id="${esc(item.strategy_id || '')}">Approve release</button></div>`).join('')}` : '';
			const panel = document.querySelector('#admin-panel'); if (panel) panel.innerHTML = reportHtml + duplicateHtml;
		} catch (caught) { const panel = document.querySelector('#admin-panel'); if (panel) panel.innerHTML = `<p class="modal-status">${esc(caught?.message || 'Reports could not be loaded.')}</p>`; }
	}
	async function adminAction(action, strategyId) { try { await api.adminJson(`/strategies/${encodeURIComponent(strategyId)}/action`, { action }); await loadStrategies(); if (state.detail?.id === strategyId) await openDetail(strategyId, false); } catch (caught) { formError('Admin action failed', caught?.message || 'The server rejected this action.'); } }
	async function adminReportAction(action, reportId) { try { await api.adminJson(`/reports/${encodeURIComponent(reportId)}/action`, { action }); await adminPanel(); } catch (caught) { formError('Report action failed', caught?.message || 'The server rejected this action.'); } }
	async function checkServerReady() {
		state.serverReady = false;
		if (state.backend !== 'live' || typeof api.health !== 'function') return;
		try { const result = await api.health(); state.serverReady = Boolean(result?.ok && result?.configured); } catch (_) { state.serverReady = false; }
	}

	function clearAll() { state.query = ''; state.map = ''; state.mode = ''; state.grind = ''; state.timescale = ''; state.tower = ''; state.noSkillTree = false; els.search.value = ''; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); }
	function scheduleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { syncUrl(); state.backend === 'live' ? loadStrategies() : renderBrowse(); }, 220); }
	function closeSortMenu(focus = false) { closeAnimatedMenu(els.sortMenu, els.sortTrigger, null, focus); }
	function setFiltersOpen(open) {
		if (open) {
			els.filters.classList.remove('is-closing');
			els.filters.hidden = false;
			els.filterToggle.setAttribute('aria-expanded', 'true');
			return;
		}
		els.filters.classList.add('is-closing');
		const finish = () => {
			if (!els.filters.classList.contains('is-closing')) return;
			els.filters.hidden = true;
			els.filters.classList.remove('is-closing');
			els.filterToggle.setAttribute('aria-expanded', 'false');
		};
		els.filters.addEventListener('animationend', finish, { once: true });
		window.setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
	}
	function openPublisher(forStrategy = null) { state.publishFor = forStrategy; state.publishStep = 1; state.advancedOpen = false; state.verificationId += 1; state.draft = {}; state.file = null; clearThumbnailPreview(); state.thumbnail = null; state.parsed = null; showView('publish'); syncUrl(); renderPublisher(); }

	document.addEventListener('click', (event) => {
		const target = event.target.closest('[data-publish-next]');
		if (!target || state.publishStep !== 2) return;
		collectDraft();
		const form = els.publish.querySelector('form');
		if (!form?.elements.title?.value.trim() || !form?.elements.description?.value.trim() || !form?.elements.map?.value) { event.preventDefault(); event.stopImmediatePropagation(); formError('A few details are missing', 'Add a strategy name, a short description and a map before reviewing.'); }
	}, true);

	document.addEventListener('click', (event) => {
		const target = event.target.closest('[data-open-strategy], [data-open-variant], [data-back], [data-install], [data-install-version], [data-report], [data-rate], [data-new-version], [data-clear-filter], [data-clear-all], [data-publish-next], [data-publish-back], [data-close-and-browse], [data-modal-close], [data-admin-action], [data-admin-version-action], [data-report-action], [data-admin-refresh], [data-admin-logout], [data-copy-key]');
		if (!target) return;
		if (target.dataset.openStrategy || target.dataset.openVariant) { event.preventDefault(); openDetail(target.dataset.openStrategy || target.dataset.openVariant); }
		else if (target.hasAttribute('data-back')) { event.preventDefault(); showBrowse(); }
		else if (target.dataset.install || target.dataset.installVersion) { event.preventDefault(); openInstall(target.dataset.install || target.dataset.installVersion, target.dataset.version); }
		else if (target.dataset.report) { event.preventDefault(); openReport(target.dataset.report); }
		else if (target.dataset.rate) { event.preventDefault(); rate(state.detail?.id, Number(target.dataset.rate)); }
		else if (target.dataset.newVersion) { event.preventDefault(); openPublisher(target.dataset.newVersion); }
		else if (target.dataset.clearFilter) { event.preventDefault(); const key = { Map: 'map', Mode: 'mode', Grind: 'grind', Timescale: 'timescale', Tower: 'tower', Requirement: 'noSkillTree' }[target.dataset.clearFilter]; state[key] = key === 'noSkillTree' ? false : ''; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); }
		else if (target.hasAttribute('data-clear-all')) { event.preventDefault(); clearAll(); }
		else if (target.hasAttribute('data-publish-next')) { event.preventDefault(); collectDraft(); if (state.publishStep === 1) { if (!state.file) return formError('File required', 'Add the actual .strat file so its structure can be checked.'); if (!state.parsed?.ok) return formError('Validation failed', 'Fix the reported file issues before moving to details.'); } if (state.publishStep === 2) { const message = creatorError(els.publish.querySelector('form')); if (message) return formError('Creator details', message); } state.publishStep += 1; renderPublisher(); }
		else if (target.hasAttribute('data-publish-back')) { event.preventDefault(); collectDraft(); state.publishStep = Math.max(1, state.publishStep - 1); renderPublisher(); }
		else if (target.hasAttribute('data-close-and-browse')) { event.preventDefault(); closeModal(); showBrowse(); }
		else if (target.hasAttribute('data-modal-close')) { event.preventDefault(); closeModal(); }
		else if (target.hasAttribute('data-copy-key')) { event.preventDefault(); const status = document.querySelector('#creator-key-status'); const copy = navigator.clipboard?.writeText?.(target.dataset.copyKey || ''); if (!copy?.then) { if (status) status.textContent = 'Copy was unavailable. Select the key and copy it manually.'; } else copy.then(() => { if (status) status.textContent = 'Copied. Keep this key somewhere private.'; }).catch(() => { if (status) status.textContent = 'Copy was unavailable. Select the key and copy it manually.'; }); }
		else if (target.dataset.adminVersionAction) { event.preventDefault(); event.stopPropagation(); api.adminJson(`/strategies/${encodeURIComponent(target.dataset.adminStrategy)}/versions/${encodeURIComponent(target.dataset.adminVersion)}/action`, { action: target.dataset.adminVersionAction }).then(() => openDetail(target.dataset.adminStrategy, false)).catch((caught) => formError('Version moderation failed', caught?.message || 'The server rejected this action.')); }
		else if (target.dataset.adminOwnership) { event.preventDefault(); event.stopPropagation(); api.adminJson(`/strategies/${encodeURIComponent(target.dataset.adminOwnership)}/ownership`, { action: 'reset' }).then((result) => openModal(`<p class="kicker">Ownership recovery</p><h2 id="modal-title">New creator key generated</h2><p>Give this key to the verified creator through a private channel. It replaces the previous key and is not shown again.</p><code class="key-display">${esc(result.creatorKey)}</code><button class="btn primary" type="button" data-modal-close>Done</button>`)).catch((caught) => formError('Ownership recovery failed', caught?.message || 'The server rejected this action.')); }
		else if (target.dataset.adminAction) { event.preventDefault(); event.stopPropagation(); adminAction(target.dataset.adminAction, target.dataset.adminId); }
		else if (target.dataset.reportAction) { event.preventDefault(); adminReportAction(target.dataset.reportAction, target.dataset.reportId); }
		else if (target.hasAttribute('data-admin-refresh')) { event.preventDefault(); adminPanel(); }
		else if (target.hasAttribute('data-admin-logout')) { event.preventDefault(); api.adminRequest('/logout', { method: 'POST' }).finally(() => { state.admin = false; updateAdminButton(); closeModal(); renderBrowse(); }); }
	});

	els.sortTrigger.addEventListener('click', (event) => { event.stopPropagation(); const open = els.sortMenu.hidden; if (open) els.sortMenu.classList.remove('is-closing'); els.sortMenu.hidden = !open; els.sortTrigger.setAttribute('aria-expanded', String(open)); if (open) els.sortMenu.querySelector(`[data-sort-option="${state.sort}"]`)?.focus(); });
	els.sortMenu.addEventListener('click', (event) => { const option = event.target.closest('[data-sort-option]'); if (!option) return; state.sort = option.dataset.sortOption; closeSortMenu(true); syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); });
	document.addEventListener('click', (event) => { if (!event.target.closest('.sort-control')) closeSortMenu(); if (!event.target.closest('.custom-select')) closeCustomMenus(); });
	document.addEventListener('keydown', (event) => { if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); els.search.focus(); } if (event.key === 'Escape' && !els.modal.hidden) closeModal(); else if (event.key === 'Escape') { closeSortMenu(); closeCustomMenus(); if (!els.filters.hidden) setFiltersOpen(false); } if (event.target.closest('#strategy-sort-menu') && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const options = [...els.sortMenu.querySelectorAll('[data-sort-option]')]; const index = options.indexOf(document.activeElement); const next = event.key === 'ArrowDown' ? Math.min(options.length - 1, index + 1) : event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 : options.length - 1; options[next]?.focus(); } });
	els.publish.addEventListener('submit', (event) => { if (event.target.id === 'publisher-form') { event.preventDefault(); collectDraft(); publishStrategy(); } });
	document.addEventListener('submit', async (event) => {
		if (event.target.id !== 'admin-login-form') return;
		event.preventDefault();
		const status = document.querySelector('#admin-status');
		try { await api.adminRequest('/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: new FormData(event.target).get('password') }) }); state.admin = true; updateAdminButton(); await adminPanel(); renderBrowse(); } catch (caught) { if (status) status.textContent = caught?.message || 'Sign in failed.'; }
	});
	els.search.addEventListener('input', (event) => { state.query = event.target.value; scheduleSearch(); });
	els.sort.addEventListener('change', (event) => { state.sort = event.target.value; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); });
	[[els.map, 'map'], [els.mode, 'mode'], [els.tower, 'tower']].forEach(([select, key]) => select.addEventListener('change', () => { state[key] = select.value; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); }));
	els.noSkillTree.addEventListener('change', () => { state.noSkillTree = els.noSkillTree.checked; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); });
	[ [els.grind, 'grind'], [els.timescale, 'timescale'] ].forEach(([group, key]) => group.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; state[key] = state[key] === button.dataset.value ? '' : button.dataset.value; syncUrl(); renderFilters(); state.backend === 'live' ? loadStrategies() : renderBrowse(); }));
	els.filterToggle.addEventListener('click', () => { const open = els.filters.hidden; setFiltersOpen(open); els.filterToggle.innerHTML = `<span>${open ? 'Hide filters' : 'Filter'}</span><span class="control-chevron" aria-hidden="true"></span>`; });
	document.querySelector('#clear-filters')?.addEventListener('click', clearAll);
	document.querySelector('#publish-open')?.addEventListener('click', () => openPublisher());
	els.admin?.addEventListener('click', () => state.admin ? adminPanel() : adminLoginModal());
	document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
	window.addEventListener('message', (event) => { if (!event.data || event.data.source !== 'ultimatemacro') return; if (event.data.type === 'strategy-state' && event.data.installed && typeof event.data.installed === 'object') { state.installed = event.data.installed; renderBrowse(); if (state.detail) renderDetail(state.detail); } });
	window.addEventListener('popstate', () => { readUrlState(); renderFilters(); if (state.view === 'publish') { renderPublisher(); } else if (state.view === 'detail') { openDetail(new URLSearchParams(window.location.search).get('strategy'), false); } else { showBrowse(false); state.backend === 'live' ? loadStrategies() : renderBrowse(); } });
	function updateAdminButton() { if (els.admin) { els.admin.setAttribute('aria-label', state.admin ? 'Admin controls' : 'Admin access'); els.admin.title = state.admin ? 'Admin controls' : 'Admin access'; els.admin.classList.toggle('active', state.admin); } }
	async function checkAdmin() { if (state.backend !== 'live') return; try { const result = await api.adminRequest('/session'); state.admin = Boolean(result?.authenticated); updateAdminButton(); } catch (_) {} }
	async function boot() { readUrlState(); if (!STRATEGY_NETWORK_ENABLED) { renderUnavailable(); return; } renderFilters(); setBackendStatus(); renderLoading(); await loadStrategies(); await checkServerReady(); await checkAdmin(); if (state.view === 'publish') { showView('publish'); renderPublisher(); } else if (state.view === 'detail') await openDetail(new URLSearchParams(window.location.search).get('strategy'), false); else showBrowse(false); window.postMessage({ source: 'strategy-network', type: 'request-strategy-state', protocol: 'ultimatemacro://install-strategy' }, '*'); }
	boot();
})();
