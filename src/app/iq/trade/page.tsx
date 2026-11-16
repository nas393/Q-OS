"use client";
import {useMemo,useState} from "react";
import {Analysis,Badge,Empty,ErrorBox,Head,Loading,Toast,api,fmt} from "../ui";
import {exportReport,type Row} from "../workspace";

const IMP=["Wheat","Wheat flour","Rice","Sugar","Maize","Milk powder","Soybean oil","Palm oil","Poultry meat","Fertilizers","Refined fuel","Cement","Iron and steel","Pharmaceuticals"];
const EXP=["Crude oil","Natural gas (LNG)","Diamonds","Refined fuel","Fish and seafood","Coffee","Wood","Bananas","Granite and stone","Copper ores"];
type T={partner:string;value:number;qty:number|null;period:string;retrieved_at:string;source_url:string};

export default function Trade(){
 const [flow,setFlow]=useState<"imports"|"exports">("imports"),[c,setC]=useState("Wheat"),[rows,setRows]=useState<T[]|null>(null),[per,setPer]=useState("");
 const [busy,setBusy]=useState(""),[err,setErr]=useState(""),[an,setAn]=useState<Row|null>(null),[toast,setToast]=useState("");
 const imp=flow==="imports";
 const load=async(refresh=false)=>{setBusy("load");setErr("");setAn(null);try{const r=await api<{rows:T[]}>("/api/iq/trade","POST",{commodity:c,refresh,flow});setRows(r.rows);setPer(r.rows[0]?.period??"");}catch(e){setErr(e instanceof Error?e.message:"Failed");setRows(null);}finally{setBusy("");}};
 const interpret=async()=>{setBusy("ai");try{const r=await api<{analysis:Row}>("/api/iq/analyze","POST",{kind:"trade",commodity:c,flow,period:per});setAn(r.analysis);}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const periods=useMemo(()=>[...new Set((rows??[]).map(r=>r.period))].sort().reverse(),[rows]);
 const cur=(rows??[]).filter(r=>r.period===per),prevP=periods[periods.indexOf(per)+1],prev=(rows??[]).filter(r=>r.period===prevP);
 const total=cur.reduce((s,r)=>s+r.value,0),ptotal=prev.reduce((s,r)=>s+r.value,0),top3=cur.slice(0,3).reduce((s,r)=>s+r.value,0);
 const hhi=total?Math.round(cur.reduce((s,r)=>s+(r.value/total*100)**2,0)):0;
 const tons=cur.reduce((s,r)=>s+(r.qty??0),0)/1000;
 const pv=(p:string)=>prev.find(x=>x.partner===p)?.value;
 const retrieved=cur.length?new Date(cur.reduce((m,r)=>r.retrieved_at>m?r.retrieved_at:m,cur[0].retrieved_at)):null;
 const switchFlow=(f:"imports"|"exports")=>{setFlow(f);setC(f==="imports"?IMP[0]:EXP[0]);setRows(null);setAn(null);};
 return <>
  <Head title="Trade Analytics" desc="Angola's imports and exports by commodity, from UN Comtrade mirror data: what partner countries report trading with Angola. Annual data, usually 1–2 years behind. Every table shows its period, source query and retrieval date."/>
  <div className="iq-chips" style={{marginBottom:10}}><button className={`iq-chip${imp?" on":""}`} onClick={()=>switchFlow("imports")}>⇣ Imports into Angola</button><button className={`iq-chip${!imp?" on":""}`} onClick={()=>switchFlow("exports")}>⇡ Exports from Angola</button></div>
  <div className="iq-filters">
   <select value={c} onChange={e=>{setC(e.target.value);setRows(null);setAn(null);}} aria-label="Commodity">{(imp?IMP:EXP).map(x=><option key={x}>{x}</option>)}</select>
   <button className="iq-btn pri" disabled={!!busy} onClick={()=>load(false)}>{busy==="load"?"Loading…":"Load data"}</button>
   {periods.length>0&&<select value={per} onChange={e=>{setPer(e.target.value);setAn(null);}} aria-label="Year">{periods.map(p=><option key={p} value={p}>{p}</option>)}</select>}
   {rows&&<button className="iq-btn" disabled={!!busy} onClick={()=>load(true)}>↻ Refresh from Comtrade</button>}
  </div>
  {busy==="load"&&<Loading label="Querying UN Comtrade (up to 4 years)…"/>}{err&&<ErrorBox msg={err}/>}
  {rows&&(cur.length?<div className="iq-grid">
   <section className="iq-kpis">
    <div className="iq-kpi"><small>Total {imp?"imports":"exports"} · {per}</small><b>US$ {fmt(total)}</b><span>{ptotal?<em className={total>=ptotal?"up":"down"}>{total>=ptotal?"▲":"▼"}{Math.abs(Math.round((total/ptotal-1)*100))}% vs {prevP}</em>:"no prior year stored"}</span></div>
    <div className="iq-kpi"><small>Volume · {per}</small><b>{tons?fmt(tons)+" t":"—"}</b><span>{tons?`avg US$ ${fmt(total/tons)}/t`:"weights not declared"}</span></div>
    <div className="iq-kpi"><small>Top-3 {imp?"suppliers":"buyers"}</small><b>{total?Math.round(top3/total*100):0}%</b><span>HHI {hhi} · {hhi>2500?"highly concentrated":hhi>1500?"moderate":"diversified"}</span></div>
    <div className="iq-kpi"><small>Source</small><b style={{fontSize:14}}>UN Comtrade</b><span><Badge kind="primary"/> mirror · {imp?"FOB":"CIF"}</span></div>
   </section>
   <section className="iq-card"><h3>{imp?"Origins":"Destinations"} · {c} · {per}<span className="iq-tags"><button className="iq-btn sm" disabled={!!busy} onClick={interpret}>{busy==="ai"?"Interpreting…":"✦ Interpret"}</button><button className="iq-btn sm" onClick={()=>api("/api/iq/saved","POST",{kind:"trade",refId:`${flow}:${c}:${per}`,title:`Trade: ${c} ${flow} ${per}`,url:cur[0].source_url}).then(()=>setToast("Saved"))}>☆ Save</button></span></h3>
    <div className="iq-scroll"><table className="iq-table"><thead><tr><th>{imp?"Origin":"Destination"}</th><th>Value US$</th><th>Share</th><th>vs {prevP??"prior"}</th><th>Net weight (t)</th><th>US$/t</th></tr></thead><tbody>
     {cur.map(r=>{const p=pv(r.partner);return <tr key={r.partner}><td>{r.partner}</td><td>{fmt(r.value)}</td><td><div className="iq-bar" style={{width:80,display:"inline-block",verticalAlign:"middle"}}><i style={{width:`${r.value/total*100}%`}}/></div> {Math.round(r.value/total*100)}%</td>
      <td>{p?<span style={{color:r.value>=p?"var(--ok)":"var(--red)"}}>{r.value>=p?"▲":"▼"}{Math.abs(Math.round((r.value/p-1)*100))}%</span>:<span className="iq-muted">new</span>}</td><td>{r.qty?fmt(r.qty/1000):"—"}</td><td>{r.qty?fmt(r.value/(r.qty/1000)):"—"}</td></tr>;})}</tbody></table></div>
    <div className="iq-meta" style={{marginTop:8,lineHeight:1.6}}>
     <b>Period:</b> calendar year {per} (annual) · <b>Retrieved:</b> {retrieved?.toLocaleString()} · <b>Years stored:</b> {periods.join(", ")}<br/>
     <b>Source:</b> UN Comtrade public API, {imp?"partner-reported exports to Angola (FOB)":"partner-reported imports from Angola (CIF)"} · <a href={cur[0].source_url} target="_blank" rel="noreferrer" style={{color:"var(--vio2)"}}>exact query ↗</a> · <a href="https://comtradeplus.un.org" target="_blank" rel="noreferrer" style={{color:"var(--vio2)"}}>comtradeplus.un.org ↗</a><br/>
     Mirror values can differ from Angola&apos;s own customs figures (timing, valuation, re-exports). Weights are missing where the reporting country did not declare them.
    </div>
   </section>
   {an&&<section className="iq-card"><h3>Interpretation<button className="iq-btn sm" onClick={()=>exportReport(an)}>⤓ Export</button></h3><Analysis out={an.output} meta={an}/></section>}
  </div>:<Empty>No rows for {c} in {per||"any year"}.</Empty>)}
  {!rows&&!busy&&!err&&<Empty>Pick imports or exports, a commodity, then tap <b>Load data</b>.</Empty>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
