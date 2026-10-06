import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

test("standalone server serves /poll and existing pages, routes API, and caps poll bodies", async () => {
  const available = net.createServer();
  await new Promise((resolve) => available.listen(0, "127.0.0.1", resolve));
  const port = available.address().port;
  await new Promise((resolve) => available.close(resolve));
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: "",
      STRATEGY_HASH_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve);
      child.once("exit", () =>
        reject(new Error("Server exited before startup")),
      );
      child.once("error", reject);
    });
    const url = `http://127.0.0.1:${port}`;
    for (const pathname of [
      "/poll",
      "/poll/",
      "/strategies",
      "/",
      "/styles/poll.css",
      "/src/poll.js",
    ])
      assert.equal((await fetch(url + pathname)).status, 200, pathname);
    assert.match(await (await fetch(url + "/poll")).text(), /help shape/);
    assert.equal((await fetch(url + "/api/poll")).status, 503);
    for (const pathname of [
      "/poll/team",
      "/poll/team/",
      "/poll/team/index.html",
      "/poll%5Cteam%5Cindex.html",
      "/poll/%74eam/index.html",
      "/api/poll-team",
      "/poll/team/access/" + "a".repeat(43),
    ]) {
      const response = await fetch(url + pathname);
      assert.equal(
        response.status,
        503,
        pathname + " must be routed through staff authorization",
      );
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal((await fetch(url + "/api/poll/team")).status, 404);
    assert.equal(
      (
        await fetch(url + "/api/poll/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "x".repeat(17000),
        })
      ).status,
      413,
    );
    assert.equal(
      (await fetch(url + "/api/poll", { method: "DELETE" })).status,
      405,
    );
    assert.equal((await fetch(url + "/api/does-not-exist")).status, 404);
  } finally {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await exited;
  }
});
