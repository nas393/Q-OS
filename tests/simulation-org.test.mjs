import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_EMPLOYEES, LEADERSHIP_TEAM, directReports, validateOrgChart } from "../src/lib/simulation/seed.ts";

test("fictional workforce is larger than the leadership team", () => {
  const leaders = INITIAL_EMPLOYEES.filter((employee) => employee.tier === "leadership");
  const workforce = INITIAL_EMPLOYEES.filter((employee) => employee.tier === "workforce");
  assert.equal(leaders.length, LEADERSHIP_TEAM.length);
  assert.ok(workforce.length > leaders.length);
  assert.equal(workforce.length, 24); // 10 executives + 24 employees = 34 fictional agents
});

test("every fictional employee reports to a valid executive", () => {
  assert.deepEqual(validateOrgChart(), []);
});

test("the CEO leads every executive, and each team lead has four direct reports", () => {
  assert.equal(directReports("ceo").length, LEADERSHIP_TEAM.length - 1);
  for (const seat of LEADERSHIP_TEAM) {
    if (seat.id === "ceo") continue;
    const reports = directReports(seat.id).length;
    if (reports > 0) assert.equal(reports, 4, seat.id);
  }
});

// Known gap, not a pass: these executives have no team in the seed yet, so their department tasks have no one to do them.
test("CTO, CMO and Chief Legal & Risk Officer each have a team of four", { todo: "No team seeded for these three executives yet." }, () => {
  for (const id of ["cto", "cmo", "clo"]) assert.equal(directReports(id).length, 4, id);
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
