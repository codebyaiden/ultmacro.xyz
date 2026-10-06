import test from "node:test";
import assert from "node:assert/strict";
import { createPollHandler } from "../api/poll.mjs";
import { transition } from "../api/_lib/poll-engine.mjs";

function fixture() {
  const records = new Map();
  const store = {
    async start(hash) {
      const r = {
        answers: {},
        current: "frequency",
        revision: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      records.set(hash, r);
      return r;
    },
    async read(hash) {
      return records.get(hash) || null;
    },
    async update(hash, revision, input) {
      const r = records.get(hash);
      if (!r) return null;
      if (r.revision !== revision)
        throw Object.assign(new Error("Survey changed. Reload to continue."), {
          status: 409,
        });
      if (r.completed_at && input.action === "submit") return r;
      const next = transition(r, input);
      next.revision++;
      if (next.complete) next.completed_at = new Date().toISOString();
      records.set(hash, next);
      return next;
    },
  };
  const handler = createPollHandler({
    store,
    configured: () => true,
    limit: async () => ({ allowed: true }),
  });
  const call = (path = "", body = undefined, cookie = "", extra = {}) =>
    handler(
      new Request("https://ultmacro.xyz/api/poll" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "content-type": "application/json",
          "x-poll-request": "1",
          ...(cookie ? { cookie } : {}),
          ...extra,
        },
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
    );
  return { call, records, handler };
}
async function start(f) {
  const response = await f.call("/start", {});
  assert.equal(response.status, 201);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    state: await response.json(),
  };
}

test("start returns anonymous state and a persistent HttpOnly cookie, never the response ID", async () => {
  const f = fixture(),
    { cookie, state } = await start(f);
  assert.match(cookie, /um_poll=[A-Za-z0-9_-]{43}$/);
  assert.equal(state.current, "frequency");
  assert.equal(state.answers.constructor, Object);
  const r = await f.call("/start", {});
  assert.match(r.headers.get("set-cookie"), /HttpOnly; SameSite=Lax; Secure/);
  assert.equal(state.token, undefined);
  assert.equal(state.id, undefined);
});
test("save without advance survives resume; Back and changing an earlier answer persist", async () => {
  const f = fixture(),
    { cookie } = await start(f);
  let r = await f.call(
    "/answer",
    { revision: 0, questionId: "frequency", value: "daily", advance: false },
    cookie,
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).current, "frequency");
  r = await f.call("", undefined, cookie);
  let s = await r.json();
  assert.equal(s.answers.frequency, "daily");
  r = await f.call(
    "/navigate",
    { revision: s.revision, direction: "next" },
    cookie,
  );
  s = await r.json();
  assert.equal(s.current, "purpose");
  r = await f.call(
    "/navigate",
    { revision: s.revision, direction: "back" },
    cookie,
  );
  s = await r.json();
  assert.equal(s.current, "frequency");
  r = await f.call(
    "/answer",
    {
      revision: s.revision,
      questionId: "frequency",
      value: "weekly",
      advance: true,
    },
    cookie,
  );
  s = await r.json();
  assert.equal(s.answers.frequency, "weekly");
  r = await f.call("/start", {}, cookie);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).current, "purpose");
});
test("competing stale writes are rejected", async () => {
  const f = fixture(),
    { cookie } = await start(f);
  assert.equal(
    (
      await f.call(
        "/answer",
        { revision: 0, questionId: "frequency", value: "daily" },
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await f.call(
        "/answer",
        { revision: 0, questionId: "frequency", value: "weekly" },
        cookie,
      )
    ).status,
    409,
  );
});
test("other responses cannot be selected through URL/body or guessed cookies", async () => {
  const f = fixture(),
    a = await start(f),
    b = await start(f);
  assert.equal((await f.call("", undefined)).status, 401);
  assert.equal(
    (await f.call("", undefined, "um_poll=" + "a".repeat(43))).status,
    401,
  );
  assert.equal(
    (await f.call("?response=" + a.cookie, undefined, b.cookie)).status,
    400,
  );
  assert.equal((await f.call("/" + a.cookie, undefined, b.cookie)).status, 404);
  assert.equal(
    (
      await f.call(
        "/answer",
        {
          revision: 0,
          questionId: "frequency",
          value: "daily",
          responseId: a.cookie,
        },
        b.cookie,
      )
    ).status,
    400,
  );
  assert.equal((await f.call("", undefined, "um_poll=%bad")).status, 401);
});
test("invalid question, value, revision, shapes and malformed payloads are rejected", async () => {
  const f = fixture(),
    { cookie } = await start(f);
  for (const payload of [
    null,
    [],
    {},
    "{",
    { revision: 0, questionId: "nope", value: "daily" },
    { revision: 0, questionId: "frequency", value: {} },
    { revision: "0", questionId: "frequency", value: "daily" },
    { revision: 0, questionId: "frequency", value: "daily", advance: "true" },
  ]) {
    assert.equal(
      (await f.call("/answer", JSON.stringify(payload), cookie)).status,
      400,
    );
  }
  assert.equal((await f.call("/answer", "{", cookie)).status, 400);
  assert.equal(
    (await f.call("/answer", "x".repeat(17000), cookie)).status,
    413,
  );
  assert.equal(
    (await f.call("/answer", {}, cookie, { "content-type": "text/plain" }))
      .status,
    415,
  );
});
test("origin and custom-header checks block cross-site writes", async () => {
  const f = fixture();
  assert.equal(
    (await f.call("/start", {}, "", { origin: "https://evil.example" })).status,
    403,
  );
  assert.equal(
    (await f.call("/start", {}, "", { "x-poll-request": "" })).status,
    403,
  );
});
test("rate limiting fails closed and returns retry-after", async () => {
  const f = fixture();
  const h = createPollHandler({
    store: {},
    configured: () => true,
    limit: async () => ({ allowed: false, retryAfter: 60 }),
  });
  const r = await h(new Request("https://ultmacro.xyz/api/poll"));
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("retry-after"), "60");
});
test("incomplete submission is rejected; full adaptive survey completes and hides saved answers", async () => {
  const f = fixture(),
    { cookie, state } = await start(f);
  let s = state;
  assert.equal(
    (await f.call("/submit", { revision: s.revision }, cookie)).status,
    400,
  );
  while (s.current) {
    const q = s.path.find((q) => q.id === s.current);
    const value =
      q.type === "rating"
        ? 3
        : q.type === "short" || q.type === "long"
          ? "feedback"
          : q.type === "multiple"
            ? [q.options[0].value]
            : q.type === "ranking"
              ? q.options.map((o) => o.value)
              : q.options[0].value;
    const r = await f.call(
      "/answer",
      { revision: s.revision, questionId: q.id, value, advance: true },
      cookie,
    );
    assert.equal(r.status, 200);
    s = await r.json();
  }
  let r = await f.call("/submit", { revision: s.revision }, cookie);
  assert.equal(r.status, 200);
  s = await r.json();
  assert.equal(s.completed, true);
  assert.deepEqual(s.answers, {});
  assert.deepEqual(s.path, []);
  r = await f.call("", undefined, cookie);
  assert.equal((await r.json()).completed, true);
  assert.equal(
    (await f.call("/submit", { revision: s.revision }, cookie)).status,
    200,
  );
});
test("missing database configuration returns a clear unavailable response", async () => {
  const h = createPollHandler({ configured: () => false });
  assert.equal(
    (await h(new Request("https://ultmacro.xyz/api/poll"))).status,
    503,
  );
});

