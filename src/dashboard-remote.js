(() => {
  const buttons = [...document.querySelectorAll('[data-remote-command]')];
  const deviceName = document.querySelector('[data-remote-device-name]');
  const deviceState = document.querySelector('[data-remote-device-state]');
  const currentRun = document.querySelector('[data-current-run]');
  const feedback = document.querySelector('[data-remote-command-status]');
  let stateSnapshot = null;
  let activeDevice = null;
  let currentState = { devices: [], unavailable: false };
  let busy = false;
  let feedbackTimer = 0;

  function update(state) {
    currentState = state;
    activeDevice = window.UMDashboardState?.activeDesktop(state) || null;
    stateSnapshot = activeDevice?.snapshot || null;
    const online = activeDevice?.state === 'connected' && Boolean(stateSnapshot);
    if (deviceName) deviceName.textContent = activeDevice?.name || 'Windows PC';
    if (deviceState) deviceState.textContent = online ? ({ running: 'Running', paused: 'Paused', stopped: 'Stopped' }[stateSnapshot.runState] || '') : '';
    if (currentRun) {
      if (!online) currentRun.textContent = state.unavailable ? 'Macro data is unavailable.' : 'No live macro data.';
      else {
        const details = [stateSnapshot.activeStrategy, stateSnapshot.map, stateSnapshot.mode].filter(Boolean);
        currentRun.textContent = [({ running: 'Running', paused: 'Paused', stopped: 'Stopped' }[stateSnapshot.runState] || ''), ...details].filter(Boolean).join(' · ');
      }
    }

    for (const button of buttons) {
      const base = button.dataset.baseCommand || button.dataset.remoteCommand;
      if (!button.dataset.baseCommand) button.dataset.baseCommand = base;
      let action = base;
      let allowed = false;
      if (online) {
        if (base === 'start') allowed = stateSnapshot.runState === 'stopped' && stateSnapshot.strategySlots?.length > 0;
        if (base === 'stop_after_match' || base === 'cancel_stop_after_match') {
          const supported = stateSnapshot.capabilities?.includes('safe_match_stop');
          const requested = Boolean(stateSnapshot.stopAfterMatch);
          action = requested ? 'cancel_stop_after_match' : 'stop_after_match';
          allowed = supported && (requested || stateSnapshot.runState === 'running');
          button.hidden = !supported;
          const label = button.querySelector('[data-safe-stop-label]');
          if (label) label.textContent = requested ? 'Cancel stop after match' : 'Stop after this match';
        }
        if (base === 'pause') {
          action = stateSnapshot.runState === 'paused' ? 'resume' : 'pause';
          allowed = ['running', 'paused'].includes(stateSnapshot.runState);
          button.querySelector('span').textContent = action === 'resume' ? 'Resume' : 'Pause';
          button.querySelector('img').src = action === 'resume'
            ? '/assets/dashboard-icons/flat/SVG_Source/Remote_Controls/start.svg'
            : '/assets/dashboard-icons/flat/SVG_Source/Remote_Controls/pause.svg';
        }
        if (base === 'stop') allowed = ['running', 'paused'].includes(stateSnapshot.runState);
      }
      button.dataset.remoteCommand = action;
      button.disabled = !allowed || busy;
      button.setAttribute('aria-disabled', String(button.disabled));
    }
  }

  window.UMDashboardState?.subscribe(update);

  function showFeedback(message, error = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.toggleAttribute('data-error', error);
    window.clearTimeout(feedbackTimer);
    if (message) feedbackTimer = window.setTimeout(() => { feedback.textContent = ''; feedback.removeAttribute('data-error'); }, 5000);
  }

  async function queueCommand(command) {
    if (busy || !activeDevice?.id) return;
    if (!activeDevice || activeDevice.state !== 'connected' || !stateSnapshot) {
      showFeedback('Open Ultimate Macro on the PC first.', true);
      return;
    }
    if (command === 'stop' && !window.confirm('Stop the macro on this PC now?')) return;
    busy = true;
    update({ devices: [activeDevice], unavailable: false });
    showFeedback('Sending to the PC…');
    try {
      await fetch('/api/dashboard/v1/session/bootstrap', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
      });
      const response = await fetch('/api/dashboard/v1/remote/commands', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ deviceId: activeDevice.id, command })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not reach the PC.');
      showFeedback('Sent. Waiting for the PC…');
      window.setTimeout(() => window.UMDashboardState?.refresh(), 1800);
    } catch (error) {
      showFeedback(error.message || 'Could not send that action.', true);
    } finally {
      busy = false;
      update(currentState);
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => queueCommand(button.dataset.remoteCommand)));
})();
