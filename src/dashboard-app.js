(() => {
  const page = document.querySelector('.dashboard-app-page');
  if (!page) return;
  const refresh = page.querySelector('[data-refresh]');
  const feedback = page.querySelector('[data-feedback]');
  const disconnectButton = page.querySelector('[data-device-disconnect]');
  const sectionLinks = [...page.querySelectorAll('.dashboard-section-nav a')];
  let busy = false;

  const text = (selector, value) => {
    const element = page.querySelector(selector);
    if (element) element.textContent = value;
  };

  async function updateStatus({ announce = false } = {}) {
    if (busy) return;
    busy = true;
    if (refresh) refresh.disabled = true;
    try {
      const response = await fetch('/api/dashboard/v1/pairing-status', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not check the desktop connection.');

      // The local preview uses a connected visual state before the desktop bridge exists.
      // Production continues to reflect the pairing API without preview data.
      const localPreview = ['localhost', '127.0.0.1'].includes(location.hostname)
        && !data.device
        && ['none', 'not-connected', 'expired'].includes(data.state);
      const state = localPreview ? 'connected' : ['connected', 'offline', 'connecting'].includes(data.state) ? data.state : 'not-connected';
      page.dataset.connection = state;
      const tag = page.querySelector('[data-connection-tag]');
      if (tag) tag.dataset.state = state;
      text('[data-connection-label]', state === 'connected' ? 'Connected' : state === 'offline' ? 'Offline' : state === 'connecting' ? 'Connecting' : 'Disconnected');
      text('[data-device-name]', data.device?.name || 'Windows PC');
      text('[data-device-row-name]', data.device?.name || 'Windows PC');
      text('[data-device-version]', data.device?.version ? `Version ${data.device.version}` : '');
      text('[data-device-row-version]', data.device?.version ? `Version ${data.device.version}` : '');
      text('[data-device-status]', state === 'connected' ? 'Connected' : state === 'offline' ? 'Offline' : state === 'connecting' ? 'Connecting' : 'Disconnected');
      const deviceStatus = page.querySelector('[data-device-status]');
      if (deviceStatus) deviceStatus.dataset.state = state;
      if (disconnectButton) {
        disconnectButton.hidden = !data.device?.id;
        disconnectButton.dataset.deviceId = data.device?.id || '';
      }
      if (announce && feedback) feedback.textContent = 'Connection status updated.';
    } catch (error) {
      text('[data-page-status]', error.message || 'Could not check the desktop connection.');
      if (announce && feedback) feedback.textContent = 'Could not refresh. Try again.';
    } finally {
      page.dataset.loaded = 'true';
      busy = false;
      if (refresh) refresh.disabled = false;
    }
  }

  sectionLinks.forEach((link) => link.addEventListener('click', () => {
    sectionLinks.forEach((item) => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'page');
  }));

  refresh?.addEventListener('click', () => updateStatus({ announce: true }));
  disconnectButton?.addEventListener('click', async () => {
    const deviceId = disconnectButton.dataset.deviceId;
    if (!deviceId || !window.confirm('Disconnect this PC from your Dashboard? You will need to pair it again to reconnect.')) return;
    disconnectButton.disabled = true;
    if (feedback) feedback.textContent = 'Disconnecting the PC…';
    try {
      const response = await fetch('/api/dashboard/v1/devices/revoke', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not disconnect this PC.');
      if (feedback) feedback.textContent = 'PC disconnected. You can pair it again any time.';
      await updateStatus();
    } catch (error) {
      if (feedback) feedback.textContent = error.message || 'Could not disconnect this PC.';
    } finally { disconnectButton.disabled = false; }
  });
  updateStatus();
  window.setInterval(() => { if (!document.hidden) updateStatus(); }, 15000);
})();
