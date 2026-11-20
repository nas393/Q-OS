"use client";
import {useMemo,useState} from "react";
import {Empty,ErrorBox,Field,Head,Loading,Toast,api,fmt,useApi} from "../ui";
import {askConfirm} from "@/components/shell/app-shell";

type V={id:string;vessel:string;port:string;terminal:string|null;cargo:string|null;commodity:string|null;tonnage:string|null;origin:string|null;consignee:string|null;eta:string|null;ata:string|null;etd:string|null;atd:string|null;status:string;source:string;source_url:string|null;notes:string|null;updated_at:string};
const PORTS=["Luanda","Lobito","Namibe","Cabinda","Soyo","Porto Amboim","Caio","Other"];
const STATUS=["expected","anchored","berthed","discharging","departed","cancelled"];
const day=(d:Date)=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const add=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const mon=(d:Date)=>add(day(d),-((d.getDay()+6)%7));
function windows(){const t=day(new Date()),m=mon(new Date()),M=new Date(t.getFullYear(),t.getMonth(),1);
 return [["Last month",new Date(t.getFullYear(),t.getMonth()-1,1),M],["Last week",add(m,-7),m],["Yesterday",add(t,-1),t],["Today",t,add(t,1)],["Tomorrow",add(t,1),add(t,2)],["This week",m,add(m,7)],["Next week",add(m,7),add(m,14)],["This month",M,new Date(t.getFullYear(),t.getMonth()+1,1)],["Next month",new Date(t.getFullYear(),t.getMonth()+1,1),new Date(t.getFullYear(),t.getMonth()+2,1)]] as Array<[string,Date,Date]>;}
const when=(v:V)=>v.ata??v.eta;
const toIso=(s:string)=>{s=s.trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s+"T00:00:00+01:00";if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(s))return s.replace(" ","T")+":00+01:00";const d=new Date(s);return isNaN(+d)?null:d.toISOString();};
const local=(iso:string|null)=>iso?new Date(iso).toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
const blank={vessel:"",port:"Luanda",terminal:"",status:"expected",eta:"",ata:"",cargo:"",commodity:"",tonnage:"",origin:"",consignee:"",notes:"",source:"manual",source_url:""};

