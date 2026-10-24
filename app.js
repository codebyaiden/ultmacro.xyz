/* Homepage-only easter eggs. No libraries, tracking, or state to maintain. */
(() => {
  const star = document.getElementById("wish-star");
  const toast = document.getElementById("secret-toast");
  const hero = document.querySelector(".hero");
  if (!star || !toast || !hero) return;

  let hideTimer = 0;
  const reveal = (message) => {
    toast.textContent = message;
    toast.hidden = false;
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

  const keys = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let match = 0;
  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      event.target instanceof Element &&
      event.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    match = key === keys[match] ? match + 1 : (key === keys[0] ? 1 : 0);
    if (match === keys.length) {
      match = 0;
      reveal("↑ ↑ ↓ ↓ ← → ← → B A · Secret found. No free gems, sorry.");
    }
  });
})();