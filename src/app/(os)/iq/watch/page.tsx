"use client";
import {useState} from "react";
import {Badge,Empty,ErrorBox,Field,Head,Loading,Toast,ago,api,useApi} from "../ui";
import {askConfirm} from "@/components/shell/app-shell";

type W={id:string;keyword:string;category:string;frequency:string;priority:string;active:boolean;match_count:number;last_triggered:string|null};
type H={created_at:string;keyword:string;title:string;url:string};
const SUGGEST=["Crude oil","Construction tender","Customs regulation","Import duty","Kwanza","Port congestion","Infrastructure contract","Agricultural exports","Wheat","Rice","Sugar","Lobito"];

export default function Watch(){
 const {data,error,loading,reload}=useApi<{watch:W[];hits:H[]}>("/api/iq/watch");
 const [kw,setKw]=useState(""),[cat,setCat]=useState("all"),[freq,setFreq]=useState("instant"),[pri,setPri]=useState("normal"),[toast,setToast]=useState("");
 const add=async(k:string)=>{if(k.trim().length<2)return;if(data?.watch.some(w=>w.keyword.toLowerCase()===k.trim().toLowerCase()))return setToast("Already on your watchlist");
  try{await api("/api/iq/watch","POST",{keyword:k.trim(),category:cat,frequency:freq,priority:pri});setKw("");setToast("Added");reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}};
 const patch=async(id:string,p:Record<string,unknown>)=>{await api("/api/iq/watch","PATCH",{id,...p});reload();};
 return <>
  <Head title="Watchlist" desc="Keywords matched against every news item AngolaIQ stores, checked about every 15 minutes."/>
  <p className="iq-disclaimer" style={{marginBottom:12}}><b>Instant</b> = a push alert to your phone through NASSIM OS (once you turn alerts on). <b>Daily/Weekly</b> = matches collected here. <b>Email digest: not configured</b> (no email provider is connected).</p>
  <section className="iq-card"><h3>Add keyword</h3>
   <form className="iq-form two" onSubmit={e=>{e.preventDefault();add(kw);}}>
    <Field label="Keyword *"><input value={kw} onChange={e=>setKw(e.target.value)} maxLength={60} placeholder="e.g. wheat flour"/></Field>
    <Field label="Monitor"><select value={cat} onChange={e=>setCat(e.target.value)}><option value="all">All sources</option><option value="news">News</option><option value="port_arrivals" disabled>Port arrivals (no free source)</option><option value="sector_reports" disabled>Sector reports (not connected)</option></select></Field>
    <Field label="Frequency"><select value={freq} onChange={e=>setFreq(e.target.value)}><option value="instant">Instant (push)</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></Field>
    <Field label="Priority"><select value={pri} onChange={e=>setPri(e.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></Field>
    <div className="full"><button className="iq-btn pri" disabled={kw.trim().length<2}>+ Add</button></div>
   </form>
   <p className="iq-sub" style={{marginTop:10}}>Suggested:</p><div className="iq-chips">{SUGGEST.map(s=><button key={s} className="iq-chip" onClick={()=>add(s)}>+ {s}</button>)}</div>
  </section>
  <div className="iq-grid iq-g2" style={{marginTop:12}}>
   <section className="iq-card"><h3>Active watchlist</h3>
    {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:!data?.watch.length?<Empty>No keywords yet.</Empty>:
    <ul className="iq-list">{data.watch.map(w=><li key={w.id} className="iq-row"><div><b className={w.active?undefined:"iq-muted"}>{w.keyword}</b><div className="iq-tags"><span className={`tag ${w.priority==="high"?"watch":w.priority==="low"?"plain":"info"}`}>{w.priority} priority</span><span className="iq-sub">{w.frequency} · {w.match_count} matches · last {ago(w.last_triggered)}{w.active?"":" · paused"}</span></div></div>
     <select aria-label="Frequency" value={w.frequency} onChange={e=>patch(w.id,{frequency:e.target.value})} className="input sm"><option value="instant">Instant</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select>
     <button className="iq-btn sm" onClick={()=>patch(w.id,{active:!w.active})}>{w.active?"Pause":"Resume"}</button>
     <button className="iq-btn sm danger" aria-label="Remove" onClick={async()=>{if(await askConfirm({title:`Remove “${w.keyword}” from the watchlist?`,action:"Remove"})){await api(`/api/iq/watch?id=${w.id}`,"DELETE");reload();}}}>Delete</button></li>)}</ul>}
   </section>
   <section className="iq-card"><h3>Alert history</h3>
    {!data?.hits.length?<Empty>No matches yet. They appear after the next news refresh.</Empty>:
    <ul className="iq-list">{data.hits.map((h,i)=><li key={i}><a className="t" href={h.url} target="_blank" rel="noreferrer">{h.title}</a><div className="iq-sub">“{h.keyword}” · {ago(h.created_at)}</div></li>)}</ul>}
   </section>
  </div>
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
