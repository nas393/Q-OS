import Link from "next/link";
import "@/components/os-page.css";
import {PageHeader,State} from "@/components/shell/page";

const ago=(iso:string)=>{const m=Math.round((Date.now()-Date.parse(iso))/6e4);return m<60?`${Math.max(1,m)} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`;};
type Task={id:string;title:string;due:string|null;dueTime?:string|null;priority?:string|null;recur?:string|null};
type Alert={id:number;level:"red"|"amber"|"info";title:string;createdAt:string;ack:boolean};
export type BriefData={today:string;open:Task[];dueToday:Task[];overdue:Task[];high:Task[];last24:Alert[];urgent:Alert[];
 digest:{id:string;line:string;url?:string|null}[];health:{runs:number;failed:number;avgMs:number;lastAt:string|null}|null;
 check:{errors?:string[]}|null;gold:{value:{price:number;changePct:number}}|null;down:number|null};

/* Morning brief view: pure presentation, so it can be previewed with sample data. */
export function BriefView({today,open,dueToday,overdue,high,last24,urgent,digest,health,check,gold,down}:BriefData){
 const doFirst=[...overdue,...dueToday,...high].slice(0,8);
 const lvl={red:["crit","Urgent"],amber:["watch","Watch"],info:["info","Info"]} as const;
 return <div className="page">
  <PageHeader title="Morning brief" desc={new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"Africa/Luanda"})+" · Luanda"}
   actions={<><Link className="btn sm" href="/alerts">All alerts</Link><Link className="btn sm primary" href="/dashboard">Open Command centre</Link></>}/>

  <section className="kpis br-kpis" aria-label="Today at a glance">
   <div className="kpi"><small>Sites down</small><b className={down?"down":""}>{down===null?"—":down}</b><span>{down===null?"uptime data unavailable":down?"needs attention":"all sites up"}</span></div>
   <div className="kpi"><small>Due today</small><b>{dueToday.length}</b><span>{open.length} open in total</span></div>
   <div className="kpi"><small>Overdue</small><b className={overdue.length?"down":""}>{overdue.length}</b><span>{overdue.length?"reschedule or finish":"nothing late"}</span></div>
   <div className="kpi"><small>Urgent alerts · 24 h</small><b className={urgent.length?"down":""}>{urgent.length}</b><span>{last24.length} alerts in 24 h</span></div>
   <div className="kpi"><small>Gold · XAU/USD</small><b>{gold?gold.value.price.toLocaleString("en-US",{maximumFractionDigits:0}):"—"}</b><span className={gold?(gold.value.changePct>=0?"up":"down"):""}>{gold?`${gold.value.changePct>=0?"+":""}${gold.value.changePct.toFixed(2)}% today`:"no feed"}</span></div>
  </section>

  <div className="grid-2 br-grid">
   <section className="card cpad" aria-labelledby="br-do"><div className="card-h"><h2 id="br-do">Do first</h2><span className="meta num">{doFirst.length}</span></div>
    {doFirst.length?<div className="rows">{doFirst.map(t=><div key={t.id}><span className="br-t">{t.priority==="high"&&<span className="tag crit">High</span>}{t.title}{t.recur&&<small className="muted"> · repeats {t.recur}</small>}</span>
     <small className={t.due&&t.due<today?"down":"muted"}>{t.due?(t.due<today?"Overdue":t.due===today?(t.dueTime??"Today"):t.due):""}</small></div>)}</div>
    :<State title="Nothing due">Add priorities from the <Link className="link" href="/dashboard">Command centre</Link>.</State>}
   </section>

   <section className="card cpad" aria-labelledby="br-al"><div className="card-h"><h2 id="br-al">Alerts · last 24 hours</h2><Link className="meta link" href="/alerts">History</Link></div>
    {last24.length?<div className="rows">{last24.slice(0,10).map(a=><div key={a.id} className={a.ack?"br-seen":""}><span className="br-t"><span className={`tag ${lvl[a.level][0]}`}>{lvl[a.level][1]}</span>{a.title}</span><small className="muted num">{ago(a.createdAt)}</small></div>)}</div>
    :<State title="Quiet night">No alerts in the last 24 hours.</State>}
   </section>

   <section className="card cpad" aria-labelledby="br-pv"><div className="card-h"><h2 id="br-pv">Preview builds failing</h2><span className="meta num">{digest.length}</span></div>
    {digest.length?<div className="rows">{digest.map(d=><div key={d.id}><span>{d.line}</span>{d.url&&<a className="link" href={d.url} target="_blank" rel="noreferrer">Open</a>}</div>)}</div>
    :<State title="All preview builds pass">All preview builds are fine.</State>}
   </section>

   <section className="card cpad" aria-labelledby="br-hl"><div className="card-h"><h2 id="br-hl">System health · 24 h</h2></div>
    {health?<div className="kpis br-mini">
     <div className="kpi"><small>Check runs</small><b>{health.runs}</b></div>
     <div className="kpi"><small>Runs with errors</small><b className={health.failed?"down":""}>{health.failed}</b></div>
     <div className="kpi"><small>Average run</small><b>{(health.avgMs/1000).toFixed(1)} s</b></div>
     <div className="kpi"><small>Last check</small><b className="br-sm">{health.lastAt?ago(health.lastAt):"never"}</b></div>
    </div>:<State kind="error" title="Health data unavailable">The check log did not respond.</State>}
    {check?.errors?.length?<p className="banner wn" style={{marginTop:12}}>Last errors: {check.errors.join(" · ")}</p>:null}
   </section>
  </div>
 </div>;
}
