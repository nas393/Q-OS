"use client";
import {useState} from "react";
import {Field,Head} from "../ui";
import {Workspace} from "../workspace";
import {PROV,SECT} from "../lists";

const F=[["budget","Investment budget"],["model","Business model"],["customers","Target customers"],["horizon","Time horizon"],["capabilities","Existing capabilities"],["constraints","Operational constraints"]] as const;
export default function Suggest(){
 const [v,setV]=useState<Record<string,string>>({sector:"Food and Beverages",risk:"medium"});
 const set=(k:string)=>(e:{target:{value:string}})=>setV(x=>({...x,[k]:e.target.value}));
 return <>
  <Head title="AI Suggestions" desc="Find one concrete opportunity in Angola from your inputs and the stored intelligence. Market evidence is cited; everything else is labelled as assumption."/>
  <Workspace kind="suggest" form={(run,busy)=><form className="iq-form two" onSubmit={e=>{e.preventDefault();run({input:Object.fromEntries(Object.entries(v).filter(([,x])=>x))});}}>
   <Field label="Sector *"><select value={v.sector} onChange={set("sector")}>{SECT.map(s=><option key={s}>{s}</option>)}</select></Field>
   <Field label="Geography"><select value={v.geography??""} onChange={set("geography")}><option value="">Angola (national)</option>{PROV.map(s=><option key={s}>{s}</option>)}</select></Field>
   <Field label="Risk appetite"><select value={v.risk} onChange={set("risk")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
   {F.map(([k,l])=><Field key={k} label={l}><input value={v[k]??""} onChange={set(k)} maxLength={300}/></Field>)}
   <Field full label="Additional context"><textarea value={v.context??""} onChange={set("context")} maxLength={2000} placeholder="What you know, what you want to avoid, who you can sell to"/></Field>
   <div className="full"><button className="iq-btn pri" disabled={busy}>{busy?"Generating…":"✦ Generate opportunity"}</button></div>
  </form>}/>
 </>;
}
