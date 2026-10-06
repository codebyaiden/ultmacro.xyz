(() => {
  "use strict";
  const main = document.querySelector("#survey"),
    status = document.querySelector("#save-status"),
    error = document.querySelector("#error"),
    retry = document.querySelector("#retry");
  const draftKey = "um-poll-draft-v1";
  const motion = window.PollMotion,
    clock = window.PollClock.create();
  const timeKey = "um-poll-active-v1";
  let tracking = false,
    transitionDirection = "forward",
    previousSection = null,
    transitionFrom = null;
  function storedTime() {
    try {
      return JSON.parse(localStorage.getItem(timeKey));
    } catch {
      return null;
    }
  }
  function persistTime(complete = false) {
    try {
      localStorage.setItem(
        timeKey,
        JSON.stringify({
          version: state?.version,
          milliseconds: clock.read(),
          complete,
        }),
      );
    } catch {}
  }
  function beginTiming(reset = false) {
    if (tracking || state?.completed) return;
    const stored = reset ? null : storedTime();
    clock.start(
      stored?.version === state.version && !stored.complete
        ? stored.milliseconds
        : 0,
    );
    clock.visibility(!document.hidden);
    tracking = true;
    persistTime();
  }
  document.addEventListener("visibilitychange", () => {
    clock.visibility(!document.hidden);
    if (tracking) persistTime();
  });
  ["pointerdown", "keydown", "input"].forEach((type) =>
    document.addEventListener(
      type,
      () => {
        if (tracking) clock.activity();
      },
      { passive: true },
    ),
  );
  setInterval(() => {
    if (tracking) persistTime();
  }, 10000);
  function finishRender(focus) {
    if (focus) focusHeading();
    const q = currentQuestion();
    motion.scene(state.completed ? "complete" : q?.section || "final");
    motion.enter(main, {
      direction: transitionDirection,
      sectionChanged: q?.section !== previousSection,
      branch:
        transitionDirection === "forward" && transitionFrom === q?.branchParent,
    });
    previousSection = q?.section || null;
    transitionFrom = null;
  }

  let state = null,
    draft = null,
    timer = null,
    queue = Promise.resolve(),
    dirty = false,
    busy = false,
    lastFailure = null,
    inflight = null;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const currentQuestion = () => state?.path.find((q) => q.id === state.current);
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const local = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(draftKey));
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(value));
      } catch {}
    },
    clear() {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    },
  };
  function showError(caught, action) {
    error.textContent = caught.message || "Something went wrong. Try again.";
    lastFailure = action;
    retry.hidden = false;
    retry.textContent =
      caught.status === 409 ? "Reload saved survey" : "Try again";
    if (caught.status === 409) lastFailure = () => load(true);
  }
  function clearError() {
    error.textContent = "";
    retry.hidden = true;
    lastFailure = null;
  }
  async function api(path = "", body) {
    if (tracking) persistTime();
    let response;
    try {
      response = await fetch("/api/poll" + path, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "x-poll-request": "1" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new Error(
        "You’re offline, or we couldn’t reach the server. Your latest answer stays in this browser.",
      );
    }
    const data = await response
      .json()
      .catch(() => ({ error: "The server could not process this request." }));
    if (!response.ok)
      throw Object.assign(new Error(data.error || "Please try again."), {
        status: response.status,
      });
    return data;
  }
  function remember() {
    const q = currentQuestion();
    if (q)
      local.set({
        version: state.version,
        questionId: q.id,
        value: draft,
        revision: state.revision,
        inflight,
      });
  }
  const disabledDuringAction = new Map();
  function buttonsDisabled(value) {
    if (value) {
      main.querySelectorAll("button,input,textarea").forEach((node) => {
        disabledDuringAction.set(node, node.disabled);
        node.disabled = true;
      });
    } else {
      for (const [node, disabled] of disabledDuringAction)
        if (node.isConnected) node.disabled = disabled;
      disabledDuringAction.clear();
    }
  }
  function pendingSave() {
    clearTimeout(timer);
    const q = currentQuestion();
    if (!q || !dirty || (Array.isArray(draft) && !draft.length)) return queue;
    const value = structuredClone(draft),
      questionId = q.id;
    if (
      (q.type === "short" || q.type === "long") &&
      !q.optional &&
      !String(value || "").trim()
    )
      return queue;
    dirty = false;
    status.textContent = "Saving…";
    queue = queue
      .catch(() => {})
      .then(async () => {
        try {
          inflight = { questionId, value, revision: state.revision };
          remember();
          state = await api("/answer", {
            revision: state.revision,
            questionId,
            value,
            advance: false,
          });
          inflight = null;
          if (equal(draft, value)) {
            local.clear();
            status.textContent = "Saved automatically";
          } else {
            remember();
          }
          updateProgress();
        } catch (caught) {
          dirty = true;
          status.textContent = "Not saved yet";
          showError(caught, () => pendingSave());
          throw caught;
        }
      });
    return queue;
  }
  function changed(value) {
    draft = value;
    dirty = true;
    remember();
    const next = main.querySelector("button[type=submit]");
    if (next)
      next.disabled = draft === null || (Array.isArray(draft) && !draft.length);
    clearError();
    status.textContent = "Waiting to save…";
    clearTimeout(timer);
    timer = setTimeout(() => pendingSave().catch(() => {}), 350);
  }
  function updateProgress() {
    const bar = main.querySelector("progress"),
      eta = main.querySelector("#eta");
    if (bar) bar.value = state.progress;
    if (eta)
      eta.textContent =
        state.remainingSeconds > 60
          ? `about ${Math.ceil(state.remainingSeconds / 60)} min left`
          : state.remainingSeconds
            ? "less than a minute left"
            : "ready to submit";
    motion.progress(main, state.progress);
  }
  async function act(path, body = {}) {
    if (busy) return;
    busy = true;
    buttonsDisabled(true);
    clearError();
    try {
      await pendingSave();
      const from = currentQuestion();
      const nextState = await api(path, { revision: state.revision, ...body });
      transitionDirection = body.direction === "back" ? "back" : "forward";
      const destination = nextState.path.find(
        (q) => q.id === nextState.current,
      );
      transitionFrom =
        from && destination?.branchParent === from.id ? from.id : null;
      // Saving finishes before motion; a cancelled effect cannot roll back navigation.
      await motion
        .leave(main, transitionDirection, Boolean(transitionFrom))
        .catch(() => {});
      state = nextState;
      dirty = false;
      local.clear();
      status.textContent = state.completed
        ? "Submitted successfully"
        : "Saved automatically";
      render(true);
    } catch (caught) {
      showError(caught, () => act(path, body));
    } finally {
      busy = false;
      buttonsDisabled(false);
    }
  }
  function button(label, className, action) {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function render(focus = false) {
    clearTimeout(timer);
    main.setAttribute("aria-busy", "false");
    main.replaceChildren();
    if (state.completed) {
      local.clear();
      dirty = false;
      if (tracking) {
        clock.stop();
        persistTime(true);
        tracking = false;
      }
      const section = el("section", "completion");
      section.append(
        el("h1", "", "that’s everything."),
        el(
          "p",
          "completion-copy",
          "Thanks for helping us build a better Ultimate Macro.",
        ),
      );
      const active = storedTime();
      if (
        active?.version === state.version &&
        active.complete &&
        active.milliseconds > 0
      )
        section.append(
          el(
            "p",
            "adapt-note",
            `about ${Math.max(1, Math.round(active.milliseconds / 60000))} active min`,
          ),
        );
      const home = el("a", "primary", "Back to Ultimate Macro");
      home.href = "/";
      section.append(home);
      main.append(section);
      finishRender(focus);
      return;
    }
    const meta = el("div", "progress-meta");
    meta.append(el("span", "", ""));
    meta.lastChild.id = "eta";
    const progress = el("progress", "progress");
    progress.max = 1;
    progress.setAttribute("aria-label", "Estimated survey progress");
    progress.className = "sr-only";
    const progressWrap = el("div", "progress-wrap");
    progressWrap.setAttribute("aria-hidden", "true");
    progressWrap.append(el("div", "progress-fill"));
    main.append(meta, progress, progressWrap);
    updateProgress();
    if (!state.current) {
      const section = el("section", "review");
      section.append(el("h1", "", "Ready to send your feedback?"));
      const controls = el("div", "controls");
      controls.append(
        button("Back", "quiet", () => act("/navigate", { direction: "back" })),
        button("Submit feedback", "primary", () => act("/submit")),
      );
      section.append(controls);
      main.append(section);
      finishRender(focus);
      return;
    }
    const q = currentQuestion();
    draft = Object.hasOwn(state.answers, q.id)
      ? structuredClone(state.answers[q.id])
      : q.type === "multiple"
        ? []
        : q.type === "ranking"
          ? q.options.map((o) => o.value)
          : q.type === "short" || q.type === "long"
            ? ""
            : null;
    const saved = local.get();
    dirty = false;
    if (
      saved?.version === state.version &&
      saved.questionId === q.id &&
      !equal(saved.value, draft)
    ) {
      const acknowledged =
        saved.inflight?.revision + 1 === state.revision &&
        saved.inflight.questionId === q.id &&
        equal(state.answers[q.id], saved.inflight.value);
      if (saved.revision === state.revision || acknowledged) {
        draft = saved.value;
        dirty = true;
        status.textContent = "Restored your unsaved answer";
        timer = setTimeout(() => pendingSave().catch(() => {}), 350);
      } else {
        showError(
          new Error(
            "An unsaved answer is available from this browser. Restore it, or continue with the saved answer.",
          ),
          () => {
            local.set({ ...saved, revision: state.revision, inflight: null });
            clearError();
            render(true);
          },
        );
        retry.textContent = "Restore unsaved answer";
      }
    }
    const section = el("section", "question");
    const heading = el("h1", "", q.title);
    heading.id = "question-title";
    section.append(heading);
    const descriptionText =
      q.type === "multiple"
        ? q.id === "features"
          ? `Choose up to ${q.maxChoices}.`
          : "Select all that apply."
        : q.type === "ranking"
          ? "Most important first."
          : q.id === "final"
            ? "Don’t include personal information."
            : "";
    if (descriptionText) {
      const description = el("p", "description", descriptionText);
      description.id = "question-description";
      section.append(description);
    }
    const form = el("form");
    form.setAttribute("aria-labelledby", "question-title");
    if (["single", "multiple", "rating"].includes(q.type)) {
      const fieldset = el(
        "fieldset",
        q.type === "rating" ? "choices rating" : "choices",
      );
      if (descriptionText)
        fieldset.setAttribute("aria-describedby", "question-description");
      const legend = el("legend", "sr-only", q.title);
      fieldset.append(legend);
      const options =
        q.type === "rating"
          ? [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))
          : q.options;
      options.forEach((option, optionIndex) => {
        const label = el("label", "choice"),
          input = el("input");
        input.type = q.type === "multiple" ? "checkbox" : "radio";
        input.name = q.id;
        input.value = String(option.value);
        input.checked =
          q.type === "multiple"
            ? draft?.includes(option.value)
            : draft === option.value;
        input.setAttribute(
          "aria-label",
          q.type === "rating"
            ? `${option.value} out of 5${option.value === 1 ? ": " + q.low : option.value === 5 ? ": " + q.high : ""}`
            : option.label,
        );
        input.addEventListener("change", () => {
          if (q.type === "multiple") {
            let next = Array.isArray(draft) ? [...draft] : [];
            if (input.checked) {
              if (q.exclusive?.includes(option.value)) next = [option.value];
              else
                next = [
                  ...next.filter((v) => !q.exclusive?.includes(v)),
                  option.value,
                ];
            } else next = next.filter((v) => v !== option.value);
            if (q.maxChoices && next.length > q.maxChoices) {
              input.checked = false;
              showError(
                new Error(`Choose up to ${q.maxChoices} options.`),
                () => {
                  clearError();
                },
              );
              return;
            }
            fieldset.querySelectorAll("input").forEach((node) => {
              node.checked = next.includes(node.value);
            });
            changed(next);
          } else changed(option.value);
        });
        const key = el("span", "answer-key", String(optionIndex + 1));
        key.setAttribute("aria-hidden", "true");
        const mark = el("span", "choice-mark", "✓");
        mark.setAttribute("aria-hidden", "true");
        const optionText = el("span", "choice-label", option.label);
        if (option.description)
          optionText.append(
            el(
              "small",
              "option-description",
              option.value === "plus"
                ? "Optional supporter tier for advanced tools and perks. Ultimate Macro stays free."
                : option.description,
            ),
          );
        label.append(input, key, optionText);
        if (q.id === "clutter") {
          const illustration = motion.choiceArt(option.value);
          if (illustration) label.append(illustration);
        }
        label.append(mark);
        fieldset.append(label);
      });
      form.append(fieldset);
      if (q.type === "rating") {
        const labels = el("div", "rating-labels");
        labels.append(
          el("span", "", `1 · ${q.low}`),
          el("span", "", `5 · ${q.high}`),
        );
        form.append(labels);
      }
    } else if (q.type === "short" || q.type === "long") {
      const wrapper = el("div", "text-answer"),
        input = el(q.type === "long" ? "textarea" : "input");
      if (q.type === "short") input.type = "text";
      input.value = draft || "";
      input.maxLength = q.maxLength;
      input.required = !q.optional;
      input.setAttribute("aria-labelledby", "question-title");
      if (descriptionText)
        input.setAttribute("aria-describedby", "question-description");
      input.placeholder = q.optional ? "Optional" : "";
      const count = el(
        "p",
        "char-count",
        `${input.value.length} / ${q.maxLength}`,
      );
      input.addEventListener("input", () => {
        count.textContent = `${input.value.length} / ${q.maxLength}`;
        changed(input.value);
      });
      wrapper.append(input, count);
      form.append(wrapper);
    } else if (q.type === "ranking") {
      const list = el("ol", "ranking");
      list.setAttribute("aria-labelledby", "question-title");
      const draw = (focusValue, direction) => {
        const before = new Map(
          [...list.querySelectorAll(".rank-row")].map((row) => [
            row.dataset.value,
            row.getBoundingClientRect().top,
          ]),
        );
        list.replaceChildren();
        draft.forEach((value, index) => {
          const option = q.options.find((o) => o.value === value);
          const row = el("li", "rank-row");
          row.dataset.value = value;
          row.append(
            el("span", "rank-number", String(index + 1)),
            el("span", "rank-label", option.label),
          );
          const controls = el("div", "rank-buttons");
          for (const [step, symbol, name] of [
            [-1, "↑", "up"],
            [1, "↓", "down"],
          ]) {
            const node = button(symbol, "", () => {
              const next = [...draft];
              [next[index], next[index + step]] = [
                next[index + step],
                next[index],
              ];
              changed(next);
              draw(value, name);
            });
            node.disabled = index + step < 0 || index + step >= draft.length;
            node.setAttribute("aria-label", `Move ${option.label} ${name}`);
            node.dataset.value = value;
            node.dataset.direction = name;
            controls.append(node);
          }
          row.append(controls);
          list.append(row);
        });
        motion.ranks(list, before);
        if (focusValue) {
          const nodes = [...list.querySelectorAll("button")];
          const target =
            nodes.find(
              (n) =>
                n.dataset.value === focusValue &&
                n.dataset.direction === direction &&
                !n.disabled,
            ) ||
            nodes.find((n) => n.dataset.value === focusValue && !n.disabled);
          target?.focus();
        }
      };
      draw();
      form.append(list);
    }
    const controls = el("div", "controls"),
      back = button("← Back", "quiet", () =>
        act("/navigate", { direction: "back" }),
      );
    back.dataset.first = String(state.path[0].id === q.id);
    back.disabled = back.dataset.first === "true";
    controls.append(back);
    if (q.optional)
      controls.append(
        button(q.skipLabel || "Skip", "quiet rating-skip", () => {
          draft = null;
          dirty = false;
          clearTimeout(timer);
          act("/answer", { questionId: q.id, value: null, advance: true });
        }),
      );
    const next = el(
      "button",
      "primary",
      state.path.at(-1).id === q.id ? "Review & submit" : "Continue →",
    );
    next.type = "submit";
    next.disabled = draft === null || (Array.isArray(draft) && !draft.length);
    controls.append(next);
    form.append(controls);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (draft === null || (Array.isArray(draft) && !draft.length)) {
        showError(new Error("Choose an answer to continue."), () => {
          clearError();
        });
        return;
      }
      act("/answer", {
        questionId: q.id,
        value: structuredClone(draft),
        advance: true,
      });
    });
    section.append(form);
    const stage = el("div", "question-stage");
    stage.append(section, motion.art(q.section));
    main.append(stage);
    finishRender(focus);
  }
  function focusHeading() {
    const heading = main.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      main.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  async function load(discard = false) {
    try {
      state = await api();
      if (discard) {
        local.clear();
        dirty = false;
      }
      clearError();
      beginTiming();
      if (!discard && !state.completed) {
        transitionDirection = "resume";
      }
      render(discard);
    } catch (caught) {
      main.setAttribute("aria-busy", "false");
      const start = document.querySelector("#start");
      if (caught.status === 401) {
        if (start) {
          start.disabled = false;
          start.textContent = "Start survey →";
          start.onclick = async () => {
            start.disabled = true;
            clearError();
            try {
              state = await api("/start", {});
              beginTiming(true);
              await motion.leave(main, "forward");
              render(true);
            } catch (error) {
              showError(error, () => start.click());
            } finally {
              start.disabled = false;
            }
          };
        } else {
          location.reload();
        }
      } else {
        showError(caught, () => load());
        if (start) start.textContent = "Survey temporarily unavailable";
      }
    }
  }
  retry.addEventListener("click", () => {
    const action = lastFailure;
    clearError();
    Promise.resolve(action?.()).catch((caught) => showError(caught, action));
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      remember();
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    if (dirty) remember();
    if (tracking) persistTime();
  });
  window.addEventListener("online", () => {
    if (dirty) pendingSave().catch(() => {});
  });
  document.addEventListener("keydown", (event) => {
    if (
      busy ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing
    )
      return;
    const target = event.target;
    if (target.closest("textarea,input[type=text]")) return;
    if (/^[1-9]$/.test(event.key) && target.closest(".choices")) {
      const input =
        main.querySelectorAll(".choices input")[Number(event.key) - 1];
      if (input && !input.disabled) {
        event.preventDefault();
        input.focus();
        input.click();
      }
    }
    if (event.key === "Enter" && target.matches(".choices input")) {
      event.preventDefault();
      main.querySelector("form")?.requestSubmit();
    }
  });
  async function loadCompletionCount() {
    const line = document.querySelector("#completion-count");
    if (!line) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch("/api/poll/completions", {
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) return;
      const { completedCount } = await response.json();
      if (
        !line.isConnected ||
        !Number.isSafeInteger(completedCount) ||
        completedCount <= 0
      )
        return;
      const count = new Intl.NumberFormat().format(completedCount);
      line.textContent = `${count} ${completedCount === 1 ? "person" : "people"} completed this poll`;
      line.hidden = false;
    } catch {
      /* Optional aggregate must never block starting or resuming. */
    } finally {
      clearTimeout(timeout);
    }
  }
  loadCompletionCount();
  load();
})();
