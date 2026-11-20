"use client";
import {Suspense,useState} from "react";
import {useSearchParams} from "next/navigation";
import {Badge,Empty,ErrorBox,Head,Loading,Toast,ago,api,useApi} from "../ui";

type Item={id:string;title:string;url:string;publisher:string;published_at:string|null;retrieved_at:string;category:string;impact:string|null;reliability:string;summary:string|null;facts:string[];confidence:string|null;reviewed:boolean;notes:string|null;saved:boolean};
const CATS=["economy","politics","oil_gas","agriculture","food","trade","finance","infrastructure","technology","logistics","construction","mining","retail","manufacturing","regulation"];

function News(){
 const sp=useSearchParams();
 const [q,setQ]=useState(sp.get("q")??""),[cat,setCat]=useState(""),[rel,setRel]=useState(""),[days,setDays]=useState("30"),[pub,setPub]=useState(""),[page,setPage]=useState(0);
 const url=`/api/iq/items?q=${encodeURIComponent(q)}&cat=${cat}&rel=${rel}&days=${days}&pub=${encodeURIComponent(pub)}&page=${page}`;
 const {data,error,loading,reload,setData}=useApi<{items:Item[];publishers:Array<{publisher:string;n:number}>}>(url);
 const [busy,setBusy]=useState(""),[toast,setToast]=useState(""),[note,setNote]=useState<{id:string;text:string}|null>(null);
 const patch=(id:string,p:Partial<Item>)=>setData(d=>d?{...d,items:d.items.map(i=>i.id===id?{...i,...p}:i)}:d);
 const run=async(id:string,label:string,fn:()=>Promise<unknown>,msg:string)=>{setBusy(id+label);try{await fn();setToast(msg);}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const share=(i:Item)=>{const t=`${i.title} — ${i.publisher}\n${i.url}`;if(navigator.share)navigator.share({title:i.title,url:i.url}).catch(()=>{});else navigator.clipboard.writeText(t).then(()=>setToast("Link copied"));};
 return <>
  <Head title="News" desc="Angola business and economic news from the GDELT index, with duplicate detection and source reliability. Headlines are real; summaries are AI and marked as such.">
   <button className="iq-btn" disabled={!!busy} onClick={()=>run("","refresh",async()=>{const r=await api<{result:Record<string,string>}>("/api/iq/refresh","POST",{job:"news"});await reload();setToast(`News: ${r.result.news}`);},"")}>{busy==="refresh"?"Refreshing…":"Refresh"}</button>
  </Head>
  <div className="iq-filters">
   <input value={q} onChange={e=>{setQ(e.target.value);setPage(0);}} placeholder="Search headlines" aria-label="Search"/>
   <select value={cat} onChange={e=>{setCat(e.target.value);setPage(0);}} aria-label="Sector"><option value="">All sectors</option>{CATS.map(c=><option key={c} value={c}>{c.replace("_"," & ")}</option>)}</select>
   <select value={rel} onChange={e=>setRel(e.target.value)} aria-label="Reliability"><option value="">Any source</option><option value="trusted">Trusted only</option><option value="unverified">Unverified</option></select>
   <select value={pub} onChange={e=>setPub(e.target.value)} aria-label="Publisher"><option value="">All publishers</option>{data?.publishers.map(p=><option key={p.publisher} value={p.publisher}>{p.publisher} ({p.n})</option>)}</select>
   <select value={days} onChange={e=>setDays(e.target.value)} aria-label="Date range"><option value="1">24h</option><option value="7">7 days</option><option value="30">30 days</option><option value="365">1 year</option></select>
  </div>
  {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:!data?.items.length?<Empty>No articles match. Tap <b>Refresh</b> to pull the latest from GDELT.</Empty>:
  <ul className="iq-list iq-card">{data.items.map(i=><li key={i.id}>
   <div className="iq-row"><div>
    <a className="t" href={i.url} target="_blank" rel="noreferrer">{i.title}</a>
    <div className="iq-tags"><Badge kind={i.reliability}/>{i.impact&&<Badge kind={i.impact}/>}{i.reviewed&&<Badge kind="verified"/>}<span className="iq-sub">{i.publisher} · published {ago(i.published_at)} · retrieved {ago(i.retrieved_at)} · {i.category}</span></div>
    {i.summary&&<p className="iq-sub" style={{marginTop:6}}><Badge kind="ai"/> {i.summary}{i.confidence&&` (confidence ${i.confidence})`}</p>}
    {i.facts?.length>0&&<ul className="iq-sub" style={{margin:"4px 0 0",paddingLeft:18}}>{i.facts.map((f,k)=><li key={k}>{f}</li>)}</ul>}
    {i.notes&&<p className="iq-sub">Note: {i.notes}</p>}
    {note?.id===i.id&&<div className="iq-row" style={{marginTop:6}}><input className="iq-search" style={{minHeight:38,padding:"0 10px",borderRadius:8,border:"1px solid var(--line2)",background:"var(--panel)",color:"var(--txt)"}} value={note.text} onChange={e=>setNote({id:i.id,text:e.target.value})} placeholder="Add a note" aria-label="Note"/><button className="iq-btn sm" onClick={()=>run(i.id,"note",async()=>{await api("/api/iq/items","PATCH",{id:i.id,notes:note.text});patch(i.id,{notes:note.text});setNote(null);},"Note saved")}>Save</button></div>}
    <div className="iq-tags" style={{marginTop:8}}>
     <button className="iq-btn sm" disabled={!!busy} onClick={()=>run(i.id,"an",async()=>{await api("/api/iq/analyze","POST",{kind:"news",itemId:i.id});await reload();},"Analysis added")}>{busy===i.id+"an"?"Analysing…":"Analyse"}</button>
     <button className="iq-btn sm" disabled={i.saved} onClick={()=>run(i.id,"sv",async()=>{await api("/api/iq/saved","POST",{kind:"news",refId:i.id,title:i.title,url:i.url});patch(i.id,{saved:true});},"Saved")}>{i.saved?"Saved":"Save"}</button>
     <button className="iq-btn sm" onClick={()=>run(i.id,"rv",async()=>{await api("/api/iq/items","PATCH",{id:i.id,reviewed:!i.reviewed});patch(i.id,{reviewed:!i.reviewed});},i.reviewed?"Marked unreviewed":"Marked reviewed")}>{i.reviewed?"↺ Unreview":"✓ Reviewed"}</button>
     <button className="iq-btn sm" onClick={()=>setNote({id:i.id,text:i.notes??""})}>Note</button>
     <button className="iq-btn sm" onClick={()=>share(i)}>Share</button>
    </div>
   </div></div></li>)}</ul>}
  {data&&<div className="iq-tags" style={{justifyContent:"center",marginTop:12}}><button className="iq-btn sm" disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Newer</button><button className="iq-btn sm" disabled={(data.items.length??0)<30} onClick={()=>setPage(p=>p+1)}>Older →</button></div>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
export default function Page(){return <Suspense fallback={<Loading/>}><News/></Suspense>;}
