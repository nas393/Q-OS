"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import QMd from "@/components/q-md";
import { buildQContext } from "@/lib/q-context";
import "./chat.css";

type Conv={id:string;title:string;updated_at?:string};
type Msg={role:"user"|"assistant";content:string};
type Gold={price:number;changePct:number;updatedAt:string}|null;
const QUICK:[string,string][]=[
 ["Status update","Status update on all my ventures: live status, blocker and next action for each."],
 ["Business analysis","Business analysis of my ecosystem: what works, what doesn't, and the single highest-value move."],
 ["Today's priorities","What are my top 3 priorities today, and why?"],
 ["Market intelligence","Gold (XAU/USD) read for this week: drivers, risks, what to watch. Say what you can't verify live."],
 ["Content plan","Plan this week's content for LUMERIS and NOVAÉ: one strong idea per day."],
 ["Devil's Advocate","Act as Devil's Advocate on my most important current decision: assumptions, strongest counterargument, failure scenarios, missing evidence, verdict (approve / approve with conditions / reconsider / postpone / reject)."]];

export default function ChatWorkspace({gold}:{gold:Gold}){
 const [convs,setConvs]=useState<Conv[]>([]),[convId,setConvId]=useState<string|undefined>(),[msgs,setMsgs]=useState<Msg[]>([]),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [status,setStatus]=useState<"checking"|"online"|"offline">("checking"),[hist,setHist]=useState(false),[err,setErr]=useState("");
 const [ctx,setCtx]=useState<{projects:Parameters<typeof buildQContext>[0]["projects"];tasks:Parameters<typeof buildQContext>[0]["tasks"]}>({projects:[],tasks:[]});
 const end=useRef<HTMLDivElement>(null),box=useRef<HTMLTextAreaElement>(null);
 const loadConvs=useCallback(async()=>{try{const r=await fetch("/api/chat",{cache:"no-store"});if(!r.ok)throw 0;setStatus("online");setConvs((await r.json()).conversations??[]);}catch{setStatus("offline");}},[]);
 useEffect(()=>{loadConvs();
  Promise.all([fetch("/api/projects",{cache:"no-store"}).then(r=>r.ok?r.json():{projects:[]}),fetch("/api/tasks",{cache:"no-store"}).then(r=>r.ok?r.json():{tasks:[]})]).then(([p,t])=>setCtx({projects:p.projects??[],tasks:t.tasks??[]})).catch(()=>{});
 },[loadConvs]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"})},[msgs]);
 async function openConv(id:string){setHist(false);setErr("");try{const r=await fetch(`/api/chat/${id}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error);setConvId(id);setMsgs((j.messages??[]).map((m:{role:string;content:string})=>({role:m.role==="user"?"user":"assistant",content:m.content})));}catch(e){setErr(e instanceof Error&&e.message?e.message:"Could not open conversation");}}
 function newChat(){setConvId(undefined);setMsgs([]);setHist(false);box.current?.focus();}
 async function send(text:string){const m=text.trim();if(!m||busy)return;setInput("");setErr("");setBusy(true);setMsgs(x=>[...x,{role:"user",content:m},{role:"assistant",content:""}]);
  const alerts=ctx.projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${p.name} deploy failed`}));
  try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m,portfolioContext:buildQContext({projects:ctx.projects,tasks:ctx.tasks,alerts,gold}),...(convId?{conversationId:convId}:{})})});
   if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));throw new Error(j.error??`Q returned ${r.status}`);}
   setStatus("online");const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
   for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop()??"";
    for(const part of parts){let ev:{delta?:string;conversationId?:string;error?:string};try{ev=JSON.parse(part.replace(/^data: /,""));}catch{continue;}
     if(ev.error)throw new Error(ev.error);if(ev.conversationId)setConvId(ev.conversationId);if(ev.delta)setMsgs(x=>{const c=[...x];c[c.length-1]={role:"assistant",content:c[c.length-1].content+ev.delta};return c;});}}
   loadConvs();
  }catch(e){setStatus("offline");setMsgs(x=>{const c=[...x];c[c.length-1]={role:"assistant",content:`⚠ ${e instanceof Error?e.message:"Q is unavailable"}`};return c;});}
  finally{setBusy(false);}}

 return <main className="qc">
  <header className="qc-top">
   <Link href="/dashboard" className="qc-back" aria-label="Back to Command Center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg></Link>
   <img src="/os/q-emblem.png" alt="" width={40} height={40} className="qc-emblem"/>
   <div className="qc-title"><b>Q</b><small><i className={status}/>{status==="online"?"Online":status==="offline"?"Offline":"Checking"} · Your Strategic Assistant</small></div>
   <button className="qc-btn" onClick={()=>setHist(h=>!h)} aria-label="History"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/></svg></button>
   <button className="qc-btn" onClick={newChat} aria-label="New chat"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
  </header>
  <div className="qc-body">
   <aside className={`qc-hist${hist?" open":""}`}>
    <button className="qc-new" onClick={newChat}>+ New conversation</button>
    {convs.length?convs.map(c=><button key={c.id} className={`qc-conv${c.id===convId?" on":""}`} onClick={()=>openConv(c.id)}><span>{c.title}</span>{c.updated_at&&<small>{new Date(c.updated_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</small>}</button>):<p className="qc-muted">No conversations yet.</p>}
   </aside>
   <section className="qc-main">
    <div className="qc-thread">
     {!msgs.length&&<div className="qc-hello"><img src="/os/n-mark.svg" alt="" width={70} height={64}/><h1>What do you need, Nassim?</h1><p>I read your live ventures, tasks, alerts and gold feed before I answer.</p></div>}
     {msgs.map((m,i)=><div key={i} className={`qc-msg ${m.role}`}>{m.role==="assistant"?(m.content?<QMd text={m.content}/>:<span className="qc-typing"><i/><i/><i/></span>):m.content}</div>)}
     {err&&<p className="qc-err">{err}</p>}
     <div ref={end}/>
    </div>
    <div className="qc-dock">
     <div className="qc-quick">{QUICK.map(([l,p])=><button key={l} onClick={()=>send(p)} disabled={busy} className={l==="Devil's Advocate"?"da":""}>{l}</button>)}</div>
     <form className="qc-ask" onSubmit={e=>{e.preventDefault();send(input)}}>
      <textarea ref={box} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input)}}} placeholder="How can I help you today?" maxLength={6000}/>
      <button type="submit" disabled={busy||!input.trim()} aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
     </form>
    </div>
   </section>
  </div>
 </main>;
}
