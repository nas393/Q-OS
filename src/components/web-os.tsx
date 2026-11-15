"use client";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./web-os.css";
import type { MetricsMap } from "@/lib/metrics";
import { buildQContext } from "@/lib/q-context";
import QMd from "@/components/q-md";

type Project={id:string;name:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceMatches?:boolean|null}|null;deploymentDataStatus?:string;githubDataStatus?:string};
type Telemetry={updatedAt:string;projects:Project[]};
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
type Alert={title:string;level:"red"|"amber"};
type Task={id:string;title:string;project:string|null;due:string|null;dueTime:string|null;done:boolean};
type Msg={role:"user"|"q";text:string};

const LOGOS:Record<string,string>={"NASSIM AI HQ / Q":"/os/logo-q.png","CERTIGO":"/os/logo-certigo.png","DALIL AL-BAZOURIEH":"/os/logo-dalil.png","LUMERIS":"/os/logo-lumeris.png","NOVAÉ":"/os/logo-novae.png","XAU/USD TRADING HQ":"/os/logo-xau.png","RADIO CEDARS":"/os/logo-radio.png"};
const NAV:{label:string;href?:string;icon:string;tab?:boolean}[]=[
 {label:"Command Center",href:"/dashboard",icon:"M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",tab:true},
 {label:"Projects",href:"#ecosystem",icon:"M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",tab:true},
 {label:"Markets & Trading",href:"#markets",icon:"M3 17l6-6 4 4 8-8M15 7h6v6",tab:true},
 {label:"AI Assistant (Q)",href:"/chat",icon:"M12 21a9 9 0 1 1 6.4-2.6L21 21M15 15l3 3",tab:true},];
const QUICK:[string,string,string][]=[
 ["Business Analysis","M4 20V10M10 20V4M16 20v-7","Give me a business analysis of my ecosystem: what is working, what is not, and the single highest-value next move."],
 ["Project Update","M12 3l9 5-9 5-9-5zM3 13l9 5 9-5","Give me a status update on all my projects: live status, blockers and the next action for each."],
 ["Market Intelligence","M3 17l6-6 4 4 8-8","Give me a market intelligence brief on gold (XAU/USD): key drivers, risks and what to watch this week. Say clearly what you cannot verify live."],
 ["Content Creation","M4 20l4-1 11-11-3-3L5 16z","Help me plan this week's content for LUMERIS and NOVAÉ with one strong idea per day."],
 ["Decision Support","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4l3 2","Act as Devil's Advocate on my most important current decision: state the proposal, assumptions, strongest counterargument, failure scenarios, missing evidence and a verdict (approve / approve with conditions / reconsider / postpone / reject)."]];

const days=(d?:string|null)=>d?Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/864e5)):null;
const ago=(iso:string|number)=>{const m=Math.round((Date.now()-new Date(iso).getTime())/6e4);return m<60?`${Math.max(1,m)}m ago`:m<2880?`${Math.round(m/60)}h ago`:`${Math.round(m/1440)}d ago`;};
const clean=(n:string)=>n.replace(" / Q","");
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Luanda"});
function Ico({d,s=18}:{d:string;s?:number}){return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;}

