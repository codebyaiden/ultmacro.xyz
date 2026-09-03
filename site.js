const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const closeMobileMenu = () => {
  menuButton?.setAttribute("aria-expanded", "false");
  mobileMenu?.classList.remove("open");
  mobileMenu?.setAttribute("aria-hidden", "true");
};
const openMobileMenu = () => {
  menuButton?.setAttribute("aria-expanded", "true");
  mobileMenu?.classList.add("open");
  mobileMenu?.setAttribute("aria-hidden", "false");
};
menuButton?.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  if (expanded) closeMobileMenu();
  else openMobileMenu();
});
mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileMenu();
});
mobileMenu?.setAttribute("aria-hidden", "true");

const pointerEffects = window.matchMedia("(hover: hover) and (pointer: fine)");
if (pointerEffects.matches) {
  document.querySelectorAll(".button, .nav-shell nav a, .nav-shell .nav-link, .showcase-video, .interface-tab, .source-grid a").forEach((element) => {
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
document.querySelectorAll("[data-nav-link]").forEach((link) => {
  const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, "") || "/";
  if (linkPath === path) {
    link.classList.add("current");
    link.setAttribute("aria-current", "page");
  }
});
