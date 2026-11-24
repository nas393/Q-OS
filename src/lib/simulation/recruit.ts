/*
 * Hiring workflow for the fictional Q Executive World. Pure rules: no browser, no network, no real people.
 * Flow: an executive raises a need -> HR opens a search -> the head-hunter shortlists -> the training expert
 * plans onboarding -> HR AND the CEO approve -> the hire joins the team, reporting to the team's executive.
 */
import type { ApprovalRecord, CandidateProfile, EmployeeAgent, RecruitmentState, SimulationEvent, SimulationState, StaffingRequest, TrainingModule } from "./types";
import { CANDIDATE_POOL, trainingFor } from "./candidates.ts";
import { validateOrgChart } from "./seed.ts";

export const MAX_OPEN_REQUESTS_PER_DEPARTMENT = 2;
export const MAX_TEAM_SIZE = 6; // planned workforce members per department
export const HEADHUNTER_ID = "hr-02"; // Talent Acquisition Lead
export const TRAINING_EXPERT_ID = "hr-03"; // Learning & Development Manager
export const HR_ACTOR_ID = "hr-01"; // HR Business Partner acts for HR

export type RecruitAction =
  | { type: "raise"; requestedBy: string; department: string; roleTitle: string; skills: string[]; reason: string }
  | { type: "open-search"; requestId: string; actorId: string }
  | { type: "source"; requestId: string }
  | { type: "approve"; requestId: string; actorId: string; decision: "approved" | "declined" };
export type RecruitResult = { ok: true; state: SimulationState; message: string } | { ok: false; error: string };
export type StaffingNeed = { department: string; requestedBy: string; roleTitle: string; skills: string[]; taskTitles: string[] };

export const isHR = (e: EmployeeAgent) => e.department === "People & Culture" && (e.id === "chro" || e.role === "HR Business Partner");
export const isCEO = (e: EmployeeAgent) => e.id === "ceo";
const OPEN: StaffingRequest["status"][] = ["needs-review", "sourcing", "awaiting-approval"];

const findEmployee = (s: SimulationState, id: string) => s.employees.find((e) => e.id === id) ?? null;
const teamOf = (s: SimulationState, dept: string) => s.employees.filter((e) => e.department === dept && e.tier === "workforce");
const leaderOf = (s: SimulationState, dept: string) => s.employees.find((e) => e.department === dept && e.tier === "leadership") ?? findEmployee(s, "ceo");
const recruitmentOf = (s: SimulationState): RecruitmentState => s.recruitment ?? { requests: [], cursor: 0 };

function event(s: SimulationState, type: SimulationEvent["type"], message: string, now: number, employeeId?: string): SimulationEvent {
  return { id: `${type}-${now}-${s.events.length}`, at: now, type, message, source: "simulation", ...(employeeId ? { employeeId } : {}) };
}
function withRequest(s: SimulationState, next: StaffingRequest, rec: RecruitmentState, ev: SimulationEvent, extra: Partial<SimulationState> = {}): SimulationState {
  const requests = rec.requests.some((r) => r.id === next.id)
    ? rec.requests.map((r) => (r.id === next.id ? next : r))
    : [...rec.requests, next];
  return { ...s, ...extra, recruitment: { ...rec, requests }, events: [...s.events, ev].slice(-500) };
}
const openCount = (rec: RecruitmentState, dept: string) => rec.requests.filter((r) => r.department === dept && OPEN.includes(r.status)).length;

/** Skills that queued or blocked work needs but no active team member in that department has. */
export function staffingNeeds(state: SimulationState): StaffingNeed[] {
  const departments = [...new Set(state.employees.map((e) => e.department))];
  const out: StaffingNeed[] = [];
  for (const department of departments) {
    const covered = new Set(state.employees.filter((e) => e.department === department && e.status === "active").flatMap((e) => e.skills));
    const open = state.tasks.filter((t) => t.department === department && (t.status === "queued" || t.status === "blocked"));
    const missing = [...new Set(open.flatMap((t) => t.requiredSkills.filter((s) => !covered.has(s))))].sort();
    if (!missing.length) continue;
    out.push({
      department,
      requestedBy: leaderOf(state, department)?.id ?? "ceo",
      roleTitle: `${department} specialist`,
      skills: missing.slice(0, 4),
      taskTitles: open.filter((t) => t.requiredSkills.some((s) => missing.includes(s))).map((t) => t.title).slice(0, 3),
    });
  }
  return out;
}

