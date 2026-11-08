(() => {
  const list = document.querySelector('[data-strategy-device-list]');
  const feedback = document.querySelector('[data-strategy-feedback]');
  if (!list || !window.UMDashboardState) return;

  let currentState = { devices: [], unavailable: false };
  let busy = false;

  const appendText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  function update(state) {
    currentState = state;
    list.replaceChildren();
    if (state.unavailable) {
      appendText(list, 'p', 'strategy-empty-state', 'Could not load macro data.');
      return;
    }
    if (!state.devices.length) {
      appendText(list, 'p', 'strategy-empty-state', 'No macro data yet.');
      return;
    }

    for (const device of state.devices) {
      const card = document.createElement('section');
      card.className = 'strategy-device';
      const heading = document.createElement('header');
      heading.className = 'strategy-device-heading';
      const title = appendText(heading, 'h2', '', device.name || 'This PC');
      title.id = `strategy-device-${device.id}`;
      appendText(heading, 'span', `strategy-device-state is-${device.state}`, device.state === 'connected' ? 'Online' : 'Offline');
      card.setAttribute('aria-labelledby', title.id);
      card.append(heading);

      const snapshot = device.snapshot;
      if (!snapshot || device.state !== 'connected') {
        appendText(card, 'p', 'strategy-empty-state', device.state === 'connected' ? 'Waiting for macro data.' : 'This PC is offline.');
        list.append(card);
        continue;
      }

      const runLabel = { running: 'Running', paused: 'Paused', stopped: 'Stopped' }[snapshot.runState] || '—';
      const context = [snapshot.map, snapshot.mode].filter(Boolean).join(' · ');
      const stateRow = document.createElement('div');
      stateRow.className = 'strategy-run-state';
      appendText(stateRow, 'strong', '', runLabel);
      if (context) appendText(stateRow, 'span', '', context);
      card.append(stateRow);

      const slots = Array.isArray(snapshot.strategySlots) ? snapshot.strategySlots : [];
      if (!slots.length) {
        appendText(card, 'p', 'strategy-empty-state', 'No configured strategies.');
      } else {
        const slotList = document.createElement('ol');
        slotList.className = 'strategy-slot-list';
        for (const slot of slots) {
          const row = document.createElement('li');
          const isCurrent = slot.slot === snapshot.activeSlot;
          appendText(row, 'span', 'strategy-slot-label', `Slot ${slot.slot}`);
          appendText(row, 'strong', 'strategy-slot-name', slot.name);
          if (isCurrent) {
            appendText(row, 'span', 'strategy-slot-active', 'Selected');
          } else {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'strategy-select-button';
            button.textContent = 'Use next';
            button.dataset.strategySlot = String(slot.slot);
            button.dataset.deviceId = device.id;
            button.disabled = busy || snapshot.runState !== 'stopped' || device.state !== 'connected';
            button.setAttribute('aria-label', `Use ${slot.name} for the next run`);
            row.append(button);
          }
          slotList.append(row);
        }
        card.append(slotList);
      }
      list.append(card);
    }
  }

  function showFeedback(message, isError = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.toggleAttribute('data-error', isError);
  }

  async function selectStrategy(deviceId, slot) {
    const device = currentState.devices.find(item => item.id === deviceId);
    if (busy || !device) return;
    if (device.state !== 'connected' || !device.snapshot) {
      showFeedback('Open Ultimate Macro on the PC first.', true);
      return;
    }
    if (device.snapshot.runState !== 'stopped') {
      showFeedback('Stop the macro before switching strategies.', true);
      return;
    }

    busy = true;
    update(currentState);
    showFeedback('Sending to the PC…');
    try {
      await fetch('/api/dashboard/v1/session/bootstrap', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
      });
      const response = await fetch('/api/dashboard/v1/remote/commands', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ deviceId, command: `select_strategy_${slot}` })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not select that strategy.');

      const wantedSlot = Number(slot);
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 1000));
        await window.UMDashboardState.refresh();
        const latest = window.UMDashboardState.activeDesktop();
        if (latest?.id === deviceId && latest.snapshot?.activeSlot === wantedSlot) {
          showFeedback('Selected for the next run.');
          return;
        }
      }
      showFeedback('The PC hasn’t confirmed the change yet.', true);
    } catch (error) {
      showFeedback(error.message || 'Could not select that strategy.', true);
    } finally {
      busy = false;
      update(currentState);
    }
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-strategy-slot]');
    if (button) selectStrategy(button.dataset.deviceId, button.dataset.strategySlot);
  });
  window.UMDashboardState.subscribe(update);
})();
