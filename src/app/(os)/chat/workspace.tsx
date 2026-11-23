"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QMd from "@/components/q-md";
import { buildQContext } from "@/lib/q-context";
import {I} from "@/components/shell/icons";
import "./chat.css";
import {QMark} from "@/components/shell/q-mark";

type Conv={id:string;title:string;updated_at?:string};
type Msg={role:"user"|"assistant";content:string};
type Gold={price:number;changePct:number;updatedAt:string}|null;
type Workspace="general"|"executive_twin";
const QUICK:[string,string][]=[
 ["Status update","Status update on all my ventures: live status, blocker and next action for each."],
 ["Business analysis","Business analysis of my ecosystem: what works, what doesn't, and the single highest-value move."],
 ["Today's priorities","What are my top 3 priorities today, and why?"],
 ["Market intelligence","Gold (XAU/USD) read for this week: drivers, risks, what to watch. Say what you can't verify live."],
 ["Content plan","Plan this week's content for LUMERIS and NOVAÉ: one strong idea per day."],
 ["Devil's Advocate","Act as Devil's Advocate on my most important current decision: assumptions, strongest counterargument, failure scenarios, missing evidence, verdict (approve / approve with conditions / reconsider / postpone / reject)."]];
const TWIN_QUICK:[string,string][]=[
 ["CEO / GM lens","Act as my CEO/GM. Review the strategic situation, trade-offs, organisational implications and the single decision I should make."],
 ["Commercial Director","Use my Commercial Director lens. Assess revenue, volume, gross margin, pricing, channel mix, customer risk and execution priorities. Flag missing data."],
 ["CFO lens","Take the CFO perspective. Challenge the economics, cash impact, margin quality, downside exposure and return on capital. Do not invent figures."],
 ["COO lens","Take the COO perspective. Identify operational bottlenecks, owners, dependencies, service risks and the execution sequence."],
 ["Negotiator","Prepare me for a high-stakes negotiation: objectives, walk-away point, leverage, counterpart incentives, concessions and opening position."],
 ["Devil's Advocate","Challenge my current decision. Give the strongest counterargument, failure scenarios, blind spots, evidence gaps and a clear verdict."]
];

