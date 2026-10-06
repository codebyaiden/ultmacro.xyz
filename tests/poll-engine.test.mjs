import test from "node:test";
import assert from "node:assert/strict";
import { questions } from "../api/_lib/poll-definition.mjs";
import {
  calculate,
  validateAnswer,
  pruneAnswers,
  transition,
  publicState,
} from "../api/_lib/poll-engine.mjs";
const ids = (a) => calculate(a).path.map((q) => q.id);

test("definition has unique IDs and supports all Phase 1 input types", () => {
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  for (const type of [
    "single",
    "multiple",
    "rating",
    "short",
    "long",
    "ranking",
  ])
    assert.ok(questions.some((q) => q.type === type));
});
test("satisfaction produces exactly the relevant follow-up", () => {
  for (const [value, follow] of [
    [1, "satisfaction_low"],
    [2, "satisfaction_low"],
    [3, "satisfaction_middle"],
    [4, "satisfaction_high"],
    [5, "satisfaction_high"],
  ]) {
    const path = ids({ satisfaction: value });
    assert.deepEqual(
      path.filter((id) => id.startsWith("satisfaction_")),
      [follow],
    );
  }
});
test("product focus produces one or multiple conditional follow-ups", () => {
  assert.ok(ids({ focus: "reliability" }).includes("reliability_priority"));
  assert.ok(ids({ focus: "features" }).includes("missing_features"));
  assert.ok(ids({ focus: "both" }).includes("both_reason"));
  assert.ok(ids({ focus: "both" }).includes("tie_breaker"));
  assert.ok(!ids({ focus: "features" }).includes("both_reason"));
});
test("Strategy Lab never skips details, stopped asks why, frequent gets details", () => {
  assert.ok(
    !ids({ lab_use: "never" }).some(
      (id) => id.startsWith("lab_") && id !== "lab_use",
    ),
  );
  assert.deepEqual(
    ids({ lab_use: "stopped" }).filter((id) => id.startsWith("lab_")),
    ["lab_use", "lab_stopped"],
  );
  assert.ok(ids({ lab_use: "often" }).includes("lab_ease"));
  assert.ok(ids({ lab_use: "often" }).includes("lab_improve"));
});
test("path and ETA shrink when Strategy Lab details become irrelevant", () => {
  assert.ok(
    calculate({ lab_use: "often" }).remainingSeconds >
      calculate({ lab_use: "never" }).remainingSeconds,
  );
});
test("earlier answer edits remove stale follow-ups and dependent ranking", () => {
  const clean = pruneAnswers({
    satisfaction: 5,
    satisfaction_low: "bad",
    satisfaction_high: "keep",
    lab_use: "never",
    lab_ease: 2,
    features: ["goals"],
    feature_rank: ["themes"],
  });
  assert.equal(clean.satisfaction_low, undefined);
  assert.equal(clean.lab_ease, undefined);
  assert.equal(clean.feature_rank, undefined);
  assert.equal(clean.satisfaction_high, "keep");
});
test("ranking uses only selected features and neutral wording", () => {
  const q = calculate({ features: ["goals", "themes"] }).path.find(
    (q) => q.id === "feature_rank",
  );
  assert.deepEqual(
    q.options.map((o) => o.value),
    ["goals", "themes"],
  );
  assert.deepEqual(validateAnswer(q, ["themes", "goals"]), ["themes", "goals"]);
  assert.throws(() => validateAnswer(q, ["goals", "plugin"]), /answer/i);
  assert.ok(!ids({ features: ["none"] }).includes("feature_rank"));
});
test("validates all answer types without coercing untrusted values", () => {
  for (const q of questions) {
    if (q.type === "rating")
      for (const bad of [0, 6, "3", {}, NaN, ...(q.optional ? [] : [null])])
        assert.throws(() => validateAnswer(q, bad));
    if (q.type === "single")
      for (const bad of ["__invalid", {}, [], ...(q.optional ? [] : [null])])
        assert.throws(() => validateAnswer(q, bad));
  }
  const multi = questions.find((q) => q.id === "features");
  assert.throws(() => validateAnswer(multi, ["goals", "goals"]));
  assert.throws(() => validateAnswer(multi, ["none", "goals"]));
  assert.throws(() => validateAnswer(multi, ["unknown"]));
  const text = questions.find((q) => q.id === "final");
  assert.equal(validateAnswer(text, ""), "");
  assert.throws(() => validateAnswer(text, "x".repeat(2001)));
});
test("navigation, current question validation and full completion are server owned", () => {
  let r = {
    answers: {},
    current: "frequency",
    revision: 0,
    completed_at: null,
  };
  assert.throws(() =>
    transition(r, { action: "answer", questionId: "unknown", value: "x" }),
  );
  assert.throws(() => transition(r, { action: "next" }));
  while (r.current) {
    const q = calculate(r.answers).path.find((q) => q.id === r.current);
    const value =
      q.type === "rating"
        ? 4
        : q.type === "long" || q.type === "short"
          ? "Helpful feedback"
          : q.type === "multiple"
            ? [q.options[0].value]
            : q.type === "ranking"
              ? q.options.map((o) => o.value)
              : q.options[0].value;
    r = transition(r, {
      action: "answer",
      questionId: q.id,
      value,
      advance: true,
    });
  }
  assert.equal(calculate(r.answers).remainingSeconds, 0);
  assert.equal(calculate(r.answers).progress, 1);
  r = transition(r, { action: "back" });
  assert.equal(r.current, "final");
  r = transition(r, { action: "next" });
  assert.equal(transition(r, { action: "submit" }).complete, true);
  assert.throws(() =>
    transition({ answers: {}, current: "frequency" }, { action: "submit" }),
  );
});
test("ETA reserves likely follow-ups until answers rule them out", () => {
  assert.ok(
    calculate({}).remainingSeconds -
      calculate({ lab_use: "never" }).remainingSeconds >
      30,
  );
  assert.ok(
    calculate({}).remainingSeconds >
      calculate({ discord: ["none"] }).remainingSeconds,
  );
  assert.equal(
    calculate({ navigation: 1 }).path.find((q) => q.id === "clutter").title,
    "What makes navigating Ultimate Macro difficult?",
  );
});

