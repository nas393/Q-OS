import test from "node:test";
import assert from "node:assert/strict";
import { tickSimulation } from "../src/lib/simulation/engine.ts";

/** @returns {import("../src/lib/simulation/types.ts").SimulationState} */
const base = () => ({
  worldId: "q-world", version: 0, simulatedAt: Date.UTC(2026, 10, 23, 9), lastWallClockAt: 0,
  speed: 1, paused: false,
  employees: [{
    id: "e1", name: "Maya", role: "Analyst", department: "Finance", reportsTo: "cfo", tier: "workforce", skills: ["analysis"],
    personality: { conscientiousness: 80, sociability: 50, curiosity: 70 },
    position: { x: 0, y: 0, z: 0 }, destination: null, activity: "idle", status: "active",
    energy: 90, focus: 90, morale: 70, stress: 10, currentTaskId: null,
    schedule: { startHour: 8, endHour: 17, breakAtHour: 13 }, lastDecisionAt: 0,
  }],
  tasks: [{ id: "t1", title: "Review forecast", department: "Finance", requiredSkills: ["analysis"], priority: 3, effortRemaining: 0.01, status: "queued", assigneeId: null, dueAt: null, createdAt: 1 }],
  events: [],
});

test("paused simulation does not advance or mutate state", () => {
  const state = { ...base(), paused: true };
  const result = tickSimulation(state, 60_000);
  assert.equal(result.state, state);
  assert.deepEqual(result.emitted, []);
});

test("employee autonomously selects eligible simulation work and completes it", () => {
  const result = tickSimulation(base(), 60_000);
  assert.equal(result.state.tasks[0].status, "completed");
  assert.equal(result.state.tasks[0].assigneeId, "e1");
  assert.equal(result.state.employees[0].morale, 72);
  assert.ok(result.emitted.some((event) => event.type === "employee.started_task"));
  assert.ok(result.emitted.some((event) => event.type === "employee.finished_task"));
  assert.ok(result.emitted.every((event) => event.source === "simulation"));
});

test("employees cannot claim work outside their department or skills", () => {
  const state = base();
  state.tasks[0].department = "Legal";
  const result = tickSimulation(state, 60_000);
  assert.equal(result.state.tasks[0].status, "queued");
  assert.equal(result.state.employees[0].activity, "idle");
});

test("speed multiplier advances the simulation clock and movement is incremental", () => {
  const state = base();
  state.employees[0].destination = { x: 10, y: 0, z: 0 };
  const result = tickSimulation(state, 10_000);
  assert.ok(result.state.simulatedAt - state.simulatedAt === 10_000);
  assert.ok(result.state.employees[0].position.x > 0);
  assert.ok(result.state.employees[0].position.x < 10);
  assert.equal(result.state.employees[0].activity, "walking");
});
