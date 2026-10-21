// One approved Adcash AutoTag. No other networks, click wrappers, or fallback ads.
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
  // Self-hosted mode must be explicitly enabled after endpoint verification.
  const approvedScript = config?.selfHostedEnabled === true
    ? '/assets/adcash-library' : 'https://acscdn.com/script/aclib.js';
  const approvedZone = 'nmmtb0xi2i';
  if (config?.enabled !== true || config?.ownerApproved !== true || config?.reviewApproved !== true || config?.provider !== 'Adcash' || config?.format !== 'AutoTag' || config?.zoneId !== approvedZone || config?.scriptUrl !== approvedScript) return;
  if (document.getElementById('aclib')) return;
  const script = document.createElement('script');
  script.id = 'aclib';
  script.type = 'text/javascript';
  script.src = approvedScript;
  script.async = true;
  script.onload = () => {
    if (typeof window.aclib?.runAutoTag === 'function') {
      window.aclib.runAutoTag({ zoneId: approvedZone });
    }
  };
  document.head.appendChild(script);
})();
