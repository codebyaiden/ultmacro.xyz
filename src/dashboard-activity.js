(() => {
  const page = document.querySelector('.dashboard-activity-page');
  if (!page) return;

  const toggle = page.querySelector('[data-filter-toggle]');
  const panel = page.querySelector('[data-filter-panel]');
  const clear = page.querySelector('[data-clear-filters]');
  const exclude = page.querySelector('[data-exclude-mode]');
  const rows = [...page.querySelectorAll('.activity-row')];
  const options = [...page.querySelectorAll('[data-filter-type]')];
  const groups = [...page.querySelectorAll('[data-filter-group]')];
  const resultCount = page.querySelector('[data-result-count]');
  const emptyState = page.querySelector('[data-empty-state]');
  const everythingOptions = [...page.querySelectorAll('[data-everything]')];
  const selected = new Set();

  const groupTypes = new Map(groups.map((group) => [
    group.dataset.filterGroup,
    [...group.querySelectorAll('[data-filter-type]')].map((input) => input.dataset.filterType)
  ]));

  function syncGroup(group) {
    const name = group.dataset.filterGroup;
    const types = groupTypes.get(name) || [];
    const chosen = types.filter((type) => selected.has(type));
    const everything = group.querySelector('[data-everything]');
    if (!everything) return;
    everything.checked = types.length > 0 && chosen.length === types.length;
    everything.indeterminate = chosen.length > 0 && chosen.length < types.length;
    everything.closest('.filter-option')?.toggleAttribute('data-partial', everything.indeterminate);
  }

  function render() {
    let visible = 0;
    rows.forEach((row) => {
      const isSelected = selected.has(row.dataset.type);
      const show = selected.size === 0 || (exclude.checked ? !isSelected : isSelected);
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (resultCount) resultCount.textContent = exclude.checked && selected.size === 0
      ? `${visible} examples`
      : selected.size === 0 ? `${visible} examples` : `${visible} of ${rows.length} examples`;
    if (emptyState) emptyState.hidden = visible !== 0;
  }

  function setPanel(open, { restoreFocus = false } = {}) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.dataset.open = String(open);
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (!open && restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setPanel(toggle.getAttribute('aria-expanded') !== 'true'));
  page.addEventListener('click', (event) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !panel.contains(event.target) && !toggle.contains(event.target)) setPanel(false);
  });
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      setPanel(false, { restoreFocus: true });
    }
  });

  groups.forEach((group) => {
    const button = group.querySelector('.filter-group-toggle');
    button.addEventListener('click', () => {
      const open = group.dataset.open !== 'true';
      group.dataset.open = String(open);
      button.setAttribute('aria-expanded', String(open));
    });
    syncGroup(group);
  });

  options.forEach((input) => input.addEventListener('change', () => {
    input.checked ? selected.add(input.dataset.filterType) : selected.delete(input.dataset.filterType);
    groups.forEach(syncGroup);
    render();
  }));

  everythingOptions.forEach((input) => input.addEventListener('change', () => {
    const types = groupTypes.get(input.dataset.everything) || [];
    types.forEach((type) => input.checked ? selected.add(type) : selected.delete(type));
    options.forEach((option) => { option.checked = selected.has(option.dataset.filterType); });
    groups.forEach(syncGroup);
    render();
  }));

  exclude.addEventListener('change', render);
  clear.addEventListener('click', () => {
    selected.clear();
    exclude.checked = false;
    options.forEach((input) => { input.checked = false; });
    groups.forEach(syncGroup);
    render();
  });
  render();
})();
