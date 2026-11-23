"use client";
/* The Office, drawn: Q's glass corner office and the rooms where every app works at its desk.
   Each desk shows its status light, one number, its tasks from you and what needs you; tap a desk to open it.
   The inbox lists everything waiting for you across the floor: approvals, late tasks and alerts. */
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {PageHeader} from "@/components/shell/page";
import {AppMark} from "@/components/shell/app-mark";
import {QMark} from "@/components/shell/q-mark";
import {jobsFor,type WorkBody} from "@/lib/office/jobs";
import {ROOMS,STAFF,assigneeOf,deskFor,inbox,opsDesk,ownerOf,standup,type Desk,type DeskAlert,type DeskApproval,type DeskTask,type Need,type Room,type Staff} from "@/lib/office/staff";
import "./office.css";
import { ExecutiveTeam } from "./executive-team";
import { ExecutiveWorld3D } from "./executive-world-live";

type LiveApp={id:string;name:string;url:string|null;state:string;pages:{label:string;url:string}[];icon?:string|null};
type Stats=Record<string,{stats:{label:string;value:string}[]}>;
type WorkRow={id:string;staff:string;job:string;title:string;body:WorkBody;status:"waiting"|"approved"|"discarded";createdAt:string};
const LIGHT_TEXT={ok:"All good",watch:"Watching",down:"Needs you",idle:"No data"} as const;
const KIND_TEXT={alert:"Alert",approval:"Your yes",draft:"Draft",task:"Late task"} as const;
const LAYOUT:Room[]=["corner","studio","academy","markets","community","screens","ops"];

