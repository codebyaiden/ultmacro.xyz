(() => {
  const title = document.querySelector('[data-link-title]');
  const message = document.querySelector('[data-link-message]');
  const spinner = document.querySelector('[data-link-spinner]');
  const returnLink = document.querySelector('[data-link-return]');
  const query = new URLSearchParams(location.search);
  const pathCode = location.pathname.match(/^\/([A-HJ-NP-Z2-9]{12})\/?$/i)?.[1] || '';
  const code = pathCode || query.get('code') || '';
  const legacyToken = query.get('token') || '';
  history.replaceState(null, '', location.pathname);
  const fail = text => {
    title.textContent = 'This link can’t be used';
    message.textContent = text;
    spinner.hidden = true;
    returnLink.hidden = false;
    history.replaceState(null, '', location.pathname);
  };
  if (!/^[A-HJ-NP-Z2-9]{12}$/i.test(code) && !/^[A-Za-z0-9_-]{40,64}$/.test(legacyToken)) {
    fail('Ask the device that created it to make a new one.');
    return;
  }
  fetch('/api/dashboard/v1/browser-links/claim', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(code ? { code: code.toUpperCase() } : { token: legacyToken })
  }).then(async response => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ask the device that created it to make a new one.');
    title.textContent = 'Device connected';
    message.textContent = 'Opening your Dashboard…';
    location.replace('/dashboard/overview/');
  }).catch(error => fail(error.message || 'Ask the device that created it to make a new one.'));
})();
