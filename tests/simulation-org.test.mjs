import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_EMPLOYEES, LEADERSHIP_TEAM, directReports, validateOrgChart } from "../src/lib/simulation/seed.ts";

test("fictional workforce is larger than the leadership team", () => {
  const leaders = INITIAL_EMPLOYEES.filter((employee) => employee.tier === "leadership");
  const workforce = INITIAL_EMPLOYEES.filter((employee) => employee.tier === "workforce");
  assert.equal(leaders.length, LEADERSHIP_TEAM.length);
  assert.ok(workforce.length > leaders.length);
  assert.equal(workforce.length, 20);
});

test("every fictional employee reports to a valid executive", () => {
  assert.deepEqual(validateOrgChart(), []);
  for (const seat of LEADERSHIP_TEAM) {
    assert.ok(directReports(seat.id).length >= 4);
  }
});

test("each agent has a distinct identity and simulation-ready state", () => {
  const ids = INITIAL_EMPLOYEES.map((employee) => employee.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const employee of INITIAL_EMPLOYEES) {
    assert.ok(employee.name && employee.role && employee.department);
    assert.ok(employee.skills.length > 0);
    assert.ok(employee.schedule.endHour > employee.schedule.startHour);
  }
});
