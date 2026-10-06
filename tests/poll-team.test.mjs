import test from "node:test";
import assert from "node:assert/strict";
import { parseFilters } from "../api/_lib/poll-analytics.mjs";
import { createTeamHandler } from "../api/poll-team.mjs";

test("staff filters strictly validate values, dates and combined segments", () => {
  assert.deepEqual(
    parseFilters(
      new URLSearchParams(
        "experience=experienced&lab_use=often&satisfactionMax=3",
      ),
    ).experience,
    "experienced",
  );
  for (const query of [
    "unknown=x",
    "satisfactionMax=6",
    "frequency=invalid",
    "from=2026-02-30",
    "from=2026-10-05&to=2026-09-01",
    "experience=new&experience=creator",
    "branchQuestion=focus",
    "branchQuestion=final&branchValue=anything",
    "page=-1",
  ])
    assert.throws(
      () => parseFilters(new URLSearchParams(query)),
      (e) => e.status === 400,
      query,
    );
});
test("every private endpoint and dashboard require a staff session", async () => {
  let reads = 0;
  const handler = createTeamHandler({
    configured: () => true,
    limit: async () => ({ allowed: true }),
    auth: { session: async () => null },
    analytics: {
      overview: async () => {
        reads++;
      },
    },
  });
  for (const path of [
    "/api/poll-team",
    "/api/poll-team/questions",
    "/api/poll-team/question",
    "/api/poll-team/responses",
    "/api/poll-team/response",
    "/api/poll-team/feedback",
    "/api/poll-team/nope",
    "/poll/team",
    "/poll/team/index.html",
  ]) {
    const r = await handler(new Request("https://ultmacro.xyz" + path));
    assert.equal(r.status, 401, path);
    assert.equal(r.headers.get("cache-control"), "no-store");
  }
  assert.equal(reads, 0);
});
test("staff mutations reject cross-origin requests and missing protection header", async () => {
  const handler = createTeamHandler({
    configured: () => true,
    limit: async () => ({ allowed: true }),
    auth: {
      session: async () => ({ id: "ok" }),
      logout: async () => {
        throw Error("must not run");
      },
    },
  });
  for (const headers of [
    {},
    { origin: "https://evil.test", "x-poll-team-request": "1" },
    { "sec-fetch-site": "cross-site", "x-poll-team-request": "1" },
  ])
    assert.equal(
      (
        await handler(
          new Request("https://ultmacro.xyz/api/poll-team/logout", {
            method: "POST",
            headers: { cookie: "um_poll_staff=" + "a".repeat(43), ...headers },
          }),
        )
      ).status,
      403,
    );
});

test("staff rate limits and invalid private queries fail closed", async () => {
  const limited = createTeamHandler({
    configured: () => true,
    limit: async () => ({ allowed: false, retryAfter: 45 }),
  });
  const rejected = await limited(
    new Request("https://ultmacro.xyz/api/poll-team"),
  );
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("retry-after"), "45");
  const handler = createTeamHandler({
    configured: () => true,
    limit: async () => ({ allowed: true }),
    auth: { session: async () => ({ id: "staff" }) },
  });
  for (const path of [
    "/api/poll-team?frequency=bad",
    "/api/poll-team?nope=x",
    "/api/poll-team/response?id=not-a-uuid",
    "/api/poll-team/responses?page=99999",
  ])
    assert.equal(
      (
        await handler(
          new Request("https://ultmacro.xyz" + path, {
            headers: { cookie: "um_poll_staff=" + "a".repeat(43) },
          }),
        )
      ).status,
      400,
      path,
    );
});
