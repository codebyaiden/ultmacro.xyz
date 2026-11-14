(() => {
  const list = document.querySelector('[data-strategy-device-list]');
  const feedback = document.querySelector('[data-strategy-feedback]');
  if (!list || !window.UMDashboardState) return;

  let currentState = { devices: [], unavailable: false };
  let busy = false;
  const editors = new Map();
  const pinStorageKey = 'um.dashboard.strategy-pins.v1';
  function readPins() {
    try {
      const value = JSON.parse(localStorage.getItem(pinStorageKey) || '[]');
      return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
    } catch { return new Set(); }
  }
  const pinnedStrategies = readPins();
  function savePins() {
    try { localStorage.setItem(pinStorageKey, JSON.stringify([...pinnedStrategies])); } catch { }
  }

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
          const actions = document.createElement('div');
          actions.className = 'strategy-slot-actions';
          if (isCurrent) appendText(actions, 'span', 'strategy-slot-active', 'Selected');
          else {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'strategy-select-button';
            button.textContent = 'Use next';
            button.dataset.strategySlot = String(slot.slot);
            button.dataset.deviceId = device.id;
            button.disabled = busy || snapshot.runState !== 'stopped' || device.state !== 'connected';
            button.setAttribute('aria-label', `Use ${slot.name} for the next run`);
            actions.append(button);
          }
          const editButton = document.createElement('button');
          editButton.type = 'button';
          editButton.className = 'strategy-edit-button';
          editButton.textContent = editors.has(`${device.id}:${slot.slot}`) ? 'Close editor' : 'Edit code';
          editButton.dataset.strategyEdit = String(slot.slot);
          editButton.dataset.deviceId = device.id;
          editButton.disabled = busy || device.state !== 'connected';
          actions.append(editButton);
          row.append(actions);
          slotList.append(row);
          if (editors.has(`${device.id}:${slot.slot}`)) {
            const editorRow = document.createElement('li');
            editorRow.className = 'strategy-editor-row';
            const editor = document.createElement('section');
            editor.className = 'strategy-editor';
            const textarea = document.createElement('textarea');
            textarea.className = 'strategy-code-input';
            textarea.spellcheck = false;
            textarea.setAttribute('aria-label', `Raw strategy code for slot ${slot.slot}`);
            textarea.dataset.strategyCode = String(slot.slot);
            textarea.dataset.deviceId = device.id;
            textarea.value = editors.get(`${device.id}:${slot.slot}`).text || '';
            textarea.placeholder = 'Load the strategy from the PC to edit its raw .strat code.';
            textarea.disabled = busy;
            editor.append(textarea);
            const controls = document.createElement('div');
            controls.className = 'strategy-editor-controls';
            const load = document.createElement('button');
            load.type = 'button';
            load.className = 'strategy-edit-button';
            load.textContent = 'Load from PC';
            load.dataset.strategyLoad = String(slot.slot);
            load.dataset.deviceId = device.id;
            load.disabled = busy;
            const save = document.createElement('button');
            save.type = 'button';
            save.className = 'strategy-select-button';
            save.textContent = editors.get(`${device.id}:${slot.slot}`).queued ? 'Saved for next game' : 'Save for next game';
            save.dataset.strategySave = String(slot.slot);
            save.dataset.deviceId = device.id;
            save.disabled = busy || !editors.get(`${device.id}:${slot.slot}`).base || editors.get(`${device.id}:${slot.slot}`).queued;
            controls.append(load, save);
            editor.append(controls);
            editorRow.append(editor);
            slotList.append(editorRow);
          }
        }
        card.append(slotList);
      }

      const files = Array.isArray(snapshot.availableStrategies) ? snapshot.availableStrategies : [];
      if (files.length) {
        appendText(card, 'h3', 'strategy-library-heading', 'Saved strategies');
        const fileList = document.createElement('ol');
        fileList.className = 'strategy-slot-list strategy-library-list';
        for (const file of [...files].sort((a, b) => {
          const aPinned = pinnedStrategies.has(`${device.id}:file:${a.id}`);
          const bPinned = pinnedStrategies.has(`${device.id}:file:${b.id}`);
          return Number(bPinned) - Number(aPinned) || String(b.modified || '').localeCompare(String(a.modified || ''));
        })) {
          const key = `${device.id}:file:${file.id}`;
          const row = document.createElement('li');
          appendText(row, 'span', 'strategy-slot-label', 'File');
          appendText(row, 'strong', 'strategy-slot-name', file.name);
          const actions = document.createElement('div');
          actions.className = 'strategy-slot-actions';
          const pin = document.createElement('button');
          pin.type = 'button';
          pin.className = 'strategy-edit-button strategy-pin-button';
          pin.textContent = pinnedStrategies.has(key) ? 'Pinned' : 'Pin';
          pin.dataset.strategyPin = file.id;
          pin.dataset.deviceId = device.id;
          pin.setAttribute('aria-pressed', String(pinnedStrategies.has(key)));
          const replace = document.createElement('button');
          replace.type = 'button';
          replace.className = 'strategy-select-button';
          replace.textContent = 'Replace current';
          replace.dataset.strategyReplace = file.id;
          replace.dataset.deviceId = device.id;
          replace.dataset.strategyName = file.name;
          replace.disabled = busy || device.state !== 'connected';
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'strategy-edit-button';
          edit.textContent = editors.has(key) ? 'Close editor' : 'Edit code';
          edit.dataset.strategyFileEdit = file.id;
          edit.dataset.deviceId = device.id;
          edit.disabled = busy || device.state !== 'connected';
          actions.append(pin, replace, edit);
          row.append(actions);
          fileList.append(row);

          if (editors.has(key)) {
            const editorRow = document.createElement('li');
            editorRow.className = 'strategy-editor-row';
            const editor = document.createElement('section');
            editor.className = 'strategy-editor';
            const textarea = document.createElement('textarea');
            textarea.className = 'strategy-code-input';
            textarea.spellcheck = false;
            textarea.setAttribute('aria-label', `Raw strategy code for ${file.name}`);
            textarea.dataset.strategyFileCode = file.id;
            textarea.dataset.deviceId = device.id;
            textarea.value = editors.get(key).text || '';
            textarea.placeholder = 'Load the strategy from the PC to edit its raw .strat code.';
            textarea.disabled = busy;
            editor.append(textarea);
            const controls = document.createElement('div');
            controls.className = 'strategy-editor-controls';
            const load = document.createElement('button');
            load.type = 'button';
            load.className = 'strategy-edit-button';
            load.textContent = 'Reload from PC';
            load.dataset.strategyFileLoad = file.id;
            load.dataset.deviceId = device.id;
            load.disabled = busy;
            const save = document.createElement('button');
            save.type = 'button';
            save.className = 'strategy-select-button';
            save.textContent = editors.get(key).queued ? 'Saved for next game' : 'Save for next game';
            save.dataset.strategyFileSave = file.id;
            save.dataset.deviceId = device.id;
            save.disabled = busy || !editors.get(key).base || editors.get(key).queued;
            controls.append(load, save);
            editor.append(controls);
            editorRow.append(editor);
            fileList.append(editorRow);
          }
        }
        card.append(fileList);
      } else {
        appendText(card, 'p', 'strategy-empty-state', 'No saved strategy files.');
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

  async function command(deviceId, action, payload = null) {
    await fetch('/api/dashboard/v1/session/bootstrap', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
    });
    const response = await fetch('/api/dashboard/v1/remote/commands', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ deviceId, command: action, ...(payload ? { payload } : {}) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not reach the PC.');
    for (let attempt = 0; attempt < 36; attempt++) {
      await new Promise(resolve => window.setTimeout(resolve, 700));
      const statusResponse = await fetch(`/api/dashboard/v1/remote/commands/${encodeURIComponent(result.id)}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }
      });
      const status = await statusResponse.json().catch(() => ({}));
      if (!statusResponse.ok) throw new Error(status.error || 'Could not check the PC response.');
      if (status.status === 'succeeded') return status;
      if (status.status === 'failed' || status.status === 'expired') throw new Error(status.message || 'The PC could not complete that request.');
    }
    throw new Error('The PC hasn’t replied yet. Keep Ultimate Macro open and try again.');
  }

  async function replaceStrategy(deviceId, strategyId, strategyName, applyWhen) {
    if (busy) return;
    busy = true;
    update(currentState);
    showFeedback(applyWhen === 'next_restart' ? 'Saving the strategy for the next restart…' : 'Switching strategy for the next run…');
    try {
      await command(deviceId, 'select_strategy_1', { strategyId, applyWhen });
      showFeedback(applyWhen === 'next_restart'
        ? `${strategyName} will be selected after Ultimate Macro restarts.`
        : `${strategyName} is selected for the next run.`);
    } catch (error) {
      showFeedback(error.message || 'Could not replace the current strategy.', true);
    } finally {
      busy = false;
      update(currentState);
    }
  }

  function openReplaceMenu(deviceId, strategyId, strategyName) {
    const device = currentState.devices.find(item => item.id === deviceId);
    if (!device || device.state !== 'connected') return;
    const dialog = document.createElement('dialog');
    dialog.className = 'strategy-replace-dialog';
    const content = document.createElement('section');
    content.className = 'strategy-replace-panel';
    appendText(content, 'h2', '', 'Replace current strategy?');
    appendText(content, 'p', '', `Choose when ${strategyName} should take over.`);
    const actions = document.createElement('div');
    actions.className = 'strategy-replace-options';
    const nextRun = document.createElement('button');
    nextRun.type = 'button';
    nextRun.className = 'strategy-select-button';
    nextRun.textContent = 'Next run';
    nextRun.disabled = device.snapshot?.runState !== 'stopped';
    nextRun.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
      replaceStrategy(deviceId, strategyId, strategyName, 'next_run');
    });
    const afterRestart = document.createElement('button');
    afterRestart.type = 'button';
    afterRestart.className = 'strategy-edit-button';
    afterRestart.textContent = 'After restart';
    afterRestart.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
      replaceStrategy(deviceId, strategyId, strategyName, 'next_restart');
    });
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'strategy-edit-button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { dialog.close(); dialog.remove(); });
    actions.append(nextRun, afterRestart, cancel);
    content.append(actions);
    dialog.append(content);
    dialog.addEventListener('cancel', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
  }

  async function loadCode(deviceId, slot, strategyId = null) {
    const device = currentState.devices.find(item => item.id === deviceId);
    if (busy || device?.state !== 'connected') return;
    busy = true;
    const key = strategyId ? `${deviceId}:file:${strategyId}` : `${deviceId}:${slot}`;
    editors.set(key, { ...(editors.get(key) || {}), text: '' });
    update(currentState);
    showFeedback('Loading strategy from the PC…');
    try {
      const response = await command(deviceId, `read_strategy_${slot}`, strategyId ? { strategyId } : null);
      if (!response.data || (strategyId ? response.data.strategyId !== strategyId : response.data.slot !== Number(slot)) || typeof response.data.strategyText !== 'string') throw new Error('The PC returned an incomplete strategy file.');
      editors.set(key, { text: response.data.strategyText, base: { modified: response.data.modified, size: response.data.size } });
      showFeedback('Loaded from the PC.');
    } catch (error) {
      editors.set(key, { ...(editors.get(key) || {}), text: '' });
      showFeedback(error.message || 'Could not load the strategy.', true);
    } finally {
      busy = false;
      update(currentState);
    }
  }

  async function saveCode(deviceId, slot, textarea, strategyId = null) {
    const key = strategyId ? `${deviceId}:file:${strategyId}` : `${deviceId}:${slot}`;
    const editor = editors.get(key);
    const device = currentState.devices.find(item => item.id === deviceId);
    if (busy || !editor?.base || device?.state !== 'connected') return;
    if (new TextEncoder().encode(textarea.value).length > 2 * 1024 * 1024) {
      showFeedback('The strategy file must be 2 MB or smaller.', true);
      return;
    }
    busy = true;
    editors.set(key, { ...editor, text: textarea.value });
    update(currentState);
    showFeedback('Checking and sending the strategy…');
    try {
      await command(deviceId, 'stage_strategy_edit', {
        ...(strategyId ? { strategyId } : { slot: Number(slot) }), strategyText: textarea.value,
        baseModified: editor.base.modified, baseSize: editor.base.size
      });
      editors.set(key, { ...editor, text: textarea.value, queued: true });
      showFeedback('Saved to the strategy file. It will load for the next game.');
    } catch (error) {
      showFeedback(error.message || 'Could not save the strategy.', true);
    } finally {
      busy = false;
      update(currentState);
    }
  }

  list.addEventListener('click', event => {
    const pin = event.target.closest('[data-strategy-pin]');
    if (pin) {
      const key = `${pin.dataset.deviceId}:file:${pin.dataset.strategyPin}`;
      if (pinnedStrategies.has(key)) pinnedStrategies.delete(key);
      else pinnedStrategies.add(key);
      savePins();
      update(currentState);
      return;
    }
    const replace = event.target.closest('[data-strategy-replace]');
    if (replace) {
      openReplaceMenu(replace.dataset.deviceId, replace.dataset.strategyReplace, replace.dataset.strategyName);
      return;
    }
    const button = event.target.closest('[data-strategy-slot]');
    if (button) selectStrategy(button.dataset.deviceId, button.dataset.strategySlot);
    const edit = event.target.closest('[data-strategy-edit]');
    if (edit) {
      const key = `${edit.dataset.deviceId}:${edit.dataset.strategyEdit}`;
      if (editors.has(key)) { editors.delete(key); update(currentState); }
      else { editors.set(key, { text: '' }); loadCode(edit.dataset.deviceId, edit.dataset.strategyEdit); }
    }
    const load = event.target.closest('[data-strategy-load]');
    if (load) loadCode(load.dataset.deviceId, load.dataset.strategyLoad);
    const save = event.target.closest('[data-strategy-save]');
    if (save) {
      const panel = save.closest('.strategy-editor');
      const textarea = panel?.querySelector('.strategy-code-input');
      if (textarea) saveCode(save.dataset.deviceId, save.dataset.strategySave, textarea);
    }
    const fileEdit = event.target.closest('[data-strategy-file-edit]');
    if (fileEdit) {
      const key = `${fileEdit.dataset.deviceId}:file:${fileEdit.dataset.strategyFileEdit}`;
      if (editors.has(key)) { editors.delete(key); update(currentState); }
      else { editors.set(key, { text: '' }); loadCode(fileEdit.dataset.deviceId, 1, fileEdit.dataset.strategyFileEdit); }
    }
    const fileLoad = event.target.closest('[data-strategy-file-load]');
    if (fileLoad) loadCode(fileLoad.dataset.deviceId, 1, fileLoad.dataset.strategyFileLoad);
    const fileSave = event.target.closest('[data-strategy-file-save]');
    if (fileSave) {
      const panel = fileSave.closest('.strategy-editor');
      const textarea = panel?.querySelector('.strategy-code-input');
      if (textarea) saveCode(fileSave.dataset.deviceId, 1, textarea, fileSave.dataset.strategyFileSave);
    }
  });
  list.addEventListener('input', event => {
    const textarea = event.target.closest('[data-strategy-code], [data-strategy-file-code]');
    if (!textarea) return;
    const key = textarea.dataset.strategyFileCode
      ? `${textarea.dataset.deviceId}:file:${textarea.dataset.strategyFileCode}`
      : `${textarea.dataset.deviceId}:${textarea.dataset.strategyCode}`;
    const previous = editors.get(key);
    if (previous) editors.set(key, { ...previous, text: textarea.value });
  });
  window.UMDashboardState.subscribe(update);
})();
