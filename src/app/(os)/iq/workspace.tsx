"use client";
import {useRouter} from "next/navigation";
import {useState,type ReactNode} from "react";
import {Analysis,Empty,ErrorBox,Loading,Toast,ago,api,useApi} from "./ui";
import {askConfirm} from "@/components/shell/app-shell";

export type Row={id:string;kind:string;title:string;input:Record<string,unknown>;output:Record<string,unknown>;provider:string;model:string;parent_id:string|null;version:number;created_at:string};

const md=(r:Row)=>{const lines=[`# ${r.title}`,`Generated ${new Date(r.created_at).toLocaleString()} · ${r.provider}/${r.model} · AI output — verify before acting.`,""];
 for(const [k,v] of Object.entries(r.output)){lines.push(`## ${k.replace(/_/g," ")}`);if(Array.isArray(v))v.forEach(x=>lines.push(`- ${typeof x==="object"?JSON.stringify(x):x}`));else if(typeof v==="object"&&v)Object.entries(v).forEach(([a,b])=>lines.push(`- **${a}:** ${b}`));else lines.push(String(v));lines.push("");}
 return lines.join("\n");};
export function exportReport(r:Row){const blob=new Blob([md(r)],{type:"text/markdown"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${r.kind}-${r.title.slice(0,40).replace(/[^\w]+/g,"-")}.md`;a.click();URL.revokeObjectURL(a.href);}

/* Shared workspace for AI modules: run → show result → act (save, Devil's Advocate, project, export) → history. */
export function Workspace({kind,form,actions=["save","devil","project","export"],extra}:{kind:string;form:(run:(body:Record<string,unknown>)=>Promise<void>,busy:boolean)=>ReactNode;actions?:string[];extra?:(r:Row,reload:()=>void)=>ReactNode}){
 const router=useRouter();
 const hist=useApi<{analyses:Row[]}>(`/api/iq/analyses?kind=${kind}`);
 const [cur,setCur]=useState<Row|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[toast,setToast]=useState("");
 const run=async(body:Record<string,unknown>)=>{setBusy(true);setErr("");try{const r=await api<{analysis:Row}>("/api/iq/analyze","POST",{kind,...body});setCur(r.analysis);hist.reload();setTimeout(()=>document.getElementById("iq-result")?.scrollIntoView({behavior:"smooth"}),50);}catch(e){setErr(e instanceof Error?e.message:"Failed");}finally{setBusy(false);}};
 const act=async(a:string,r:Row)=>{try{
  if(a==="save"){await api("/api/iq/saved","POST",{kind:"analysis",refId:r.id,title:r.title});setToast("Saved");}
  if(a==="devil"){const o=r.output as Record<string,string>;sessionStorage.setItem("iq-devil",JSON.stringify({idea:`${o.title??r.title}. ${o.executive_summary??o.summary??""}`.slice(0,2900),sector:String(r.input.sector??""),geography:String(r.input.geography??""),fromId:r.id}));router.push("/iq/devil");}
  if(a==="project"){const o=r.output as Record<string,string>;await api("/api/tasks","POST",{title:("AngolaIQ: "+(o.title??r.title)).slice(0,160),project:"AngolaIQ"});setToast("Task added to NASSIM OS");}
  if(a==="export")exportReport(r);
  if(a==="delete"){await api(`/api/iq/analyses?id=${r.id}`,"DELETE");if(cur?.id===r.id)setCur(null);hist.reload();setToast("Deleted");}
 }catch(e){setToast(e instanceof Error?e.message:"Failed");}};
 const L:Record<string,string>={save:"Save",devil:"Devil's Advocate",project:"Task",export:"Export"};
 return <div className="iq-grid">
  <section className="iq-card">{form(run,busy)}{busy&&<Loading label="AI is working — this takes 10–40 s…"/>}{err&&<ErrorBox msg={err}/>}</section>
  {cur&&<section className="iq-card" id="iq-result"><h3>{cur.title}<span className="iq-tags">{actions.map(a=><button key={a} className="iq-btn sm" onClick={()=>act(a,cur)}>{L[a]}</button>)}</span></h3>
   <Analysis out={cur.output} meta={cur}/>{extra?.(cur,()=>hist.reload())}</section>}
  <section className="iq-card"><h3>History</h3>
   {hist.loading&&!hist.data?<Loading/>:hist.error?<ErrorBox msg={hist.error} retry={hist.reload}/>:!hist.data?.analyses.length?<Empty>Nothing yet.</Empty>:
   <ul className="iq-list">{hist.data.analyses.map(r=><li key={r.id} className="iq-row"><div><button className="iq-btn sm" style={{border:0,background:"none",padding:0,textAlign:"left",fontWeight:600}} onClick={()=>{setCur(r);setTimeout(()=>document.getElementById("iq-result")?.scrollIntoView({behavior:"smooth"}),50);}}>{r.title}</button>
    <div className="iq-sub">{ago(r.created_at)}{r.version>1?` · v${r.version}`:""}{r.output.verdict?` · ${String(r.output.verdict)}`:""}</div></div>
    <button className="iq-btn sm danger" aria-label="Delete" onClick={async()=>{if(await askConfirm({title:"Delete this analysis?",body:"Saved copies and exports you already made are kept."}))act("delete",r);}}>Delete</button></li>)}</ul>}
  </section>
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </div>;
}
