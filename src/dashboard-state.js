(() => {
  const listeners = new Set();
  let current = { devices: [], unavailable: false };
  let inFlight = false;

  function publish() {
    for (const listener of listeners) listener(current);
  }

  async function refresh() {
    if (inFlight || document.visibilityState !== 'visible') return;
    inFlight = true;
    try {
      const response = await fetch('/api/dashboard/v1/state', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error('Dashboard state is unavailable.');
      const value = await response.json();
      current = { devices: Array.isArray(value.devices) ? value.devices : [], unavailable: false };
    } catch {
      current = { devices: [], unavailable: true };
    } finally {
      inFlight = false;
      publish();
    }
  }

  function activeDesktop(state = current) {
    const desktops = state.devices.filter(device => device && typeof device === 'object');
    return desktops.find(device => device.state === 'connected' && device.snapshot) ||
      desktops.find(device => device.state === 'connected') || desktops[0] || null;
  }

  window.UMDashboardState = {
    refresh,
    activeDesktop,
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });
  const hasHealthReadings = document.body.classList.contains('dashboard-health-page');
  window.setInterval(refresh, hasHealthReadings ? 10000 : 20000);
  refresh();
})();
