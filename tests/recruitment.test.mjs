import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_EMPLOYEES, validateOrgChart } from "../src/lib/simulation/seed.ts";
import { CANDIDATE_POOL, TRAINING_CATALOGUE } from "../src/lib/simulation/candidates.ts";
import { applyRecruitAction, raiseRequest, staffingNeeds, shortlistFor, trainingPlanFor } from "../src/lib/simulation/recruit.ts";

const NOW = 1_000;
const ok = (result) => {
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  return result;
};
const task = (over = {}) => ({
  id: "t", title: "Task", department: "People & Culture", requiredSkills: [], priority: 2, effortRemaining: 3,
  status: "queued", assigneeId: null, dueAt: null, createdAt: 0, ...over,
});
const world = (extra = {}) => ({
  worldId: "test-world", version: 0, simulatedAt: 0, lastWallClockAt: 0, speed: 1, paused: false,
  employees: structuredClone(INITIAL_EMPLOYEES), tasks: [], events: [], ...extra,
});
const withEmployee = (s, id, patch) => ({ ...s, employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
const raise = (s, requestedBy, department, extra = {}) =>
  raiseRequest(s, { requestedBy, department, roleTitle: "Recruiter", skills: ["talent", "recruitment", "learning"], reason: "Demand from queued work.", ...extra }, NOW);
const sourced = (over = {}) => {
  let s = ok(raise(world(), "chro", "People & Culture", over)).state;
  const id = s.recruitment.requests.at(-1).id;
  s = ok(applyRecruitAction(s, { type: "open-search", requestId: id, actorId: "hr-01" }, NOW + 1)).state;
  s = ok(applyRecruitAction(s, { type: "source", requestId: id }, NOW + 2)).state;
  return { s, id };
};

test("queued work with no covering skill creates a staffing need for that department's executive", () => {
  const s = world({ tasks: [task({ title: "Negotiate supplier terms", requiredSkills: ["negotiation"] })] });
  const need = staffingNeeds(s).find((n) => n.department === "People & Culture");
  assert.ok(need, "expected a need for People & Culture");
  assert.equal(need.requestedBy, "chro");
  assert.deepEqual(need.skills, ["negotiation"]);
  assert.deepEqual(need.taskTitles, ["Negotiate supplier terms"]);
});

test("covered skills and completed work do not create a need", () => {
  const s = world({
    tasks: [
      task({ id: "a", requiredSkills: ["talent"], status: "queued" }),
      task({ id: "b", requiredSkills: ["negotiation"], status: "completed" }),
    ],
  });
  assert.equal(staffingNeeds(s).some((n) => n.department === "People & Culture"), false);
});

test("only an executive can raise a need, and only for their own department (the CEO excepted)", () => {
  const s = world();
  assert.equal(raise(s, "hr-01", "People & Culture").ok, false, "a workforce member cannot raise a need");
  assert.equal(raise(s, "chro", "Finance").ok, false, "an executive cannot raise a need for another department");
  assert.equal(raise(s, "cfo", "Finance").ok, true);
  assert.equal(raise(s, "ceo", "Finance").ok, true, "the CEO can raise a need for any department");
});

test("a request needs a role title and at least one skill", () => {
  const s = world();
  assert.equal(raise(s, "chro", "People & Culture", { roleTitle: "x" }).ok, false);
  assert.equal(raise(s, "chro", "People & Culture", { skills: ["  ", ""] }).ok, false);
});

test("skills are trimmed, lowercased and de-duplicated, and a new request starts for review", () => {
  const r = ok(raise(world(), "chro", "People & Culture", { skills: [" Talent ", "talent", "Recruitment"] }));
  const req = r.state.recruitment.requests[0];
  assert.deepEqual(req.skills, ["talent", "recruitment"]);
  assert.equal(req.status, "needs-review");
  assert.equal(r.state.events.at(-1).type, "recruitment.requested");
});

test("a department holds at most two open requests", () => {
  let s = world();
  s = ok(raise(s, "chro", "People & Culture")).state;
  s = ok(raise(s, "chro", "People & Culture")).state;
  assert.equal(raise(s, "chro", "People & Culture").ok, false);
});

test("a team at its planned size of six cannot raise another request", () => {
  let s = world();
  for (const n of [1, 2]) {
    const template = s.employees.find((e) => e.id === "hr-01");
    s = { ...s, employees: [...s.employees, { ...template, id: `extra-${n}`, name: `Extra ${n}`, reportsTo: "chro" }] };
  }
  assert.equal(raise(s, "chro", "People & Culture").ok, false);
});

test("only HR can open a search", () => {
  const s = ok(raise(world(), "chro", "People & Culture")).state;
  const id = s.recruitment.requests[0].id;
  assert.equal(applyRecruitAction(s, { type: "open-search", requestId: id, actorId: "ceo" }, NOW).ok, false);
  assert.equal(applyRecruitAction(s, { type: "open-search", requestId: id, actorId: "cfo" }, NOW).ok, false);
  assert.equal(applyRecruitAction(s, { type: "open-search", requestId: id, actorId: "hr-01" }, NOW).ok, true);
});

test("no sourcing happens before HR opens the search", () => {
  const s = ok(raise(world(), "chro", "People & Culture")).state;
  assert.equal(applyRecruitAction(s, { type: "source", requestId: s.recruitment.requests[0].id }, NOW).ok, false);
});

test("the shortlist waits when the head-hunter or the training expert is away", () => {
  const base = ok(raise(world(), "chro", "People & Culture")).state;
  const rid = base.recruitment.requests[0].id;
  const searching = ok(applyRecruitAction(base, { type: "open-search", requestId: rid, actorId: "hr-01" }, NOW)).state;
  assert.equal(applyRecruitAction(withEmployee(searching, "hr-02", { status: "away" }), { type: "source", requestId: rid }, NOW).ok, false);
  assert.equal(applyRecruitAction(withEmployee(searching, "hr-03", { status: "off-duty" }), { type: "source", requestId: rid }, NOW).ok, false);
  assert.equal(applyRecruitAction(searching, { type: "source", requestId: rid }, NOW).ok, true);
});

test("HR opens the search, the head-hunter shortlists and the training expert plans", () => {
  const { s, id } = sourced();
  const req = s.recruitment.requests.find((r) => r.id === id);
  assert.equal(req.status, "awaiting-approval");
  assert.ok(req.shortlist.length >= 1 && req.shortlist.length <= 3);
  assert.equal(req.chosenCandidateId, req.shortlist[0].id);
  const fits = req.shortlist.map((c) => c.fit);
  assert.deepEqual(fits, [...fits].sort((a, b) => b - a));
  assert.ok(req.shortlist.every((c) => c.fictional === true));
  assert.equal(req.trainingPlan[0].id, "onboarding");
  assert.deepEqual(req.approvals.map((a) => [a.stage, a.by]), [["search", "hr"]]);
  assert.ok(s.events.some((e) => e.type === "recruitment.shortlist_ready"));
});

test("the shortlist ranks by skill fit and never exceeds three", () => {
  const list = shortlistFor({ skills: ["analytics", "campaigns"] }, { requests: [], cursor: 0 });
  assert.ok(list.length > 0 && list.length <= 3);
  assert.equal(list[0].id, "cand-04", "the candidate covering both skills ranks first");
});

test("a candidate already hired is not shortlisted again", () => {
  const { s, id } = sourced({ skills: ["analytics"] });
  const chosen = s.recruitment.requests.find((r) => r.id === id).chosenCandidateId;
  let hired = ok(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW)).state;
  hired = ok(applyRecruitAction(hired, { type: "approve", requestId: id, actorId: "ceo", decision: "approved" }, NOW)).state;
  let next = ok(raise(hired, "chro", "People & Culture", { skills: ["analytics"] })).state;
  const id2 = next.recruitment.requests.at(-1).id;
  next = ok(applyRecruitAction(next, { type: "open-search", requestId: id2, actorId: "hr-01" }, NOW)).state;
  next = ok(applyRecruitAction(next, { type: "source", requestId: id2 }, NOW)).state;
  const req2 = next.recruitment.requests.find((r) => r.id === id2);
  assert.ok(!req2.shortlist.some((c) => c.id === chosen));
});

test("sourcing says so when no candidate in the pool fits the skills", () => {
  let s = ok(raise(world(), "chro", "People & Culture", { skills: ["quantum-chemistry"] })).state;
  const id = s.recruitment.requests[0].id;
  s = ok(applyRecruitAction(s, { type: "open-search", requestId: id, actorId: "hr-01" }, NOW)).state;
  const result = applyRecruitAction(s, { type: "source", requestId: id }, NOW);
  assert.equal(result.ok, false);
  assert.match(result.error, /No candidate/);
});

test("the training plan covers onboarding and each missing skill, using the catalogue", () => {
  const candidate = CANDIDATE_POOL.find((c) => c.id === "cand-03"); // brand strategist: marketing, brand, campaigns
  const plan = trainingPlanFor({ skills: ["learning", "negotiation"] }, candidate);
  assert.deepEqual(plan.map((m) => m.id), ["onboarding", "train-learning", "train-negotiation"]);
  assert.equal(plan[1].weeks, TRAINING_CATALOGUE.learning.weeks);
  assert.equal(plan[2].title, TRAINING_CATALOGUE.negotiation.title);
});

test("a hire joins only after both HR and the CEO approve, then reports to the department executive", () => {
  const { s, id } = sourced();
  const afterHR = ok(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW + 3)).state;
  assert.equal(afterHR.recruitment.requests[0].status, "awaiting-approval");
  assert.equal(afterHR.employees.length, s.employees.length);
  const hired = ok(applyRecruitAction(afterHR, { type: "approve", requestId: id, actorId: "ceo", decision: "approved" }, NOW + 4)).state;
  const req = hired.recruitment.requests[0];
  assert.equal(req.status, "hired");
  assert.equal(hired.employees.length, s.employees.length + 1);
  const newcomer = hired.employees.find((e) => e.id === req.hiredEmployeeId);
  assert.ok(newcomer, "the hired employee exists in the org");
  assert.equal(newcomer.reportsTo, "chro");
  assert.equal(newcomer.department, "People & Culture");
  assert.equal(newcomer.tier, "workforce");
  assert.equal(newcomer.role, "Recruiter");
  assert.deepEqual(validateOrgChart(hired.employees), []);
  assert.ok(hired.events.some((e) => e.type === "recruitment.hired" && e.employeeId === newcomer.id));
});

