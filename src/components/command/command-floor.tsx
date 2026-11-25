"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import "./command-floor.css";

/*
 * Command floor: each project is a desk on a 2.5D floor.
 * Every value shown comes from /api/projects (GitHub and Vercel), /api/tasks, /api/alerts, or the approvals
 * inbox passed in by the server. A value that cannot be read is shown as unavailable, with the reason.
 * Nothing is estimated.
 */

export type DeskSeed = { id: string; name: string; area: string; priority: string; next: string };
export type Approval = { app: string; kind: string; label: string; count: number; url: string };
export type FloorProps = {
  desks: DeskSeed[];
  approvals: { items: Approval[]; failed: string[] };
  xauusd: { price: number; changePct: number; source: string; updatedAt: string } | null;
};

type Telemetry = {
  id: string;
  repo: string | null;
  url?: string | null;
  openIssues: number | null;
  issuesError: string | null;
  lastCommit: { message: string; date?: string; url?: string } | null;
  commitError: string | null;
  deployment: { state: string; url: string | null; created: number | null; sourceMatches?: boolean | null } | null;
  deploymentError: string | null;
};
type Task = { id: string; title: string; project: string | null; due: string | null; done: boolean };
type LastCheck = { at: number; events: string[]; errors: string[] } | null;
type Light = "ok" | "watch" | "crit" | "info" | "idle";
type Row = DeskSeed & { t?: Telemetry };
type P = [number, number];

/* Desks on the floor; the other registry projects are listed under "Other apps". */
const FLOOR_IDS = ["q-jarvis", "certigo", "novae", "dalil", "lumeris", "xauusd"];
const SPOT: Record<string, [number, number]> = {
  "q-jarvis": [0.6, 0.6], certigo: [3.6, 0.6], novae: [6.6, 0.6],
  dalil: [0.6, 4.6], lumeris: [3.6, 4.6], xauusd: [6.6, 4.6],
};
const SHORT: Record<string, string> = { "q-jarvis": "Q", certigo: "Certigo", novae: "Novaé", dalil: "Dalil", lumeris: "Lumeris", xauusd: "XAU/USD" };
const APP_NAME: Record<string, string> = { dalil: "Dalil", radio: "Radio Cedars", xauusd: "XAU/USD" };
const FLOOR_SIZE = 9, SCALE = 30, DESK_W = 1.8, DESK_D = 1.2, DESK_H = 0.7;
const VIEW = { x: -250, y: -16, w: 500, h: 300 };

/* Same 2:1 isometric projection as the Q World scene. */
const iso = (x: number, y: number, z = 0): P => [(x - y) * 0.866 * SCALE, (x + y) * 0.5 * SCALE - z * SCALE];
const poly = (ps: P[]) => ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
const GRID = Array.from({ length: FLOOR_SIZE + 1 }, (_, i) =>
  `M${iso(i, 0).join(",")}L${iso(i, FLOOR_SIZE).join(",")}M${iso(0, i).join(",")}L${iso(FLOOR_SIZE, i).join(",")}`).join("");
const PLATE = poly([iso(0, 0), iso(FLOOR_SIZE, 0), iso(FLOOR_SIZE, FLOOR_SIZE), iso(0, FLOOR_SIZE)]);

/* Visible faces of a desk block: top, the front-left face (+y) and the front-right face (+x). */
function geometry(x: number, y: number) {
  const x2 = x + DESK_W, y2 = y + DESK_D;
  return {
    top: poly([iso(x, y, DESK_H), iso(x2, y, DESK_H), iso(x2, y2, DESK_H), iso(x, y2, DESK_H)]),
    left: poly([iso(x, y2, DESK_H), iso(x2, y2, DESK_H), iso(x2, y2, 0), iso(x, y2, 0)]),
    right: poly([iso(x2, y, DESK_H), iso(x2, y2, DESK_H), iso(x2, y2, 0), iso(x2, y, 0)]),
    lamp: iso(x + DESK_W / 2, y + DESK_D / 2, DESK_H),
    label: iso(x + DESK_W / 2, y2 + 0.8, 0),
  };
}

