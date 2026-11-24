import test from "node:test";
import assert from "node:assert/strict";
import { createWorld, advanceWorld, summarize, MAX_CATCHUP_REAL_MS, PROJECTS_PER_DEPARTMENT, SIM_MINUTES_PER_REAL_MINUTE } from "../src/lib/simulation/autopilot.ts";
import { INITIAL_COMPANY, PROJECT_TEMPLATES, WRITERS, seededRandom, writeDeliverable } from "../src/lib/simulation/catalogue.ts";
import { applyRecruitAction } from "../src/lib/simulation/recruit.ts";

const T0 = Date.UTC(2026, 10, 24, 6, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const world = createWorld(T0);
/* Advance the stored company by real minutes, the way the server does on each request. */
const later = (state, minutes) => advanceWorld(state, state.lastWallClockAt + minutes * MIN);

test("a new company opens two active projects in every department", () => {
  for (const dept of Object.keys(PROJECT_TEMPLATES)) {
    const open = world.projects.filter(p => p.department === dept && p.status !== "done");
    assert.equal(open.length, PROJECTS_PER_DEPARTMENT, dept);
  }
  assert.ok(world.tasks.length > 0);
});

test("the same history always produces the same company", () => {
  assert.deepEqual(createWorld(T0), createWorld(T0));
  const next = () => advanceWorld(world, world.lastWallClockAt + 90 * MIN);
  assert.deepEqual(next(), next());
});

test("one real minute is six simulated minutes at normal speed", () => {
  const next = advanceWorld(world, world.lastWallClockAt + MIN);
  assert.equal(next.simulatedAt - world.simulatedAt, MIN * SIM_MINUTES_PER_REAL_MINUTE);
});

test("a paused company keeps its simulated clock but still records the visit", () => {
  const paused = { ...world, paused: true };
  const next = advanceWorld(paused, paused.lastWallClockAt + 30 * MIN);
  assert.equal(next.simulatedAt, paused.simulatedAt);
  assert.equal(next.lastWallClockAt, paused.lastWallClockAt + 30 * MIN);
});

test("catch-up is capped, so a long absence still resumes quickly", () => {
  const next = advanceWorld(world, world.lastWallClockAt + 48 * HOUR);
  assert.equal(next.simulatedAt - world.simulatedAt, MAX_CATCHUP_REAL_MS * SIM_MINUTES_PER_REAL_MINUTE);
});

test("finished work becomes a result with a title, a summary and metrics", () => {
  const s = later(world, 150);
  assert.ok(s.results.length >= 1, "a working day should publish at least one result");
  const seen = new Set();
  for (const r of s.results) {
    assert.ok(!seen.has(r.taskId), "one result per finished task");
    seen.add(r.taskId);
    const task = s.tasks.find(t => t.id === r.taskId);
    assert.equal(task?.status, "completed");
    assert.ok(r.title.length > 0);
    assert.ok(r.metrics.length >= 1, r.title);
    assert.doesNotMatch(r.summary, /undefined|NaN/);
  }
});

test("company numbers stay inside their believable ranges", () => {
  const co = later(world, 300).company;
  assert.ok(co.revenueRunRateK >= 3600 && co.revenueRunRateK <= 5200, `revenue ${co.revenueRunRateK}`);
  assert.ok(co.grossMarginPct >= 27 && co.grossMarginPct <= 36, `margin ${co.grossMarginPct}`);
  assert.ok(co.pipelineCoverage >= 2 && co.pipelineCoverage <= 3.8, `coverage ${co.pipelineCoverage}`);
  assert.ok(co.onTimePct >= 0 && co.onTimePct <= 100, `on time ${co.onTimePct}`);
  assert.ok(co.engagement >= 60 && co.engagement <= 90, `engagement ${co.engagement}`);
  assert.ok(co.cashRunwayMonths >= 9 && co.cashRunwayMonths <= 24, `runway ${co.cashRunwayMonths}`);
  assert.ok(co.supplierOnTimePct >= 84 && co.supplierOnTimePct <= 98, `supplier ${co.supplierOnTimePct}`);
  assert.ok(co.mttrMinutes >= 25 && co.mttrMinutes <= 70, `mttr ${co.mttrMinutes}`);
  assert.notDeepEqual(co, INITIAL_COMPANY, "work should move the numbers");
});

test("projects move forward, finish cleanly, and reopen so no department sits idle", () => {
  const s = later(world, 300);
  for (const dept of Object.keys(PROJECT_TEMPLATES)) {
    const open = s.projects.filter(p => p.department === dept && p.status !== "done");
    assert.equal(open.length, PROJECTS_PER_DEPARTMENT, dept);
  }
  assert.ok(s.projects.some(p => p.progress > 0 || p.status === "done"), "some project should make progress");
  for (const p of s.projects.filter(p => p.status === "done")) {
    assert.equal(p.progress, 100);
    assert.ok(p.taskIds.every(id => s.tasks.find(t => t.id === id)?.status === "completed"), p.title);
  }
});

test("queued work nobody can do becomes a hiring request that waits at the approval gate", () => {
  const s = later(world, 300);
  const tech = s.recruitment.requests.filter(r => r.department === "Technology");
  assert.ok(tech.length >= 1, "technology needs a hire for the data pipeline");
  assert.equal(tech[0].requestedBy, "cto");
  assert.equal(tech[0].status, "awaiting-approval");
  assert.ok(tech.every(r => r.approvals.every(a => a.stage !== "hire")), "nothing is approved on its own");
  const pipeline = s.projects.find(p => p.department === "Technology" && p.title === "Analytics data pipeline");
  assert.equal(pipeline?.status, "at-risk");
});

test("a declined need is not raised again straight away", () => {
  let s = later(world, 300);
  const req = s.recruitment.requests.find(r => r.department === "Technology" && r.status === "awaiting-approval");
  assert.ok(req, "precondition: a technology request is waiting");
  const decided = applyRecruitAction(s, { type: "approve", requestId: req.id, actorId: "ceo", decision: "declined" }, s.simulatedAt);
  assert.equal(decided.ok, true);
  s = decided.state;
  const before = s.recruitment.requests.filter(r => r.department === "Technology").length;
  const after = later(s, 60).recruitment.requests.filter(r => r.department === "Technology").length;
  assert.equal(after, before);
});

test("the seeded company works the same on every run of the same task", () => {
  const a = seededRandom("task-1|1000");
  const b = seededRandom("task-1|1000");
  for (let i = 0; i < 50; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("every task kind in the project templates has a writer", () => {
  for (const templates of Object.values(PROJECT_TEMPLATES)) {
    for (const template of templates) {
      for (const task of template.tasks) assert.equal(typeof WRITERS[task.kind], "function", task.kind);
    }
  }
});

test("an unknown task kind falls back to a neutral deliverable", () => {
  const out = writeDeliverable("not-a-kind", { rng: seededRandom("x"), co: { ...INITIAL_COMPANY }, monthName: "November", day: 1, author: "A" }, "Fallback title");
  assert.equal(out.title, "Fallback title");
  assert.ok(out.summary.length > 0);
});

test("a break hands unfinished work back to the queue, so it can be picked up again", () => {
  const worker = world.employees.find(e => e.currentTaskId && e.destination === null);
  assert.ok(worker, "precondition: someone is mid-task at their desk");
  const task = world.tasks.find(t => t.id === worker.currentTaskId);
  assert.equal(task.status, "in-progress");
  // 12:50 UTC: the next tick reaches the 13:00 break
  const atBreak = { ...world, simulatedAt: Date.UTC(2026, 10, 24, 12, 50), lastWallClockAt: world.lastWallClockAt };
  const after = advanceWorld(atBreak, atBreak.lastWallClockAt + 100_000); // 100 real seconds = 10 simulated minutes
  const moved = after.tasks.find(t => t.id === task.id);
  assert.equal(moved.status, "queued");
  assert.equal(moved.assigneeId, null);
});

test("work keeps flowing across several simulated days, with no department left idle", () => {
  let s = world;
  const perDay = [];
  for (let day = 0; day < 3; day++) {
    const before = s.results.length;
    s = later(s, 240);
    perDay.push(s.results.length - before);
  }
  for (const count of perDay) assert.ok(count >= 5, `results per day: ${perDay.join(", ")}`);
  for (const dept of Object.keys(PROJECT_TEMPLATES)) {
    assert.equal(s.projects.filter(p => p.department === dept && p.status !== "done").length, PROJECTS_PER_DEPARTMENT, dept);
  }
});

test("the overview counts agree with the company it describes", () => {
  const s = later(world, 300);
  const sum = summarize(s);
  assert.equal(sum.activeProjects + sum.atRiskProjects + sum.doneProjects, s.projects.length);
  assert.equal(sum.results, s.results.length);
  assert.equal(sum.completedTasks + sum.openTasks, s.tasks.length);
});
