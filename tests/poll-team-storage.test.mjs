import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
import { createStaffStore, tokenHash } from "../api/_lib/poll-staff.mjs";
import { createAnalytics, parseFilters } from "../api/_lib/poll-analytics.mjs";
import { createPollStore } from "../api/_lib/poll-store.mjs";
import { createTeamHandler } from "../api/poll-team.mjs";
import { questions } from "../api/_lib/poll-definition.mjs";
import { calculate } from "../api/_lib/poll-engine.mjs";
const enabled = Boolean(
  process.env.POLL_TEST_PGLITE_MODULE || process.env.TEST_POLL_DATABASE_URL,
);
test(
  "staff SQL: one-time invites, expiration/revocation, protected APIs, segmented analytics and private response paths",
  { skip: !enabled },
  async (t) => {
    let pool, close;
    if (process.env.POLL_TEST_PGLITE_MODULE) {
      const { PGlite } = await import(process.env.POLL_TEST_PGLITE_MODULE);
      const db = new PGlite();
      let queue = Promise.resolve();
      pool = {
        query: (...args) => db.query(...args),
        async connect() {
          const wait = queue;
          let release;
          queue = new Promise((r) => (release = r));
          await wait;
          return { query: (...args) => db.query(...args), release };
        },
      };
      close = () => db.close();
    } else {
      const schema = "team_test_" + randomBytes(8).toString("hex"),
        root = new pg.Pool({
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
      for (let repeat = 0; repeat < 2; repeat++)
        for (const file of ["005_poll.sql", "006_poll_staff.sql"]) {
          const source = await readFile(
            new URL("../db/migrations/" + file, import.meta.url),
            "utf8",
          );
          for (const statement of source
            .split(/^-- statement\s*$/m)
            .filter((s) => s.trim() && !s.trim().startsWith("-- Definitions")))
            await pool.query(statement);
        }
      const auth = createStaffStore(() => pool),
        analytics = createAnalytics(() => pool),
        poll = createPollStore(() => pool);
      let token, invite;
      await t.test(
        "invite hashes, atomic one-time consumption and independent session token",
        async () => {
          invite = await auth.createInvite("tester browser");
          assert.equal(invite.token.length, 43);
          assert.ok(await auth.invite(invite.token));
          const results = await Promise.all([
            auth.consume(invite.token),
            auth.consume(invite.token),
          ]);
          assert.equal(results.filter(Boolean).length, 1);
          token = results.find(Boolean);
          assert.notEqual(token, invite.token);
          assert.ok(await auth.session(token));
          assert.equal(await auth.invite(invite.token), null);
          const stored = (
            await pool.query(
              "select token_hash from poll_staff_invites where id=$1",
              [invite.id],
            )
          ).rows[0];
          assert.equal(stored.token_hash, tokenHash(invite.token));
          assert.notEqual(stored.token_hash, invite.token);
          assert.ok((await auth.list()).sessions.length === 1);
        },
      );
      await t.test(
        "invalid, expired and revoked invites cannot create sessions",
        async () => {
          assert.equal(await auth.consume("invalid"), null);
          assert.equal(await auth.consume("z".repeat(43)), null);
          const expired = await auth.createInvite("expired");
          await pool.query(
            "update poll_staff_invites set expires_at=now()-interval '1 second' where id=$1",
            [expired.id],
          );
          assert.equal(await auth.consume(expired.token), null);
          const revoked = await auth.createInvite("revoked");
          await auth.revoke("invite", revoked.id);
          assert.equal(await auth.consume(revoked.token), null);
        },
      );
      async function seed(values, completed = true) {
        let r = await poll.start(tokenHash(randomUUID()));
        while (r.current) {
          const q = calculate(r.answers).path.find((q) => q.id === r.current);
          if (!completed && q.id === "satisfaction") break;
          const value = Object.hasOwn(values, q.id)
            ? values[q.id]
            : q.optional
              ? null
              : q.type === "rating"
                ? 4
                : q.type === "short" || q.type === "long"
                  ? "Keep the reliable parts."
                  : q.type === "multiple"
                    ? [q.options[0].value]
                    : q.type === "ranking"
                      ? q.options.map((o) => o.value)
                      : q.options[0].value;
          r = await poll.update(r.session_hash, r.revision, {
            action: "answer",
            questionId: q.id,
            value,
            advance: true,
          });
        }
        if (completed)
          r = await poll.update(r.session_hash, r.revision, {
            action: "submit",
          });
        return r;
      }
      const a = await seed({
        experience: "experienced",
        lab_use: "often",
        satisfaction: 2,
        focus: "both",
        features: ["goals", "themes"],
        feature_rank: ["themes", "goals"],
        success: "rarely",
        final: "Recovery needs work. <script>alert(1)</script>",
      });
      const b = await seed({
        frequency: "weekly",
        experience: "experienced",
        lab_use: "often",
        satisfaction: 3,
        focus: "features",
        features: ["themes"],
        success: "usually",
        final: "Please improve RECOVERY.",
      });
      const c = await seed({
        frequency: "occasionally",
        experience: "new",
        lab_use: "never",
        satisfaction: 5,
        focus: "reliability",
        features: ["none"],
        success: "always",
        discord: ["none"],
        final: null,
      });
      await seed({ experience: "new", lab_use: "never" }, false);
      const f = (query) => parseFilters(new URLSearchParams(query));
      await t.test(
        "aggregate totals, completion rate, satisfaction and feature counts",
        async () => {
          const data = await analytics.overview(f(""));
          assert.equal(data.total, 4);
          assert.equal(data.completed, 3);
          assert.equal(data.completionRate, 75);
          assert.equal(data.satisfaction.average, 3.33);
          assert.equal(
            data.features.counts.find((o) => o.value === "themes").count,
            2,
          );
          assert.equal(
            data.priority.counts.find((o) => o.value === "both").count,
            1,
          );
        },
      );
      await t.test(
        "combined filters consistently segment overview, questions and response lists",
        async () => {
          const filters = f(
            "experience=experienced&lab_use=often&satisfactionMax=3",
          );
          assert.equal((await analytics.overview(filters)).total, 2);
          assert.equal(
            (await analytics.question(filters, "features")).counts.find(
              (o) => o.value === "themes",
            ).percentage,
            100,
          );
          assert.equal((await analytics.responses(filters)).rows.length, 2);
          assert.equal(
            (
              await analytics.overview(
                f(
                  "features=goals,themes&success=rarely&focus=both&discord=support",
                ),
              )
            ).total,
            1,
          );
          assert.equal(
            (await analytics.overview(f("status=partial"))).total,
            1,
          );
          assert.equal(
            (await analytics.overview(f("from=2099-01-01"))).total,
            0,
          );
        },
      );
      await t.test(
        "rating distribution, conditional drill-down and ranking statistics",
        async () => {
          assert.equal(
            (await analytics.question(f(""), "satisfaction")).answered,
            3,
          );
          const q = await analytics.question(
            f("branchQuestion=focus&branchValue=both"),
            "both_reason",
          );
          assert.equal(q.answered, 1);
          assert.equal(q.counts.find((o) => o.value === "balance").count, 1);
          assert.ok(
            (await analytics.question(f(""), "focus")).counts
              .find((o) => o.value === "both")
              .followups.some((q) => q.id === "both_reason"),
          );
          const ranking = await analytics.question(f(""), "feature_rank");
          assert.equal(
            ranking.counts.find((o) => o.value === "themes").averageRank,
            1,
          );
          assert.equal(
            ranking.counts.find((o) => o.value === "themes").first,
            1,
          );
        },
      );
      await t.test(
        "anonymous viewer returns actual adaptive path without secrets or irrelevant sections",
        async () => {
          const response = await analytics.response(f(""), c.id);
          assert.ok(response.completed_at);
          assert.ok(response.response_number);
          assert.equal(response.session_hash, undefined);
          assert.ok(
            response.path.every(
              (q) => !q.id.startsWith("lab_") || q.id === "lab_use",
            ),
          );
          assert.ok(!response.path.some((q) => q.id === "satisfaction_low"));
          assert.ok(response.path.some((q) => q.id === "final" && q.skipped));
          assert.equal(
            await analytics.response(f("focus=features"), a.id),
            null,
          );
        },
      );
      await t.test(
        "written feedback is literal, case-insensitive, segmented and paginated",
        async () => {
          const feedback = await analytics.feedback(
            f("question=final&search=recovery"),
          );
          assert.equal(feedback.rows.length, 2);
          assert.ok(feedback.rows.some((r) => r.text.includes("<script>")));
          assert.equal(
            (
              await analytics.feedback(
                f("question=final&search=recovery&focus=features"),
              )
            ).rows.length,
            1,
          );
          assert.equal(
            (await analytics.feedback(f("question=final&search=%25"))).rows
              .length,
            0,
          );
          assert.equal(
            (await analytics.feedback(f("question=final&page=1"))).rows.length,
            0,
          );
          await assert.rejects(
            () => analytics.feedback(f("question=frequency")),
            (e) => e.status === 400,
          );
        },
      );
      await t.test(
        "private API cookie, origin, invite confirmation and no-cache protections",
        async () => {
          const handler = createTeamHandler({
            auth,
            analytics,
            configured: () => true,
            limit: async () => ({ allowed: true }),
            readPage: async () => "<html>staff</html>",
          });
          const fresh = await auth.createInvite("HTTPS browser"),
            url = "https://ultmacro.xyz/poll/team/access/" + fresh.token;
          const preview = await handler(new Request(url));
          assert.equal(preview.status, 200);
          assert.ok(await auth.invite(fresh.token));
          assert.equal(preview.headers.get("referrer-policy"), "strict-origin");
          assert.equal(
            (
              await handler(
                new Request(url, {
                  method: "POST",
                  headers: { origin: "https://evil.test" },
                }),
              )
            ).status,
            403,
          );
          const used = await handler(
            new Request(url, {
              method: "POST",
              headers: { origin: "https://ultmacro.xyz" },
            }),
          );
          assert.equal(used.status, 303);
          assert.equal(used.headers.get("location"), "/poll/team");
          assert.match(
            used.headers.get("set-cookie"),
            /HttpOnly; SameSite=Strict;.*Secure/,
          );
          assert.equal(
            (
              await handler(
                new Request(url, {
                  method: "POST",
                  headers: { origin: "https://ultmacro.xyz" },
                }),
              )
            ).status,
            410,
          );
          for (const route of [
            "/api/poll-team",
            "/api/poll-team/question?question=features",
            "/api/poll-team/responses",
            "/api/poll-team/response?id=" + a.id,
            "/api/poll-team/feedback",
          ]) {
            assert.equal(
              (
                await handler(
                  new Request("https://ultmacro.xyz" + route, {
                    headers: { cookie: "um_poll=" + token },
                  }),
                )
              ).status,
              401,
            );
            const r = await handler(
              new Request("https://ultmacro.xyz" + route, {
                headers: { cookie: "um_poll_staff=" + token },
              }),
            );
            assert.equal(r.status, 200, route);
            assert.equal(r.headers.get("cache-control"), "no-store");
          }
        },
      );
      await t.test(
        "session expiry and invite/session revocation immediately remove authorization",
        async () => {
          const session = await auth.session(token);
          await pool.query(
            "update poll_staff_sessions set expires_at=now()-interval '1 second' where id=$1",
            [session.id],
          );
          assert.equal(await auth.session(token), null);
          const i = await auth.createInvite("revoke parent"),
            s = await auth.consume(i.token);
          assert.ok(await auth.session(s));
          await auth.revoke("invite", i.id);
          assert.equal(await auth.session(s), null);
          const j = await auth.createInvite("revoke session"),
            v = await auth.consume(j.token);
          await auth.revoke("session", (await auth.session(v)).id);
          assert.equal(await auth.session(v), null);
        },
      );
      await t.test(
        "completion date boundaries remain UTC in non-UTC PostgreSQL sessions",
        async () => {
          await pool.query("set timezone='America/New_York'");
          await pool.query(
            "update poll_responses set completed_at=$2 where id=$1",
            [b.id, "2026-10-06T02:00:00Z"],
          );
          await pool.query(
            "update poll_responses set completed_at=$2 where id=$1",
            [c.id, "2026-10-07T02:00:00Z"],
          );
          const segment = await analytics.responses(
            f("from=2026-10-06&to=2026-10-06"),
          );
          assert.ok(
            segment.rows.some((r) => r.id === b.id),
            "UTC October 6 must be included",
          );
          assert.ok(
            !segment.rows.some((r) => r.id === c.id),
            "UTC October 7 must be excluded",
          );
          await pool.query("set timezone='UTC'");
        },
      );
      await t.test(
        "legacy analytics use original labels and remain separate from updated responses",
        async () => {
          const id = randomUUID();
          await pool.query(
            "insert into poll_responses(id,session_hash,survey_version,current_question,completed_at) values($1,$2,'um-feedback-v1',null,now())",
            [id, randomBytes(32).toString("hex")],
          );
          await pool.query(
            "insert into poll_answers(response_id,question_id,value) values($1,'focus','\"both\"'::jsonb),($1,'both_reason','\"balance\"'::jsonb)",
            [id],
          );
          const old = f("version=um-feedback-v1");
          const distribution = await analytics.question(old, "both_reason");
          assert.equal(
            distribution.counts[0].label,
            "Both matter to my experience",
          );
          assert.equal(distribution.counts[0].count, 1);
          const response = await analytics.response(old, id);
          assert.equal(
            response.path.find((q) => q.id === "both_reason").options[0].label,
            "Both matter to my experience",
          );
          assert.equal(await analytics.response(f(""), id), null);
          assert.equal((await analytics.overview(old)).total, 1);
        },
      );
      await t.test(
        "SQL aggregates and pagination stay bounded with thousands of responses",
        async () => {
          await pool.query(`insert into poll_responses(id,session_hash,survey_version,current_question,completed_at)
          select md5('load-response-'||n)::uuid,repeat(md5('load-session-'||n),2),'um-feedback-v2',null,now() from generate_series(1,2000) n`);
          await pool.query(`insert into poll_answers(response_id,question_id,value)
          select md5('load-response-'||n)::uuid,'satisfaction','4'::jsonb from generate_series(1,2000) n`);
          const start = performance.now();
          const data = await analytics.overview(f(""));
          assert.equal(data.total, 2004);
          assert.equal(data.satisfaction.answered, 2003);
          assert.ok(
            data.features.counts.length <=
              questions.find((q) => q.id === "features").options.length,
          );
          const responses = await analytics.responses(f(""));
          assert.equal(responses.rows.length, 25);
          assert.equal(responses.hasMore, true);
          t.diagnostic(
            `2,004 response SQL overview and bounded response page: ${Math.round(performance.now() - start)} ms in PGlite; not a production benchmark`,
          );
        },
      );
    } finally {
      await close();
    }
  },
);