function lightOf(t: Telemetry | undefined, loaded: boolean, failed: boolean): { light: Light; label: string } {
  if (!loaded) return { light: "idle", label: failed ? "Unavailable" : "Checking" };
  const d = t?.deployment;
  if (!d) return { light: "idle", label: t?.deploymentError ? "No deployment data" : "No deployment" };
  if (d.sourceMatches === false) return { light: "watch", label: "Deployed from another repo" };
  if (d.state === "READY") return { light: "ok", label: "Live" };
  if (d.state === "ERROR" || d.state === "CANCELED") return { light: "crit", label: "Deploy failed" };
  if (d.state === "BUILDING" || d.state === "QUEUED" || d.state === "INITIALIZING") return { light: "info", label: "Deploying" };
  return { light: "watch", label: d.state.toLowerCase() };
}

function sublineOf(t?: Telemetry): string {
  const parts: string[] = [];
  if (t?.openIssues != null) parts.push(`${t.openIssues} ${t.openIssues === 1 ? "issue" : "issues"}`);
  else if (t?.issuesError) parts.push("issues unavailable");
  if (t?.lastCommit?.date) parts.push(ago(t.lastCommit.date));
  return parts.join(" · ");
}

function ago(when: string | number | null | undefined): string {
  if (when === null || when === undefined || when === "") return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(when).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

const msg = (e: unknown) => (e instanceof Error && e.message ? e.message : "Request failed");
const JSON_HEADERS = { "Content-Type": "application/json" };

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request returned ${r.status}`);
  return j as T;
}

export default function CommandFloor({ desks, approvals, xauusd }: FloorProps) {
  const [projects, setProjects] = useState<Telemetry[] | null>(null);
  const [projectsError, setProjectsError] = useState("");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksError, setTasksError] = useState("");
  const [check, setCheck] = useState<LastCheck | undefined>(undefined);
  const [checkError, setCheckError] = useState("");
  const [selected, setSelected] = useState("q-jarvis");
  const [draft, setDraft] = useState("");
  const [draftDesk, setDraftDesk] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const loadProjects = useCallback(async () => {
    try { const j = await getJson<{ projects: Telemetry[] }>("/api/projects"); setProjects(j.projects); setProjectsError(""); }
    catch (e) { setProjectsError(msg(e)); }
  }, []);
  const loadTasks = useCallback(async () => {
    try { const j = await getJson<{ tasks: Task[] }>("/api/tasks"); setTasks(j.tasks); setTasksError(""); }
    catch (e) { setTasksError(msg(e)); }
  }, []);
  const loadCheck = useCallback(async () => {
    try { const j = await getJson<{ lastCheck: LastCheck }>("/api/alerts"); setCheck(j.lastCheck ?? null); setCheckError(""); }
    catch (e) { setCheckError(msg(e)); }
  }, []);
  useEffect(() => { void loadProjects(); void loadTasks(); void loadCheck(); }, [loadProjects, loadTasks, loadCheck]);

  const byId = useMemo(() => new Map((projects ?? []).map(p => [p.id, p])), [projects]);
  const rows: Row[] = useMemo(() => desks.map(d => ({ ...d, t: byId.get(d.id) })), [desks, byId]);
  const floor = FLOOR_IDS.map(id => rows.find(r => r.id === id)).filter((r): r is Row => Boolean(r));
  const others = rows.filter(r => !FLOOR_IDS.includes(r.id));
  const current: Row | undefined = rows.find(r => r.id === selected) ?? floor[0] ?? rows[0];
  const today = useMemo(() => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Luanda" }), []);

  const openTasks = (r: Row) => (tasks ?? []).filter(t => !t.done && t.project !== null &&
    (t.project === r.id || t.project.toLowerCase() === r.name.toLowerCase()));
  const dueNow = (tasks ?? []).filter(t => !t.done && t.due !== null && t.due <= today)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const waiting = approvals.items.reduce((n, a) => n + a.count, 0);
  const nameOf = (id: string) => desks.find(d => d.id === id)?.name ?? id;
  const stOf = (r: Row) => lightOf(r.t, projects !== null, projectsError !== "");

  async function addTask(e: FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || saving) return;
    setSaving(true);
    setNotice("");
    try {
      await getJson("/api/tasks", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ title, ...(draftDesk ? { project: draftDesk } : {}) }) });
      setDraft("");
      setNotice(draftDesk ? `Added to ${nameOf(draftDesk)}.` : "Added.");
      await loadTasks();
    } catch (err) {
      setNotice(`Not added: ${msg(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: Task) {
    setTasks(list => (list ?? []).map(x => (x.id === t.id ? { ...x, done: !x.done } : x)));
    try {
      await getJson("/api/tasks", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id: t.id, done: !t.done }) });
    } catch (err) {
      setNotice(`Task not updated: ${msg(err)}`);
    }
    await loadTasks();
  }

  async function runChecks() {
    if (running) return;
    setRunning(true);
    setCheckError("");
    try {
      await getJson("/api/alerts", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ action: "check" }) });
      await Promise.all([loadCheck(), loadProjects()]);
    } catch (err) {
      setCheckError(msg(err));
    } finally {
      setRunning(false);
    }
  }

  const pick = (id: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(id); }
  };

  if (!current) return <p className="cf-empty">No desks are configured.</p>;

  const st = stOf(current);
  const pending = projects ? null : projectsError ? `Unavailable (${projectsError})` : "Checking…";
  const cur = current.t;
  const deployLine = pending ?? (cur?.deployment
    ? `${st.label}${cur.deployment.created ? `, ${ago(cur.deployment.created)}` : ""}`
    : (cur?.deploymentError ?? "No deployment found"));
  const commitLine = pending ?? (cur?.lastCommit
    ? `${cur.lastCommit.message} · ${ago(cur.lastCommit.date)}`
    : (cur?.commitError ?? "No commits found"));
  const issuesLine = pending ?? (cur?.openIssues != null ? String(cur.openIssues) : (cur?.issuesError ?? "Not available"));
  const appUrl = cur?.deployment?.url ?? cur?.url ?? null;
  const myTasks = openTasks(current);
  const myApprovals = approvals.items.filter(a => a.app === current.id);
  const desksOnFloor = floor.map(r => ({ r, g: geometry(...SPOT[r.id]), s: stOf(r), on: r.id === current.id, sub: sublineOf(r.t) }));

  return (
    <div className="cf">
      <header className="cf-head">
        <div className="cf-eyebrow">Command centre</div>
        <h1 className="cf-title">Your floor</h1>
        <p className="cf-sub">Each desk is a live project. Deployments, commits and issues come from GitHub and Vercel. Tasks and approvals come from Q.</p>
      </header>

      <form className="cf-bar" onSubmit={addTask} aria-label="New task">
        <label htmlFor="cf-task" className="cf-sr">Task</label>
        <input id="cf-task" className="cf-input" value={draft} maxLength={160} autoComplete="off"
          onChange={e => setDraft(e.target.value)} placeholder="Give a desk a task, for example: send the Certigo brief to the expert" />
        <label htmlFor="cf-desk" className="cf-sr">Desk</label>
        <select id="cf-desk" className="cf-select" value={draftDesk} onChange={e => setDraftDesk(e.target.value)}>
          <option value="">No desk</option>
          {desks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="cf-btn" type="submit" disabled={!draft.trim() || saving}>{saving ? "Adding…" : "Add task"}</button>
      </form>
      <p className="cf-notice" role="status" aria-live="polite">{notice}</p>

      <div className="cf-grid">
        <section className="cf-panel cf-floor" aria-labelledby="cf-floor-h">
          <div className="cf-panel-head">
            <h2 id="cf-floor-h" className="cf-h2s">Floor</h2>
            <span className="cf-muted">{projects ? "Live status" : projectsError ? "Live status unavailable" : "Checking live status…"}</span>
          </div>
          <svg className="cf-svg" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="group" aria-label="Desks on the floor">
            <polygon className="cf-plate" points={PLATE} />
            <path className="cf-grid-lines" d={GRID} />
            {desksOnFloor.map(({ r, g, s, on, sub }) => (
              <g key={r.id} className={"cf-desk" + (on ? " is-on" : "")} role="button" tabIndex={0} aria-pressed={on}
                aria-label={`${r.name}. ${s.label}. ${sub || "No live details"}. ${openTasks(r).length} open tasks.`}
                onClick={() => setSelected(r.id)} onKeyDown={pick(r.id)}>
                <polygon className="cf-face-r" points={g.right} />
                <polygon className="cf-face-l" points={g.left} />
                <polygon className="cf-top" points={g.top} />
                <circle className={`cf-lamp cf-light--${s.light}`} cx={g.lamp[0]} cy={g.lamp[1]} r={4} />
              </g>
            ))}
            {/* Labels are drawn after every desk block, so no neighbouring block can cover them. */}
            <g className="cf-labels" aria-hidden="true">
              {desksOnFloor.map(({ r, g, sub }) => (
                <g key={r.id}>
                  <text className="cf-label" x={g.label[0]} y={g.label[1]}>{SHORT[r.id] ?? r.name}</text>
                  <text className="cf-subtext" x={g.label[0]} y={g.label[1] + 16}>{sub}</text>
                </g>
              ))}
            </g>
          </svg>
          <ul className="cf-legend" aria-label="Desk colours">
            <li><i className="cf-light--ok" />Live</li>
            <li><i className="cf-light--info" />Deploying</li>
            <li><i className="cf-light--watch" />Needs a look</li>
            <li><i className="cf-light--crit" />Deploy failed</li>
            <li><i className="cf-light--idle" />No data</li>
          </ul>
        </section>

        <section className="cf-panel cf-inspector" aria-labelledby="cf-insp-h">
            <div className="cf-eyebrow">{current.area} · {current.priority}</div>
            <h2 id="cf-insp-h" className="cf-h2">{current.name}</h2>
            <div className="cf-state"><span className={`cf-dot cf-light--${st.light}`} aria-hidden="true" />{st.label}</div>
            <dl className="cf-facts">
              <div><dt>Deployment</dt><dd>{deployLine}</dd></div>
              <div><dt>Last commit</dt><dd>{commitLine}</dd></div>
              <div><dt>Open issues</dt><dd>{issuesLine}</dd></div>
              <div><dt>Open tasks</dt><dd>{tasks ? myTasks.length : (tasksError ? "Unavailable" : "Loading…")}</dd></div>
              {current.id === "xauusd" && xauusd && (
                <div><dt>Market price</dt><dd>{`${xauusd.price.toLocaleString("en-US", { maximumFractionDigits: 2 })} (${xauusd.changePct > 0 ? "+" : ""}${xauusd.changePct.toFixed(2)}%) · pushed ${ago(xauusd.updatedAt)} by ${xauusd.source}`}</dd></div>
              )}
            </dl>
            <div className="cf-next">
              <div className="cf-h3">Next step</div>
              <p>{current.next}</p>
            </div>
            <div className="cf-links">
              {appUrl && <a className="cf-btn cf-btn--ghost" href={appUrl} target="_blank" rel="noopener noreferrer">Open app</a>}
              {cur?.repo && <a className="cf-btn cf-btn--ghost" href={`https://github.com/nas393/${cur.repo}`} target="_blank" rel="noopener noreferrer">Repository</a>}
            </div>

            <div className="cf-block">
              <div className="cf-h3">Tasks at this desk</div>
              {tasks === null ? <p className="cf-empty">{tasksError ? `Tasks unavailable (${tasksError})` : "Loading…"}</p>
                : myTasks.length === 0 ? <p className="cf-empty">No open tasks here. Use the bar above to add one.</p>
                : <ul className="cf-list">{myTasks.map(t => (
                    <li key={t.id}><label className="cf-row"><input type="checkbox" onChange={() => toggle(t)} aria-label={`Mark done: ${t.title}`} /><span className="cf-grow">{t.title}</span></label></li>
                  ))}</ul>}
            </div>

            <div className="cf-block">
              <div className="cf-h3">Waiting for your yes</div>
              {myApprovals.length === 0 ? <p className="cf-empty">Nothing waiting here.</p>
                : <ul className="cf-list">{myApprovals.map(a => (
                    <li key={a.app + a.kind + a.label}><a className="cf-row" href={a.url} target="_blank" rel="noopener noreferrer"><span className="cf-grow">{a.label}</span><span className="cf-count">{a.count}</span></a></li>
                  ))}</ul>}
            </div>
          </section>

          <div className="cf-rail">
            <section className="cf-panel">
              <h2 className="cf-h2s">Waiting for your yes</h2>
              {approvals.failed.length > 0 && (
                <p className="cf-warn">Could not reach {approvals.failed.map(a => APP_NAME[a] ?? a).join(", ")}. Their counts are missing, not zero.</p>
              )}
              {approvals.items.length === 0
                ? <p className="cf-empty">{approvals.failed.length ? "Nothing from the apps that answered." : "Nothing waiting for your yes."}</p>
                : <>
                    <p className="cf-muted">{waiting} in total</p>
                    <ul className="cf-list">{approvals.items.map(a => (
                      <li key={a.app + a.kind + a.label}><a className="cf-row" href={a.url} target="_blank" rel="noopener noreferrer"><span className="cf-grow">{APP_NAME[a.app] ?? a.app}: {a.label}</span><span className="cf-count">{a.count}</span></a></li>
                    ))}</ul>
                  </>}
            </section>

            <section className="cf-panel">
              <h2 className="cf-h2s">Due today</h2>
              {tasks === null
                ? <p className="cf-empty">{tasksError ? `Tasks unavailable (${tasksError})` : "Loading…"}</p>
                : dueNow.length === 0 ? <p className="cf-empty">Nothing due today.</p>
                : <ul className="cf-list">{dueNow.map(t => {
                    const late = (t.due ?? "") < today;
                    return (
                      <li key={t.id}><label className="cf-row"><input type="checkbox" onChange={() => toggle(t)} aria-label={`Mark done: ${t.title}`} /><span className="cf-grow">{t.title}</span><span className={"cf-tag" + (late ? " is-late" : "")}>{late ? "Overdue" : "Today"}</span></label></li>
                    );
                  })}</ul>}
            </section>

            <section className="cf-panel">
              <h2 className="cf-h2s">Background checks</h2>
              <p className="cf-muted">
                {check === undefined ? "Loading…"
                  : check === null ? "No check has run yet."
                  : `Last run ${ago(check.at)}. ${check.errors.length ? `${check.errors.length} error${check.errors.length === 1 ? "" : "s"}` : "No errors"}.`}
              </p>
              {check && check.errors.length > 0 && (
                <ul className="cf-warn-list">{check.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}</ul>
              )}
              {checkError && <p className="cf-error" role="alert">{checkError}</p>}
              <button className="cf-btn cf-btn--ghost" type="button" onClick={runChecks} disabled={running}>{running ? "Running checks…" : "Run checks now"}</button>
            </section>

            <section className="cf-panel">
              <h2 className="cf-h2s">Other apps</h2>
              <ul className="cf-list">
                {others.map(r => {
                  const s = stOf(r);
                  const url = r.t?.deployment?.url ?? r.t?.url ?? null;
                  return (
                    <li key={r.id} className="cf-row">
                      <span className={`cf-dot cf-light--${s.light}`} aria-hidden="true" />
                      <span className="cf-grow">{r.name}</span>
                      <span className="cf-muted">{s.label}</span>
                      {url && <a className="cf-link" href={url} target="_blank" rel="noopener noreferrer">Open<span className="cf-sr"> {r.name}</span></a>}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
      </div>

    </div>
  );
}
