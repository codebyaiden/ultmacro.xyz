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
  const loadMore = document.createElement('button');
  let sort = 'recent';
  let term = '';
  let pageNumber = 1;
  let total = 0;
  let loading = false;
  let timer;
  let currentItem = null;

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
    if (item.featured) {
      const flag = document.createElement('span');
      flag.className = 'strategy-library-label is-featured';
      flag.textContent = 'Featured';
      flags.append(flag);
    } else if (item.popular) {
      const flag = document.createElement('span');
      flag.className = 'strategy-library-label';
      flag.textContent = 'Popular';
      flags.append(flag);
    }
    if (flags.childElementCount) body.append(flags);

    const title = document.createElement('h2');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description || item.fileName;
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
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'strategy-public-get';
    action.textContent = 'Get strategy';
    action.addEventListener('click', () => openWarning(item));
    meta.append(author, likes);
    body.append(title, description, meta, action);
    card.append(body);
    return card;
  }

  async function load(reset = false) {
    if (loading) return;
    if (reset) {
      pageNumber = 1;
      total = 0;
      grid.replaceChildren();
      grid.dataset.loaded = '';
      loadMore.hidden = true;
    }
    loading = true;
    setFeedback('');
    try {
      const params = new URLSearchParams({ page: String(pageNumber), limit: '24', sort });
      if (term) params.set('q', term);
      const response = await fetch(`/api/strategies/library?${params}`, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not load the Library.');
      total = Number(body.total || 0);
      for (const item of body.items || []) grid.append(makeCard(item));
      grid.dataset.loaded = 'true';
      if (!grid.childElementCount) setFeedback(term ? 'No strategies match that search.' : 'No strategies in the Library yet.');
      pageNumber += 1;
      loadMore.hidden = grid.childElementCount >= total;
    } catch (error) {
      setFeedback(error.message || 'Could not load the Library.', true);
    } finally {
      loading = false;
    }
  }

  function openWarning(item) {
    currentItem = item;
    dialog.querySelector('[data-dialog-title]').textContent = item.title;
    dialog.querySelector('[data-dialog-byline]').textContent = `${item.author} · ${Number(item.likes).toLocaleString()} likes`;
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
    const download = dialog.querySelector('[data-dialog-download]');
    download.href = item.downloadUrl;
    download.download = item.fileName;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.location.assign(item.downloadUrl);
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
  dialog.querySelector('[data-dialog-download]').addEventListener('click', () => {
    if (currentItem) setTimeout(() => dialog.close(), 120);
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => { currentItem = null; });
  showView('yours');
})();