/** Executives raise a need for their own department; the CEO can raise one for any department. */
export function raiseRequest(s: SimulationState, input: { requestedBy: string; department: string; roleTitle: string; skills: string[]; reason: string }, now: number): RecruitResult {
  const requester = findEmployee(s, input.requestedBy);
  if (!requester || requester.tier !== "leadership" || requester.status !== "active") return { ok: false, error: "Only an active executive can ask for a hire." };
  if (requester.id !== "ceo" && requester.department !== input.department) return { ok: false, error: "You can ask for hires in your own department only." };
  const roleTitle = input.roleTitle.trim();
  const skills = [...new Set(input.skills.map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, 5);
  if (roleTitle.length < 2 || roleTitle.length > 80) return { ok: false, error: "Give the role a short title (2 to 80 characters)." };
  if (!skills.length) return { ok: false, error: "Name at least one skill this role needs." };
  const rec = recruitmentOf(s);
  if (openCount(rec, input.department) >= MAX_OPEN_REQUESTS_PER_DEPARTMENT) return { ok: false, error: `${input.department} already has ${MAX_OPEN_REQUESTS_PER_DEPARTMENT} open requests.` };
  if (teamOf(s, input.department).length >= MAX_TEAM_SIZE) return { ok: false, error: `${input.department} is already at its planned size of ${MAX_TEAM_SIZE}.` };
  const id = `req-${rec.cursor + 1}`;
  const request: StaffingRequest = {
    id, requestedBy: requester.id, department: input.department, roleTitle, skills, reason: input.reason.trim().slice(0, 280),
    status: "needs-review", createdAt: now, shortlist: [], chosenCandidateId: null, trainingPlan: [], approvals: [], hiredEmployeeId: null,
  };
  const ev = event(s, "recruitment.requested", `${requester.name} asked HR for a ${roleTitle} (${skills.join(", ")}).`, now);
  return { ok: true, state: withRequest(s, request, { ...rec, cursor: rec.cursor + 1 }, ev), message: "Request sent to HR." };
}

/** HR opens the search for a request that is waiting for review. */
export function openSearch(s: SimulationState, requestId: string, actorId: string, now: number): RecruitResult {
  const actor = findEmployee(s, actorId);
  if (!actor || !isHR(actor)) return { ok: false, error: "Only HR can open a search." };
  const rec = recruitmentOf(s);
  const request = rec.requests.find((r) => r.id === requestId);
  if (!request || request.status !== "needs-review") return { ok: false, error: "This request is not waiting for HR." };
  const next: StaffingRequest = { ...request, status: "sourcing", approvals: [...request.approvals, { stage: "search", by: "hr", actorId, decision: "approved", at: now }] };
  return { ok: true, state: withRequest(s, next, rec, event(s, "recruitment.search_opened", `${actor.name} (HR) opened the search for ${request.roleTitle}.`, now)), message: "Search opened. The head-hunter can start." };
}

/** Candidates that fit the request best (skills covered, then experience). Hired candidates are excluded. */
export function shortlistFor(request: StaffingRequest, rec: RecruitmentState): CandidateProfile[] {
  const hired = new Set(rec.requests.filter((r) => r.status === "hired" && r.chosenCandidateId).map((r) => r.chosenCandidateId));
  return CANDIDATE_POOL.filter((c) => !hired.has(c.id))
    .map((c) => {
      const overlap = request.skills.filter((skill) => c.skills.includes(skill)).length;
      const fit = Math.min(100, Math.round((100 * overlap) / request.skills.length) + Math.min(c.yearsExperience, 10) * 2);
      return { ...c, fit, fictional: true as const };
    })
    .filter((c) => c.fit >= 30)
    .sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id))
    .slice(0, 3);
}

/** Training expert plan: onboarding, then one module for each skill the candidate does not yet have. */
export function trainingPlanFor(request: StaffingRequest, candidate: CandidateProfile): TrainingModule[] {
  const gaps = request.skills.filter((skill) => !candidate.skills.includes(skill));
  return [
    { id: "onboarding", title: "Company and team onboarding", weeks: 1, closesSkill: "onboarding" },
    ...gaps.map((skill) => ({ id: `train-${skill}`, title: trainingFor(skill).title, weeks: trainingFor(skill).weeks, closesSkill: skill })),
  ];
}

/** The head-hunter shortlists candidates and the training expert prepares the plan. Both must be at work. */
export function runSourcing(s: SimulationState, requestId: string, now: number): RecruitResult {
  const rec = recruitmentOf(s);
  const request = rec.requests.find((r) => r.id === requestId);
  if (!request || request.status !== "sourcing") return { ok: false, error: "This request is not ready for sourcing." };
  const hunter = findEmployee(s, HEADHUNTER_ID), trainer = findEmployee(s, TRAINING_EXPERT_ID);
  if (!hunter || hunter.status !== "active") return { ok: false, error: "The head-hunter is away. Try again when they are back." };
  if (!trainer || trainer.status !== "active") return { ok: false, error: "The training expert is away. Try again when they are back." };
  const shortlist = shortlistFor(request, rec);
  if (!shortlist.length) return { ok: false, error: "No candidate in the pool fits this role yet. Try a broader skill list." };
  const chosen = shortlist[0];
  const next: StaffingRequest = { ...request, status: "awaiting-approval", shortlist, chosenCandidateId: chosen.id, trainingPlan: trainingPlanFor(request, chosen) };
  const ev = event(s, "recruitment.shortlist_ready", `${hunter.name} shortlisted ${shortlist.length} for ${request.roleTitle}; ${trainer.name} planned onboarding for ${chosen.name}.`, now, hunter.id);
  return { ok: true, state: withRequest(s, next, rec, ev), message: "Shortlist and training plan ready for approval." };
}

