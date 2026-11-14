(() => {
  const greeting = document.querySelector('[data-overview-greeting]');
  if (greeting) {
    const hour = new Date().getHours();
    greeting.textContent = hour < 5 || hour >= 21
      ? 'Good night!'
      : hour < 12
        ? 'Good morning!'
        : hour < 17
          ? 'Good afternoon!'
          : 'Good evening!';
  }

  const macroStatus = document.querySelector('[data-overview-macro]');
  const macroDetail = document.querySelector('[data-overview-macro-detail]');
  const stateLine = document.querySelector('[data-overview-state]');
  const connectLink = document.querySelector('[data-overview-connect]');
  const strategyValue = document.querySelector('[data-overview-strategy]');
  const strategyDetail = document.querySelector('[data-overview-strategy-detail]');
  const number = new Intl.NumberFormat();

  function setResource(key, value) {
    const element = document.querySelector(`[data-overview-widget="${key}"] .overview-metric-value strong`);
    if (element) element.textContent = Number.isSafeInteger(value) && value > 0 ? number.format(value) : '—';
  }

  function relativeTime(value) {
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function renderCoinsChart(buckets = []) {
    const chart = document.querySelector('.overview-chart');
    const empty = chart?.querySelector('[data-overview-earnings-empty]');
    if (!chart || !empty) return;
    chart.querySelector('.overview-chart-bars')?.remove();
    const max = Math.max(0, ...buckets.map(bucket => Number.isSafeInteger(bucket.coins) ? bucket.coins : 0));
    if (max <= 0) {
      empty.hidden = false;
      empty.textContent = 'No coins synced this week.';
      return;
    }
    empty.hidden = true;
    const bars = document.createElement('div');
    bars.className = 'overview-chart-bars';
    bars.setAttribute('role', 'list');
    for (const bucket of buckets.slice(-7)) {
      const amount = Number.isSafeInteger(bucket.coins) ? bucket.coins : 0;
      const date = new Date(bucket.start);
      const column = document.createElement('div');
      column.className = 'overview-bar-column';
      column.setAttribute('role', 'listitem');
      column.setAttribute('aria-label', `${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${number.format(amount)} coins`);
      const track = document.createElement('span');
      track.className = 'overview-bar-track';
      const bar = document.createElement('i');
      bar.style.setProperty('--bar-size', `${amount > 0 ? Math.max(7, amount / max * 100) : 0}%`);
      track.append(bar);
      const label = document.createElement('span');
      label.className = 'overview-bar-label';
      label.textContent = date.toLocaleDateString(undefined, { weekday: 'short' });
      const value = document.createElement('span');
      value.className = 'overview-bar-value';
      value.textContent = amount ? number.format(amount) : '';
      column.append(value, track, label);
      bars.append(column);
    }
    chart.append(bars);
  }

  const eventTitles = {
    'run.started': ['Run started', 'run_started'],
    'run.paused': ['Run paused', 'run_paused'],
    'run.resumed': ['Run resumed', 'run_resumed'],
    'run.stopped': ['Run stopped', 'run_stopped'],
    'game.joined': ['Joined Roblox', 'joined_roblox'],
    'mode.selected': ['Mode selected', 'mode_selected'],
    'match.started': ['Match started', 'match_started'],
    'boss.appeared': ['Boss appeared', 'boss_appeared'],
    'boss.defeated': ['Boss defeated', 'boss_defeated'],
    'match.victory': ['Victory', 'victory'],
    'match.loss': ['Loss', 'loss'],
    'reward.claimed': ['Reward claimed', 'reward_claimed']
  };
  const actionTitles = {
    spawntower: ['Tower placed', 'tower_placed'], upgradetower: ['Tower upgraded', 'tower_upgraded'],
    selltower: ['Tower sold', 'tower_sold'], changetargets: ['Target changed', 'target_mode_changed'],
    clonetower: ['Tower cloned', 'tower_placed']
  };

  function renderRecentActivity(events = []) {
    const list = document.querySelector('.overview-activity-list');
    const empty = list?.querySelector('[data-overview-activity-empty]');
    if (!list || !empty) return;
    list.querySelectorAll('.overview-event').forEach(row => row.remove());
    const supported = events
      .filter(event => event && typeof event.occurredAt === 'string')
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .map(event => {
        const action = String(event.data?.action || '').toLowerCase();
        const definition = actionTitles[action] || eventTitles[event.type];
        return definition ? { event, title: definition[0], icon: definition[1] } : null;
      })
      .filter(Boolean)
      .slice(0, 4);
    empty.hidden = supported.length > 0;
    for (const { event, title, icon } of supported) {
      const row = document.createElement('li');
      row.className = 'overview-event';
      const marker = document.createElement('span');
      marker.className = 'overview-event-icon';
      marker.style.setProperty('--icon-url', `url('/assets/dashboard-icons/flat/Activity_Feed/${icon}.svg')`);
      marker.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'overview-event-copy';
      const heading = document.createElement('strong');
      heading.textContent = title;
      copy.append(heading);
      const detailText = event.data?.detail || [event.data?.map, event.data?.mode].filter(Boolean).join(' · ');
      if (detailText) {
        const detail = document.createElement('small');
        detail.textContent = detailText;
        copy.append(detail);
      }
      const time = document.createElement('time');
      time.dateTime = event.occurredAt;
      time.textContent = relativeTime(event.occurredAt);
      row.append(marker, copy, time);
      list.append(row);
    }
  }

  window.UMDashboardState?.subscribe((state) => {
    const device = window.UMDashboardState.activeDesktop(state);
    const snapshot = device?.snapshot;
    if (connectLink) connectLink.hidden = Boolean(device?.state === 'connected' && snapshot);
    if (!device || device.state !== 'connected' || !snapshot) {
      if (macroStatus) macroStatus.textContent = device?.state === 'offline' ? 'Offline' : '—';
      if (macroDetail) macroDetail.textContent = '';
      if (strategyValue) strategyValue.textContent = '—';
      if (strategyDetail) strategyDetail.textContent = '';
      if (stateLine) stateLine.textContent = state.unavailable
        ? 'Could not reach your PC right now.'
        : !device
          ? 'Connect the macro to see its status.'
          : device.state === 'offline'
            ? 'Your PC is offline.'
            : 'Waiting for your PC…';
      return;
    }

    const labels = { running: 'Running', paused: 'Paused', stopped: 'Stopped' };
    const statusLabel = labels[snapshot.runState] || '—';
    const details = [snapshot.activeStrategy, snapshot.map, snapshot.mode].filter(Boolean);
    if (macroStatus) macroStatus.textContent = statusLabel;
    if (macroDetail) macroDetail.textContent = details.join(' · ') || 'No strategy selected';
    if (strategyValue) strategyValue.textContent = snapshot.activeStrategy || '—';
    if (strategyDetail) strategyDetail.textContent = [snapshot.map, snapshot.mode].filter(Boolean).join(' · ') || 'Current selection';
    if (stateLine) stateLine.textContent = snapshot.runState === 'running'
      ? "We're grinding!"
      : snapshot.runState === 'paused'
        ? 'Taking a breather.'
        : 'Your macro is stopped right now.';
  });

  async function refreshDashboardOverview() {
    const requests = await Promise.allSettled([
      fetch('/api/dashboard/v1/earnings?range=week', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } }),
      fetch('/api/dashboard/v1/events?limit=20', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } })
    ]);
    const [earningsResult, eventsResult] = requests;
    if (earningsResult.status === 'fulfilled' && earningsResult.value.ok) {
      const earnings = await earningsResult.value.json().catch(() => ({}));
      const totals = earnings.totals || {};
      setResource('coins', totals.coins);
      setResource('gems', totals.gems);
      setResource('towerXp', totals.towerXp);
      renderCoinsChart(Array.isArray(earnings.buckets) ? earnings.buckets : []);
    }
    if (eventsResult.status === 'fulfilled' && eventsResult.value.ok) {
      const events = await eventsResult.value.json().catch(() => ({}));
      renderRecentActivity(Array.isArray(events.events) ? events.events : []);
    }
  }
  refreshDashboardOverview();
  window.setInterval(() => { if (document.visibilityState === 'visible') refreshDashboardOverview(); }, 30000);

  const editor = document.querySelector('[data-overview-editor]');
  const openEditor = document.querySelector('[data-open-overview-editor]');
  const sizeKeys = ['macro', 'runtime', 'coins', 'gems', 'towerXp', 'chart', 'activity'];
  const metricKeys = ['macro', 'runtime', 'coins', 'gems', 'towerXp'];
  const panelKeys = ['chart', 'activity'];
  const balanced = Object.fromEntries(sizeKeys.map((key) => [key, 'standard']));
  balanced.order = [...sizeKeys];
  const presets = {
    balanced,
    compact: { ...Object.fromEntries(sizeKeys.map((key) => [key, 'small'])), order: [...sizeKeys] },
    wide: { ...balanced, chart: 'large', activity: 'large' }
  };
  const storageKey = 'um-overview-layout-v1';
  let savedLayout = readLayout();
  let draft = { ...savedLayout, hidden: [...savedLayout.hidden], order: [...savedLayout.order] };

  function readLayout() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const order = Array.isArray(parsed.order) ? parsed.order.filter((key, index) => sizeKeys.includes(key) && parsed.order.indexOf(key) === index) : [];
      sizeKeys.forEach(key => { if (!order.includes(key)) order.push(key); });
      return {
        ...Object.fromEntries(sizeKeys.map((key) => [key, ['small', 'standard', 'large'].includes(parsed[key]) ? parsed[key] : 'standard'])),
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter(key => sizeKeys.includes(key)) : [],
        order
      };
    } catch {
      return { ...balanced, hidden: [], order: [...sizeKeys] };
    }
  }

  function matchingPreset(layout) {
    if (layout.hidden.length) return undefined;
    return Object.keys(presets).find((name) => sizeKeys.every((key) => presets[name][key] === layout[key]) && presets[name].order.every((key, index) => layout.order[index] === key));
  }

  function applyLayout(layout) {
    sizeKeys.forEach((key) => {
      const widget = document.querySelector(`[data-overview-widget="${key}"]`);
      widget?.setAttribute('data-size', layout[key]);
      if (widget) widget.hidden = layout.hidden.includes(key);
    });
    for (const groupKeys of [metricKeys, panelKeys]) {
      const container = document.querySelector(groupKeys === metricKeys ? '.overview-metrics' : '.overview-lower-grid');
      if (!container) continue;
      for (const key of layout.order.filter(item => groupKeys.includes(item))) {
        const widget = container.querySelector(`[data-overview-widget="${key}"]`);
        if (widget) container.append(widget);
      }
    }
  }

  function renderEditor() {
    sizeKeys.forEach((key) => {
      const row = editor?.querySelector(`[data-editor-widget="${key}"]`);
      row?.querySelectorAll('[data-size]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.size === draft[key]));
      });
      const visible = row?.querySelector('[data-visible]');
      if (visible) visible.checked = !draft.hidden.includes(key);
      const group = metricKeys.includes(key) ? metricKeys : panelKeys;
      const position = draft.order.filter(item => group.includes(item)).indexOf(key);
      row?.querySelectorAll('[data-move]').forEach(button => {
        const nextPosition = position + Number(button.dataset.move);
        button.disabled = nextPosition < 0 || nextPosition >= group.length;
      });
    });
    const widgetList = editor?.querySelector('.overview-widget-list');
    if (widgetList) draft.order.forEach(key => {
      const row = widgetList.querySelector(`[data-editor-widget="${key}"]`);
      if (row) widgetList.append(row);
    });
    const selectedPreset = matchingPreset(draft);
    editor?.querySelectorAll('[data-layout-preset]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.layoutPreset === selectedPreset));
    });
  }

  function closeEditor() {
    if (editor?.open) editor.close();
    openEditor?.focus();
  }

  if (editor && openEditor) {
    applyLayout(savedLayout);
    renderEditor();
    openEditor.addEventListener('click', () => {
      draft = { ...savedLayout, hidden: [...savedLayout.hidden], order: [...savedLayout.order] };
      renderEditor();
      editor.showModal();
      requestAnimationFrame(() => editor.querySelector('[data-close-overview-editor]')?.focus());
    });

    editor.querySelector('[data-close-overview-editor]')?.addEventListener('click', closeEditor);
    editor.querySelector('[data-cancel-overview-editor]')?.addEventListener('click', closeEditor);
    editor.querySelector('[data-reset-overview-layout]')?.addEventListener('click', () => {
      draft = { ...balanced, hidden: [], order: [...sizeKeys] };
      renderEditor();
    });

    editor.querySelectorAll('[data-layout-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        draft = { ...presets[button.dataset.layoutPreset], hidden: [], order: [...presets[button.dataset.layoutPreset].order] };
        renderEditor();
      });
    });

    editor.querySelectorAll('.overview-widget-row [data-size]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.closest('[data-editor-widget]')?.dataset.editorWidget;
        if (!sizeKeys.includes(key)) return;
        draft[key] = button.dataset.size;
        renderEditor();
      });
    });

    editor.querySelectorAll('.overview-widget-row [data-move]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.closest('[data-editor-widget]')?.dataset.editorWidget;
        const group = metricKeys.includes(key) ? metricKeys : panelKeys;
        const from = draft.order.indexOf(key);
        const to = from + Number(button.dataset.move);
        const neighbor = draft.order[to];
        if (!group.includes(key) || !group.includes(neighbor)) return;
        [draft.order[from], draft.order[to]] = [draft.order[to], draft.order[from]];
        renderEditor();
      });
    });

    editor.querySelectorAll('.overview-widget-row [data-visible]').forEach((control) => {
      control.addEventListener('change', () => {
        const key = control.closest('[data-editor-widget]')?.dataset.editorWidget;
        if (!sizeKeys.includes(key)) return;
        const hidden = new Set(draft.hidden);
        if (control.checked) hidden.delete(key);
        else hidden.add(key);
        if (hidden.size === sizeKeys.length) {
          control.checked = true;
          editor.querySelector('[data-layout-status]').textContent = 'Keep at least one panel visible.';
          hidden.delete(key);
        } else {
          editor.querySelector('[data-layout-status]').textContent = '';
        }
        draft.hidden = [...hidden];
        renderEditor();
      });
    });

    editor.querySelector('[data-save-overview-layout]')?.addEventListener('click', () => {
      savedLayout = { ...draft, hidden: [...draft.hidden], order: [...draft.order] };
      try { localStorage.setItem(storageKey, JSON.stringify(savedLayout)); } catch { }
      applyLayout(savedLayout);
      renderEditor();
      closeEditor();
    });

    editor.addEventListener('click', (event) => {
      if (event.target === editor) closeEditor();
    });
  }
})();