test("public completions returns only a cached aggregate without a session", async () => {
  let calls = 0,
    clock = 0;
  const handler = createPollHandler({
    configured: () => true,
    limit: async () => ({ allowed: true }),
    now: () => clock,
    store: {
      completedCount: async () => {
        calls++;
        return 37;
      },
    },
  });
  const request = () =>
    handler(new Request("https://ultmacro.xyz/api/poll/completions"));
  const responses = await Promise.all([request(), request(), request()]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { completedCount: 37 });
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  }
  assert.equal(calls, 1);
  clock = 60001;
  await request();
  assert.equal(calls, 2);
  assert.equal(
    (await handler(new Request("https://ultmacro.xyz/api/poll"))).status,
    401,
  );
  assert.equal(
    (
      await handler(
        new Request("https://ultmacro.xyz/api/poll/completions", {
          method: "POST",
        }),
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await handler(
        new Request("https://ultmacro.xyz/api/poll/completions?id=private"),
      )
    ).status,
    400,
  );
});
test("completion count failures recover without caching errors or changing survey start", async () => {
  const f = fixture();
  let calls = 0;
  const handler = createPollHandler({
    configured: () => true,
    limit: async () => ({ allowed: true }),
    store: {
      completedCount: async () => {
        if (!calls++)
          throw Object.assign(new Error("unavailable"), { status: 503 });
        return 0;
      },
    },
  });
  assert.equal(
    (await handler(new Request("https://ultmacro.xyz/api/poll/completions")))
      .status,
    503,
  );
  assert.deepEqual(
    await (
      await handler(new Request("https://ultmacro.xyz/api/poll/completions"))
    ).json(),
    { completedCount: 0 },
  );
  assert.equal((await f.call("/start", {})).status, 201);
});

