const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const baseURL = process.env.TEST_POLL_BROWSER_URL;
if (!baseURL)
  throw new Error(
    "Set TEST_POLL_BROWSER_URL to a dedicated local/staging backend.",
  );
if (process.env.POLL_BROWSER_HARNESS)
  await import(process.env.POLL_BROWSER_HARNESS);
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.POLL_BROWSER_EXECUTABLE
    ? { executablePath: process.env.POLL_BROWSER_EXECUTABLE }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
  ],
});
const results = [];
for (const [name, width, height] of [
  ["iphone", 390, 844],
  ["small-phone", 320, 640],
  ["ipad", 820, 1180],
  ["landscape", 844, 390],
  ["desktop", 1440, 900],
  ["wide", 1920, 1080],
]) {
  const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 1000,
      isMobile: width < 600,
      reducedMotion:
        process.env.POLL_TEST_MOTION === "on" ? "no-preference" : "reduce",
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL + "/poll");
  await page.getByRole("button", { name: "Start survey" }).waitFor();
  assert.equal(
    await page.evaluate(() =>
      document.querySelector("header").contains(document.querySelector("main")),
    ),
    false,
  );
  if (process.env.POLL_TEST_MOTION !== "on")
    assert.equal(
      await page.evaluate(() => document.getAnimations().length),
      0,
      name + " reduced motion must disable animated effects",
    );
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    name + " landing overflow",
  );
  if (process.env.POLL_SCREENSHOTS) await page.waitForTimeout(1500);
  if (process.env.POLL_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.POLL_SCREENSHOTS}/${name}-landing.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: "Start survey" }).click();
  await page.getByRole("heading", { name: "How often do you use" }).waitFor();
  await page.getByLabel("Almost every day").check();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("heading", { name: "How often do you use" }).waitFor();
  assert.equal(await page.getByLabel("Almost every day").isChecked(), true);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "What do you mainly" }).waitFor();
  await page.getByRole("button", { name: "Back", exact: false }).click();
  await page.getByRole("heading", { name: "How often do you use" }).waitFor();
  await page.getByLabel("A few times a week").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "What do you mainly" }).waitFor();
  let rankings = 0,
    questions = 0;
  for (let limit = 0; limit < 50; limit++) {
    const heading = await page.locator("main h1").textContent();
    if (heading === "Ready to send your feedback?") break;
    if (
      heading ===
        "If we had to prioritize one for the next release, which would you choose?" ||
      heading ===
        "If you could change one thing about Ultimate Macro right now, what would it be?"
    ) {
      await page.getByRole("button", { name: "Skip", exact: true }).click();
      await page.waitForFunction(
        (old) => document.querySelector("main h1")?.textContent !== old,
        heading,
      );
      continue;
    }
    questions++;
    assert.equal(await page.locator("main h1").count(), 1);
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      name + " question overflow: " + heading,
    );
    if (heading === "Do you use Strategy Lab?")
      await page.getByLabel("Often", { exact: true }).check();
    else if (heading === "What should Ultimate Macro focus on most?")
      await page.getByLabel("Both equally", { exact: true }).check();
    else if (heading === "Which ideas would matter most to you?") {
      await page.getByLabel("Goals", { exact: true }).check();
      await page.getByLabel("Themes", { exact: true }).check();
    } else if (heading === "Put your selected ideas in priority order.") {
      rankings++;
      const up = page.getByRole("button", {
        name: "Move Themes up",
        exact: true,
      });
      if (width < 1000) await up.tap();
      else await up.click();
      assert.equal(
        await page.locator(".rank-label").first().textContent(),
        "Themes",
      );
    } else if (await page.locator("input[type=radio]").count()) {
      await page.locator("input[type=radio]").first().check();
    } else if (await page.locator("input[type=checkbox]").count()) {
      await page.locator("input[type=checkbox]").first().check();
    } else if (await page.locator("textarea,input[type=text]").count()) {
      await page
        .locator("textarea,input[type=text]")
        .fill("Keep it simple and improve failed run recovery.");
    }

    if (
      process.env.POLL_SCREENSHOTS &&
      [
        "How easy is it to find your way around?",
        "Put your selected ideas in priority order.",
        "What would focusing on only one leave unresolved?",
      ].includes(heading)
    ) {
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${process.env.POLL_SCREENSHOTS}/${name}-${heading.startsWith("How") ? "ui" : heading.startsWith("Put") ? "ranking" : "branch"}.png`,
        fullPage: true,
      });
    }
    const continueButton = page.getByRole("button", {
      name: /Continue|Review & submit/,
    });
    await continueButton.click();
    await page.waitForFunction(
      (old) => document.querySelector("main h1")?.textContent !== old,
      heading,
    );
  }
  await page
    .getByRole("button", { name: "Submit feedback", exact: true })
    .click();
  await page.getByRole("heading", { name: "that’s everything." }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "that’s everything." }).waitFor();
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(rankings, 1);
  assert.ok(
    !(await page.locator("main").textContent()).includes("including breaks"),
  );
  if (process.env.POLL_SCREENSHOTS) await page.waitForTimeout(1300);
  if (process.env.POLL_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.POLL_SCREENSHOTS}/${name}-completion.png`,
      fullPage: true,
    });
  results.push({ name, questions, rankings, overflow: false, errors });
  await context.close();
}
// Closing before the debounce fires must restore the browser draft.
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
let page = await context.newPage();
await page.goto(baseURL + "/poll");
await page.getByRole("button", { name: "Start survey" }).click();
await page.getByLabel("Almost every day").check();
await page.close();
page = await context.newPage();
await page.goto(baseURL + "/poll");
await page.getByRole("heading", { name: "How often do you use" }).waitFor();
assert.equal(await page.getByLabel("Almost every day").isChecked(), true);
// Offline edits remain retryable and recover when the connection returns.
await context.setOffline(true);
await page.getByLabel("Occasionally", { exact: true }).check();
await page.waitForTimeout(600);
assert.ok((await page.locator("#error").textContent()).includes("offline"));
await context.setOffline(false);
await page.getByRole("button", { name: "Try again", exact: true }).click();
await page.waitForFunction(
  () =>
    document.querySelector("#save-status").textContent ===
    "Saved automatically",
);
await page.reload();
await page.getByRole("heading", { name: "How often do you use" }).waitFor();
assert.equal(
  await page.getByLabel("Occasionally", { exact: true }).isChecked(),
  true,
);
await context.close();
console.log(
  JSON.stringify(
    { results, immediateCloseResume: true, offlineRecovery: true },
    null,
    2,
  ),
);

