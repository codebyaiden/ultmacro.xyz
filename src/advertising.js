// Single approved popunder only. No Social Bar, click wrappers, or fallback ads.
(async () => {
  const excluded = /^\/(?:api|internal|poll|p|moderatorapplication|terms|privacy|memberships|strategies)(?:\/|$)/;
  if (window.__umAdvertisingRequested || excluded.test(location.pathname) || window.top !== window.self) return;
  window.__umAdvertisingRequested = true;
  let config;
  try {
    const response = await fetch('/data/advertising.json', { cache: 'no-store', credentials: 'omit', redirect: 'error' });
    if (!response.ok) return;
    config = await response.json();
  } catch { return; }
  const approvedScript = 'https://accountut.com/1/58419eafc37232d45f68b1fc4bbe4931';
  if (config?.enabled !== true || config?.ownerApproved !== true || config?.provider !== 'Adsterra' || config?.format !== 'Popunder' || config?.scriptUrl !== approvedScript) return;
  if (document.getElementById('um-adsterra-popunder')) return;
  const script = document.createElement('script');
  script.id = 'um-adsterra-popunder';
  script.setAttribute('data-cfasync', 'false');
  script.src = approvedScript;
  script.async = true;
  document.head.appendChild(script);
})();
