(() => {
  const root = document.querySelector('[data-notification-preferences]');
  if (!root) return;

  const pushStatus = document.querySelector('[data-push-status]');
  const enablePush = document.querySelector('[data-enable-push]');
  const testPush = document.querySelector('[data-test-push]');
  const disablePush = document.querySelector('[data-disable-push]');
  const installButton = document.querySelector('[data-install-app]');
  const installHelp = document.querySelector('[data-install-help]');
  let registration = null;
  let installPrompt = null;
  let vapidPublicKey = '';

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

  function setPushStatus(message) {
    if (pushStatus) pushStatus.textContent = message;
  }

  function updatePushControls(subscribed) {
    if (enablePush) enablePush.hidden = subscribed;
    if (testPush) testPush.hidden = !subscribed;
    if (disablePush) disablePush.hidden = !subscribed;
  }

  function base64UrlBytes(value) {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
  }

  async function initializePush() {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('Push alerts are not supported in this browser.');
      if (enablePush) enablePush.disabled = true;
      return;
    }
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (installButton && !isInstalled) installButton.hidden = false;
    if (isAppleMobile && !isInstalled && installHelp) installHelp.textContent = 'On iPhone: Share → Add to Home Screen, open Dashboard, then enable alerts.';
    try {
      await api('/api/dashboard/v1/session/bootstrap', { method: 'POST', body: '{}' });
      registration = await navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' });
      const subscription = await registration.pushManager.getSubscription();
      updatePushControls(Boolean(subscription));
      try {
        ({ publicKey: vapidPublicKey } = await api('/api/dashboard/v1/notifications/vapid-public-key', { method: 'POST', body: '{}' }));
      } catch (error) {
        setPushStatus(error.message || 'Phone notifications are not configured yet.');
        if (!subscription && enablePush) enablePush.disabled = true;
        if (testPush) testPush.disabled = true;
        return;
      }
      if (subscription) setPushStatus('Alerts are on for this device.');
      else if (Notification.permission === 'denied') setPushStatus('Notifications are blocked in this browser’s settings.');
      else setPushStatus('Alerts are off on this device.');
    } catch {
      setPushStatus('Could not prepare notifications on this device.');
      if (enablePush) enablePush.disabled = true;
    }
  }

  enablePush?.addEventListener('click', async () => {
    enablePush.disabled = true;
    setPushStatus('Turning on alerts…');
    try {
      const permissionRequest = Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve(Notification.permission);
      if (!registration) registration = await navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' });
      const permission = await permissionRequest;
      if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Allow notifications in this browser’s settings, then try again.' : 'Notification permission was not granted.');
      if (!vapidPublicKey) throw new Error('Phone notifications are not configured yet.');
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlBytes(vapidPublicKey) });
      await api('/api/dashboard/v1/notifications/subscriptions', { method: 'POST', body: JSON.stringify({ subscription: subscription.toJSON() }) });
      updatePushControls(true);
      setPushStatus('Alerts are on for this device.');
    } catch (error) {
      updatePushControls(false);
      setPushStatus(error.message || 'Could not turn on alerts.');
    } finally { enablePush.disabled = false; }
  });

  testPush?.addEventListener('click', async () => {
    testPush.disabled = true;
    setPushStatus('Sending a test alert…');
    try {
      await api('/api/dashboard/v1/notifications/test', { method: 'POST', body: '{}' });
      setPushStatus('Test alert sent.');
    } catch (error) { setPushStatus(error.message || 'Could not send the test alert.'); }
    finally { testPush.disabled = false; }
  });

  disablePush?.addEventListener('click', async () => {
    disablePush.disabled = true;
    setPushStatus('Turning off alerts…');
    try {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api('/api/dashboard/v1/notifications/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      updatePushControls(false);
      setPushStatus('Alerts are off on this device.');
    } catch (error) { setPushStatus(error.message || 'Could not turn off alerts.'); }
    finally { disablePush.disabled = false; }
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!installPrompt) {
      if (installHelp) {
        installHelp.textContent = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'On iPhone: Share → Add to Home Screen, open Dashboard, then enable alerts.'
          : 'Open your browser menu and choose Install app or Add to Home Screen.';
        installHelp.hidden = false;
      }
      return;
    }
    installButton.disabled = true;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    installButton.hidden = true;
    installButton.disabled = false;
  });

  initializePush();

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
