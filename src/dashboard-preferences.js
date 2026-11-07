(() => {
  if (!document.body.classList.contains('dashboard-app-page')) return;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' }).catch(() => {});
  }
  const key = 'um-dashboard-preferences-v1';
  const defaults = { density: 'comfortable', accent: 'violet', provider: 'openai' };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { }
  const prefs = { ...defaults, ...saved };
  if (!['comfortable', 'compact'].includes(prefs.density)) prefs.density = defaults.density;
  if (!['violet', 'neutral'].includes(prefs.accent)) prefs.accent = defaults.accent;
  if (!['openai', 'anthropic'].includes(prefs.provider)) prefs.provider = defaults.provider;
  document.body.dataset.density = prefs.density;
  document.body.dataset.accent = prefs.accent;
  window.ultimateMacroDashboardPreferences = {
    ...prefs,
    save(next) {
      Object.assign(prefs, next);
      document.body.dataset.density = prefs.density;
      document.body.dataset.accent = prefs.accent;
      try { localStorage.setItem(key, JSON.stringify(prefs)); } catch { }
      Object.assign(this, prefs);
    }
  };
})();
