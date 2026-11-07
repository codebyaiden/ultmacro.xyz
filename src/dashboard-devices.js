import QRCode from 'qrcode';

(() => {
  const page = document.querySelector('.dashboard-app-page');
  if (!page?.querySelector('[data-devices-list]')) return;
  const list = page.querySelector('[data-devices-list]');
  const feedback = page.querySelector('[data-devices-feedback]');
  const backdrop = page.querySelector('[data-devices-backdrop]');
  const dialog = page.querySelector('[data-devices-modal]');
  const openButton = page.querySelector('[data-open-devices]');
  const closeButton = page.querySelector('[data-close-devices]');
  const qrFrame = page.querySelector('[data-qr-frame]');
  const linkText = page.querySelector('[data-short-link]');
  const copyButton = page.querySelector('[data-copy-link]');
  const expiryText = page.querySelector('[data-link-expiry]');
  const errorText = page.querySelector('[data-pairing-error]');
  const connectTabs = [...page.querySelectorAll('[data-connect-tab]')];
  const desktopCode = page.querySelector('[data-desktop-code]');
  const newDesktopCode = page.querySelector('[data-new-desktop-code]');
  const copyCode = page.querySelector('[data-copy-code]');
  const desktopExpiry = page.querySelector('[data-desktop-expiry]');
  const removeBackdrop = page.querySelector('[data-remove-backdrop]');
  const removeDialog = page.querySelector('[data-remove-dialog]');
  const removeMessage = page.querySelector('[data-remove-message]');
  const removeError = page.querySelector('[data-remove-error]');
  const confirmRemove = page.querySelector('[data-confirm-remove]');
  const cancelRemove = page.querySelector('[data-cancel-remove]');
  const closeRemove = page.querySelector('[data-close-remove]');
  let pairingUrl = '';
  let expiresAt = 0;
  let expiryTimer = 0;
  let statusTimer = 0;
  let desktopCodeValue = '';
  let closeTimer = 0;
  let previousFocus = null;
  let removeFocus = null;
  let pendingRemoval = null;

  const post = async (path, body = {}) => {
    const response = await fetch(`/api/dashboard/v1/${path}`, {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not complete that request.');
    return data;
  };

  function deviceIcon(device) {
    const mobile = /Android|iOS/i.test(device.name || '');
    return mobile ? '/assets/dashboard-icons/flat/SVG_Source/Devices_And_Connections/phone.svg'
      : device.type === 'desktop' ? '/assets/dashboard-icons/flat/SVG_Source/Devices_And_Connections/desktop_pc.svg'
      : '/assets/dashboard-icons/flat/SVG_Source/Devices_And_Connections/laptop.svg';
  }

  function renderDevices(devices) {
    list.replaceChildren();
    if (!devices.length) {
      const empty = document.createElement('p');
      empty.className = 'devices-empty';
      empty.textContent = 'No other devices yet.';
      list.append(empty);
      return;
    }
    for (const device of devices) {
      const row = document.createElement('article');
      row.className = 'connected-device';
      const icon = document.createElement('span');
      icon.className = 'connected-device-icon';
      const image = document.createElement('img');
      image.src = deviceIcon(device);
      image.alt = '';
      icon.append(image);
      const copy = document.createElement('div');
      copy.className = 'connected-device-copy';
      const name = document.createElement('strong');
      name.textContent = device.name || (device.type === 'desktop' ? 'Windows PC' : 'Browser');
      const detail = document.createElement('span');
      detail.textContent = device.version ? `Ultimate Macro ${device.version}` : device.type === 'desktop' ? 'Macro device' : 'Dashboard access';
      copy.append(name, detail);
      row.append(icon, copy);
      if (device.isCurrent) {
        const current = document.createElement('span');
        current.className = 'connected-device-current';
        current.textContent = 'Current browser';
        row.append(current);
      } else {
        const remove = document.createElement('button');
        remove.className = 'connected-device-remove';
        remove.type = 'button';
        remove.setAttribute('aria-label', `Remove ${device.name || 'device'}`);
        remove.title = 'Remove device';
        remove.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8"></path></svg>';
        remove.addEventListener('click', () => openRemoveDialog(device));
        row.append(remove);
      }
      list.append(row);
    }
  }

  async function loadDevices() {
    list.innerHTML = '<p class="devices-loading">Loading devices…</p>';
    try {
      await post('session/bootstrap');
      const response = await fetch('/api/dashboard/v1/devices', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load devices.');
      renderDevices(data.devices || []);
    } catch (error) {
      const message = document.createElement('p');
      message.className = 'devices-empty';
      message.textContent = error.message || 'Could not load devices.';
      list.replaceChildren(message);
    }
  }

  function openRemoveDialog(device) {
    pendingRemoval = { device };
    removeFocus = document.activeElement;
    removeError.textContent = '';
    removeMessage.textContent = device.type === 'desktop'
      ? `${device.name || 'This PC'} will be disconnected from your Dashboard. You can reconnect it from Ultimate Macro.`
      : `${device.name || 'This browser'} will be signed out of your Dashboard. You can connect it again with a new device link.`;
    removeBackdrop.hidden = false;
    requestAnimationFrame(() => removeDialog.focus());
  }

  function closeRemoveDialog() {
    removeBackdrop.hidden = true;
    pendingRemoval = null;
    removeFocus?.focus?.();
  }

  async function removeDevice() {
    if (!pendingRemoval) return;
    const { device } = pendingRemoval;
    confirmRemove.disabled = true;
    cancelRemove.disabled = true;
    closeRemove.disabled = true;
    removeError.textContent = '';
    try {
      const endpoint = device.type === 'desktop' ? 'devices/revoke' : 'browser-sessions/revoke';
      await post(endpoint, device.type === 'desktop' ? { deviceId: device.id } : { id: device.id });
      removeBackdrop.hidden = true;
      pendingRemoval = null;
      if (feedback) feedback.textContent = 'Device removed.';
      await loadDevices();
    } catch (error) {
      removeError.textContent = error.message || 'Could not remove this device.';
      confirmRemove.focus();
    } finally {
      confirmRemove.disabled = false;
      cancelRemove.disabled = false;
      closeRemove.disabled = false;
    }
  }

  function setExpiry() {
    if (!expiresAt) return;
    const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    expiryText.textContent = seconds ? `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Link expired. Close and create a new one.';
    if (!seconds) {
      pairingUrl = '';
      qrFrame.replaceChildren();
      clearInterval(expiryTimer);
    }
  }

  function setConnectMode(mode) {
    for (const tab of connectTabs) {
      const selected = tab.dataset.connectTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const pane of page.querySelectorAll('[data-connect-pane]')) pane.hidden = pane.dataset.connectPane !== mode;
    if (mode === 'browser' && !pairingUrl) createPairingLink();
    if (mode === 'desktop' && !desktopCodeValue) createDesktopCode();
  }

  async function checkDesktopPairing() {
    if (!desktopCodeValue || backdrop.hidden) return;
    try {
      const response = await fetch('/api/dashboard/v1/pairing-status', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not check pairing.');
      if (data.state === 'connected') {
        desktopExpiry.textContent = 'PC connected.';
        clearInterval(statusTimer);
        await loadDevices();
      } else if (data.state === 'connecting') desktopExpiry.textContent = 'Code accepted. Waiting for the PC to come online…';
      else if (data.state === 'offline') desktopExpiry.textContent = 'PC paired; waiting for its next heartbeat…';
      else if (data.state === 'expired' || data.state === 'revoked') {
        desktopExpiry.textContent = 'Code expired. Get a new one to try again.';
        desktopCodeValue = '';
        clearInterval(statusTimer);
      }
    } catch (error) {
      desktopExpiry.textContent = error.message || 'Could not check pairing.';
    }
  }

  async function createDesktopCode() {
    clearInterval(statusTimer);
    desktopCodeValue = '';
    desktopCode.textContent = '••••-••••';
    desktopExpiry.textContent = 'Creating code…';
    newDesktopCode.disabled = true;
    try {
      const data = await post('pairing-codes');
      desktopCodeValue = data.code;
      desktopCode.textContent = data.code;
      expiresAt = Date.parse(data.expiresAt);
      clearInterval(expiryTimer);
      setDesktopExpiry();
      expiryTimer = window.setInterval(setDesktopExpiry, 1000);
      await checkDesktopPairing();
      statusTimer = window.setInterval(checkDesktopPairing, 2000);
    } catch (error) {
      desktopExpiry.textContent = error.message || 'Could not create a pairing code.';
    } finally {
      newDesktopCode.disabled = false;
    }
  }

  function setDesktopExpiry() {
    if (!expiresAt || !desktopCodeValue) return;
    const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    if (!seconds) {
      desktopExpiry.textContent = 'Code expired. Get a new one to try again.';
      desktopCodeValue = '';
      desktopCode.textContent = '••••-••••';
      clearInterval(expiryTimer);
      clearInterval(statusTimer);
      return;
    }
    desktopExpiry.textContent = `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  async function copyDesktopCode() {
    if (!desktopCodeValue) return;
    try {
      await navigator.clipboard.writeText(desktopCodeValue);
      copyCode.textContent = 'Copied';
      window.setTimeout(() => { copyCode.textContent = 'Copy'; }, 1200);
    } catch {
      desktopExpiry.textContent = 'Copy failed. Select the code and copy it manually.';
    }
  }

  async function createPairingLink() {
    errorText.textContent = '';
    pairingUrl = '';
    qrFrame.replaceChildren();
    const spinner = document.createElement('span');
    spinner.className = 'pairing-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    qrFrame.append(spinner);
    try {
      const data = await post('browser-links');
      pairingUrl = new URL(`/shortlink/?token=${encodeURIComponent(data.token)}`, location.origin).href;
      expiresAt = Date.parse(data.expiresAt);
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, pairingUrl, { width: 148, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#121216', light: '#f5f5f6' } });
      qrFrame.replaceChildren(canvas);
      linkText.href = pairingUrl;
      linkText.textContent = pairingUrl;
      clearInterval(expiryTimer);
      setExpiry();
      expiryTimer = window.setInterval(setExpiry, 1000);
    } catch (error) {
      qrFrame.replaceChildren();
      errorText.textContent = error.message || 'Could not create a device link.';
      expiryText.textContent = '';
    }
  }

  function openDialog() {
    previousFocus = document.activeElement;
    clearTimeout(closeTimer);
    clearInterval(expiryTimer);
    clearInterval(statusTimer);
    pairingUrl = '';
    desktopCodeValue = '';
    backdrop.hidden = false;
    requestAnimationFrame(() => dialog.focus());
    setConnectMode('desktop');
  }

  function closeDialog() {
    if (backdrop.hidden) return;
    backdrop.classList.add('is-closing');
    clearTimeout(expiryTimer);
    clearInterval(statusTimer);
    closeTimer = window.setTimeout(() => {
      backdrop.hidden = true;
      backdrop.classList.remove('is-closing');
      previousFocus?.focus?.();
    }, 220);
  }

  async function copyLink() {
    if (!pairingUrl) return;
    try {
      await navigator.clipboard.writeText(pairingUrl);
      copyButton.setAttribute('aria-label', 'Link copied');
      copyButton.title = 'Copied';
      copyButton.innerHTML = '<span aria-hidden="true">✓</span>';
      window.setTimeout(() => {
        copyButton.setAttribute('aria-label', 'Copy device link');
        copyButton.title = 'Copy link';
      copyButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="6" width="9" height="11" rx="2"></rect><path d="M12 6V4.8A1.8 1.8 0 0 0 10.2 3H5.8A1.8 1.8 0 0 0 4 4.8v8.4A1.8 1.8 0 0 0 5.8 15H7"></path></svg>';
      }, 1400);
    } catch {
      const field = document.createElement('textarea');
      field.value = pairingUrl;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) { errorText.textContent = 'Copy failed. Open the link directly or scan the QR code.'; return; }
      copyButton.setAttribute('aria-label', 'Link copied');
      copyButton.title = 'Copied';
      copyButton.innerHTML = '<span aria-hidden="true">✓</span>';
      window.setTimeout(() => {
        copyButton.setAttribute('aria-label', 'Copy device link');
        copyButton.title = 'Copy link';
        copyButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="6" width="9" height="11" rx="2"></rect><path d="M12 6V4.8A1.8 1.8 0 0 0 10.2 3H5.8A1.8 1.8 0 0 0 4 4.8v8.4A1.8 1.8 0 0 0 5.8 15H7"></path></svg>';
      }, 1400);
    }
  }

  openButton.addEventListener('click', openDialog);
  for (const tab of connectTabs) tab.addEventListener('click', () => setConnectMode(tab.dataset.connectTab));
  newDesktopCode.addEventListener('click', createDesktopCode);
  copyCode.addEventListener('click', copyDesktopCode);
  closeButton.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeDialog(); });
  copyButton.addEventListener('click', copyLink);
  confirmRemove.addEventListener('click', removeDevice);
  cancelRemove.addEventListener('click', closeRemoveDialog);
  closeRemove.addEventListener('click', closeRemoveDialog);
  removeBackdrop.addEventListener('click', event => { if (event.target === removeBackdrop) closeRemoveDialog(); });
  document.addEventListener('keydown', event => {
    const activeDialog = !removeBackdrop.hidden ? removeDialog : !backdrop.hidden ? dialog : null;
    if (!activeDialog) return;
    if (event.key === 'Escape') {
      if (!removeBackdrop.hidden) closeRemoveDialog();
      else closeDialog();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...activeDialog.querySelectorAll('button:not(:disabled),a[href]')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  loadDevices();
})();
