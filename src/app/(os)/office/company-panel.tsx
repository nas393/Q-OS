import { INITIAL_COMPANY, kindLabel } from "@/lib/simulation/catalogue";
import { summarize } from "@/lib/simulation/autopilot";
import type { RecruitAction } from "@/lib/simulation/recruit";
import type { CompanyKpis, EmployeeAgent, Project, SimTask, SimulationState, WorkResult } from "@/lib/simulation/types";
import { HiringDesk } from "./hiring-desk";

export type PanelTab = "overview" | "projects" | "tasks" | "results" | "team" | "hiring";
export const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "projects", label: "Projects" }, { id: "tasks", label: "Tasks" },
  { id: "results", label: "Results" }, { id: "team", label: "Team" }, { id: "hiring", label: "Hiring" },
];
export const DEPARTMENTS = ["All", "Executive", "Finance", "Commercial", "Operations", "Strategy", "Executive Office", "People & Culture", "Technology", "Marketing", "Legal & Risk"];

/* The fictional company's own clock: day count and UTC time. Shown so every timestamp reads the same way. */
export function companyClock(world: SimulationState, at: number): string {
  const start = world.planner?.startedAt ?? at;
  const day = Math.floor((at - start) / 86400000) + 1;
  return `Day ${Math.max(1, day)} · ${new Date(at).toISOString().slice(11, 16)} UTC`;
}

const byId = (world: SimulationState) => new Map(world.employees.map(e => [e.id, e] as const));
const nameOf = (world: SimulationState, id: string | null | undefined) => (id ? byId(world).get(id)?.name : undefined) ?? "Team";
/** A task can be worked only by one active person who holds all of its skills. */
const staffable = (world: SimulationState, task: SimTask) =>
  world.employees.some(e => e.department === task.department && e.status === "active" && task.requiredSkills.every(s => e.skills.includes(s)));

function kpiList(co: CompanyKpis): { label: string; value: string; delta: string }[] {
  const d = (now: number, start: number, digits: number) => {
    const rounded = Number((now - start).toFixed(digits));
    const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "±";
    return `${sign}${Math.abs(rounded).toFixed(digits)} vs start`;
  };
  return [
    { label: "Revenue run-rate", value: `€${(co.revenueRunRateK / 1000).toFixed(2)}M / mo`, delta: d(co.revenueRunRateK / 1000, INITIAL_COMPANY.revenueRunRateK / 1000, 2) },
    { label: "Gross margin", value: `${co.grossMarginPct.toFixed(1)}%`, delta: d(co.grossMarginPct, INITIAL_COMPANY.grossMarginPct, 1) },
    { label: "Pipeline coverage", value: `${co.pipelineCoverage.toFixed(1)}×`, delta: d(co.pipelineCoverage, INITIAL_COMPANY.pipelineCoverage, 1) },
    { label: "Tasks on time", value: `${co.onTimePct.toFixed(0)}%`, delta: d(co.onTimePct, INITIAL_COMPANY.onTimePct, 0) },
    { label: "Supplier on time", value: `${co.supplierOnTimePct.toFixed(1)}%`, delta: d(co.supplierOnTimePct, INITIAL_COMPANY.supplierOnTimePct, 1) },
    { label: "Recovery time", value: `${co.mttrMinutes.toFixed(0)} min`, delta: d(co.mttrMinutes, INITIAL_COMPANY.mttrMinutes, 0) },
    { label: "Engagement", value: `${co.engagement.toFixed(0)}/100`, delta: d(co.engagement, INITIAL_COMPANY.engagement, 0) },
    { label: "Cash runway", value: `${co.cashRunwayMonths.toFixed(1)} months`, delta: d(co.cashRunwayMonths, INITIAL_COMPANY.cashRunwayMonths, 1) },
  ];
}

function ResultCard({ world, result }: { world: SimulationState; result: WorkResult }) {
  return <article className="q3d-card">
    <header><span className="q3d-kind">{kindLabel(result.kind)}</span><time>{companyClock(world, result.publishedAt)}</time></header>
    <b>{result.title}</b>
    <small>{nameOf(world, result.authorId)} · {result.department}</small>
    <p>{result.summary}</p>
    <div className="q3d-metrics">{result.metrics.map(m => <span key={m.label}><small>{m.label}</small><b>{m.value}</b></span>)}</div>
  </article>;
}

