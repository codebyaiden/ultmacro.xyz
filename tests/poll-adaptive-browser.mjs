import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.TEST_POLL_BROWSER_URL;
if (!base)
  throw new Error("Set TEST_POLL_BROWSER_URL to a dedicated test backend.");
if (process.env.POLL_BROWSER_HARNESS)
  await import(process.env.POLL_BROWSER_HARNESS);
const browser = await chromium.launch({
  executablePath: process.env.POLL_BROWSER_EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
for (const [width, height] of [
  [320, 640],
  [390, 844],
  [820, 1180],
  [844, 390],
  [1440, 900],
  [1920, 1080],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 1000,
      reducedMotion,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/poll");
    await page.getByRole("button", { name: "Start survey" }).waitFor();
    const realCount = await (
      await page.request.get(base + "/api/poll/completions")
    ).json();
    if (realCount.completedCount)
      await page.locator("#completion-count:not([hidden])").waitFor();
    if (realCount.completedCount)
      assert.ok(
        (await page.locator("#completion-count").textContent()).includes(
          new Intl.NumberFormat("en-US").format(realCount.completedCount),
        ),
      );
    await page.getByRole("button", { name: "Start survey" }).click();
    await page.locator(".question").waitFor();
    async function state() {
      return (await page.request.get(base + "/api/poll")).json();
    }
    async function answer(q, value, s) {
      const r = await page.request.post(base + "/api/poll/answer", {
        headers: { "x-poll-request": "1" },
        data: { questionId: q.id, value, revision: s.revision, advance: true },
      });
      assert.equal(r.status(), 200, await r.text());
      return r.json();
    }
    let s = await state();
    while (s.current !== "focus") {
      const q = s.path.find((q) => q.id === s.current);
      s = await answer(
        q,
        q.optional
          ? null
          : q.type === "multiple"
            ? [q.options[0].value]
            : q.options[0].value,
        s,
      );
    }
    await page.reload();
    await page
      .getByRole("heading", {
        name: "What should Ultimate Macro focus on most?",
        exact: true,
      })
      .waitFor();
    await page.evaluate(() => {
      window.__overflow = [];
      window.__sample = true;
      const tick = () => {
        if (!window.__sample) return;
        const root = document.documentElement;
        if (root.scrollWidth > root.clientWidth)
          window.__overflow.push([root.scrollWidth, root.clientWidth]);
        requestAnimationFrame(tick);
      };
      tick();
      const original = PollMotion.leave;
      window.__branches = 0;
      PollMotion.leave = async (...args) => {
        if (args[2]) window.__branches++;
        return original(...args);
      };
    });
    for (const [value, label, next] of [
      ["reliability", "Reliability", "reliability_priority"],
      ["features", "New features", "missing_features"],
      ["both", "Both equally", "both_reason"],
    ]) {
      const choice = page.getByLabel(label, { exact: true });
      if (width < 1000) await choice.locator("..").tap();
      else await choice.check();
      await page.evaluate(() => {
        const f = document.querySelector("form");
        f.requestSubmit();
        f.requestSubmit();
        f.requestSubmit();
      });
      await page.locator(".branch-context").waitFor();
      await page.waitForFunction(
        (id) =>
          document.querySelector(".question form") &&
          !document.querySelector("#survey").dataset.branchTransition,
        next,
      );
      const saved = await state();
      assert.equal(saved.answers.focus, value);
      assert.equal(saved.current, next);
      assert.equal(await page.locator(".branch-context").textContent(), label);
      await page.waitForTimeout(260);
      assert.ok(
        await page.evaluate(() => {
          const c = document
              .querySelector(".branch-context")
              .getBoundingClientRect(),
            h = document.querySelector("main h1").getBoundingClientRect();
          return c.bottom <= h.top && c.right <= innerWidth;
        }),
      );
      assert.equal(await page.locator(".answer-flight").count(), 0);
      if (
        process.env.POLL_SCREENSHOTS &&
        value === "features" &&
        reducedMotion === "no-preference"
      )
        await page.screenshot({
          path: `${process.env.POLL_SCREENSHOTS}/adaptive-${width}.png`,
          fullPage: true,
        });
      await page.getByRole("button", { name: "Back", exact: false }).click();
      await page
        .getByRole("heading", {
          name: "What should Ultimate Macro focus on most?",
          exact: true,
        })
        .waitFor();
      assert.equal(await choice.isChecked(), true);
      assert.equal(await page.locator(".branch-context").count(), 0);
    }
    assert.equal(await page.evaluate(() => window.__branches), 3);
    // A rejected cosmetic transition must not prevent rendering the committed state.
    await page.evaluate(() => {
      PollMotion.leave = async () => {
        throw new Error("cancelled test effect");
      };
    });
    await page.getByLabel("New features", { exact: true }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByRole("heading", {
        name: "What currently feels missing?",
        exact: true,
      })
      .waitFor();
    s = await state();
    assert.equal(s.answers.focus, "features");
    assert.equal(s.current, "missing_features");
    assert.equal(s.answers.both_reason, undefined);
    assert.equal(await page.locator("#error").textContent(), "");
    if (reducedMotion === "reduce")
      assert.equal(
        await page.evaluate(() => document.getAnimations().length),
        0,
      );
    assert.deepEqual(
      await page.evaluate(() => {
        window.__sample = false;
        return window.__overflow;
      }),
      [],
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      height,
      reducedMotion,
      branches: 3,
      persistence: true,
      rapidSubmit: true,
      back: true,
      cancelledAnimation: true,
      overflow: false,
    });
    await context.close();
  }
}
// Count formatting, zero/failure hiding, and wrapping are independent of survey load.
for (const count of [0, 1, 37, 1926, 1926000000, null]) {
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    locale: "es-CO",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.route("**/api/poll/completions", (r) =>
    count === null
      ? r.abort()
      : r.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ completedCount: count }),
        }),
  );
  await page.goto(base + "/poll");
  await page.getByRole("button", { name: "Start survey" }).waitFor();
  if (count) {
    await page.locator("#completion-count:not([hidden])").waitFor();
    const expected = await page.evaluate(
      (n) =>
        `${new Intl.NumberFormat().format(n)} ${n === 1 ? "person" : "people"} completed this poll`,
      count,
    );
    assert.equal(
      await page.locator("#completion-count").textContent(),
      expected,
    );
  } else
    assert.equal(await page.locator("#completion-count").isVisible(), false);
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= 320),
  );
  await page.getByRole("button", { name: "Start survey" }).click();
  await page.getByRole("heading", { name: "How often do you use" }).waitFor();
  await context.close();
}
console.log(
  JSON.stringify(
    { results, countGrammarAndLocale: true, zeroAndFailureHidden: true },
    null,
    2,
  ),
);
await browser.close();
if (process.env.POLL_BROWSER_HARNESS) process.exit(0);
