(() => {
  const carousel = document.querySelector("[data-feature-carousel]");
  const slides = [...document.querySelectorAll("[data-feature-slide]")];
  const tabs = [...document.querySelectorAll("[data-feature-tab]")];
  const pauseButton = document.querySelector("[data-feature-pause]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealSections = [...document.querySelectorAll(".features-page [data-feature-reveal]")];
  let active = Math.max(0, slides.findIndex((slide) => slide.classList.contains("is-active")));
  let pausedByUser = reduceMotion.matches;
  let hovered = false;
  let focused = false;
  let timer = 0;

  const syncPauseButton = () => {
    if (!pauseButton) return;
    pauseButton.hidden = reduceMotion.matches;
    pauseButton.textContent = pausedByUser ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-label", `${pausedByUser ? "Resume" : "Pause"} automatic feature rotation`);
    pauseButton.setAttribute("aria-pressed", String(pausedByUser));
  };

  const canRotate = () => !reduceMotion.matches && !pausedByUser && !hovered && !focused && !document.hidden;
  const clearTimer = () => { window.clearTimeout(timer); timer = 0; };
  const schedule = () => {
    clearTimer();
    if (!canRotate() || slides.length < 2) return;
    timer = window.setTimeout(() => {
      showSlide((active + 1) % slides.length, 1);
    }, 5000);
  };

  function showSlide(index, direction = 1) {
    if (!slides.length) return;
    const next = (index + slides.length) % slides.length;
    if (next === active) return;
    slides[active].hidden = true;
    slides[active].classList.remove("is-active", "is-entering");
    tabs[active]?.setAttribute("aria-selected", "false");
    if (tabs[active]) tabs[active].tabIndex = -1;

    active = next;
    slides[active].hidden = false;
    slides[active].style.setProperty("--slide-dir", String(direction));
    slides[active].classList.add("is-active", "is-entering");
    tabs[active]?.setAttribute("aria-selected", "true");
    if (tabs[active]) tabs[active].tabIndex = 0;
    schedule();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showSlide(index, index >= active ? 1 : -1));
    tab.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus();
      showSlide(next, next >= active ? 1 : -1);
    });
  });

  pauseButton?.addEventListener("click", () => {
    pausedByUser = !pausedByUser;
    syncPauseButton();
    schedule();
  });

  carousel?.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") { hovered = true; clearTimer(); }
  });
  carousel?.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") { hovered = false; schedule(); }
  });
  carousel?.addEventListener("focusin", () => { focused = true; clearTimer(); });
  carousel?.addEventListener("focusout", (event) => {
    if (!carousel.contains(event.relatedTarget)) {
      focused = false;
      schedule();
    }
  });

  let touchStart = null;
  carousel?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") touchStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  carousel?.addEventListener("pointerup", (event) => {
    if (!touchStart || event.pointerType !== "touch") return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.25) showSlide(active + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }, { passive: true });
  carousel?.addEventListener("pointercancel", () => { touchStart = null; }, { passive: true });
  document.addEventListener("visibilitychange", schedule);
  reduceMotion.addEventListener?.("change", () => {
    if (reduceMotion.matches) pausedByUser = true;
    syncPauseButton();
    schedule();
  });
  slides.forEach((slide) => slide.addEventListener("animationend", () => slide.classList.remove("is-entering")));
  syncPauseButton();
  schedule();

  if (revealSections.length && !reduceMotion.matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("features-reveal-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    revealSections.forEach((section) => observer.observe(section));
  } else {
    revealSections.forEach((section) => section.classList.add("is-visible"));
  }
})();
