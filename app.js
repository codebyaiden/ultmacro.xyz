const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
document.documentElement.classList.add("js-ready");

const revealTargets = new Set();
/** @param {string} selector */
const addRevealTargets = (selector) => {
  document.querySelectorAll(selector).forEach((element) => revealTargets.add(element));
};

[
  "main > section:not(.hero) > .section-heading",
  "main > section:not(.hero) > .requirements-heading",
  "main > section:not(.hero) > .requirements-heading + .checklist",
  ".interface-stage",
  ".recorder",
  ".source-grid",
  ".download-panel",
  ".feature-grid-page article",
  ".feature-band > *",
  ".strategy-layout > *",
  ".strategy-files > *",
  ".team-section > *",
  ".about-layout > *",
  ".about-note",
  ".install-note",
  ".faq-contact",
  ".page-hero > *",
  ".download-page-hero > *",
].forEach(addRevealTargets);

[".feature-stack", ".runtime-flow", ".steps", ".source-grid", ".download-links", ".setup-steps", ".team-list", ".future-list", ".faq-list", ".faq-page"].forEach((selector) => {
  document.querySelectorAll(selector).forEach((group) => {
    Array.from(group.children).forEach((element, index) => {
      revealTargets.add(element);
      /** @type {HTMLElement} */ (element).dataset.revealDelay = String(Math.min(index, 3));
    });
  });
});

revealTargets.forEach((element) => element.classList.add("reveal-item"));
const revealObserver = "IntersectionObserver" in window && !reducedMotion.matches
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: .08 })
  : null;

revealTargets.forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("is-visible");
});

const interfaceImage = /** @type {HTMLImageElement | null} */ (document.querySelector("#interface-image"));
const interfaceCaption = /** @type {HTMLElement | null} */ (document.querySelector("#interface-caption"));
const interfaceTabs = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll(".interface-tab")]);
/** @param {HTMLButtonElement} button */
const selectInterfaceTab = (button) => {
  interfaceTabs.forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  });
  if (interfaceImage && button.dataset.image) {
    const changeDelay = reducedMotion.matches ? 0 : 160;
    interfaceImage.classList.add("is-changing");
    window.setTimeout(() => {
      interfaceImage.src = `assets/ui/${button.dataset.image}`;
      interfaceImage.alt = `Ultimate Macro ${button.dataset.label ?? "interface"} interface`;
      interfaceImage.classList.remove("is-changing");
    }, changeDelay);
  }
  if (interfaceCaption && button.dataset.label) interfaceCaption.textContent = button.dataset.label;
};
interfaceTabs.forEach((button, index) => {
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", String(button.classList.contains("active")));
  button.setAttribute("aria-controls", "interface-image");
  button.tabIndex = button.classList.contains("active") ? 0 : -1;
  button.addEventListener("click", () => selectInterfaceTab(button));
  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = interfaceTabs[(index + direction + interfaceTabs.length) % interfaceTabs.length];
    next.focus();
    selectInterfaceTab(next);
  });
});

const interfaceArrows = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll(".interface-arrow")]);
interfaceArrows.forEach((arrow) => {
  arrow.addEventListener("click", () => {
    const activeIndex = Math.max(0, interfaceTabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"));
    const direction = arrow.classList.contains("interface-prev") ? -1 : 1;
    const next = interfaceTabs[(activeIndex + direction + interfaceTabs.length) % interfaceTabs.length];
    if (!next) return;
    selectInterfaceTab(next);
    next.focus();
  });
});

const recordButton = /** @type {HTMLButtonElement | null} */ (document.querySelector("#record-action"));
const recorderStatus = /** @type {HTMLElement | null} */ (document.querySelector("#recorder-status"));
recordButton?.addEventListener("click", () => {
  const timeline = document.querySelector(".recorder .timeline");
  if (timeline) {
    const action = document.createElement("div");
    action.className = "action sample-action";
    action.innerHTML = "<span>00:41</span><b>SELL TOWER</b><small>Minigunner1 · sample</small>";
    timeline.append(action);
  }
  recordButton.textContent = "✓ Sample action added";
  recordButton.disabled = true;
  if (recorderStatus) recorderStatus.textContent = "Example updated · no strategy file was saved";
});

/* Two optional night-sky easter eggs, scoped to the homepage. */
(() => {
  const star = document.getElementById("wish-star");
  const toast = document.getElementById("secret-toast");
  const hero = document.querySelector(".hero");
  if (!star || !toast || !hero) return;
  let hideTimer;
  const reveal = (message) => {
    toast.hidden = false;
    toast.textContent = message;
    hero.classList.remove("sky-wish-active");
    void hero.offsetWidth;
    hero.classList.add("sky-wish-active");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      toast.hidden = true;
      hero.classList.remove("sky-wish-active");
    }, 4200);
  };
  let wishes = 0;
  star.addEventListener("click", () => {
    wishes += 1;
    reveal(wishes % 3 === 0
      ? "Three wishes. Still need to place your own towers."
      : "Wish logged. May your next run be a clean one.");
  });
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let matched = 0;
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    matched = key === code[matched] ? matched + 1 : (key === code[0] ? 1 : 0);
    if (matched === code.length) {
      matched = 0;
      reveal("↑ ↑ ↓ ↓ ← → ← → B A · Secret found. No free gems, sorry.");
    }
  });
})();
