(() => {
  const page = document.querySelector('.dashboard-settings-page');
  if (!page) return;
  const preferences = window.ultimateMacroDashboardPreferences;
  const feedback = page.querySelector('[data-settings-status]');
  const updateButtons = () => {
    page.querySelectorAll('[data-setting]').forEach((group) => {
      const selected = preferences?.[group.dataset.setting];
      group.querySelectorAll('button[data-value]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.value === selected));
      });
    });
  };
  updateButtons();

  page.querySelectorAll('[data-setting] button[data-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-setting]');
      if (!group || !preferences) return;
      preferences.save({ [group.dataset.setting]: button.dataset.value });
      updateButtons();
      if (!feedback) return;
      feedback.textContent = 'Saved';
      window.clearTimeout(feedback._clearTimer);
      feedback._clearTimer = window.setTimeout(() => { feedback.textContent = ''; }, 1500);
    });
  });
})();
