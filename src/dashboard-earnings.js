(() => {
  const page = document.querySelector('.dashboard-earnings-page');
  if (!page) return;

  const resources = {
    coins: { label: 'Coins', color: '#dfb765' },
    gems: { label: 'Gems', color: '#c589e9' },
    'tower-xp': { label: 'Tower XP', color: '#5dc2dc' }
  };

  page.querySelectorAll('[data-resource]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = resources[button.dataset.resource];
      if (!selected) return;

      page.querySelectorAll('[data-resource]').forEach((resourceButton) => {
        const active = resourceButton === button;
        resourceButton.classList.toggle('is-selected', active);
        resourceButton.setAttribute('aria-pressed', String(active));
        resourceButton.style.setProperty('--resource-color', resources[resourceButton.dataset.resource].color);
      });
      page.querySelector('[data-chart-title]').textContent = selected.label;
    });
  });
})();
