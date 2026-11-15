"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./web-os.css";
import type { MetricsMap } from "@/lib/metrics";
import { NMark, narrative, philosophy, dayPick } from "@/components/brand";

type Project={id:string;name:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceRepo?:string|null;sourceMatches?:boolean|null}|null;deploymentDataStatus?:string;githubDataStatus?:string;integration:{github:boolean;vercel:boolean}};
type Telemetry={updatedAt:string;projects:Project[]};
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
type Alert={title:string;level:"red"|"amber";href?:string};
type Insight={title:string;detail?:string;trend?:"up"|"down"|"flat"};

const HERO="https://images.unsplash.com/photo-1565892153078-a5dd115cf9ce?ixlib=rb-4.1.0&q=70&fm=jpg&crop=entropy&cs=srgb&w=1800";
const covers=["#1a2440","#2a1220","#13263a","#2b1a12","#16202e","#241a33","#102a2a","#2c1418"];
const days=(d?:string|null)=>d?Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/864e5)):null;
const ago=(iso:string)=>{const h=Math.round((Date.now()-new Date(iso).getTime())/36e5);return h<1?"just now":h<48?`${h}h ago`:`${Math.round(h/24)}d ago`;};
const clean=(n:string)=>n.replace(" / Q","");

function Ico({d}:{d:string}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;}
const I={home:"M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",apps:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",chart:"M4 19h16M6 15l4-5 3 3 5-7",spark:"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",bell:"M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0",refresh:"M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"};

export default function WebOS({conversationCount=0,activityCount=0,metrics={},metricsError=null}:{conversationCount?:number;activityCount?:number;metrics?:MetricsMap;metricsError?:string|null}){
 const [clock,setClock]=useState<Date|null>(null),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[apps,setApps]=useState<AppLink[]|null>(null),[appsError,setAppsError]=useState("");
 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/projects",{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"Sign in to load live project telemetry":`Portfolio API returned ${r.status}`);setData(await r.json());}catch(e){setError(e instanceof Error?e.message:"Telemetry unavailable");}finally{setLoading(false)}},[]);
 useEffect(()=>{setClock(new Date());const t=window.setInterval(()=>setClock(new Date()),30000);return()=>window.clearInterval(t)},[]);
 useEffect(()=>{fetch("/api/apps",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error??`Apps API returned ${r.status}`);setApps(j.apps)}).catch(e=>setAppsError(e instanceof Error?e.message:"Apps unavailable"))},[]);
 useEffect(()=>{refresh();const t=window.setInterval(refresh,300000);return()=>window.clearInterval(t)},[refresh]);

 const projects=useMemo(()=>data?.projects??[],[data]);
 const failed=projects.filter(p=>p.deployment?.state==="ERROR").length;
 const unresolved=projects.filter(p=>p.githubDataStatus!=="VERIFIED"||p.deploymentDataStatus!=="VERIFIED").length;
 const issues=projects.reduce((n,p)=>n+(p.openIssues??0),0);
 const liveApps=apps?.filter(a=>a.url&&a.state==="READY").length??null;
 const alerts:Alert[]=[
  ...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${clean(p.name)} — latest deploy failed`,level:"red" as const})),
  ...projects.filter(p=>p.deployment?.sourceMatches===false).map(p=>({title:`${clean(p.name)} — deploy source differs from repo`,level:"amber" as const})),
  ...projects.filter(p=>(p.openIssues??0)>0).map(p=>({title:`${clean(p.name)} — ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,level:"amber" as const})),
  ...(metrics.alerts?.value??[])
 ];
 const withCommit=projects.filter(p=>p.lastCommit?.date).sort((a,b)=>new Date(b.lastCommit!.date).getTime()-new Date(a.lastCommit!.date).getTime());
 const stale=withCommit.filter(p=>(days(p.lastCommit!.date)??0)>30);
 const insights:Insight[]=[...(metrics.insights?.value??[]),...(data?[
  {title:`${liveApps??"—"} of ${apps?.length??"—"} apps live`,detail:failed?`${failed} tracked project(s) with a failed deploy`:"No failed deploys on tracked projects",trend:failed?"down":"up"},
  ...(withCommit[0]?[{title:`Latest work · ${clean(withCommit[0].name)}`,detail:`${days(withCommit[0].lastCommit!.date)===0?"today":days(withCommit[0].lastCommit!.date)+"d ago"} — ${withCommit[0].lastCommit!.message}`.slice(0,96),trend:"up"}]:[]),
  stale.length?{title:`${stale.length} idle 30+ days`,detail:stale.map(p=>clean(p.name)).join(", ").slice(0,96),trend:"flat"}:{title:"No idle projects",detail:"Every tracked repo moved in the last 30 days",trend:"up"},
  {title:`${issues} open GitHub issue${issues===1?"":"s"}`,detail:unresolved?`${unresolved} project(s) not fully verified`:"All tracked projects verified",trend:issues?"flat":"up"}
 ] as Insight[]:[])].slice(0,4);
 const gold=metrics.xauusd;
 const goldPts=gold?gold.value.series:[];
 const lo=goldPts.length?Math.min(...goldPts):0,hi=goldPts.length?Math.max(...goldPts):1,rg=hi-lo||1;
 const line=goldPts.map((v,i)=>`${(i/(goldPts.length-1)*600).toFixed(1)},${(150-(v-lo)/rg*130).toFixed(1)}`).join(" ");
 const date=clock?clock.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric",timeZone:"Africa/Luanda"}):"";
 const time=clock?clock.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"}):"";
 const greet=clock?((h)=>h<12?"Good morning":h<18?"Good afternoon":"Good evening")(Number(clock.toLocaleString("en-GB",{hour:"2-digit",hour12:false,timeZone:"Africa/Luanda"}))):"Welcome back";

 const nav:[string,string,string][]=[["Command","/dashboard",I.home],["Empire","#empire",I.apps],["Markets","#markets",I.chart],["Q","/chat",I.spark]];
 return <main className="ra">
  <aside className="ra-side">
   <div className="ra-brand"><NMark size={58}/><b>NASSIM WATFA</b><small>The Restless Architect</small></div>
   <nav>{nav.map(([l,h,d],i)=><a key={l} href={h} className={i===0?"on":""}><Ico d={d}/>{l==="Q"?"Q Assistant":l}</a>)}</nav>
   <blockquote className="ra-quote">“{dayPick(philosophy)}”</blockquote>
  </aside>
  <section className="ra-main">
   <header className="ra-hero" style={{backgroundImage:`url(${HERO})`}}>
    <div className="ra-shade"/><div className="ra-flash"/>
    <div className="ra-top"><div className="ra-mob"><NMark size={30}/><b>NASSIM WATFA</b></div><div className="ra-clock"><strong>{time}</strong><span>{date}</span><small>Luanda</small></div></div>
    <div className="ra-copy">
     <small className="ra-eyebrow">{greet}, Nassim</small>
     <h1><span>The Restless</span>Architect</h1>
     <p className="ra-roles">Builder <i>|</i> Strategist <i>|</i> Creator <i>|</i> Explorer</p>
     <p className="ra-narr"><b>/</b>{dayPick(narrative)}</p>
    </div>
   </header>
   <div className="ra-body">
    {(error||metricsError)&&<div className="ra-error">{error||metricsError}</div>}
    <section className="ra-pulse">
     <article><span>Ventures live</span><strong>{liveApps??"—"}<em>/{apps?.length??"—"}</em></strong><div className="ra-bar"><i style={{width:apps?.length?`${(liveApps??0)/apps.length*100}%`:"0%"}}/></div></article>
     <article><span>Needs you</span><strong className={alerts.length?"hot":""}>{data?alerts.length:"—"}</strong><small>{alerts.length?"open signals":"all clear"}</small></article>
     <article><span>Failed builds</span><strong className={failed?"hot":""}>{data?failed:"—"}</strong><small>tracked ventures</small></article>
     <article><span>Q activity</span><strong>{activityCount}</strong><small>{conversationCount} chats · 24h</small></article>
    </section>
    <section className="ra-grid">
     <article className="ra-card" id="empire">
      <header><h2><b>/</b>The Empire</h2><button onClick={refresh} aria-label="Refresh"><Ico d={I.refresh}/></button></header>
      <div className="ra-ventures">{(projects.length?projects:Array.from({length:6},(_,i)=>({id:String(i),name:"…",area:"",priority:"",deployment:null,lastCommit:null} as unknown as Project))).map((p,i)=>{
       const d=days(p.lastCommit?.date);const act=d===null?0:Math.max(6,100-d*3);
       const st=p.deployment?.state==="READY"?"ok":p.deployment?.state==="ERROR"?"bad":"idle";
       return <Link key={p.id} href={projects.length?`/projects/${p.id}`:"#"} className="ra-venture">
        <div className="ra-cover" style={{background:`radial-gradient(circle at 80% 15%, #C8102E40, transparent 50%), linear-gradient(150deg, ${covers[i%covers.length]}, #05070C 85%)`}}><b>{clean(p.name).slice(0,1)}</b>{p.priority&&<em>{p.priority}</em>}</div>
        <strong>{clean(p.name)}</strong><small>{p.area||" "}</small>
        <footer><i className={st}/><span>{loading&&!projects.length?"syncing":st==="ok"?"Live":st==="bad"?"Failed":"Unverified"}</span><span className="ra-when">{d===null?"":d===0?"today":`${d}d`}</span></footer>
        <div className="ra-bar thin"><i style={{width:`${act}%`}}/></div>
       </Link>;})}</div>
     </article>
     <div className="ra-stack">
      <article className="ra-card ra-vision"><header><h2><b>/</b>Sixth Vision</h2><span className="ra-eye" aria-hidden="true"/></header>
       {insights.length?insights.map(x=><div className="ra-ins" key={x.title}><b className={x.trend==="down"?"bad":x.trend==="flat"?"warn":"ok"}>{x.trend==="down"?"↘":x.trend==="flat"?"◆":"↗"}</b><span><strong>{x.title}</strong>{x.detail&&<small>{x.detail}</small>}</span></div>):<p className="ra-muted">{loading?"Reading the field…":"Telemetry unavailable"}</p>}
      </article>
      <article className="ra-card"><header><h2><b>/</b>Needs You</h2><b className="ra-count">{data?alerts.length:"—"}</b></header>
       {alerts.length?alerts.slice(0,6).map((a,i)=><p className="ra-alert" key={i}><i className={a.level}/>{a.href?<a href={a.href} target="_blank" rel="noreferrer">{a.title}</a>:a.title}</p>):<p className="ra-muted">{loading?"Checking…":data?"All clear.":"Signals unavailable."}</p>}
      </article>
     </div>
    </section>
    <section className="ra-card ra-markets" id="markets">
     <header><h2><b>/</b>Markets · Gold</h2>{gold&&<small className="ra-stamp">{gold.source} · {ago(gold.updatedAt)}</small>}</header>
     {gold?<><div className="ra-price"><strong>{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><em className={gold.value.changePct>=0?"ok":"bad"}>{gold.value.changePct>=0?"▲ +":"▼ "}{gold.value.changePct.toFixed(2)}% · 24h</em><span className="ra-sym">XAU/USD</span></div>
      <svg className="ra-chart" viewBox="0 0 600 160" preserveAspectRatio="none" aria-label="XAU/USD last 48 hours"><defs><linearGradient id="rafill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2C979" stopOpacity=".32"/><stop offset="1" stopColor="#F2C979" stopOpacity="0"/></linearGradient></defs>
       <polygon points={`0,160 ${line} 600,160`} fill="url(#rafill)"/><polyline points={line} fill="none" stroke="#F2C979" strokeWidth="2"/></svg>
      <small className="ra-muted">48 hourly closes · Counter-Trader</small></>:<div className="ra-empty">Waiting for the next Counter-Trader push.</div>}
    </section>
    <section className="ra-card" id="launchpad">
     <header><h2><b>/</b>Launchpad</h2><span className="ra-live">{apps?`${liveApps} live`:appsError?"offline":"syncing"}</span></header>
     {appsError&&<div className="ra-error">{appsError}</div>}
     <div className="ra-apps">{(apps??[]).map((a,i)=><div key={a.id} className={`ra-app${a.url?"":" off"}`}>
      {a.url?<a href={a.url} target="_blank" rel="noreferrer" className="ra-app-head"><b style={{background:`linear-gradient(150deg, ${covers[i%covers.length]}, #05070C)`}}>{a.name.slice(0,1).toUpperCase()}</b><span><strong>{a.name}</strong><small>{a.url.replace("https://","")}</small></span></a>
       :<div className="ra-app-head"><b>{a.name.slice(0,1).toUpperCase()}</b><span><strong>{a.name}</strong><small>no production deploy</small></span></div>}
      {a.pages?.length?<div className="ra-pages">{a.pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</div>:null}
     </div>)}</div>
    </section>
    {metrics.agenda?.value.length?<section className="ra-card"><header><h2><b>/</b>Today</h2><small className="ra-stamp">{metrics.agenda.source} · {ago(metrics.agenda.updatedAt)}</small></header>
     {metrics.agenda.value.map(a=><p className="ra-agenda" key={a.time+a.title}><time>{a.time}</time>{a.title}</p>)}</section>:null}
    <footer className="ra-foot"><p>Think beyond. Build with purpose. Leave a legacy.</p><small>Photo: Mike Lewinski / Unsplash</small></footer>
   </div>
  </section>
  <nav className="ra-tabs">{nav.map(([l,h,d],i)=><a key={l} href={h} className={i===0?"on":""}><Ico d={d}/>{l}</a>)}</nav>
 </main>;
}
