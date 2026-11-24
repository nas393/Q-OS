/* Autopilot for the Q Executive World. Pure functions only: the server stores and loads the state, this file decides what happens.
   The company runs on its own: projects are opened, tasks are worked, finished work becomes results, and hiring needs move
   up to the HR and CEO approval gate. Approvals are never automatic. */
import { INITIAL_EMPLOYEES } from "./seed.ts";
import { tickSimulation } from "./engine.ts";
import { openSearch, raiseRequest, runSourcing, staffingNeeds, HR_ACTOR_ID } from "./recruit.ts";
import { INITIAL_COMPANY, PROJECT_TEMPLATES, seededRandom, writeDeliverable, type ProjectTemplate } from "./catalogue.ts";
import type { CompanyKpis, EmployeeAgent, Planner, Project, SimTask, SimulationEvent, SimulationState, Vec3, WorkResult } from "./types";

/** Six simulated minutes pass for each real minute, so a simulated workday takes about an hour and a half. */
export const SIM_MINUTES_PER_REAL_MINUTE = 6;
/** Longest catch-up in one call. A page left open for days still resumes quickly. */
export const MAX_CATCHUP_REAL_MS = 12 * 60 * 60 * 1000;
export const PROJECTS_PER_DEPARTMENT = 2;
export const RESULTS_KEPT = 300;
const EVENTS_KEPT = 500;
const STEP_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DUE_MS = DAY_MS;
const HR_DELAY_MS = 30 * 60 * 1000;
const SOURCING_DELAY_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = DAY_MS;
const OPEN_REQUEST: string[] = ["needs-review", "sourcing", "awaiting-approval"];
/* Spots beside the lounge coffee table in the south-east corner of the office. */
const LOUNGE: Vec3[] = [{ x: 14.8, y: 0, z: 10.6 }, { x: 17.2, y: 0, z: 10.6 }, { x: 13.6, y: 0, z: 10.6 }];
const HOME: Record<string, Vec3> = Object.fromEntries(INITIAL_EMPLOYEES.map(e => [e.id, e.position]));

const startOfUtcDay = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;
const dayOf = (now: number, startedAt: number) => Math.floor((now - startedAt) / DAY_MS) + 1;
const monthOf = (now: number) => new Date(now).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const lastMoved = (r: { createdAt: number; approvals: { at: number }[] }) => Math.max(r.createdAt, ...r.approvals.map(a => a.at));

function withDefaults(state: SimulationState): SimulationState {
  const startedAt = startOfUtcDay(state.simulatedAt) + 8 * HOUR_MS;
  return {
    ...state,
    recruitment: state.recruitment ?? { requests: [], cursor: 0 },
    projects: state.projects ?? [],
    results: state.results ?? [],
    company: state.company ?? { ...INITIAL_COMPANY },
    planner: state.planner ?? { startedAt, counter: 0, nextTemplate: {} },
  };
}

function leaderOf(employees: EmployeeAgent[], department: string): EmployeeAgent | undefined {
  return employees.find(e => e.department === department && e.tier === "leadership") ?? employees.find(e => e.id === "ceo");
}

/** A task can only be worked by one active person who holds every skill it needs, the same rule the engine uses. */
function staffable(task: SimTask, employees: EmployeeAgent[]): boolean {
  return employees.some(e => e.department === task.department && e.status === "active" && task.requiredSkills.every(s => e.skills.includes(s)));
}

