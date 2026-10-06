import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { createPollStore } from "../api/_lib/poll-store.mjs";
import { calculate } from "../api/_lib/poll-engine.mjs";

const enabled = Boolean(
  process.env.TEST_POLL_DATABASE_URL || process.env.POLL_TEST_PGLITE_MODULE,
);
test(
  "SQL persistence: migrations, resume, revision conflicts, branching cleanup and completion",
  { skip: !enabled },
  async () => {
    let pool, close;
    if (process.env.POLL_TEST_PGLITE_MODULE) {
      const { PGlite } = await import(process.env.POLL_TEST_PGLITE_MODULE);
      const db = new PGlite();
      let previous = Promise.resolve();
      pool = {
        query: (...args) => db.query(...args),
        async connect() {
          const wait = previous;
          let release;
          previous = new Promise((resolve) => {
            release = resolve;
          });
          await wait;
          return { query: (...args) => db.query(...args), release };
        },
      };
      close = () => db.close();
    } else {
      const schema = "poll_test_" + randomBytes(8).toString("hex");
      const root = new pg.Pool({
        connectionString: process.env.TEST_POLL_DATABASE_URL,
      });
      await root.query(`create schema ${schema}`);
      pool = new pg.Pool({
        connectionString: process.env.TEST_POLL_DATABASE_URL,
        options: `-c search_path=${schema}`,
      });
      close = async () => {
        await pool.end();
        await root.query(`drop schema ${schema} cascade`);
        await root.end();
      };
    }
    try {
      const migration = await readFile(
        new URL("../db/migrations/005_poll.sql", import.meta.url),
        "utf8",
      );
      for (let i = 0; i < 2; i++)
        for (const statement of migration
          .split(/^-- statement\s*$/m)
          .filter((s) => s.trim() && !s.trim().startsWith("-- Definitions")))
          await pool.query(statement);
      let store = createPollStore(() => pool),
        r = await store.start("a".repeat(64));
      assert.equal(r.current, "frequency");
      assert.equal(await store.read("b".repeat(64)), null);
      const originalId = r.id;
      r = await store.update("a".repeat(64), 0, {
        action: "answer",
        questionId: "frequency",
        value: "daily",
        advance: false,
      });
      store = createPollStore(() => pool);
      r = await store.read("a".repeat(64));
      assert.equal(r.answers.frequency, "daily");
      assert.equal(r.id, originalId);
      await assert.rejects(
        store.update("a".repeat(64), 0, {
          action: "answer",
          questionId: "frequency",
          value: "weekly",
        }),
        (e) => e.status === 409,
      );
      while (r.current !== "navigation") {
        const q = calculate(r.answers).path.find((q) => q.id === r.current);
        const value = q.optional
          ? null
          : q.id === "lab_use"
            ? "often"
            : q.id === "focus"
              ? "both"
              : q.type === "rating"
                ? 1
                : q.type === "short"
                  ? "some feedback"
                  : q.options[0].value;
        r = await store.update("a".repeat(64), r.revision, {
          action: "answer",
          questionId: q.id,
          value,
          advance: true,
        });
      }
      assert.equal(r.answers.both_reason, "balance");
      assert.ok(r.answers.satisfaction_low);
      while (r.current !== "focus")
        r = await store.update("a".repeat(64), r.revision, { action: "back" });
      r = await store.update("a".repeat(64), r.revision, {
        action: "answer",
        questionId: "focus",
        value: "features",
        advance: true,
      });
      assert.equal(r.answers.both_reason, undefined);
      assert.equal(r.current, "missing_features");
      const stale = await pool.query(
        "select * from poll_answers where response_id=$1 and question_id=$2",
        [r.id, "both_reason"],
      );
      assert.equal(stale.rows.length, 0);
      while (r.current) {
        const q = calculate(r.answers).path.find((q) => q.id === r.current);
        const value = q.optional
          ? null
          : q.type === "rating"
            ? 4
            : q.type === "short" || q.type === "long"
              ? "feedback"
              : q.type === "multiple"
                ? [q.options[0].value]
                : q.type === "ranking"
                  ? q.options.map((o) => o.value)
                  : q.options[0].value;
        r = await store.update("a".repeat(64), r.revision, {
          action: "answer",
          questionId: q.id,
          value,
          advance: true,
        });
      }
      const skipped = await pool.query(
        "select value, value is null as sql_null from poll_answers where response_id=$1 and question_id='final'",
        [r.id],
      );
      assert.equal(skipped.rows[0].sql_null, false);
      assert.equal(skipped.rows[0].value, null);
      r = await store.update("a".repeat(64), r.revision, { action: "submit" });
      assert.ok(r.completed_at);
      assert.ok((await store.read("a".repeat(64))).completed_at);
      assert.ok(
        (
          await store.update("a".repeat(64), r.revision - 1, {
            action: "submit",
          })
        ).completed_at,
      );
      await assert.rejects(
        store.update("a".repeat(64), r.revision, { action: "back" }),
        (e) => e.status === 409,
      );
      const stored = await pool.query(
        "select session_hash from poll_responses where id=$1",
        [r.id],
      );
      assert.equal(stored.rows[0].session_hash, "a".repeat(64));
    } finally {
      await close();
    }
  },
);
