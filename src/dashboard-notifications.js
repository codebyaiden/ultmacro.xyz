(() => {
  const root = document.querySelector('[data-notification-preferences]');
  if (!root) return;

  const storageKey = 'um.dashboard.notifications.v1';
  const defaults = { results: 'all', runEvents: 'bosses', connection: 'offline' };
  const allowed = {
    results: new Set(['all', 'errors', 'off']),
    runEvents: new Set(['bosses', 'all', 'off']),
    connection: new Set(['all', 'offline', 'off'])
  };
  const status = document.querySelector('[data-save-status]');
  let preferences = { ...defaults };

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored && typeof stored === 'object') {
      for (const [key, values] of Object.entries(allowed)) {
        if (values.has(stored[key])) preferences[key] = stored[key];
      }
    }
  } catch {
    // Keep the controls usable with defaults when storage is unavailable.
  }

  function paint(group, selectedValue) {
    const buttons = [...group.querySelectorAll('[role="radio"][data-value]')];
    buttons.forEach((button) => {
      const selected = button.dataset.value === selectedValue;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  }

  function select(group, value, focus = false) {
    const key = group.dataset.preference;
    if (!allowed[key]?.has(value)) return;
    preferences[key] = value;
    paint(group, value);
    if (focus) group.querySelector(`[data-value="${CSS.escape(value)}"]`)?.focus();
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
      if (status) status.textContent = 'Preferences saved on this device.';
    } catch {
      if (status) status.textContent = 'Could not save preferences in this browser.';
    }
  }

  root.querySelectorAll('[data-preference]').forEach((group) => {
    const key = group.dataset.preference;
    paint(group, preferences[key]);
    const buttons = [...group.querySelectorAll('[role="radio"][data-value]')];
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(group, button.dataset.value));
      button.addEventListener('keydown', (event) => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        select(group, buttons[next].dataset.value, true);
      });
    });
  });
})();