/** One slice of simulated time (at most ten minutes). Everything the company does happens inside here. */
function step(input: SimulationState, chunkMs: number): SimulationState {
  const state = withDefaults(input);
  const planner: Planner = { ...state.planner! };
  let counter = planner.counter;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const before = new Map(state.tasks.map(t => [t.id, t.status] as const));
  const ticked = tickSimulation({ ...state, paused: false, speed: 1 }, chunkMs).state;
  const now = ticked.simulatedAt;
  const startedAt = planner.startedAt;

  const events: SimulationEvent[] = ticked.events.filter(e => e.type !== "simulation.tick" && e.type !== "employee.moved");
  const projects: Project[] = state.projects!.map(p => ({ ...p, taskIds: [...p.taskIds], milestones: p.milestones.map(m => ({ ...m })) }));
  const company: CompanyKpis = { ...state.company! };
  const results: WorkResult[] = [...state.results!];
  const tasks: SimTask[] = ticked.tasks.map(t => ({ ...t }));

  /* 1. Finished work becomes a result, and the company's numbers move with it. */
  const finished = tasks.filter(t => t.status === "completed" && before.get(t.id) !== "completed");
  for (const task of finished) {
    task.completedAt = now;
    const author = ticked.employees.find(e => e.id === task.assigneeId);
    const deliverable = writeDeliverable(task.kind ?? "", {
      rng: seededRandom(`${task.id}|${now}`), co: company, monthName: monthOf(now), day: dayOf(now, startedAt), author: author?.name ?? "Team",
    }, task.title);
    const onTime = task.dueAt === null || now <= task.dueAt;
    company.onTimePct = clamp(company.onTimePct * 0.9 + (onTime ? 10 : 0), 0, 100);
    const resultId = nextId("res");
    results.push({
      id: resultId, taskId: task.id, projectId: task.projectId ?? "", department: task.department, authorId: author?.id ?? "",
      kind: task.kind ?? "", title: deliverable.title, summary: deliverable.summary, metrics: deliverable.metrics, publishedAt: now, day: dayOf(now, startedAt),
    });
    events.push({ id: nextId("evt"), at: now, type: "work.published", taskId: task.id, employeeId: author?.id, message: `${author?.name ?? "Team"} published: ${deliverable.title}.`, source: "simulation" });
  }

  /* 2. Projects: progress, milestones, completion and risk. */
  for (const project of projects) {
    if (project.status === "done") continue;
    const own = tasks.filter(t => t.projectId === project.id);
    const doneCount = own.filter(t => t.status === "completed").length;
    project.progress = own.length ? Math.round((doneCount / own.length) * 100) : 0;
    project.milestones = project.milestones.map((m, i) => ({ ...m, done: own.length > 0 && doneCount >= Math.ceil(((i + 1) / project.milestones.length) * own.length) }));
    if (own.length > 0 && doneCount === own.length) {
      project.status = "done"; project.progress = 100; project.completedAt = now;
      events.push({ id: nextId("evt"), at: now, type: "project.completed", message: `Completed “${project.title}” in ${project.department}.`, source: "simulation" });
    } else {
      const stuck = own.some(t => t.status === "queued" && !staffable(t, ticked.employees));
      project.status = stuck ? "at-risk" : "active";
    }
  }

  /* 3. Every department keeps its projects running: open the next template when fewer than two are active. */
  for (const department of Object.keys(PROJECT_TEMPLATES)) {
    const templates: ProjectTemplate[] = PROJECT_TEMPLATES[department];
    let active = projects.filter(p => p.department === department && p.status !== "done").length;
    while (active < PROJECTS_PER_DEPARTMENT) {
      const index = planner.nextTemplate[department] ?? 0;
      planner.nextTemplate = { ...planner.nextTemplate, [department]: index + 1 };
      const template = templates[index % templates.length];
      const projectId = nextId("proj");
      const taskIds = template.tasks.map(t => {
        const id = nextId("task");
        tasks.push({
          id, title: t.title, department, requiredSkills: [...t.skills], priority: t.priority, effortRemaining: t.effort,
          status: "queued", assigneeId: null, dueAt: now + DUE_MS, createdAt: now, projectId, kind: t.kind, completedAt: null,
        });
        return id;
      });
      const owner = leaderOf(ticked.employees, department);
      projects.push({
        id: projectId, title: template.title, department, goal: template.goal, ownerId: owner?.id ?? "ceo", status: "active",
        milestones: template.milestones.map((m, i) => ({ id: `${projectId}-m${i + 1}`, title: m, done: false })),
        taskIds, progress: 0, openedAt: now, completedAt: null,
      });
      events.push({ id: nextId("evt"), at: now, type: "project.opened", message: `Opened “${template.title}” in ${department}.`, source: "simulation" });
      active++;
    }
  }

  /* 4. Movement: people on break walk to the lounge and return to their desk when idle. */
  const employees = ticked.employees.map((e): EmployeeAgent => {
    if (e.destination) return e;
    if (e.activity === "break") return { ...e, destination: { ...LOUNGE[(e.id.length + Math.floor(now / HOUR_MS)) % LOUNGE.length] } };
    const home = HOME[e.id];
    if (e.activity === "idle" && home && distance(e.position, home) > 0.6) return { ...e, destination: { ...home } };
    return e;
  });

  /* 5. Staffing: queued work nobody can do becomes a request, HR moves it forward, and the approval gate stays manual. */
  let next: SimulationState = {
    ...ticked, employees, tasks, projects, results: results.slice(-RESULTS_KEPT), company,
    events: events.slice(-EVENTS_KEPT), planner: { ...planner, counter }, recruitment: state.recruitment,
    speed: state.speed, paused: state.paused, lastWallClockAt: state.lastWallClockAt,
  };
  next = hiringAutopilot(next, now);
  return { ...next, events: next.events.slice(-EVENTS_KEPT) };
}

