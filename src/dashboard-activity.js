(() => {
  const page = document.querySelector('.dashboard-activity-page');
  if (!page) return;

  const toggle = page.querySelector('[data-filter-toggle]');
  const panel = page.querySelector('[data-filter-panel]');
  const clear = page.querySelector('[data-clear-filters]');
  const exclude = page.querySelector('[data-exclude-mode]');
  const list = page.querySelector('.activity-list');
  const options = [...page.querySelectorAll('[data-filter-type]')];
  const groups = [...page.querySelectorAll('[data-filter-group]')];
  const resultCount = page.querySelector('[data-result-count]');
  const emptyState = page.querySelector('[data-empty-state]');
  const feedback = page.querySelector('[data-feedback]');
  const everythingOptions = [...page.querySelectorAll('[data-everything]')];
  const selected = new Set();
  let loading = false;

  const groupTypes = new Map(groups.map(group => [
    group.dataset.filterGroup,
    [...group.querySelectorAll('[data-filter-type]')].map(input => input.dataset.filterType)
  ]));

  const definitions = {
    'run.started': ['run_started', 'Run started', 'run_started', '#b8a1e8'],
    'run.paused': ['run_paused', 'Run paused', 'run_paused', '#c3b5de'],
    'run.resumed': ['run_resumed', 'Run resumed', 'run_resumed', '#b4d7c1'],
    'run.stopped': ['run_stopped', 'Run stopped', 'run_stopped', '#c7c7cd'],
    'mode.selected': ['mode_selected', 'Mode selected', 'mode_selected', '#b8c9dc'],
    'game.joined': ['joined_roblox', 'Joined Roblox', 'brand/roblox-blue.png', '#4f7cff'],
    'match.started': ['match_started', 'Match started', 'match_started', '#b4d7c1'],
    'boss.appeared': ['boss_appeared', 'Boss appeared', 'boss_appeared', '#e6b98b'],
    'boss.defeated': ['boss_defeated', 'Boss defeated', 'boss_defeated', '#a8d5b5'],
    'match.victory': ['match_victory', 'Victory', 'victory', '#e8d79d'],
    'match.loss': ['match_loss', 'Loss', 'loss', '#e2a2a2'],
    'reward.claimed': ['reward_claimed', 'Reward claimed', 'Earnings/tower_xp', '#e7d48d'],
    'wave.skip_clicked': ['wave_skip_clicked', 'Wave skip clicked', 'wave_started', '#a8c8e8']
  };

  function eventDefinition(event) {
    if (definitions[event.type]) return definitions[event.type];
    if (!['strategy.action.succeeded', 'strategy.action.failed'].includes(event.type)) return null;
    const action = String(event.data?.action || '').toLowerCase();
    const actions = {
      spawntower: ['tower_placed', 'Tower placed', 'tower_placed', '#9bd9ec'],
      clonetower: ['tower_cloned', 'Tower cloned', 'tower_placed', '#9bd9ec'],
      upgradetower: ['tower_upgraded', 'Tower upgraded', 'tower_upgraded', '#a6d8b3'],
      selltower: ['tower_sold', 'Tower sold', 'tower_sold', '#d4b9a4'],
      changetargets: ['target_mode_changed', 'Target mode changed', 'target_mode_changed', '#a8c8e8'],
      toggleautoskip: ['auto_skip_changed', 'Auto skip changed', 'wave_started', '#c6b0e9'],
      brawlerreposition: ['tower_repositioned', 'Tower repositioned', 'ability_used', '#c6b0e9'],
      enforcerreposition: ['tower_repositioned', 'Tower repositioned', 'ability_used', '#c6b0e9'],
      setdjtrack: ['dj_track_changed', 'DJ track changed', 'ability_used', '#c6b0e9'],
      activateraisethedead: ['ability_used', 'Raise the Dead key sent', 'ability_used', '#c6b0e9'],
      activateenforcervan: ['ability_used', 'SWAT Van key sent', 'ability_used', '#c6b0e9']
    };
    if (action === 'commander' || ['click', 'send', 'sleep', 'other'].includes(action)) return null;
    const definition = actions[action];
    if (!definition) return null;
    if (event.type === 'strategy.action.failed') {
      const failureTitles = {
        spawntower: 'Tower placement failed', clonetower: 'Tower clone failed',
        upgradetower: 'Tower upgrade failed', selltower: 'Tower sale failed',
        changetargets: 'Target change failed', toggleautoskip: 'Auto skip change failed',
        brawlerreposition: 'Tower reposition failed', enforcerreposition: 'Tower reposition failed',
        setdjtrack: 'DJ track change failed', activateraisethedead: 'Ability could not be sent',
        activateenforcervan: 'SWAT Van unavailable'
      };
      return ['strategy_action_failed', failureTitles[action], 'error', '#e69b9b'];
    }
    return definition;
  }

  function relativeTime(value) {
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function matchDetail(data = {}) {
    const details = [];
    if (data.map) details.push(data.map);
    const rewards = [];
    if (Number.isSafeInteger(data.coins)) rewards.push(`${new Intl.NumberFormat().format(data.coins)} coins`);
    if (Number.isSafeInteger(data.gems)) rewards.push(`${new Intl.NumberFormat().format(data.gems)} gems`);
    if (Number.isSafeInteger(data.towerXp)) rewards.push(`${new Intl.NumberFormat().format(data.towerXp)} XP`);
    if (rewards.length) details.push(`+${rewards.join(' · +')}`);
    return details.join(' · ');
  }

  function createRow(event) {
    const definition = eventDefinition(event);
    if (!definition) return null;
    const [filterType, title, iconName, color] = definition;
    const row = document.createElement('li');
    row.className = 'activity-row';
    row.dataset.type = filterType;
    row.dataset.runId = event.runId || event.eventId;
    row.style.setProperty('--event-color', color);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'activity-event-icon';
    const icon = document.createElement('img');
    icon.src = iconName.startsWith('brand/')
      ? `/assets/dashboard-icons/${iconName}`
      : iconName.includes('/')
        ? `/assets/dashboard-icons/flat/${iconName}.svg`
        : `/assets/dashboard-icons/flat/Activity_Feed/${iconName}.svg`;
    icon.alt = '';
    icon.loading = 'lazy';
    iconWrap.append(icon);

    const copy = document.createElement('span');
    copy.className = 'activity-event-copy';
    const heading = document.createElement('strong');
    heading.textContent = title;
    copy.append(heading);
    const detailText = event.data?.detail || (event.data?.rewardType ? 'Playtime reward'
        : filterType === 'joined_roblox' ? [event.data?.map, event.data?.mode].filter(Boolean).join(' · ')
          : filterType === 'mode_selected' ? event.data?.mode || ''
            : filterType === 'match_started' ? [event.data?.map, event.data?.mode].filter(Boolean).join(' · ')
              : ['match.victory', 'match.loss'].includes(event.type) ? matchDetail(event.data)
              : '');
    if (detailText) {
      const detail = document.createElement('span');
      detail.textContent = detailText;
      copy.append(detail);
    }

    const time = document.createElement('time');
    time.dateTime = event.occurredAt;
    time.textContent = relativeTime(event.occurredAt);
    time.title = new Date(event.occurredAt).toLocaleString();
    row.append(iconWrap, copy, time);
    return row;
  }

  function runContext(events) {
    const latest = [...events].reverse();
    const map = latest.find(event => event.data?.map)?.data.map;
    const mode = latest.find(event => event.data?.mode)?.data.mode;
    return [map, mode].filter(Boolean).join(' · ');
  }

  function createRunGroup(runId, entries, openRunIds) {
    const events = entries.map(entry => entry.event);
    const lastEvent = events[events.length - 1];
    const outcome = [...events].reverse().find(event => event.type === 'match.victory' || event.type === 'match.loss');
    const summaryLabel = runContext(events) || 'Run';
    const outcomeLabel = outcome?.type === 'match.victory' ? 'Victory' : outcome?.type === 'match.loss' ? 'Loss' : '';
    const color = outcomeLabel === 'Victory' ? '#dfca80' : outcomeLabel === 'Loss' ? '#e2a2a2' : '#b8a1e8';

    const item = document.createElement('li');
    item.className = 'activity-run-item';
    item.style.setProperty('--run-color', color);

    const details = document.createElement('details');
    details.className = 'activity-run-group';
    details.dataset.runId = runId;
    details.open = openRunIds.has(runId);
    details.addEventListener('toggle', () => {
      if (details.open) openRunIds.add(runId);
      else openRunIds.delete(runId);
    });

    const summary = document.createElement('summary');
    summary.className = 'activity-run-summary';
    const icon = document.createElement('img');
    icon.className = 'activity-run-icon';
    icon.src = `/assets/dashboard-icons/flat/Activity_Feed/${outcomeLabel === 'Victory' ? 'victory' : outcomeLabel === 'Loss' ? 'loss' : 'run_started'}.svg`;
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    copy.className = 'activity-run-copy';
    const title = document.createElement('strong');
    title.textContent = summaryLabel;
    const subline = document.createElement('span');
    subline.textContent = `${entries.length} ${entries.length === 1 ? 'event' : 'events'}`;
    copy.append(title, subline);

    if (outcomeLabel) {
      const badge = document.createElement('span');
      badge.className = `activity-run-outcome${outcomeLabel === 'Loss' ? ' is-loss' : ''}`;
      badge.textContent = outcomeLabel;
      summary.append(icon, copy, badge);
    } else summary.append(icon, copy);

    const time = document.createElement('time');
    time.dateTime = lastEvent.occurredAt;
    time.textContent = relativeTime(lastEvent.occurredAt);
    time.title = new Date(lastEvent.occurredAt).toLocaleString();
    summary.append(time);

    const body = document.createElement('div');
    body.className = 'activity-run-body';
    const timeline = document.createElement('ol');
    timeline.className = 'activity-run-events';
    timeline.setAttribute('aria-label', `${summaryLabel} events`);
    for (const entry of entries) timeline.append(entry.row);
    body.append(timeline);
    details.append(summary, body);
    item.append(details);
    return item;
  }

  function syncGroup(group) {
    const types = groupTypes.get(group.dataset.filterGroup) || [];
    const chosen = types.filter(type => selected.has(type));
    const everything = group.querySelector('[data-everything]');
    if (!everything) return;
    everything.checked = types.length > 0 && chosen.length === types.length;
    everything.indeterminate = chosen.length > 0 && chosen.length < types.length;
    everything.closest('.filter-option')?.toggleAttribute('data-partial', everything.indeterminate);
  }

  function renderFilters() {
    let visible = 0;
    const runGroups = [...list.querySelectorAll('.activity-run-group')];
    for (const group of runGroups) {
      let groupVisible = 0;
      for (const row of group.querySelectorAll('.activity-row')) {
        const isSelected = selected.has(row.dataset.type);
        const show = selected.size === 0 || (exclude.checked ? !isSelected : isSelected);
        row.hidden = !show;
        if (show) groupVisible++;
      }
      group.closest('.activity-run-item').hidden = groupVisible === 0;
      visible += groupVisible;
    }
    resultCount.textContent = `${visible} ${visible === 1 ? 'event' : 'events'}`;
    emptyState.hidden = visible !== 0;
    if (!runGroups.length) emptyState.textContent = 'No activity yet.';
    else if (!visible) emptyState.textContent = 'No activity matches these filters.';
  }

  async function loadEvents() {
    if (loading || document.visibilityState === 'hidden') return;
    loading = true;
    try {
      await fetch('/api/dashboard/v1/session/bootstrap', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', accept: 'application/json' }, body: '{}'
      });
      const response = await fetch('/api/dashboard/v1/events?limit=200', {
        credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load activity.');
      const grouped = new Map();
      for (const event of data.events || []) {
        const row = createRow(event);
        if (!row) continue;
        const runId = event.runId || event.eventId;
        if (!grouped.has(runId)) grouped.set(runId, []);
        grouped.get(runId).push({ event, row });
      }

      const openRunIds = new Set([...list.querySelectorAll('.activity-run-group[open]')].map(group => group.dataset.runId));
      if (!list.querySelector('.activity-run-group') && grouped.size) openRunIds.add(grouped.keys().next().value);
      const orderedGroups = [...grouped.entries()]
        .map(([runId, entries]) => [runId, entries.sort((a, b) => Date.parse(a.event.occurredAt) - Date.parse(b.event.occurredAt) || a.event.sequence - b.event.sequence)])
        .sort((a, b) => Date.parse(b[1][b[1].length - 1].event.occurredAt) - Date.parse(a[1][a[1].length - 1].event.occurredAt));
      const fragment = document.createDocumentFragment();
      for (const [runId, entries] of orderedGroups) fragment.append(createRunGroup(runId, entries, openRunIds));
      const scrollTop = list.scrollTop;
      list.replaceChildren(fragment);
      list.scrollTop = scrollTop;
      feedback.textContent = '';
      renderFilters();
    } catch {
      if (!list.children.length) emptyState.textContent = 'Could not load activity. Try again in a moment.';
      feedback.textContent = 'Could not refresh activity.';
    } finally {
      loading = false;
    }
  }

  function setPanel(open, { restoreFocus = false } = {}) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.dataset.open = String(open);
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (!open && restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setPanel(toggle.getAttribute('aria-expanded') !== 'true'));
  page.addEventListener('click', event => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !panel.contains(event.target) && !toggle.contains(event.target)) setPanel(false);
  });
  page.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      setPanel(false, { restoreFocus: true });
    }
  });

  groups.forEach(group => {
    const button = group.querySelector('.filter-group-toggle');
    button.addEventListener('click', () => {
      const open = group.dataset.open !== 'true';
      group.dataset.open = String(open);
      button.setAttribute('aria-expanded', String(open));
    });
    syncGroup(group);
  });
  options.forEach(input => input.addEventListener('change', () => {
    input.checked ? selected.add(input.dataset.filterType) : selected.delete(input.dataset.filterType);
    groups.forEach(syncGroup);
    renderFilters();
  }));
  everythingOptions.forEach(input => input.addEventListener('change', () => {
    const types = groupTypes.get(input.dataset.everything) || [];
    types.forEach(type => input.checked ? selected.add(type) : selected.delete(type));
    options.forEach(option => { option.checked = selected.has(option.dataset.filterType); });
    groups.forEach(syncGroup);
    renderFilters();
  }));
  exclude.addEventListener('change', renderFilters);
  clear.addEventListener('click', () => {
    selected.clear();
    exclude.checked = false;
    options.forEach(input => { input.checked = false; });
    groups.forEach(syncGroup);
    renderFilters();
  });

  loadEvents();
  window.setInterval(loadEvents, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadEvents(); });
})();
