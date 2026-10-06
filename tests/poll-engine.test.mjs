import test from "node:test";
import assert from "node:assert/strict";
import { questions } from "../api/_lib/poll-definition.mjs";
import {
  calculate,
  validateAnswer,
  pruneAnswers,
  transition,
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
      for (const bad of [0, 6, "3", null, {}, NaN])
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
