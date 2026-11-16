"use client";
import Link from "next/link";
import {useState} from "react";
import {Analysis,Badge,Empty,ErrorBox,Head,Loading,Toast,ago,api,fmt,useApi} from "./ui";

type Obs={indicator:string;value:string;unit:string;period:string;source_id:string;source_url:string;retrieved_at:string;prev:string|null};
type D={obs:Obs[];counts:{total:number;last24:number;unreviewed:number};top:Array<{id:string;title:string;url:string;publisher:string;published_at:string;category:string;impact:string|null;reliability:string}>;
 briefing:{output:Record<string,unknown>&{developments?:Array<{text:string;ref?:number[]}>};provider:string;model:string;created_at:string}|null;hits:Array<{keyword:string;n:number;last:string}>;projects:Array<{status:string;n:number}>;
 sources:Array<{id:string;name:string;status:string;last_ok:string|null;last_error:string|null;config_needed:string|null}>;jobs:Array<{name:string;last_run:string|null;last_ok:string|null;last_error:string|null;every_minutes:number}>};

const ORDER=["USD/AOA","Inflation","GDP growth","Population","Unemployment","GDP","Imports","Exports","Government debt","Brent crude","Wheat","Rice","Sugar","Maize","Soybean oil","Palm oil","USD/EUR","USD/ZAR","USD/CNY"];

export default function Dashboard(){
 const {data,error,loading,reload}=useApi<D>("/api/iq/dashboard");
 const [busy,setBusy]=useState(""),[toast,setToast]=useState("");
 const act=async(kind:"refresh"|"briefing")=>{setBusy(kind);try{if(kind==="refresh"){await api("/api/iq/refresh","POST",{});setToast("Data refreshed");}else{await api("/api/iq/analyze","POST",{kind:"briefing"});setToast("Briefing ready");}await reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const obs=(data?.obs??[]).filter(o=>ORDER.includes(o.indicator)&&!o.indicator.startsWith("Exports to")).sort((a,b)=>ORDER.indexOf(a.indicator)-ORDER.indexOf(b.indicator));
 const stale=(data?.sources??[]).filter(s=>s.status==="degraded"||s.status==="not_configured");
 const b=data?.briefing;
 return <>
  <Head title="Executive Dashboard" desc="Angola's commercial environment today — every number links to its source.">
   <button className="iq-btn" onClick={()=>act("refresh")} disabled={!!busy}>{busy==="refresh"?"Refreshing…":"↻ Refresh data"}</button>
   <button className="iq-btn pri" onClick={()=>act("briefing")} disabled={!!busy}>{busy==="briefing"?"Writing…":"✦ New briefing"}</button>
  </Head>
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:data&&<div className="iq-grid">
   <section className="iq-kpis">{obs.length?obs.map(o=>{const d=o.prev!=null?Number(o.value)-Number(o.prev):null;
    return <a key={o.indicator+o.source_id} className="iq-kpi" href={o.source_url} target="_blank" rel="noreferrer"><small>{o.indicator}</small><b>{fmt(o.value,o.unit)}</b>
     <span>{o.unit} · {o.period}{d!=null&&d!==0&&<em className={d>0?"up":"down"}> {d>0?"▲":"▼"}{fmt(Math.abs(d),o.unit.startsWith("%")?"%":"")}</em>} · {o.source_id}</span></a>;})
    :<Empty>No indicators yet. Tap <b>Refresh data</b> to pull World Bank and FX.</Empty>}</section>

   <div className="iq-grid iq-g2">
    <section className="iq-card"><h3>Executive briefing {b&&<small className="iq-muted">{ago(b.created_at)}</small>}</h3>
     {b?<>
      <Analysis out={{headline:b.output.headline,developments:(b.output.developments??[]).map(x=>x.text),opportunities:b.output.opportunities,risks:b.output.risks,actions:b.output.actions,facts:b.output.facts,assumptions:b.output.assumptions,inferences:b.output.inferences,limitations:b.output.limitations,confidence:b.output.confidence}} meta={b}/>
     </>:<Empty>No briefing yet. Refresh news, then tap <b>New briefing</b>. It is written only from stored headlines and indicators.</Empty>}
    </section>
    <div className="iq-grid">
     <section className="iq-card"><h3>Latest intelligence <Link href="/iq/news" className="iq-muted">All →</Link></h3>
      {data.top.length?<ul className="iq-list">{data.top.map(n=><li key={n.id} className="iq-row"><div><a className="t" href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
       <div className="iq-tags"><Badge kind={n.reliability}/>{n.impact&&<Badge kind={n.impact}/>}<span className="iq-sub">{n.publisher} · {ago(n.published_at)} · {n.category}</span></div></div></li>)}</ul>:<Empty>No news stored yet.</Empty>}
     </section>
     <section className="iq-card"><h3>Action centre</h3>
      <ul className="iq-list">
       <li className="iq-row"><div><b>{data.counts.unreviewed}</b> news items not reviewed <span className="iq-sub">({data.counts.last24} in 24h, {data.counts.total} stored)</span></div><Link className="iq-btn sm" href="/iq/news">Review</Link></li>
       <li className="iq-row"><div><b>{data.hits.reduce((s,h)=>s+h.n,0)}</b> watchlist matches (7 days){data.hits.length>0&&<div className="iq-sub">{data.hits.map(h=>`${h.keyword} (${h.n})`).join(" · ")}</div>}</div><Link className="iq-btn sm" href="/iq/watch">Open</Link></li>
       <li className="iq-row"><div><b>{data.projects.reduce((s,p)=>s+p.n,0)}</b> projects{data.projects.length>0&&<div className="iq-sub">{data.projects.map(p=>`${p.status} ${p.n}`).join(" · ")}</div>}</div><Link className="iq-btn sm" href="/iq/projects">Open</Link></li>
      </ul>
     </section>
     <section className="iq-card"><h3>Intelligence quality <Link href="/iq/sources" className="iq-muted">Sources →</Link></h3>
      <ul className="iq-list">{data.jobs.map(j=><li key={j.name} className="iq-row"><span className={`iq-dot ${j.last_error?"degraded":j.last_ok?"operational":""}`}/><div><b>{j.name}</b> <span className="iq-sub">last success {ago(j.last_ok)} · every {j.every_minutes>=60?j.every_minutes/60+"h":j.every_minutes+"m"}</span>{j.last_error&&<div className="iq-sub">⚠ {j.last_error}</div>}</div></li>)}
       {!data.jobs.length&&<li className="iq-sub">Jobs have not run yet. They run with NASSIM OS checks every 15 min, or tap Refresh.</li>}</ul>
      {stale.length>0&&<p className="iq-sub">Needs attention: {stale.map(s=>s.name+(s.config_needed?` (add ${s.config_needed})`:"")).join(" · ")}</p>}
     </section>
    </div>
   </div>
  </div>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
