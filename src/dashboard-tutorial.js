(() => {
  if (!document.body.classList.contains('dashboard-app-page')) return;

  const storageKey = 'um-dashboard-tour-v2';
  const path = window.location.pathname;
  const steps = [
    { route: '/dashboard/overview/', target: '.overview-welcome', title: 'Overview', body: 'Your macro, strategy, recent activity, and earnings at a glance.' },
    { route: '/dashboard/remote/', target: '.remote-control-actions', title: 'Remote controls', body: 'Start, pause, resume, or stop the macro from here.' },
    { route: '/dashboard/remote/', target: '.remote-run-readout', title: 'Current run', body: 'Check the selected strategy and the details of the match in progress.' },
    { route: '/dashboard/activity/', target: '.activity-list', title: 'Activity', body: 'See macro actions and results, newest first. Filters help narrow the list.' },
    { route: '/dashboard/strategies/', target: '[data-strategy-device-list]', title: 'Strategies', body: 'Choose any saved strategy or edit its code. Updates go to your PC.' },
    { route: '/dashboard/earnings/', target: '.earnings-chart-panel', title: 'Earnings', body: 'Track synced coins, gems, and Tower XP across the selected time range.' },
    { route: '/dashboard/devices/', target: '[data-devices-list]', title: 'Devices', body: 'Add a phone or PC, review linked devices, or sign one out.' },
    { route: '/dashboard/notifications/', target: '[data-notification-preferences]', title: 'Notifications', body: 'Pick which macro updates reach your phone and how often.' },
    { route: '/dashboard/settings/', target: '.settings-sections', title: 'Settings', body: 'Adjust dashboard preferences and restart this tour whenever you need it.' }
  ];

  let state;
  try { state = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { state = {}; }
  let active = Boolean(state.active);
  let index = Number.isInteger(state.step) ? Math.max(0, Math.min(steps.length - 1, state.step)) : 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const dialog = document.createElement('dialog');
  dialog.className = 'dashboard-tour-dialog';
  dialog.setAttribute('aria-label', 'Dashboard tour');
  dialog.innerHTML = `
    <svg class="dashboard-tour-shade" aria-hidden="true" focusable="false" preserveAspectRatio="none">
      <path data-shade></path>
      <rect class="dashboard-tour-spot" data-spot rx="12" ry="12"></rect>
    </svg>
    <section class="dashboard-tour-card" role="document">
      <button class="dashboard-tour-close" type="button" data-tour-skip aria-label="Skip tour">×</button>
      <div class="dashboard-tour-progress"><span data-tour-count></span><span class="dashboard-tour-progress-track"><span data-tour-progress></span></span></div>
      <h2 data-tour-title></h2><p data-tour-body></p>
      <div class="dashboard-tour-actions"><button class="dashboard-tour-back" type="button" data-tour-back>Back</button><div><button type="button" data-tour-skip>Skip</button><button class="dashboard-tour-next" type="button" data-tour-next>Next</button></div></div>
    </section>`;
  document.body.append(dialog);

  const shade = dialog.querySelector('[data-shade]');
  const spot = dialog.querySelector('[data-spot]');
  const card = dialog.querySelector('.dashboard-tour-card');
  const title = dialog.querySelector('[data-tour-title]');
  const body = dialog.querySelector('[data-tour-body]');
  const count = dialog.querySelector('[data-tour-count]');
  const progress = dialog.querySelector('[data-tour-progress]');
  const back = dialog.querySelector('[data-tour-back]');
  const next = dialog.querySelector('[data-tour-next]');

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ active, step: index, seen: !active })); } catch { }
  }

  function close() {
    active = false;
    save();
    if (dialog.open) dialog.close();
  }

  function place() {
    if (!dialog.open) return;
    const step = steps[index];
    const target = document.querySelector(step.target);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    dialog.querySelector('svg').setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    if (target) {
      const rect = target.getBoundingClientRect();
      const pad = 7;
      const x = Math.max(5, rect.left - pad);
      const y = Math.max(5, rect.top - pad);
      const width = Math.min(vw - x - 5, rect.width + pad * 2);
      const height = Math.min(vh - y - 5, rect.height + pad * 2);
      shade.setAttribute('d', `M0 0H${vw}V${vh}H0Z M${x+12} ${y}H${x+width-12}Q${x+width} ${y} ${x+width} ${y+12}V${y+height-12}Q${x+width} ${y+height} ${x+width-12} ${y+height}H${x+12}Q${x} ${y+height} ${x} ${y+height-12}V${y+12}Q${x} ${y} ${x+12} ${y}Z`);
      spot.setAttribute('x', x); spot.setAttribute('y', y); spot.setAttribute('width', width); spot.setAttribute('height', height);
      spot.dataset.pulse = 'true';
      window.setTimeout(() => { if (spot.isConnected) spot.dataset.pulse = 'false'; }, 850);
      const cardRect = card.getBoundingClientRect();
      const margin = 16;
      let left = Math.min(vw - cardRect.width - margin, Math.max(margin, rect.left + rect.width / 2 - cardRect.width / 2));
      let top = rect.bottom + 18;
      if (top + cardRect.height > vh - margin) top = rect.top - cardRect.height - 18;
      if (top < margin) top = Math.min(vh - cardRect.height - margin, Math.max(margin, (vh - cardRect.height) / 2));
      card.style.left = `${left}px`; card.style.top = `${top}px`;
    } else {
      shade.setAttribute('d', `M0 0H${vw}V${vh}H0Z`);
      spot.setAttribute('width', 0); spot.setAttribute('height', 0);
      card.style.left = `${Math.max(16, (vw - card.offsetWidth) / 2)}px`;
      card.style.top = `${Math.max(16, (vh - card.offsetHeight) / 2)}px`;
    }
  }

  function render() {
    const step = steps[index];
    if (window.location.pathname !== step.route) {
      save();
      window.location.assign(step.route);
      return;
    }
    active = true;
    title.textContent = step.title;
    body.textContent = step.body;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
    progress.style.width = `${((index + 1) / steps.length) * 100}%`;
    back.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? 'Done' : 'Next';
    dialog.dataset.reduced = String(reduceMotion.matches);
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          target.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
      }
      requestAnimationFrame(place);
    });
    save();
  }

  function start() { index = 0; active = true; render(); }
  dialog.querySelectorAll('[data-tour-skip]').forEach(button => button.addEventListener('click', close));
  next.addEventListener('click', () => {
    if (index === steps.length - 1) { close(); return; }
    index += 1;
    render();
  });
  back.addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });
  window.addEventListener('resize', place, { passive: true });
  document.addEventListener('scroll', place, { passive: true, capture: true });
  reduceMotion.addEventListener?.('change', () => { dialog.dataset.reduced = String(reduceMotion.matches); });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-start-dashboard-tour]')) { event.preventDefault(); start(); }
  });
  document.addEventListener('keydown', event => { if (dialog.open && event.key === 'Escape') { event.preventDefault(); close(); } });
  document.addEventListener('keydown', event => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && !next.disabled) { event.preventDefault(); next.click(); }
    if (event.key === 'ArrowLeft' && !back.disabled) { event.preventDefault(); back.click(); }
  });

  if (active) render();
  else if (!state.seen && !state.active && path === '/dashboard/overview/') window.setTimeout(start, 900);
})();
