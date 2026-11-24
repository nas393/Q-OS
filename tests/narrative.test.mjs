import test from "node:test";
import assert from "node:assert/strict";
import { keepsFacts, narrateResults, numbersIn } from "../src/lib/simulation/narrative.ts";

const TEMPLATE = "36 actions tracked. 12 closed this week; 5 overdue and escalated to their executive sponsor.";
const result = (id, summary = TEMPLATE) => ({
  id, taskId: "t", projectId: "p", department: "Executive Office", authorId: "a", kind: "actions",
  title: "Action tracker update", summary, metrics: [], publishedAt: 0, day: 1,
});
const world = (results, planner = {}) => ({
  employees: [{ id: "a", name: "Ana" }], results, simulatedAt: 0,
  planner: { startedAt: 0, counter: 0, nextTemplate: {}, ...planner },
});
const NOW = 1_000_000;

test("numbers are read with thousands separators removed", () => {
  assert.deepEqual(numbersIn("€4,205k and 83%"), ["4205", "83"]);
  assert.deepEqual(numbersIn("no figures here"), []);
});

test("a reworded summary with the same numbers is accepted", () => {
  assert.equal(keepsFacts(TEMPLATE, "Of the 36 actions tracked, 12 closed this week and 5 are overdue, escalated to their sponsor."), true);
});

test("a summary that drops a number is rejected", () => {
  assert.equal(keepsFacts(TEMPLATE, "Most actions are closed this week; 5 are overdue out of 36 tracked."), false);
});

test("a summary that adds a number is rejected", () => {
  assert.equal(keepsFacts(TEMPLATE, "36 actions tracked, 12 closed, 5 overdue and 2 escalated to the sponsor."), false);
});

test("a summary that is too short or contains broken text is rejected", () => {
  assert.equal(keepsFacts(TEMPLATE, "36 12 5"), false);
  assert.equal(keepsFacts(TEMPLATE, "undefined: 36 tracked, 12 closed, 5 overdue overall."), false);
});

test("the model's wording replaces the template when the numbers hold", async () => {
  const ask = async () => ({ summary: "Of the 36 actions tracked, 12 closed this week and 5 are overdue, escalated to the sponsor." });
  const out = await narrateResults(world([result("r1")]), NOW, ask);
  assert.equal(out.results[0].source, "ai");
  assert.match(out.results[0].summary, /^Of the 36 actions/);
});

test("a rewording that breaks the numbers keeps the template and is never retried", async () => {
  let calls = 0;
  const ask = async () => { calls++; return { summary: "Most actions closed; some overdue, 36 tracked in total." }; };
  const first = await narrateResults(world([result("r1")]), NOW, ask);
  assert.equal(first.results[0].source, "template");
  assert.equal(first.results[0].summary, TEMPLATE);
  const second = await narrateResults(first, NOW + 60 * 60 * 1000, ask);
  assert.equal(calls, 1, "a rejected result is not asked again");
  assert.equal(second.results[0].source, "template");
});

test("at most the newest few results are reworded in one run", async () => {
  const results = [1, 2, 3, 4, 5].map(i => result("r" + i));
  let calls = 0;
  const ask = async () => { calls++; return { summary: TEMPLATE.replace("tracked", "in the tracker") }; };
  const out = await narrateResults(world(results), NOW, ask);
  assert.equal(calls, 3);
  assert.deepEqual(out.results.map(r => r.source), [undefined, undefined, "ai", "ai", "ai"]);
});

test("nothing is asked again inside the waiting time", async () => {
  let calls = 0;
  const ask = async () => { calls++; return { summary: TEMPLATE }; };
  const state = world([result("r1")], { narrativeAt: NOW - 60_000 });
  await narrateResults(state, NOW, ask);
  assert.equal(calls, 0);
});

test("an unreachable model leaves results unmarked, so they are tried again later", async () => {
  const ask = async () => { throw new Error("AI is not configured"); };
  const out = await narrateResults(world([result("r1"), result("r2")]), NOW, ask);
  assert.deepEqual(out.results.map(r => r.source), [undefined, undefined]);
  assert.equal(out.results[0].summary, TEMPLATE);
  assert.equal(out.planner.narrativeAt, NOW, "the attempt is recorded so the next run waits");
});

test("a state with no results is returned untouched", async () => {
  const state = world([]);
  assert.equal(await narrateResults(state, NOW, async () => ({ summary: "x" })), state);
});
