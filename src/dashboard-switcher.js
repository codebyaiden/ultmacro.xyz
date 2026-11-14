(() => {
  const sidebar = document.querySelector('.dashboard-sidebar');
  const nav = sidebar?.querySelector('.dashboard-section-nav');
  if (!sidebar || !nav) return;

  const brand = document.createElement('a');
  brand.className = 'dashboard-sidebar-brand';
  brand.href = '/dashboard/overview/';
  brand.setAttribute('aria-label', 'Ultimate Macro dashboard overview');
  brand.innerHTML = '<img src="/assets/ultimate-macro-mascot.png" alt=""><span>Ultimate <b>Macro</b></span>';
  nav.before(brand);

  const routes = [
    ['Overview', '/dashboard/overview/', 'Main_Navigation/manage.svg'],
    ['Manage', '/dashboard/manage/', '/assets/dashboard-icons/manage-controls.svg'],
    ['Activity', '/dashboard/activity/', 'Main_Navigation/activity.svg'],
    ['Remote', '/dashboard/remote/', 'Main_Navigation/remote.svg'],
    ['Earnings', '/dashboard/earnings/', 'Main_Navigation/earnings.svg'],
    ['Strategies', '/dashboard/strategies/', 'Main_Navigation/strategies.svg'],
    ['Health', '/dashboard/health/', '/assets/dashboard-icons/health.svg'],
    ['Devices', '/dashboard/devices/', 'Main_Navigation/devices.svg'],
    ['Notifications', '/dashboard/notifications/', 'Main_Navigation/notifications.svg'],
    ['Settings', '/dashboard/settings/', 'Main_Navigation/settings.svg']
  ];
  const iconRoot = '/assets/dashboard-icons/flat/SVG_Source/';
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  const trigger = document.createElement('button');
  trigger.className = 'dashboard-command-trigger';
  trigger.type = 'button';
  trigger.innerHTML = `<img src="${iconRoot}General_Controls/search.svg" alt=""><span>Jump to a page</span><kbd>${shortcut}</kbd>`;
  nav.before(trigger);

  const dialog = document.createElement('dialog');
  dialog.className = 'dashboard-command-dialog';
  dialog.setAttribute('aria-label', 'Jump to a dashboard page');
  dialog.innerHTML = `
    <label class="dashboard-command-search">
      <img src="${iconRoot}General_Controls/search.svg" alt="">
      <input type="search" autocomplete="off" placeholder="Search dashboard" aria-label="Search dashboard pages">
      <button type="button" aria-label="Close">×</button>
    </label>
    <nav class="dashboard-command-options" aria-label="Dashboard pages"></nav>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const options = dialog.querySelector('.dashboard-command-options');
  let activeIndex = 0;
  const items = routes.map(([name, href, icon]) => {
    const link = document.createElement('a');
    link.className = 'dashboard-command-option';
    link.href = href;
    link.setAttribute('role', 'option');
    const iconSrc = icon.startsWith('/') ? icon : `${iconRoot}${icon}`;
    link.innerHTML = `<img src="${iconSrc}" alt=""><span>${name}</span><kbd>↵</kbd>`;
    options.append(link);
    return link;
  });
  const prefetched = new Set();
  function prefetchPage(link) {
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !target.pathname.startsWith('/dashboard/') || target.pathname === location.pathname || prefetched.has(target.pathname)) return;
    prefetched.add(target.pathname);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = target.href;
    document.head.append(hint);
  }
  [...nav.querySelectorAll('a[href^="/dashboard/"]'), ...items].forEach(link => {
    link.addEventListener('pointerenter', () => prefetchPage(link), { once: true, passive: true });
    link.addEventListener('focus', () => prefetchPage(link), { once: true });
    link.addEventListener('touchstart', () => prefetchPage(link), { once: true, passive: true });
  });
  const empty = document.createElement('p');
  empty.className = 'dashboard-command-empty';
  empty.textContent = 'No matching pages.';
  empty.hidden = true;
  options.append(empty);

  function render() {
    const query = input.value.trim().toLocaleLowerCase();
    const visible = items.filter(item => item.textContent.toLocaleLowerCase().includes(query));
    activeIndex = visible.length ? Math.max(0, Math.min(activeIndex, visible.length - 1)) : -1;
    items.forEach(item => {
      const show = visible.includes(item);
      item.hidden = !show;
      item.setAttribute('aria-selected', String(show && visible[activeIndex] === item));
    });
    empty.hidden = visible.length > 0;
    return visible;
  }
  function open() {
    if (!dialog.open) dialog.showModal();
    input.value = '';
    activeIndex = 0;
    render();
    requestAnimationFrame(() => input.focus());
  }
  function close() { if (dialog.open) dialog.close(); trigger.focus(); }

  trigger.addEventListener('click', open);
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  input.addEventListener('input', () => { activeIndex = 0; render(); });
  input.addEventListener('keydown', event => {
    const visible = items.filter(item => !item.hidden);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = visible.length ? (activeIndex + (event.key === 'ArrowDown' ? 1 : visible.length - 1)) % visible.length : 0;
      render();
    }
    if (event.key === 'Enter' && visible.length && activeIndex >= 0) { event.preventDefault(); visible[activeIndex]?.click(); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  });
})();
