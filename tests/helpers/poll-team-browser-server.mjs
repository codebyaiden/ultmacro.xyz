import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createStaffStore, tokenHash } from "../../api/_lib/poll-staff.mjs";
import { createAnalytics } from "../../api/_lib/poll-analytics.mjs";
import { createPollStore } from "../../api/_lib/poll-store.mjs";
import { calculate } from "../../api/_lib/poll-engine.mjs";
import { createPollHandler } from "../../api/poll.mjs";
import { createTeamHandler } from "../../api/poll-team.mjs";
const { PGlite } = await import(process.env.POLL_TEST_PGLITE_MODULE);
const db = new PGlite(),
  root = path.resolve(import.meta.dirname, "../..");
let queue = Promise.resolve();
const pool = {
  query: (...args) => db.query(...args),
  async connect() {
    const wait = queue;
    let release;
    queue = new Promise((r) => (release = r));
    await wait;
    return { query: (...args) => db.query(...args), release };
  },
};
for (const file of ["005_poll.sql", "006_poll_staff.sql"])
  for (const statement of (
    await readFile(path.join(root, "db/migrations", file), "utf8")
  )
    .split(/^-- statement\s*$/m)
    .filter((s) => s.trim() && !s.trim().startsWith("-- Definitions")))
    await pool.query(statement);
export const auth = createStaffStore(() => pool);
const analytics = createAnalytics(() => pool),
  store = createPollStore(() => pool);
for (let i = 0; i < 34; i++) {
  let r = await store.start(tokenHash(randomUUID()));
  const complete = i < 28;
  while (r.current) {
    const q = calculate(r.answers).path.find((q) => q.id === r.current);
    if (!complete && q.id === "satisfaction") break;
    const values = {
      frequency: i % 3 ? "daily" : "weekly",
      experience: i % 3 ? "experienced" : "new",
      lab_use: i % 3 ? "often" : "never",
      satisfaction: (i % 5) + 1,
      focus: i % 3 === 0 ? "reliability" : i % 3 === 1 ? "features" : "both",
      success: i % 3 === 0 ? "always" : "rarely",
      features: i % 4 === 0 ? ["none"] : ["goals", "themes"],
      discord: i % 4 === 0 ? ["none"] : ["support", "updates"],
      final:
        "Recovery should be simpler. Keep the interface readable. <script>window.feedbackExecuted=true</script>",
    };
    const value = Object.hasOwn(values, q.id)
      ? values[q.id]
      : q.optional
        ? null
        : q.type === "rating"
          ? 4
          : q.type === "short" || q.type === "long"
            ? "Recovery matters more than another switch."
            : q.type === "multiple"
              ? [q.options[0].value]
              : q.type === "ranking"
                ? q.options.map((o) => o.value)
                : q.options[0].value;
    r = await store.update(r.session_hash, r.revision, {
      action: "answer",
      questionId: q.id,
      value,
      advance: true,
    });
  }
  if (complete)
    await store.update(r.session_hash, r.revision, { action: "submit" });
  await pool.query(
    "update poll_responses set created_at=now()-$2*interval '1 day'-interval '6 minutes',updated_at=now()-$2*interval '1 day',completed_at=case when completed_at is not null then now()-$2*interval '1 day' else null end where id=$1",
    [r.id, i % 14],
  );
}
const options = {
  configured: () => true,
  limit: async () => ({ allowed: true }),
};
const team = createTeamHandler({ ...options, auth, analytics }),
  poll = createPollHandler({ ...options, store });
export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:3127"),
      chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      ...(body.length ? { body } : {}),
    });
    let response;
    if (
      url.pathname === "/api/poll-team" ||
      url.pathname.startsWith("/api/poll-team/") ||
      url.pathname === "/poll/team" ||
      url.pathname.startsWith("/poll/team/")
    )
      response = await team(request);
    else if (
      url.pathname === "/api/poll" ||
      url.pathname.startsWith("/api/poll/")
    )
      response = await poll(request);
    if (response) {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let file = path.resolve(root, "." + url.pathname);
    if (!file.startsWith(root + path.sep)) throw Error();
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": file.endsWith(".html")
        ? "text/html"
        : file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((resolve) => server.listen(3127, "127.0.0.1", resolve));
console.log("Dedicated SQL-backed staff browser fixtures ready");