export default function Ports(){
 const W=useMemo(windows,[]);
 const {data,error,loading,reload}=useApi<{vessels:V[]}>(`/api/iq/vessels?from=${W[0][1].toISOString()}&to=${W[8][2].toISOString()}`);
 const [win,setWin]=useState("This week"),[port,setPort]=useState(""),[form,setForm]=useState<(typeof blank)&{id?:string}|null>(null),[csv,setCsv]=useState<string|null>(null),[toast,setToast]=useState("");
 const inWin=(name:string)=>{const w=W.find(x=>x[0]===name)!;return (data?.vessels??[]).filter(v=>{const d=when(v);return d&&new Date(d)>=w[1]&&new Date(d)<w[2]&&(!port||v.port===port)&&v.status!=="cancelled";});};
 const list=inWin(win);
 const byPort=PORTS.map(p=>({p,v:list.filter(x=>x.port===p)})).filter(x=>x.v.length);
 const save=async()=>{if(!form)return;try{const {id,tonnage,eta,ata,source_url,...f}=form;await api("/api/iq/vessels","POST",{...(id?{id}:{}),...f,tonnage:tonnage?Number(tonnage):null,eta:toIso(eta),ata:toIso(ata),...(source_url?{source_url}:{})});setForm(null);setToast("Saved");reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}};
 const importCsv=async()=>{if(!csv)return;const lines=csv.trim().split(/\r?\n/).filter(Boolean);const head=lines.shift()!.toLowerCase().split(/[,;\t]/).map(h=>h.trim());
  const rows=lines.map(l=>{const c=l.split(/[,;\t]/).map(x=>x.trim());const g=(k:string)=>c[head.indexOf(k)]??"";return {vessel:g("vessel"),port:g("port")||"Luanda",status:STATUS.includes(g("status"))?g("status"):"expected",eta:toIso(g("eta")),ata:toIso(g("ata")),cargo:g("cargo")||undefined,commodity:g("commodity")||undefined,tonnage:g("tonnage")?Number(g("tonnage").replace(/[^\d.]/g,"")):null,origin:g("origin")||undefined,consignee:g("consignee")||undefined,terminal:g("terminal")||undefined,notes:g("notes")||undefined,source:"csv import"};});
  try{const r=await api<{vessels:V[]}>("/api/iq/vessels","POST",rows);setCsv(null);setToast(`${r.vessels.length} vessels imported`);reload();}catch(e){setToast(e instanceof Error?e.message:"Import failed");}};
 const quick=async(v:V,status:string)=>{await api("/api/iq/vessels","POST",{id:v.id,vessel:v.vessel,port:v.port,status,...(status==="berthed"&&!v.ata?{ata:new Date().toISOString()}:{}),...(status==="departed"&&!v.atd?{atd:new Date().toISOString()}:{})});reload();};
 return <>
  <Head title="Port arrivals" desc="Vessel arrivals by port and date. No free live feed exists for Angolan ports: the Port of Luanda website's ship lists are broken and its counters are static, and Lobito publishes none. So this is your register. Add vessels yourself or paste a CSV from your shipping agent. Every row keeps its source.">
   <button className="iq-btn" onClick={()=>setCsv(csv===null?"vessel,port,eta,status,commodity,tonnage,origin,consignee\n":null)}>⤒ Paste CSV</button>
   <button className="iq-btn pri" onClick={()=>setForm({...blank})}>+ Add vessel</button>
  </Head>
  <div className="iq-chips" style={{marginBottom:10}}>{W.map(([n])=>{const c=inWin(n).length;return <button key={n} className={`iq-chip${win===n?" on":""}`} onClick={()=>setWin(n)}>{n}{c?` · ${c}`:""}</button>;})}</div>
  <div className="iq-filters"><select value={port} onChange={e=>setPort(e.target.value)} aria-label="Port"><option value="">All ports</option>{PORTS.map(p=><option key={p}>{p}</option>)}</select></div>
  {csv!==null&&<section className="iq-card" style={{marginBottom:12}}><h3>Paste CSV</h3><p className="iq-sub">Columns: vessel, port, eta (YYYY-MM-DD or YYYY-MM-DD HH:MM, Luanda time), status, commodity, tonnage, origin, consignee. Optional: ata, cargo, terminal, notes. Comma, semicolon or tab.</p>
   <textarea value={csv} onChange={e=>setCsv(e.target.value)} rows={7} className="input" style={{width:"100%",font:"13px/1.5 ui-monospace,monospace"}} aria-label="CSV"/>
   <div className="iq-tags" style={{marginTop:8}}><button className="iq-btn pri" onClick={importCsv}>Import</button><button className="iq-btn" onClick={()=>setCsv(null)}>Cancel</button></div></section>}
  {form&&<section className="iq-card" style={{marginBottom:12}}><h3>{form.id?"Edit vessel":"Add vessel"}</h3>
   <form className="iq-form two" onSubmit={e=>{e.preventDefault();save();}}>
    <Field label="Vessel name *"><input required value={form.vessel} onChange={e=>setForm({...form,vessel:e.target.value})}/></Field>
    <Field label="Port *"><select value={form.port} onChange={e=>setForm({...form,port:e.target.value})}>{PORTS.map(p=><option key={p}>{p}</option>)}</select></Field>
    <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{STATUS.map(s=><option key={s}>{s}</option>)}</select></Field>
    <Field label="Terminal"><input value={form.terminal} onChange={e=>setForm({...form,terminal:e.target.value})}/></Field>
    <Field label="ETA (expected)"><input type="datetime-local" value={form.eta} onChange={e=>setForm({...form,eta:e.target.value})}/></Field>
    <Field label="ATA (actual arrival)"><input type="datetime-local" value={form.ata} onChange={e=>setForm({...form,ata:e.target.value})}/></Field>
    <Field label="Commodity"><input value={form.commodity} onChange={e=>setForm({...form,commodity:e.target.value})} placeholder="Wheat, rice, sugar…"/></Field>
    <Field label="Tonnage (t)"><input inputMode="decimal" value={form.tonnage} onChange={e=>setForm({...form,tonnage:e.target.value})}/></Field>
    <Field label="Origin"><input value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}/></Field>
    <Field label="Consignee / importer"><input value={form.consignee} onChange={e=>setForm({...form,consignee:e.target.value})}/></Field>
    <Field label="Source (who told you)"><input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="agent, line-up email, port notice…"/></Field>
    <Field label="Source link"><input type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})}/></Field>
    <Field full label="Notes"><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
    <div className="full iq-tags"><button className="iq-btn pri">Save</button><button type="button" className="iq-btn" onClick={()=>setForm(null)}>Cancel</button></div>
   </form></section>}
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:<>
   <section className="iq-kpis" style={{marginBottom:12}}>
    <div className="iq-kpi"><small>{win}</small><b>{list.length}</b><span>vessels{port?` · ${port}`:""}</span></div>
    <div className="iq-kpi"><small>Tonnage</small><b>{fmt(list.reduce((s,v)=>s+Number(v.tonnage??0),0))} t</b><span>declared</span></div>
    <div className="iq-kpi"><small>Arrived</small><b>{list.filter(v=>v.ata).length}</b><span>with actual arrival</span></div>
    <div className="iq-kpi"><small>Expected</small><b>{list.filter(v=>!v.ata).length}</b><span>ETA only</span></div>
   </section>
   {!byPort.length?<Empty>No vessels for {win.toLowerCase()}. Add one or paste a CSV.</Empty>:byPort.map(({p,v})=><section key={p} className="iq-card" style={{marginBottom:12}}><h3>{p} · {v.length} · {fmt(v.reduce((s,x)=>s+Number(x.tonnage??0),0))} t</h3>
    <div className="iq-scroll"><table className="iq-table"><thead><tr><th>Vessel</th><th>Status</th><th>ETA</th><th>ATA</th><th>Commodity</th><th>Tonnes</th><th>Origin</th><th>Consignee</th><th>Source</th><th></th></tr></thead><tbody>
     {v.map(x=><tr key={x.id}><td><b>{x.vessel}</b>{x.terminal?<div className="iq-sub">{x.terminal}</div>:null}</td>
      <td><select value={x.status} onChange={e=>quick(x,e.target.value)} aria-label="Status" className="input sm">{STATUS.map(s=><option key={s}>{s}</option>)}</select></td>
      <td>{local(x.eta)}</td><td>{local(x.ata)}</td><td>{x.commodity??x.cargo??"—"}</td><td>{x.tonnage?fmt(x.tonnage):"—"}</td><td>{x.origin??"—"}</td><td>{x.consignee??"—"}</td>
      <td>{x.source_url?<a href={x.source_url} target="_blank" rel="noreferrer" style={{color:"var(--vio2)"}}>{x.source} ↗</a>:x.source}<div className="iq-sub">upd. {new Date(x.updated_at).toLocaleDateString()}</div></td>
      <td><span className="iq-tags" style={{flexWrap:"nowrap"}}><button className="iq-btn sm" onClick={()=>setForm({id:x.id,vessel:x.vessel,port:x.port,terminal:x.terminal??"",status:x.status,eta:x.eta?new Date(new Date(x.eta).getTime()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):"",ata:x.ata?new Date(new Date(x.ata).getTime()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):"",cargo:x.cargo??"",commodity:x.commodity??"",tonnage:x.tonnage??"",origin:x.origin??"",consignee:x.consignee??"",notes:x.notes??"",source:x.source,source_url:x.source_url??""})}>✎</button>
       <button className="iq-btn sm danger" aria-label="Delete" onClick={async()=>{if(await askConfirm({title:`Delete ${x.vessel}?`,body:"The arrival is removed from the list."})){await api(`/api/iq/vessels?id=${x.id}`,"DELETE");reload();}}}>Delete</button></span></td></tr>)}</tbody></table></div></section>)}
  </>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