test("the CEO may approve first, and the order does not matter", () => {
  const { s, id } = sourced();
  const afterCEO = ok(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "ceo", decision: "approved" }, NOW)).state;
  const hired = ok(applyRecruitAction(afterCEO, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW)).state;
  assert.equal(hired.recruitment.requests[0].status, "hired");
});

test("only HR or the CEO can approve, and each may decide once", () => {
  const { s, id } = sourced();
  assert.equal(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "cfo", decision: "approved" }, NOW).ok, false);
  const afterHR = ok(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW)).state;
  // chro is also HR, so the HR decision is already recorded
  assert.equal(applyRecruitAction(afterHR, { type: "approve", requestId: id, actorId: "chro", decision: "approved" }, NOW).ok, false);
});

test("a decline stops the hire, adds no one, and cannot be approved afterwards", () => {
  const { s, id } = sourced();
  const declined = ok(applyRecruitAction(s, { type: "approve", requestId: id, actorId: "ceo", decision: "declined" }, NOW)).state;
  assert.equal(declined.recruitment.requests[0].status, "declined");
  assert.equal(declined.employees.length, s.employees.length);
  assert.equal(applyRecruitAction(declined, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW).ok, false);
});

test("actions never change the state they were given", () => {
  const { s, id } = sourced();
  const before = JSON.stringify(s);
  applyRecruitAction(s, { type: "approve", requestId: id, actorId: "ceo", decision: "approved" }, NOW);
  applyRecruitAction(s, { type: "approve", requestId: id, actorId: "hr-01", decision: "approved" }, NOW);
  assert.equal(JSON.stringify(s), before);
});
