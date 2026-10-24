/* Homepage navigation, nothing else. Other routes keep their own scripts. */
(() => {
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