export default function WebOS({conversationCount=0,activityCount=0,metrics={},metricsError=null}:{conversationCount?:number;activityCount?:number;metrics?:MetricsMap;metricsError?:string|null}){
 const [clock,setClock]=useState<Date|null>(null),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [apps,setApps]=useState<AppLink[]|null>(null),[tasks,setTasks]=useState<Task[]|null>(null),[taskErr,setTaskErr]=useState(""),[newTask,setNewTask]=useState(""),[newDue,setNewDue]=useState("");
 const [weather,setWeather]=useState<{t:number;code:number}|null>(null),[search,setSearch]=useState<string|null>(null),[drawer,setDrawer]=useState(false);
 const [qState,setQState]=useState<"checking"|"online"|"offline">("checking"),[qMsgs,setQMsgs]=useState<Msg[]>([]),[qInput,setQInput]=useState(""),[qBusy,setQBusy]=useState(false),[qConv,setQConv]=useState<string|undefined>();
 const qRef=useRef<HTMLDivElement>(null);

 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/projects",{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"Sign in to load live data":`Projects API returned ${r.status}`);setData(await r.json());}catch(e){setError(e instanceof Error?e.message:"Live data unavailable");}finally{setLoading(false)}},[]);
 const loadTasks=useCallback(async()=>{try{const r=await fetch("/api/tasks",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error);setTasks(j.tasks);setTaskErr("");}catch(e){setTaskErr(e instanceof Error&&e.message?e.message:"Tasks unavailable");}},[]);
 useEffect(()=>{setClock(new Date());const t=window.setInterval(()=>setClock(new Date()),30000);return()=>window.clearInterval(t)},[]);
 useEffect(()=>{refresh();const t=window.setInterval(refresh,300000);return()=>window.clearInterval(t)},[refresh]);
 useEffect(()=>{loadTasks();
  fetch("/api/apps",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>j&&setApps(j.apps)).catch(()=>{});
  fetch("/api/chat",{cache:"no-store"}).then(r=>setQState(r.ok?"online":"offline")).catch(()=>setQState("offline"));
  fetch("https://api.open-meteo.com/v1/forecast?latitude=-8.84&longitude=13.23&current=temperature_2m,weather_code&timezone=Africa%2FLuanda").then(r=>r.json()).then(j=>j?.current&&setWeather({t:Math.round(j.current.temperature_2m),code:j.current.weather_code})).catch(()=>{});
 },[loadTasks]);
 useEffect(()=>{qRef.current?.scrollTo({top:qRef.current.scrollHeight,behavior:"smooth"})},[qMsgs]);

 const projects=useMemo(()=>data?.projects??[],[data]);
 const ready=projects.filter(p=>p.deployment?.state==="READY").length,failed=projects.filter(p=>p.deployment?.state==="ERROR").length;
 const p1=projects.filter(p=>p.priority==="P1").length,verified=projects.filter(p=>p.githubDataStatus==="VERIFIED"&&p.deploymentDataStatus==="VERIFIED").length;
 const active7=projects.filter(p=>(days(p.lastCommit?.date)??99)<=7).length;
 const exec=projects.length?Math.round(active7/projects.length*100):null;
 const alerts:Alert[]=[...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${clean(p.name)} — deploy failed`,level:"red" as const})),...projects.filter(p=>(p.openIssues??0)>0).map(p=>({title:`${clean(p.name)} — ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,level:"amber" as const}))];
 const gold=metrics.xauusd;
 const activity=useMemo(()=>[...projects.filter(p=>p.lastCommit).map(p=>({t:new Date(p.lastCommit!.date).getTime(),title:`${clean(p.name)} — ${p.lastCommit!.message}`,src:"GitHub",href:p.lastCommit!.url})),...(gold?[{t:new Date(gold.updatedAt).getTime(),title:`Trading HQ — gold updated ${gold.value.price.toFixed(2)}`,src:"Counter-Trader",href:""}]:[])].sort((a,b)=>b.t-a.t).slice(0,6),[projects,gold]);
 const open=(tasks??[]).filter(t=>!t.done);
 const agenda=[...open.filter(t=>t.due&&t.due<=today()).map(t=>({id:t.id,time:t.due===today()?(t.dueTime??"Today"):"Overdue",title:t.title,hot:t.due!==today()})),...alerts.filter(a=>a.level==="red").map(a=>({id:a.title,time:"Now",title:a.title,hot:true}))].slice(0,6);
 const filtered=search?projects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())):projects;
 const time=clock?clock.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"}):"";
 const date=clock?clock.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",timeZone:"Africa/Luanda"}):"";

 async function addT(e:FormEvent){e.preventDefault();if(!newTask.trim())return;const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newTask.trim(),...(newDue?{due:newDue}:{})})});if(r.ok){setNewTask("");setNewDue("");loadTasks();}else setTaskErr((await r.json().catch(()=>({}))).error??"Could not save");}
 async function toggleT(t:Task){setTasks(ts=>ts?.map(x=>x.id===t.id?{...x,done:!x.done}:x)??null);const r=await fetch("/api/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:t.id,done:!t.done})});if(!r.ok)loadTasks();}
 async function askQ(text:string){const msg=text.trim();if(!msg||qBusy)return;setQBusy(true);setQInput("");setQMsgs(m=>[...m,{role:"user",text:msg},{role:"q",text:""}]);
  try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,portfolioContext:buildQContext({projects,tasks,alerts,gold:gold?{price:gold.value.price,changePct:gold.value.changePct,updatedAt:gold.updatedAt}:null}),...(qConv?{conversationId:qConv}:{})})});
   if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));throw new Error(j.error??`Q returned ${r.status}`);}
   setQState("online");const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
   for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop()??"";
    for(const part of parts){const line=part.replace(/^data: /,"");try{const ev=JSON.parse(line);if(ev.conversationId)setQConv(ev.conversationId);if(ev.delta)setQMsgs(m=>{const c=[...m];c[c.length-1]={role:"q",text:c[c.length-1].text+ev.delta};return c;});if(ev.error)throw new Error(ev.error);}catch(err){if(err instanceof Error&&err.message&&!(err instanceof SyntaxError))throw err;}}}
  }catch(e){setQState("offline");setQMsgs(m=>{const c=[...m];c[c.length-1]={role:"q",text:`⚠ ${e instanceof Error?e.message:"Q is unavailable"}`};return c;});}
  finally{setQBusy(false);}}

 const navLink=(n:typeof NAV[number],cls:string)=>n.href?<a key={n.label} href={n.href} className={`${cls}${n.label==="Command Center"?" on":""}`} onClick={()=>setDrawer(false)}><Ico d={n.icon}/><span>{n.label}</span></a>:<span key={n.label} className={`${cls} soon`} aria-disabled="true"><Ico d={n.icon}/><span>{n.label}</span><em>Soon</em></span>;

 return <main className="os">
  <aside className="os-side">
   <div className="os-brand"><img src="/os/n-mark.svg" alt="" width={84} height={76}/><b>NASSIM <i>OS</i></b><small>Personal Ecosystem</small></div>
   <nav>{NAV.map(n=>navLink(n,"os-nav"))}</nav>
   <div className="os-side-art" aria-hidden="true"/>
  </aside>

  <div className="os-center">
   <header className="os-top">
    <div className="os-mbrand"><img src="/os/n-mark.svg" alt="" width={34} height={31}/><b>NASSIM <i>OS</i></b></div>
    {search!==null&&<input className="os-search" autoFocus placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setSearch(null)}}/>}
    <div className="os-tools">
     <button aria-label="Search projects" onClick={()=>{setSearch(s=>s===null?"":null);document.getElementById("ecosystem")?.scrollIntoView({behavior:"smooth"})}}><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></button>
     <a aria-label="Alerts" href="#agenda" className="os-bell"><Ico d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>{alerts.length>0&&<i>{alerts.length}</i>}</a>
     <a aria-label="Launchpad" href="#launchpad"><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></a>
    </div>
    {weather&&<div className="os-weather"><Ico d={weather.code<3?"M12 4v2M12 18v2M4 12H2M22 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z":"M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3 3 0 0 0 7 18z"} s={22}/><span><small>Luanda, AO</small>{weather.t}°C</span></div>}
    <div className="os-clock"><strong>{time}</strong><small>{date}</small></div>
   </header>

   <section className="os-hero">
    <div className="os-hero-l" aria-hidden="true"/><div className="os-hero-r" aria-hidden="true"/>
    <div className="os-hero-c">
     <img src="/os/n-mark.svg" alt="" width={74} height={67} className="os-hero-n"/>
     <h1>NASSIM</h1>
     <p className="os-sub"><i/>The Restless Architect<i/></p>
     <p className="os-eco-l">My Ecosystem</p>
     <p className="os-head"><span>Think beyond.</span><b>Build with purpose.</b></p>
     <p className="os-caps">Builder | Strategist | Creator | Explorer</p>
    </div>
   </section>

   {(error||metricsError)&&<p className="os-err">{error||metricsError}</p>}

   <section className="os-kpis" aria-label="Key performance">
    <div><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" s={30}/><span><b>{data?projects.length:"—"}</b><small>Projects</small></span></div>
    <div><Ico d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" s={30}/><span><b>{data?`${ready} / ${projects.length}`:"—"}</b><small>Deployments{failed?` · ${failed} failed`:""}</small></span></div>
    <div><Ico d="M13 2L4 14h7l-1 8 9-12h-7z" s={30}/><span><b>{data?p1:"—"}</b><small>P1 Active</small></span></div>
    <div className="nc"><Ico d="M4 20V10M10 20V4M16 20v-7M22 20H2" s={30}/><span><b>—</b><small>Growth · not connected</small></span></div>
    <div className="nc"><Ico d="M3 12h4l3-8 4 16 3-8h4" s={30}/><span><b>—</b><small>Sales · not connected</small></span></div>
    <div><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="#2a2a2e" strokeWidth="5"/><circle cx="20" cy="20" r="16" fill="none" stroke="#E5132B" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(exec??0)/100*100.5} 100.5`} transform="rotate(-90 20 20)"/></svg><span><b>{exec===null?"—":`${exec}%`}</b><small>Execution · active 7d</small></span></div>
   </section>

   <section className="os-eco" id="ecosystem">
    <div className="os-eco-h"><h2>My Projects Ecosystem</h2><button className="os-newbtn" onClick={()=>{askQ("Help me plan a new venture: ask me 3 sharp questions first, then outline Plan, Build, Launch.");document.getElementById("q")?.scrollIntoView({behavior:"smooth"})}}>+ New Venture</button></div>
    <div className="os-grid">
     {(filtered.length||!data?filtered:[]).map(p=>{const st=p.deployment?.state==="READY"?"ok":p.deployment?.state==="ERROR"?"bad":"idle";
      return <Link key={p.id} href={`/projects/${p.id}`} className="os-card">
       <div className="os-logo">{LOGOS[p.name]?<img src={LOGOS[p.name]} alt={clean(p.name)}/>:<span className="os-word">{clean(p.name)}</span>}</div>
       {LOGOS[p.name]&&p.name==="NASSIM AI HQ / Q"&&<strong>NASSIM AI HQ</strong>}
       <small>{p.area}</small>
       <em className={st}><i/>{st==="ok"?"Active":st==="bad"?"Failed":"Unverified"}</em>
      </Link>;})}
     {!data&&loading&&Array.from({length:7},(_,i)=><div key={i} className="os-card ghost"/>)}
     {data&&!filtered.length&&<p className="os-muted">No project matches “{search}”.</p>}
    </div>
   </section>

   <section className="os-panels">
    <article className="os-panel os-focus">
     <h3><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>Strategic Focus <span>(Next 15 Days)</span></h3>
     {taskErr&&<p className="os-err">{taskErr}</p>}
     {tasks&&!open.length&&<p className="os-muted">No focus items yet. Add your first below.</p>}
     <ul>{open.filter(t=>!t.due||t.due<=new Date(Date.now()+15*864e5).toISOString().slice(0,10)).slice(0,6).map(t=><li key={t.id}><label><input type="checkbox" checked={t.done} onChange={()=>toggleT(t)}/><span>{t.title}</span></label>{t.due&&<time>{t.due.slice(5)}</time>}</li>)}</ul>
     <form onSubmit={addT} className="os-add"><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a focus item" maxLength={160}/><input type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} aria-label="Due date"/><button type="submit" aria-label="Add">+</button></form>
    </article>
    <article className="os-panel os-metrics">
     <h3><Ico d="M4 20V10M10 20V4M16 20v-7"/>Key Metrics</h3>
     {[["Execution (active 7d)",exec],["Projects health",projects.length?Math.round(ready/projects.length*100):null],["Data verified",projects.length?Math.round(verified/projects.length*100):null]].map(([l,v])=><div className="os-bar" key={l as string}><span>{l}</span><i><b style={{width:`${v??0}%`}}/></i><em>{v===null?"—":`${v}%`}</em></div>)}
     <div className="os-bar"><span>Market tracking</span><i><b style={{width:gold?"100%":"0%"}} className={gold&&Date.now()-new Date(gold.updatedAt).getTime()>3600e3?"stale":""}/></i><em>{gold?ago(gold.updatedAt):"off"}</em></div>
     <div className="os-bar nc"><span>Content output</span><i><b/></i><em>n/c</em></div>
    </article>
    <article className="os-panel os-activity">
     <h3><Ico d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>Recent Activity</h3>
     {activity.length?<ul>{activity.map(a=><li key={a.title+a.t}><Ico d="M5 12l5 5 9-10" s={16}/>{a.href?<a href={a.href} target="_blank" rel="noreferrer">{a.title}</a>:<span>{a.title}</span>}<time title={a.src}>{ago(a.t)}</time></li>)}</ul>:<p className="os-muted">{loading?"Loading…":"No activity found."}</p>}
     <p className="os-foot">Q: {activityCount} events · {conversationCount} chats (24h)</p>
    </article>
   </section>

   <section className="os-panel os-markets" id="markets">
    <h3><Ico d="M3 17l6-6 4 4 8-8M15 7h6v6"/>Markets · XAU/USD</h3>
    {gold?<div className="os-gold"><b>{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</b><em className={gold.value.changePct>=0?"ok":"bad"}>{gold.value.changePct>=0?"▲ +":"▼ "}{gold.value.changePct.toFixed(2)}%</em><small>{gold.source} · {ago(gold.updatedAt)}</small>
     <svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="#E5132B" strokeWidth="2" points={(()=>{const s=gold.value.series,lo=Math.min(...s),hi=Math.max(...s),r=hi-lo||1;return s.map((v,i)=>`${(i/(s.length-1)*300).toFixed(1)},${(56-(v-lo)/r*52).toFixed(1)}`).join(" ")})()}/></svg></div>:<p className="os-muted">Waiting for Counter-Trader.</p>}
   </section>

   <section className="os-panel os-launch" id="launchpad">
    <h3><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>Launchpad <span>{apps?`${apps.filter(a=>a.url).length} live`:""}</span></h3>
    <div className="os-apps">{(apps??[]).filter(a=>a.url).map(a=><div key={a.id}><a href={a.url!} target="_blank" rel="noreferrer"><b>{a.name}</b><small>{a.url!.replace("https://","")}</small></a>{a.pages?.length?<p>{a.pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</p>:null}</div>)}</div>
   </section>
  </div>

  <aside className="os-right">
   <section className="os-q" id="q">
    <div className="os-qhead"><img src="/os/q-emblem.png" alt="" width={88} height={88}/><div><b>Q</b><span>Your Strategic Assistant</span><em className={qState}><i/>{qState==="online"?"Online":qState==="offline"?"Offline":"Checking"}</em></div></div>
    {qMsgs.length>0&&<div className="os-thread" ref={qRef}>{qMsgs.map((m,i)=><div key={i} className={`os-msg ${m.role}`}>{m.text?(m.role==="q"?<QMd text={m.text}/>:m.text):(qBusy&&i===qMsgs.length-1?"Thinking…":"")}</div>)}</div>}
    <form className="os-ask" onSubmit={e=>{e.preventDefault();askQ(qInput)}}><input value={qInput} onChange={e=>setQInput(e.target.value)} placeholder="How can I help you today?" maxLength={2000}/><button type="submit" disabled={qBusy||!qInput.trim()} aria-label="Send"><Ico d="M5 12h14M13 6l6 6-6 6"/></button></form>
    <div className="os-quick">{QUICK.map(([l,ic,prompt])=><button key={l} onClick={()=>askQ(prompt)} disabled={qBusy}><Ico d={ic} s={16}/>{l}</button>)}<Link href="/chat"><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" s={16}/>More Tools</Link></div>
   </section>
   <section className="os-panel os-agenda" id="agenda">
    <h3><Ico d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>Today&apos;s Agenda</h3>
    {agenda.length?<ul>{agenda.map(a=><li key={a.id}><i className={a.hot?"hot":""}/><span>{a.title}</span><time>{a.time}</time></li>)}</ul>:<p className="os-muted">{tasks?"Nothing due today. Add focus items with a date.":"Loading…"}</p>}
   </section>
  </aside>

  <nav className="os-tabs">{NAV.filter(n=>n.tab).map(n=><a key={n.label} href={n.href} className={n.label==="Command Center"?"on":""}><Ico d={n.icon} s={20}/>{n.label==="AI Assistant (Q)"?"Q":n.label.split(" ")[0]}</a>)}<button onClick={()=>setDrawer(true)}><Ico d="M4 6h16M4 12h16M4 18h16" s={20}/>More</button></nav>
  {drawer&&<div className="os-drawer" onClick={()=>setDrawer(false)}><nav onClick={e=>e.stopPropagation()}><div className="os-brand"><img src="/os/n-mark.svg" alt="" width={60} height={54}/><b>NASSIM <i>OS</i></b><small>The Restless Architect</small></div>{NAV.map(n=>navLink(n,"os-nav"))}<button className="os-close" onClick={()=>setDrawer(false)}>Close</button></nav></div>}
 </main>;
}
