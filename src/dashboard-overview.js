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
  window.UMDashboardState?.subscribe((state) => {
    const device = window.UMDashboardState.activeDesktop(state);
    const snapshot = device?.snapshot;
    if (!device || device.state !== 'connected' || !snapshot) {
      if (macroStatus) macroStatus.textContent = device?.state === 'offline' ? 'Offline' : '—';
      if (macroDetail) macroDetail.textContent = device?.state === 'offline' ? 'No live data' : 'Waiting for macro data';
      if (stateLine) stateLine.textContent = state.unavailable ? 'Macro data is unavailable.' : 'Waiting for macro data.';
      return;
    }

    const labels = { running: 'Running', paused: 'Paused', stopped: 'Stopped' };
    const statusLabel = labels[snapshot.runState] || '—';
    const details = [snapshot.activeStrategy, snapshot.map, snapshot.mode].filter(Boolean);
    if (macroStatus) macroStatus.textContent = statusLabel;
    if (macroDetail) macroDetail.textContent = details.join(' · ') || 'No strategy selected';
    if (stateLine) stateLine.textContent = snapshot.runState === 'running'
      ? 'Your macro is running.'
      : snapshot.runState === 'paused'
        ? 'Your macro is paused.'
        : 'Your macro is stopped right now.';
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
