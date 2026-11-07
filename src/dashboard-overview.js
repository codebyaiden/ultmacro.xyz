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

  const chart = document.querySelector('.overview-chart');
  const bars = document.querySelector('[data-chart-bars]');
  const summary = document.querySelector('[data-chart-summary]');
  const ranges = {
    '7d': {
      total: '18h 26m',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [2.1, 3.4, 1.8, 4.2, 2.7, 3.1, 1.2]
    },
    '30d': {
      total: '74h 12m',
      labels: ['8', '12', '16', '20', '24', '28', '6'],
      values: [6.4, 9.1, 7.2, 12.8, 9.6, 15.3, 13.8]
    }
  };

  function showRange(range) {
    if (!bars || !summary || !ranges[range]) return;
    const dataset = ranges[range];
    const max = Math.max(...dataset.values);
    const columns = [...bars.querySelectorAll('.overview-bar-column')];
    columns.forEach((column, index) => {
      const value = dataset.values[index];
      const label = dataset.labels[index];
      column.querySelector('.overview-bar-value').textContent = `${value.toFixed(1)}h`;
      column.querySelector('.overview-bar-label').textContent = label;
      column.querySelector('.overview-bar-track i').style.setProperty('--bar-size', `${Math.max(16, Math.round(value / max * 88))}%`);
    });
    summary.innerHTML = `Last ${range === '7d' ? '7 days' : '30 days'} <span>·</span> ${dataset.total}`;
    chart?.setAttribute('aria-label', `Sample run time chart for the last ${range === '7d' ? 'seven' : 'thirty'} days`);
  }

  document.querySelectorAll('[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      const range = button.dataset.range;
      document.querySelectorAll('[data-range]').forEach((other) => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      showRange(range);
    });
  });

  const editor = document.querySelector('[data-overview-editor]');
  const openEditor = document.querySelector('[data-open-overview-editor]');
  const sizeKeys = ['macro', 'runtime', 'coins', 'gems', 'towerXp', 'chart', 'activity'];
  const balanced = Object.fromEntries(sizeKeys.map((key) => [key, 'standard']));
  const presets = {
    balanced,
    compact: Object.fromEntries(sizeKeys.map((key) => [key, 'small'])),
    wide: { ...balanced, chart: 'large', activity: 'large' }
  };
  const storageKey = 'um-overview-layout-v1';
  let savedLayout = readLayout();
  let draft = { ...savedLayout };

  function readLayout() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return Object.fromEntries(sizeKeys.map((key) => [key, ['small', 'standard', 'large'].includes(parsed[key]) ? parsed[key] : 'standard']));
    } catch {
      return { ...balanced };
    }
  }

  function matchingPreset(layout) {
    return Object.keys(presets).find((name) => sizeKeys.every((key) => presets[name][key] === layout[key]));
  }

  function applyLayout(layout) {
    sizeKeys.forEach((key) => {
      document.querySelector(`[data-overview-widget="${key}"]`)?.setAttribute('data-size', layout[key]);
    });
  }

  function renderEditor() {
    sizeKeys.forEach((key) => {
      const row = editor?.querySelector(`[data-editor-widget="${key}"]`);
      row?.querySelectorAll('[data-size]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.size === draft[key]));
      });
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
      draft = { ...savedLayout };
      renderEditor();
      editor.showModal();
      requestAnimationFrame(() => editor.querySelector('[data-close-overview-editor]')?.focus());
    });

    editor.querySelector('[data-close-overview-editor]')?.addEventListener('click', closeEditor);
    editor.querySelector('[data-cancel-overview-editor]')?.addEventListener('click', closeEditor);
    editor.querySelector('[data-reset-overview-layout]')?.addEventListener('click', () => {
      draft = { ...balanced };
      renderEditor();
    });

    editor.querySelectorAll('[data-layout-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        draft = { ...presets[button.dataset.layoutPreset] };
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

    editor.querySelector('[data-save-overview-layout]')?.addEventListener('click', () => {
      savedLayout = { ...draft };
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
