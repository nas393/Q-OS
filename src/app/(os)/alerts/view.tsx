import Link from "next/link";
import "@/components/os-page.css";
import {PageHeader,State} from "@/components/shell/page";
import AckButton from "./ack-button";

const LEVELS=[["","All"],["red","Urgent"],["amber","Watch"],["info","Info"]] as const;
const TONE={red:"crit",amber:"watch",info:"info"} as const;
const LABEL={red:"Urgent",amber:"Watch",info:"Info"} as const;
export type AlertItem={id:number;level:"red"|"amber"|"info";title:string;body:string;url:string|null;createdAt:string;ack:boolean};

/* Alerts page view: pure presentation, so it can be previewed with sample data. */
export function AlertsView({rows,level,q}:{rows:AlertItem[]|null;level?:string;q?:string}){
 const unacked=rows?.filter(a=>!a.ack).length??0;
 return <div className="page">
  <PageHeader title="Alerts" desc="Every alert Q has sent or logged: builds, uptime, gold and checks."
   meta={rows?<><span className="num">{rows.length} shown</span><span className="num">{unacked} unseen</span></>:null}
   actions={<>{unacked>0&&<AckButton id="all" label={`Mark all ${unacked} as seen`} primary/>}<Link className="btn sm" href="/brief">Morning brief</Link></>}/>
  <form className="al-filters" role="search" aria-label="Filter alerts">
   <div className="chips" role="group" aria-label="Level">{LEVELS.map(([v,l])=><Link key={l} className="chip" href={{pathname:"/alerts",query:{...(v?{level:v}:{}),...(q?{q}:{})}}} aria-current={(level??"")===v?"page":undefined}>{l}</Link>)}</div>
   <input className="input" type="search" name="q" defaultValue={q} placeholder="Search alerts" aria-label="Search alerts"/>{level&&<input type="hidden" name="level" value={level}/>}
  </form>
  {rows===null?<State kind="error" title="Alerts are unavailable right now">The database did not respond. Alerts are still sent by push; this list returns when it recovers.</State>
  :rows.length===0?<State title={q||level?"No alerts match":"No alerts yet"}>{q||level?<Link className="link" href="/alerts">Clear filters</Link>:"Q logs every build, uptime, gold and check alert here."}</State>
  :<section className="card al-list" aria-label="Alert history">{rows.map(a=><article key={a.id} className={`al-row${a.ack?" seen":""}`}>
    <span className={`tag ${TONE[a.level]}`}>{LABEL[a.level]}</span>
    <div className="al-tx"><h2>{a.title}</h2>{a.body&&<p>{a.body}</p>}{a.url&&<a className="link" href={a.url} target={a.url.startsWith("http")?"_blank":undefined} rel="noreferrer">Open</a>}</div>
    <div className="al-side"><time dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"})}</time>{a.ack?<span className="muted">Seen</span>:<AckButton id={a.id} label="Mark seen"/>}</div>
   </article>)}</section>}
 </div>;
}
