(() => {
  const page = document.querySelector('.dashboard-earnings-page');
  if (!page) return;

  const resources = {
    coins: { label: 'Coins', color: '#dfb765' },
    gems: { label: 'Gems', color: '#c589e9' },
    towerXp: { label: 'Tower XP', color: '#5dc2dc' }
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

  function renderLatest(events) {
    eventList.replaceChildren();
    latestEmpty.hidden = events.length > 0;
    for (const event of events) {
      const row = document.createElement('li');
      row.className = `earnings-event earnings-event-${event.type === 'match.victory' ? 'victory' : 'loss'}`;

      const source = document.createElement('div');
      source.className = 'earnings-event-source';
      const marker = document.createElement('span');
      marker.className = 'earnings-result-mark';
      marker.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = event.type === 'match.victory' ? 'Victory' : 'Loss';
      source.append(marker, name);

      const detail = document.createElement('strong');
      detail.textContent = totalsFor(event);
      const time = document.createElement('time');
      time.dateTime = event.occurredAt;
      time.textContent = formatTime(event.occurredAt, true);
      row.append(source, detail, time);
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

  function renderSummary(totals) {
    for (const [key] of Object.entries(resources)) {
      const value = page.querySelector(`[data-total="${key === 'towerXp' ? 'tower-xp' : key}"]`);
      if (value) value.textContent = totals[key] > 0 ? number.format(totals[key]) : '—';
    }
  }

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
      renderSummary(data.totals || {});
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
