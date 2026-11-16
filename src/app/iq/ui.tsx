"use client";
import {useCallback,useEffect,useState,type ReactNode} from "react";

/* Shared AngolaIQ UI: data hook, API calls, page header, states, trust badges, generic AI analysis renderer. */
export function useApi<T>(url:string|null){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(!!url);
 const load=useCallback(async()=>{if(!url)return;setLoading(true);setError("");try{const r=await fetch(url,{cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error??`Error ${r.status}`);setData(j);}catch(e){setError(e instanceof Error?e.message:"Failed to load");}finally{setLoading(false);}},[url]);
 useEffect(()=>{load();},[load]);
 return {data,error,loading,reload:load,setData};
}
export async function api<T=Record<string,unknown>>(path:string,method:"POST"|"PATCH"|"DELETE",body?:unknown):Promise<T>{
 const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error??`Error ${r.status}`);return j as T;
}

export function Head({title,desc,children}:{title:string;desc:string;children?:ReactNode}){
 return <header className="iq-head"><div><h1>{title}</h1><p>{desc}</p></div>{children&&<div className="iq-head-act">{children}</div>}</header>;
}
export const Loading=({label="Loading…"}:{label?:string})=><div className="iq-state"><span className="iq-spin"/>{label}</div>;
export const ErrorBox=({msg,retry}:{msg:string;retry?:()=>void})=><div className="iq-state err">⚠ {msg}{retry&&<button onClick={retry}>Retry</button>}</div>;
export const Empty=({children}:{children:ReactNode})=><div className="iq-state empty">{children}</div>;
export function Toast({msg,onDone}:{msg:string;onDone:()=>void}){useEffect(()=>{if(!msg)return;const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[msg,onDone]);return msg?<div className="iq-toast" role="status">{msg}</div>:null;}

const TRUST:Record<string,string>={primary:"OFFICIAL SOURCE",official:"OFFICIAL SOURCE",trusted:"TRUSTED SOURCE",unverified:"UNVERIFIED",ai:"AI-INFERRED",estimated:"ESTIMATED",stale:"STALE DATA",verified:"VERIFIED"};
export const Badge=({kind}:{kind:string})=><span className={`iq-badge b-${kind}`}>{TRUST[kind]??kind.toUpperCase()}</span>;
export const ago=(t?:string|null)=>{if(!t)return "never";const m=Math.round((Date.now()-Date.parse(t))/60000);return m<1?"just now":m<60?`${m}m ago`:m<1440?`${Math.round(m/60)}h ago`:`${Math.round(m/1440)}d ago`;};
export const fmt=(v:number|string,unit="")=>{const n=Number(v);if(!Number.isFinite(n))return String(v);const s=Math.abs(n)>=1e9?(n/1e9).toFixed(1)+"B":Math.abs(n)>=1e6?(n/1e6).toFixed(1)+"M":Math.abs(n)>=1000?n.toLocaleString("en",{maximumFractionDigits:0}):n.toLocaleString("en",{maximumFractionDigits:2});return unit.startsWith("%")?s+"%":s;};

const human=(k:string)=>k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const TRUST_KEYS=["facts","assumptions","inferences","limitations","confidence"];
function Val({v}:{v:unknown}):ReactNode{
 if(v==null||v==="")return <em className="iq-muted">—</em>;
 if(typeof v!=="object")return <span>{String(v)}</span>;
 if(Array.isArray(v)){if(!v.length)return <em className="iq-muted">None</em>;
  return <ul>{v.map((x,i)=><li key={i}>{typeof x==="object"&&x?Object.entries(x).map(([k,y])=><span key={k} className="iq-kv"><b>{human(k)}:</b> {Array.isArray(y)?y.join(", "):String(y)} </span>):String(x)}</li>)}</ul>;}
 return <dl>{Object.entries(v as Record<string,unknown>).map(([k,y])=><div key={k}><dt>{human(k)}</dt><dd><Val v={y}/></dd></div>)}</dl>;
}
/* Renders any AI analysis: verdict/score first, content sections, then the trust block (facts vs assumptions vs inferences). */
export function Analysis({out,meta}:{out:Record<string,unknown>;meta?:{provider?:string;model?:string;created_at?:string}}){
 const top=["verdict","risk_score","headline","title","summary","executive_summary","overview"].filter(k=>out[k]!=null);
 const body=Object.keys(out).filter(k=>!top.includes(k)&&!TRUST_KEYS.includes(k));
 return <div className="iq-analysis">
  <div className="iq-an-top">{out.verdict!=null&&<span className={`iq-verdict v-${String(out.verdict).split(" ")[0].toLowerCase()}`}>{String(out.verdict)}</span>}
   {out.risk_score!=null&&<span className="iq-score">Risk {String(out.risk_score)}/10</span>}{out.confidence!=null&&<span className="iq-conf">Confidence: {String(out.confidence)}</span>}<Badge kind="ai"/></div>
  {top.filter(k=>!["verdict","risk_score"].includes(k)).map(k=><p key={k} className={k==="headline"||k==="title"?"iq-an-h":""}>{String(out[k])}</p>)}
  {body.map(k=><section key={k}><h4>{human(k)}</h4><Val v={out[k]}/></section>)}
  <div className="iq-trust">{["facts","assumptions","inferences","limitations"].map(k=><section key={k}><h4>{human(k)}</h4><Val v={out[k]}/></section>)}</div>
  {meta&&<p className="iq-meta">Generated {meta.created_at?new Date(meta.created_at).toLocaleString():""} · {meta.provider}/{meta.model} · AI output — verify before acting.</p>}
 </div>;
}
export function Field({label,children,full}:{label:string;children:ReactNode;full?:boolean}){return <label className={`iq-field${full?" full":""}`}><span>{label}</span>{children}</label>;}