function hiringAutopilot(input: SimulationState, now: number): SimulationState {
  let s = input;
  for (const need of staffingNeeds(s)) {
    const requests = s.recruitment?.requests ?? [];
    /* A department waits a day after its last request moved, including a decline, before it asks again. */
    const busy = requests.some(r => r.department === need.department && (OPEN_REQUEST.includes(r.status) || now - lastMoved(r) < REQUEST_COOLDOWN_MS));
    if (busy) continue;
    const result = raiseRequest(s, {
      requestedBy: need.requestedBy, department: need.department, roleTitle: need.roleTitle, skills: need.skills,
      reason: `Autopilot: queued work needs ${need.skills.join(", ")}.`,
    }, now);
    if (result.ok) s = result.state;
  }
  for (const req of (s.recruitment?.requests ?? []).slice()) {
    if (req.status === "needs-review" && now - req.createdAt >= HR_DELAY_MS) {
      const result = openSearch(s, req.id, HR_ACTOR_ID, now);
      if (result.ok) s = result.state;
    }
  }
  for (const req of (s.recruitment?.requests ?? []).slice()) {
    if (req.status !== "sourcing") continue;
    const searchedAt = req.approvals.find(a => a.stage === "search")?.at ?? req.createdAt;
    if (now - searchedAt >= SOURCING_DELAY_MS) {
      const result = runSourcing(s, req.id, now);
      if (result.ok) s = result.state;
    }
  }
  return s;
}

/** Runs the company forward by simulated time, in steps of at most ten minutes. */
function simulate(state: SimulationState, simMs: number): SimulationState {
  let s = withDefaults(state);
  let remaining = simMs;
  while (remaining > 0) {
    const chunk = Math.min(STEP_MS, remaining);
    s = step(s, chunk);
    remaining -= chunk;
  }
  return s;
}

/** A brand-new company. It opens its projects and works for two simulated hours, so the first view is never empty. */
export function createWorld(nowMs: number): SimulationState {
  const startedAt = startOfUtcDay(nowMs) + 8 * HOUR_MS;
  const base: SimulationState = {
    worldId: "q-executive-world", version: 0, simulatedAt: startedAt, lastWallClockAt: nowMs, speed: 1, paused: false,
    employees: INITIAL_EMPLOYEES.map(e => ({ ...e, position: { ...e.position }, destination: null })),
    tasks: [], events: [], recruitment: { requests: [], cursor: 0 }, projects: [], results: [],
    company: { ...INITIAL_COMPANY }, planner: { startedAt, counter: 0, nextTemplate: {} },
  };
  return simulate(base, 2 * HOUR_MS);
}

/** Brings the stored company up to the present. Real time becomes simulated time at the stored speed. */
export function advanceWorld(state: SimulationState, nowMs: number): SimulationState {
  const current = withDefaults(state);
  const realMs = Math.min(Math.max(0, nowMs - current.lastWallClockAt), MAX_CATCHUP_REAL_MS);
  const updated = { ...current, lastWallClockAt: nowMs };
  if (updated.paused || updated.speed === 0 || realMs <= 0) return updated;
  return simulate(updated, Math.round(realMs * SIM_MINUTES_PER_REAL_MINUTE * updated.speed));
}

/** Counts for the overview. Pure, so the server and the page agree. */
export function summarize(state: SimulationState) {
  const projects = state.projects ?? [];
  const requests = state.recruitment?.requests ?? [];
  return {
    activeProjects: projects.filter(p => p.status === "active").length,
    atRiskProjects: projects.filter(p => p.status === "at-risk").length,
    doneProjects: projects.filter(p => p.status === "done").length,
    openTasks: state.tasks.filter(t => t.status !== "completed").length,
    completedTasks: state.tasks.filter(t => t.status === "completed").length,
    results: (state.results ?? []).length,
    awaitingApproval: requests.filter(r => r.status === "awaiting-approval").length,
    day: state.planner ? dayOf(state.simulatedAt, state.planner.startedAt) : 1,
  };
}
