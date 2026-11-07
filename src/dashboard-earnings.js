(() => {
  const page = document.querySelector('.dashboard-earnings-page');
  if (!page) return;

  const NS = 'http://www.w3.org/2000/svg';
  const seriesShapes = {
    hour: [18, 25, 21, 34, 29, 42, 38, 31, 52, 47, 61, 55],
    day: [14, 19, 21, 17, 25, 32, 27, 22, 36, 43, 34, 29, 46, 53, 39, 35, 49, 61, 45, 40, 57, 67, 58, 74],
    week: [28, 42, 35, 58, 49, 70, 82],
    month: [14, 18, 22, 16, 27, 34, 25, 20, 39, 31, 45, 52, 36, 29, 48, 57, 43, 38, 62, 53, 69, 48, 58, 76, 63, 55, 79, 68, 88, 82],
    all: [20, 29, 25, 38, 44, 33, 52, 46, 63, 58, 76, 88]
  };
  const resources = {
    coins: { label: 'Coins', color: '#dfb765', scale: 820 },
    gems: { label: 'Gems', color: '#c589e9', scale: 24 },
    'tower-xp': { label: 'Tower XP', color: '#5dc2dc', scale: 96 }
  };
  const ranges = {
    hour: { label: '1 hour', cadence: 'Each bar = 5 min', ticks: ['60m', '45m', '30m', '15m', 'Now'] },
    day: { label: '24 hours', cadence: 'Each bar = 1 hour', ticks: ['12 AM', '6 AM', '12 PM', '6 PM', 'Now'] },
    week: { label: '7 days', cadence: 'Each bar = 1 day', ticks: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun'] },
    month: { label: '30 days', cadence: 'Each bar = 1 day', ticks: ['1', '8', '15', '22', '30'] },
    all: { label: 'All time', cadence: 'Each bar = 1 week', ticks: ['Week 1', 'Week 3', 'Week 6', 'Week 9', 'Week 12'] }
  };

  const chartGrid = page.querySelector('[data-chart-grid]');
  const chartBars = page.querySelector('[data-chart-bars]');
  const chart = page.querySelector('.earnings-chart');
  const chartTitle = page.querySelector('[data-chart-title]');
  const cadence = page.querySelector('[data-chart-cadence]');
  const xLabels = page.querySelector('[data-chart-labels]');
  const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const formatNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selectedResource = 'coins';
  let selectedRange = 'day';
  let animationFrame = 0;
  let previousHeights = [];

  const sampleValues = (resource, range) => {
    const scale = resources[resource].scale;
    return seriesShapes[range].map((shape, index) => {
      const subtleVariation = 0.92 + ((index * 7 + Object.keys(resources).indexOf(resource) * 3) % 9) / 100;
      return Math.round(shape * scale * subtleVariation);
    });
  };

  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };

  const makeGrid = (max) => {
    const top = 18;
    const bottom = 267;
    const left = 54;
    const right = 895;
    chartGrid.replaceChildren();
    for (let index = 0; index < 5; index += 1) {
      const y = top + ((bottom - top) / 4) * index;
      const value = max * (1 - index / 4);
      const line = svgNode('line', { x1: left, y1: y, x2: right, y2: y });
      const label = svgNode('text', { x: 0, y: y + 3 });
      label.textContent = index === 4 ? '0' : compactNumber.format(value);
      chartGrid.append(line, label);
    }
  };

  const animateBars = (bars, starts, ends, duration = 680) => {
    cancelAnimationFrame(animationFrame);
    if (reduceMotion) {
      bars.forEach((bar, index) => {
        bar.setAttribute('y', String(267 - ends[index]));
        bar.setAttribute('height', String(ends[index]));
      });
      return;
    }
    const began = performance.now();
    const draw = (now) => {
      const progress = Math.max(0, Math.min(1, (now - began) / duration));
      const eased = 1 - (1 - progress) ** 3;
      bars.forEach((bar, index) => {
        const start = Number.isFinite(starts[index]) ? Math.max(0, starts[index]) : 0;
        const end = Number.isFinite(ends[index]) ? Math.max(0, ends[index]) : 0;
        const height = Math.max(0, start + (end - start) * eased);
        bar.setAttribute('y', String(267 - height));
        bar.setAttribute('height', String(height));
      });
      if (progress < 1) animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
  };

  const render = () => {
    const resource = resources[selectedResource];
    const range = ranges[selectedRange];
    const values = sampleValues(selectedResource, selectedRange);
    const max = Math.max(...values) * 1.12;
    const plotLeft = 54;
    const plotRight = 895;
    const plotWidth = plotRight - plotLeft;
    const gap = plotWidth / values.length;
    const barWidth = Math.min(30, gap * 0.72);
    const heights = values.map((value) => Math.max(7, (value / max) * 234));
    const bars = values.map((value, index) => {
      const x = plotLeft + index * gap + (gap - barWidth) / 2;
      const from = previousHeights[index] ?? 0;
      const bar = svgNode('rect', {
        x,
        y: 267 - Math.max(0, from),
        width: barWidth,
        height: Math.max(0, from),
        rx: Math.min(6, barWidth / 3),
        fill: resource.color,
        opacity: 0.82
      });
      const title = svgNode('title');
      title.textContent = `${formatNumber.format(value)} ${resource.label.toLowerCase()}`;
      bar.append(title);
      return bar;
    });

    makeGrid(max);
    chartBars.replaceChildren(...bars);
    animateBars(bars, bars.map((_, index) => previousHeights[index] ?? 0), heights);
    previousHeights = heights;
    chart.style.setProperty('--resource-color', resource.color);
    chart.setAttribute('aria-label', `Sample ${resource.label.toLowerCase()} earnings for ${range.label}. Total: ${formatNumber.format(values.reduce((sum, value) => sum + value, 0))}.`);
    chartTitle.textContent = resource.label;
    cadence.textContent = range.cadence;
    xLabels.replaceChildren(...range.ticks.map((label) => {
      const span = document.createElement('span');
      span.textContent = label;
      return span;
    }));

    const total = formatNumber.format(values.reduce((sum, value) => sum + value, 0));
    page.querySelectorAll('.earnings-summary [data-total]').forEach((element) => {
      const key = element.dataset.total;
      element.textContent = compactNumber.format(sampleValues(key, selectedRange).reduce((sum, value) => sum + value, 0));
      const button = element.closest('[data-resource]');
      button.style.setProperty('--resource-color', resources[key].color);
      button.classList.toggle('is-selected', key === selectedResource);
      button.setAttribute('aria-pressed', String(key === selectedResource));
    });
    page.querySelectorAll('[data-range]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.range === selectedRange));
    });
  };

  page.querySelectorAll('[data-resource]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedResource = button.dataset.resource;
      render();
    });
  });
  page.querySelectorAll('[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedRange = button.dataset.range;
      render();
    });
  });

  render();
})();