test("inexperienced users can skip ratings without retaining satisfaction follow-ups", () => {
  for (const q of questions.filter((q) => q.type === "rating")) {
    assert.equal(validateAnswer(q, null), null);
    assert.ok(q.low && q.high && q.skipLabel);
  }
  const clean = pruneAnswers({
    satisfaction: null,
    satisfaction_low: "old",
    satisfaction_high: "old",
  });
  assert.equal(clean.satisfaction_low, undefined);
  assert.equal(clean.satisfaction_high, undefined);
  assert.ok(!ids(clean).some((id) => id.startsWith("satisfaction_")));
});
test("written follow-ups are optional and unsure feature interest skips ranking", () => {
  for (const id of [
    "satisfaction_low",
    "satisfaction_middle",
    "satisfaction_high",
    "missing_features",
    "final",
  ])
    assert.equal(
      validateAnswer(
        questions.find((q) => q.id === id),
        null,
      ),
      null,
    );
  assert.ok(!ids({ features: ["unsure"] }).includes("feature_rank"));
  assert.throws(() =>
    validateAnswer(
      questions.find((q) => q.id === "features"),
      ["unsure", "goals"],
    ),
  );
  assert.equal(
    pruneAnswers({ features: ["unsure"], feature_rank: ["goals", "themes"] })
      .feature_rank,
    undefined,
  );
});

test("skipping navigation does not imply difficulty", () => {
  assert.equal(
    calculate({ navigation: null }).path.find((q) => q.id === "clutter").title,
    "What feels cluttered or difficult?",
  );
});

test("unknown usage skips irrelevant Lab, Cloud, and reliability details", () => {
  const path = ids({
    lab_use: "unknown",
    cloud_use: "unknown",
    success: "unknown",
    discord: ["none"],
  });
  for (const id of [
    "lab_ease",
    "lab_improve",
    "lab_stopped",
    "cloud_reliability",
    "failure",
    "support",
  ])
    assert.ok(!path.includes(id));
});

test("branch context exposes only the parent question, preserving server-owned rules", () => {
  const path = calculate({
    focus: "features",
    lab_use: "often",
    cloud_use: "regular",
    satisfaction: 5,
    discord: ["support"],
  }).path;
  for (const [id, parent] of [
    ["missing_features", "focus"],
    ["lab_ease", "lab_use"],
    ["cloud_reliability", "cloud_use"],
    ["satisfaction_high", "satisfaction"],
    ["support", "discord"],
  ]) {
    const question = path.find((q) => q.id === id);
    assert.equal(question.branchParent, parent);
    assert.equal(question.when, undefined);
  }
  assert.equal(path.find((q) => q.id === "frequency").branchParent, undefined);
});

test("legacy responses retain their original prompts and option meanings", () => {
  const old = publicState({
    survey_version: "um-feedback-v1",
    answers: {
      focus: "both",
      both_reason: "balance",
      satisfaction: 3,
      satisfaction_middle: "old explanation",
    },
    current: "both_reason",
    revision: 0,
    created_at: new Date(),
  });
  const current = calculate({ focus: "both", satisfaction: 3 });
  assert.equal(old.version, "um-feedback-v1");
  assert.equal(
    old.path.find((q) => q.id === "both_reason").options[0].label,
    "Both matter to my experience",
  );
  assert.equal(
    old.path.find((q) => q.id === "satisfaction_middle").title,
    "What prevents Ultimate Macro from being a 4 out of 5?",
  );
  assert.equal(
    current.path.find((q) => q.id === "both_reason").options[0].label,
    "New features need reliable runs to be useful",
  );
  assert.equal(old.answers.both_reason, "balance");
  const updated = transition(
    {
      survey_version: "um-feedback-v1",
      answers: old.answers,
      current: "both_reason",
      revision: 0,
    },
    {
      action: "answer",
      questionId: "both_reason",
      value: "progress",
      advance: true,
    },
  );
  assert.equal(updated.survey_version, "um-feedback-v1");
  assert.equal(updated.current, "tie_breaker");
  assert.throws(
    () => calculate({}, "unknown-version"),
    (e) => e.status === 409,
  );
});

