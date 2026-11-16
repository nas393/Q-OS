"use client";
import {useState} from "react";
import {Analysis,Empty,ErrorBox,Head,Loading,Toast,ago,api,useApi} from "../ui";
import {exportReport,type Row} from "../workspace";

type S={id:string;kind:string;ref_id:string|null;title:string;url:string|null;notes:string|null;tags:string[];archived:boolean;created_at:string};
const KINDS=["news","analysis","project","location","trade","regulation","report","observation"];

export default function Saved(){
 const [kind,setKind]=useState(""),[q,setQ]=useState(""),[arch,setArch]=useState(false),[from,setFrom]=useState("");
 const {data,error,loading,reload}=useApi<{saved:S[]}>(`/api/iq/saved?kind=${kind}&q=${encodeURIComponent(q)}${arch?"&archived=1":""}`);
 const [open,setOpen]=useState<{id:string;rows:Row[]}|null>(null),[edit,setEdit]=useState<{id:string;notes:string;tags:string}|null>(null),[toast,setToast]=useState("");
 const list=(data?.saved??[]).filter(s=>!from||s.created_at>=from);
 const view=async(s:S)=>{if(open?.id===s.id)return setOpen(null);const r=await fetch(`/api/iq/analyses?id=${s.ref_id}`).then(r=>r.json()).catch(()=>({analyses:[]}));setOpen({id:s.id,rows:r.analyses??[]});};
 const exportAll=()=>{const csv=[["kind","title","url","notes","tags","saved_at"],...list.map(s=>[s.kind,s.title,s.url??"",s.notes??"",s.tags.join(" "),s.created_at])].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="angolaiq-library.csv";a.click();};
 return <>
  <Head title="Saved Items" desc="Your knowledge library. Everything you saved keeps its source link and timestamp.">
   <button className="iq-btn" onClick={()=>setArch(a=>!a)}>{arch?"← Library":"Archive"}</button><button className="iq-btn" onClick={exportAll} disabled={!list.length}>⤓ Export CSV</button>
  </Head>
  <div className="iq-filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title, notes or tag" aria-label="Search library"/>
   <select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Category"><option value="">All types</option>{KINDS.map(k=><option key={k}>{k}</option>)}</select>
   <input type="date" value={from} onChange={e=>setFrom(e.target.value)} aria-label="Saved since" style={{minWidth:150}}/></div>
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:!list.length?<Empty>Nothing saved{arch?" in the archive":""} yet. Use ☆ Save on news, analyses, trade and map places.</Empty>:
  <ul className="iq-list iq-card">{list.map(s=><li key={s.id}>
   <div className="iq-row"><div><small className="iq-badge">{s.kind.toUpperCase()}</small> {s.url?<a className="t" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>:<b>{s.title}</b>}
    <div className="iq-sub">saved {ago(s.created_at)}{s.tags.length?` · #${s.tags.join(" #")}`:""}</div>{s.notes&&<div className="iq-sub">📝 {s.notes}</div>}</div></div>
   {edit?.id===s.id&&<form className="iq-form two" style={{marginTop:8}} onSubmit={async e=>{e.preventDefault();await api("/api/iq/saved","PATCH",{id:s.id,notes:edit.notes,tags:edit.tags.split(/[ ,#]+/).filter(Boolean).slice(0,10)});setEdit(null);reload();}}>
    <input value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})} placeholder="Notes" aria-label="Notes" style={{minHeight:38,padding:"0 10px",borderRadius:8,border:"1px solid var(--line2)",background:"var(--panel)",color:"var(--txt)"}}/>
    <input value={edit.tags} onChange={e=>setEdit({...edit,tags:e.target.value})} placeholder="tags, comma separated" aria-label="Tags" style={{minHeight:38,padding:"0 10px",borderRadius:8,border:"1px solid var(--line2)",background:"var(--panel)",color:"var(--txt)"}}/>
    <div className="full"><button className="iq-btn sm pri">Save</button></div></form>}
   <div className="iq-tags" style={{marginTop:6}}>
    {s.kind==="analysis"&&<button className="iq-btn sm" onClick={()=>view(s)}>{open?.id===s.id?"Hide":"View"}</button>}
    <button className="iq-btn sm" onClick={()=>setEdit({id:s.id,notes:s.notes??"",tags:s.tags.join(", ")})}>✎ Notes/tags</button>
    <button className="iq-btn sm" onClick={async()=>{await api("/api/iq/saved","PATCH",{id:s.id,archived:!s.archived});reload();setToast(s.archived?"Restored":"Archived");}}>{s.archived?"Restore":"Archive"}</button>
    <button className="iq-btn sm danger" onClick={async()=>{if(confirm("Delete this saved item? The original record is kept.")){await api(`/api/iq/saved?id=${s.id}`,"DELETE");reload();}}}>✕ Delete</button>
   </div>
   {open?.id===s.id&&(open.rows.length?open.rows.map(r=><div key={r.id} className="iq-card" style={{marginTop:8}}><div className="iq-tags" style={{marginBottom:8}}><b>v{r.version} · {r.kind}</b><button className="iq-btn sm" onClick={()=>exportReport(r)}>⤓ Export</button></div><Analysis out={r.output} meta={r}/></div>):<p className="iq-sub">The analysis was deleted.</p>)}
  </li>)}</ul>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
