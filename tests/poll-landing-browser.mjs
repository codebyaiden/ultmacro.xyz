import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
if (process.env.POLL_BROWSER_HARNESS)
  await import(process.env.POLL_BROWSER_HARNESS);
const base = process.env.TEST_POLL_BROWSER_URL;
if (!base)
  throw new Error("Set TEST_POLL_BROWSER_URL to a dedicated test backend.");
const browser = await chromium.launch({
  executablePath: process.env.POLL_BROWSER_EXECUTABLE,
  args: ["--no-sandbox"],
});
const shots = process.env.POLL_SCREENSHOTS;
if (shots) await mkdir(shots, { recursive: true });
for (const [width, height] of [
  [320, 640],
  [375, 812],
  [390, 844],
  [430, 932],
  [844, 390],
  [820, 1180],
]) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: true,
      isMobile: true,
      reducedMotion,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.landingViolations = [];
      const selectors =
        ".landing,.landing-copy,.landing h1,.landing-action,#start,.time-note,.landing-art,.signal-orbit,.signal-core,.core-icon,.floating-card,.orbit-ring,.orbit-spark,.brand";
      function check() {
        if (document.querySelector(".landing")) {
          const width = innerWidth;
          if (document.documentElement.scrollWidth !== width)
            window.landingViolations.push(
              `page ${document.documentElement.scrollWidth}/${width}`,
            );
          for (const e of document.querySelectorAll(selectors)) {
            const r = e.getBoundingClientRect();
            if (r.left < -0.5 || r.right > width + 0.5)
              window.landingViolations.push(
                `${e.className}: ${r.left}..${r.right}`,
              );
          }
        }
        requestAnimationFrame(check);
      }
      requestAnimationFrame(check);
    });
    await page.goto(base + "/poll");
    // Clipping must not conceal a landing layout regression.
    await page.addStyleTag({
      content: "html,body{overflow-x:visible!important}",
    });
    await page
      .getByRole("button", { name: "Start survey →", exact: true })
      .waitFor();
    await page.waitForTimeout(2200);
    assert.deepEqual(
      await page.evaluate(() => [...new Set(window.landingViolations)]),
      [],
      `${width}/${reducedMotion}`,
    );
    assert.equal(await page.locator(".time-note").textContent(), "5–7 min");
    assert.deepEqual(await page.locator(".floating-card b").allTextContents(), [
      "reliability",
      "new ideas",
    ]);
    assert.equal(await page.locator(".floating-card small").count(), 0);
    const copy = await page.locator(".landing").innerText();
    for (const removed of [
      "small answers. real direction.",
      "This survey exists purely to improve Ultimate Macro.",
      "less friction. more trust.",
      "it starts with a little feedback.",
    ])
      assert.ok(!copy.includes(removed));
    assert.equal(await page.locator(".topbar #survey").count(), 0);
    assert.ok(
      await page.evaluate(() => {
        const h = document.querySelector("h1"),
          range = document.createRange();
        range.selectNodeContents(h);
        return [...range.getClientRects()].every(
          (r) => r.left >= 0 && r.right <= innerWidth,
        );
      }),
      "headline text must fit",
    );
    const alignment = await page.evaluate(() =>
      Math.abs(
        document.querySelector(".brand").getBoundingClientRect().left -
          document.querySelector(".landing-copy").getBoundingClientRect().left,
      ),
    );
    assert.ok(alignment < 1, "brand and copy share a column");
    assert.ok(
      await page
        .locator(".core-icon")
        .evaluate((e) => e.complete && e.naturalWidth > 0),
    );
    if (shots)
      await page.screenshot({
        path: `${shots}/landing-${width}-${reducedMotion}.png`,
        fullPage: true,
      });
    await page
      .getByRole("button", { name: "Start survey →", exact: true })
      .tap();
    await page.locator(".question").waitFor();
    assert.deepEqual(errors, []);
    console.log(
      `${width}×${height} ${reducedMotion}: bounds, animation, copy, headline, mascot, Start PASS`,
    );
    await context.close();
  }
}
await browser.close();
process.exit(0);
