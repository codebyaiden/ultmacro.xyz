/* Homepage navigation, nothing else. Other routes keep their own scripts. */
(() => {
  const header = document.querySelector(".nav-shell");
  if (header) {
    const syncHeaderToScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    syncHeaderToScroll();
    window.addEventListener("scroll", syncHeaderToScroll, { passive: true });
  }

  const toggle = document.querySelector("[data-menu-button]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!(toggle instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) return;

  const links = [...menu.querySelectorAll("a")];
  const close = (restoreFocus = false) => {
    menu.hidden = true;
    menu.inert = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    if (restoreFocus) toggle.focus();
  };
  const open = () => {
    menu.hidden = false;
    menu.inert = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    links[0]?.focus();
  };

  close();
  toggle.addEventListener("click", () => menu.hidden ? open() : close(true));
  links.forEach((link) => link.addEventListener("click", () => close()));
  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !toggle.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (menu.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "Tab" || !links.length) return;
    if (event.shiftKey && document.activeElement === links[0]) {
      event.preventDefault();
      links.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === links.at(-1)) {
      event.preventDefault();
      links[0].focus();
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980 && !menu.hidden) close();
  }, { passive: true });
})();


/* Load the local 3D stage only when it approaches the viewport. */
(() => {
  const laptop = document.querySelector("[data-laptop-showcase]");
  if (!laptop) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lowPower = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2)
    || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2);
  if (lowPower || reducedMotion.matches) {
    laptop.dataset.mode = "poster";
    return;
  }
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "assets/laptop-showcase.bundle.js?v=14";
    document.head.append(script);
  };
  if (!("IntersectionObserver" in window)) return load();
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, { rootMargin: "120px" });
  observer.observe(laptop);
})();

