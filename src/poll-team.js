(() => {
  "use strict";
  const content = document.querySelector("#content"),
    status = document.querySelector("#status"),
    error = document.querySelector("#error");
  let meta,
    filters = {},
    view = "overview",
    question = "satisfaction",
    page = 0,
    feedbackQuestion = "",
    search = "",
    requestId = 0,
    controller,
    previousView = "responses";
  const node = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const button = (text, cls, fn) => {
    const e = node("button", cls, text);
    e.type = "button";
    e.addEventListener("click", fn);
    return e;
  };
  const qById = (id) => meta.questions.find((q) => q.id === id);
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";
  function params(extra = {}) {
    return new URLSearchParams({ ...filters, ...extra });
  }
  async function api(route, query = {}, options = {}) {
    const r = await fetch(
      "/api/poll-team" +
        route +
        (params(query).size ? "?" + params(query) : ""),
      {
        credentials: "same-origin",
        cache: "no-store",
        signal: controller?.signal,
        ...options,
      },
    );
    const data = await r.json();
    if (!r.ok)
      throw Object.assign(new Error(data.error || "Unable to load feedback."), {
        status: r.status,
      });
    return data;
  }
  function empty(title, copy) {
    const e = node("div", "empty");
    e.append(
      node("span", "empty-mark", "✳"),
      node("h2", "", title),
      node("p", "", copy),
    );
    return e;
  }
  function loading() {
    const e = node("div", "loading-grid");
    for (let i = 0; i < 4; i++) e.append(node("div"));
    content.replaceChildren(e);
  }
  function field(title, input) {
    const label = node("label", "field", title);
    input.setAttribute("aria-label", title);
    label.append(input);
    return label;
  }
  function select(options, value, placeholder = "All responses") {
    const e = node("select");
    e.append(new Option(placeholder, ""));
    for (const o of options) e.append(new Option(o.label, String(o.value)));
    e.value = value || "";
    return e;
  }
  function setupFilters() {
    const host = document.querySelector("#filter-fields");
    host.replaceChildren();
    const version = select(meta.versions, filters.version, "Current survey");
    version.name = "version";
    host.append(field("Survey version", version));
    const titles = {
      frequency: "Usage frequency",
      experience: "Experience",
      lab_use: "Strategy Lab",
      success: "Run reliability",
      focus: "Development priority",
      discord: "Discord usage",
      features: "Feature interests (up to 4)",
    };
    for (const f of meta.filters) {
      const e = select(f.options, filters[f.id]);
      e.name = f.id;
      if (f.id === "features") {
        e.multiple = true;
        e.size = 3;
      }
      host.append(field(titles[f.id], e));
    }
    for (const [id, title, options] of [
      [
        "status",
        "Response state",
        [
          { value: "completed", label: "Completed" },
          { value: "partial", label: "In progress" },
        ],
      ],
      [
        "satisfactionMin",
        "Satisfaction at least",
        [1, 2, 3, 4, 5].map((v) => ({ value: v, label: v + " / 5" })),
      ],
      [
        "satisfactionMax",
        "Satisfaction at most",
        [1, 2, 3, 4, 5].map((v) => ({ value: v, label: v + " / 5" })),
      ],
    ]) {
      const e = select(options, filters[id]);
      e.name = id;
      host.append(field(title, e));
    }
    for (const [id, title] of [
      ["from", "Completed from (UTC)"],
      ["to", "Completed through (UTC)"],
    ]) {
      const e = node("input");
      e.type = "date";
      e.name = id;
      e.value = filters[id] || "";
      host.append(field(title, e));
    }
  }
  function segmentLabel() {
    let chips = document.querySelector("#segment-chips");
    if (!chips) {
      chips = node("div", "segment-chips");
      chips.id = "segment-chips";
      document.querySelector("#branch").before(chips);
    }
    chips.replaceChildren();
    const short = {
      frequency: "Usage",
      experience: "Experience",
      lab_use: "Lab",
      success: "Reliability",
      focus: "Priority",
      discord: "Discord",
    };
    for (const [key, value] of Object.entries(filters)) {
      if (key.startsWith("branch")) continue;
      let labels;
      const config = meta.filters.find((f) => f.id === key);
      if (config)
        labels = value
          .split(",")
          .map(
            (v) =>
              (short[key] || "Feature") +
              ": " +
              (config.options.find((o) => o.value === v)?.label || v),
          );
      else
        labels = [
          key === "version"
            ? "Survey: " +
              (meta.versions.find((v) => v.value === value)?.label || value)
            : key === "satisfactionMin"
              ? "Satisfaction ≥ " + value
              : key === "satisfactionMax"
                ? "Satisfaction ≤ " + value
                : key === "from"
                  ? "Completed from " + value
                  : key === "to"
                    ? "Completed through " + value
                    : value === "completed"
                      ? "Completed responses"
                      : "In-progress responses",
        ];
      for (const label of labels)
        chips.append(node("span", "segment-chip", label));
    }
    chips.hidden = !chips.childNodes.length;
    const count = Object.keys(filters).filter(
      (k) => !k.startsWith("branch"),
    ).length;
    document.querySelector("#segment-label").textContent = count
      ? `${count} segment filter${count === 1 ? "" : "s"}`
      : "All responses";
    const branch = document.querySelector("#branch");
    branch.replaceChildren();
    branch.hidden = !filters.branchQuestion;
    if (filters.branchQuestion) {
      const q = qById(filters.branchQuestion),
        o = q.options.find((o) => String(o.value) === filters.branchValue);
      const line = node("div", "branch-breadcrumb");
      line.append(
        node("span", "", `${q.title} → ${o?.label || filters.branchValue}`),
        button("Clear branch ×", "quiet", () => {
          question = filters.branchQuestion;
          delete filters.branchQuestion;
          delete filters.branchValue;
          segmentLabel();
          load("questions");
        }),
      );
      branch.append(line);
    }
  }
  function panel(title, caption) {
    const e = node("section", "panel"),
      head = node("div", "panel-header"),
      text = node("div");
    text.append(node("h2", "", title), node("p", "caption", caption));
    head.append(text);
    e.append(head);
    return e;
  }
  function bars(
    data,
    { compact = false, limit = 100, follow = false, nonzero = false } = {},
  ) {
    const list = node("div", "bar-list" + (compact ? " compact" : ""));
    const options = data.counts
      .filter((row) => !nonzero || row.count)
      .sort((a, b) =>
        data.question.type === "rating"
          ? Number(a.value) - Number(b.value)
          : data.question.type === "ranking"
            ? (a.averageRank ?? 99) - (b.averageRank ?? 99)
            : b.count - a.count,
      )
      .slice(0, limit);
    for (const row of options) {
      const e = node("div", "bar-row");
      e.append(node("span", "bar-label", row.label));
      const number = node("span", "bar-number", row.percentage + "%");
      number.append(
        node(
          "small",
          "",
          row.count + " " + (row.count === 1 ? "answer" : "answers"),
        ),
      );
      e.append(number);
      const track = node("div", "bar-track"),
        fill = node("div", "bar-fill");
      fill.style.width = Math.min(100, row.percentage) + "%";
      track.append(fill);
      e.append(track);
      track.setAttribute("aria-hidden", "true");
      if (row.averageRank !== undefined)
        e.append(
          node(
            "div",
            "ranking-stats",
            row.count
              ? `Average position ${row.averageRank} · ${row.first} ranked first`
              : "Not ranked yet",
          ),
        );
      if (follow && row.followups.length && row.count) {
        const links = node("div", "followups");
        for (const next of row.followups)
          links.append(
            button(next.title + " →", "followup", () => {
              filters.branchQuestion = data.question.id;
              filters.branchValue = row.value;
              question = next.id;
              segmentLabel();
              load("questions");
            }),
          );
        e.append(links);
      }
      list.append(e);
    }
    return list;
  }
  function ratings(data) {
    const e = node("div", "rating-chart");
    const max = Math.max(1, ...data.counts.map((o) => o.count));
    for (const row of [...data.counts].sort(
      (a, b) => Number(a.value) - Number(b.value),
    )) {
      const col = node("div", "rating-column"),
        bar = node("div", "rating-bar");
      bar.style.height = (row.count / max) * 92 + "px";
      col.append(
        node(
          "b",
          "",
          row.count + " " + (row.count === 1 ? "answer" : "answers"),
        ),
        bar,
        node("span", "", row.label + " / 5"),
      );
      e.append(col);
      bar.setAttribute("aria-hidden", "true");
    }
    return e;
  }
  function metric(title, value, note) {
    const e = node("dl", "metric");
    e.append(node("dt", "", title));
    const dd = node("dd", "", value);
    dd.append(node("span", "metric-note", note));
    e.append(dd);
    return e;
  }
  function overview(data, satisfaction) {
    const root = node("div"),
      metrics = node("div", "metric-grid");
    metrics.append(
      metric(
        "Total responses",
        data.total,
        "Includes in-progress responses in this segment.",
      ),
      metric("Completed", data.completed, "Submitted, anonymous feedback."),
      metric(
        "Completion rate",
        data.completionRate + "%",
        "Completed ÷ total segment responses.",
      ),
      metric(
        "Overall satisfaction",
        data.satisfaction.average === null
          ? "—"
          : data.satisfaction.average + " / 5",
        `${data.satisfaction.answered} ratings · answered responses only.`,
      ),
    );
    root.append(metrics);
    if (!data.total) {
      root.append(
        empty(
          "Nothing in this segment yet.",
          "Widen your filters or check back once responses arrive.",
        ),
      );
      return root;
    }
    const grid = node("div", "dashboard-grid"),
      experience = panel(
        "The overall experience",
        "Rating distribution among respondents who answered.",
      );
    experience.append(ratings(satisfaction));
    const insights = node("div", "insight-row"),
      problem = node("div"),
      reliability = node("div");
    const top = [...data.problem.counts]
      .filter((o) => o.value !== "none" && o.count)
      .sort((a, b) => b.count - a.count)[0];
    problem.append(
      node("span", "caption", "Top reported problem"),
      node("strong", "", top?.label || "No problem reported"),
      node(
        "p",
        "caption",
        top
          ? `${top.count} answers · ${top.percentage}% of problem answers`
          : "No issue answers in this segment.",
      ),
    );
    const known =
        data.reliability.answered -
        (data.reliability.counts.find((o) => o.value === "unknown")?.count ||
          0),
      positive = data.reliability.counts
        .filter((o) => ["always", "usually"].includes(o.value))
        .reduce((sum, o) => sum + o.count, 0);
    reliability.append(
      node("span", "caption", "Runs mostly succeed"),
      node(
        "strong",
        "",
        known ? Math.round((positive * 100) / known) + "%" : "—",
      ),
      node("p", "caption", `${known} users with enough run experience`),
    );
    insights.append(problem, reliability);
    experience.append(insights);
    const priority = panel(
      "What should come first?",
      "Reliability vs. new features · answered responses.",
    );
    priority.append(bars(data.priority, { compact: true }));
    const features = panel(
      "Ideas people care about",
      "Multiple choice · percentages can exceed 100% in total.",
    );
    features.append(
      bars(data.features, { compact: true, limit: 6, nonzero: true }),
      button("Explore every feature →", "quiet", () => {
        question = "features";
        load("questions");
      }),
    );
    const activity = panel(
      "Recent response activity",
      "Most recent activity per response · past 14 days, UTC.",
    );
    const chart = node("div", "activity"),
      max = Math.max(1, ...data.activity.map((d) => d.responses));
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() - i);
      const key = day.toISOString().slice(0, 10),
        row = data.activity.find((d) => d.day === key),
        col = node("div"),
        bar = node("i");
      bar.style.height = ((row?.responses || 0) / max) * 70 + "px";
      col.title = `${key}: ${row?.responses || 0} responses`;
      col.setAttribute("aria-label", col.title);
      col.append(bar, node("span", "", day.getUTCDate()));
      chart.append(col);
    }
    activity.append(
      chart,
      node(
        "p",
        "caption",
        "Counts the response’s latest save or submission, rather than every autosave.",
      ),
      button("Open anonymous responses →", "quiet", () => load("responses")),
    );
    grid.append(experience, priority, features, activity);
    root.append(grid);
    return root;
  }
  function questionToolbar() {
    const tools = node("div", "question-toolbar"),
      e = node("select");
    for (const section of new Set(meta.questions.map((q) => q.section))) {
      const group = document.createElement("optgroup");
      group.label = section;
      for (const q of meta.questions.filter((q) => q.section === section))
        group.append(new Option(q.title, q.id));
      e.append(group);
    }
    e.value = question;
    e.addEventListener("change", () => {
      question = e.value;
      load("questions");
    });
    tools.append(
      field("Explore a question", e),
      node("p", "caption", "Branch links preserve your segment."),
    );
    return tools;
  }
  function questionView(data) {
    const root = node("div");
    root.append(questionToolbar());
    const card = node("section", "panel"),
      heading = node("div", "question-heading");
    heading.append(
      node(
        "span",
        "type-tag",
        data.question.type +
          (data.question.when ? " · conditional follow-up" : ""),
      ),
      node("h2", "", data.question.title),
      node(
        "p",
        "caption",
        data.question.type === "ranking"
          ? "Position among each respondent’s selected shortlist; items are not equally eligible."
          : "Percentages use respondents who answered this question. Unseen branches have no answer.",
      ),
    );
    card.append(heading);
    const layout = node("div", "question-layout"),
      summary = node("aside", "question-summary");
    for (const [value, label] of [
      [data.answered, "Answered"],
      [data.skipped, "Explicitly skipped"],
      [data.responses, "Responses in segment"],
    ]) {
      const e = node("div");
      e.append(node("strong", "", value), node("span", "", label));
      summary.append(e);
    }
    summary.append(
      node(
        "p",
        "",
        data.question.type === "multiple"
          ? "A response can select several options. Percentages do not sum to 100%."
          : "Unanswered questions include unseen branches, future questions and unanswered current questions.",
      ),
    );
    if (["short", "long"].includes(data.question.type))
      layout.append(
        empty(
          "The useful part is in their words.",
          "Read, search and inspect these answers in written feedback.",
        ),
        summary,
      );
    else
      layout.append(
        data.answered
          ? bars(data, { follow: true })
          : empty(
              "No answers here yet.",
              "This question may be outside the selected respondents’ paths.",
            ),
        summary,
      );
    card.append(layout);
    if (["short", "long"].includes(data.question.type))
      card.append(
        button("Read written answers →", "primary", () => {
          feedbackQuestion = question;
          load("feedback");
        }),
      );
    root.append(card);
    return root;
  }
  function responsesView(data) {
    const root = node("div");
    root.append(
      node(
        "p",
        "caption",
        "Anonymous responses, ordered by latest activity. Open one to follow its actual adaptive path.",
      ),
    );
    if (!data.rows.length) {
      root.append(empty("No responses to open.", "Try a broader segment."));
      return root;
    }
    const wrap = node("div", "table-wrap"),
      table = node("table"),
      head = node("thead"),
      row = node("tr");
    for (const label of ["Response", "State", "Submitted", "Last activity"])
      row.append(node("th", "", label));
    head.append(row);
    table.append(head);
    const body = node("tbody");
    for (const r of data.rows) {
      const tr = node("tr"),
        id = node("td"),
        state = node("td");
      id.append(
        button("Response #" + r.response_number, "response-link", () =>
          openResponse(r.id),
        ),
      );
      state.append(
        node(
          "span",
          "state-pill" + (r.completed_at ? "" : " partial"),
          r.completed_at ? "Completed" : "In progress",
        ),
      );
      tr.append(
        id,
        state,
        node("td", "", date(r.completed_at)),
        node("td", "", date(r.updated_at)),
      );
      body.append(tr);
    }
    table.append(body);
    wrap.append(table);
    root.append(wrap);
    pagination(root, data);
    return root;
  }
  function pagination(root, data) {
    const row = node("div", "filter-actions");
    if (page > 0)
      row.append(
        button("← Previous", "quiet", () => {
          page--;
          load(view, true);
        }),
      );
    if (data.hasMore)
      row.append(
        button("Next 25 →", "primary", () => {
          page++;
          load(view, true);
        }),
      );
    if (row.childNodes.length) root.append(row);
  }
  function feedbackTools() {
    const form = node("form", "feedback-toolbar"),
      choice = select(
        meta.questions
          .filter((q) => ["short", "long"].includes(q.type))
          .map((q) => ({ value: q.id, label: q.title })),
        feedbackQuestion,
        "Every written question",
      ),
      input = node("input");
    input.type = "search";
    input.placeholder = "Search the actual words…";
    input.value = search;
    input.maxLength = 200;
    choice.addEventListener("change", () => {
      feedbackQuestion = choice.value;
      load("feedback");
    });
    const searchLabel = field("Search written answers", input);
    searchLabel.classList.add("search-field");
    form.append(
      field("Question", choice),
      searchLabel,
      node("button", "primary", "Search →"),
    );
    form.lastChild.type = "submit";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      search = input.value.trim();
      load("feedback");
    });
    return form;
  }
  function feedbackView(data) {
    const root = node("div");
    root.append(feedbackTools());
    if (!data.rows.length) {
      root.append(
        empty(
          "No words match this search.",
          "Try another phrase, question or segment. Search treats punctuation literally.",
        ),
      );
      return root;
    }
    const list = node("div", "feedback-list");
    for (const r of data.rows) {
      const card = node("article", "feedback-card"),
        text = node("p", "feedback-text", r.text),
        bottom = node("div", "feedback-bottom");
      card.append(node("h3", "", qById(r.question_id).title), text);
      bottom.append(
        button("Response #" + r.response_number + " ↗", "response-link", () =>
          openResponse(r.id),
        ),
        button("Expand", "quiet", (e) => {
          text.classList.toggle("expanded");
          e.currentTarget.textContent = text.classList.contains("expanded")
            ? "Collapse"
            : "Expand";
        }),
      );
      card.append(bottom);
      list.append(card);
    }
    root.append(list);
    pagination(root, data);
    return root;
  }
  async function openResponse(id) {
    previousView = view;
    await load("response", false, id);
  }
  function responseView(data) {
    const root = node("div"),
      heading = node("div", "response-heading"),
      copy = node("div");
    copy.append(
      node("p", "eyebrow", "AN ANONYMOUS PATH"),
      node("h2", "", "Response #" + data.response_number),
      node(
        "p",
        "response-meta",
        `Started ${date(data.created_at)}\n${data.completed_at ? "Submitted " + date(data.completed_at) : "In progress · last active " + date(data.updated_at)}\n${data.path.length} questions on this path. Active completion time was not collected.`,
      ),
    );
    heading.append(
      copy,
      button("← Back to results", "quiet", () => load(previousView)),
    );
    root.append(heading);
    const path = node("div", "response-path");
    for (const [i, q] of data.path.entries()) {
      const item = node("article", "path-item"),
        tag = node(
          "div",
          "type-tag",
          String(i + 1).padStart(2, "0") + " / " + q.section,
        );
      if (q.conditional) tag.append(node("span", "conditional", "FOLLOW-UP"));
      item.append(tag, node("h3", "", q.title));
      let answer = q.skipped
        ? "Skipped (optional)"
        : q.answer === null
          ? "Not answered yet"
          : Array.isArray(q.answer)
            ? q.answer
                .map(
                  (v, i) =>
                    (q.type === "ranking" ? i + 1 + ". " : "") +
                    (q.options.find((o) => o.value === v)?.label || v),
                )
                .join("\n")
            : q.options.find((o) => o.value === q.answer)?.label ||
              String(q.answer);
      item.append(node("p", "", answer));
      path.append(item);
    }
    root.append(path);
    return root;
  }
  async function load(nextView = view, keepPage = false, id) {
    view = nextView;
    if (!keepPage) page = 0;
    const generation = ++requestId;
    controller?.abort();
    controller = new AbortController();
    document.querySelectorAll(".tabs button").forEach((b) => {
      if (b.dataset.view === view) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    error.hidden = true;
    content.setAttribute("aria-busy", "true");
    status.textContent = "Updating this segment…";
    loading();
    try {
      if (meta.version !== (filters.version || meta.currentVersion)) {
        const nextMeta = await api("/questions");
        if (generation !== requestId) return;
        meta = nextMeta;
        document.querySelector("#survey-version").textContent = meta.version;
        setupFilters();
      }
      let data, result;
      if (view === "overview") {
        const [data, sat] = await Promise.all([
          api(""),
          api("/question", { question: "satisfaction" }),
        ]);
        if (generation !== requestId) return;
        result = overview(data, sat);
        status.textContent = `${data.total} responses · ${data.completed} completed · ${meta.version}`;
      } else if (view === "questions") {
        data = await api("/question", { question });
        if (generation !== requestId) return;
        result = questionView(data);
        status.textContent = `${data.answered} answers to this question · ${data.responses} responses in segment`;
      } else if (view === "responses") {
        data = await api("/responses", { page });
        if (generation !== requestId) return;
        result = responsesView(data);
        status.textContent = `Page ${page + 1} · anonymous responses`;
      } else if (view === "feedback") {
        data = await api("/feedback", {
          page,
          ...(feedbackQuestion ? { question: feedbackQuestion } : {}),
          ...(search ? { search } : {}),
        });
        if (generation !== requestId) return;
        result = feedbackView(data);
        status.textContent = `Page ${page + 1} · ${data.rows.length} written answers shown`;
      } else {
        data = await api("/response", { id });
        if (generation !== requestId) return;
        result = responseView(data);
        status.textContent = "Private response path · identity not collected";
      }
      if (generation !== requestId) return;
      content.replaceChildren(result);
    } catch (e) {
      if (e.name === "AbortError" || generation !== requestId) return;
      content.replaceChildren(
        empty(
          e.status === 401
            ? "Staff access is no longer active."
            : "Feedback could not load.",
          e.status === 401
            ? "Your session may have expired or been revoked. Ask the team operator for a fresh invite."
            : "Your segment is preserved. Check your connection and refresh to try again.",
        ),
      );
      error.textContent = e.message;
      error.hidden = false;
      status.textContent = "No results loaded.";
    } finally {
      if (generation === requestId) content.setAttribute("aria-busy", "false");
    }
  }
  document
    .querySelectorAll(".tabs button")
    .forEach((b) => b.addEventListener("click", () => load(b.dataset.view)));
  document.querySelector("#refresh").addEventListener("click", () => {
    if (view === "response") load(previousView);
    else load(view, true);
  });
  document.querySelector("#toggle-filters").addEventListener("click", (e) => {
    const form = document.querySelector("#filters");
    form.hidden = !form.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!form.hidden));
  });
  document.querySelector("#filters").addEventListener("submit", (e) => {
    e.preventDefault();
    const previousVersion = filters.version;
    const branch = filters.branchQuestion
      ? {
          branchQuestion: filters.branchQuestion,
          branchValue: filters.branchValue,
        }
      : {};
    filters = branch;
    for (const [key, value] of new FormData(e.currentTarget))
      if (value && key !== "features") filters[key] = value;
    const interests = new FormData(e.currentTarget)
      .getAll("features")
      .filter(Boolean);
    if (interests.length) filters.features = interests.join(",");
    if (previousVersion !== filters.version)
      filters = filters.version ? { version: filters.version } : {};
    document.querySelector("#filters").hidden = true;
    document
      .querySelector("#toggle-filters")
      .setAttribute("aria-expanded", "false");
    segmentLabel();
    load(view === "response" ? previousView : view);
  });
  document.querySelector("#reset-filters").addEventListener("click", () => {
    filters = {};
    document.querySelector("#filters").reset();
    document.querySelector("#filters").hidden = true;
    document
      .querySelector("#toggle-filters")
      .setAttribute("aria-expanded", "false");
    segmentLabel();
    load(view === "response" ? previousView : view);
  });
  document.querySelector("#signout").addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    try {
      controller?.abort();
      const r = await fetch("/api/poll-team/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "x-poll-team-request": "1" },
      });
      if (!r.ok) throw new Error("Could not sign out. Please retry.");
      content.replaceChildren();
      meta = null;
      location.assign("/poll/team");
    } catch (caught) {
      error.textContent = caught.message;
      error.hidden = false;
      e.currentTarget.disabled = false;
    }
  });
  (async () => {
    try {
      meta = await api("/questions");
      document.querySelector("#survey-version").textContent = meta.version;
      setupFilters();
      await load();
    } catch (e) {
      content.replaceChildren(
        empty("Staff feedback is unavailable.", e.message),
      );
      content.setAttribute("aria-busy", "false");
      status.textContent = "Connection failed.";
    }
  })();
})();
