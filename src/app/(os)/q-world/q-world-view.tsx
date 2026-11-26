"use client";

import { useEffect, useMemo, useState } from "react";
import QWorldThreeScene from "./q-world-three-scene";
import QWorldSpacePlan from "./q-world-space-plan";
import "./q-world.css";

type Unit = { id:string; name:string; department:string; role:string; color:[number,number,number]; mission:string; keys:string[] };
type LiveApp={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
const normalizeAppKey=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
const statusLabel=(state:string|null|undefined)=>state==="READY"?"Live":state==="BUILDING"||state==="QUEUED"||state==="INITIALIZING"?"Deploying":state==="ERROR"||state==="FAILED"?"Build failed":state==="EXTERNAL"?"External link":state?"Status: "+state:"No live status";
const UNITS:Unit[] = [
 {id:"q",name:"Q EXECUTIVE OFFICE",department:"Executive",role:"Owner cockpit and company command",color:[.82,.16,.19],mission:"Set direction, review priorities and approve consequential company actions",keys:["q-os","q-jarvis"]},
 {id:"novae",name:"NOVAÉ",department:"Commercial & Growth",role:"Brand and growth studio",color:[.79,.58,.26],mission:"Acquire clients and deliver brand services",keys:["novae","novae-site"]},
 {id:"certigo",name:"CERTIGO",department:"Education",role:"Learning platform",color:[.18,.52,.88],mission:"Build and monetise professional learning",keys:["certigo","certigo-institute"]},
 {id:"ali-quest",name:"ALI-QUEST / CISA QUEST",department:"Education",role:"Learning game",color:[.22,.65,.78],mission:"Create engaging educational experiences",keys:["ali-quest","ali-quest-battle-academy"]},
 {id:"lumeris",name:"LUMERIS",department:"Media & Community",role:"Media and audience business",color:[.82,.19,.22],mission:"Grow audience and monetise media",keys:["lumeris"]},
 {id:"radio",name:"RADIO CEDARS",department:"Media & Community",role:"Audio and community media",color:[.54,.38,.78],mission:"Build a loyal audience and sponsorship revenue",keys:["radio-cedars","radio"]},
 {id:"lep",name:"LUANDA EDGE PULSE",department:"Intelligence",role:"Market intelligence",color:[.2,.68,.57],mission:"Turn verified market signals into decisions",keys:["lep","luanda-edge-pulse"]},
 {id:"dalil",name:"DALIL AL-BAZOURIEH",department:"Directory & Network",role:"Business directory",color:[.76,.62,.4],mission:"Build a trusted local business discovery network",keys:["dalil","dalil-al-bazourieh","dalil-al-bazouria"]},
 {id:"xauusd",name:"XAU/USD TRADING HQ",department:"Trading & Investment",role:"Trading research system",color:[.22,.68,.38],mission:"Analyse markets; all trades remain owner-controlled",keys:["xauusd","counter-trader","gold"]}
];
type VisualSettings={environment:"executive"|"daylight"|"sunset";palette:"brand"|"monochrome"|"vibrant";brightness:number;zoom:number;orbit:number;quality:"performance"|"balanced"|"high";labels:boolean};
const DEFAULT_VISUALS:VisualSettings={environment:"daylight",palette:"brand",brightness:1,zoom:1,orbit:42,quality:"balanced",labels:true};

export function QWorldView(){
 const [mode,setMode]=useState<"isometric"|"third-person">("isometric");
 const [selected,setSelected]=useState("q");
 const [viewMode,setViewMode]=useState<"world"|"plan">("world");
 const [visuals,setVisuals]=useState<VisualSettings>(DEFAULT_VISUALS);
 const [directorOpen,setDirectorOpen]=useState(true);
 const [walkCameraAngle,setWalkCameraAngle]=useState(0);
 const [apps,setApps]=useState<LiveApp[]>([]);
 const [appsState,setAppsState]=useState<"loading"|"ready"|"error">("loading");
 useEffect(()=>{
  let stopped=false;
  fetch("/api/apps",{cache:"no-store",credentials:"same-origin"}).then(async r=>{
   if(!r.ok)throw new Error("App registry unavailable");
   const data=await r.json();
   if(!stopped){setApps(Array.isArray(data.apps)?data.apps:[]);setAppsState("ready");}
  }).catch(()=>{if(!stopped)setAppsState("error");});
  return()=>{stopped=true;};
 },[]);
 const appFor=useMemo(()=> (unit:Unit)=>apps.find(app=>[app.id,app.name].some(value=>unit.keys.some(key=>normalizeAppKey(key)===normalizeAppKey(value))))??null,[apps]);
 const active=UNITS.find(u=>u.id===selected)??UNITS[0];\n const activeApp=appFor(active);
 const updateVisuals=(patch:Partial<VisualSettings>)=>setVisuals(v=>({...v,...patch}));
 return <main className="qw-shell">
  <header className="qw-header"><div><span className="qw-kicker">Q COMPANY · HEADQUARTERS SIMULATOR</span><h1>Q WORLD</h1><p>One company. Connected businesses. One objective: profitable growth.</p></div><div className="qw-live"><i/> HQ FOUNDATION · READ ONLY</div></header>
  <div className="qw-toolbar"><div className="qw-mode" role="group" aria-label="Camera mode"><button type="button" aria-pressed={mode==="isometric"} onClick={()=>setMode("isometric")}>Isometric management</button><button type="button" aria-pressed={mode==="third-person"} onClick={()=>setMode("third-person")}>Walk inside HQ</button></div><span className="qw-hint">{mode==="isometric"?"Headquarters overview · select an office below":"W/S move · A/D strafe · ←/→ turn · drag to look"}</span><div className="qw-mode" role="group" aria-label="Headquarters view"><button type="button" aria-pressed={viewMode==="world"} onClick={()=>setViewMode("world")}>3D HQ</button><button type="button" aria-pressed={viewMode==="plan"} onClick={()=>setViewMode("plan")}>Space plan</button></div></div>
  {viewMode==="plan"?<QWorldSpacePlan/>:<>
   <div className="qw-layout">
    <section className="qw-stage" aria-label="Interactive three-dimensional Q headquarters">
     <QWorldThreeScene mode={mode} selected={selected} visuals={visuals} walkAngle={walkCameraAngle} onWalkAngleChange={setWalkCameraAngle}/>
     {visuals.labels&&<div className="qw-overlay"><b>Q HEADQUARTERS</b><span>ONE EXECUTIVE HQ · EIGHT BUSINESS UNITS</span></div>}
     <div className="qw-scene-caption"><span>NOW VIEWING</span><b>{active.name}</b><small>{active.department} · EXECUTIVE HQ</small></div>
    </section>
    <aside className="qw-inspector" aria-label="Selected business unit"><span className="qw-kicker">SELECTED OFFICE</span><h2>{active.name}</h2><div className="qw-floor-tag">SINGLE-LEVEL EXECUTIVE SUITE</div><p>{active.role}</p><div className="qw-dept">{active.department}</div><p className="qw-mission">{active.mission}</p><div className="qw-app-live" data-state={activeApp?.state??"unknown"}><b>{activeApp?statusLabel(activeApp.state):appsState==="loading"?"Checking app registry…":appsState==="error"?"Live app status unavailable":"No linked app in registry"}</b><small>{activeApp?.name??"App connection"}</small></div><small>Live financial KPIs: not connected in this foundation release.</small>{activeApp?.url&&<a href={activeApp.url} target="_blank" rel="noreferrer">Open {active.name} app</a>}<a href="/office">Open existing Office</a></aside>
   </div>
   <section className="qw-director" aria-labelledby="qw-director-title">
    <div className="qw-director-head"><div><span className="qw-kicker">OWNER CONTROL PANEL</span><h2 id="qw-director-title">Visual Director</h2><p>Change the look and presentation of the Q executive headquarters.</p></div><button type="button" aria-expanded={directorOpen} onClick={()=>setDirectorOpen(v=>!v)}>{directorOpen?"Hide controls":"Show controls"}</button></div>
    {directorOpen&&<div className="qw-control-grid">
     <label>Environment<select value={visuals.environment} onChange={e=>updateVisuals({environment:e.target.value as VisualSettings["environment"]})}><option value="executive">Executive night</option><option value="daylight">Daylight</option><option value="sunset">Sunset</option></select></label>
     <label>Building colour style<select value={visuals.palette} onChange={e=>updateVisuals({palette:e.target.value as VisualSettings["palette"]})}><option value="brand">Brand colours</option><option value="vibrant">Vibrant</option><option value="monochrome">Monochrome</option></select></label>
     <label>Graphics quality<select value={visuals.quality} onChange={e=>updateVisuals({quality:e.target.value as VisualSettings["quality"]})}><option value="performance">Performance · 1×</option><option value="balanced">Balanced · 1.25×</option><option value="high">High · 1.5×</option></select></label>
     <label className="qw-range">Lighting <b>{Math.round(visuals.brightness*100)}%</b><input type="range" min=".55" max="1.45" step=".05" value={visuals.brightness} onChange={e=>updateVisuals({brightness:Number(e.target.value)})}/></label>
     <label className="qw-range">Camera zoom <b>{Math.round(visuals.zoom*100)}%</b><input type="range" min=".65" max="1.45" step=".05" value={visuals.zoom} onChange={e=>updateVisuals({zoom:Number(e.target.value)})}/></label>
     <label className="qw-range">Isometric camera angle <b>{Math.round(visuals.orbit)}°</b><input type="range" min="0" max="360" step="5" value={visuals.orbit} onChange={e=>updateVisuals({orbit:Number(e.target.value)})}/></label>
     {mode==="third-person"&&<label className="qw-range">Walk camera angle <b>{Math.round(walkCameraAngle)}°</b><input type="range" min="0" max="360" step="1" value={walkCameraAngle} onChange={e=>setWalkCameraAngle(Number(e.target.value))}/></label>}
     {mode==="third-person"&&<button type="button" className="qw-reset" onClick={()=>setWalkCameraAngle(0)}>Reset walk camera</button>}
     <label className="qw-toggle"><input type="checkbox" checked={visuals.labels} onChange={e=>updateVisuals({labels:e.target.checked})}/> Show headquarters labels</label>
     <button type="button" className="qw-reset" onClick={()=>setVisuals(DEFAULT_VISUALS)}>Reset visual settings</button>
    </div>}
    <p className="qw-simulation-note">Visual settings apply to the live 3D scene. Business data remains read-only.</p>
   </section>
   <section className="qw-units" aria-labelledby="qw-units-title"><div><span className="qw-kicker">HQ OFFICE DIRECTORY</span><h2 id="qw-units-title">Choose an office</h2></div><div className="qw-unit-grid">{UNITS.map(u=><button key={u.id} type="button" className={selected===u.id?"active":""} onClick={()=>setSelected(u.id)} aria-pressed={selected===u.id}><span style={{background:`rgb(${u.color.map(v=>Math.round(v*255)).join(",")})`}}/><b>{u.name}</b><small>{u.department} · Executive suite</small><em className="qw-app-status" data-state={appFor(u)?.state??"unknown"}>{appFor(u)?statusLabel(appFor(u)?.state):appsState==="loading"?"Checking…":appsState==="error"?"Status unavailable":"No linked app"}</em></button>)}</div><p className="qw-simulation-note">One headquarters · one executive floor · nine dedicated offices. No live tasks, revenue or costs are changed. Real KPIs will only appear after verified data connections.</p></section>
  </>}
 </main>;
}