function Overview({ world, onTab }: { world: SimulationState; onTab: (t: PanelTab) => void }) {
  const s = summarize(world);
  const feed = [...(world.results ?? [])].reverse().slice(0, 10);
  return <div className="q3d-panel-body">
    <div className="q3d-kpis">{kpiList(world.company ?? INITIAL_COMPANY).map(k => <div className="q3d-kpi" key={k.label}><small>{k.label}</small><b>{k.value}</b><span>{k.delta}</span></div>)}</div>
    <div className="q3d-strip">
      <button type="button" onClick={() => onTab("projects")}><b>{s.activeProjects}</b> active</button>
      <button type="button" onClick={() => onTab("projects")} data-warn={s.atRiskProjects > 0}><b>{s.atRiskProjects}</b> at risk</button>
      <button type="button" onClick={() => onTab("projects")}><b>{s.doneProjects}</b> done</button>
      <button type="button" onClick={() => onTab("tasks")}><b>{s.openTasks}</b> open tasks</button>
      <button type="button" onClick={() => onTab("results")}><b>{s.results}</b> results</button>
      <button type="button" onClick={() => onTab("hiring")} data-warn={s.awaitingApproval > 0}><b>{s.awaitingApproval}</b> awaiting HR and CEO</button>
    </div>
    <h4>Latest work</h4>
    <div className="q3d-feed">{feed.length === 0 ? <p className="q3d-empty">The first results appear as work completes.</p> : feed.map(r => <ResultCard key={r.id} world={world} result={r} />)}</div>
  </div>;
}

