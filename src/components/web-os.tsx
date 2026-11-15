"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import "./web-os.css";
import type { MetricsMap } from "@/lib/metrics";

type Project={id:string;name:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceRepo?:string|null;sourceMatches?:boolean|null}|null;deploymentDataStatus?:string;githubDataStatus?:string;integration:{github:boolean;vercel:boolean}};
type Telemetry={updatedAt:string;projects:Project[]};
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
type Alert={title:string;level:"red"|"amber";href?:string};
type Insight={title:string;detail?:string;trend?:"up"|"down"|"flat"};

const HERO="https://images.unsplash.com/photo-1743172140481-5c7044dd23d6?ixlib=rb-4.1.0&q=70&fm=jpg&crop=entropy&cs=srgb&w=1800";
const covers=["#3a2d17","#1c2a33","#2c2219","#2a1f2e","#1f2b24","#33281a","#1d2233","#2e1d1d"];
const days=(d?:string|null)=>d?Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/864e5)):null;
const ago=(iso:string)=>{const h=Math.round((Date.now()-new Date(iso).getTime())/36e5);return h<1?"just now":h<48?`${h}h ago`:`${Math.round(h/24)}d ago`;};
const clean=(n:string)=>n.replace(" / Q","");

function Peak({size=44}:{size?:number}){const u=useId().replace(/:/g,"");const pl=`pl${u}`,gl=`gl${u}`;return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="peak">
 <defs><linearGradient id={pl} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F4F2EE"/><stop offset=".55" stopColor="#B9B6AF"/><stop offset="1" stopColor="#7C7A75"/></linearGradient>
 <linearGradient id={gl} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8C6A2E"/><stop offset=".5" stopColor="#E8C987"/><stop offset="1" stopColor="#8C6A2E"/></linearGradient></defs>
 <path d="M8 40 A24 24 0 0 1 56 40" fill="none" stroke={`url(#${gl})`} strokeWidth="2.2"/>
 <path d="M32 6 L44 50 L32 38 L20 50 Z" fill={`url(#${pl})`}/><path d="M32 6 L32 38 L20 50 Z" fill="#000" opacity=".22"/>
 <path d="M14 52 L24 34 L28 40 Z M50 52 L40 34 L36 40 Z" fill={`url(#${pl})`} opacity=".8"/>
</svg>;}
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
 const greet=clock?((h)=>h<12?"Good morning":h<18?"Good afternoon":"Good evening")(Number(clock.toLocaleString("en-GB",{hour:"2-digit",hour12:false,timeZone:"Africa/Luanda"}))):"Welcome";
 const nav:[string,string,string][]=[["Home","/dashboard",I.home],["Apps","#apps",I.apps],["Markets","#markets",I.chart],["Q","/chat",I.spark]];

 return <main className="sg">
  <aside className="sg-side">
   <div className="sg-brand"><Peak size={56}/><b>NASSIM WATFA</b><span className="sg-rule"><i/>THE VISION<i/></span></div>
   <nav>{nav.map(([l,h,d],i)=><a key={l} href={h} className={i===0?"on":""}><Ico d={d}/>{l==="Q"?"Q Assistant":l}</a>)}</nav>
   <div className="sg-side-foot"><small>EXPLORE · EXECUTE · EXPAND</small></div>
  </aside>

  <section className="sg-main">
   <header className="sg-hero" style={{backgroundImage:`url(${HERO})`}}>
    <div className="sg-hero-shade"/>
    <div className="sg-hero-top"><div className="sg-mob-brand"><Peak size={34}/><b>Q</b></div><div className="sg-clock"><span>{date}</span><strong>{time}</strong><small>Luanda · GMT+1</small></div></div>
    <div className="sg-hero-copy"><small className="sg-eyebrow">{greet}, Nassim</small><h1>Command <em>Center</em></h1><p>LEAD · BUILD · CREATE</p></div>
   </header>

   <div className="sg-body">
    {(error||metricsError)&&<div className="sg-error">{error||metricsError}</div>}
    <section className="sg-kpis">
     <article><span>Apps live</span><strong>{liveApps??"—"}<em>/{apps?.length??"—"}</em></strong><div className="sg-bar"><i style={{width:apps?.length?`${(liveApps??0)/apps.length*100}%`:"0%"}}/></div></article>
     <article><span>Needs you</span><strong className={alerts.length?"warn":""}>{data?alerts.length:"—"}</strong><small>{alerts.length?"open alerts":"all clear"}</small></article>
     <article><span>Failed builds</span><strong className={failed?"bad":""}>{data?failed:"—"}</strong><small>tracked projects</small></article>
     <article><span>Q activity</span><strong>{activityCount}</strong><small>{conversationCount} chats · 24h log</small></article>
    </section>

    <section className="sg-grid">
     <article className="sg-card sg-portfolio">
      <header><div><small>EXECUTION</small><h2>Project Portfolio</h2></div><button onClick={refresh} aria-label="Refresh"><Ico d={I.refresh}/></button></header>
      <div className="sg-projects">{(projects.length?projects:Array.from({length:8},(_,i)=>({id:String(i),name:"Loading",area:"",priority:"",deployment:null,lastCommit:null} as unknown as Project))).map((p,i)=>{
       const d=days(p.lastCommit?.date);const act=d===null?0:Math.max(6,100-d*3);
       const st=p.deployment?.state==="READY"?"ok":p.deployment?.state==="ERROR"?"bad":"idle";
       return <Link key={p.id} href={projects.length?`/projects/${p.id}`:"#"} className="sg-proj">
        <div className="sg-cover" style={{background:`radial-gradient(circle at 75% 20%, #C9A35B33, transparent 55%), linear-gradient(140deg, ${covers[i%covers.length]}, #0b0b0a 80%)`}}><b>{clean(p.name).slice(0,1)}</b>{p.priority&&<em>{p.priority}</em>}</div>
        <strong>{clean(p.name)}</strong><small>{p.area||" "}</small>
        <footer><i className={st}/><span>{loading&&!projects.length?"syncing":st==="ok"?"Live":st==="bad"?"Failed":"Unverified"}</span><span className="sg-when">{d===null?"":d===0?"today":`${d}d`}</span></footer>
        <div className="sg-bar thin"><i style={{width:`${act}%`}}/></div>
       </Link>;})}</div>
     </article>

     <div className="sg-stack">
      <article className="sg-card"><header><div><small>DECISION SUPPORT</small><h2>Q Intelligence</h2></div><span className="sg-live">{data?"LIVE":"—"}</span></header>
       {insights.length?insights.map(x=><div className="sg-ins" key={x.title}><b className={x.trend==="down"?"bad":x.trend==="flat"?"warn":"ok"}>{x.trend==="down"?"↘":x.trend==="flat"?"◆":"↗"}</b><span><strong>{x.title}</strong>{x.detail&&<small>{x.detail}</small>}</span></div>):<p className="sg-muted">{loading?"Reading telemetry…":"Telemetry unavailable"}</p>}
      </article>
      <article className="sg-card"><header><div><small>ATTENTION</small><h2>Alerts</h2></div><b className="sg-count">{data?alerts.length:"—"}</b></header>
       {alerts.length?alerts.slice(0,6).map((a,i)=><p className="sg-alert" key={i}><i className={a.level}/>{a.href?<a href={a.href} target="_blank" rel="noreferrer">{a.title}</a>:a.title}</p>):<p className="sg-muted">{loading?"Checking…":data?"All clear.":"Alerts unavailable."}</p>}
      </article>
     </div>
    </section>

    <section className="sg-card sg-markets" id="markets">
     <header><div><small>MARKETS</small><h2>Gold · XAU/USD</h2></div>{gold&&<small className="sg-stamp">{gold.source} · {ago(gold.updatedAt)}</small>}</header>
     {gold?<><div className="sg-price"><strong>{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><em className={gold.value.changePct>=0?"ok":"bad"}>{gold.value.changePct>=0?"▲ +":"▼ "}{gold.value.changePct.toFixed(2)}% · 24h</em></div>
      <svg className="sg-chart" viewBox="0 0 600 160" preserveAspectRatio="none" aria-label="XAU/USD last 48 hours"><defs><linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9A35B" stopOpacity=".35"/><stop offset="1" stopColor="#C9A35B" stopOpacity="0"/></linearGradient></defs>
       <polygon points={`0,160 ${line} 600,160`} fill="url(#gfill)"/><polyline points={line} fill="none" stroke="#E8C987" strokeWidth="2"/></svg>
      <small className="sg-muted">48 hourly closes · from Counter-Trader</small></>:<div className="sg-empty">Waiting for the next Counter-Trader push.</div>}
    </section>

    <section className="sg-card" id="apps">
     <header><div><small>LAUNCHPAD</small><h2>Apps</h2></div><span className="sg-live">{apps?`${liveApps} LIVE`:appsError?"OFFLINE":"SYNCING"}</span></header>
     {appsError&&<div className="sg-error">{appsError}</div>}
     <div className="sg-apps">{(apps??[]).map((a,i)=><div key={a.id} className={`sg-app${a.url?"":" off"}`}>
      {a.url?<a href={a.url} target="_blank" rel="noreferrer" className="sg-app-head"><b style={{background:`linear-gradient(140deg, ${covers[i%covers.length]}, #0b0b0a)`}}>{a.name.slice(0,1).toUpperCase()}</b><span><strong>{a.name}</strong><small>{a.url.replace("https://","")}</small></span></a>
       :<div className="sg-app-head"><b>{a.name.slice(0,1).toUpperCase()}</b><span><strong>{a.name}</strong><small>no production deploy</small></span></div>}
      {a.pages?.length?<div className="sg-pages">{a.pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</div>:null}
     </div>)}</div>
    </section>

    {metrics.agenda?.value.length?<section className="sg-card"><header><div><small>TODAY</small><h2>Agenda</h2></div><small className="sg-stamp">{metrics.agenda.source} · {ago(metrics.agenda.updatedAt)}</small></header>
     {metrics.agenda.value.map(a=><p className="sg-agenda" key={a.time+a.title}><time>{a.time}</time>{a.title}</p>)}</section>:null}

    <footer className="sg-foot"><span>Q · NASSIM WATFA · THE VISION</span><span>Photo: Shawn Clark / Unsplash</span></footer>
   </div>
  </section>

  <nav className="sg-tabs">{nav.map(([l,h,d],i)=><a key={l} href={h} className={i===0?"on":""}><Ico d={d}/>{l}</a>)}</nav>
 </main>;
}
