// One public AutoTag integration. Do not add per-button ads or duplicate zones.
(() => {
  if (window.__umAdcashStarted || /^\/(?:api|internal)(?:\/|$)/.test(location.pathname) || /^\/poll\/team(?:\/|$)/.test(location.pathname)) return;
  window.__umAdcashStarted = true;
  const start = () => {
    if (!window.aclib || typeof window.aclib.runAutoTag !== 'function') return;
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
