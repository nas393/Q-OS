import Link from "next/link";
import "@/components/os-page.css";
import {requireOwner} from "@/lib/auth";
import {alertHistory,buildDigest,lastCheck,systemHealth} from "@/lib/alerts";
import {listTasks} from "@/lib/tasks";
import {loadMetrics} from "@/lib/metrics";
import {getDb} from "@/lib/db";

export const dynamic="force-dynamic";
export const metadata={title:"Morning brief · NASSIM OS"};

/* Each block loads on its own: one failing source never blanks the brief. */
const safe=<T,>(p:Promise<T>,fb:T)=>p.catch(()=>fb);
const luandaDay=()=>new Date(Date.now()+3600e3).toISOString().slice(0,10);
const ago=(iso:string)=>{const m=Math.round((Date.now()-Date.parse(iso))/6e4);return m<60?`${Math.max(1,m)} min ago`:m<1440?`${Math.round(m/60)} h ago`:`${Math.round(m/1440)} d ago`;};

export default async function BriefPage(){
 await requireOwner();
 const today=luandaDay();
 const [tasks,alerts,digest,health,check,metrics,down]=await Promise.all([
  safe(listTasks(),[]),safe(alertHistory({limit:60}),[]),safe(buildDigest(),[]),safe(systemHealth(),null),safe(lastCheck(),null),
  safe(loadMetrics(),{metrics:{},error:null} as Awaited<ReturnType<typeof loadMetrics>>),
  safe(getDb().query("SELECT count(*)::int n FROM q_alert_state WHERE key LIKE 'up:%' AND status='down'").then(r=>r.rows[0].n as number),null)]);
 const open=tasks.filter(t=>!t.done),dueToday=open.filter(t=>t.due===today),overdue=open.filter(t=>t.due&&t.due<today),high=open.filter(t=>t.priority==="high"&&!dueToday.includes(t)&&!overdue.includes(t));
 const last24=alerts.filter(a=>Date.now()-Date.parse(a.createdAt)<864e5),urgent=last24.filter(a=>a.level==="red"&&!a.ack);
 const gold=metrics.metrics.xauusd;
 return <main className="op"><div className="op-w">
  <div className="op-top"><Link href="/dashboard">← Command Center</Link><Link href="/alerts">All alerts →</Link></div>
  <h1>☀️ Morning brief</h1><p className="op-muted">{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:"Africa/Luanda"})}</p>

  <section className="op-card op-grid" aria-label="Today at a glance">
   <div className="op-stat"><b>{down===null?"—":down}</b><small>{down?"site(s) down":"sites down"}</small></div>
   <div className="op-stat"><b>{dueToday.length}</b><small>tasks today</small></div>
   <div className="op-stat"><b>{overdue.length}</b><small>overdue</small></div>
   <div className="op-stat"><b>{urgent.length}</b><small>urgent alerts (24 h)</small></div>
   <div className="op-stat"><b>{gold?gold.value.price.toFixed(0):"—"}</b><small>{gold?`gold ${gold.value.changePct>=0?"+":""}${gold.value.changePct.toFixed(2)}%`:"gold: no feed"}</small></div>
  </section>

  <section className="op-card"><h2>Do first</h2>
   {[...overdue,...dueToday,...high].slice(0,8).map(t=><div className="op-row" key={t.id}><span>{t.priority==="high"&&<span className="op-pill red">High</span>} {t.title}{t.recur&&<small> · repeats {t.recur}</small>}</span><small>{t.due?(t.due<today?"Overdue":t.due===today?(t.dueTime??"Today"):t.due):""}</small></div>)}
   {!overdue.length&&!dueToday.length&&!high.length&&<p className="op-muted">Nothing due. Add priorities on the Command Center.</p>}
  </section>

  <section className="op-card"><h2>Alerts in the last 24 hours</h2>
   {last24.slice(0,10).map(a=><div className={`op-row${a.ack?" op-ack":""}`} key={a.id}><span><span className={`op-pill ${a.level}`}>{a.level==="red"?"Urgent":a.level==="amber"?"Watch":"Info"}</span> {a.title}</span><small>{ago(a.createdAt)}</small></div>)}
   {!last24.length&&<p className="op-muted">Quiet night. No alerts.</p>}
  </section>

  <section className="op-card"><h2>Preview builds failing</h2>
   {digest.map(d=><div className="op-row" key={d.id}><span>{d.line}</span>{d.url&&<a href={d.url} target="_blank" rel="noreferrer">Open</a>}</div>)}
   {!digest.length&&<p className="op-muted">All latest preview builds are fine.</p>}
  </section>

  <section className="op-card" aria-label="System health"><h2>System health (24 h)</h2>
   {health?<div className="op-grid">
    <div className="op-stat"><b>{health.runs}</b><small>check runs</small></div>
    <div className="op-stat"><b>{health.failed}</b><small>runs with errors</small></div>
    <div className="op-stat"><b>{(health.avgMs/1000).toFixed(1)} s</b><small>average run</small></div>
    <div className="op-stat"><b>{health.lastAt?ago(health.lastAt):"never"}</b><small>last check</small></div>
   </div>:<p className="op-muted">Health data unavailable.</p>}
   {check?.errors?.length?<p className="op-muted">Last errors: {check.errors.join(" · ")}</p>:null}
  </section>
 </div></main>;
}