function Projects({ world }: { world: SimulationState }) {
  const order: Record<Project["status"], number> = { "at-risk": 0, active: 1, done: 2 };
  const projects = [...(world.projects ?? [])].sort((a, b) => order[a.status] - order[b.status] || b.openedAt - a.openedAt).slice(0, 24);
  const tasks = new Map(world.tasks.map(t => [t.id, t] as const));
  return <div className="q3d-panel-body">
    <p className="q3d-hiring-note">Projects are opened automatically. Each keeps two running in every department.</p>
    <div className="q3d-list">{projects.map(p => {
      const own = p.taskIds.map(id => tasks.get(id)).filter((t): t is SimTask => !!t);
      const done = own.filter(t => t.status === "completed").length;
      const blocked = own.find(t => t.status === "queued" && !staffable(world, t));
      return <article className="q3d-card" key={p.id}>
        <header><b>{p.title}</b><span className="q3d-status" data-status={p.status}>{p.status === "at-risk" ? "At risk" : p.status === "done" ? "Done" : "On track"}</span></header>
        <small>{p.department} · owner {nameOf(world, p.ownerId)} · {done}/{own.length} tasks</small>
        <div className="q3d-bar" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.title} progress`}><span style={{ width: `${p.progress}%` }} /></div>
        <ul className="q3d-milestones">{p.milestones.map(m => <li key={m.id} data-done={m.done}>{m.done ? "✓" : "○"} {m.title}</li>)}</ul>
        {blocked && <small className="q3d-blocked">Waiting for someone with {blocked.requiredSkills.join(" + ")}. See Hiring.</small>}
      </article>;
    })}</div>
  </div>;
}

function Tasks({ world }: { world: SimulationState }) {
  const working = world.tasks.filter(t => t.status === "in-progress");
  const waiting = world.tasks.filter(t => t.status === "queued").sort((a, b) => b.priority - a.priority);
  const finished = world.tasks.filter(t => t.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 12);
  return <div className="q3d-panel-body">
    <h4>In progress · {working.length}</h4>
    <ul className="q3d-tasklist">{working.map(t => <li key={t.id}><b>{t.title}</b><small>{nameOf(world, t.assigneeId)} · {t.department} · priority {t.priority}</small></li>)}</ul>
    {working.length === 0 && <p className="q3d-empty">Nobody is on a task right now.</p>}
    <h4>Waiting · {waiting.length}</h4>
    <ul className="q3d-tasklist">{waiting.slice(0, 16).map(t => <li key={t.id}><b>{t.title}</b><small>{staffable(world, t) ? "Waiting for a free person" : `Needs ${t.requiredSkills.join(" + ")}: see Hiring`} · {t.department}</small></li>)}</ul>
    <h4>Recently finished</h4>
    <ul className="q3d-tasklist">{finished.map(t => <li key={t.id}><b>{t.title}</b><small>{nameOf(world, t.assigneeId)} · {companyClock(world, t.completedAt ?? t.createdAt)}</small></li>)}</ul>
  </div>;
}

function Results({ world, department, onDepartment }: { world: SimulationState; department: string; onDepartment: (d: string) => void }) {
  const all = [...(world.results ?? [])].reverse();
  const shown = (department === "All" ? all : all.filter(r => r.department === department)).slice(0, 60);
  return <div className="q3d-panel-body">
    <div className="q3d-room-tabs" aria-label="Filter results by department">{DEPARTMENTS.map(name => <button type="button" key={name} aria-pressed={department === name} onClick={() => onDepartment(name)}>{name}</button>)}</div>
    <p className="q3d-hiring-note">{all.length} results published so far. Newest first.</p>
    <div className="q3d-feed">{shown.length === 0 ? <p className="q3d-empty">No results for this department yet.</p> : shown.map(r => <ResultCard key={r.id} world={world} result={r} />)}</div>
  </div>;
}

function Team({ world, department, selected, onDepartment, onSelect }: { world: SimulationState; department: string; selected: EmployeeAgent; onDepartment: (d: string) => void; onSelect: (id: string) => void }) {
  const people = world.employees.filter(e => department === "All" || e.department === department);
  const tasks = new Map(world.tasks.map(t => [t.id, t] as const));
  const finishedBy = new Map<string, number>();
  for (const r of world.results ?? []) finishedBy.set(r.authorId, (finishedBy.get(r.authorId) ?? 0) + 1);
  const manager = world.employees.find(e => e.id === selected.reportsTo);
  const current = tasks.get(selected.currentTaskId ?? "");
  return <div className="q3d-panel-body">
    <div className="q3d-room-tabs" aria-label="Simulation departments">{DEPARTMENTS.map(name => <button type="button" key={name} aria-pressed={department === name} onClick={() => onDepartment(name)}>{name}</button>)}</div>
    <div className="q3d-desks">{people.map(e => <button type="button" key={e.id} onClick={() => onSelect(e.id)} aria-pressed={selected.id === e.id}>
      <span data-light={e.activity === "working" ? "ok" : e.activity === "walking" ? "watch" : "idle"} /><b>{e.name}</b>
      <small>{e.role} · {e.activity} · {finishedBy.get(e.id) ?? 0} results</small>
    </button>)}</div>
    <div className="q3d-profile"><b>{selected.name}</b><span>{selected.role} · reports to {manager?.name ?? "Company owner"}</span>
      <span>Current task: {current?.title ?? (selected.activity === "break" ? "On a scheduled break" : "Available for work")}</span>
      <span>Energy {Math.round(selected.energy)} · morale {Math.round(selected.morale)} · stress {Math.round(selected.stress)}</span>
      <span>Skills: {selected.skills.join(" · ")}</span></div>
  </div>;
}

export function CompanyPanel(props: {
  world: SimulationState; tab: PanelTab; onTab: (t: PanelTab) => void; department: string; onDepartment: (d: string) => void;
  selected: EmployeeAgent; onSelect: (id: string) => void; onAction: (a: RecruitAction) => void; notice: string | null;
}) {
  const { world, tab, onTab } = props;
  return <section className="q3d-company" aria-label="Company">
    <nav className="q3d-tabs" role="tablist" aria-label="Company sections">
      {PANEL_TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}>{t.label}</button>)}
    </nav>
    {props.notice && <p className="q3d-hiring-notice" role="status">{props.notice}</p>}
    {tab === "overview" && <Overview world={world} onTab={onTab} />}
    {tab === "projects" && <Projects world={world} />}
    {tab === "tasks" && <Tasks world={world} />}
    {tab === "results" && <Results world={world} department={props.department} onDepartment={props.onDepartment} />}
    {tab === "team" && <Team world={world} department={props.department} selected={props.selected} onDepartment={props.onDepartment} onSelect={props.onSelect} />}
    {tab === "hiring" && <HiringDesk world={world} onAction={props.onAction} notice={null} />}
  </section>;
}
