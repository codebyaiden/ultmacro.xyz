const header = /** @type {HTMLElement | null} */ (document.querySelector(".nav-shell"));
const menuButton = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-menu-button]"));
const mobileMenu = /** @type {HTMLElement | null} */ (document.querySelector("[data-mobile-menu]"));
const hero = /** @type {HTMLElement | null} */ (document.querySelector(".hero"));
let heroHeight = hero?.getBoundingClientRect().height || window.innerHeight;

const nightSky = document.createElement("div");
nightSky.className = "night-sky";
nightSky.setAttribute("aria-hidden", "true");
nightSky.innerHTML = '<svg class="site-sky-moon" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="site-moon-fill" x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#b8c8e8"/></linearGradient><mask id="site-moon-cutout"><rect width="100" height="100" fill="black"/><circle cx="45" cy="50" r="40" fill="white"/><circle cx="66" cy="42" r="40" fill="black"/></mask></defs><rect width="100" height="100" fill="url(#site-moon-fill)" mask="url(#site-moon-cutout)"/></svg><svg class="site-sky-sun" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="18"/><g><path d="M50 5v16M50 79v16M5 50h16M79 50h16M18 18l11 11M71 71l11 11M82 18 71 29M29 71 18 82"/></g></svg><svg class="site-sky-clouds" viewBox="0 0 500 120" aria-hidden="true"><path d="M25 88c0-22 18-40 40-40 6-21 25-35 48-35 27 0 49 22 49 49h8c20 0 36 16 36 36H25Zm245 8c0-20 16-36 36-36 6-19 23-31 44-31 25 0 45 20 45 45h8c18 0 32 14 32 32H270Z"/></svg>';
document.body.prepend(nightSky);

const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
progress.innerHTML = "<span></span>";
document.body.prepend(progress);
const progressBar = /** @type {HTMLElement} */ (progress.firstElementChild);

const menuBackdrop = document.createElement("button");
menuBackdrop.type = "button";
menuBackdrop.className = "menu-backdrop";
menuBackdrop.setAttribute("aria-label", "Close menu");
menuBackdrop.hidden = true;
document.body.append(menuBackdrop);

/** @param {boolean} open @param {boolean} [restoreFocus] */
const setMenuState = (open, restoreFocus = false) => {
  if (!menuButton || !mobileMenu) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileMenu.classList.toggle("open", open);
  mobileMenu.setAttribute("aria-hidden", String(!open));
  header?.classList.toggle("menu-open", open);
  document.body.classList.toggle("menu-open", open);
  if (open) {
    menuBackdrop.hidden = false;
    requestAnimationFrame(() => menuBackdrop.classList.add("is-visible"));
    mobileMenu.querySelector("a")?.focus();
  } else {
    menuBackdrop.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!menuBackdrop.classList.contains("is-visible")) menuBackdrop.hidden = true;
    }, 260);
    if (restoreFocus) menuButton.focus();
  }
};

menuButton?.addEventListener("click", () => {
  setMenuState(menuButton.getAttribute("aria-expanded") !== "true");
});
menuBackdrop.addEventListener("click", () => setMenuState(false));
mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenuState(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    event.preventDefault();
    setMenuState(false, true);
    return;
  }
  if (event.key !== "Tab" || menuButton?.getAttribute("aria-expanded") !== "true" || !mobileMenu) return;
  const links = [...mobileMenu.querySelectorAll("a")];
  if (!links.length) return;
  const first = links[0];
  const last = links[links.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
mobileMenu?.setAttribute("aria-hidden", "true");

let scrollFrame = 0;
const updateScrollState = () => {
  scrollFrame = 0;
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
  const heroProgress = Math.min(1, Math.max(0, window.scrollY / Math.max(1, heroHeight * 0.72)));
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
  progressBar.style.transform = `scaleX(${ratio})`;
  hero?.style.setProperty("--hero-progress", heroProgress.toFixed(3));
};
const requestScrollState = () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
};
window.addEventListener("scroll", requestScrollState, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 760 && menuButton?.getAttribute("aria-expanded") === "true") setMenuState(false);
  heroHeight = hero?.getBoundingClientRect().height || window.innerHeight;
  requestScrollState();
});
updateScrollState();

const pointerEffects = window.matchMedia("(hover: hover) and (pointer: fine)");
if (pointerEffects.matches) {
  /** @type {HTMLElement[]} */ ([...document.querySelectorAll(".button, .nav-shell nav a, .nav-shell .nav-link, .interface-tab, .source-grid a, .download-links a")]).forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.removeProperty("--spot-x");
      element.style.removeProperty("--spot-y");
    });
  });
}

const path = window.location.pathname.replace(/\/$/, "") || "/";
const homeContext = document.createElement("span");
homeContext.className = "home-context";
const contextPath = window.location.pathname;
homeContext.textContent = contextPath.includes("/features") ? "Features" : contextPath.includes("/how-it-works") ? "How it works" : contextPath.includes("/faq") ? "FAQ" : contextPath.includes("/aboutus") ? "About" : "Home";
document.querySelector(".nav-shell .brand")?.after(homeContext);

const legacyActions = document.querySelector(".nav-shell .nav-actions");
if (legacyActions && !legacyActions.querySelector(".legacy-version-chip")) {
  const versionChip = document.createElement("a");
  versionChip.className = "legacy-version-chip";
  versionChip.href = "../download/latest/";
  versionChip.title = "Latest release";
  versionChip.innerHTML = '<span aria-hidden="true"></span><b>v1.3.5</b>';
  legacyActions.insertBefore(versionChip, legacyActions.firstChild);
}

