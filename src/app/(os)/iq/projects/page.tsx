"use client";
import Link from "next/link";
import {useState} from "react";
import {Empty,ErrorBox,Field,Head,Loading,Toast,ago,api,useApi} from "../ui";
import {PROV,SECT} from "../lists";

type M={title:string;done:boolean;due?:string};
type P={id:string;name:string;description:string|null;sector:string|null;geography:string|null;status:string;investment:string|null;target_date:string|null;expected_outcome:string|null;notes:string|null;milestones:M[];analysis_ids:string[];history:Array<{at:string;change:string}>;archived:boolean;updated_at:string};
const ST=["idea","researching","compliance","active","paused","abandoned","completed"];
const blank={name:"",description:"",sector:"",geography:"",status:"idea",investment:"",target_date:"",expected_outcome:"",notes:""};

export default function Projects(){
 const [arch,setArch]=useState(false);
 const {data,error,loading,reload}=useApi<{projects:P[]}>(`/api/iq/projects${arch?"?archived=1":""}`);
 const [edit,setEdit]=useState<(typeof blank)&{id?:string}|null>(null),[open,setOpen]=useState<string|null>(null),[q,setQ]=useState(""),[st,setSt]=useState(""),[sort,setSort]=useState("updated"),[ms,setMs]=useState(""),[toast,setToast]=useState("");
 const save=async(p:Record<string,unknown>,msg="Saved")=>{try{await api("/api/iq/projects","POST",p);setToast(msg);reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}};
 const list=(data?.projects??[]).filter(p=>(!st||p.status===st)&&(!q||(p.name+(p.description??"")).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):sort==="target"?(a.target_date??"9").localeCompare(b.target_date??"9"):b.updated_at.localeCompare(a.updated_at));
 return <>
  <Head title="Projects" desc="Ideas you are acting on, linked to their analysis.">
   <button className="iq-btn" onClick={()=>setArch(a=>!a)}>{arch?"← Active":"Archived"}</button>
   <button className="iq-btn pri" onClick={()=>setEdit({...blank})}>+ New project</button>
  </Head>
  {edit&&<section className="iq-card" style={{marginBottom:12}}><h3>{edit.id?"Edit project":"New project"}</h3>
   <form className="iq-form two" onSubmit={async e=>{e.preventDefault();const {id,...f}=edit;await save({...(id?{id}:{}),...Object.fromEntries(Object.entries(f).map(([k,v])=>[k,v===""?(k==="target_date"?null:undefined):v]))});setEdit(null);}}>
    <Field label="Name *"><input required maxLength={160} value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
    <Field label="Status"><select value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}>{ST.map(s=><option key={s}>{s}</option>)}</select></Field>
    <Field label="Sector"><select value={edit.sector} onChange={e=>setEdit({...edit,sector:e.target.value})}><option value="">—</option>{SECT.map(s=><option key={s}>{s}</option>)}</select></Field>
    <Field label="Geography"><select value={edit.geography} onChange={e=>setEdit({...edit,geography:e.target.value})}><option value="">—</option>{PROV.map(s=><option key={s}>{s}</option>)}</select></Field>
    <Field label="Investment estimate"><input value={edit.investment} onChange={e=>setEdit({...edit,investment:e.target.value})} placeholder="e.g. US$ 250k"/></Field>
    <Field label="Target launch"><input type="date" value={edit.target_date} onChange={e=>setEdit({...edit,target_date:e.target.value})}/></Field>
    <Field full label="Description"><textarea value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})}/></Field>
    <Field full label="Expected outcome"><input value={edit.expected_outcome} onChange={e=>setEdit({...edit,expected_outcome:e.target.value})}/></Field>
    <Field full label="Notes"><textarea value={edit.notes} onChange={e=>setEdit({...edit,notes:e.target.value})}/></Field>
    <div className="full iq-tags"><button className="iq-btn pri">Save</button><button type="button" className="iq-btn" onClick={()=>setEdit(null)}>Cancel</button></div>
   </form></section>}
  <div className="iq-filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects"/>
   <select value={st} onChange={e=>setSt(e.target.value)} aria-label="Status"><option value="">All statuses</option>{ST.map(s=><option key={s}>{s}</option>)}</select>
   <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort"><option value="updated">Recently updated</option><option value="name">Name</option><option value="target">Target date</option></select></div>
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:!list.length?<Empty>{arch?"No archived projects.":"No projects yet. Tap “New project”."}</Empty>:
  <div className="iq-grid">{list.map(p=>{const done=p.milestones.filter(m=>m.done).length,pct=p.milestones.length?Math.round(done/p.milestones.length*100):0;
   return <section key={p.id} className="iq-card"><div className="iq-row"><div><b style={{fontSize:16}}>{p.name}</b><div className="iq-sub">{p.status} · {p.sector??"no sector"} · {p.geography??"Angola"}{p.target_date?` · target ${p.target_date.slice(0,10)}`:""}{p.investment?` · ${p.investment}`:""} · updated {ago(p.updated_at)}</div></div>
    <button className="iq-btn sm" onClick={()=>setOpen(open===p.id?null:p.id)}>{open===p.id?"Close":"Open"}</button></div>
    <div className="iq-bar" style={{marginTop:10}}><i style={{width:`${pct}%`}}/></div><div className="iq-sub">{done}/{p.milestones.length} milestones · {pct}%</div>
    {open===p.id&&<div style={{marginTop:12}} className="iq-grid">
     {p.description&&<p style={{margin:0}}>{p.description}</p>}
     {p.expected_outcome&&<p className="iq-sub" style={{margin:0}}>Expected outcome: {p.expected_outcome}</p>}
     <div><b>Milestones</b><ul className="iq-list">{p.milestones.map((m,i)=><li key={i} className="iq-row"><input type="checkbox" checked={m.done} onChange={()=>save({id:p.id,name:p.name,milestones:p.milestones.map((x,j)=>j===i?{...x,done:!x.done}:x)},"Updated")} aria-label={m.title}/><div style={{textDecoration:m.done?"line-through":"none"}}>{m.title}</div>
      <button className="iq-btn sm danger" aria-label="Remove milestone" onClick={()=>save({id:p.id,name:p.name,milestones:p.milestones.filter((_,j)=>j!==i)},"Removed")}>Delete</button></li>)}</ul>
      <form className="iq-row" onSubmit={e=>{e.preventDefault();if(ms.trim()){save({id:p.id,name:p.name,milestones:[...p.milestones,{title:ms.trim().slice(0,160),done:false}]},"Milestone added");setMs("");}}}><input value={ms} onChange={e=>setMs(e.target.value)} placeholder="Add milestone" aria-label="New milestone" className="input" style={{flex:1}}/><button className="iq-btn sm">+</button></form></div>
     {p.analysis_ids.length>0&&<p className="iq-sub" style={{margin:0}}>Linked analyses: {p.analysis_ids.length} · <Link href="/iq/saved" style={{color:"var(--vio2)"}}>open in library</Link></p>}
     {p.notes&&<p className="iq-sub" style={{margin:0}}>Note: {p.notes}</p>}
     {p.history.length>0&&<details><summary className="iq-sub">Decision history ({p.history.length})</summary><ul className="iq-sub">{p.history.slice(0,15).map((h,i)=><li key={i}>{new Date(h.at).toLocaleString()} — {h.change}</li>)}</ul></details>}
     <div className="iq-tags">
      <button className="iq-btn sm" onClick={()=>setEdit({id:p.id,name:p.name,description:p.description??"",sector:p.sector??"",geography:p.geography??"",status:p.status,investment:p.investment??"",target_date:p.target_date?.slice(0,10)??"",expected_outcome:p.expected_outcome??"",notes:p.notes??""})}>✎ Edit</button>
      <button className="iq-btn sm" onClick={()=>{sessionStorage.setItem("iq-devil",JSON.stringify({idea:`${p.name}. ${p.description??""}`.slice(0,2900),sector:p.sector??"",geography:p.geography??"",investment:p.investment??""}));location.href="/iq/devil";}}>Stress-test</button>
      <button className="iq-btn sm" onClick={()=>save({id:p.id,name:p.name,archived:!p.archived},p.archived?"Restored":"Archived")}>{p.archived?"Restore":"Archive"}</button>
     </div>
    </div>}
   </section>;})}</div>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
