"use client";
import {useState} from "react";
import {Analysis,Badge,Empty,ErrorBox,Head,Loading,Toast,api,fmt} from "../ui";
import {exportReport,type Row} from "../workspace";

const COMM=["Wheat","Wheat flour","Rice","Sugar","Maize","Milk powder","Soybean oil","Palm oil","Poultry meat","Fertilizers","Refined fuel","Cement","Iron and steel","Pharmaceuticals"];
type T={partner:string;value:number;qty:number|null;period:string};

export default function Trade(){
 const [c,setC]=useState("Wheat"),[rows,setRows]=useState<T[]|null>(null),[busy,setBusy]=useState(""),[err,setErr]=useState(""),[an,setAn]=useState<Row|null>(null),[toast,setToast]=useState("");
 const load=async(refresh=false)=>{setBusy("load");setErr("");setAn(null);try{const r=await api<{rows:T[]}>("/api/iq/trade","POST",{commodity:c,refresh});setRows(r.rows);}catch(e){setErr(e instanceof Error?e.message:"Failed");setRows(null);}finally{setBusy("");}};
 const interpret=async()=>{setBusy("ai");try{const r=await api<{analysis:Row}>("/api/iq/analyze","POST",{kind:"trade",commodity:c});setAn(r.analysis);}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const latest=rows?.length?rows.filter(r=>r.period===rows[0].period):[];
 const total=latest.reduce((s,r)=>s+r.value,0),top3=latest.slice(0,3).reduce((s,r)=>s+r.value,0);
 const hhi=total?Math.round(latest.reduce((s,r)=>s+(r.value/total*100)**2,0)):0;
 return <>
  <Head title="Trade Analytics" desc="Where Angola's strategic imports come from. Source: UN Comtrade mirror data, meaning what partner countries report exporting to Angola (FOB US$). Angola's own customs data is often late or missing, so mirror data is the reliable free option."/>
  <div className="iq-filters">
   <select value={c} onChange={e=>{setC(e.target.value);setRows(null);setAn(null);}} aria-label="Commodity">{COMM.map(x=><option key={x}>{x}</option>)}</select>
   <button className="iq-btn pri" disabled={!!busy} onClick={()=>load(false)}>{busy==="load"?"Loading…":"Load data"}</button>
   {rows&&<button className="iq-btn" disabled={!!busy} onClick={()=>load(true)}>↻ Refresh from Comtrade</button>}
  </div>
  {busy==="load"&&<Loading label="Querying UN Comtrade…"/>}{err&&<ErrorBox msg={err}/>}
  {rows&&(latest.length?<div className="iq-grid">
   <section className="iq-kpis">
    <div className="iq-kpi"><small>Total imports ({latest[0].period})</small><b>US$ {fmt(total)}</b><span>{latest.length} origin countries</span></div>
    <div className="iq-kpi"><small>Top-3 share</small><b>{total?Math.round(top3/total*100):0}%</b><span>supply concentration</span></div>
    <div className="iq-kpi"><small>HHI index</small><b>{hhi}</b><span>{hhi>2500?"highly concentrated":hhi>1500?"moderately concentrated":"diversified"}</span></div>
    <div className="iq-kpi"><small>Source</small><b style={{fontSize:14}}>UN Comtrade</b><span><Badge kind="primary"/> mirror · FOB</span></div>
   </section>
   <section className="iq-card"><h3>Origins · {c} · {latest[0].period}<span className="iq-tags"><button className="iq-btn sm" disabled={!!busy} onClick={interpret}>{busy==="ai"?"Interpreting…":"✦ Interpret"}</button><button className="iq-btn sm" onClick={()=>api("/api/iq/saved","POST",{kind:"trade",refId:`${c}:${latest[0].period}`,title:`Trade: ${c} imports ${latest[0].period}`,url:"https://comtradeplus.un.org"}).then(()=>setToast("Saved"))}>☆ Save</button></span></h3>
    <div className="iq-scroll"><table className="iq-table"><thead><tr><th>Origin</th><th>Value US$</th><th>Share</th><th>Net weight (t)</th><th>Unit US$/t</th></tr></thead><tbody>
     {latest.map(r=><tr key={r.partner}><td>{r.partner}</td><td>{fmt(r.value)}</td><td><div className="iq-bar" style={{width:90,display:"inline-block",verticalAlign:"middle"}}><i style={{width:`${r.value/total*100}%`}}/></div> {Math.round(r.value/total*100)}%</td><td>{r.qty?fmt(r.qty/1000):"—"}</td><td>{r.qty?fmt(r.value/(r.qty/1000)):"—"}</td></tr>)}</tbody></table></div>
    <p className="iq-meta">Period {latest[0].period} · values as reported by exporting countries · weights missing where the reporter did not declare them. Older periods: {[...new Set(rows.map(r=>r.period))].filter(p=>p!==latest[0].period).join(", ")||"none stored"}.</p>
   </section>
   {an&&<section className="iq-card"><h3>Interpretation<button className="iq-btn sm" onClick={()=>exportReport(an)}>⤓ Export</button></h3><Analysis out={an.output} meta={an}/></section>}
  </div>:<Empty>Comtrade returned no rows for {c}.</Empty>)}
  {!rows&&!busy&&!err&&<Empty>Pick a commodity and tap <b>Load data</b>.</Empty>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