test("existing anonymous sessions resume and edit using their original survey version", async () => {
  const f = fixture(),
    { cookie } = await start(f);
  const row = [...f.records.values()][0];
  row.survey_version = "um-feedback-v1";
  row.current = "both_reason";
  row.answers = { focus: "both", both_reason: "balance" };
  const resumed = await (await f.call("", undefined, cookie)).json();
  assert.equal(resumed.version, "um-feedback-v1");
  assert.equal(
    resumed.path.find((q) => q.id === "both_reason").options[0].label,
    "Both matter to my experience",
  );
  const updated = await f.call(
    "/answer",
    {
      revision: 0,
      questionId: "both_reason",
      value: "progress",
      advance: true,
    },
    cookie,
  );
  assert.equal(updated.status, 200);
  const state = await updated.json();
  assert.equal(state.version, "um-feedback-v1");
  assert.equal(state.current, "tie_breaker");
});

test("public origin accepts same-origin and internal proxy URLs and sets Secure cookie", async () => {
  for (const url of [
    "https://ultmacro.xyz",
    "http://127.0.0.1:3000",
    "http://internal:3000",
  ]) {
    const f = fixture();
    const response = await f.handler(
      new Request(url + "/api/poll/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-poll-request": "1",
          origin: "https://ultmacro.xyz",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      }),
    );
    assert.equal(response.status, 201);
    assert.match(
      response.headers.get("set-cookie"),
      /HttpOnly; SameSite=Lax; Secure/,
    );
    assert.equal((await response.json()).current, "frequency");
  }
});
test("external, null, www and forged forwarded origins cannot authorize poll mutations", async () => {
  const f = fixture();
  for (const origin of [
    "https://evil.example",
    "null",
    "https://www.ultmacro.xyz",
    "https://ultmacro.xyz.evil.example",
    "http://ultmacro.xyz",
    "https://ultmacro.xyz:444",
  ]) {
    for (const path of ["/start", "/answer", "/navigate", "/submit"]) {
      const response = await f.handler(
        new Request("http://127.0.0.1:3000/api/poll" + path, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-poll-request": "1",
            origin,
            "x-forwarded-host": "evil.example",
            "x-forwarded-proto": "https",
            forwarded: "host=evil.example;proto=https",
          },
          body: "{}",
        }),
      );
      assert.equal(response.status, 403, origin + path);
    }
  }
});
test("cross-site metadata is rejected with a valid or missing Origin; absent Origin still requires custom header", async () => {
  const f = fixture();
  for (const extra of [
    { origin: "https://ultmacro.xyz", "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "cross-site" },
    { "x-poll-request": "" },
  ])
    assert.equal((await f.call("/start", {}, "", extra)).status, 403);
  assert.equal((await f.call("/start", {})).status, 201);
});
test("local development same-origin works without widening the public origin allowlist", async () => {
  const f = fixture();
  for (const host of ["localhost:3000", "127.0.0.1:3127", "[::1]:3000"]) {
    const url = "http://" + host;
    const response = await f.handler(
      new Request(url + "/api/poll/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-poll-request": "1",
          origin: url,
        },
        body: "{}",
      }),
    );
    assert.equal(response.status, 201);
    assert.ok(!response.headers.get("set-cookie").includes("Secure"));
  }
});
test("explicit public origin is strict and production never accepts loopback origins", async () => {
  const { pollOriginAllowed } = await import("../api/_lib/poll-origin.mjs");
  const request = (origin) =>
    new Request("http://localhost:3000/api/poll/start", {
      headers: { origin },
    });
  assert.equal(
    pollOriginAllowed(request("http://localhost:3000"), { production: true }),
    false,
  );
  assert.equal(
    pollOriginAllowed(request("https://www.ultmacro.xyz"), {
      publicOrigin: "https://www.ultmacro.xyz",
      production: true,
    }),
    true,
  );
  assert.equal(
    pollOriginAllowed(request("https://ultmacro.xyz"), {
      publicOrigin: "https://www.ultmacro.xyz",
      production: true,
    }),
    false,
  );
  for (const publicOrigin of [
    "https://ultmacro.xyz/path",
    "https://user:pass@ultmacro.xyz",
    "http://ultmacro.xyz",
    "https://ultmacro.xyz/",
  ])
    assert.throws(() =>
      pollOriginAllowed(request("https://ultmacro.xyz"), {
        publicOrigin,
        production: true,
      }),
    );
});
