import {BriefView} from "./view";
import {requireOwner} from "@/lib/auth";
import {alertHistory,buildDigest,lastCheck,systemHealth} from "@/lib/alerts";
import {listTasks} from "@/lib/tasks";
import {loadMetrics} from "@/lib/metrics";
import {getDb} from "@/lib/db";

export const dynamic="force-dynamic";
export const metadata={title:"Morning brief"};

/* Each block loads on its own: one failing source never blanks the brief. */
const safe=<T,>(p:Promise<T>,fb:T)=>p.catch(()=>fb);
const luandaDay=()=>new Date(Date.now()+3600e3).toISOString().slice(0,10);

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
 return <BriefView today={today} open={open} dueToday={dueToday} overdue={overdue} high={high} last24={last24} urgent={urgent} digest={digest} health={health} check={check} gold={gold??null} down={down}/>;
}
