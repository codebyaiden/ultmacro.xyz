import { questions, durations, surveyVersion } from "./poll-definition.mjs";
const own = (object, key) => Object.hasOwn(object, key);
export const invalid = (message) =>
  Object.assign(new Error(message), { status: 400 });
function visible(q, answers) {
  if (!q.when) return true;
  const rule = q.when,
    value = answers[rule.question];
  if (rule.values) return rule.values.includes(value);
  if (rule.minSelections)
    return (
      Array.isArray(value) &&
      value.filter((v) => !rule.exclude?.includes(v)).length >=
        rule.minSelections
    );
  if (rule.answered)
    return (
      own(answers, rule.question) &&
      Array.isArray(value) &&
      !value.includes(rule.notIncludes)
    );
  return false;
}
function resolve(q, answers) {
  const { when, optionsFrom, ...publicQuestion } = q;
  if (optionsFrom) {
    const source = questions.find((item) => item.id === optionsFrom);
    publicQuestion.options = source.options.filter((o) =>
      answers[optionsFrom]?.includes(o.value),
    );
  }
  if (q.id === "clutter" && answers.navigation <= 2)
    publicQuestion.title = "What makes navigating Ultimate Macro difficult?";
  return { ...publicQuestion, seconds: q.seconds || durations[q.type] };
}
export function validateAnswer(q, value) {
  if (value === null && q.optional) return null;
  if (q.type === "short" || q.type === "long") {
    if (
      typeof value !== "string" ||
      value.length > q.maxLength ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ||
      (!q.optional && !value.trim())
    )
      throw invalid("Enter a valid text answer.");
    return value.trim();
  }
  if (q.type === "rating") {
    if (!Number.isInteger(value) || value < 1 || value > 5)
      throw invalid("Choose a rating from 1 to 5.");
    return value;
  }
  const allowed = q.options?.map((o) => o.value) || [];
  if (q.type === "single") {
    if (typeof value !== "string" || !allowed.includes(value))
      throw invalid("Choose a valid answer.");
    return value;
  }
  if (q.type === "multiple" || q.type === "ranking") {
    if (
      !Array.isArray(value) ||
      !value.length ||
      value.length > allowed.length ||
      value.some((v) => typeof v !== "string" || !allowed.includes(v)) ||
      new Set(value).size !== value.length
    )
      throw invalid("Choose valid answers.");
    if (q.type === "ranking" && value.length !== allowed.length)
      throw invalid("Rank every selected answer.");
    if (q.maxChoices && value.length > q.maxChoices)
      throw invalid(`Choose at most ${q.maxChoices} answers.`);
    if (q.exclusive?.some((v) => value.includes(v)) && value.length > 1)
      throw invalid("That answer cannot be combined with other choices.");
    return [...value];
  }
  throw invalid("Unsupported question type.");
}
export function pruneAnswers(answers) {
  const clean = {};
  for (const q of questions) {
    if (!visible(q, clean) || !own(answers, q.id)) continue;
    try {
      clean[q.id] = validateAnswer(resolve(q, clean), answers[q.id]);
    } catch {
      /* Dependent options may have changed. */
    }
  }
  return clean;
}
export function calculate(answers = {}) {
  const clean = pruneAnswers(answers);
  const path = questions
    .filter((q) => visible(q, clean))
    .map((q) => resolve(q, clean));
  // Reserve likely follow-ups while their controlling answers are still unknown.
  const estimated = {
    lab_use: "often",
    satisfaction: 3,
    success: "usually",
    focus: "both",
    features: ["goals", "themes"],
    cloud_use: "regular",
    discord: ["support"],
    ...clean,
  };
  const projected = questions.filter((q) => visible(q, estimated));
  const totalSeconds = projected.reduce(
    (n, q) => n + (q.seconds || durations[q.type]),
    0,
  );
  const remainingSeconds = projected.reduce(
    (n, q) => n + (own(clean, q.id) ? 0 : q.seconds || durations[q.type]),
    0,
  );
  return {
    path,
    answers: clean,
    remainingSeconds,
    progress: (totalSeconds - remainingSeconds) / totalSeconds,
    firstUnanswered: path.find((q) => !own(clean, q.id))?.id || null,
  };
}
export function transition(response, input) {
  if (response.completed_at)
    throw Object.assign(new Error("This survey has already been submitted."), {
      status: 409,
    });
  let { answers, path, firstUnanswered } = calculate(response.answers);
  let current = path.some((q) => q.id === response.current)
    ? response.current
    : firstUnanswered;
  const index = path.findIndex((q) => q.id === current);
  if (input.action === "answer") {
    const q = path[index];
    if (!q || input.questionId !== q.id)
      throw invalid("Answer the current question.");
    answers[q.id] = validateAnswer(q, input.value);
    answers = pruneAnswers(answers);
    path = calculate(answers).path;
    current = input.advance
      ? path[path.findIndex((item) => item.id === q.id) + 1]?.id || null
      : q.id;
  } else if (input.action === "back") {
    current = current ? path[Math.max(0, index - 1)].id : path.at(-1).id;
  } else if (input.action === "next") {
    if (!current || !own(answers, current))
      throw invalid("Answer this question before continuing.");
    current = path[index + 1]?.id || null;
  } else if (input.action === "submit") {
    if (firstUnanswered)
      throw invalid("Please finish the remaining questions.");
    return { ...response, answers, current: null, complete: true };
  } else throw invalid("Unknown poll action.");
  return { ...response, answers, current };
}
export function publicState(response) {
  const state = calculate(response.answers);
  return {
    version: surveyVersion,
    revision: response.revision,
    completed: Boolean(response.completed_at),
    current: response.current,
    answers: response.completed_at ? {} : state.answers,
    path: response.completed_at ? [] : state.path,
    progress: response.completed_at ? 1 : state.progress,
    remainingSeconds: response.completed_at ? 0 : state.remainingSeconds,
    elapsedSeconds: Math.max(
      0,
      Math.round(
        (new Date(response.completed_at || Date.now()) -
          new Date(response.created_at)) /
          1000,
      ),
    ),
  };
}
