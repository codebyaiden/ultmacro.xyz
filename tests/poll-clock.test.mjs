import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const context = { window: {}, module: { exports: {} } };
vm.runInNewContext(readFileSync("src/poll-clock.js", "utf8"), context);
const { create } = context.module.exports;
function fixture() {
  let time = 0;
  const clock = create({ now: () => time });
  return {
    clock,
    advance: (ms) => {
      time += ms;
    },
  };
}
test("active clock counts visible interaction time", () => {
  const { clock, advance } = fixture();
  clock.start();
  advance(5000);
  assert.equal(clock.read(), 5000);
  clock.activity();
  advance(4000);
  assert.equal(clock.read(), 9000);
});
test("overnight idle is excluded rather than shown as days", () => {
  const { clock, advance } = fixture();
  clock.start();
  advance(86400000);
  assert.equal(clock.read(), 45000);
  clock.activity();
  advance(5000);
  assert.equal(clock.read(), 50000);
});
test("hidden time and completed sessions do not accrue", () => {
  const { clock, advance } = fixture();
  clock.start();
  advance(3000);
  clock.visibility(false);
  advance(86400000);
  clock.visibility(true);
  advance(2000);
  assert.equal(clock.read(), 5000);
  clock.stop();
  advance(8000);
  assert.equal(clock.read(), 5000);
});
test("resume retains active duration while reset starts a fresh response", () => {
  const { clock, advance } = fixture();
  clock.start(120000);
  advance(3000);
  assert.equal(clock.read(), 123000);
  clock.start(0);
  advance(2000);
  assert.equal(clock.read(), 2000);
});
