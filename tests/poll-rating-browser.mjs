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
const sizes = [
  [320, 640],
  [390, 844],
  [820, 1180],
  [844, 390],
  [1440, 900],
  [1920, 1080],
];
const ratings = [
  "satisfaction",
  "navigation",
  "lab_ease",
  "cloud_reliability",
  "communication",
];
const results = [];
for (const [width, height] of sizes) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 1000,
    reducedMotion:
      process.env.POLL_TEST_MOTION === "on" ? "no-preference" : "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/poll");
  await page.getByRole("button", { name: "Start survey" }).click();
  await page.locator(".question").waitFor();
  async function state() {
    return (await page.request.get(base + "/api/poll")).json();
  }
  async function mutation(path, data) {
    const r = await page.request.post(base + "/api/poll" + path, {
      data,
      headers: { "x-poll-request": "1" },
    });
    assert.equal(r.status(), 200, await r.text());
    return r.json();
  }
  for (const id of ratings) {
    let s = await state();
    for (let n = 0; s.current !== id && n < 40; n++) {
      const q = s.path.find((q) => q.id === s.current);
      assert.ok(q, "target rating must be reachable: " + id);
      const value =
        q.id === "lab_use"
          ? "often"
          : q.id === "cloud_use"
            ? "regular"
            : q.type === "rating"
              ? 3
              : q.optional
                ? null
                : q.type === "multiple"
                  ? [q.options[0].value]
                  : q.type === "ranking"
                    ? q.options.map((o) => o.value)
                    : q.options[0].value;
      s = await mutation("/answer", {
        questionId: q.id,
        value,
        advance: true,
        revision: s.revision,
      });
    }
    await page.reload();
    await page.locator(".rating").waitFor();
    const title = await page.locator("main h1").textContent();
    assert.equal(await page.locator("input:checked").count(), 0);
    assert.equal(
      await page.getByRole("button", { name: "Continue" }).isDisabled(),
      true,
    );
    for (const value of [1, 5, 2, 4, 3]) {
      const card = page.locator(".rating .choice").nth(value - 1);
      if (width < 1000) await card.tap();
      else await card.click();
      assert.equal(
        await page.locator(".rating input:checked").inputValue(),
        String(value),
      );
      await page.waitForFunction(
        () =>
          document.querySelector("#save-status").textContent ===
          "Saved automatically",
      );
      assert.equal((await state()).answers[id], value);
      const centered = await card.locator(".choice-label").evaluate((n) => {
        const a = n.getBoundingClientRect(),
          b = n.parentElement.getBoundingClientRect();
        return Math.abs((a.top + a.bottom - b.top - b.bottom) / 2) < 2;
      });
      assert.ok(centered, `${width} ${id} numeral centered`);
      assert.equal(
        await page.getByRole("button", { name: "Continue" }).isEnabled(),
        true,
      );
    }
    // Native radio arrows and the in-group numeric shortcut retain numeric values.
    await page.locator(".rating input").nth(2).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator(".rating input:checked").inputValue(), "4");
    await page.keyboard.press("5");
    assert.equal(await page.locator(".rating input:checked").inputValue(), "5");
    await page.waitForFunction(
      () =>
        document.querySelector("#save-status").textContent ===
        "Saved automatically",
    );
    assert.equal((await state()).answers[id], 5);
    await page.reload();
    await page.locator(".rating").waitFor();
    assert.equal(await page.locator(".rating input:checked").inputValue(), "5");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForFunction(
      (t) => document.querySelector("main h1").textContent !== t,
      title,
    );
    await page.getByRole("button", { name: "Back", exact: false }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    assert.equal(await page.locator(".rating input:checked").inputValue(), "5");
    await page.locator(".rating .choice").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForFunction(
      (t) => document.querySelector("main h1").textContent !== t,
      title,
    );
    if (id === "satisfaction") {
      const s = await state();
      assert.equal(s.answers.satisfaction, 1);
      assert.equal(s.answers.satisfaction_high, undefined);
      assert.equal(s.current, "satisfaction_low");
    }
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert.ok(
      dimensions.scroll <= width && dimensions.client === width,
      JSON.stringify({ width, id, ...dimensions }),
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.getAnimations().length === 0);
  assert.deepEqual(errors, []);
  results.push({
    width,
    height,
    ratings: ratings.length,
    mouse: true,
    touch: width < 1000,
    keyboard: true,
    savedValues: true,
    resume: true,
    backEdit: true,
    reducedMotion: true,
  });
  await context.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
if (process.env.POLL_BROWSER_HARNESS) process.exit(0);
