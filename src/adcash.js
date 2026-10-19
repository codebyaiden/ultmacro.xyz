// Default-off, reversible publisher switch. Never enable from URL/storage/user input.
(async () => {
  const excluded = /^\/(?:api|internal|poll|p|moderatorapplication|terms|privacy|memberships|strategies)(?:\/|$)/;
  if (window.__umAdcashRequested || excluded.test(location.pathname) || window.top !== window.self) return;
  window.__umAdcashRequested = true;
  let config;
  try {
    const response = await fetch('/data/advertising.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!response.ok) return;
    config = await response.json();
  } catch { return; }
  // Missing, malformed or unavailable config always disables ads. A same-origin
  // reviewed configuration is the only opt-in. No click/focus listeners or timers.
  if (config?.enabled !== true || config?.reviewApproved !== true) return;
  if (window.__umAdcashStarted) return;
  window.__umAdcashStarted = true;
  let initialized = false;
  const start = () => {
    if (initialized || !window.aclib || typeof window.aclib.runAutoTag !== 'function') return;
    initialized = true;
    try { window.aclib.runAutoTag({ zoneId: 'nvfhwgcmud' }); } catch { /* Ads must not break the page. */ }
  };
  if (window.aclib && typeof window.aclib.runAutoTag === 'function') { start(); return; }
  let library = document.getElementById('aclib');
  if (!library) {
    library = document.createElement('script');
    library.id = 'aclib'; library.type = 'text/javascript';
    library.src = 'https://acscdn.com/script/aclib.js'; library.async = true;
    library.addEventListener('load', start, { once: true });
    document.head.appendChild(library);
  } else library.addEventListener('load', start, { once: true });
})();
