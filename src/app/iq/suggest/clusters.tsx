"use client";
import {useMemo,useState} from "react";
import {Analysis,Badge,Empty,ErrorBox,Loading,Toast,ago,api,useApi} from "../ui";
import {exportReport,type Row} from "../workspace";
import {SECT} from "../lists";

/* One latest AI brief per sector, plus sector news counts from stored intelligence, compared in a growth/risk matrix. */
const NEWS_CAT:Record<string,string>={"Oil and Gas":"oil_gas","Agriculture":"agriculture","Food and Beverages":"food","Manufacturing":"manufacturing","Retail and FMCG":"retail","Banking and Finance":"finance","Construction":"construction","Infrastructure":"infrastructure","Logistics and Ports":"logistics","Mining":"mining","Technology":"technology","Telecommunications":"technology","Imports and Distribution":"trade"};
const L={low:1,medium:2,high:3} as Record<string,number>;
export function Clusters(){
 const hist=useApi<{analyses:Row[]}>("/api/iq/analyses?kind=cluster");
 const [sel,setSel]=useState<string|null>(null),[busy,setBusy]=useState(""),[toast,setToast]=useState("");
 const latest=useMemo(()=>{const m=new Map<string,Row>();for(const r of hist.data?.analyses??[])if(!m.has(r.title))m.set(r.title,r);return m;},[hist.data]);
 const news=useApi<{items:Array<{id:string;title:string;url:string;publisher:string;published_at:string;reliability:string}>}>(sel&&NEWS_CAT[sel]?`/api/iq/items?cat=${NEWS_CAT[sel]}&days=30`:null);
 const gen=async(s:string)=>{setBusy(s);try{await api("/api/iq/analyze","POST",{kind:"cluster",sector:s});await hist.reload();setSel(s);setToast("Sector brief ready");}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const cur=sel?latest.get(sel):undefined;
 const scored=[...latest.values()].map(r=>({s:r.title,g:L[String(r.output.growth)]??0,k:L[String(r.output.risk)]??0,o:Number(r.output.opportunity_score)||0})).sort((a,b)=>b.o-a.o);
 return <>
  
  {hist.loading&&!hist.data?<Loading/>:hist.error?<ErrorBox msg={hist.error} retry={hist.reload}/>:<div className="iq-grid">
   <section className="iq-card"><h3>Sectors</h3><div className="iq-chips">{SECT.map(s=><button key={s} className={`iq-chip${sel===s?" on":""}`} onClick={()=>setSel(s)}>{s}{latest.has(s)?" ✓":""}</button>)}</div></section>
   {scored.length>1&&<section className="iq-card"><h3>Comparison (AI-assessed)</h3><div className="iq-scroll"><table className="iq-table"><thead><tr><th>Sector</th><th>Opportunity</th><th>Growth</th><th>Risk</th></tr></thead><tbody>
    {scored.map(x=><tr key={x.s} onClick={()=>setSel(x.s)} style={{cursor:"pointer"}}><td>{x.s}</td><td><div className="iq-bar" style={{width:120}}><i style={{width:`${x.o*10}%`}}/></div></td><td>{["—","low","medium","high"][x.g]}</td><td>{["—","low","medium","high"][x.k]}</td></tr>)}</tbody></table></div></section>}
   {sel&&<section className="iq-card"><h3>{sel}<span className="iq-tags"><button className="iq-btn sm pri" disabled={!!busy} onClick={()=>gen(sel)}>{busy===sel?"Writing…":cur?"↻ Update brief":"✦ Generate brief"}</button>{cur&&<button className="iq-btn sm" onClick={()=>exportReport(cur)}>⤓ Export</button>}{cur&&<button className="iq-btn sm" onClick={()=>api("/api/iq/saved","POST",{kind:"analysis",refId:cur.id,title:"Sector: "+sel}).then(()=>setToast("Saved"))}>☆ Save</button>}</span></h3>
    {busy===sel&&<Loading label="Writing sector brief…"/>}
    {cur?<Analysis out={cur.output} meta={cur}/>:<Empty>No brief yet for {sel}.</Empty>}
    <h3 style={{marginTop:16}}>Recent sector news</h3>
    {!NEWS_CAT[sel]?<p className="iq-sub">No news category maps to this sector yet.</p>:news.loading?<Loading/>:!news.data?.items.length?<Empty>No stored news for this sector in 30 days.</Empty>:
     <ul className="iq-list">{news.data.items.slice(0,8).map(n=><li key={n.id}><a className="t" href={n.url} target="_blank" rel="noreferrer">{n.title}</a><div className="iq-tags"><Badge kind={n.reliability}/><span className="iq-sub">{n.publisher} · {ago(n.published_at)}</span></div></li>)}</ul>}
   </section>}
  </div>}
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
