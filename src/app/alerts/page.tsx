import Link from "next/link";
import "@/components/os-page.css";
import {requireOwner} from "@/lib/auth";
import {alertHistory} from "@/lib/alerts";
import AckButton from "./ack-button";

export const dynamic="force-dynamic";
export const metadata={title:"Alerts · NASSIM OS"};
const LEVELS=[["","All"],["red","Urgent"],["amber","Watch"],["info","Info"]] as const;

export default async function AlertsPage({searchParams}:{searchParams:Promise<{level?:string;q?:string}>}){
 await requireOwner();
 const sp=await searchParams,level=["red","amber","info"].includes(sp.level??"")?sp.level:undefined,q=(sp.q??"").trim().slice(0,60)||undefined;
 const rows=await alertHistory({level,q,limit:200}).catch(()=>null);
 const unacked=rows?.filter(a=>!a.ack).length??0;
 return <main className="op"><div className="op-w">
  <div className="op-top"><Link href="/dashboard">← Q OS</Link><Link href="/brief">Morning brief →</Link></div>
  <h1>Alerts</h1><p className="op-muted">Every alert Q has sent or logged: builds, uptime, gold and checks.</p>
  <form className="op-filters" role="search">
   {LEVELS.map(([v,l])=><Link key={l} href={{pathname:"/alerts",query:{...(v?{level:v}:{}),...(q?{q}:{})}}} aria-current={(level??"")===v?"page":undefined}>{l}</Link>)}
   <input type="search" name="q" defaultValue={q} placeholder="Search alerts" aria-label="Search alerts"/>{level&&<input type="hidden" name="level" value={level}/>}
   {unacked>0&&<AckButton id="all" label={`Mark all ${unacked} as seen`}/>}
  </form>
  <section className="op-card">
   {rows===null&&<p className="op-muted">Alerts are unavailable right now (database not reachable).</p>}
   {rows?.length===0&&<p className="op-muted">No alerts match.</p>}
   {rows?.map(a=><div key={a.id} className={`op-row${a.ack?" op-ack":""}`}>
    <span><span className={`op-pill ${a.level}`}>{a.level==="red"?"Urgent":a.level==="amber"?"Watch":"Info"}</span> <b>{a.title}</b><br/><small style={{whiteSpace:"pre-line"}}>{a.body}</small>{a.url&&<><br/><a href={a.url} target={a.url.startsWith("http")?"_blank":undefined} rel="noreferrer">Open</a></>}</span>
    <span style={{textAlign:"right",minWidth:96}}><small>{new Date(a.createdAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"})}</small><br/>{!a.ack&&<AckButton id={a.id} label="Seen"/>}</span>
   </div>)}
  </section>
 </div></main>;
}