export default function ChatWorkspace({gold,workspace="general"}:{gold:Gold;workspace?:Workspace}){
 const executiveTwin=workspace==="executive_twin";
 const basePath=executiveTwin?"/executive-twin":"/chat";
 const [convs,setConvs]=useState<Conv[]>([]),[convId,setConvId]=useState<string|undefined>(),[msgs,setMsgs]=useState<Msg[]>([]),[input,setInput]=useState(""),[busy,setBusy]=useState(false);
 const [status,setStatus]=useState<"checking"|"online"|"offline">("checking"),[hist,setHist]=useState(false),[err,setErr]=useState("");
 const [ctx,setCtx]=useState<{projects:Parameters<typeof buildQContext>[0]["projects"];tasks:Parameters<typeof buildQContext>[0]["tasks"]}>({projects:[],tasks:[]});
 const end=useRef<HTMLDivElement>(null),box=useRef<HTMLTextAreaElement>(null);
 const [ready,setReady]=useState(false);
 const loadConvs=useCallback(async()=>{try{const r=await fetch(`/api/chat?workspace=${workspace}`,{cache:"no-store"});if(!r.ok)throw 0;setStatus("online");setConvs((await r.json()).conversations??[]);}catch{setStatus("offline");}},[workspace]);
 const pending=useRef<string|null>(null);
 useEffect(()=>{loadConvs();
  try{const u=new URL(window.location.href),q=u.searchParams.get("q");if(q)pending.current=q.slice(0,2000);if(q||u.searchParams.has("new"))window.history.replaceState(null,"",basePath);}catch{}
  Promise.all([fetch("/api/projects",{cache:"no-store"}).then(r=>r.ok?r.json():{projects:[]}),fetch("/api/tasks",{cache:"no-store"}).then(r=>r.ok?r.json():{tasks:[]})]).then(([p,t])=>setCtx({projects:p.projects??[],tasks:t.tasks??[]})).catch(()=>{}).finally(()=>setReady(true));
 },[loadConvs,workspace,basePath]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"})},[msgs]);
 async function openConv(id:string){setHist(false);setErr("");try{const r=await fetch(`/api/chat/${id}?workspace=${workspace}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error);setConvId(id);setMsgs((j.messages??[]).map((m:{role:string;content:string})=>({role:m.role==="user"?"user":"assistant",content:m.content})));}catch(e){setErr(e instanceof Error&&e.message?e.message:"Could not open conversation");}}
 function newChat(){setConvId(undefined);setMsgs([]);setHist(false);box.current?.focus();}
 async function send(text:string){const m=text.trim();if(!m||busy)return;setInput("");setErr("");setBusy(true);setMsgs(x=>[...x,{role:"user",content:m},{role:"assistant",content:""}]);
  const alerts=ctx.projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${p.name} deploy failed`}));
  try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m,workspace,portfolioContext:buildQContext({projects:ctx.projects,tasks:ctx.tasks,alerts,gold}),...(convId?{conversationId:convId}:{})})});
   if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));throw new Error(j.error??`Q returned ${r.status}`);}
   setStatus("online");const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
   for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop()??"";
    for(const part of parts){let ev:{delta?:string;conversationId?:string;error?:string};try{ev=JSON.parse(part.replace(/^data: /,""));}catch{continue;}
     if(ev.error)throw new Error(ev.error);if(ev.conversationId)setConvId(ev.conversationId);if(ev.delta)setMsgs(x=>{const c=[...x];c[c.length-1]={role:"assistant",content:c[c.length-1].content+ev.delta};return c;});}}
   loadConvs();
  }catch(e){setStatus("offline");setMsgs(x=>{const c=[...x];c[c.length-1]={role:"assistant",content:`Q couldn’t answer: ${e instanceof Error?e.message:"Q is unavailable right now"}. Try again in a moment.`};return c;});}
  finally{setBusy(false);}}
 useEffect(()=>{if(ready&&pending.current){const q=pending.current;pending.current=null;void send(q);}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready]);
 /* The composer grows with the text, up to six lines. */
 useEffect(()=>{const b=box.current;if(!b)return;b.style.height="auto";b.style.height=Math.min(b.scrollHeight,168)+"px";},[input]);
 const current=convs.find(c=>c.id===convId);
 const statusLabel=status==="online"?"Online":status==="offline"?"Offline":"Connecting";

 return <div className="qa">
  <aside className={`qa-list${hist?" open":""}`} aria-label="Conversations">
   <div className="qa-list-h"><h2>Conversations</h2><button className="btn sm primary" onClick={newChat}><I n="plus"/>New</button></div>
   <div className="qa-convs">
    {convs.length?convs.map(c=><button key={c.id} className="qa-conv" aria-current={c.id===convId?"true":undefined} onClick={()=>openConv(c.id)}>
     <span>{c.title}</span>{c.updated_at&&<time>{new Date(c.updated_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</time>}</button>)
    :<p className="qa-none">{status==="offline"?"Conversations are unavailable right now.":"No chats yet. Ask Q anything."}</p>}
   </div>
  </aside>
  {hist&&<div className="qa-scrim" onClick={()=>setHist(false)} aria-hidden="true"/>}
  <section className="qa-main" aria-label="Conversation">
   <header className="qa-h">
    <button className="icon-btn qa-hist-btn" onClick={()=>setHist(h=>!h)} aria-label="Conversations" aria-expanded={hist}><I n="list"/></button>
    <div className="qa-t"><h1>{current?.title??(executiveTwin?"Executive Twin":"New conversation")}</h1><span className={`live${status==="online"?"":" off"}`}><i/>{statusLabel} · {executiveTwin?"private strategic workspace · advisory-only in Phase 1":"reads your live ventures, tasks, alerts and gold"}</span></div>
    <button className="btn sm qa-new-h" onClick={newChat} aria-label="New conversation"><I n="plus"/>New</button>
   </header>
   <div className="qa-thread" aria-live="polite">
    {!msgs.length&&<div className="qa-hello">
     <QMark size={56}/>
     <h2>{executiveTwin?"Your Executive Twin":"What do you need, Nassim?"}</h2>
     <p>{executiveTwin?"Your private strategic partner. Switches between executive lenses, challenges assumptions and prepares decisions. Phase 1 is advisory-only.":"Answers from your live data. Says when it can’t verify."}</p>
     <div className="qa-quick">{(executiveTwin?TWIN_QUICK:QUICK).map(([l,p])=><button key={l} className="chip" onClick={()=>send(p)} disabled={busy||status==="offline"}>{l}</button>)}</div>
    </div>}
    {msgs.map((m,i)=>m.role==="user"
     ?<div key={i} className="qa-msg me">{m.content}</div>
     :<div key={i} className="qa-msg q"><QMark size={28}/><div className="qa-body">{m.content?<QMd text={m.content}/>:<span className="qa-typing" aria-label="Q is writing"><i/><i/><i/></span>}</div></div>)}
    {err&&<p className="banner err" role="alert">{err}</p>}
    <div ref={end}/>
   </div>
   <form className="qa-compose" onSubmit={e=>{e.preventDefault();send(input);}}>
    <label className="sr" htmlFor="qa-input">Message Q</label>
    <textarea id="qa-input" ref={box} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={executiveTwin?"Discuss a decision, strategy, negotiation or operating issue…":"Ask Q about your ventures, priorities or markets…"} maxLength={6000} enterKeyHint="send"/>
    <button type="submit" className="btn primary qa-send" disabled={busy||!input.trim()} aria-label="Send"><I n="send"/></button>
    <small className="qa-note">Enter to send · Shift+Enter new line · Check key facts.</small>
   </form>
  </section>
 </div>;
}
