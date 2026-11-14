(() => {
  if (!document.body.classList.contains('dashboard-app-page')) return;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' }).catch(() => {});
  }

  const key = 'um-dashboard-preferences-v1';
  const defaults = {
    density: 'comfortable', accent: 'violet', accentMode: 'auto', customAccent: '#b9a3db',
    iconMode: 'auto', customIconColor: '#e9e7ee', iconSize: 'medium', provider: 'openai',
    background: 'dead-ahead', backgroundDim: 58, pinnedPages: [], navigationOrder: {}, paletteCache: {}
  };
  const backgrounds = [
    { id: 'none', name: 'No background', image: '' },
    { id: 'dead-ahead', name: 'Dead Ahead', image: '/assets/strategy-maps/dead-ahead.webp' },
    { id: 'badlands-ii', name: 'Badlands II', image: '/assets/strategy-maps/badlands-ii.webp' },
    { id: 'cataclysm', name: 'Cataclysm', image: '/assets/strategy-maps/cataclysm.webp' },
    { id: 'construction-crazy', name: 'Construction Crazy', image: '/assets/strategy-maps/construction-crazy.webp' },
    { id: 'crossroads', name: 'Crossroads', image: '/assets/strategy-maps/crossroads.webp' },
    { id: 'dusty-bridges', name: 'Dusty Bridges', image: '/assets/strategy-maps/dusty-bridges.webp' },
    { id: 'infernal-abyss', name: 'Infernal Abyss', image: '/assets/strategy-maps/infernal-abyss.webp' },
    { id: 'polluted-wasteland-ii', name: 'Polluted Wasteland II', image: '/assets/strategy-maps/polluted-wasteland-ii.webp' },
    { id: 'retro-crossroads', name: 'Retro Crossroads', image: '/assets/strategy-maps/retro-crossroads.webp' },
    { id: 'space-city', name: 'Space City', image: '/assets/strategy-maps/space-city.webp' },
    { id: 'wretched-front', name: 'Wretched Front', image: '/assets/strategy-maps/wretched-front.webp' }
  ];
  const pageGroups = [
    { id: 'overview', title: 'Overview', group: 0 },
    { id: 'manage', title: 'Manage', group: 1 },
    { id: 'activity', title: 'Activity', group: 2 },
    { id: 'remote', title: 'Remote', group: 2 },
    { id: 'earnings', title: 'Earnings', group: 2 },
    { id: 'strategies', title: 'Strategies', group: 2 },
    { id: 'health', title: 'Health', group: 2 },
    { id: 'devices', title: 'Devices', group: 3 },
    { id: 'notifications', title: 'Notifications', group: 3 }
  ];

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { }
  const prefs = { ...defaults, ...saved };
  if (!['comfortable', 'compact'].includes(prefs.density)) prefs.density = defaults.density;
  if (!['violet', 'neutral'].includes(prefs.accent)) prefs.accent = defaults.accent;
  if (!['auto', 'custom', 'preset'].includes(prefs.accentMode)) prefs.accentMode = saved.accent === 'neutral' ? 'preset' : 'auto';
  if (!['auto', 'custom'].includes(prefs.iconMode)) prefs.iconMode = 'auto';
  if (!['small', 'medium', 'large'].includes(prefs.iconSize)) prefs.iconSize = defaults.iconSize;
  if (!backgrounds.some(item => item.id === prefs.background) && prefs.background !== 'custom') prefs.background = defaults.background;
  prefs.backgroundDim = Math.min(85, Math.max(20, Number(prefs.backgroundDim) || defaults.backgroundDim));
  prefs.pinnedPages = Array.isArray(prefs.pinnedPages) ? [...new Set(prefs.pinnedPages.filter(id => pageGroups.some(page => page.id === id)))] : [];
  prefs.navigationOrder = prefs.navigationOrder && typeof prefs.navigationOrder === 'object' ? prefs.navigationOrder : {};
  prefs.paletteCache = prefs.paletteCache && typeof prefs.paletteCache === 'object' ? prefs.paletteCache : {};

  let customObjectUrl = '';
  let backgroundApplyId = 0;
  const root = document.body;
  root.dataset.sidebarEditing = 'false';
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch { } };
  const backgroundFor = id => backgrounds.find(item => item.id === id);
  const toHex = value => /^#[\da-f]{6}$/i.test(value) ? value : '';
  const accessibleColor = value => {
    const hex = toHex(value);
    if (!hex) return '#b9a3db';
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    const ratio = (luminance + .05) / .05;
    if (ratio >= 3) return hex;
    const [h, s, l] = (() => {
      const [r, g, b] = channels, max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
      let hue = 0;
      if (delta) hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      return [((hue * 60 + 360) % 360), max === min ? 0 : delta / (1 - Math.abs(2 * ((max + min) / 2) - 1)), (max + min) / 2];
    })();
    return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${Math.max(74, l * 100).toFixed(0)}%)`;
  };

  function applyLayout() {
    root.dataset.density = prefs.density;
    root.dataset.accent = prefs.accent;
    root.dataset.iconSize = prefs.iconSize;
    root.dataset.background = prefs.background;
    root.style.setProperty('--dashboard-wallpaper-opacity', String(1 - prefs.backgroundDim / 100));
    if (prefs.accentMode === 'custom') {
      root.style.setProperty('--app-accent', accessibleColor(prefs.customAccent));
    } else if (prefs.accentMode === 'preset') {
      root.style.setProperty('--app-accent', prefs.accent === 'neutral' ? '#e3e3e7' : '#b9a3db');
    } else {
      root.style.setProperty('--app-accent', prefs.paletteCache[prefs.background]?.accent || '#b9a3db');
    }
    root.style.setProperty('--app-icon-color', prefs.iconMode === 'custom'
      ? accessibleColor(prefs.customIconColor)
      : prefs.paletteCache[prefs.background]?.icon || '#e9e7ee');
  }

  async function getStoredImage() {
    if (!('indexedDB' in window)) throw new Error('This browser cannot store a custom background.');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('um-dashboard-customization', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return db;
  }
  async function storeImage(blob) {
    const db = await getStoredImage();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      transaction.objectStore('images').put(blob, 'dashboard-background');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Could not save the image.'));
    });
    db.close();
  }
  async function readImage() {
    const db = await getStoredImage();
    const blob = await new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').get('dashboard-background');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob;
  }
  async function deleteImage() {
    const db = await getStoredImage();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('images', 'readwrite');
      transaction.objectStore('images').delete('dashboard-background');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }

  function sampleAccent(url, cacheKey) {
    if (!url || prefs.paletteCache[cacheKey]) return Promise.resolve(prefs.paletteCache[cacheKey]);
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 40; canvas.height = 24;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const hues = new Array(24).fill(0);
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
            const light = (max + min) / 2;
            if (delta < .08 || light < .12 || light > .84) continue;
            let hue = 0;
            if (max === r) hue = ((g - b) / delta) % 6;
            else if (max === g) hue = (b - r) / delta + 2;
            else hue = (r - g) / delta + 4;
            hue = ((hue * 60) + 360) % 360;
            hues[Math.floor(hue / 15) % hues.length] += delta;
          }
          const hue = hues.indexOf(Math.max(...hues)) * 15 + 7;
          const palette = { accent: `hsl(${hue} 54% 75%)`, icon: `hsl(${hue} 26% 91%)` };
          prefs.paletteCache[cacheKey] = palette;
          persist();
          resolve(palette);
        } catch { resolve(null); }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function applyBackground() {
    const applyId = ++backgroundApplyId;
    let url = '';
    if (prefs.background === 'custom') {
      try {
        const blob = await readImage();
        if (blob) {
          if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
          customObjectUrl = URL.createObjectURL(blob);
          url = customObjectUrl;
        } else {
          prefs.background = defaults.background;
          prefs.customBackgroundName = '';
          persist();
        }
      } catch { prefs.background = defaults.background; prefs.customBackgroundName = ''; persist(); }
    } else {
      if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
      customObjectUrl = '';
      url = backgroundFor(prefs.background)?.image || '';
    }
    if (applyId !== backgroundApplyId) return;
    prefs.customBackgroundUrl = prefs.background === 'custom' ? url : '';
    root.style.setProperty('--dashboard-wallpaper-image', url ? `url("${url}")` : 'none');
    window.dispatchEvent(new CustomEvent('dashboard:appearance-ready'));
    if (prefs.accentMode === 'auto' || prefs.iconMode === 'auto') {
      const palette = await sampleAccent(url, prefs.background);
      if (applyId !== backgroundApplyId) return;
      if (palette) {
        if (prefs.accentMode === 'auto') root.style.setProperty('--app-accent', palette.accent);
        if (prefs.iconMode === 'auto') root.style.setProperty('--app-icon-color', palette.icon);
      }
    }
  }

  const navGroups = [
    { key: 'overview', pageGroup: 0, title: '' },
    { key: 'control', pageGroup: 1, title: 'Control' },
    { key: 'insights', pageGroup: 2, title: 'Insights' },
    { key: 'devices', pageGroup: 3, title: 'Devices' }
  ];
  const navigationSources = new Map();
  function applyNavigation() {
    const nav = document.querySelector('.dashboard-section-nav');
    if (!nav) return;
    [...nav.querySelectorAll('a[href^="/dashboard/"]')]
      .filter(link => !link.closest('.dashboard-nav-item[data-pinned-copy="true"]'))
      .filter(link => pageGroups.some(page => link.getAttribute('href') === `/dashboard/${page.id}/`))
      .forEach(link => {
        const id = link.getAttribute('href').split('/').filter(Boolean).at(-1);
        link.dataset.dashboardPrimary = 'true';
        navigationSources.set(id, link);
      });
    const links = navigationSources;
    const startSpace = nav.querySelector('.dashboard-nav-space:first-child');
    const endSpace = [...nav.querySelectorAll('.dashboard-nav-space')].at(-1);
    const mobileSettings = nav.querySelector('.dashboard-mobile-only-nav-item');
    const orderFor = group => {
      const all = pageGroups.filter(page => page.group === group.pageGroup).map(page => page.id);
      const savedOrder = Array.isArray(prefs.navigationOrder[group.key]) ? prefs.navigationOrder[group.key] : [];
      return [...new Set([...savedOrder.filter(id => all.includes(id)), ...all])];
    };
    const sectionOrderFor = group => orderFor(group).filter(id => !prefs.pinnedPages.includes(id));
    const makeItem = (id, source, navGroup, pinnedCopy = false) => {
      const row = document.createElement('div');
      row.className = 'dashboard-nav-item';
      row.dataset.pageId = id;
      row.dataset.navGroup = navGroup;
      if (pinnedCopy) row.dataset.pinnedCopy = 'true';
      const link = source.cloneNode(true);
      if (pinnedCopy) delete link.dataset.dashboardPrimary;
      else link.dataset.dashboardPrimary = 'true';
      if (pinnedCopy) link.removeAttribute('aria-current');
      row.append(link);
      const controls = document.createElement('div');
      controls.className = 'dashboard-nav-edit-controls';
      controls.setAttribute('aria-label', `${pageGroups.find(page => page.id === id)?.title || id} sidebar options`);
      const list = navGroup === 'pinned'
        ? [...prefs.pinnedPages]
        : sectionOrderFor(navGroups.find(group => String(group.pageGroup) === navGroup));
      const position = list.indexOf(id);
      const move = (direction, label) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'dashboard-nav-move';
        button.textContent = direction < 0 ? '↑' : '↓';
        button.setAttribute('aria-label', `${label} ${pageGroups.find(page => page.id === id)?.title || id}`);
        button.disabled = position + direction < 0 || position + direction >= list.length;
        button.addEventListener('click', () => {
          const next = [...list];
          [next[position], next[position + direction]] = [next[position + direction], next[position]];
          if (navGroup === 'pinned') prefs.save({ pinnedPages: next });
          else {
            const groupKey = navGroups.find(group => String(group.pageGroup) === navGroup)?.key;
            prefs.save({ navigationOrder: { ...prefs.navigationOrder, [groupKey]: next } });
          }
        });
        controls.append(button);
      };
      move(-1, 'Move up'); move(1, 'Move down');
      if (pinnedCopy || !prefs.pinnedPages.includes(id)) {
        const pin = document.createElement('button');
        const isPinned = prefs.pinnedPages.includes(id);
        pin.type = 'button'; pin.className = 'dashboard-nav-pin';
        pin.textContent = isPinned ? 'Unpin' : 'Pin';
        pin.setAttribute('aria-label', `${isPinned ? 'Unpin' : 'Pin'} ${pageGroups.find(page => page.id === id)?.title || id}`);
        pin.addEventListener('click', () => {
          const next = prefs.pinnedPages.filter(pageId => pageId !== id);
          if (!isPinned) next.push(id);
          prefs.save({ pinnedPages: next });
        });
        controls.append(pin);
      }
      row.append(controls);
      row.draggable = root.dataset.sidebarEditing === 'true';
      row.addEventListener('dragstart', event => {
        if (root.dataset.sidebarEditing !== 'true') { event.preventDefault(); return; }
        event.dataTransfer?.setData('text/plain', `${navGroup}:${id}`);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
      return row;
    };
    const buildGroup = group => {
      const section = document.createElement('div');
      section.className = 'dashboard-nav-group';
      section.dataset.navGroup = String(group.pageGroup);
      if (group.title) {
        const heading = document.createElement('span');
        heading.className = 'dashboard-nav-group-heading'; heading.textContent = group.title;
        section.append(heading);
      }
      sectionOrderFor(group).forEach(id => {
        if (links.has(id)) section.append(makeItem(id, links.get(id), String(group.pageGroup)));
      });
      section.addEventListener('dragover', event => {
        if (event.dataTransfer?.types.includes('text/plain')) event.preventDefault();
      });
      section.addEventListener('drop', event => {
        event.preventDefault();
        const [sourceGroup, id] = (event.dataTransfer?.getData('text/plain') || '').split(':');
        if (sourceGroup !== String(group.pageGroup) || !links.has(id)) return;
        const target = event.target.closest('.dashboard-nav-item');
        const dragged = [...section.querySelectorAll('.dashboard-nav-item')].find(item => item.dataset.pageId === id);
        if (!dragged || !target || target === dragged) return;
        const rect = target.getBoundingClientRect();
        section.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
        const next = [...section.querySelectorAll('.dashboard-nav-item')].map(item => item.dataset.pageId);
        prefs.save({ navigationOrder: { ...prefs.navigationOrder, [group.key]: next } });
      });
      return section;
    };
    let pinnedGroup = null;
    if (prefs.pinnedPages.length) {
      pinnedGroup = document.createElement('div');
      pinnedGroup.className = 'dashboard-nav-group dashboard-nav-pinned-group';
      pinnedGroup.dataset.navGroup = 'pinned';
      const heading = document.createElement('span');
      heading.className = 'dashboard-nav-group-heading'; heading.textContent = 'Pinned';
      pinnedGroup.append(heading);
      prefs.pinnedPages.forEach(id => { if (links.has(id)) pinnedGroup.append(makeItem(id, links.get(id), 'pinned', true)); });
      pinnedGroup.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('text/plain')) event.preventDefault(); });
      pinnedGroup.addEventListener('drop', event => {
        event.preventDefault();
        const [sourceGroup, id] = (event.dataTransfer?.getData('text/plain') || '').split(':');
        if (sourceGroup !== 'pinned' || !prefs.pinnedPages.includes(id)) return;
        const target = event.target.closest('.dashboard-nav-item');
        const dragged = [...pinnedGroup.querySelectorAll('.dashboard-nav-item')].find(item => item.dataset.pageId === id);
        if (!dragged || !target || target === dragged) return;
        const rect = target.getBoundingClientRect();
        pinnedGroup.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
        prefs.save({ pinnedPages: [...pinnedGroup.querySelectorAll('.dashboard-nav-item')].map(item => item.dataset.pageId) });
      });
    }
    nav.replaceChildren(...[startSpace, pinnedGroup, ...navGroups.map(buildGroup), mobileSettings, endSpace].filter(Boolean));
    nav.classList.toggle('is-editing', root.dataset.sidebarEditing === 'true');
  }

  prefs.backgroundOptions = backgrounds;
  prefs.pages = pageGroups;
  prefs.save = next => {
    Object.assign(prefs, next);
    applyLayout();
    persist();
    if (Object.hasOwn(next, 'background') || Object.hasOwn(next, 'accentMode') || Object.hasOwn(next, 'iconMode')) applyBackground();
    if (Object.hasOwn(next, 'pinnedPages') || Object.hasOwn(next, 'navigationOrder')) applyNavigation();
  };
  prefs.preview = next => { Object.assign(prefs, next); applyLayout(); };
  prefs.toggleSidebarEditing = () => {
    root.dataset.sidebarEditing = root.dataset.sidebarEditing === 'true' ? 'false' : 'true';
    applyNavigation();
    const editing = root.dataset.sidebarEditing === 'true';
    window.dispatchEvent(new CustomEvent('dashboard:sidebar-editing', { detail: { editing } }));
    return editing;
  };
  prefs.setBackgroundImage = async file => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 8 * 1024 * 1024) throw new Error('That image is over 8 MB. Choose a smaller file.');
    let bitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error('That image could not be opened. Try a different file.'); }
    const { width, height } = bitmap;
    bitmap.close();
    if (width < 640 || height < 360 || width > 8000 || height > 8000) throw new Error('Use an image between 640×360 and 8000×8000 pixels.');
    await storeImage(file);
    prefs.customBackgroundName = file.name.slice(0, 120);
    delete prefs.paletteCache.custom;
    prefs.background = 'custom';
    persist(); applyLayout(); await applyBackground(); applyNavigation();
  };
  prefs.removeBackgroundImage = async () => {
    await deleteImage();
    if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
    customObjectUrl = '';
    prefs.customBackgroundName = '';
    delete prefs.paletteCache.custom;
    if (prefs.background === 'custom') prefs.background = defaults.background;
    persist(); applyLayout(); await applyBackground();
  };

  applyLayout();
  applyNavigation();
  applyBackground();

  const sidebar = document.querySelector('.dashboard-sidebar');
  const sectionNav = sidebar?.querySelector('.dashboard-section-nav');
  const settingsLink = sidebar?.querySelector('.dashboard-sidebar-bottom a');
  if (sidebar && sectionNav) {
    const mobileNav = document.createElement('div');
    mobileNav.className = 'dashboard-mobile-navigation';
    const startSpace = document.createElement('span');
    const endSpace = document.createElement('span');
    startSpace.className = endSpace.className = 'dashboard-nav-space';
    startSpace.setAttribute('aria-hidden', 'true');
    endSpace.setAttribute('aria-hidden', 'true');
    sectionNav.prepend(startSpace);
    if (settingsLink) {
      const mobileSettings = settingsLink.cloneNode(true);
      mobileSettings.classList.add('dashboard-mobile-only-nav-item');
      sectionNav.append(mobileSettings);
    }
    sectionNav.append(endSpace);
    mobileNav.append(sectionNav);
    sidebar.prepend(mobileNav);
    const centerItem = (item, behavior = 'smooth') => {
      if (!item || !window.matchMedia('(max-width: 920px)').matches) return;
      const links = [...sectionNav.querySelectorAll('a')];
      const widest = Math.max(0, ...links.map(link => link.offsetWidth));
      const sideSpace = Math.max(0, (sectionNav.clientWidth - widest) / 2);
      startSpace.style.flexBasis = `${sideSpace}px`;
      endSpace.style.flexBasis = `${sideSpace}px`;
      const target = item.getBoundingClientRect().left - sectionNav.getBoundingClientRect().left
        + sectionNav.scrollLeft + item.offsetWidth / 2 - sectionNav.clientWidth / 2;
      const left = Math.max(0, target);
      if (behavior === 'auto' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const previousScrollBehavior = sectionNav.style.scrollBehavior;
        sectionNav.style.scrollBehavior = 'auto';
        sectionNav.scrollLeft = left;
        requestAnimationFrame(() => { sectionNav.style.scrollBehavior = previousScrollBehavior; });
      } else sectionNav.scrollTo({ left, behavior: 'smooth' });
    };
    const activeItem = sectionNav.querySelector('a[aria-current="page"]');
    window.addEventListener('resize', () => centerItem(sectionNav.querySelector('a[aria-current="page"]'), 'auto'), { passive: true });
    if (window.matchMedia('(max-width: 920px)').matches) centerItem(activeItem, 'auto');
    mobileNav.dataset.ready = 'true';
  }

  const updateKey = 'um-dashboard-whats-new-20261114-v2';
  let updateDialog = null;
  function showDashboardUpdate() {
    if (updateDialog?.open) return;
    try { if (localStorage.getItem(updateKey)) return; } catch { }
    let tour = {};
    try { tour = JSON.parse(localStorage.getItem('um-dashboard-tour-v2') || '{}') || {}; } catch { }
    if (tour.active || (!tour.seen && location.pathname === '/dashboard/overview/')) return;

    updateDialog = document.createElement('dialog');
    updateDialog.className = 'dashboard-update-dialog';
    updateDialog.setAttribute('aria-labelledby', 'dashboard-update-title');
    updateDialog.innerHTML = `
      <div class="dashboard-update-heading">
        <h2 id="dashboard-update-title">Dashboard update</h2>
      </div>
      <p class="dashboard-update-intro">A few new things landed. Here’s the short version.</p>
      <ul class="dashboard-update-list">
        <li><strong>Backgrounds in Settings</strong><span>Pick a map, dim it, or upload your own. Make it your setup.</span></li>
        <li><strong>Sidebar</strong><span>Pin pages, move them within their section, or change icon colors and size. It finally listens.</span></li>
        <li><strong>Remote</strong><span>Your run’s strategy, map, mode, and state now show beside the controls. Less guessing, more running.</span></li>
      </ul>
      <div class="dashboard-update-footer"><span>Change your background or icons anytime in Settings.</span><button type="button" data-update-dismiss>Got it</button></div>`;
    updateDialog.addEventListener('close', () => {
      try { localStorage.setItem(updateKey, 'seen'); } catch { }
      updateDialog?.remove();
      updateDialog = null;
    }, { once: true });
    updateDialog.querySelector('[data-update-dismiss]').addEventListener('click', () => updateDialog?.close());
    document.body.append(updateDialog);
    updateDialog.showModal();
  }
  window.addEventListener('dashboard:tour-closed', showDashboardUpdate);
  window.setTimeout(showDashboardUpdate, 700);

  root.dataset.routeReady = 'true';
  window.ultimateMacroDashboardPreferences = prefs;
})();
