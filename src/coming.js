/* Small, optional preview interaction. Everything important stays readable without JS. */
(() => {
  const buttons = [...document.querySelectorAll('[data-coming-spotlight]')];
  const title = document.getElementById('coming-spotlight-title');
  const description = document.getElementById('coming-spotlight-description');
  const index = document.getElementById('coming-spotlight-index');
  const group = document.querySelector('.coming-spotlight-switches');
  if (!buttons.length || !title || !description || !index || !group) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  group.classList.add('is-ready');
  buttons.forEach((button, position) => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    buttons.forEach(entry => entry.setAttribute('aria-pressed', String(entry === button)));
    title.textContent = button.dataset.title || '';
    description.textContent = button.dataset.copy || '';
    index.textContent = String(position + 1).padStart(2, '0') + ' / ' + String(buttons.length).padStart(2, '0');
    if (!reduced.matches && typeof title.animate === 'function') {
      for (const element of [title, description]) {
        element.animate([{ opacity: 0.4, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 240, easing: 'ease-out' });
      }
    }
  }));
})();
