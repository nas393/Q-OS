"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./web-os.css";
import type { MetricsMap } from "@/lib/metrics";

type Project={id:string;name:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceRepo?:string|null;sourceMatches?:boolean|null}|null;deploymentError?:string|null;issuesError?:string|null;commitError?:string|null;issuesDataStatus?:string;commitDataStatus?:string;deploymentDataStatus?:string;githubDataStatus?:string;integration:{github:boolean;vercel:boolean}};
type Telemetry={updatedAt:string;integrations:{github:boolean;githubTokenConfigured:boolean;vercel:boolean};projects:Project[]};
const marks=["Q","C","د","L","▶","X","N","R"];
const types=["Personal HQ / AI","Education / Certification","Business Directory","Media / Mindset","Creator Tools","Trading / Markets","Branding / Marketing","Media / Audio"];
const nav=[["⌂","Command Center","/dashboard"],["▱","Projects","/projects"],["▥","Business Intelligence","/projects"],["⌁","Trading HQ","/projects"],["◈","AI Studio","/chat"],["▷","Media & Content","/projects"],["▤","Operations","/projects"],["◷","Analytics","/projects"],["▣","Resources","/projects"]];
const nice=(s:string)=>s.replaceAll("_"," ");
const donutColors=["#f32b3d","#73777e","#c89a5b","#d8d9dd","#34363d"];
const arrow=(t?:string)=>t==="up"?"▲":t==="down"?"▼":"■";
const tone=(t?:string)=>t==="up"?"positive":t==="down"?"negative":"";
const ago=(iso:string)=>{const h=Math.round((Date.now()-new Date(iso).getTime())/36e5);return h<1?"just now":h<48?`${h}h ago`:`${Math.round(h/24)}d ago`;};
function Stamp({entry}:{entry?:{source:string;updatedAt:string}}){return entry?<small className="q-stamp" title={new Date(entry.updatedAt).toLocaleString()}>{entry.source} · {ago(entry.updatedAt)}</small>:null;}
function Empty({k}:{k:string}){return <div className="q-empty"><b>NO DATA YET</b><span>Push <code>{k}</code> to /api/ingest from the source project.</span></div>;}
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
type Alert={title:string;level:"red"|"amber";href?:string};
export default function WebOS({conversationCount=0,activityCount=0,metrics={},metricsError=null}:{conversationCount?:number;activityCount?:number;metrics?:MetricsMap;metricsError?:string|null}){
 const [clock,setClock]=useState(new Date()),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[searchOpen,setSearchOpen]=useState(false),[active,setActive]=useState("Command Center"),[apps,setApps]=useState<AppLink[]|null>(null),[appsError,setAppsError]=useState("");
 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/projects",{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"Sign in to load live project telemetry":`Portfolio API returned ${r.status}`);setData(await r.json());}catch(e){setError(e instanceof Error?e.message:"Telemetry unavailable");}finally{setLoading(false)}},[]);
 useEffect(()=>{const t=window.setInterval(()=>setClock(new Date()),1000);return()=>window.clearInterval(t)},[]);
 useEffect(()=>{fetch("/api/apps",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error??`Apps API returned ${r.status}`);setApps(j.apps)}).catch(e=>setAppsError(e instanceof Error?e.message:"Apps unavailable"))},[]);
 useEffect(()=>{refresh();const t=window.setInterval(refresh,300000);return()=>window.clearInterval(t)},[refresh]);
 const projects=useMemo(()=>data?.projects??[],[data]);
 const filtered=useMemo(()=>projects.filter(p=>(p.name+" "+p.area+" "+(p.repo??"")).toLowerCase().includes(query.toLowerCase())),[projects,query]);
 const ready=projects.filter(p=>p.deployment?.state==="READY").length,failed=projects.filter(p=>p.deployment?.state==="ERROR").length;
 const vercelVerified=projects.filter(p=>p.deploymentDataStatus==="VERIFIED").length;
 const githubVerified=projects.filter(p=>p.githubDataStatus==="VERIFIED").length;
 const unresolved=projects.filter(p=>p.githubDataStatus!=="VERIFIED"||p.deploymentDataStatus!=="VERIFIED").length;
 const liveAlerts:Alert[]=[
  ...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${p.name} — latest deploy FAILED`,level:"red" as const})),
  ...projects.filter(p=>!p.vercel||!p.repo).map(p=>({title:`${p.name} — ${!p.repo?"no GitHub repo linked":"no Vercel project linked"}`,level:"amber" as const})),
  ...projects.filter(p=>p.deployment?.sourceMatches===false).map(p=>({title:`${p.name} — deploy source ≠ mapped repo`,level:"amber" as const})),
  ...projects.filter(p=>(p.openIssues??0)>0).map(p=>({title:`${p.name} — ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,level:"amber" as const}))
 ];
 const alerts=[...liveAlerts,...(metrics.alerts?.value??[])];
 const {kpis,revenueTrend:rev,channelMix:mix,factory,insights,agenda,xauusd:gold}=metrics;
 const revMax=rev?Math.max(...rev.value.points.map(p=>p.value),1):1;
 const goldPath=gold?(()=>{const s=gold.value.series,lo=Math.min(...s),hi=Math.max(...s),r=hi-lo||1;return "M"+s.map((v,i)=>`${(i/(s.length-1)*320).toFixed(1)} ${(104-(v-lo)/r*100).toFixed(1)}`).join(" L");})():"";
 let acc=0;const conic=mix?mix.value.items.map((it,i)=>{const a=acc;acc+=it.pct;return `${donutColors[i]} ${a}% ${acc}%`;}).join(",")+(acc<100?`,#22232a ${acc}% 100%`:""):"";
 const date=clock.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
 const time=clock.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:false});
 const stateClass=(p:Project)=>p.deployment?.state==="READY"?"ready":p.deployment?.state==="ERROR"?"failed":"unknown";
 return <main className="q-command-center">
  <aside className="q-sidebar">
   <a className="q-logo" href="/dashboard"><span>Q</span> OS<small>OPERATIONS SYSTEM</small></a>
   <nav>{nav.map(([icon,label,url])=><a key={label} href={url} className={active===label?"selected":""} onClick={()=>setActive(label)}><i>{icon}</i>{label}</a>)}</nav>
   <a className="q-assistant-link" href="/chat"><b>✧</b> Q Assistant</a>
   <div className="q-profile"><div className="q-avatar">N</div><span><b>Nassim</b><small>Portfolio Operator</small></span><a href="/login" aria-label="Account settings">⚙</a></div>
  </aside>
  <section className="q-main">
   <header className="q-topbar"><div><h1>Command Center</h1><p>Portfolio · Operations · Growth · Execution</p></div><div className="q-top-right"><span className="q-date">▣ {date}</span><strong>{time}</strong><small>⌖ Luanda (GMT+1)</small><button aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}>⌕</button><button aria-label="Refresh notifications" onClick={refresh}>♧<i/></button><Link href="/projects" aria-label="Open modules">▦</Link></div></header>
   <div className="q-content">
    {searchOpen&&<div className="q-global-search"><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects, repositories and workspaces…"/><button onClick={()=>{setQuery("");setSearchOpen(false)}}>CLOSE</button></div>}
    <section className="q-hero"><div className="q-hero-copy"><small>Q OS / EXECUTIVE COMMAND ENVIRONMENT</small><h2>Build. Operate. <em>Grow.</em></h2><p>Projects&nbsp; | &nbsp;Business&nbsp; | &nbsp;Markets&nbsp; | &nbsp;Content&nbsp; | &nbsp;AI</p></div><div className="q-hero-scene"><div className="q-skyline"/><div className="q-globe"><span>AFRICA</span></div><b>ANGOLA</b></div></section>
    {metricsError&&<div className="q-inline-error">{metricsError}</div>}
    <section className="q-kpis">
     {kpis?.value.length?kpis.value.map(k=><article key={k.label}><small>{k.label.toUpperCase()}</small><strong>{k.value}</strong>{k.progress!==undefined?<div className="q-kpi-progress"><i style={{width:k.progress+"%"}}/></div>:k.delta?<em className={tone(k.trend)}>{arrow(k.trend)} {k.delta}</em>:null}</article>)
      :[["LIVE DEPLOYS",data?`${ready}/${projects.length}`:"—"],["FAILED BUILDS",data?String(failed):"—"],["UNVERIFIED",data?String(unresolved):"—"],["Q CONVERSATIONS",String(conversationCount)],["ACTIVITY (24H)",String(activityCount)]].map(([l,v])=><article key={l}><small>{l}</small><strong>{v}</strong><em>system · live</em></article>)}
    </section>
    {kpis?<Stamp entry={kpis}/>:<small className="q-stamp">Business KPIs not pushed yet — showing system KPIs.</small>}
    <section className="q-dashboard-grid">
     <article className="q-panel q-portfolio"><header><div><small>EXECUTION / 01</small><h3>Project Portfolio <b>({data?String(projects.length).padStart(2,"0"):"—"})</b></h3></div><div className="q-filters"><span>READY {data?ready:"—"}</span><span>FAILED {data?failed:"—"}</span><span>UNVERIFIED {data?unresolved:"—"}</span></div></header>
      {error&&<div className="q-inline-error">{error}</div>}
      <div className="q-project-grid">{(query?filtered:projects.length?projects: Array.from({length:8},(_,i)=>({id:String(i),name:["NASSIM AI HQ","CERTIGO","DALIL AL-BAZOURIEH","LUMERIS","LUMERIS REEL MAKER","XAU/USD TRADING HQ","NOVAÉ","RADIO CEDARS"][i],area:"Project workspace",priority:"—",repo:null,vercel:null,next:"",openIssues:null,lastCommit:null,deployment:null,integration:{github:false,vercel:false}} as Project))).map((p,idx)=>{const f=projects.findIndex(x=>x.id===p.id);const i=f>=0?f:idx;const href=`/projects/${p.id}`;return <Link className="q-project-card" key={p.id} href={href}><div className={`q-project-art art-${i}`}><b>{marks[i]}</b><span>{String(i+1).padStart(2,"0")}</span></div><strong>{p.name.replace(" / Q","")}</strong><small>{types[i]??p.area}</small><footer><i className={stateClass(p)}/><span>{p.deployment?nice(p.deployment.state):loading?"SYNCING":nice(p.deploymentDataStatus??"UNVERIFIED")}</span><em>{p.priority}</em></footer></Link>})}</div>
      <div className="q-portfolio-foot"><span>{loading?"SYNCHRONIZING PORTFOLIO":data?`UPDATED ${new Date(data.updatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"LIVE DATA UNAVAILABLE"}</span><button onClick={refresh}>↻ REFRESH DATA</button><Link href="/projects">OPEN PROJECT WORKSPACE ↗</Link></div>
     </article>
     <div className="q-side-stack">
      <article className="q-panel q-intelligence"><header><div><small>DECISION SUPPORT / 02</small><h3>Q Intelligence</h3></div><Stamp entry={insights}/></header>
       {insights?.value.length?insights.value.map(x=><div className="q-insight" key={x.title}><b>{x.trend==="up"?"↗":x.trend==="down"?"↘":"◎"}</b><span><strong>{x.title}</strong>{x.detail&&<small>{x.detail}</small>}</span></div>):<Empty k="insights"/>}
      </article>
      <article className="q-panel q-actions"><header><div><small>WORKSPACE / 03</small><h3>Quick Actions</h3></div></header><div className="q-action-grid"><Link href="/projects"><b>▱</b><span>Projects</span></Link><Link href="/chat"><b>✧</b><span>Q Assistant</span></Link><Link href="/projects"><b>↗</b><span>Deployments</span></Link><Link href="/projects"><b>▥</b><span>Reports</span></Link></div></article>
     </div>
     <article className="q-panel q-agenda"><header><div><small>OPERATING RHYTHM / 04</small><h3>Today’s Agenda</h3></div><Stamp entry={agenda}/></header>
      {agenda?.value.length?<div className="q-agenda-list">{agenda.value.map(a=><p key={a.time+a.title}><time>{a.time}</time><span><b>{a.title}</b></span></p>)}</div>:<Empty k="agenda"/>}
     </article>
     <article className="q-panel q-alerts"><header><div><small>ATTENTION REQUIRED / 05</small><h3>Alerts & Watchlist</h3></div><b className="q-alert-count">{data||metrics.alerts?alerts.length:"—"}</b></header>
      {alerts.length?alerts.slice(0,7).map((a,i)=>a.href?<a key={i} href={a.href} target="_blank" rel="noreferrer"><p><i className={a.level}/>{a.title} <span>›</span></p></a>:<p key={i}><i className={a.level}/>{a.title}</p>):<p>{loading?"Checking projects…":data?"No alerts. All linked projects verified.":"Project telemetry unavailable — alerts cannot be checked."}</p>}
     </article>
    </section>
    <section className="q-bottom-grid">
     <article className="q-panel q-revenue"><header><div><small>PERFORMANCE / 06</small><h3>Revenue Trend</h3></div><Stamp entry={rev}/></header>{rev?<><div className="q-chart-total"><strong>{rev.value.total}</strong>{rev.value.delta&&<em className={tone(rev.value.trend)}>{rev.value.delta}</em>}</div><div className="q-bars">{rev.value.points.map(p=><div key={p.label} title={String(p.value)}><i style={{height:Math.max(2,p.value/revMax*100)+"%"}}/><small>{p.label}</small></div>)}</div></>:<Empty k="revenueTrend"/>}</article>
     <article className="q-panel q-channel"><header><div><small>COMMERCIAL / 07</small><h3>Channel Mix (Sales)</h3></div><Stamp entry={mix}/></header>{mix?<div className="q-donut-wrap"><div className="q-donut" style={{background:`conic-gradient(${conic})`}}><strong>{mix.value.total}</strong></div><div className="q-legend">{mix.value.items.map(it=><p key={it.label}><i/>{it.label} <b>{it.pct}%</b></p>)}</div></div>:<Empty k="channelMix"/>}</article>
     <article className="q-panel q-trading"><header><div><small>MARKETS / 08</small><h3>Trading – XAU/USD</h3></div><Stamp entry={gold}/></header>{gold?<><div className="q-price"><strong>{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><em className={gold.value.changePct>=0?"positive":"negative"}>{gold.value.changePct>=0?"▲ +":"▼ "}{gold.value.changePct.toFixed(2)}%</em></div><svg className="q-spark" viewBox="0 0 320 112" preserveAspectRatio="none" role="img" aria-label="XAU USD price series"><path d={goldPath} fill="none" stroke={gold.value.changePct>=0?"#35df82":"#f33e50"} strokeWidth="2.5"/></svg>{gold.value.timeframe&&<div className="q-timeframes"><b>{gold.value.timeframe}</b></div>}</>:<Empty k="xauusd"/>}</article>
     <article className="q-panel q-factory"><header><div><small>OPERATIONS / 09</small><h3>Factory Utilization</h3></div><Stamp entry={factory}/></header>{factory?<><div className="q-factory-total"><strong>{factory.value.overall}%</strong><span>Overall</span></div>{factory.value.items.map(it=><div className="q-factory-row" key={it.label}><span>{it.label}</span><div><i style={{width:it.pct+"%"}}/></div><b>{it.pct}%</b></div>)}</>:<Empty k="factory"/>}</article>
    </section>
    <section className="q-panel q-apps"><header><div><small>LAUNCHPAD / 10</small><h3>Apps & Links</h3></div><span className="q-live">{apps?`${apps.filter(a=>a.url).length} LIVE`:appsError?"OFFLINE":"SYNCING"}</span></header>
     {appsError&&<div className="q-inline-error">{appsError}</div>}
     <div className="q-app-grid">{(apps??[]).map(a=>a.url?<div key={a.id} className="q-app-wrap"><a href={a.url} target="_blank" rel="noreferrer" className="q-app"><b>{a.name.slice(0,1).toUpperCase()}</b><span>{a.name}</span><small>{a.url.replace("https://","")}</small></a>{a.pages?.length?<div className="q-app-pages">{a.pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</div>:null}</div>:<div key={a.id} className="q-app off"><b>{a.name.slice(0,1).toUpperCase()}</b><span>{a.name}</span><small>no production deploy</small></div>)}</div>
     {metrics.links?.length?metrics.links.filter(g=>g.source!=="counter-trader").map(g=><div className="q-link-group" key={g.source}><h4>{g.source}<Stamp entry={g}/></h4><div>{g.value.map(l=><a key={l.url} href={l.url} target="_blank" rel="noreferrer" title={l.note}>{l.label} ↗</a>)}</div></div>):null}
    </section>
    <footer className="q-footer"><span>Q OS · EXECUTIVE COMMAND CENTER</span><span>PRIVATE PORTFOLIO ENVIRONMENT · LUANDA</span></footer>
   </div>
  </section>
 </main>;
}
