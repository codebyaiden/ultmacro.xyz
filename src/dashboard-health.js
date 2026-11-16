(() => {
  const page = document.querySelector('.dashboard-health-page, .dashboard-overview-page');
  if (!page || !window.UMDashboardState) return;
  const number = new Intl.NumberFormat();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unitKey = 'um-health-temperature-unit-v1';
  const unitSelect = document.querySelector('[data-health-unit]');
  const temperatureHelp = document.querySelector('[data-temperature-help]');
  let unit = 'C';
  try { unit = localStorage.getItem(unitKey) === 'F' ? 'F' : 'C'; } catch {}
  if (unitSelect) unitSelect.value = unit;

  const formatTemperature = celsius => {
    const value = unit === 'F' ? celsius * 9 / 5 + 32 : celsius;
    return `${Math.round(value)}°${unit}`;
  };
  const animateText = (element, target, suffix = '') => {
    if (!element) return;
    const endValue = Number.isFinite(target) ? target : null;
    if (endValue === null) {
      element.textContent = '—';
      element.removeAttribute('data-value');
      return;
    }
    const old = Number(element.dataset.value);
    const startValue = Number.isFinite(old) ? old : 0;
    if (reduceMotion) {
      element.textContent = `${Math.round(endValue)}${suffix}`;
      element.dataset.value = String(endValue);
      return;
    }
    const start = performance.now();
    const duration = 760;
    const draw = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * eased;
      element.textContent = `${Math.round(current)}${suffix}`;
      if (progress < 1) requestAnimationFrame(draw);
      else element.dataset.value = String(endValue);
    };
    requestAnimationFrame(draw);
  };
  const setGauge = (key, value, label, detail, max = 100) => {
    const card = document.querySelector(`[data-health-gauge="${key}"]`);
    const reading = page.querySelector(`[data-reading="${key}"]`);
    const detailNode = document.querySelector(`[data-health-detail="${key}"]`);
    const ring = page.querySelector(`[data-ring="${key}"]`);
    const available = Number.isFinite(value);
    card?.toggleAttribute('data-unavailable', !available);
    if (card) card.dataset.unavailable = String(!available);
    if (reading) {
      if (key === 'temperature' && available) {
        const c = unit === 'F' ? (value * 9 / 5 + 32) : value;
        animateText(reading, c, `°${unit}`);
      } else animateText(reading, value, '%');
    }
    if (detailNode) detailNode.textContent = available ? detail || '' : key === 'temperature' && detail ? detail : 'Unavailable';
    if (ring) {
      const fraction = available ? Math.max(0, Math.min(1, value / max)) : 0;
      if (ring.tagName.toLowerCase() === 'circle') ring.style.strokeDashoffset = String(307.9 * (1 - fraction));
      else ring.style.width = `${fraction * 100}%`;
    }
    if (card && key === 'temperature') {
      card.dataset.level = !available ? 'unknown' : value >= 85 ? 'hot' : value >= 70 ? 'warm' : value < 35 ? 'cool' : 'neutral';
      if (available) card.setAttribute('aria-label', `CPU temperature ${formatTemperature(value)}`);
      else card.removeAttribute('aria-label');
    }
  };

  function update(state) {
    const device = window.UMDashboardState.activeDesktop(state);
    const snapshot = device?.state === 'connected' ? device.snapshot : null;
    const health = snapshot?.health;
    const empty = document.querySelector('[data-health-empty]');
    const available = Boolean(health);
    if (empty) {
      empty.hidden = available;
      if (!available) empty.textContent = state.unavailable ? 'Could not reach your PC.' : device?.state === 'offline' ? 'Your PC is offline.' : device ? 'Health readings are not available in this desktop build.' : 'Connect a Windows PC to see live readings.';
    }
    if (!health) {
      setGauge('cpu', NaN, '', '', 100); setGauge('memory', NaN, '', '', 100); setGauge('gpu', NaN, '', '', 100); setGauge('temperature', NaN, '', '', 100);
      if (temperatureHelp) temperatureHelp.hidden = true;
    } else {
      const memory = health.memoryTotalBytes > 0 ? health.memoryUsedBytes / health.memoryTotalBytes * 100 : NaN;
      const memoryDetail = health.memoryTotalBytes > 0 ? `${formatBytes(health.memoryUsedBytes)} of ${formatBytes(health.memoryTotalBytes)}` : '';
      const cpuTemp = Array.isArray(health.temperatures) ? health.temperatures.find(item => /cpu package|cpu core/i.test(item.label)) : null;
      setGauge('cpu', health.cpuPercent, '', 'Current load');
      setGauge('memory', memory, '', memoryDetail);
      setGauge('gpu', health.gpuPercent, '', 'Current load');
      const tempStatus = health.temperatureStatus || (cpuTemp ? 'ready' : 'provider_missing');
      const tempDetail = cpuTemp?.label || (tempStatus === 'provider_missing'
        ? 'LibreHardwareMonitor not detected'
        : tempStatus === 'cpu_sensor_unavailable' ? 'No CPU package/core sensor found' : 'CPU sensor unavailable');
      setGauge('temperature', cpuTemp && Number.isFinite(cpuTemp.celsius) ? cpuTemp.celsius : NaN, '', tempDetail, 100);
      if (temperatureHelp) temperatureHelp.hidden = !['provider_missing', 'cpu_sensor_unavailable'].includes(tempStatus);
      const sampled = Date.parse(health.sampledAt);
      const timestamp = Number.isFinite(sampled) ? new Date(sampled).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '';
      document.querySelectorAll('[data-health-sampled]').forEach(node => { node.textContent = timestamp ? `Updated ${timestamp}` : ''; });
      renderProcesses(health.processes || [], snapshot, device);
    }
    renderCooldown(snapshot, device);
  }

  function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB']; let amount = value, index = 0;
    while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index++; }
    return `${amount >= 10 || index === 0 ? Math.round(amount) : amount.toFixed(1)} ${units[index]}`;
  }

  function renderProcesses(processes, snapshot, device) {
    const list = document.querySelector('[data-health-process-list]');
    const section = document.querySelector('[data-health-processes]');
    if (!list || !section) return;
    list.replaceChildren();
    section.hidden = !processes.length;
    for (const process of processes) {
      const row = document.createElement('div'); row.className = 'devices-health-process';
      const copy = document.createElement('div'); copy.className = 'devices-health-process-copy';
      const title = document.createElement('strong'); title.textContent = process.name;
      const sub = document.createElement('span'); sub.textContent = `${Math.round(process.cpuPercent)}% CPU · ${formatBytes(process.memoryBytes)}`;
      copy.append(title, sub);
      const close = document.createElement('button'); close.type = 'button'; close.className = 'devices-health-close'; close.textContent = 'Close app';
      close.disabled = !snapshot?.capabilities?.includes('process_close') || !process.startedAt;
      close.addEventListener('click', async () => {
        if (!window.confirm(`Ask ${process.name} to close? It may show a prompt if there is unsaved work.`)) return;
        close.disabled = true;
        try { await sendCommand(device, 'close_selected_process', { pid: process.pid, name: process.name, startedAt: process.startedAt }); }
        catch (error) { report(error.message); }
        finally { close.disabled = false; }
      });
      row.append(copy, close); list.append(row);
    }
  }

  function renderCooldown(snapshot, device) {
    const form = document.querySelector('[data-cooldown-form]');
    if (!form) return;
    const supported = snapshot?.capabilities?.includes('cooldown_mode_v1');
    const mode = snapshot?.cooldown?.mode;
    const active = Boolean(mode && mode !== 'idle');
    const start = form.querySelector('[data-cooldown-start]');
    const cancel = form.querySelector('[data-cooldown-cancel]');
    const state = document.querySelector('[data-cooldown-state]');
    const summary = document.querySelector('[data-cooldown-summary]');
    start.disabled = !supported || !device || active;
    cancel.hidden = !active;
    if (state) state.textContent = active ? ({ waiting_for_match: 'After this match', cooling: 'Cooling down', ready: 'Ready to resume' }[snapshot.cooldown.phase] || 'Active') : supported ? 'Ready' : 'Unavailable';
    if (summary) summary.textContent = active ? cooldownDescription(snapshot.cooldown) : supported ? 'Choose a timer or a safe CPU temperature. The PC handles the cooldown even if you close this page.' : 'Cooldown controls will appear after the desktop companion supports them.';
    const tempOption = form.querySelector('option[value="temperature"]');
    const cpuTemp = snapshot?.health?.temperatures?.some(item => /cpu package|cpu core/i.test(item.label));
    if (tempOption) tempOption.disabled = !cpuTemp;
    const target = form.querySelector('[data-cooldown-temp-wrap]');
    const minutes = form.querySelector('[data-cooldown-minutes-wrap]');
    target.hidden = form.elements.mode.value !== 'temperature';
    minutes.hidden = form.elements.mode.value === 'temperature';
  }

  function cooldownDescription(cooldown) {
    if (cooldown.phase === 'waiting_for_match') return 'The current match will finish before cooldown begins.';
    if (cooldown.phase === 'cooling' && Number.isFinite(cooldown.remainingSeconds)) return `Cooling down · ${Math.ceil(cooldown.remainingSeconds / 60)} min left`;
    if (cooldown.phase === 'cooling' && Number.isFinite(cooldown.currentC) && Number.isFinite(cooldown.targetC)) return `CPU ${formatTemperature(cooldown.currentC)} · resumes at ${formatTemperature(cooldown.targetC)}`;
    if (cooldown.phase === 'ready') return cooldown.resumeAutomatically ? 'Resuming the macro…' : 'Cooldown is complete.';
    return 'Cooldown is active.';
  }

  async function sendCommand(device, command, payload) {
    if (!device?.id) throw new Error('Connect a Windows PC first.');
    const bootstrap = await fetch('/api/dashboard/v1/session/bootstrap', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!bootstrap.ok) throw new Error('Your dashboard session expired. Refresh and try again.');
    const response = await fetch('/api/dashboard/v1/remote/commands', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ deviceId: device.id, command, ...(payload ? { payload } : {}) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The PC could not accept that request.');
    report('Sent to your PC.');
    window.setTimeout(() => window.UMDashboardState.refresh(), 900);
  }
  const report = message => { const node = document.querySelector('[data-health-feedback]'); if (node) node.textContent = message; };

  unitSelect?.addEventListener('change', () => {
    unit = unitSelect.value === 'F' ? 'F' : 'C';
    try { localStorage.setItem(unitKey, unit); } catch {}
    document.querySelectorAll('[data-cooldown-temp-wrap] option').forEach(option => { option.textContent = formatTemperature(Number(option.value)); });
    const temperatureReading = document.querySelector('[data-reading="temperature"]');
    if (temperatureReading) temperatureReading.removeAttribute('data-value');
    window.UMDashboardState.refresh();
  });
  document.querySelectorAll('[data-cooldown-temp-wrap] option').forEach(option => { option.textContent = formatTemperature(Number(option.value)); });
  const modeSelect = document.querySelector('[data-cooldown-mode]');
  modeSelect?.addEventListener('change', () => {
    const form = modeSelect.closest('form');
    form.querySelector('[data-cooldown-temp-wrap]').hidden = modeSelect.value !== 'temperature';
    form.querySelector('[data-cooldown-minutes-wrap]').hidden = modeSelect.value === 'temperature';
  });
  document.querySelector('[data-cooldown-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const device = window.UMDashboardState.activeDesktop();
    const mode = form.elements.mode.value;
    const payload = { mode, resumeAutomatically: form.elements.resumeAutomatically.checked };
    if (mode === 'minutes') payload.minutes = Number(form.elements.minutes.value);
    else payload.targetC = Number(form.elements.targetC.value);
    form.querySelector('[data-cooldown-start]').disabled = true;
    try { await sendCommand(device, 'start_cooldown', payload); }
    catch (error) { report(error.message); form.querySelector('[data-cooldown-start]').disabled = false; }
  });
  document.querySelector('[data-cooldown-cancel]')?.addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try { await sendCommand(window.UMDashboardState.activeDesktop(), 'cancel_cooldown'); }
    catch (error) { report(error.message); button.disabled = false; }
  });
  window.UMDashboardState.subscribe(update);
})();
