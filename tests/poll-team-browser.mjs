import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
if (!process.env.POLL_TEST_PGLITE_MODULE)
  throw Error(
    "Set POLL_TEST_PGLITE_MODULE to isolated external PGlite test tooling.",
  );
const { auth, server } = await import("./helpers/poll-team-browser-server.mjs");
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
const base = "http://127.0.0.1:3127",
  results = [];
for (const [name, width, height] of [
  ["phone", 390, 844],
  ["tablet", 820, 1180],
  ["desktop", 1440, 900],
]) {
  const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 1000,
      reducedMotion: name === "phone" ? "reduce" : "no-preference",
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/poll/team");
  assert.equal(
    await page.locator("h1").textContent(),
    "A private space for the team.",
  );
  const invite = await auth.createInvite("test " + name);
  await page.goto(base + "/poll/team/access/" + invite.token);
  await page.getByRole("button", { name: "Open staff dashboard" }).click();
  await page.waitForURL(base + "/poll/team");
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  const cookie = (await context.cookies()).find(
    (c) => c.name === "um_poll_staff",
  );
  assert.ok(cookie.httpOnly);
  assert.equal(cookie.sameSite, "Strict");
  async function shot(suffix) {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " " + suffix + " overflow",
    );
    if (process.env.POLL_SCREENSHOTS) {
      if (["feedback", "response"].includes(suffix))
        await page.evaluate(() =>
          document.querySelector("#content").scrollIntoView({ block: "start" }),
        );
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${process.env.POLL_SCREENSHOTS}/${name}-${suffix}.png`,
        fullPage: !["feedback", "response"].includes(suffix),
      });
    }
  }
  await shot("overview");
  await page.getByRole("button", { name: "Refine segment" }).click();
  await page
    .getByLabel("Experience", { exact: true })
    .selectOption("experienced");
  await page.getByLabel("Strategy Lab", { exact: true }).selectOption("often");
  await page.getByLabel("Satisfaction at most").selectOption("3");
  await shot("filters");
  await page.getByRole("button", { name: "Apply segment" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector("#content").getAttribute("aria-busy") === "false",
  );
  const totals = await page.locator(".metric dd").first().textContent();
  assert.ok(!totals.startsWith("34"));
  await page.getByRole("button", { name: "Questions", exact: true }).click();
  await page.getByLabel("Explore a question").waitFor();
  await page.getByLabel("Explore a question").selectOption("focus");
  await page
    .getByRole("heading", { name: "What should Ultimate Macro focus on most?" })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Why do you prefer that we focus on both? →",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", {
      name: "Why do you prefer that we focus on both?",
      exact: true,
    })
    .waitFor();
  await shot("branch");
  await page.getByRole("button", { name: "Clear branch" }).click();
  await page
    .getByRole("heading", { name: "What should Ultimate Macro focus on most?" })
    .waitFor();
  await page.getByRole("button", { name: "Refine segment" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(
    await page.getByLabel("Experience", { exact: true }).inputValue(),
    "",
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#content").getAttribute("aria-busy") === "false",
  );
  await page.getByLabel("Explore a question").selectOption("feature_rank");
  await page
    .getByRole("heading", {
      name: "Put your selected ideas in priority order.",
    })
    .waitFor();
  await shot("rankings");
  await page
    .getByRole("button", { name: "Written feedback", exact: true })
    .click();
  await page.getByLabel("Search written answers").waitFor();
  await page.getByLabel("Question", { exact: true }).selectOption("final");
  await page.getByLabel("Search written answers").fill("RECOVERY");
  await page.getByRole("button", { name: "Search →", exact: true }).click();
  await page.locator(".feedback-card").first().waitFor();
  assert.equal(await page.evaluate(() => window.feedbackExecuted), undefined);
  await shot("feedback");
  await page.locator(".feedback-card .response-link").first().click();
  await page.locator(".response-path").waitFor();
  assert.ok((await page.locator(".path-item").count()) > 16);
  await shot("response");
  await page.getByRole("button", { name: "Back to results" }).click();
  await page.locator(".feedback-card").first().waitFor();
  await page.getByRole("button", { name: "Responses", exact: true }).click();
  await page.locator("table").waitFor();
  assert.equal(await page.locator("tbody tr").count(), 25);
  await page.getByRole("button", { name: "Next 25" }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 9,
  );
  await shot("responses");
  await page
    .getByRole("button", { name: "Written feedback", exact: true })
    .click();
  await page.getByLabel("Search written answers").fill("a phrase nobody wrote");
  await page.getByRole("button", { name: "Search →" }).click();
  await page
    .getByRole("heading", { name: "No words match this search." })
    .waitFor();
  await shot("empty");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Refresh ↻" }).click();
  await page
    .getByRole("heading", { name: "Feedback could not load." })
    .waitFor();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Refresh ↻" }).click();
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Questions", exact: true }).click();
  await page.getByRole("button", { name: "Responses", exact: true }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".metric").count(), 4);
  await page.reload();
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  await auth.revoke("invite", invite.id);
  await page.getByRole("button", { name: "Refresh ↻" }).click();
  await page
    .getByRole("heading", { name: "Staff access is no longer active." })
    .waitFor();
  assert.equal(await page.locator(".metric").count(), 0);
  const fresh = await auth.createInvite("logout " + name);
  await page.goto(base + "/poll/team/access/" + fresh.token);
  await page.getByRole("button", { name: "Open staff dashboard" }).click();
  await page
    .getByText("34 responses · 28 completed · current survey", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("heading", { name: "A private space for the team." })
    .waitFor();
  assert.equal(
    (await context.cookies()).some((c) => c.name === "um_poll_staff"),
    false,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  results.push({ name, flows: true, overflow: false, errors });
  await context.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
process.exit(0);
