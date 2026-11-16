(() => {
  const page = document.querySelector('.dashboard-earnings-page');
  if (!page) return;

  const resources = {
    coins: { label: 'Coins', color: '#dfb765' },
    gems: { label: 'Gems', color: '#c589e9' },
    towerXp: { label: 'Tower XP', color: '#5dc2dc' },
    spinTickets: { label: 'Spin Tickets', color: '#e2b84e' },
    timescaleTickets: { label: 'Timescale Tickets', color: '#6ee761' }
  };
  const ranges = {
    hour: 'Past hour',
    day: 'Past 24 hours',
    week: 'Past 7 days',
    month: 'Past 30 days'
  };
  const number = new Intl.NumberFormat();
  const chart = page.querySelector('[data-chart]');
  const chartEmpty = page.querySelector('[data-chart-empty]');
  const labels = page.querySelector('[data-chart-labels]');
  const eventList = page.querySelector('[data-event-list]');
  const latestEmpty = page.querySelector('[data-latest-empty]');
  const cadence = page.querySelector('[data-chart-cadence]');
  const chartTitle = page.querySelector('[data-chart-title]');
  const goalPanel = page.querySelector('[data-goal-panel]');
  const goalDeviceLabel = page.querySelector('[data-goal-device]');
  const goalDialogDeviceLabel = page.querySelector('[data-goal-dialog-device]');
  const goalStatus = page.querySelector('[data-goal-status]');
  const goalProgress = page.querySelector('[data-goal-progress]');
  const goalOpen = page.querySelector('[data-goal-open]');
  const goalRemove = page.querySelector('[data-goal-remove]');
  const goalDialog = page.querySelector('[data-goal-dialog]');
  const goalDialogTitle = page.querySelector('#earnings-goal-dialog-title');
  const goalForm = page.querySelector('[data-goal-form]');
  const goalDialogStatus = page.querySelector('[data-goal-dialog-status]');
  const goalSave = page.querySelector('[data-goal-save]');
  const ticketRun = page.querySelector('[data-ticket-run]');
  const nerdStatus = page.querySelector('[data-nerd-status]');
  let activeDevice = null;
  let activeGoal = null;
  let goalCommandBusy = false;
  let selectedResource = 'coins';
  let selectedRange = 'day';
  let requestId = 0;

  const formatTime = (value, withDate = false) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, withDate
      ? { month: 'short', day: 'numeric' }
      : { hour: 'numeric', minute: '2-digit' }).format(date);
  };

  function totalsFor(event) {
    const parts = [];
    if (Number.isSafeInteger(event.coins)) parts.push(`${number.format(event.coins)} coins`);
    if (Number.isSafeInteger(event.gems)) parts.push(`${number.format(event.gems)} gems`);
    if (Number.isSafeInteger(event.towerXp)) parts.push(`${number.format(event.towerXp)} XP`);
    return parts.length ? `+${parts.join(' · +')}` : 'Rewards not detected';
  }

  function ticketBadge(src, label, amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    const badge = document.createElement('span');
    badge.className = 'earnings-ticket-badge';
    const icon = document.createElement('img');
    icon.src = src;
    icon.alt = '';
    const text = document.createElement('span');
    text.textContent = `${number.format(amount)} ${label}`;
    badge.append(icon, text);
    return badge;
  }

  function durationLabel(seconds) {
    if (!Number.isSafeInteger(seconds) || seconds < 0) return 'Time unavailable';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  function renderNerdStats(stats) {
    if (!stats) {
      nerdStatus.textContent = 'Statistics are unavailable right now.';
      page.querySelectorAll('[data-nerd]').forEach(node => { node.textContent = '—'; });
      return;
    }
    const totalMatches = Number.isSafeInteger(stats.totalMatches) ? stats.totalMatches : 0;
    nerdStatus.textContent = totalMatches
      ? `From ${number.format(totalMatches)} matches recorded in the last 30 days.`
      : 'No match results recorded in the last 30 days.';
    const values = {
      totalMatches: number.format(totalMatches),
      wins: number.format(Number.isSafeInteger(stats.wins) ? stats.wins : 0),
      losses: number.format(Number.isSafeInteger(stats.losses) ? stats.losses : 0),
      winRate: Number.isFinite(stats.winRate) ? `${number.format(stats.winRate)}%` : '—',
      winLossRatio: Number.isFinite(stats.winLossRatio) ? number.format(stats.winLossRatio) : (totalMatches && !stats.losses ? 'No losses yet' : '—'),
      coinsPerHour: Number.isSafeInteger(stats.coinsPerHour) ? `${number.format(stats.coinsPerHour)} / hour` : '—',
      gemsPerHour: Number.isSafeInteger(stats.gemsPerHour) ? `${number.format(stats.gemsPerHour)} / hour` : '—',
      xpPerHour: Number.isSafeInteger(stats.xpPerHour) ? `${number.format(stats.xpPerHour)} / hour` : '—',
      averageDurationSeconds: Number.isSafeInteger(stats.averageDurationSeconds) ? durationLabel(stats.averageDurationSeconds) : '—'
    };
    for (const [key, value] of Object.entries(values)) {
      const node = page.querySelector(`[data-nerd="${key}"]`);
      if (node) node.textContent = value;
    }
  }

  function renderLatest(events) {
    eventList.replaceChildren();
    latestEmpty.hidden = events.length > 0;
    for (const event of events) {
      const row = document.createElement('li');
      row.className = `earnings-event earnings-event-${event.type === 'match.victory' ? 'victory' : 'loss'}`;

      const top = document.createElement('div');
      top.className = 'earnings-event-top';
      const source = document.createElement('div');
      source.className = 'earnings-event-source';
      const marker = document.createElement('span');
      marker.className = 'earnings-result-mark';
      marker.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = event.type === 'match.victory' ? 'Victory' : 'Loss';
      source.append(marker, name);
      const time = document.createElement('time');
      time.dateTime = event.occurredAt;
      time.textContent = formatTime(event.occurredAt, true);
      top.append(source, time);
      const context = document.createElement('div');
      context.className = 'earnings-event-context';
      const map = document.createElement('span');
      map.textContent = event.map || 'Map unavailable';
      const duration = document.createElement('span');
      duration.textContent = durationLabel(event.durationSeconds);
      context.append(map, duration);
      const bottom = document.createElement('div');
      bottom.className = 'earnings-event-bottom';
      const detail = document.createElement('strong');
      detail.textContent = totalsFor(event);
      const tickets = document.createElement('div');
      tickets.className = 'earnings-event-tickets';
      const spin = ticketBadge('/assets/dashboard-icons/spin-wheel-ticket.png', 'Spin', event.spinTickets);
      const timescale = ticketBadge('/assets/dashboard-icons/timescale-ticket.png', 'Timescale', event.timescaleTickets);
      if (spin) tickets.append(spin);
      if (timescale) tickets.append(timescale);
      bottom.append(detail, tickets);
      row.append(top, context, bottom);
      eventList.append(row);
    }
  }

  function renderChart(data) {
    const color = resources[selectedResource].color;
    const values = data.buckets.map(bucket => bucket[selectedResource] || 0);
    const maxValue = Math.max(...values, 0);
    chart.replaceChildren();
    labels.replaceChildren();

    if (maxValue === 0) {
      chart.hidden = true;
      chartEmpty.hidden = false;
      chartEmpty.textContent = `No verified ${resources[selectedResource].label.toLowerCase()} in this period.`;
      return;
    }

    chart.hidden = false;
    chartEmpty.hidden = true;
    const width = 800;
    const height = 190;
    const left = 58;
    const right = 12;
    const top = 12;
    const bottom = 24;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const baseY = top + plotHeight;
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    chart.setAttribute('aria-label', `${resources[selectedResource].label} earned ${number.format(data.totals[selectedResource] || 0)} ${ranges[selectedRange].toLowerCase()}`);

    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grid.setAttribute('class', 'earnings-chart-grid');
    for (let index = 0; index <= 3; index += 1) {
      const y = top + plotHeight * index / 3;
      const line = document.createElementNS(grid.namespaceURI, 'line');
      line.setAttribute('x1', left);
      line.setAttribute('x2', width - right);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      grid.append(line);
      const text = document.createElementNS(grid.namespaceURI, 'text');
      text.setAttribute('x', 0);
      text.setAttribute('y', y + 4);
      text.textContent = number.format(Math.round(maxValue * (3 - index) / 3));
      grid.append(text);
    }
    chart.append(grid);

    const bars = document.createElementNS(grid.namespaceURI, 'g');
    bars.setAttribute('class', 'earnings-chart-bars');
    const slot = plotWidth / Math.max(values.length, 1);
    const barWidth = Math.max(3, slot * 0.62);
    values.forEach((value, index) => {
      if (!value) return;
      const rect = document.createElementNS(grid.namespaceURI, 'rect');
      const barHeight = Math.max(3, value / maxValue * (plotHeight - 4));
      const x = left + slot * index + (slot - barWidth) / 2;
      rect.setAttribute('x', x);
      rect.setAttribute('y', baseY - barHeight);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('rx', Math.min(4, barWidth / 2));
      rect.setAttribute('fill', color);
      rect.setAttribute('style', `--bar-height:${barHeight}px`);
      const tip = document.createElementNS(grid.namespaceURI, 'title');
      tip.textContent = `${formatTime(data.buckets[index].start)} · ${number.format(value)} ${resources[selectedResource].label}`;
      rect.append(tip);
      bars.append(rect);
    });
    chart.append(bars);

    const first = data.buckets[0]?.start;
    const last = data.buckets.at(-1)?.start;
    labels.textContent = first && last
      ? `${formatTime(first, selectedRange === 'week' || selectedRange === 'month')} — ${formatTime(last, selectedRange === 'week' || selectedRange === 'month')}`
      : '';
  }

  function renderSummary(totals, ticketTotals) {
    const summaryKeys = {
      coins: ['coins', totals], gems: ['gems', totals], towerXp: ['tower-xp', totals],
      spinTickets: ['spin-tickets', ticketTotals], timescaleTickets: ['timescale-tickets', ticketTotals]
    };
    for (const [key, [summaryKey, source]] of Object.entries(summaryKeys)) {
      const value = page.querySelector(`[data-total="${summaryKey}"]`);
      if (value) value.textContent = Number.isSafeInteger(source[key]) && source[key] > 0 ? number.format(source[key]) : '—';
    }
  }

  function renderRunTickets(run) {
    if (!ticketRun) return;
    ticketRun.hidden = !run;
    if (!run) return;
    const values = {
      '[data-run-spin-tickets]': run.spinTickets,
      '[data-run-timescale-tickets]': run.timescaleTickets,
      '[data-run-timescale-used]': run.timescaleTicketsUsed
    };
    for (const [selector, value] of Object.entries(values)) {
      const node = ticketRun.querySelector(selector);
      if (node) node.textContent = Number.isSafeInteger(value) ? number.format(value) : '—';
    }
  }

  function renderGoal(state) {
    if (!goalPanel) return;
    activeDevice = window.UMDashboardState?.activeDesktop(state) || null;
    const deviceLabel = activeDevice?.name || 'This PC';
    if (goalDeviceLabel) goalDeviceLabel.textContent = deviceLabel;
    if (goalDialogDeviceLabel) goalDialogDeviceLabel.textContent = deviceLabel;
    const online = activeDevice?.state === 'connected' && Boolean(activeDevice.snapshot);
    const capabilities = activeDevice?.snapshot?.capabilities || [];
    const supported = online && capabilities.includes('farming_goal_v1');
    activeGoal = supported ? activeDevice.snapshot.farmingGoal : null;
    goalOpen.disabled = !supported || goalCommandBusy;
    goalOpen.textContent = activeGoal?.enabled ? 'Edit goal' : 'Set goal';
    goalRemove.hidden = !supported || !activeGoal?.enabled;
    goalRemove.disabled = goalCommandBusy;
    if (!online) {
      goalProgress.hidden = true;
      goalStatus.textContent = state?.unavailable ? 'Could not reach your PC.' : 'Connect a PC to see or set its farming goal.';
      return;
    }
    if (!supported) {
      goalProgress.hidden = true;
      goalStatus.textContent = 'Update Ultimate Macro to manage farming goals here.';
      return;
    }
    if (!activeGoal) {
      goalProgress.hidden = true;
      goalStatus.textContent = 'This PC has not shared its goal yet. Refresh the page in a moment.';
      return;
    }
    if (!activeGoal.enabled) {
      goalProgress.hidden = true;
      goalStatus.textContent = 'No goal set on this PC.';
      return;
    }
    const earned = Number.isSafeInteger(activeGoal.earned) ? activeGoal.earned : 0;
    const target = activeGoal.target;
    const remaining = Math.max(0, target - earned);
    const reached = activeGoal.reached || earned >= target;
    goalStatus.textContent = reached ? 'Reached — the macro will stop at the end of this match.' : 'Progress for the current macro run.';
    goalProgress.hidden = false;
    goalProgress.querySelector('[data-goal-earned]').textContent = number.format(earned);
    goalProgress.querySelector('[data-goal-target]').textContent = number.format(target);
    goalProgress.querySelector('[data-goal-currency]').textContent = activeGoal.currency;
    goalProgress.querySelector('[data-goal-remaining]').textContent = reached ? 'Target reached' : `${number.format(remaining)} ${activeGoal.currency} to go`;
    goalProgress.querySelector('[data-goal-bar]').style.width = `${Math.min(100, Math.max(0, earned / target * 100))}%`;
    goalProgress.dataset.reached = String(reached);
  }

  function openGoalEditor() {
    if (goalCommandBusy || goalOpen.disabled) return;
    goalForm.elements.currency.value = activeGoal?.enabled ? activeGoal.currency : 'Coins';
    goalForm.elements.target.value = activeGoal?.enabled ? activeGoal.target : 1000;
    goalDialogTitle.textContent = activeGoal?.enabled ? 'Edit farming goal' : 'Set a farming goal';
    goalDialogStatus.textContent = '';
    goalDialog.showModal();
  }

  async function runGoalCommand(command, payload = null) {
    if (goalCommandBusy || !activeDevice?.id) return;
    goalCommandBusy = true;
    goalSave.disabled = true;
    goalRemove.disabled = true;
    goalDialogStatus.textContent = 'Sending to your PC…';
    try {
      const bootstrap = await fetch('/api/dashboard/v1/session/bootstrap', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
      });
      if (!bootstrap.ok) throw new Error('Your dashboard session expired. Refresh and try again.');
      const response = await fetch('/api/dashboard/v1/remote/commands', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ deviceId: activeDevice.id, command, ...(payload ? { payload } : {}) })
      });
      const queued = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(queued.error || 'Could not send the goal to your PC.');
      let result = null;
      for (let attempt = 0; attempt < 36; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 700));
        const statusResponse = await fetch(`/api/dashboard/v1/remote/commands/${encodeURIComponent(queued.id)}`, {
          credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }
        });
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(status.error || 'Could not check the PC response.');
        if (status.status === 'succeeded') { result = status; break; }
        if (status.status === 'failed' || status.status === 'expired') throw new Error(status.message || 'The PC could not update its goal.');
      }
      if (!result) throw new Error('Your PC hasn’t replied yet. Keep Ultimate Macro open and try again.');
      const confirmation = result.message || 'Goal saved.';
      goalDialogStatus.textContent = confirmation;
      goalStatus.textContent = confirmation;
      window.UMDashboardState?.refresh();
      loadEarnings();
      window.setTimeout(() => { if (goalDialog.open) goalDialog.close(); }, 500);
    } catch (error) {
      goalDialogStatus.textContent = error.message || 'Could not update the goal.';
    } finally {
      goalCommandBusy = false;
      goalSave.disabled = false;
      goalRemove.disabled = false;
    }
  }

  window.UMDashboardState?.subscribe(renderGoal);
  goalOpen?.addEventListener('click', openGoalEditor);
  page.querySelector('[data-goal-close]')?.addEventListener('click', () => goalDialog.close());
  page.querySelector('[data-goal-cancel]')?.addEventListener('click', () => goalDialog.close());
  goalForm?.addEventListener('submit', event => {
    event.preventDefault();
    const currency = goalForm.elements.currency.value;
    const target = Number(goalForm.elements.target.value);
    if (!['Coins', 'Gems'].includes(currency) || !Number.isSafeInteger(target) || target < 1 || target > 1_000_000_000) {
      goalDialogStatus.textContent = 'Choose Coins or Gems and a target from 1 to 1,000,000,000.';
      return;
    }
    runGoalCommand('set_farming_goal', { currency, target });
  });
  goalRemove?.addEventListener('click', () => {
    if (activeGoal?.enabled && window.confirm('Remove this farming goal from the PC? The macro will no longer stop at this target.'))
      runGoalCommand('remove_farming_goal');
  });

  async function loadEarnings() {
    const id = ++requestId;
    try {
      const response = await fetch(`/api/dashboard/v1/earnings?range=${encodeURIComponent(selectedRange)}`, {
        credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load earnings.');
      if (id !== requestId) return;
      cadence.textContent = ranges[selectedRange];
      renderSummary(data.totals || {}, data.ticketTotals || {});
      renderRunTickets(data.latestRun || null);
      renderNerdStats(data.nerdStats || null);
      renderChart(data);
      renderLatest(data.latest || []);
    } catch (error) {
      if (id !== requestId) return;
      chart.hidden = true;
      chartEmpty.hidden = false;
      chartEmpty.textContent = error.message || 'Could not load earnings.';
      labels.textContent = '';
      eventList.replaceChildren();
      latestEmpty.hidden = true;
      renderNerdStats(null);
    }
  }

  page.querySelectorAll('[data-resource]').forEach(button => {
    button.addEventListener('click', () => {
      if (!resources[button.dataset.resource]) return;
      selectedResource = button.dataset.resource;
      page.querySelectorAll('[data-resource]').forEach(resourceButton => {
        const active = resourceButton === button;
        resourceButton.classList.toggle('is-selected', active);
        resourceButton.setAttribute('aria-pressed', String(active));
        resourceButton.style.setProperty('--resource-color', resources[resourceButton.dataset.resource === 'tower-xp' ? 'towerXp' : resourceButton.dataset.resource].color);
      });
      chartTitle.textContent = resources[selectedResource].label;
      loadEarnings();
    });
  });

  page.querySelectorAll('[data-range]').forEach(button => {
    button.addEventListener('click', () => {
      if (!ranges[button.dataset.range]) return;
      selectedRange = button.dataset.range;
      page.querySelectorAll('[data-range]').forEach(rangeButton => {
        rangeButton.setAttribute('aria-pressed', String(rangeButton === button));
      });
      loadEarnings();
    });
  });

  loadEarnings();
  window.setInterval(() => {
    if (!document.hidden) loadEarnings();
  }, 60000);
})();
