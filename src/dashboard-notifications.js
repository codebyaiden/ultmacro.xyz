(() => {
  const root = document.querySelector('[data-notification-preferences]');
  if (!root) return;

  const status = document.querySelector('[data-push-status]');
  const saveStatus = document.querySelector('[data-save-status]');
  const enablePush = document.querySelector('[data-enable-push]');
  const testPush = document.querySelector('[data-test-push]');
  const disablePush = document.querySelector('[data-disable-push]');
  const installButton = document.querySelector('[data-install-app]');
  const installHelp = document.querySelector('[data-install-help]');
  const resetDevice = document.querySelector('[data-reset-device]');
  const scopeButtons = [...root.querySelectorAll('[data-pref-scope]')];
  const defaults = { results: 'all', runEvents: 'runs', connection: 'offline' };
  const allowed = {
    results: new Set(['all', 'errors', 'off']),
    runEvents: new Set(['runs', 'all', 'off']),
    connection: new Set(['all', 'offline', 'off'])
  };
  const storageKey = 'um.dashboard.notifications.v1';
  let registration = null;
  let installPrompt = null;
  let vapidPublicKey = '';
  let subscription = null;
  let deviceId = '';
  let scope = 'account';
  let deviceOverride = false;
  let preferences = { ...defaults };
  let preferenceWrite = Promise.resolve();

  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin', cache: 'no-store',
      ...options,
      headers: { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not update notifications.');
    return data;
  };

  function say(message) { if (status) status.textContent = message; }
  function saySaved(message) { if (saveStatus) saveStatus.textContent = message; }
  function updatePushControls(subscribed) {
    if (enablePush) enablePush.hidden = subscribed;
    if (testPush) testPush.hidden = !subscribed;
    if (disablePush) disablePush.hidden = !subscribed;
    const deviceButton = scopeButtons.find(button => button.dataset.prefScope === 'device');
    if (deviceButton) deviceButton.disabled = !subscribed;
  }
  function base64UrlBytes(value) {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  }
  function readLocalPreferences() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!stored || typeof stored !== 'object') return null;
      const values = { ...defaults };
      for (const [key, choices] of Object.entries(allowed)) if (choices.has(stored[key])) values[key] = stored[key];
      return values;
    } catch { return null; }
  }
  function paint(group, selectedValue) {
    const buttons = [...group.querySelectorAll('[role="radio"][data-value]')];
    buttons.forEach(button => {
      const selected = button.dataset.value === selectedValue;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  }
  function paintPreferences() {
    root.querySelectorAll('[data-preference]').forEach(group => paint(group, preferences[group.dataset.preference]));
    scopeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.prefScope === scope)));
  }
  async function loadPreferences() {
    const query = deviceId ? `?device=${encodeURIComponent(deviceId)}` : '';
    const data = await api(`/api/dashboard/v1/notifications/preferences${query}`);
    if (scope === 'device' && data.device) preferences = data.device;
    else preferences = data.account || { ...defaults };
    deviceOverride = Boolean(data.deviceConfigured);
    if (resetDevice) resetDevice.hidden = scope !== 'device' || !deviceOverride;
    if (scope === 'device' && !data.device) preferences = data.account || { ...defaults };
    if (!data.accountConfigured) {
      const old = readLocalPreferences();
      if (old) {
        await api('/api/dashboard/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify({ scope: 'account', preferences: old }) });
        preferences = scope === 'account' ? old : preferences;
      }
    }
    paintPreferences();
  }
  async function savePreferences(next, targetScope = scope, targetDeviceId = deviceId) {
    const body = { scope: targetScope, preferences: next };
    if (targetScope === 'device') {
      if (!targetDeviceId) throw new Error('Turn on alerts on this device first.');
      body.deviceId = targetDeviceId;
    }
    await api('/api/dashboard/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify(body) });
  }

  async function initializePush() {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      say('Push alerts are not supported in this browser.');
      if (enablePush) enablePush.disabled = true;
      return;
    }
    const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (installButton && !installed) installButton.hidden = false;
    if (appleMobile && !installed && installHelp) installHelp.textContent = 'On iPhone: Share → Add to Home Screen, open Dashboard, then turn on alerts.';
    try {
      await api('/api/dashboard/v1/session/bootstrap', { method: 'POST', body: '{}' });
      registration = await navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' });
      subscription = await registration.pushManager.getSubscription();
      updatePushControls(Boolean(subscription));
      if (subscription) {
        const saved = await api('/api/dashboard/v1/notifications/subscriptions', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint }) });
        deviceId = saved.deviceId;
      }
      try { ({ publicKey: vapidPublicKey } = await api('/api/dashboard/v1/notifications/vapid-public-key', { method: 'POST', body: '{}' })); }
      catch (error) {
        say(error.message || 'Phone notifications are not configured yet.');
        if (!subscription && enablePush) enablePush.disabled = true;
        if (testPush) testPush.disabled = true;
        await loadPreferences().catch(() => {});
        return;
      }
      if (subscription) say('Alerts are on for this device.');
      else if (Notification.permission === 'denied') say('Notifications are blocked in this browser’s settings.');
      else say('Alerts are off on this device.');
      await loadPreferences();
    } catch (error) {
      say(error.message || 'Could not prepare notifications on this device.');
      if (enablePush) enablePush.disabled = true;
    }
  }

  enablePush?.addEventListener('click', async () => {
    enablePush.disabled = true;
    say('Turning on alerts…');
    try {
      if (!registration) registration = await navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' });
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Allow notifications in this browser’s settings, then try again.' : 'Notification permission was not granted.');
      if (!vapidPublicKey) throw new Error('Phone notifications are not configured yet.');
      subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlBytes(vapidPublicKey) });
      const saved = await api('/api/dashboard/v1/notifications/subscriptions', { method: 'POST', body: JSON.stringify({ subscription: subscription.toJSON() }) });
      deviceId = saved.deviceId;
      updatePushControls(true);
      say('Alerts are on for this device.');
      await loadPreferences();
    } catch (error) { say(error.message || 'Could not turn on alerts.'); }
    finally { enablePush.disabled = false; }
  });

  testPush?.addEventListener('click', async () => {
    testPush.disabled = true;
    say('Sending a test alert…');
    try {
      subscription ||= await registration?.pushManager.getSubscription();
      if (!subscription) throw new Error('Turn on alerts on this device first.');
      await api('/api/dashboard/v1/notifications/test', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint }) });
      say('Test alert sent to this device.');
    } catch (error) { say(error.message || 'Could not send the test alert.'); }
    finally { testPush.disabled = false; }
  });

  disablePush?.addEventListener('click', async () => {
    disablePush.disabled = true;
    say('Turning off alerts…');
    try {
      subscription ||= await registration?.pushManager.getSubscription();
      if (subscription) {
        await api('/api/dashboard/v1/notifications/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      subscription = null;
      deviceId = '';
      scope = 'account';
      updatePushControls(false);
      say('Alerts are off on this device.');
      await loadPreferences();
    } catch (error) { say(error.message || 'Could not turn off alerts.'); }
    finally { disablePush.disabled = false; }
  });

  scopeButtons.forEach(button => button.addEventListener('click', async () => {
    if (button.disabled || button.dataset.prefScope === scope) return;
    scope = button.dataset.prefScope;
    paintPreferences();
    saySaved('Loading settings…');
    try { await loadPreferences(); saySaved(''); }
    catch (error) { saySaved(error.message || 'Could not load notification settings.'); }
  }));

  resetDevice?.addEventListener('click', async () => {
    if (!deviceId || !deviceOverride) return;
    resetDevice.disabled = true;
    saySaved('');
    try {
      await api('/api/dashboard/v1/notifications/preferences', { method: 'DELETE', body: JSON.stringify({ scope: 'device', deviceId }) });
      await loadPreferences();
      saySaved('This device now uses all-device settings.');
    } catch (error) { saySaved(error.message || 'Could not reset device settings.'); }
    finally { resetDevice.disabled = false; }
  });

  root.querySelectorAll('[data-preference]').forEach(group => {
    const key = group.dataset.preference;
    const buttons = [...group.querySelectorAll('[role="radio"][data-value]')];
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        if (!allowed[key]?.has(button.dataset.value)) return;
        const next = { ...preferences, [key]: button.dataset.value };
        preferences = next;
        paint(group, next[key]);
        const snapshot = { ...next };
        const targetScope = scope;
        const targetDeviceId = deviceId;
        preferenceWrite = preferenceWrite.then(async () => {
          try {
            await savePreferences(snapshot, targetScope, targetDeviceId);
            try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); } catch { /* Server is authoritative. */ }
            saySaved(targetScope === 'account' ? 'Saved for all devices.' : 'Saved for this device.');
          } catch (error) {
            saySaved(error.message || 'Could not save notification settings.');
          }
        });
      });
      button.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        buttons[next].click();
      });
    });
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      if (installHelp) {
        installHelp.textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'On iPhone: Share → Add to Home Screen, open Dashboard, then turn on alerts.'
          : 'Open your browser menu and choose Install app or Add to Home Screen.';
        installHelp.hidden = false;
      }
      return;
    }
    installButton.disabled = true;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null; installButton.hidden = true; installButton.disabled = false;
  });

  initializePush();
})();
