(() => {
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