/* Homepage motion: accessible example switcher and modest viewport reveals. */
(() => {
  const impactSection = document.querySelector("[data-impact-section]");
  if (impactSection) {
    const counters = [...impactSection.querySelectorAll("[data-impact-counter]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = false;
    let frame = 0;
    const format = (value, kind) => {
      if (kind !== "compact") return new Intl.NumberFormat("en-US").format(value);
      if (value >= 1_000_000) {
        const amount = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
        return `${amount}M`;
      }
      if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
      return new Intl.NumberFormat("en-US").format(value);
    };
    const settle = () => counters.forEach((counter) => {
      const target = Number(counter.dataset.target);
      counter.textContent = `${format(target, counter.dataset.format)}${counter.dataset.suffix || ""}`;
    });
    const start = () => {
      if (started) return;
      started = true;
      if (reducedMotion.matches) return settle();
      const startTime = performance.now();
      const duration = 1500;
      const tick = (now) => {
        const progress = Math.max(0, Math.min(1, (now - startTime) / duration));
        const eased = 1 - Math.pow(1 - progress, 5);
        counters.forEach((counter) => {
          const target = Number(counter.dataset.target);
          const value = Math.round(target * eased);
          const suffix = progress === 1 ? (counter.dataset.suffix || "") : "";
          counter.textContent = `${format(value, counter.dataset.format)}${suffix}`;
        });
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };
    const impactTarget = impactSection.querySelector(".impact-grid") || impactSection;
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      }, { threshold: 0.55 });
      observer.observe(impactTarget);
    } else {
      const startWhenVisible = () => {
        const bounds = impactTarget.getBoundingClientRect();
        if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
        window.removeEventListener("scroll", startWhenVisible);
        window.removeEventListener("resize", startWhenVisible);
        start();
      };
      window.addEventListener("scroll", startWhenVisible, { passive: true });
      window.addEventListener("resize", startWhenVisible);
      startWhenVisible();
    }
    reducedMotion.addEventListener?.("change", (event) => {
      if (!event.matches || !started) return;
      window.cancelAnimationFrame(frame);
      settle();
    });
  }

  const showcase = document.querySelector("[data-showcase]");
  if (showcase) {
    const tabs = [...showcase.querySelectorAll("[data-showcase-tab]")];
    const panels = [...showcase.querySelectorAll("[data-showcase-panel]")];
    const viewport = showcase.querySelector(".showcase-viewport");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    let exitTimer = 0;
    let transitionId = 0;
    if (activeIndex < 0) activeIndex = 0;

    panels.forEach((panel, index) => panel.classList.toggle("is-active", index === activeIndex));

    const select = (index, focus = false) => {
      if (index < 0 || index >= tabs.length || index >= panels.length) return;
      if (index === activeIndex) {
        if (focus) tabs[index]?.focus();
        return;
      }

      const previousIndex = activeIndex;
      const previous = panels[previousIndex];
      const next = panels[index];
      const direction = index > previousIndex ? "forward" : "backward";
      transitionId += 1;
      const currentTransition = transitionId;
      window.clearTimeout(exitTimer);
      panels.forEach((panel) => panel.classList.remove("is-entering", "is-exiting"));
      previous?.classList.remove("is-active");
      if (previous) {
        previous.dataset.direction = direction;
        previous.classList.add("is-exiting");
      }
      next.dataset.direction = direction;
      next.classList.add("is-active", "is-entering");
      activeIndex = index;

      tabs.forEach((tab, position) => {
        const selected = position === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[position].setAttribute("aria-hidden", String(!selected));
        panels[position].inert = !selected;
      });
      showcase.dataset.active = String(index);
      if (focus) tabs[index]?.focus();

      if (reducedMotion.matches) {
        previous?.classList.remove("is-exiting");
        next.classList.remove("is-entering");
        return;
      }
      window.requestAnimationFrame(() => {
        if (currentTransition === transitionId) next.classList.remove("is-entering");
      });
      exitTimer = window.setTimeout(() => previous?.classList.remove("is-exiting"), 420);
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(index));
      tab.addEventListener("keydown", (event) => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
      });
    });

    let swipeStart = null;
    viewport?.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.pointerType === "mouse" || event.target.closest("a, button, input, select, textarea")) return;
      swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    viewport?.addEventListener("pointerup", (event) => {
      if (!swipeStart || event.pointerId !== swipeStart.id) return;
      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
      select(activeIndex + (deltaX < 0 ? 1 : -1));
    });
    viewport?.addEventListener("pointercancel", () => { swipeStart = null; });
  }

  const setup = document.querySelector("[data-setup]");
  if (setup) {
    const tabs = [...setup.querySelectorAll("[data-setup-tab]")];
    const panels = [...setup.querySelectorAll("[data-setup-panel]")];
    let activeIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    if (activeIndex < 0) activeIndex = 0;
    const selectSetup = (index, focus = false) => {
      if (index < 0 || index >= tabs.length || index >= panels.length) return;
      activeIndex = index;
      tabs.forEach((tab, position) => {
        const selected = position === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[position].hidden = !selected;
        panels[position].setAttribute("aria-hidden", String(!selected));
        panels[position].inert = !selected;
      });
      if (focus) tabs[index]?.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectSetup(index));
      tab.addEventListener("keydown", (event) => {
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectSetup(next, true);
      });
    });
  }

  const morphWord = document.querySelector("[data-you-word]");
  if (morphWord) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const styles = ["editorial", "mono", "geist-light", "geist-italic", "small-caps"];
    const offsets = [80, 190, 330, 500, 710, 960];
    let timers = [];
    let started = false;
    const settle = () => {
      timers.forEach(window.clearTimeout);
      timers = [];
      morphWord.dataset.morphState = "final";
      morphWord.dataset.morphStarted = "true";
    };
    const shuffle = (items) => {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [items[index], items[other]] = [items[other], items[index]];
      }
      return items;
    };
    const start = async () => {
      if (started || morphWord.dataset.morphStarted) return;
      started = true;
      if (reducedMotion.matches) return settle();
      await Promise.allSettled([
        document.fonts.load('650 1em "Caveat"', "you"),
        document.fonts.load('400 1em "Instrument Serif"', "you"),
        document.fonts.load('400 1em "DM Mono"', "you"),
      ]);
      if (reducedMotion.matches) return settle();
      morphWord.dataset.morphStarted = "true";
      const remaining = shuffle([...styles]);
      const scriptPosition = Math.floor(Math.random() * (remaining.length + 1));
      remaining.splice(scriptPosition, 0, "cursive");
      remaining.forEach((state, index) => {
        timers.push(window.setTimeout(() => { morphWord.dataset.morphState = state; }, offsets[index]));
      });
      timers.push(window.setTimeout(() => { morphWord.dataset.morphState = "final"; }, 1220));
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      }, { threshold: 0.15 });
      observer.observe(morphWord);
    } else {
      start();
    }
    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) settle();
    });
  }

  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (!targets.length) return;
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((target) => target.classList.add("reveal-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("reveal-visible");
      entry.target.classList.remove("reveal-pending");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: "0px 0px -2% 0px" });
  targets.forEach((target) => {
    target.classList.add("reveal-pending");
    observer.observe(target);
  });
})();