{
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto(baseURL + "/poll");
  await page.getByRole("button", { name: "Start survey" }).click();
  await page.getByLabel("Almost every day").check();
  await page.waitForFunction(
    () =>
      document.querySelector("#save-status").textContent ===
      "Saved automatically",
  );
  const serverState = await page.evaluate(() =>
    fetch("/api/poll").then((r) => r.json()),
  );
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        "um-poll-draft-v1",
        JSON.stringify({
          version: s.version,
          questionId: "frequency",
          value: "weekly",
          revision: s.revision - 1,
          inflight: {
            questionId: "frequency",
            value: "daily",
            revision: s.revision - 1,
          },
        }),
      ),
    serverState,
  );
  await page.reload();
  await page.getByRole("heading", { name: "How often do you use" }).waitFor();
  assert.equal(
    await page.getByLabel("A few times a week").isChecked(),
    true,
    "a newer local draft must survive an older save committing while the page closes",
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#save-status").textContent ===
      "Saved automatically",
  );
  let release;
  const hold = new Promise((r) => (release = r));
  let captured;
  const requested = new Promise((r) => (captured = r));
  await page.route("**/api/poll/answer", async (route) => {
    captured();
    await hold;
    await route.continue();
  });
  await page.getByLabel("Occasionally", { exact: true }).check();
  await requested;
  await page.getByRole("button", { name: "Continue" }).click();
  assert.equal(
    await page.getByLabel("Almost every day").isDisabled(),
    true,
    "choices must be locked while Continue awaits an autosave",
  );
  release();
  await page.getByRole("heading", { name: "What do you mainly" }).waitFor();
  await page.unroute("**/api/poll/answer");
  // Single-character shortcuts must never change an answer outside its group.
  await page.getByRole("link", { name: "Ultimate Macro home" }).focus();
  await page.keyboard.press("2");
  assert.equal(await page.locator(".choices input:checked").count(), 0);
  await page.locator("main h1").focus();
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement.tagName === "INPUT"),
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("3");
  assert.equal(await page.locator(".choices input").nth(2).isChecked(), true);
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "How familiar are you" }).waitFor();
  await page.locator(".choices input").first().focus();
  await page.keyboard.press("1");
  await page.evaluate(() => {
    const form = document.querySelector("form");
    form.requestSubmit();
    form.requestSubmit();
    form.requestSubmit();
  });
  await page
    .getByRole("heading", { name: "Do you use Strategy Lab?" })
    .waitFor();
  assert.equal(
    (await page.evaluate(() => fetch("/api/poll").then((r) => r.json())))
      .current,
    "lab_use",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.getAnimations().length === 0);
  await context.close();
  console.log(
    "in-flight draft recovery, navigation lock, and keyboard focus passed",
  );
}
await browser.close();
if (process.env.POLL_BROWSER_HARNESS) process.exit(0);
