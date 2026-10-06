import { sql } from "./db.mjs";
import { questions, surveyVersion } from "./poll-definition.mjs";
import { calculate } from "./poll-engine.mjs";
import { validId } from "./poll-staff.mjs";
const fail = () => {
  throw Object.assign(new Error("Invalid dashboard filters."), { status: 400 });
};
const byId = new Map(questions.map((q) => [q.id, q]));
export const filterQuestions = [
  "frequency",
  "experience",
  "lab_use",
  "success",
  "focus",
  "discord",
  "features",
];
const segmentKeys = [
  ...filterQuestions,
  "status",
  "satisfactionMin",
  "satisfactionMax",
  "from",
  "to",
  "branchQuestion",
  "branchValue",
];
export function parseFilters(
  params,
  extras = ["page", "question", "search", "id"],
) {
  const f = {};
  for (const [key, value] of params) {
    if (
      ![...segmentKeys, ...extras].includes(key) ||
      Object.hasOwn(f, key) ||
      value.length > 200
    )
      fail();
    f[key] = value;
  }
  f.status ||= "all";
  if (!["all", "completed", "partial"].includes(f.status)) fail();
  for (const key of filterQuestions)
    if (f[key] !== undefined) {
      const allowed = byId.get(key).options.map((o) => o.value);
      const values = key === "features" ? f[key].split(",") : [f[key]];
      if (
        !values.length ||
        values.length > 4 ||
        new Set(values).size !== values.length ||
        values.some((v) => !allowed.includes(v))
      )
        fail();
    }
  for (const key of ["satisfactionMin", "satisfactionMax"])
    if (f[key] !== undefined) {
      if (!/^[1-5]$/.test(f[key])) fail();
      f[key] = Number(f[key]);
    }
  if (
    f.satisfactionMin &&
    f.satisfactionMax &&
    f.satisfactionMin > f.satisfactionMax
  )
    fail();
  for (const key of ["from", "to"])
    if (f[key] !== undefined) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(f[key]) ||
        !Number.isFinite(Date.parse(f[key] + "T00:00:00Z")) ||
        new Date(f[key] + "T00:00:00Z").toISOString().slice(0, 10) !== f[key]
      )
        fail();
    }
  if (f.from && f.to && f.from > f.to) fail();
  if (Boolean(f.branchQuestion) !== Boolean(f.branchValue)) fail();
  if (f.branchQuestion) {
    const q = byId.get(f.branchQuestion);
    const values =
      q?.type === "rating"
        ? ["1", "2", "3", "4", "5"]
        : q?.options?.map((o) => o.value);
    if (
      !q ||
      !["single", "multiple", "rating"].includes(q.type) ||
      !values?.includes(f.branchValue)
    )
      fail();
  }
  if (f.question !== undefined && !byId.has(f.question)) fail();
  if (f.id !== undefined && !validId(f.id)) fail();
  if (f.page !== undefined) {
    if (!/^(0|[1-9]\d{0,3})$/.test(f.page)) fail();
    f.page = Number(f.page);
  }
  if (f.search !== undefined) f.search = f.search.trim();
  return f;
}
function segment(f) {
  const params = [surveyVersion],
    clauses = ["r.survey_version=$1"];
  const bind = (v) => {
    params.push(v);
    return "$" + params.length;
  };
  function answer(id, value, multiple = false) {
    clauses.push(
      `exists(select 1 from poll_answers a where a.response_id=r.id and a.question_id=${bind(id)} and ${multiple ? "a.value ? " + bind(value) : "a.value #>> '{}' = " + bind(String(value))})`,
    );
  }
  if (f.status === "completed") clauses.push("r.completed_at is not null");
  if (f.status === "partial") clauses.push("r.completed_at is null");
  for (const key of filterQuestions)
    if (f[key] !== undefined)
      for (const value of key === "features" ? f[key].split(",") : [f[key]])
        answer(key, value, ["features", "discord"].includes(key));
  if (f.satisfactionMin || f.satisfactionMax) {
    const min = bind(f.satisfactionMin || 1),
      max = bind(f.satisfactionMax || 5);
    clauses.push(
      `exists(select 1 from poll_answers a where a.response_id=r.id and a.question_id='satisfaction' and (a.value #>> '{}')::numeric between ${min} and ${max})`,
    );
  }
  if (f.from)
    clauses.push(`r.completed_at>=${bind(f.from + "T00:00:00Z")}::timestamptz`);
  if (f.to)
    clauses.push(
      `r.completed_at<(${bind(f.to)}::date+1)::timestamp at time zone 'UTC'`,
    );
  if (f.branchQuestion)
    answer(
      f.branchQuestion,
      f.branchValue,
      byId.get(f.branchQuestion).type === "multiple",
    );
  return {
    text: `with segment as materialized(select r.id,r.response_number,r.created_at,r.updated_at,r.completed_at,r.current_question from poll_responses r where ${clauses.join(" and ")})`,
    params,
    bind,
  };
}
export function metadata() {
  return {
    version: surveyVersion,
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      section: q.section,
      type: q.type,
      options:
        q.options ||
        (q.optionsFrom
          ? byId.get(q.optionsFrom).options
          : q.type === "rating"
            ? [1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: String(value),
              }))
            : []),
      when: q.when || null,
    })),
    filters: filterQuestions.map((id) => ({
      id,
      title: byId.get(id).title,
      options: byId.get(id).options,
    })),
  };
}
export function createAnalytics(pool = sql) {
  async function run(f, suffix, add = []) {
    const s = segment(f);
    return (
      await pool().query(
        s.text +
          " " +
          suffix.replace(
            /\$(\d+)/g,
            (_, n) => "$" + (Number(n) + s.params.length),
          ),
        [...s.params, ...add],
      )
    ).rows;
  }
  // Extra query parameters start at $1; shift them after the segment's bindings.
  async function distribution(f, id) {
    const q = byId.get(id);
    if (!q) fail();
    const total = (
      await run(f, `select count(*)::int as responses from segment`)
    )[0].responses;
    const summary = (
      await run(
        f,
        `select count(*) filter(where a.value<>'null'::jsonb)::int as answered,count(*) filter(where a.value='null'::jsonb)::int as skipped from poll_answers a join segment s on s.id=a.response_id where a.question_id=$1`,
        [id],
      )
    )[0];
    let rows;
    if (q.type === "multiple" || q.type === "ranking")
      rows = await run(
        f,
        `select v.value,count(*)::int as count${q.type === "ranking" ? ",round(avg(v.position)::numeric,2)::float8 as average_rank,count(*) filter(where v.position=1)::int as first" : ""} from poll_answers a join segment s on s.id=a.response_id cross join lateral jsonb_array_elements_text(case when jsonb_typeof(a.value)='array' then a.value else '[]'::jsonb end) with ordinality v(value,position) where a.question_id=$1 group by v.value order by count(*) desc,v.value`,
        [id],
      );
    else if (["short", "long"].includes(q.type)) rows = [];
    else
      rows = await run(
        f,
        `select a.value #>> '{}' as value,count(*)::int as count from poll_answers a join segment s on s.id=a.response_id where a.question_id=$1 and a.value<>'null'::jsonb group by a.value order by count(*) desc`,
        [id],
      );
    const options =
      q.options ||
      (q.optionsFrom
        ? byId.get(q.optionsFrom).options
        : q.type === "rating"
          ? [1, 2, 3, 4, 5].map((value) => ({
              value: String(value),
              label: String(value),
            }))
          : []);
    const counts = options.map((o) => {
      const r = rows.find((r) => r.value === String(o.value));
      return {
        value: String(o.value),
        label: o.label,
        count: r?.count || 0,
        percentage: summary.answered
          ? Math.round(((r?.count || 0) * 1000) / summary.answered) / 10
          : 0,
        ...(q.type === "ranking"
          ? { averageRank: r?.average_rank ?? null, first: r?.first || 0 }
          : {}),
        followups: questions
          .filter(
            (n) =>
              n.when?.question === id &&
              (n.when.values?.includes(o.value) ||
                n.when.values?.includes(Number(o.value)) ||
                (n.when.minSelections && !n.when.exclude?.includes(o.value)) ||
                (n.when.notIncludes && n.when.notIncludes !== o.value)),
          )
          .map((n) => ({ id: n.id, title: n.title })),
      };
    });
    return {
      question: {
        id: q.id,
        title: q.title,
        type: q.type,
        when: q.when || null,
      },
      responses: total,
      ...summary,
      counts,
    };
  }
  return {
    async overview(f) {
      const summary = (
        await run(
          f,
          `select count(*)::int as total,count(*) filter(where completed_at is not null)::int as completed from segment`,
        )
      )[0];
      const satisfaction = (
        await run(
          f,
          `select count(*)::int as answered,round(avg((a.value #>> '{}')::numeric),2)::float8 as average from poll_answers a join segment s on s.id=a.response_id where a.question_id='satisfaction' and a.value<>'null'::jsonb`,
        )
      )[0];
      const activity = await run(
        f,
        `select date_trunc('day',updated_at at time zone 'UTC')::date::text as day,count(*)::int as responses,count(*) filter(where completed_at is not null)::int as completed from segment where updated_at>=now()-interval '14 days' group by 1 order by 1`,
      );
      const [problem, reliability, priority, features] = await Promise.all(
        ["problem", "success", "focus", "features"].map((id) =>
          distribution(f, id),
        ),
      );
      return {
        ...summary,
        completionRate: summary.total
          ? Math.round((summary.completed * 1000) / summary.total) / 10
          : 0,
        satisfaction,
        activity,
        problem,
        reliability,
        priority,
        features,
      };
    },
    question: distribution,
    async responses(f) {
      const rows = await run(
        f,
        `select id,response_number,created_at,updated_at,completed_at from segment order by updated_at desc,id limit 26 offset $1`,
        [(f.page || 0) * 25],
      );
      return {
        rows: rows.slice(0, 25),
        hasMore: rows.length > 25,
        page: f.page || 0,
      };
    },
    async response(f, id) {
      if (!validId(id)) fail();
      const row = (
        await run(
          f,
          "select id,response_number,created_at,updated_at,completed_at,current_question from segment where id=$1",
          [id],
        )
      )[0];
      if (!row) return null;
      const { rows } = await pool().query(
        "select question_id,value from poll_answers where response_id=$1",
        [id],
      );
      const answers = Object.fromEntries(
        rows.map((a) => [a.question_id, a.value]),
      );
      const path = calculate(answers)
        .path.filter(
          (q) => Object.hasOwn(answers, q.id) || q.id === row.current_question,
        )
        .map((q) => ({
          id: q.id,
          title: q.title,
          section: q.section,
          type: q.type,
          options: q.options || [],
          answer: Object.hasOwn(answers, q.id) ? answers[q.id] : null,
          skipped: Object.hasOwn(answers, q.id) && answers[q.id] === null,
          conditional: Boolean(byId.get(q.id).when),
        }));
      return {
        ...row,
        path,
        timing:
          "Active completion time is browser-local and is not collected by the server.",
      };
    },
    async feedback(f) {
      const q = f.question ? byId.get(f.question) : null;
      if (q && !["short", "long"].includes(q.type)) fail();
      const ids = q
        ? [q.id]
        : questions
            .filter((q) => ["short", "long"].includes(q.type))
            .map((q) => q.id);
      const rows = await run(
        f,
        `select s.id,s.response_number,s.completed_at,a.question_id,a.value #>> '{}' as text,a.updated_at from poll_answers a join segment s on s.id=a.response_id where a.question_id=any($1::text[]) and jsonb_typeof(a.value)='string' and length(a.value #>> '{}')>0 and position(lower($2) in lower(a.value #>> '{}'))>0 order by a.updated_at desc,s.id,a.question_id limit 26 offset $3`,
        [ids, f.search || "", (f.page || 0) * 25],
      );
      return {
        rows: rows.slice(0, 25),
        hasMore: rows.length > 25,
        page: f.page || 0,
      };
    },
  };
}
