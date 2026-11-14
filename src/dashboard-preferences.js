(() => {
  if (!document.body.classList.contains('dashboard-app-page')) return;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('/dashboard/sw.js', { scope: '/dashboard/' }).catch(() => {});
  }
  const key = 'um-dashboard-preferences-v1';
  const defaults = { density: 'comfortable', accent: 'violet', provider: 'openai' };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { }
  const prefs = { ...defaults, ...saved };
  if (!['comfortable', 'compact'].includes(prefs.density)) prefs.density = defaults.density;
  if (!['violet', 'neutral'].includes(prefs.accent)) prefs.accent = defaults.accent;
  if (!['openai', 'anthropic'].includes(prefs.provider)) prefs.provider = defaults.provider;
  document.body.dataset.density = prefs.density;
  document.body.dataset.accent = prefs.accent;

  const sidebar = document.querySelector('.dashboard-sidebar');
  const sectionNav = sidebar?.querySelector('.dashboard-section-nav');
  const settingsLink = sidebar?.querySelector('.dashboard-sidebar-bottom a');
  if (sidebar && sectionNav) {
    const mobileNav = document.createElement('div');
    mobileNav.className = 'dashboard-mobile-navigation';

    const startSpace = document.createElement('span');
    const endSpace = document.createElement('span');
    startSpace.className = endSpace.className = 'dashboard-nav-space';
    startSpace.setAttribute('aria-hidden', 'true');
    endSpace.setAttribute('aria-hidden', 'true');
    sectionNav.prepend(startSpace);
    if (settingsLink) {
      const mobileSettings = settingsLink.cloneNode(true);
      mobileSettings.classList.add('dashboard-mobile-only-nav-item');
      sectionNav.append(mobileSettings);
    }
    sectionNav.append(endSpace);
    mobileNav.append(sectionNav);
    sidebar.prepend(mobileNav);
    const centerItem = (item, behavior = 'smooth') => {
      if (!item || !window.matchMedia('(max-width: 920px)').matches) return;
      const links = [...sectionNav.querySelectorAll('a')];
      const widest = Math.max(0, ...links.map(link => link.offsetWidth));
      const sideSpace = Math.max(0, (sectionNav.clientWidth - widest) / 2);
      startSpace.style.flexBasis = `${sideSpace}px`;
      endSpace.style.flexBasis = `${sideSpace}px`;
      const target = item.getBoundingClientRect().left - sectionNav.getBoundingClientRect().left
        + sectionNav.scrollLeft + item.offsetWidth / 2 - sectionNav.clientWidth / 2;
      const left = Math.max(0, target);
      if (behavior === 'auto' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // CSS scroll-behavior:smooth also animates scrollTo({behavior:'auto'}).
        // Force the initial positioning to be instant, then restore the mobile glide.
        const previousScrollBehavior = sectionNav.style.scrollBehavior;
        sectionNav.style.scrollBehavior = 'auto';
        sectionNav.scrollLeft = left;
        requestAnimationFrame(() => { sectionNav.style.scrollBehavior = previousScrollBehavior; });
      } else {
        sectionNav.scrollTo({ left, behavior: 'smooth' });
      }
    };

    const activeItem = sectionNav.querySelector('a[aria-current="page"]');
    window.addEventListener('resize', () => centerItem(sectionNav.querySelector('a[aria-current="page"]'), 'auto'), { passive: true });
    if (window.matchMedia('(max-width: 920px)').matches) {
      centerItem(activeItem, 'auto');
      mobileNav.dataset.ready = 'true';
    } else {
      mobileNav.dataset.ready = 'true';
    }
  }

  document.body.dataset.routeReady = 'true';
  window.ultimateMacroDashboardPreferences = {
    ...prefs,
    save(next) {
      Object.assign(prefs, next);
      document.body.dataset.density = prefs.density;
      document.body.dataset.accent = prefs.accent;
      try { localStorage.setItem(key, JSON.stringify(prefs)); } catch { }
      Object.assign(this, prefs);
    }
  };
})();
