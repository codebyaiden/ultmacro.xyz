(() => {
  "use strict";
  function create({ now = () => performance.now(), idleMs = 45000 } = {}) {
    let total = 0,
      last = now(),
      lastActivity = last,
      visible = true,
      running = false;
    function read() {
      const current = now();
      if (running && visible)
        total += Math.max(0, Math.min(current, lastActivity + idleMs) - last);
      last = current;
      return Math.round(total);
    }
    return {
      read,
      start(value = 0) {
        total = Number.isFinite(value) && value >= 0 ? value : 0;
        last = lastActivity = now();
        running = true;
      },
      stop() {
        read();
        running = false;
        return Math.round(total);
      },
      activity() {
        read();
        lastActivity = now();
      },
      visibility(value) {
        read();
        visible = value;
        if (value) lastActivity = now();
      },
    };
  }
  const api = { create };
  if (typeof window !== "undefined") window.PollClock = api;
  if (typeof module !== "undefined") module.exports = api;
})();
