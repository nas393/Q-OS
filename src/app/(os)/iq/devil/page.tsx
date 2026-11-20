"use client";
import {useEffect,useState} from "react";
import {Field,Head,Loading,Analysis,api} from "../ui";
import {Workspace,type Row} from "../workspace";
import {PROV,SECT} from "../lists";

const F=[["investment","Investment amount"],["revenue","Expected revenue"],["costs","Cost assumptions"],["customer","Target customer"],["model","Business model"],["return","Expected return"],["timeline","Timeline"]] as const;

function Review({r}:{r:Row}){
 const [rev,setRev]=useState<Row|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState("");
 if(r.kind!=="devil")return null;
 return <div style={{marginTop:14}}>
  {!rev&&<button className="iq-btn" disabled={busy} onClick={async()=>{setBusy(true);setErr("");try{const x=await api<{analysis:Row}>("/api/iq/analyze","POST",{kind:"devil_review",parentId:r.id});setRev(x.analysis);}catch(e){setErr(e instanceof Error?e.message:"Failed");}finally{setBusy(false);}}}>Second AI review (challenge this analysis)</button>}
  {busy&&<Loading label="Independent reviewer is challenging the first analysis…"/>}{err&&<p className="iq-sub">{err}</p>}
  {rev&&<section className="iq-card" style={{marginTop:10}}><h3>Second review · v{rev.version}</h3><Analysis out={rev.output} meta={rev}/></section>}
 </div>;
}

export default function Devil(){
 const [v,setV]=useState<Record<string,string>>({idea:"",sector:"",geography:""});
 useEffect(()=>{try{const s=sessionStorage.getItem("iq-devil");if(s){setV(JSON.parse(s));sessionStorage.removeItem("iq-devil");}}catch{}},[]);
 const set=(k:string)=>(e:{target:{value:string}})=>setV(x=>({...x,[k]:e.target.value}));
 return <>
  <Head title="Devil's Advocate" desc="Stress-test a decision before you commit money. It challenges assumptions, runs scenarios and gives a verdict. AI output — use it to find weak spots, not as proof."/>
  <Workspace kind="devil" actions={["save","project","export"]} extra={r=><Review r={r}/>} form={(run,busy)=><form className="iq-form two" onSubmit={e=>{e.preventDefault();const {fromId,...input}=v;run({input:Object.fromEntries(Object.entries(input).filter(([,x])=>x)),...(fromId?{fromId}:{})});}}>
   <Field full label="Business idea or decision *"><textarea required minLength={10} maxLength={3000} value={v.idea} onChange={set("idea")} placeholder="e.g. Launch a 1 kg branded rice pack in Huambo and Benguela through modern trade at AOA x"/></Field>
   <Field label="Sector"><select value={v.sector} onChange={set("sector")}><option value="">—</option>{SECT.map(s=><option key={s}>{s}</option>)}</select></Field>
   <Field label="Geography"><select value={v.geography} onChange={set("geography")}><option value="">Angola (national)</option>{PROV.map(s=><option key={s}>{s}</option>)}</select></Field>
   {F.map(([k,l])=><Field key={k} label={l}><input value={v[k]??""} onChange={set(k)} maxLength={300}/></Field>)}
   <Field full label="Supporting evidence"><textarea value={v.evidence??""} onChange={set("evidence")} maxLength={2000} placeholder="Numbers, quotes, links you already have"/></Field>
   <div className="full"><button className="iq-btn pri" disabled={busy||v.idea.trim().length<10}>{busy?"Challenging…":"Challenge this idea"}</button></div>
  </form>}/>
 </>;
}
