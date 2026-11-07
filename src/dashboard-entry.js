(() => {
  const codeOutput = document.querySelector('#pairing-code');
  const codeStatus = document.querySelector('#pairing-status');
  const newCodeButton = document.querySelector('.new-code-button');
  const codePanel = document.querySelector('.pairing-panel');
  const guide = document.querySelector('.connection-guide');
  const connectionState = document.querySelector('#connection-state');
  const dashboardLink = document.querySelector('#dashboard-open-link');
  const title = document.querySelector('#connection-title');
  const message = document.querySelector('#connection-message');
  if (!codeOutput || !codeStatus || !newCodeButton || !connectionState) return;

  let expiresAt = 0;
  let countdownTimer = 0;
  let statusTimer = 0;
  let pollBusy = false;
  let currentState = 'none';

  const countdown = () => {
    if (!expiresAt || currentState !== 'pending') return;
    const remaining = Math.max(0, expiresAt - Date.now());
    if (remaining <= 0) {
      currentState = 'expired';
      codeOutput.textContent = 'EXPIRED';
      codeStatus.textContent = 'This code has expired.';
      newCodeButton.disabled = false;
      window.clearInterval(countdownTimer);
      return;
    }
    const minutes = Math.floor(remaining / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
    codeStatus.textContent = `Expires in ${minutes}:${seconds}`;
  };

  async function requestCode() {
    newCodeButton.disabled = true;
    newCodeButton.textContent = 'Getting a new code…';
    codeStatus.textContent = 'Requesting a secure code…';
    try {
      const response = await fetch('/api/dashboard/v1/pairing-codes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || !/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(data.code || '') || !data.expiresAt) {
        throw new Error(data.error || 'Could not generate a code.');
      }
      currentState = 'pending';
      codeOutput.textContent = data.code;
      expiresAt = Date.parse(data.expiresAt);
      newCodeButton.textContent = 'Get a new code';
      newCodeButton.disabled = false;
      window.clearInterval(countdownTimer);
      countdown();
      countdownTimer = window.setInterval(countdown, 1000);
      window.clearInterval(statusTimer);
      statusTimer = window.setInterval(checkStatus, 2500);
    } catch (error) {
      currentState = 'unavailable';
      codeOutput.textContent = '••••••••';
      codeStatus.textContent = error instanceof TypeError ? 'Couldn’t reach the pairing service. Try again.' : (error.message || 'Couldn’t get a code. Try again.');
      newCodeButton.textContent = 'Try again';
      newCodeButton.disabled = false;
    }
  }

  async function checkStatus() {
    if (pollBusy) return;
    pollBusy = true;
    try {
      const response = await fetch('/api/dashboard/v1/pairing-status', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.state === currentState || data.state === 'none' || data.state === 'pending') return;
      currentState = data.state;
      if (data.state === 'connecting') {
        codePanel.hidden = true;
        if (guide) guide.hidden = true;
        connectionState.hidden = false;
        connectionState.dataset.state = 'connecting';
        title.textContent = 'Connecting to Ultimate Macro';
        message.textContent = 'Waiting for the desktop app to confirm the connection.';
        newCodeButton.disabled = true;
      } else if (data.state === 'connected') {
        codePanel.hidden = true;
        if (guide) guide.hidden = true;
        connectionState.hidden = false;
        connectionState.dataset.state = 'connected';
        title.textContent = 'Ultimate Macro is connected';
        message.textContent = data.device?.name ? `Connected to ${data.device.name}.` : 'Your desktop has confirmed the connection.';
        if (dashboardLink) dashboardLink.hidden = false;
        window.clearInterval(statusTimer);
      } else if (data.state === 'offline' || data.state === 'revoked') {
        if (data.state === 'offline' && !data.device?.lastSeenAt) {
          codePanel.hidden = false;
          if (guide) guide.hidden = false;
          codeOutput.textContent = 'EXPIRED';
          codeStatus.textContent = 'No connection was confirmed. Get a new code to try again.';
          newCodeButton.disabled = false;
          newCodeButton.textContent = 'Get a new code';
          connectionState.hidden = true;
        } else if (data.state === 'revoked') {
          codePanel.hidden = false;
          if (guide) guide.hidden = false;
          codeOutput.textContent = '••••-••••';
          codeStatus.textContent = 'This desktop was disconnected.';
          newCodeButton.disabled = false;
          newCodeButton.textContent = 'Get a new code';
          connectionState.hidden = true;
        } else {
          codePanel.hidden = true;
          if (guide) guide.hidden = true;
          connectionState.hidden = false;
          connectionState.dataset.state = data.state;
          title.textContent = 'Ultimate Macro is offline';
          message.textContent = 'Open Ultimate Macro to reconnect this desktop.';
          if (dashboardLink && data.device?.lastSeenAt) dashboardLink.hidden = false;
        }
        window.clearInterval(statusTimer);
      } else if (data.state === 'expired') {
        currentState = 'expired';
        newCodeButton.disabled = false;
        codeOutput.textContent = 'EXPIRED';
        codeStatus.textContent = 'This code has expired.';
      }
    } catch {
      // A failed status poll does not change the current pairing state.
    } finally { pollBusy = false; }
  }

  newCodeButton.addEventListener('click', requestCode);
  (async () => {
    try {
      const response = await fetch('/api/dashboard/v1/pairing-status', { credentials: 'same-origin', cache: 'no-store' });
      const existing = response.ok ? await response.json() : { state: 'none' };
      if (['connecting', 'connected', 'offline', 'revoked'].includes(existing.state)) {
        statusTimer = window.setInterval(checkStatus, 2500);
        await checkStatus();
        return;
      }
    } catch { }
    requestCode();
  })();
})();
