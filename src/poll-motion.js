(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    fine = matchMedia("(hover: hover) and (pointer: fine)");
  const sceneNames = {
    "About you": "you",
    "Your experience": "experience",
    Reliability: "reliability",
    Priorities: "priorities",
    "The interface": "interface",
    "Strategy Lab": "lab",
    "What comes next": "features",
    "Ultimate Cloud": "cloud",
    "The community": "community",
    Updates: "updates",
    "One last thing": "final",
  };
  function node(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function animate(element, frames, options = {}) {
    if (!element || reduced.matches || typeof element.animate !== "function")
      return null;
    return element.animate(frames, {
      duration: 420,
      fill: "backwards",
      easing: "cubic-bezier(.16,1,.3,1)",
      ...options,
    });
  }
  function split(heading) {
    if (heading.dataset.split) return;
    heading.dataset.split = "true";
    const text = heading.textContent;
    heading.setAttribute("aria-label", text);
    heading.replaceChildren();
    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) heading.append(document.createTextNode(part));
      else {
        const clip = node("span", "word-mask"),
          word = node("span", "word", part);
        clip.append(word);
        heading.append(clip);
      }
    });
  }
  function art(section) {
    const scene = sceneNames[section] || "you";
    const aside = node("aside", "section-art");
    aside.setAttribute("aria-hidden", "true");
    aside.dataset.scene = scene;
    const stage = node("div", "art-stage");
    if (
      scene === "reliability" ||
      scene === "experience" ||
      scene === "updates"
    ) {
      const signal = node("div", "reliability-signal");
      for (let i = 0; i < 9; i++) {
        const bar = node("i");
        bar.style.setProperty("--i", i);
        signal.append(bar);
      }
      stage.append(signal, node("div", "signal-baseline"));
    } else if (scene === "interface") {
      const mocks = node("div", "layout-studies");
      for (const [index, title] of ["compact", "detailed"].entries()) {
        const card = node("div", "mock-card " + title);
        card.append(
          node("span", "mock-kicker", title),
          node("b", "", "Wretched Front"),
        );
        const tags = node("div", "mock-tags");
        tags.append(node("span", "", "Hardcore"), node("span", "", "Gems"));
        card.append(tags);
        if (index)
          card.append(
            node("div", "mock-line"),
            node("div", "mock-line short"),
            node("span", "mock-run", "Ready to run ↗"),
          );
        else card.append(node("span", "mock-run", "↗"));
        mocks.append(card);
      }
      stage.append(mocks);
    } else if (scene === "lab") {
      const blocks = node("div", "lab-timeline");
      ["place tower", "upgrade", "wait", "run it back"].forEach(
        (text, index) => {
          const row = node("div", "lab-block");
          row.style.setProperty("--i", index);
          row.append(
            node("span", "", String(index + 1).padStart(2, "0")),
            node("b", "", text),
            node("i"),
          );
          blocks.append(row);
        },
      );
      stage.append(blocks);
    } else if (scene === "cloud" || scene === "community") {
      const network = node(
        "div",
        scene === "cloud" ? "cloud-network" : "conversation",
      );
      ["you", "um", "next"].forEach((text, index) => {
        const bubble = node("div", "network-node node-" + index, text);
        network.append(bubble);
      });
      network.append(
        node("i", "network-link link-a"),
        node("i", "network-link link-b"),
        node("i", "data-dot"),
      );
      stage.append(network);
    } else {
      const prism = node("div", "idea-prism");
      for (let i = 0; i < 3; i++) {
        const plane = node("div", "prism-plane plane-" + i);

        prism.append(plane);
      }
      stage.append(prism);
    }
    aside.append(stage);
    return aside;
  }
  function scene(section) {
    document.body.dataset.scene = sceneNames[section] || section || "landing";
  }
  function arrive(item, delay = 0, distance = 20, duration = 650) {
    const base = getComputedStyle(item).transform;
    const transform = base === "none" ? "" : base;
    animate(
      item,
      [
        {
          transform: `translateY(${distance}px) scale(.88) ${transform}`,
          opacity: 0,
        },
        { transform: `translateY(0) scale(1) ${transform}`, opacity: 1 },
      ],
      { delay, duration },
    );
  }
  function enter(
    root,
    { direction = "forward", sectionChanged = false, branch = false } = {},
  ) {
    if (branch) {
      animate(
        root.querySelector(".question"),
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 240 },
      );
      animate(
        root.querySelector(".branch-context"),
        [
          { transform: "scale(.88)", opacity: 0.5 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 240 },
      );
      return;
    }
    const heading = root.querySelector("h1");
    if (heading && !heading.closest(".landing-copy")) split(heading);
    const page = root.querySelector(".question,.review,.completion");
    animate(
      page,
      [
        {
          opacity: 0,
          transform: `translateX(${direction === "back" ? -28 : 28}px) scale(.98)`,
        },
        { opacity: 1, transform: "translateX(0) scale(1)" },
      ],
      { duration: sectionChanged ? 550 : 420 },
    );
    root
      .querySelectorAll(".word")
      .forEach((word, index) =>
        animate(
          word,
          [
            { transform: "translateY(112%) rotate(3deg)" },
            { transform: "translateY(0) rotate(0)" },
          ],
          { duration: 560, delay: Math.min(index * 18, 190) },
        ),
      );
    root.querySelectorAll(".choice,.rank-row").forEach((card, index) =>
      animate(
        card,
        [
          {
            opacity: 0,
            transform: `translateY(${18 + index * 2}px) rotateX(8deg)`,
          },
          { opacity: 1, transform: "translateY(0) rotateX(0)" },
        ],
        { delay: Math.min(index * 28, 180), duration: 470 },
      ),
    );
    animate(
      root.querySelector(".section-art"),
      [
        {
          opacity: 0,
          transform: sectionChanged
            ? "translateY(24px) rotate(-5deg) scale(.85)"
            : "translateY(12px)",
        },
        { opacity: 1, transform: "translateY(0) rotate(0) scale(1)" },
      ],
      { duration: 700 },
    );
    root
      .querySelectorAll(".art-stage > *, .lab-block,.mock-card")
      .forEach((item, index) => arrive(item, 100 + index * 50));
    if (root.querySelector(".completion"))
      celebrate(root.querySelector(".completion"));
  }
  async function leave(root, direction = "forward", branch = false) {
    if (reduced.matches) return;
    const section = root.querySelector(
      ".question,.review,.completion,.landing",
    );
    if (!section) return;
    if (branch && direction !== "back") {
      const cards = [...root.querySelectorAll(".choice")];
      const animations = cards.map((card) => {
        const selected = card.querySelector("input")?.checked;
        return animate(
          card,
          [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            {
              opacity: selected ? 1 : 0,
              transform: selected
                ? "translateY(-8px) scale(.86)"
                : "scale(.94)",
            },
          ],
          { duration: 160 },
        );
      });
      root.dataset.branchTransition = "leaving";
      try {
        await Promise.all(
          animations.map((animation) => animation?.finished.catch(() => {})),
        );
      } finally {
        delete root.dataset.branchTransition;
      }
      return;
    }
    const animation = animate(
      section,
      [
        { opacity: 1, transform: "translateX(0) scale(1)" },
        {
          opacity: 0,
          transform: `translateX(${direction === "back" ? 35 : -35}px) scale(.97)`,
        },
      ],
      { duration: 180, easing: "cubic-bezier(.6,0,.8,.4)" },
    );
    await animation?.finished.catch(() => {});
  }
  function pulse(target, type = "choice") {
    if (!target) return;
    animate(
      target,
      [
        { transform: "scale(1)" },
        {
          transform:
            type === "rating" ? "translateY(-9px) scale(1.09)" : "scale(1.025)",
        },
        { transform: "scale(.995)" },
        { transform: "scale(1)" },
      ],
      { duration: 430, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
    const dot = node("i", "selection-flash");
    dot.setAttribute("aria-hidden", "true");
    target.append(dot);
    const animation = animate(
      dot,
      [
        { opacity: 0.55, transform: "scale(.3)" },
        { opacity: 0, transform: "scale(2.4)" },
      ],
      { duration: 520 },
    );
    if (animation)
      animation.finished.catch(() => {}).finally(() => dot.remove());
    else dot.remove();
  }
  function ranks(list, before) {
    list.querySelectorAll(".rank-row").forEach((row) => {
      const old = before.get(row.dataset.value);
      if (old !== undefined) {
        const delta = old - row.getBoundingClientRect().top;
        if (delta)
          animate(
            row,
            [
              { transform: `translateY(${delta}px)` },
              { transform: `translateY(${-delta * 0.08}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
      }
    });
  }
  let previousProgress = 0;
  function progress(root, value) {
    const fill = root.querySelector(".progress-fill");
    const next = Math.max(0, Math.min(1, value));
    if (fill) {
      fill.style.transform = `scaleX(${next})`;
      if (previousProgress !== next)
        animate(
          fill,
          [
            { transform: `scaleX(${previousProgress})` },
            { transform: `scaleX(${next})` },
          ],
          { duration: 650 },
        );
    }
    previousProgress = next;
    const eta = root.querySelector("#eta");
    if (eta && eta.dataset.last !== eta.textContent) {
      animate(
        eta,
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 260 },
      );
      eta.dataset.last = eta.textContent;
    }
  }
  function cue(text) {
    const toast = document.querySelector("#motion-note");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("visible");
    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
  }
  function celebrate(root) {
    const constellation = node("div", "completion-constellation");
    const center = node("div", "completion-center", "✳");
    constellation.append(center);
    for (let i = 0; i < 12; i++) {
      const ray = node("i", "completion-ray");
      ray.style.setProperty("--angle", i * 30 + "deg");
      constellation.append(ray);
      animate(
        ray,
        [
          {
            opacity: 0,
            transform: `rotate(${i * 30}deg) translateX(0) scale(.2)`,
          },
          {
            opacity: 1,
            transform: `rotate(${i * 30}deg) translateX(110px) scale(1)`,
          },
          {
            opacity: 0.4,
            transform: `rotate(${i * 30}deg) translateX(90px) scale(.6)`,
          },
        ],
        { duration: 900, delay: i * 16 },
      );
    }
    root.prepend(constellation);
    animate(
      center,
      [
        { opacity: 0, transform: "scale(.3) rotate(-100deg)" },
        { opacity: 1, transform: "scale(1.08) rotate(10deg)" },
        { opacity: 1, transform: "scale(1) rotate(0)" },
      ],
      { duration: 850 },
    );
  }
  function choiceArt(value) {
    const mock = node("span", "mock-choice");
    mock.setAttribute("aria-hidden", "true");
    const type = {
      settings: "switches",
      strategies: "cards",
      lab: "blocks",
      status: "wave",
      account: "nodes",
    }[value];
    if (!type) return null;
    mock.classList.add(type);
    for (let i = 0; i < 3; i++) mock.append(node("i"));
    return mock;
  }
  let pointerFrame = 0;
  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        reduced.matches ||
        !fine.matches ||
        !document.querySelector(".landing-art") ||
        pointerFrame
      )
        return;
      pointerFrame = requestAnimationFrame(() => {
        const art = document.querySelector(".landing-art");
        if (art) {
          const x = (event.clientX / innerWidth - 0.5) * 2,
            y = (event.clientY / innerHeight - 0.5) * 2;
          art.style.setProperty("--tilt-x", -y * 5 + "deg");
          art.style.setProperty("--tilt-y", x * 7 + "deg");
        }
        pointerFrame = 0;
      });
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target.closest(
        ".primary,.quiet,.rank-buttons button",
      );
      if (target && !target.disabled) pulse(target, "button");
    },
    { passive: true },
  );
  document.addEventListener("change", (event) => {
    const card = event.target.closest(".choice");
    if (card && event.target.checked)
      pulse(card, card.closest(".rating") ? "rating" : "choice");
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) {
      document.getAnimations().forEach((a) => a.cancel());
      document.querySelectorAll(".answer-flight").forEach((n) => n.remove());
      const art = document.querySelector(".landing-art");
      if (art) {
        art.style.removeProperty("--tilt-x");
        art.style.removeProperty("--tilt-y");
      }
    }
  });
  new MutationObserver(() => {
    const text = document.querySelector("#save-status").textContent;
    document.body.dataset.save = text.includes("Saving")
      ? "saving"
      : text.includes("Not saved")
        ? "offline"
        : text.includes("Saved")
          ? "saved"
          : "waiting";
  }).observe(document.querySelector("#save-status"), { childList: true });
  const landing = document.querySelector(".landing");
  landing
    ?.querySelectorAll(
      ".landing-copy > *,.floating-card,.orbit-label,.orbit-footnote",
    )
    .forEach((item, index) => arrive(item, Math.min(index * 85, 650), 24, 800));
  animate(
    document.querySelector(".signal-orbit"),
    [
      { opacity: 0, transform: "rotate(-35deg) scale(.5)" },
      { opacity: 1, transform: "rotate(0) scale(1)" },
    ],
    { duration: 1300, delay: 120 },
  );
  window.PollMotion = {
    art,
    scene,
    enter,
    leave,
    pulse,
    ranks,
    progress,
    cue,
    choiceArt,
    split,
  };
})();
