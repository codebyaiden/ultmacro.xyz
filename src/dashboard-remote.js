(() => {
  const deviceName = document.querySelector('[data-remote-device-name]');
  const deviceState = document.querySelector('[data-remote-device-state]');
  const currentRun = document.querySelector('[data-current-run]');
  window.UMDashboardState?.subscribe((state) => {
    const device = window.UMDashboardState.activeDesktop(state);
    const snapshot = device?.snapshot;
    if (deviceName) deviceName.textContent = device?.name || 'Windows PC';
    if (!device || device.state !== 'connected' || !snapshot) {
      if (deviceState) deviceState.textContent = device?.state === 'offline' ? 'Offline' : '';
      if (currentRun) currentRun.textContent = state.unavailable ? 'Macro data is unavailable.' : 'No live macro data.';
      return;
    }

    const runLabels = { running: 'Running', paused: 'Paused', stopped: 'Stopped' };
    if (deviceState) deviceState.textContent = runLabels[snapshot.runState] || '';
    const details = [snapshot.activeStrategy, snapshot.map, snapshot.mode].filter(Boolean);
    if (currentRun) currentRun.textContent = snapshot.runState === 'stopped'
      ? `Stopped${details.length ? ` · ${details.join(' · ')}` : ''}`
      : `${runLabels[snapshot.runState] || '—'}${details.length ? ` · ${details.join(' · ')}` : ''}`;
  });

  const settings = document.querySelector('[data-remote-preferences]');
  if (!settings) return;

  const storageKey = 'um.dashboard.remote-behavior.v1';
  const status = document.querySelector('[data-remote-save-state]');
  const defaults = { autoEquip: true, alternateStrategies: false, repeatAfterResult: false };
  let saved = { ...defaults };
  let clearStatusTimer = 0;

  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (value && typeof value === 'object') {
      for (const key of Object.keys(defaults)) {
        if (typeof value[key] === 'boolean') saved[key] = value[key];
      }
    }
  } catch {
    // The controls remain usable for this visit if browser storage is blocked.
  }

  settings.querySelectorAll('input[data-setting]').forEach((input) => {
    const key = input.dataset.setting;
    input.checked = saved[key];
    input.addEventListener('change', () => {
      saved[key] = input.checked;
      try {
        localStorage.setItem(storageKey, JSON.stringify(saved));
        if (status) status.textContent = 'Saved';
      } catch {
        if (status) status.textContent = 'Could not save';
      }
      window.clearTimeout(clearStatusTimer);
      clearStatusTimer = window.setTimeout(() => {
        if (status) status.textContent = '';
      }, 1800);
    });
  });
})();
