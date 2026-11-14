(() => {
  if (!document.body.classList.contains('dashboard-app-page')) return;

  const storageKey = 'um-dashboard-tour-v2';
  const initialPath = window.location.pathname;
  const steps = [
    { route: '/dashboard/overview/', target: '.overview-metric-state', title: 'Overview', body: 'See your macro’s current state alongside activity and earnings.' },
    { route: '/dashboard/remote/', target: '.remote-control-actions', title: 'Remote', body: 'Start, pause, or stop a run from here.' },
    { route: '/dashboard/remote/', target: '.remote-readout-heading', title: 'Current run', body: 'See the selected strategy and match details here.' },
    { route: '/dashboard/activity/', target: '[data-filter-toggle]', title: 'Activity', body: 'Use Filters to narrow the event list.' },
    { route: '/dashboard/strategies/', target: '.strategy-view-tabs', title: 'Strategies', body: 'Switch between strategies on your PC and the shared Library.' },
    { route: '/dashboard/earnings/', target: '.earnings-ranges', title: 'Earnings', body: 'Change the chart period to review your synced rewards.' },
    { route: '/dashboard/health/', target: '[data-health-gauge="cpu"]', title: 'Health', body: 'Check your PC’s live processor, memory, graphics, and temperature readings.' },
    { route: '/dashboard/devices/', target: '[data-open-devices]', title: 'Devices', body: 'Add a phone or another PC to your Dashboard.' },
    { route: '/dashboard/notifications/', target: '[data-preference="results"]', title: 'Notifications', body: 'Choose which run updates reach your phone.' },
    { route: '/dashboard/settings/', target: '[data-start-dashboard-tour]', title: 'Settings', body: 'Adjust the dashboard and restart this tour whenever you like.' }
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
      <rect class="dashboard-tour-spot" data-spot rx="11" ry="11"></rect>
    </svg>
    <section class="dashboard-tour-card" role="document" aria-live="polite">
      <div class="dashboard-tour-header"><button class="dashboard-tour-close" type="button" data-tour-close aria-label="Close tour">×</button></div>
      <h2 data-tour-title></h2><p data-tour-body></p>
      <div class="dashboard-tour-actions"><button class="dashboard-tour-back" type="button" data-tour-back>Back</button><div><button type="button" data-tour-skip>Skip</button><button class="dashboard-tour-next" type="button" data-tour-next>Next</button></div></div>
    </section>`;
  document.body.append(dialog);

  const shade = dialog.querySelector('[data-shade]');
  const spot = dialog.querySelector('[data-spot]');
  const card = dialog.querySelector('.dashboard-tour-card');
  const title = dialog.querySelector('[data-tour-title]');
  const body = dialog.querySelector('[data-tour-body]');
  const back = dialog.querySelector('[data-tour-back]');
  const next = dialog.querySelector('[data-tour-next]');
  let pendingTarget = null;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ active, step: index, seen: !active })); } catch { }
  }

  function close() {
    active = false;
    pendingTarget?.removeAttribute('data-tour-pending');
    pendingTarget = null;
    save();
    if (dialog.open) dialog.close();
    window.dispatchEvent(new Event('dashboard:tour-closed'));
  }

  function positionCard(rect, viewportWidth, viewportHeight) {
    const cardRect = card.getBoundingClientRect();
    const margin = 16;
    const left = Math.max(margin, Math.min(viewportWidth - cardRect.width - margin, rect.left + rect.width / 2 - cardRect.width / 2));
    let top = rect.bottom + 16;
    if (top + cardRect.height > viewportHeight - margin) top = rect.top - cardRect.height - 16;
    if (top < margin) top = Math.max(margin, Math.min(viewportHeight - cardRect.height - margin, (viewportHeight - cardRect.height) / 2));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function setSpot(rect, vw, vh) {
    const pad = 5;
    const x = Math.max(5, Math.min(vw - 10, rect.left - pad));
    const y = Math.max(5, Math.min(vh - 10, rect.top - pad));
    const width = Math.max(0, Math.min(vw - x - 5, rect.width + pad * 2));
    const height = Math.max(0, Math.min(vh - y - 5, rect.height + pad * 2));
    shade.setAttribute('d', `M0 0H${vw}V${vh}H0Z M${x+11} ${y}H${x+width-11}Q${x+width} ${y} ${x+width} ${y+11}V${y+height-11}Q${x+width} ${y+height} ${x+width-11} ${y+height}H${x+11}Q${x} ${y+height} ${x} ${y+height-11}V${y+11}Q${x} ${y} ${x+11} ${y}Z`);
    spot.setAttribute('x', x); spot.setAttribute('y', y);
    spot.setAttribute('width', width); spot.setAttribute('height', height);
    spot.dataset.pulse = 'true';
    window.setTimeout(() => { if (spot.isConnected) spot.dataset.pulse = 'false'; }, 850);
    positionCard(rect, vw, vh);
  }

  function place() {
    if (!dialog.open || !active) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    dialog.querySelector('svg').setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    const step = steps[index];
    const samePage = window.location.pathname === step.route;
    const target = samePage ? document.querySelector(step.target) : null;
    const navTarget = document.querySelector(`.dashboard-section-nav a[href="${step.route}"]`);
    const highlighted = target || navTarget;
    if (pendingTarget && pendingTarget !== highlighted) pendingTarget.removeAttribute('data-tour-pending');
    pendingTarget = navTarget && !samePage ? navTarget : null;
    pendingTarget?.setAttribute('data-tour-pending', 'true');

    if (highlighted) {
      const rect = highlighted.getBoundingClientRect();
      setSpot(rect, vw, vh);
      if (!samePage) {
        const cardRect = card.getBoundingClientRect();
        const margin = 16;
        if (window.matchMedia('(max-width: 920px)').matches) {
          card.style.left = `${Math.max(margin, Math.min(vw - cardRect.width - margin, (vw - cardRect.width) / 2))}px`;
          card.style.top = `${Math.max(margin, Math.min(vh - cardRect.height - margin, rect.bottom + 14))}px`;
        } else {
          card.style.left = `${Math.max(margin, Math.min(vw - cardRect.width - margin, rect.right + 18))}px`;
          card.style.top = `${Math.max(margin, Math.min(vh - cardRect.height - margin, rect.top + rect.height / 2 - cardRect.height / 2))}px`;
        }
      }
    } else {
      shade.setAttribute('d', `M0 0H${vw}V${vh}H0Z`);
      spot.setAttribute('width', 0); spot.setAttribute('height', 0);
      positionCard({ left: vw / 2, right: vw / 2, top: vh / 2, bottom: vh / 2, width: 0, height: 0 }, vw, vh);
    }
  }

  function render() {
    const step = steps[index];
    const samePage = window.location.pathname === step.route;
    active = true;
    title.textContent = step.title;
    body.textContent = samePage ? step.body : `Tap “${step.title}” in the sidebar to keep going.`;
    back.disabled = index === 0;
    next.hidden = !samePage;
    next.textContent = index === steps.length - 1 ? 'Done' : 'Next';
    dialog.dataset.reduced = String(reduceMotion.matches);
    if (!dialog.open) dialog.show();
    dialog.style.pointerEvents = 'none';
    card.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      const target = samePage ? document.querySelector(step.target) : document.querySelector(`.dashboard-section-nav a[href="${step.route}"]`);
      if (target) {
        const rect = target.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) target.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
      requestAnimationFrame(place);
    });
    save();
  }

  function start() { index = 0; active = true; render(); }

  dialog.querySelector('[data-tour-close]').addEventListener('click', close);
  dialog.querySelector('[data-tour-skip]').addEventListener('click', close);
  next.addEventListener('click', () => {
    if (index === steps.length - 1) { close(); return; }
    const following = steps[index + 1];
    index += 1;
    render();
  });
  back.addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-start-dashboard-tour]')) { event.preventDefault(); start(); return; }
    if (!active) return;
    const link = event.target.closest('.dashboard-section-nav a');
    if (!link) return;
    const nextRoute = new URL(link.href, window.location.href).pathname;
    if (nextRoute === steps[index].route) return;
    const nextIndex = steps.findIndex((step, stepIndex) => stepIndex > index && step.route === nextRoute);
    if (nextIndex >= 0) { index = nextIndex; save(); }
  }, true);
  window.addEventListener('resize', place, { passive: true });
  document.addEventListener('scroll', place, { passive: true, capture: true });
  reduceMotion.addEventListener?.('change', () => { dialog.dataset.reduced = String(reduceMotion.matches); });
  document.addEventListener('keydown', event => { if (dialog.open && event.key === 'Escape') { event.preventDefault(); close(); } });
  document.addEventListener('keydown', event => {
    if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' && !next.hidden && !next.disabled) { event.preventDefault(); next.click(); }
    if (event.key === 'ArrowLeft' && !back.disabled) { event.preventDefault(); back.click(); }
  });

  if (active) render();
  else if (!state.seen && !state.active && initialPath === '/dashboard/overview/') window.setTimeout(start, 900);
})();