document.querySelectorAll(".eyebrow, .preview-kicker, .recorder-top span, .action b, .download-panel-top span").forEach((element) => {
  const value = element.textContent?.trim() ?? "";
  if (!value || value !== value.toUpperCase()) return;
  element.textContent = value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase()).replace(/\bDj\b/g, "DJ").replace(/\bTds\b/g, "TDS").replace(/\bFaq\b/g, "FAQ").replace(/\bOcr\b/g, "OCR");
});

(() => {
const settingsHost = document.querySelector(".nav-actions");
if (settingsHost) {
  const settingsWrap = document.createElement("div");
  settingsWrap.className = "site-settings";
  settingsWrap.innerHTML = '<button class="settings-toggle" type="button" aria-label="Open website settings" aria-expanded="false" aria-controls="site-settings-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm9 3.8-2.1-.7a7 7 0 0 0-.6-1.5l1-2-1.9-1.9-2 1a7 7 0 0 0-1.5-.6L13.2 4h-2.4l-.7 2.1a7 7 0 0 0-1.5.6l-2-1-1.9 1.9 1 2a7 7 0 0 0-.6 1.5L3 12v2l2.1.7c.2.5.4 1 .6 1.5l-1 2 1.9 1.9 2-1c.5.3 1 .5 1.5.6l.7 2.1h2.4l.7-2.1c.5-.1 1-.3 1.5-.6l2 1 1.9-1.9-1-2c.3-.5.5-1 .6-1.5L21 14v-2Z"/></svg></button><div class="settings-panel" id="site-settings-panel" hidden><div class="settings-panel-head"><strong>Personalize</strong><span>Shape the way the site feels.</span></div><div class="settings-group"><span class="settings-label">Atmosphere</span><div class="settings-theme" role="group" aria-label="Choose atmosphere"><button type="button" class="settings-choice" data-theme-choice="dark" aria-label="Night sky"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.2A8.6 8.6 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z"/></svg><span>Night</span></button><button type="button" class="settings-choice" data-theme-choice="light" aria-label="Sunrise"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg><span>Day</span></button></div></div><div class="settings-group"><span class="settings-label">Layout</span><div class="settings-layout" role="group" aria-label="Choose layout"><button type="button" class="settings-choice" data-layout-choice="reworked"><span class="layout-mark">✦</span><span>Reworked</span></button><button type="button" class="settings-choice" data-layout-choice="compact"><span class="layout-mark">≡</span><span>Compact</span></button></div></div></div>';
  settingsHost.insertBefore(settingsWrap, settingsHost.firstChild);
  const settingsButton = settingsWrap.querySelector(".settings-toggle");
  const settingsPanel = settingsWrap.querySelector(".settings-panel");
  if (!(settingsButton instanceof HTMLButtonElement) || !(settingsPanel instanceof HTMLDivElement)) return;
  /** @type {{theme?: string, layout?: string, [key: string]: string | undefined}} */
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("um.site-settings") || "{}"); } catch { saved = {}; }
  const themeChoices = [...settingsWrap.querySelectorAll("[data-theme-choice]")];
  const layoutChoices = [...settingsWrap.querySelectorAll("[data-layout-choice]")];
  /** @param {string} value @param {boolean} [animate] */
  const applyTheme = (value, animate = true) => {
    const theme = value === "light" ? "light" : "dark";
    if (animate && document.documentElement.dataset.theme && document.documentElement.dataset.theme !== theme) {
      document.documentElement.classList.add("theme-transitioning");
      window.setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 720);
    }
    document.documentElement.classList.toggle("light-mode", theme === "light");
    document.documentElement.dataset.theme = theme;
    themeChoices.forEach((choice) => choice.classList.toggle("is-active", choice.getAttribute("data-theme-choice") === theme));
    saved.theme = theme;
  };
  /** @param {string} value */
  const applyLayout = (value) => {
    const layout = value === "compact" ? "compact" : "reworked";
    document.documentElement.classList.toggle("compact-mode", layout === "compact");
    document.documentElement.dataset.layout = layout;
    layoutChoices.forEach((choice) => choice.classList.toggle("is-active", choice.getAttribute("data-layout-choice") === layout));
    saved.layout = layout;
  };
  applyTheme(saved.theme === "light" ? "light" : "dark", false);
  applyLayout(saved.layout === "compact" ? "compact" : "reworked");
  themeChoices.forEach((choice) => choice.addEventListener("click", () => { applyTheme(choice.getAttribute("data-theme-choice") || "dark"); savePreferences(); }));
  layoutChoices.forEach((choice) => choice.addEventListener("click", () => { applyLayout(choice.getAttribute("data-layout-choice") || "reworked"); savePreferences(); }));
  function savePreferences() {
    try { localStorage.setItem("um.site-settings", JSON.stringify(saved)); } catch { /* storage is optional */ }
  }
  settingsButton.addEventListener("click", () => { const open = settingsPanel.hidden; settingsPanel.hidden = !open; settingsButton.setAttribute("aria-expanded", String(open)); });
  document.addEventListener("click", (event) => { if (!(event.target instanceof Node) || !settingsWrap.contains(event.target)) { settingsPanel.hidden = true; settingsButton.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { settingsPanel.hidden = true; settingsButton.setAttribute("aria-expanded", "false"); } });
}
})();
/** @type {HTMLAnchorElement[]} */ ([...document.querySelectorAll("[data-nav-link]")]).forEach((link) => {
  const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, "") || "/";
  if (!link.hash && linkPath === path) {
    link.classList.add("current");
    link.setAttribute("aria-current", "page");
  }
});