/** HR and the CEO each approve the hire. When both have approved, the hire joins the team. Either can decline. */
export function decideHire(s: SimulationState, requestId: string, actorId: string, decision: "approved" | "declined", now: number): RecruitResult {
  const rec = recruitmentOf(s);
  const request = rec.requests.find((r) => r.id === requestId);
  if (!request || request.status !== "awaiting-approval") return { ok: false, error: "This request is not waiting for approval." };
  const actor = findEmployee(s, actorId);
  const by: "hr" | "ceo" | null = actor && isHR(actor) ? "hr" : actor && isCEO(actor) ? "ceo" : null;
  if (!actor || !by) return { ok: false, error: "Only HR or the CEO can approve a hire." };
  if (request.approvals.some((a) => a.stage === "hire" && a.by === by)) return { ok: false, error: `${by === "hr" ? "HR" : "The CEO"} has already decided on this hire.` };
  const record: ApprovalRecord = { stage: "hire", by, actorId, decision, at: now };
  const approvals = [...request.approvals, record];
  if (decision === "declined") {
    const next: StaffingRequest = { ...request, status: "declined", approvals };
    return { ok: true, state: withRequest(s, next, rec, event(s, "recruitment.declined", `${actor.name} declined the hire for ${request.roleTitle}.`, now, actor.id)), message: "Hire declined." };
  }
  const bothApproved = approvals.some((a) => a.stage === "hire" && a.by === "hr" && a.decision === "approved") && approvals.some((a) => a.stage === "hire" && a.by === "ceo" && a.decision === "approved");
  if (!bothApproved) {
    const next: StaffingRequest = { ...request, approvals };
    return { ok: true, state: withRequest(s, next, rec, event(s, "recruitment.approval", `${actor.name} approved the hire for ${request.roleTitle}. Waiting for the other approval.`, now, actor.id)), message: "Approved. Waiting for the other approval." };
  }
  return joinTeam(s, { ...request, approvals }, rec, now);
}

/** Adds the approved candidate to the team, reporting to the department's executive, at the next free desk. */
function joinTeam(s: SimulationState, request: StaffingRequest, rec: RecruitmentState, now: number): RecruitResult {
  const candidate = request.shortlist.find((c) => c.id === request.chosenCandidateId);
  if (!candidate) return { ok: false, error: "The chosen candidate is missing. Run sourcing again." };
  if (teamOf(s, request.department).length >= MAX_TEAM_SIZE) return { ok: false, error: `${request.department} is already at its planned size.` };
  const leader = leaderOf(s, request.department);
  if (!leader) return { ok: false, error: "No executive leads this team yet." };
  const members = teamOf(s, request.department);
  const anchor = members.reduce((best, m) => (m.position.z > best.position.z ? m : best), members[0] ?? leader);
  let z = anchor.position.z + 2;
  const x = anchor.position.x;
  for (let i = 0; i < 6 && s.employees.some((e) => Math.abs(e.position.x - x) < 1.2 && Math.abs(e.position.z - z) < 1.2); i++) z += 2;
  const n = s.employees.length;
  const id = `hire-${request.id}`;
  const hire: EmployeeAgent = {
    id, name: candidate.name, role: request.roleTitle, department: request.department, reportsTo: leader.id, tier: "workforce",
    skills: [...new Set(candidate.skills)], goal: `${request.roleTitle} outcomes: deliver assigned work independently, maintain quality and escalate material blockers.`,
    autonomyMode: "independent", recentDecisions: [],
    personality: { conscientiousness: 60 + ((n * 7) % 35), sociability: 40 + ((n * 11) % 50), curiosity: 50 + ((n * 13) % 45) },
    position: { x, y: 0, z }, destination: null, activity: "idle", status: "active",
    energy: 85, focus: 80, morale: 75, stress: 14, currentTaskId: null,
    schedule: { startHour: 8, endHour: 17, breakAtHour: 13 }, lastDecisionAt: 0,
  };
  const employees = [...s.employees, hire];
  const errors = validateOrgChart(employees);
  if (errors.length) return { ok: false, error: `The hire would break the reporting lines: ${errors[0]}` };
  const next: StaffingRequest = { ...request, status: "hired", hiredEmployeeId: id };
  const ev = event(s, "recruitment.hired", `${candidate.name} joined ${request.department} as ${request.roleTitle}, reporting to ${leader.name}.`, now, id);
  return { ok: true, state: withRequest(s, next, rec, ev, { employees }), message: `${candidate.name} joined the team.` };
}

/** One entry point for the hiring desk. Returns the new state or the reason nothing happened. */
export function applyRecruitAction(s: SimulationState, action: RecruitAction, now: number): RecruitResult {
  if (action.type === "raise") return raiseRequest(s, action, now);
  if (action.type === "open-search") return openSearch(s, action.requestId, action.actorId, now);
  if (action.type === "source") return runSourcing(s, action.requestId, now);
  return decideHire(s, action.requestId, action.actorId, action.decision, now);
}
