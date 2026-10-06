import { randomUUID } from "node:crypto";
import { sql } from "./db.mjs";
import { surveyVersion } from "./poll-definition.mjs";
import { transition } from "./poll-engine.mjs";
const conflict = () =>
  Object.assign(
    new Error("Your survey changed in another tab. Reload to continue."),
    { status: 409 },
  );

export function createPollStore(pool = sql) {
  async function load(client, hash, lock = false) {
    const { rows } = await client.query(
      `select * from poll_responses where session_hash = $1${lock ? " for update" : ""}`,
      [hash],
    );
    if (!rows[0]) return null;
    const row = rows[0];
    if (row.survey_version !== surveyVersion)
      throw Object.assign(
        new Error("This survey version is no longer available."),
        { status: 409 },
      );
    const answers = await client.query(
      "select question_id, value from poll_answers where response_id = $1",
      [row.id],
    );
    return {
      ...row,
      current: row.current_question,
      answers: Object.fromEntries(
        answers.rows.map((a) => [a.question_id, a.value]),
      ),
    };
  }
  async function locked(hash, operation) {
    const client = await pool().connect();
    try {
      await client.query("begin");
      const row = await load(client, hash, true);
      const result = row ? await operation(client, row) : null;
      await client.query("commit");
      return result;
    } catch (caught) {
      try {
        await client.query("rollback");
      } catch {}
      throw caught;
    } finally {
      client.release();
    }
  }
  return {
    async start(hash) {
      const { rows } = await pool().query(
        "insert into poll_responses (id, session_hash, survey_version, current_question) values ($1,$2,$3,$4) returning *",
        [randomUUID(), hash, surveyVersion, "frequency"],
      );
      return { ...rows[0], current: "frequency", answers: {} };
    },
    async read(hash) {
      return locked(hash, async (client, row) => row);
    },
    async update(hash, revision, input) {
      return locked(hash, async (client, row) => {
        if (row.completed_at && input.action === "submit") return row;
        if (row.revision !== revision) throw conflict();
        const next = transition(row, input);
        const entries = Object.entries(next.answers).map(
          ([question_id, value]) => ({ question_id, value }),
        );
        await client.query(
          "delete from poll_answers where response_id = $1 and not (question_id = any($2::text[]))",
          [row.id, entries.map((a) => a.question_id)],
        );
        await client.query(
          `insert into poll_answers (response_id,question_id,value)
          select $1, question_id, coalesce(value, 'null'::jsonb) from jsonb_to_recordset($2::jsonb) as a(question_id text,value jsonb)
          on conflict (response_id,question_id) do update set value = excluded.value,
            updated_at = case when poll_answers.value is distinct from excluded.value then now() else poll_answers.updated_at end`,
          [row.id, JSON.stringify(entries)],
        );
        const { rows } = await client.query(
          "update poll_responses set current_question = $2, revision = revision + 1, updated_at = now(), completed_at = case when $3 then now() else completed_at end where id = $1 returning *",
          [row.id, next.current, Boolean(next.complete)],
        );
        return {
          ...rows[0],
          current: rows[0].current_question,
          answers: next.answers,
        };
      });
    },
  };
}