test("three representative v2 paths cover every question, save/Back, required guards and completion", () => {
  const plans = [
    {
      frequency: "new",
      experience: "new",
      lab_use: "never",
      satisfaction: 1,
      success: "unknown",
      focus: "features",
      cloud_use: "never",
      discord: ["none"],
      communication: null,
      features: ["none"],
    },
    {
      frequency: "daily",
      experience: "experienced",
      lab_use: "stopped",
      satisfaction: 3,
      success: "rarely",
      focus: "reliability",
      cloud_use: "regular",
      discord: ["support"],
      features: ["goals", "plus"],
    },
    {
      frequency: "daily",
      experience: "creator",
      lab_use: "often",
      satisfaction: 5,
      success: "always",
      focus: "both",
      cloud_use: "regular",
      discord: ["updates"],
      features: ["goals", "plus", "themes"],
    },
  ];
  const seen = new Set();
  for (const plan of plans) {
    let row = {
      survey_version: "um-feedback-v2",
      answers: {},
      current: "frequency",
      completed_at: null,
    };
    const answers = {};
    let guard = 0;
    while (row.current) {
      assert.ok(++guard <= questions.length, "path must terminate");
      const q = calculate(row.answers).path.find((q) => q.id === row.current);
      seen.add(q.id);
      assert.throws(
        () => transition(row, { action: "next" }),
        /Answer this question/,
      );
      const value = Object.hasOwn(plan, q.id)
        ? plan[q.id]
        : q.type === "ranking"
          ? q.options.map((o) => o.value).reverse()
          : q.optional
            ? null
            : q.type === "multiple"
              ? [q.options[0].value]
              : q.options[0].value;
      row = transition(row, {
        action: "answer",
        questionId: q.id,
        value,
        advance: true,
      });
      answers[q.id] = value;
      assert.deepEqual(row.answers[q.id], value);
      const next = row.current;
      row = transition(row, { action: "back" });
      assert.equal(row.current, q.id);
      assert.deepEqual(row.answers[q.id], value);
      row = transition(row, { action: "next" });
      assert.equal(row.current, next);
    }
    assert.deepEqual(row.answers, answers);
    assert.equal(transition(row, { action: "submit" }).complete, true);
  }
  assert.deepEqual(
    [...seen].sort(),
    questions.map((q) => q.id).sort(),
    "no orphan/unreachable questions",
  );
  for (const [i, q] of questions.entries()) {
    assert.ok(q.title.trim());
    if (q.options) {
      assert.equal(
        new Set(q.options.map((o) => o.value)).size,
        q.options.length,
      );
      assert.equal(
        new Set(q.options.map((o) => o.label)).size,
        q.options.length,
      );
    }
    if (q.when)
      assert.ok(
        questions.findIndex((parent) => parent.id === q.when.question) < i,
      );
  }
});
test("all five rating scales accept and restore 1–5 and optional skip", () => {
  for (const q of questions.filter((q) => q.type === "rating")) {
    assert.ok(q.low && q.high && q.low !== q.high);
    for (const value of [1, 2, 3, 4, 5, null]) {
      const prerequisites = { lab_use: "often", cloud_use: "regular" };
      const row = { answers: prerequisites, current: q.id };
      const saved = transition(row, {
        action: "answer",
        questionId: q.id,
        value,
      });
      assert.equal(saved.current, q.id);
      assert.equal(saved.answers[q.id], value);
      assert.equal(pruneAnswers(saved.answers)[q.id], value);
    }
  }
});
test("changing each branch driver prunes every now-irrelevant answer", () => {
  const full = {
    lab_use: "often",
    satisfaction: 1,
    success: "rarely",
    focus: "both",
    features: ["goals", "plus"],
    cloud_use: "regular",
    discord: ["support"],
  };
  for (const q of calculate(full).path) {
    if (Object.hasOwn(full, q.id)) continue;
    full[q.id] =
      q.type === "ranking"
        ? q.options.map((o) => o.value)
        : q.optional
          ? null
          : q.type === "multiple"
            ? [q.options[0].value]
            : q.options[0].value;
  }
  for (const driver of [
    "lab_use",
    "satisfaction",
    "success",
    "focus",
    "features",
    "cloud_use",
    "discord",
  ]) {
    const q = questions.find((q) => q.id === driver);
    const values =
      q.type === "rating"
        ? [1, 2, 3, 4, 5, null]
        : q.type === "multiple"
          ? q.options.map((o) => [o.value])
          : q.options.map((o) => o.value);
    for (const value of values) {
      const edited = transition(
        { answers: full, current: driver },
        { action: "answer", questionId: driver, value },
      );
      const path = new Set(calculate(edited.answers).path.map((q) => q.id));
      for (const answered of Object.keys(edited.answers))
        assert.ok(path.has(answered), `${driver}/${value}: stale ${answered}`);
      for (const follow of questions.filter(
        (q) => q.when?.question === driver,
      )) {
        if (!path.has(follow.id))
          assert.ok(!Object.hasOwn(edited.answers, follow.id));
      }
    }
  }
});
