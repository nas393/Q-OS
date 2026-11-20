"use client";
import {useState} from "react";
import {Badge,ErrorBox,Head,Loading,Toast,ago,api,useApi} from "../ui";

type Src={id:string;name:string;kind:string;url:string;trust:string;status:string;last_ok:string|null;last_error:string|null;last_run:string|null;config_needed:string|null};
type Job={name:string;every_minutes:number;last_run:string|null;last_ok:string|null;last_error:string|null;runs:number;history:Array<{at:string;ok:boolean;msg:string}>};
const LABEL:Record<string,string>={operational:"Operational",degraded:"Degraded",not_configured:"Not configured",not_run:"Not run yet",rate_limited:"Rate limited"};

export default function Sources(){
 const {data,error,loading,reload}=useApi<{sources:Src[];jobs:Job[]}>("/api/iq/sources");
 const [busy,setBusy]=useState(""),[toast,setToast]=useState("");
 const run=async(job?:string)=>{setBusy(job??"all");try{const r=await api<{result:Record<string,string>}>("/api/iq/refresh","POST",job?{job}:{});setToast(Object.entries(r.result).map(([k,v])=>`${k}: ${v}`).join(" · "));reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 return <>
  <Head title="Data sources" desc="Every provider, its trust level and real status. Jobs run with the NASSIM OS 15-minute check. A failed run never deletes stored data.">
   <button className="iq-btn pri" disabled={!!busy} onClick={()=>run()}>{busy==="all"?"Running…":"Run all jobs now"}</button>
  </Head>
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:data&&<div className="iq-grid iq-g2">
   <section className="iq-card"><h3>Providers</h3><ul className="iq-list">{data.sources.map(s=><li key={s.id} className="iq-row"><span className={`iq-dot ${s.status}`} style={{marginTop:7}}/><div>
    <b>{s.name}</b> <Badge kind={s.trust}/><div className="iq-sub">{LABEL[s.status]??s.status} · {s.kind} · last success {ago(s.last_ok)}</div>
    {s.status==="not_configured"&&s.config_needed&&<div className="iq-sub">Needs: <b>{s.config_needed}</b> in Vercel → q-jarvis → Environment Variables.</div>}
    {s.last_error&&<div className="iq-sub">{s.last_error}</div>}{s.url&&<a className="iq-sub" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>}</div></li>)}</ul></section>
   <section className="iq-card"><h3>Scheduled jobs</h3><ul className="iq-list">{data.jobs.map(j=><li key={j.name}><div className="iq-row"><span className={`iq-dot ${j.last_error?"degraded":j.last_ok?"operational":""}`} style={{marginTop:7}}/><div>
    <b>{j.name}</b> <span className="iq-sub">every {j.every_minutes>=60?j.every_minutes/60+"h":j.every_minutes+"m"} · {j.runs} runs · last run {ago(j.last_run)} · last success {ago(j.last_ok)}</span>
    {j.last_error&&<div className="iq-sub">{j.last_error}</div>}
    {j.history.length>0&&<details><summary className="iq-sub">History</summary><ul className="iq-sub">{j.history.map((h,i)=><li key={i}>{h.ok?"✓":"Delete"} {new Date(h.at).toLocaleString()} — {h.msg}</li>)}</ul></details>}</div>
    <button className="iq-btn sm" disabled={!!busy} onClick={()=>run(j.name)}>{busy===j.name?"…":"Run"}</button></div></li>)}
    {!data.jobs.length&&<li className="iq-sub">No job has run yet. Tap “Run all jobs now”.</li>}</ul>
    <p className="iq-meta">Not available on a free budget: port vessel arrivals, licensed news feeds and email digests. Trade data (UN Comtrade) and the map (OpenStreetMap) load on demand from their pages.</p></section>
  </div>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
