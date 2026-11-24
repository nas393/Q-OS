"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { EmployeeAgent, SimulationState } from "@/lib/simulation/types";
import type { RecruitAction } from "@/lib/simulation/recruit";
import { summarize } from "@/lib/simulation/autopilot";
import type { WorldAction } from "@/lib/office/world-contract";
import { loadWorld, runWorldAction } from "./world-actions";
import { SceneErrorBoundary, WorldScene, type CameraMode } from "./office-scene";
import { CompanyPanel, companyClock, type PanelTab } from "./company-panel";

/* The fictional executive world. The company runs on the server (autopilot), this page shows it and sends owner actions.
   Nothing here changes Q OS records. */
const REFRESH_MS = 15_000;

/* Whether this device can start a WebGL context. Some devices and browsers have WebGL switched off. */
function canUseWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
}

function WorldUnavailable({ reason, onRetry }: { reason: string; onRetry?: () => void }) {
  return <div className="q3d-unavailable" role="status">
    <b>3D view unavailable</b>
    <p>{reason} The team list below still works: pick a person to see their role, status and current task.</p>
    {onRetry && <button type="button" className="btn ghost" onClick={onRetry}>Try the 3D view again</button>}
  </div>;
}

export function ExecutiveWorld3D() {
  const [world, setWorld] = useState<SimulationState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("ceo");
  const [camera, setCamera] = useState<CameraMode>("FREE");
  const [tab, setTab] = useState<PanelTab>("overview");
  const [department, setDepartment] = useState("All");
  const [webgl] = useState<boolean>(() => typeof document === "undefined" || canUseWebGL());
  const [attempt, setAttempt] = useState(0);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      setWorld(await loadWorld());
      setLoadError(null);
    } catch {
      setLoadError("The company could not be reached. Retrying shortly.");
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const act = useCallback(async (action: WorldAction) => {
    setBusy(true);
    try {
      const reply = await runWorldAction(action);
      if (reply.state) setWorld(reply.state);
      setNotice(reply.ok ? reply.message : reply.error);
      if (reply.ok) setLoadError(null);
    } catch {
      setNotice("That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const focus = useCallback((id: string) => { setSelected(id); setCamera("FOLLOW"); }, []);

  if (!world) {
    return <div className="q3d-shell q3d-living q3d-premium">
      <div className="q3d-loading" role="status">{loadError ?? "Opening the company…"}</div>
    </div>;
  }

  const s = summarize(world);
  const selectedEmployee: EmployeeAgent = world.employees.find(e => e.id === selected) ?? world.employees[0];

  return <div className="q3d-shell q3d-living q3d-premium">
    <div className="q3d-toolbar">
      <span className="q3d-live"><i />LIVE · {companyClock(world, world.simulatedAt)}</span>
      <span>{s.completedTasks} tasks done · {s.results} results{busy ? " · saving…" : ""}</span>
      <div>
        <button type="button" disabled={busy} onClick={() => act({ type: world.paused ? "resume" : "pause" })}>{world.paused ? "Resume" : "Pause"}</button>
        {([1, 2, 4] as const).map(sp => <button key={sp} type="button" disabled={busy} aria-pressed={world.speed === sp} onClick={() => act({ type: "speed", speed: sp })}>{sp}×</button>)}
        <button type="button" aria-pressed={camera === "CEO"} onClick={() => setCamera("CEO")}>CEO</button>
        <button type="button" aria-pressed={camera === "FREE"} onClick={() => setCamera("FREE")}>Explore</button>
        <button type="button" aria-pressed={camera === "FOLLOW"} onClick={() => setCamera("FOLLOW")}>Follow</button>
        <button type="button" aria-pressed={camera === "CINEMA"} onClick={() => setCamera("CINEMA")}>Cinematic</button>
      </div>
    </div>
    <div className="q3d-stage">
      {webgl ? <SceneErrorBoundary key={attempt} label="3D view" fallback={<WorldUnavailable reason="The 3D view stopped on this device." onRetry={() => setAttempt(a => a + 1)} />}>
        <Suspense fallback={<div className="q3d-loading">Loading headquarters…</div>}>
          <WorldScene employees={world.employees} selected={selected} onSelect={focus} cameraMode={camera} />
        </Suspense>
      </SceneErrorBoundary> : <WorldUnavailable reason="This device cannot start the 3D view (WebGL is switched off or unavailable)." />}
      <div className="q3d-scene-hud"><span>Q EXECUTIVE CAMPUS · FICTIONAL</span><span>{world.employees.filter(e => e.tier === "leadership").length} EXECUTIVES · {world.employees.length} PEOPLE</span></div>
    </div>
    {loadError && <p className="q3d-hiring-notice" role="alert">{loadError}</p>}
    <CompanyPanel
      world={world} tab={tab} onTab={setTab} department={department} onDepartment={setDepartment}
      selected={selectedEmployee} onSelect={focus} onAction={(a: RecruitAction) => act(a)} notice={notice}
    />
    <p className="q3d-disclaimer">FICTIONAL COMPANY · SIMULATION ONLY · NO LIVE Q OS TASKS OR BUSINESS RECORDS ARE MODIFIED</p>
    <p className="q3d-asset-credit">Character models: vinish.dev · CC BY 4.0 · included in asset credits</p>
  </div>;
}
