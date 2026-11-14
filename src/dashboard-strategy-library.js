(() => {
  const page = document.querySelector('.dashboard-strategies-content');
  const library = page?.querySelector('[data-strategy-library]');
  if (!library) return;

  const yours = page.querySelector('[data-strategy-device-list]');
  const tabs = [...page.querySelectorAll('[data-strategy-view]')];
  const search = library.querySelector('[data-library-search]');
  const grid = library.querySelector('[data-library-grid]');
  const feedback = library.querySelector('[data-library-feedback]');
  const dialog = document.querySelector('[data-library-dialog]');
  const sortButtons = [...library.querySelectorAll('[data-library-sort]')];
  const filePicker = dialog.querySelector('[data-dialog-file]');
  const filePickerWrap = dialog.querySelector('[data-dialog-file-wrap]');
  const devicePicker = dialog.querySelector('[data-dialog-device]');
  const devicePickerWrap = dialog.querySelector('[data-dialog-device-wrap]');
  const dialogStatus = dialog.querySelector('[data-dialog-status]');
  const dialogMetrics = dialog.querySelector('[data-dialog-metrics]');
  const installButton = dialog.querySelector('[data-dialog-install]');
  const downloadButton = dialog.querySelector('[data-dialog-download]');
  const followButton = dialog.querySelector('[data-dialog-follow]');
  const loadMore = document.createElement('button');
  let sort = 'recent';
  let term = '';
  let pageNumber = 1;
  let total = 0;
  let loadedCount = 0;
  let groupGrids = {};
  let loading = false;
  let timer;
  let currentItem = null;
  let currentState = { devices: [], unavailable: false };
  let adding = false;
  const pinnedKey = 'um-dashboard-pinned-strategies-v1';
  const followedKey = 'um-dashboard-followed-strategies-v1';
  const readPins = () => {
    try {
      const value = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string').slice(0, 100) : [];
    } catch { return []; }
  };
  let pinnedItems = readPins();
  const readFollows = () => {
    try {
      const value = JSON.parse(localStorage.getItem(followedKey) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string').slice(0, 200) : [];
    } catch { return []; }
  };
  let followedItems = readFollows();
  const updatedAt = item => String(item?.updatedAt || item?.updated || item?.createdAt || '');
  const titleKey = item => String(item?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isFeatured = item => {
    const title = titleKey(item);
    return Boolean(item?.featured) || title.startsWith('est we love yeti') ||
      (title.includes('bread toaster reborn') && title.includes('17khour'));
  };
  const installCount = item => Number(item?.installCount ?? item?.installs ?? 0) || 0;
  const isPopular = item => Boolean(item?.popular) || installCount(item) >= 50;
  const categoryFor = item => isFeatured(item) ? 'featured' : isPopular(item) ? 'popular' : 'normal';
  const hasUpdate = item => {
    const followed = followedItems.find(entry => entry.id === item.id);
    return Boolean(followed && updatedAt(item) && updatedAt(item) !== followed.updatedAt);
  };

  loadMore.type = 'button';
  loadMore.className = 'strategy-library-more';
  loadMore.textContent = 'Load more';
  loadMore.hidden = true;
  library.append(loadMore);

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.toggleAttribute('data-error', isError);
  }

  function showView(name) {
    for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.strategyView === name));
    yours.hidden = name !== 'yours';
    library.hidden = name !== 'library';
    if (name === 'library' && !grid.dataset.loaded) void load(true);
  }

  function makeCard(item) {
    const card = document.createElement('article');
    card.className = 'strategy-public-card';

    if (item.thumbnailUrl) {
      card.classList.add('has-thumbnail');
      const image = document.createElement('img');
      image.className = 'strategy-public-thumbnail';
      image.src = item.thumbnailUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      card.append(image);
    }

    const body = document.createElement('div');
    body.className = 'strategy-public-card-body';
    const flags = document.createElement('div');
    flags.className = 'strategy-public-flags';
    if (isFeatured(item)) {
      const flag = document.createElement('span');
      flag.className = 'strategy-library-label is-featured';
      flag.textContent = 'Featured';
      flags.append(flag);
    } else if (isPopular(item)) {
      const flag = document.createElement('span');
      flag.className = 'strategy-library-label';
      flag.textContent = 'Popular';
      flags.append(flag);
    }
    if (hasUpdate(item)) {
      const flag = document.createElement('span');
      flag.className = 'strategy-library-label is-update';
      flag.textContent = 'Update available';
      flags.append(flag);
    }
    if (flags.childElementCount) body.append(flags);

    const title = document.createElement('h2');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description || `${item.files?.length || 1} strategy file${(item.files?.length || 1) === 1 ? '' : 's'}`;
    description.className = 'strategy-public-description';
    const meta = document.createElement('div');
    meta.className = 'strategy-public-meta';
    const author = document.createElement('span');
    author.textContent = item.author;
    const likes = document.createElement('span');
    likes.className = 'strategy-public-likes';
    likes.setAttribute('aria-label', `${item.likes} heart reactions`);
    const heart = document.createElement('span');
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = '♥';
    const count = document.createElement('span');
    count.textContent = Number(item.likes).toLocaleString();
    likes.append(heart, count);
    const installs = document.createElement('span');
    installs.className = 'strategy-public-installs';
    installs.textContent = `${installCount(item).toLocaleString()} installs`;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'strategy-public-get';
    action.textContent = 'Get strategy';
    action.addEventListener('click', () => openWarning(item));
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'strategy-public-pin';
    pin.dataset.strategyId = item.id;
    pin.setAttribute('aria-pressed', String(pinnedItems.some(entry => entry.id === item.id)));
    pin.setAttribute('aria-label', `${pinnedItems.some(entry => entry.id === item.id) ? 'Unpin' : 'Pin'} ${item.title}`);
    pin.title = pinnedItems.some(entry => entry.id === item.id) ? 'Unpin strategy' : 'Pin strategy';
    pin.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8z"></path></svg>';
    pin.addEventListener('click', () => togglePin(item));
    const signals = document.createElement('span');
    signals.className = 'strategy-public-signals';
    signals.append(likes, installs);
    meta.append(author, signals);
    body.append(title, description, meta, pin, action);
    card.append(body);
    return card;
  }

  function resetGroups() {
    grid.replaceChildren();
    groupGrids = {};
    const labels = [
      ['featured', 'Featured'],
      ['popular', 'Popular'],
      ['normal', 'More strategies']
    ];
    for (const [key, label] of labels) {
      const section = document.createElement('section');
      section.className = 'strategy-library-group';
      section.dataset.category = key;
      section.hidden = true;
      const heading = document.createElement('h2');
      heading.textContent = label;
      const cards = document.createElement('div');
      cards.className = 'strategy-library-group-grid';
      section.append(heading, cards);
      grid.append(section);
      groupGrids[key] = { section, cards };
    }
  }

  function appendItem(item) {
    const group = groupGrids[categoryFor(item)];
    if (!group) return;
    group.section.hidden = false;
    group.cards.append(makeCard(item));
  }

  async function load(reset = false) {
    if (loading) return;
    if (reset) {
      pageNumber = 1;
      total = 0;
      loadedCount = 0;
      resetGroups();
      grid.dataset.loaded = '';
      loadMore.hidden = true;
    }
    loading = true;
    setFeedback('');
    try {
      if (sort === 'pinned') {
        for (const item of pinnedItems) appendItem(item);
        grid.dataset.loaded = 'true';
        if (!pinnedItems.length) setFeedback('Pin a strategy to keep it here for quick access.');
        loadMore.hidden = true;
        return;
      }
      const params = new URLSearchParams({ page: String(pageNumber), limit: '24', sort });
      if (term) params.set('q', term);
      const response = await fetch(`/api/strategies/library?${params}`, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not load the Library.');
      total = Number(body.total || 0);
      const items = body.items || [];
      for (const item of items) appendItem(item);
      loadedCount += items.length;
      grid.dataset.loaded = 'true';
      const updates = items.filter(hasUpdate).length;
      if (updates) setFeedback(`${updates} followed ${updates === 1 ? 'strategy has an update' : 'strategies have updates'} to review.`);
      else if (!grid.childElementCount) setFeedback(term ? 'No strategies match that search.' : 'No strategies in the Library yet.');
      pageNumber += 1;
      loadMore.hidden = loadedCount >= total;
    } catch (error) {
      setFeedback(error.message || 'Could not load the Library.', true);
    } finally {
      loading = false;
    }
  }

  function togglePin(item) {
    const existing = pinnedItems.some(entry => entry.id === item.id);
    pinnedItems = existing ? pinnedItems.filter(entry => entry.id !== item.id) : [
      { ...item, files: Array.isArray(item.files) ? item.files.map(file => ({ ...file })) : [] },
      ...pinnedItems
    ].slice(0, 100);
    try { localStorage.setItem(pinnedKey, JSON.stringify(pinnedItems)); }
    catch { setFeedback('Could not save pinned strategies in this browser.', true); return; }
    if (sort === 'pinned') void load(true);
    else {
      const button = [...grid.querySelectorAll('.strategy-public-pin')].find(node => node.dataset.strategyId === item.id);
      if (button) {
        button.setAttribute('aria-pressed', String(!existing));
        button.setAttribute('aria-label', `${existing ? 'Pin' : 'Unpin'} ${item.title}`);
        button.title = existing ? 'Pin strategy' : 'Unpin strategy';
      }
    }
  }

  function openWarning(item) {
    currentItem = item;
    const files = item.files?.length ? item.files : [{ id: item.id, fileName: item.fileName, downloadUrl: item.downloadUrl, bytes: item.bytes }];
    dialog.querySelector('[data-dialog-title]').textContent = item.title;
    dialog.querySelector('[data-dialog-byline]').textContent = `${item.author} · ${Number(item.likes).toLocaleString()} likes`;
    updateDialogMetrics(item, files[0]);
    dialog.querySelector('[data-dialog-description]').textContent = item.description || item.fileName;
    const preview = dialog.querySelector('[data-dialog-preview]');
    preview.replaceChildren();
    preview.hidden = !item.thumbnailUrl;
    if (item.thumbnailUrl) {
      const image = document.createElement('img');
      image.src = item.thumbnailUrl;
      image.alt = '';
      preview.append(image);
    }
    filePicker.replaceChildren(...files.map(file => {
      const option = document.createElement('option');
      option.value = file.id;
      option.textContent = file.fileName;
      return option;
    }));
    filePickerWrap.hidden = files.length < 2;
    filePicker.dataset.files = JSON.stringify(files);
    const following = followedItems.some(entry => entry.id === item.id);
    followButton.textContent = following ? (hasUpdate(item) ? 'Following · review update' : 'Following updates') : 'Follow updates';
    followButton.setAttribute('aria-pressed', String(following));
    dialogStatus.textContent = hasUpdate(item) ? 'A newer post is available. Review its details before adding it to your PC.' : '';
    installButton.textContent = 'Add to macro';
    installButton.disabled = false;
    downloadButton.disabled = false;
    updateInstallTarget();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialogStatus.textContent = 'Open this Library on a browser that supports dialogs to add strategies.';
  }

  function toggleFollowCurrent() {
    if (!currentItem) return;
    const following = followedItems.some(entry => entry.id === currentItem.id);
    followedItems = following
      ? followedItems.filter(entry => entry.id !== currentItem.id)
      : [{ id: currentItem.id, updatedAt: updatedAt(currentItem), title: currentItem.title }, ...followedItems].slice(0, 200);
    try { localStorage.setItem(followedKey, JSON.stringify(followedItems)); }
    catch { dialogStatus.textContent = 'Could not save update preferences in this browser.'; return; }
    followButton.textContent = following ? 'Follow updates' : 'Following updates';
    followButton.setAttribute('aria-pressed', String(!following));
    dialogStatus.textContent = following ? 'Update following turned off.' : 'You’ll see a review notice when the Library shows a newer post.';
    if (grid.dataset.loaded === 'true') void load(true);
  }

  function updateDialogMetrics(item, file) {
    dialogMetrics.textContent = `${Number(file?.installCount ?? item.installCount ?? 0).toLocaleString()} installs · ${Number(file?.downloadCount ?? item.downloadCount ?? 0).toLocaleString()} downloads`;
  }

  function connectedDevices() {
    return (currentState.devices || []).filter(device => device?.state === 'connected');
  }

  function canInstall(device) {
    return Boolean(device?.snapshot?.capabilities?.includes('strategy_library_install'));
  }

  function updateInstallTarget() {
    const devices = connectedDevices();
    devicePicker.replaceChildren(...devices.map(device => {
      const option = document.createElement('option');
      option.value = device.id;
      const supported = canInstall(device);
      option.textContent = `${device.name || device.deviceName || 'This PC'}${supported ? '' : ' · Update needed'}`;
      return option;
    }));
    devicePickerWrap.hidden = devices.length === 0;
    if (!adding && currentItem) {
      const selected = devices.find(device => device.id === devicePicker.value) || devices[0];
      if (selected && devicePicker.value !== selected.id) devicePicker.value = selected.id;
      installButton.disabled = !canInstall(selected);
      dialogStatus.textContent = !selected
        ? currentState.unavailable ? 'Could not check the PC connection. You can download the file instead.' : 'Open Ultimate Macro and connect this PC to add the strategy directly.'
        : canInstall(selected) ? '' : 'This PC is connected, but needs the newer macro build for direct installs. Download the file instead for now.';
    }
  }

  async function sendInstall(deviceId, fileName, strategyText) {
    const bootstrap = await fetch('/api/dashboard/v1/session/bootstrap', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
    });
    if (!bootstrap.ok) throw new Error('Your dashboard session expired. Refresh and try again.');
    const response = await fetch('/api/dashboard/v1/remote/commands', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ deviceId, command: 'install_library_strategy', payload: { fileName, strategyText } })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not send the strategy to your PC.');
    for (let attempt = 0; attempt < 36; attempt++) {
      await new Promise(resolve => window.setTimeout(resolve, 700));
      const statusResponse = await fetch(`/api/dashboard/v1/remote/commands/${encodeURIComponent(result.id)}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }
      });
      const status = await statusResponse.json().catch(() => ({}));
      if (!statusResponse.ok) throw new Error(status.error || 'Could not check the PC response.');
      if (status.status === 'succeeded') return status;
      if (status.status === 'failed' || status.status === 'expired') throw new Error(status.message || 'The PC could not add that strategy.');
    }
    throw new Error('The PC hasn’t replied yet. Keep Ultimate Macro open and try again.');
  }

  async function addToMacro() {
    if (adding || !currentItem) return;
    const device = connectedDevices().find(item => item.id === devicePicker.value) || connectedDevices()[0];
    if (!device) { updateInstallTarget(); return; }
    const files = JSON.parse(filePicker.dataset.files || '[]');
    const file = files.find(item => item.id === filePicker.value) || files[0];
    if (!file?.downloadUrl) return;
    adding = true;
    installButton.disabled = true;
    installButton.textContent = 'Adding…';
    dialogStatus.textContent = 'Sending the strategy to your PC…';
    try {
      const response = await fetch(`${file.downloadUrl}?source=install`, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('That strategy file is no longer available.');
      const strategyText = await response.text();
      if (!strategyText.trim() || new TextEncoder().encode(strategyText).byteLength > 2 * 1024 * 1024)
        throw new Error('That strategy file is empty or too large.');
      await sendInstall(device.id, file.fileName, strategyText);
      const metric = await fetch('/api/dashboard/v1/library/installs', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ attachmentId: file.id })
      }).then(response => response.ok ? response.json() : null).catch(() => null);
      if (metric) {
        file.installCount = Number(metric.installCount || 0);
        currentItem.installCount = Number(metric.postInstallCount ?? currentItem.installCount ?? 0);
        updateDialogMetrics(currentItem, file);
        void load(true);
      }
      dialogStatus.textContent = metric
        ? `Added to ${device.name || device.deviceName || 'your PC'}.`
        : `Added to ${device.name || device.deviceName || 'your PC'}; install count could not sync.`;
      installButton.textContent = 'Added to macro';
      installButton.disabled = true;
      await window.UMDashboardState?.refresh();
    } catch (error) {
      dialogStatus.textContent = error.message || 'Could not add that strategy.';
      installButton.textContent = 'Try again';
      installButton.disabled = connectedDevices().length === 0;
    } finally {
      adding = false;
    }
  }

  async function downloadSelected() {
    if (!currentItem || downloadButton.disabled) return;
    const files = JSON.parse(filePicker.dataset.files || '[]');
    const file = files.find(item => item.id === filePicker.value) || files[0];
    if (!file?.downloadUrl) return;
    downloadButton.disabled = true;
    const previousText = downloadButton.textContent;
    downloadButton.textContent = 'Starting download…';
    try {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.fileName;
      link.style.position = 'fixed';
      link.style.left = '-9999px';
      document.body.append(link);
      link.click();
      link.remove();
      file.downloadCount = Number(file.downloadCount || 0) + 1;
      currentItem.downloadCount = Number(currentItem.downloadCount || 0) + 1;
      updateDialogMetrics(currentItem, file);
      dialogStatus.textContent = 'Your strategy download should start now.';
    } catch (error) {
      dialogStatus.textContent = error.message || 'Could not download that strategy file.';
    } finally {
      downloadButton.disabled = false;
      downloadButton.textContent = previousText;
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.strategyView)));
  sortButtons.forEach(button => button.addEventListener('click', () => {
    sort = button.dataset.librarySort;
    sortButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    void load(true);
  }));
  search.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      term = search.value.trim();
      void load(true);
    }, 220);
  });
  loadMore.addEventListener('click', () => void load());
  dialog.querySelector('[data-dialog-cancel]').addEventListener('click', () => dialog.close());
  followButton.addEventListener('click', toggleFollowCurrent);
  installButton.addEventListener('click', addToMacro);
  downloadButton.addEventListener('click', downloadSelected);
  devicePicker.addEventListener('change', updateInstallTarget);
  filePicker.addEventListener('change', () => {
    const files = JSON.parse(filePicker.dataset.files || '[]');
    updateDialogMetrics(currentItem, files.find(file => file.id === filePicker.value));
    dialogStatus.textContent = '';
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => { currentItem = null; });
  window.UMDashboardState?.subscribe(state => { currentState = state; updateInstallTarget(); });
  showView('yours');
})();
