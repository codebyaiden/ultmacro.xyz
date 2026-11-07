(() => {
  const list = document.querySelector('[data-strategy-device-list]');
  if (!list || !window.UMDashboardState) return;

  const appendText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  };

  window.UMDashboardState.subscribe((state) => {
    list.replaceChildren();
    if (state.unavailable) {
      appendText(list, 'p', 'strategy-empty-state', 'Could not load macro data.');
      return;
    }

    const devices = state.devices;
    if (!devices.length) {
      appendText(list, 'p', 'strategy-empty-state', 'No macro data yet.');
      return;
    }

    for (const device of devices) {
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
          if (isCurrent) appendText(row, 'span', 'strategy-slot-active', snapshot.runState === 'running' ? 'Running' : snapshot.runState === 'paused' ? 'Paused' : 'Selected');
          slotList.append(row);
        }
        card.append(slotList);
      }
      list.append(card);
    }
  });
})();
