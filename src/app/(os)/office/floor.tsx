"use client";
/* The Office, drawn: Q's glass corner office and the rooms where every app works at its desk.
   Each desk shows its status light, one number and what needs you; tap a desk to open it. */
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {PageHeader} from "@/components/shell/page";
import {AppMark} from "@/components/shell/app-mark";
import {QMark} from "@/components/shell/q-mark";
import {ROOMS,STAFF,deskFor,opsDesk,ownerOf,standup,type Desk,type DeskAlert,type Room,type Staff} from "@/lib/office/staff";
import "./office.css";

type LiveApp={id:string;name:string;url:string|null;state:string;pages:{label:string;url:string}[];icon?:string|null};
type Stats=Record<string,{stats:{label:string;value:string}[]}>;
const LIGHT_TEXT={ok:"All good",watch:"Watching",down:"Needs you",idle:"No data"} as const;
const LAYOUT:Room[]=["corner","studio","academy","markets","community","screens","ops"];

export function OfficeFloor({alerts,stats}:{alerts:DeskAlert[];stats:Stats}){
  const [apps,setApps]=useState<LiveApp[]|null>(null);
  const [open,setOpen]=useState<string|null>(null);
  const dlg=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    let stop=false;
    const load=()=>fetch("/api/apps",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!stop)setApps(Array.isArray(d.apps)?d.apps:[])}).catch(()=>{if(!stop)setApps([])});
    load();const t=setInterval(load,60_000);return ()=>{stop=true;clearInterval(t)};
  },[]);

  const floor=useMemo(()=>{
    const appFor=(s:Staff)=>apps?.find(a=>s.keys.includes(a.name)||s.keys.includes(a.id))??null;
    const mine:Record<string,DeskAlert[]>={};
    for(const a of alerts){const o=ownerOf(a);(mine[o]??=[]).push(a)}
    const statsFor=(s:Staff)=>[s.id,...s.keys].map(k=>stats[k]?.stats).find(Boolean)??[];
    const rows=STAFF.filter(s=>s.id!=="ops").map(s=>{
      const app=appFor(s);
      const external=app?.state==="EXTERNAL";
      return {staff:s,app,desk:deskFor({state:external?"READY":app?.state??(apps?null:"READY"),alerts:mine[s.id]??[],stats:statsFor(s)})};
    });
    const ops=STAFF.find(s=>s.id==="ops")!;
    rows.push({staff:ops,app:null,desk:opsDesk(rows.filter(r=>r.staff.id!=="q").map(r=>r.desk),mine.ops??[])});
    return rows;
  },[apps,alerts,stats]);

  const team=floor.filter(r=>r.staff.id!=="q");
  const meeting=standup(team);
  const q=floor.find(r=>r.staff.id==="q")!;
  const qDesk:Desk={...q.desk,light:meeting.allClear?q.desk.light:team.some(r=>r.desk.light==="down")?"down":"watch",line:meeting.lines[0]};
  const sel=floor.find(r=>r.staff.id===open)??null;

  useEffect(()=>{const d=dlg.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close()},[open]);

  const deskBtn=(r:typeof floor[number],big=false)=>{
    const d=r.staff.id==="q"?qDesk:r.desk;
    return <button key={r.staff.id} type="button" className={`of-desk${big?" big":""}`} data-light={d.light} onClick={()=>setOpen(r.staff.id)}
      aria-label={`${r.staff.name}, ${r.staff.role}. ${LIGHT_TEXT[d.light]}. ${d.line}`}>
      <span className="of-top" aria-hidden="true">
        <span className="of-screen">{r.staff.id==="q"?<QMark size={big?40:30}/>:r.staff.id==="ops"?<span className="of-rack"/>:<AppMark name={r.staff.name} keys={[r.staff.id,...r.staff.keys]} icon={r.app?.icon} size={big?40:30}/>}</span>
        {d.needs.length>0&&<b className="of-badge">{d.needs.length}</b>}
      </span>
      <span className="of-chair" aria-hidden="true"/>
      <span className="of-plate"><b>{r.staff.name}</b><small>{r.staff.role}</small>{d.headline&&<em>{d.headline}</em>}</span>
    </button>;
  };

  return <div className="page office">
    <PageHeader title="Office" desc="Q runs the office. Every app works at its desk. Tap a desk to open it."
      meta={apps===null?"Checking every desk…":`${team.filter(r=>r.desk.light==="ok").length} of ${team.length} desks all good`}/>

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

    <div className="of-floor" role="group" aria-label="Office floor plan">
      {LAYOUT.map(room=>{
        const here=floor.filter(r=>r.staff.room===room);
        return <section key={room} className={`of-room of-${room}`} aria-label={ROOMS[room].label}>
          <header className="of-sign"><b>{ROOMS[room].label}</b><small>{ROOMS[room].note}</small></header>
          <div className="of-desks">{here.map(r=>deskBtn(r,room==="corner"))}</div>
          <span className="of-plant" aria-hidden="true"/>
        </section>;
      })}
    </div>

    <dialog ref={dlg} className="of-sheet" onClose={()=>setOpen(null)} aria-labelledby="of-sh-t">
      {sel&&(()=>{const d=sel.staff.id==="q"?qDesk:sel.desk;return <div className="of-sh">
        <header>
          <span className="of-sh-mark">{sel.staff.id==="q"?<QMark size={44}/>:sel.staff.id==="ops"?<span className="of-rack"/>:<AppMark name={sel.staff.name} keys={[sel.staff.id,...sel.staff.keys]} icon={sel.app?.icon} size={44}/>}</span>
          <div><h2 id="of-sh-t">{sel.staff.name}</h2><p>{sel.staff.role}{ROOMS[sel.staff.room].label!==sel.staff.role?` · ${ROOMS[sel.staff.room].label}`:""}</p></div>
          <button type="button" className="btn ghost" onClick={()=>setOpen(null)} aria-label="Close desk">Close</button>
        </header>
        <p className="of-pill" data-light={d.light}>{LIGHT_TEXT[d.light]}</p>
        <p className="of-job">{sel.staff.job}</p>
        <h3>Today</h3>
        {sel.staff.id==="q"?<ol className="of-list">{meeting.lines.map(l=><li key={l}>{l}</li>)}</ol>:<p>{d.line}</p>}
        {(()=>{const st=[sel.staff.id,...sel.staff.keys].map(k=>stats[k]?.stats).find(Boolean);return st?.length?<ul className="of-stats">{st.map(s=><li key={s.label}><b>{s.value}</b><span>{s.label}</span></li>)}</ul>:null})()}
        {d.needs.length>0&&<><h3>Needs you</h3><ul className="of-list">{d.needs.map((a,i)=><li key={i} data-light={a.level==="red"?"down":"watch"}>{a.url?<a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>:a.title}</li>)}</ul></>}
        <div className="of-actions">
          <Link className="btn" href={`/chat?q=${encodeURIComponent(sel.staff.id==="q"?"Run my morning stand-up: what needs me today, across every app?":`Brief me on ${sel.staff.name}, my ${sel.staff.role}: status, numbers and what needs me.`)}`}>Ask Q about {sel.staff.id==="q"?"today":sel.staff.name}</Link>
          {sel.app?.url&&sel.staff.id!=="q"&&<a className="btn ghost" href={sel.app.url} target="_blank" rel="noreferrer">Open {sel.staff.name}</a>}
          {sel.staff.id==="ops"&&<Link className="btn ghost" href="/alerts">All alerts</Link>}
          {sel.staff.id!=="q"&&sel.app?.pages?.map(p=><a key={p.url} className="btn ghost" href={p.url} target="_blank" rel="noreferrer">{p.label}</a>)}
        </div>
      </div>})()}
    </dialog>
  </div>;
}
