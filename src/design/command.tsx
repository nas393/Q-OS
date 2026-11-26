"use client";
/* Command: the home screen. Needs you now, the apps and their status, and what is due today. Live app status is read from
   /api/apps every minute; everything else comes from the page that renders this. */
import {useEffect,useState} from "react";

export type CommandAlert={id:number;level:"red"|"amber"|"info";title:string;body?:string;url?:string|null};
export type CommandTask={id:string;title:string;project:string|null;due:string|null;done:boolean};
type App={id:string;name:string;url:string|null;state:string};

const LIVE:Record<string,{label:string;tone:"ok"|"info"|"crit"|"watch"|undefined}>={
  READY:{label:"Live",tone:"ok"},EXTERNAL:{label:"Live",tone:"ok"},
  BUILDING:{label:"Deploying",tone:"info"},QUEUED:{label:"Deploying",tone:"info"},INITIALIZING:{label:"Deploying",tone:"info"},
  ERROR:{label:"Failed",tone:"crit"},CANCELED:{label:"Failed",tone:"crit"}
};
const status=(state:string)=>LIVE[state]??{label:"Checking",tone:undefined};

export function Command({alerts,tasks,today}:{alerts:CommandAlert[];tasks:CommandTask[];today:string}){
  const [apps,setApps]=useState<App[]|null>(null);
  const [appsDown,setAppsDown]=useState(false);
  useEffect(()=>{
    let stop=false;
    const load=()=>fetch("/api/apps",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{if(!stop){setApps(Array.isArray(d.apps)?d.apps:[]);setAppsDown(false);}})
      .catch(()=>{if(!stop){setAppsDown(true);setApps([]);}});
    load();
    const t=setInterval(load,60_000);
    return()=>{stop=true;clearInterval(t);};
  },[]);

  const dueToday=tasks.filter(t=>!t.done&&t.due!==null&&t.due<=today);
  const tone=(l:CommandAlert["level"])=>l==="red"?"crit":l==="amber"?"watch":"info";
  const word=(l:CommandAlert["level"])=>l==="red"?"Urgent":l==="amber"?"Watch":"Info";

  return <>
    <header>
      <h1 className="h1">Command</h1>
      <p className="lede">Every app you run, what needs you, and what is due today.</p>
    </header>

    <section className="section" aria-labelledby="needs">
      <h2 id="needs" className="h2">Needs you</h2>
      {alerts.length?<ul className="list">{alerts.slice(0,8).map(a=><li key={a.id} className="row">
        <span><b>{a.title}</b>{a.body&&<small>{a.body}</small>}</span>
        <span className="pill" data-tone={tone(a.level)}>{word(a.level)}</span>
      </li>)}</ul>
        :<div className="empty"><b>Nothing needs you right now.</b>Alerts from your apps appear here.</div>}
    </section>

    <section className="section" aria-labelledby="apps">
      <h2 id="apps" className="h2">Apps</h2>
      {apps===null?<p className="muted">Checking every app…</p>
        :appsDown?<div className="empty"><b>App status is not available right now.</b>Try again in a minute.</div>
        :apps.length===0?<div className="empty"><b>No apps yet.</b>Apps appear here once they are connected.</div>
        :<div className="grid">{apps.map(a=>{const s=status(a.state);return <article key={a.id} className="card">
          <b>{a.name}</b>
          <div style={{margin:"8px 0 12px"}}><span className="pill" data-tone={s.tone}>{s.label}</span></div>
          {a.url&&<a className="btn" href={a.url} target="_blank" rel="noreferrer">Open {a.name}</a>}
        </article>;})}</div>}
    </section>

    <section className="section" aria-labelledby="due">
      <h2 id="due" className="h2">Due today</h2>
      {dueToday.length?<ul className="list">{dueToday.map(t=><li key={t.id} className="row">
        <span><b>{t.title}</b>{t.project&&<small>{t.project}</small>}</span>
        <span className="pill" data-tone={t.due!==null&&t.due<today?"watch":undefined}>{t.due!==null&&t.due<today?"Late":"Today"}</span>
      </li>)}</ul>
        :<div className="empty"><b>Nothing due today.</b>Tasks you add appear here.</div>}
    </section>
  </>;
}