export function OfficeFloor({alerts,stats,tasks:initialTasks,approvals,approvalsFailed,work:initialWork,today}:{alerts:DeskAlert[];stats:Stats;tasks:DeskTask[];approvals:DeskApproval[];approvalsFailed:string[];work:WorkRow[];today:string}){
  const [apps,setApps]=useState<LiveApp[]|null>(null);
  const [tasks,setTasks]=useState(initialTasks);
  const [seen,setSeen]=useState<number[]>([]);
  const [work,setWork]=useState(initialWork);
  const [working,setWorking]=useState<string|null>(null);
  const [open,setOpen]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const dlg=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    let stop=false;
    const load=()=>fetch("/api/apps",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!stop)setApps(Array.isArray(d.apps)?d.apps:[])}).catch(()=>{if(!stop)setApps([])});
    load();const t=setInterval(load,60_000);return ()=>{stop=true;clearInterval(t)};
  },[]);

  const floor=useMemo(()=>{
    const appFor=(s:Staff)=>apps?.find(a=>s.keys.includes(a.name)||s.keys.includes(a.id))??null;
    const mine:Record<string,DeskAlert[]>={};
    for(const a of alerts){if(a.id&&seen.includes(a.id))continue;const o=ownerOf(a);(mine[o]??=[]).push(a)}
    const theirs:Record<string,DeskTask[]>={};
    for(const t of tasks)(theirs[assigneeOf(t)]??=[]).push(t);
    const statsFor=(s:Staff)=>[s.id,...s.keys].map(k=>stats[k]?.stats).find(Boolean)??[];
    const rows=STAFF.filter(s=>s.id!=="ops").map(s=>{
      const app=appFor(s);
      const state=app?.state==="EXTERNAL"?"READY":app?.state??(apps?null:"READY");
      return {staff:s,app,desk:deskFor({state,alerts:mine[s.id]??[],stats:statsFor(s),tasks:theirs[s.id]??[],approvals:approvals.filter(a=>a.app===s.id),drafts:work.filter(w=>w.staff===s.id&&w.status==="waiting").map(w=>({id:w.id,title:w.body.summary||w.title})),today})};
    });
    const ops=STAFF.find(s=>s.id==="ops")!;
    const opsD=opsDesk(rows.filter(r=>r.staff.id!=="q").map(r=>r.desk),mine.ops??[]);
    const opsDrafts=work.filter(w=>w.staff==="ops"&&w.status==="waiting").map(w=>({kind:"draft" as const,level:"amber" as const,title:w.body.summary||w.title,workId:w.id}));
    rows.push({staff:ops,app:null,desk:{...opsD,needs:[...opsD.needs,...opsDrafts],light:opsD.light==="ok"&&opsDrafts.length?"watch":opsD.light}});
    return rows;
  },[apps,alerts,stats,tasks,approvals,seen,work,today]);

  const team=floor.filter(r=>r.staff.id!=="q");
  const q=floor.find(r=>r.staff.id==="q")!;
  const meeting=standup(floor.filter(r=>r.staff.id!=="ops"||r.desk.needs.length));
  const qDesk:Desk={...q.desk,light:meeting.allClear?q.desk.light:floor.some(r=>r.desk.light==="down")?"down":"watch",line:meeting.lines[0]};
  const tray=inbox(floor.filter(r=>r.staff.id!=="ops"||r.desk.needs.length));
  const sel=floor.find(r=>r.staff.id===open)??null;

  useEffect(()=>{const d=dlg.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open]);

  async function send(url:string,method:string,body:unknown){
    const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(typeof d.error==="string"?d.error:"That did not save. Try again.");
    return d;
  }
  async function done(taskId:string){
    setBusy(true);setMsg("");
    try{await send("/api/tasks","PATCH",{id:taskId,done:true});setTasks(ts=>ts.map(t=>t.id===taskId?{...t,done:true}:t));setMsg("Marked done.")}
    catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }
  async function markSeen(alertId:number){
    setBusy(true);setMsg("");
    try{await send("/api/alerts","POST",{action:"ack",id:alertId});setSeen(s=>[...s,alertId]);setMsg("Alert cleared.")}
    catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }
  async function ask(jobId:string,s:Staff){
    setWorking(jobId);setMsg("");
    try{const d=await send("/api/office/work","POST",{job:jobId});if(d.work)setWork(w=>[d.work as WorkRow,...w]);setMsg(`${s.name} finished a draft. Approve or discard it below.`)}
    catch(e){setMsg((e as Error).message)}finally{setWorking(null)}
  }
  async function decide(id:string,decision:"approved"|"discarded"){
    setBusy(true);setMsg("");
    try{const d=await send("/api/office/work","PATCH",{id,decision});setWork(w=>w.map(x=>x.id===id?{...x,status:(d.work as WorkRow).status}:x));setMsg(decision==="approved"?"Approved. Copy or open it from the draft.":"Discarded.")}
    catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }
  async function delegate(e:FormEvent<HTMLFormElement>,s:Staff){
    e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get("title")??"").trim(),due=String(f.get("due")??"");
    if(!title)return;
    setBusy(true);setMsg("");
    try{const d=await send("/api/tasks","POST",{title,...(s.id==="q"?{}:{project:s.name}),...(due?{due}:{})});
      const t=d.task as DeskTask;setTasks(ts=>[...ts,{id:t.id,title:t.title,project:t.project,due:t.due,done:false}]);(e.target as HTMLFormElement).reset();
      setMsg(s.id==="q"?"Task added. Q will follow it up.":`Given to ${s.name}. Q will follow it up.`)}
    catch(err){setMsg((err as Error).message)}finally{setBusy(false)}
  }

  const needAction=(n:Need)=>n.kind==="approval"&&n.url?<a className="btn ghost sm" href={n.url} target="_blank" rel="noreferrer">Review</a>
    :n.kind==="task"&&n.taskId?<button type="button" className="btn ghost sm" disabled={busy} onClick={()=>done(n.taskId!)}>Done</button>
    :n.kind==="draft"?<button type="button" className="btn ghost sm" onClick={()=>{const w=work.find(x=>x.id===n.workId);if(w){setMsg("");setOpen(w.staff)}}}>View</button>
    :n.kind==="alert"&&n.alertId?<button type="button" className="btn ghost sm" disabled={busy} onClick={()=>markSeen(n.alertId!)}>Clear</button>
    :n.url?<a className="btn ghost sm" href={n.url} target="_blank" rel="noreferrer">Open</a>:null;

  const deskBtn=(r:typeof floor[number],big=false)=>{
    const d=r.staff.id==="q"?qDesk:r.desk;
    return <button key={r.staff.id} type="button" className={`of-desk${big?" big":""}`} data-light={d.light} onClick={()=>{setMsg("");setOpen(r.staff.id)}}
      aria-label={`${r.staff.name}, ${r.staff.role}. ${LIGHT_TEXT[d.light]}. ${d.line}${d.open.length?` ${d.open.length} open tasks.`:""}`}>
      <span className="of-top" aria-hidden="true">
        <span className="of-screen">{r.staff.id==="q"?<QMark size={big?40:30}/>:r.staff.id==="ops"?<span className="of-rack"/>:<AppMark name={r.staff.name} keys={[r.staff.id,...r.staff.keys]} icon={r.app?.icon} size={big?40:30}/>}</span>
        {d.needs.length>0&&<b className="of-badge">{d.needs.length}</b>}
        {d.open.length>0&&<i className="of-tray">{d.open.length}</i>}
      </span>
      <span className="of-chair" aria-hidden="true"/>
      <span className="of-plate"><b>{r.staff.name}</b><small>{r.staff.role}</small>{d.headline&&<em>{d.headline}</em>}</span>
    </button>;
  };

  return <div className="page office">
    <PageHeader title="Office" desc="Q runs the office. Every app works at its desk. Tap a desk to open it or give it a task."
      meta={apps===null?"Checking every desk…":`${team.filter(r=>r.desk.light==="ok").length} of ${team.length} desks all good`}/>

    <ExecutiveTeam />

    <section className={`of-standup${meeting.allClear?" clear":""}`} aria-labelledby="of-st">
      <div className="of-st-q"><QMark size={34}/></div>
      <div>
        <h2 id="of-st">Morning stand-up</h2>
        <ol>{meeting.lines.map(l=><li key={l}>{l}</li>)}</ol>
        <details><summary>Hear every desk</summary>
          <ul>{team.map(r=><li key={r.staff.id} data-light={r.desk.light}><b>{r.staff.name}</b> · {r.staff.role}: {r.desk.line}</li>)}</ul>
        </details>
      </div>
    </section>

    <section className="of-inbox" aria-labelledby="of-in">
      <h2 id="of-in">Your inbox <span className="of-count">{tray.length}</span></h2>
      {msg&&<p className="of-msg" role="status">{msg}</p>}
      {tray.length===0?<p className="of-empty">Nothing waits for you. Approvals, late tasks and alerts land here.</p>
        :<ul>{tray.slice(0,12).map(({staff,need},i)=><li key={`${staff.id}-${need.kind}-${need.taskId??need.alertId??i}`} data-light={need.level==="red"?"down":"watch"}>
          <span className="of-kind">{KIND_TEXT[need.kind]}</span>
          <span className="of-what"><b>{staff.name}</b> · {need.title}</span>
          {needAction(need)}
        </li>)}</ul>}
      {approvalsFailed.length>0&&<p className="of-note">Could not reach the review queue of: {approvalsFailed.map(id=>STAFF.find(s=>s.id===id)?.name??id).join(", ")}.</p>}
    </section>

    <section className="of-world" aria-labelledby="of-world-title">
      <div className="of-world-head">
        <div><span className="of-world-kicker">Q EXECUTIVE HEADQUARTERS · LIVE FLOOR</span><h2 id="of-world-title">Executive World</h2>
          <p>A playable simulation of a fictional company. Explore its people, departments, meetings and simulated decisions — separate from live Q OS operations.</p></div>
        <div className="of-world-controls" aria-label="World view status">
          <span className="of-world-live"><i/>SIMULATION</span>
        </div>
      </div>
      <div className="of-world-legend"><span><i data-state="ok"/>Operational</span><span><i data-state="watch"/>Attention</span><span><i data-state="down"/>Needs owner</span><span><i data-state="idle"/>No live data</span></div>
      <ExecutiveWorld3D rooms={LAYOUT.map(room=>({id:room,label:ROOMS[room].label,note:ROOMS[room].note,desks:floor.filter(r=>r.staff.room===room).map(r=>({id:r.staff.id,name:r.staff.name,role:r.staff.role,light:r.desk.light,needs:r.desk.needs.length,open:r.desk.open.length}))}))} onSelectDesk={id=>{setMsg("");setOpen(id)}} />
      <p className="of-world-foot">The Executive World is a fictional simulation. Live Q OS desks, tasks and business records remain separate and are never changed by simulated activity.</p>
    </section>

    <dialog ref={dlg} className="of-sheet" onClose={()=>setOpen(null)} aria-labelledby="of-sh-t">
      {sel&&(()=>{const d=sel.staff.id==="q"?qDesk:sel.desk;const st=[sel.staff.id,...sel.staff.keys].map(k=>stats[k]?.stats).find(Boolean);return <div className="of-sh">
        <header>
          <span className="of-sh-mark">{sel.staff.id==="q"?<QMark size={44}/>:sel.staff.id==="ops"?<span className="of-rack"/>:<AppMark name={sel.staff.name} keys={[sel.staff.id,...sel.staff.keys]} icon={sel.app?.icon} size={44}/>}</span>
          <div><h2 id="of-sh-t">{sel.staff.name}</h2><p>{sel.staff.role}{ROOMS[sel.staff.room].label!==sel.staff.role?` · ${ROOMS[sel.staff.room].label}`:""}</p></div>
          <button type="button" className="btn ghost" onClick={()=>setOpen(null)} aria-label="Close desk">Close</button>
        </header>
        <p className="of-pill" data-light={d.light}>{LIGHT_TEXT[d.light]}</p>
        <p className="of-job">{sel.staff.job}</p>
        <h3>Today</h3>
        {sel.staff.id==="q"?<ol className="of-list">{meeting.lines.map(l=><li key={l}>{l}</li>)}</ol>:<p>{d.line}</p>}
        {st?.length?<ul className="of-stats">{st.map(s=><li key={s.label}><b>{s.value}</b><span>{s.label}</span></li>)}</ul>:null}
        {d.needs.length>0&&<><h3>Needs you</h3><ul className="of-needs">{d.needs.map((n,i)=><li key={i} data-light={n.level==="red"?"down":"watch"}><span>{KIND_TEXT[n.kind]}: {n.title}</span>{needAction(n)}</li>)}</ul></>}
        {jobsFor(sel.staff.id).length>0&&<>
          <h3>Jobs</h3>
          <div className="of-jobs">{jobsFor(sel.staff.id).map(j=><button key={j.id} type="button" className="btn ghost" disabled={!!working} onClick={()=>ask(j.id,sel.staff)} title={j.what}>{working===j.id?`${sel.staff.name} is working…`:j.label}</button>)}</div>
          {working&&<p className="of-empty" role="status">Drafting can take up to a minute.</p>}
        </>}
        {work.some(w=>w.staff===sel.staff.id)&&<>
          <h3>Drafts</h3>
          <ul className="of-drafts">{work.filter(w=>w.staff===sel.staff.id).slice(0,6).map(w=><li key={w.id} data-status={w.status}>
            <details open={w.status==="waiting"}>
              <summary><b>{w.body.summary||w.title}</b><small>{w.status==="waiting"?"Waiting for your yes":w.status==="approved"?"Approved":"Discarded"} · {w.createdAt.slice(0,10)}</small></summary>
              <ol>{w.body.items.map((it,i)=><li key={i}><b>{it.title}</b><p>{it.text}</p>
                <div className="of-acts"><button type="button" className="btn ghost sm" onClick={()=>{navigator.clipboard?.writeText(`${it.title}\n\n${it.text}`).then(()=>setMsg("Copied."),()=>setMsg("Copy failed."))}}>Copy</button>
                {it.link&&<a className="btn ghost sm" href={it.link} target="_blank" rel="noreferrer">Open in Studio</a>}</div></li>)}</ol>
              {w.status==="waiting"&&<div className="of-acts"><button type="button" className="btn sm" disabled={busy} onClick={()=>decide(w.id,"approved")}>Approve</button><button type="button" className="btn ghost sm" disabled={busy} onClick={()=>decide(w.id,"discarded")}>Discard</button></div>}
            </details>
          </li>)}</ul>
        </>}
        {sel.staff.id!=="ops"&&<>
          <h3>Tasks from you</h3>
          {d.open.length?<ul className="of-needs">{d.open.map(t=><li key={t.id} data-light={t.due&&t.due<today?"watch":"ok"}><span>{t.title}{t.due?` · due ${t.due}`:""}</span><button type="button" className="btn ghost sm" disabled={busy} onClick={()=>done(t.id)}>Done</button></li>)}</ul>
            :<p className="of-empty">No open tasks at this desk.</p>}
          <form className="of-give" onSubmit={e=>delegate(e,sel.staff)}>
            <label htmlFor="of-give-t">{sel.staff.id==="q"?"Add a task for Q to follow up":`Give ${sel.staff.name} a task`}</label>
            <input id="of-give-t" name="title" maxLength={160} required placeholder={sel.staff.id==="q"?"e.g. Call the bank on Monday":`e.g. ${sel.staff.id==="dalil"?"Review the new job posts":"Check this week's numbers"}`}/>
            <div><label htmlFor="of-give-d" className="sr">Due date (optional)</label><input id="of-give-d" name="due" type="date" min={today}/><button className="btn" disabled={busy}>{busy?"Saving…":"Give task"}</button></div>
          </form>
        </>}
        {msg&&<p className="of-msg" role="status">{msg}</p>}
        <div className="of-actions">
          <Link className="btn" href={`/chat?q=${encodeURIComponent(sel.staff.id==="q"?"Run my morning stand-up: what needs me today, across every app?":`Brief me on ${sel.staff.name}, my ${sel.staff.role}: status, numbers, open tasks and what needs me.`)}`}>Ask Q about {sel.staff.id==="q"?"today":sel.staff.name}</Link>
          {sel.app?.url&&sel.staff.id!=="q"&&<a className="btn ghost" href={sel.app.url} target="_blank" rel="noreferrer">Open {sel.staff.name}</a>}
          {sel.staff.id==="ops"&&<Link className="btn ghost" href="/alerts">All alerts</Link>}
          {sel.staff.id!=="q"&&sel.app?.pages?.map(p=><a key={p.url} className="btn ghost" href={p.url} target="_blank" rel="noreferrer">{p.label}</a>)}
        </div>
      </div>})()}
    </dialog>
  </div>;
}
