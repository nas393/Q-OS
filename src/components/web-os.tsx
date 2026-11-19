"use client";
import Link from "next/link";
import {AlertsPanel} from "@/components/alerts-panel";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./web-os.css";
import type { MetricsMap } from "@/lib/metrics";
import { buildQContext } from "@/lib/q-context";
import QMd from "@/components/q-md";

type Project={id:string;name:string;url?:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceMatches?:boolean|null}|null;deploymentDataStatus?:string;githubDataStatus?:string};
type Telemetry={updatedAt:string;projects:Project[]};
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[]};
type Alert={title:string;level:"red"|"amber"};
type Task={id:string;title:string;project:string|null;due:string|null;dueTime:string|null;done:boolean;priority?:"high"|"normal"|"low";recur?:string|null};
type QAction={kind:"task"|"checks"|"open"|"iq";arg:string;due?:string};
/* Q can propose actions with tags like [[task: Title | 2026-11-20]], [[checks]], [[open: CERTIGO]], [[iq]]. They show as buttons; nothing runs until tapped. */
const ACT=/\[\[(task|checks|open|iq)(?::([^\]]*))?\]\]/g;
const parseActions=(t:string):QAction[]=>[...t.matchAll(ACT)].map(m=>{const [a,d]=(m[2]??"").split("|").map(x=>x.trim());return {kind:m[1] as QAction["kind"],arg:a??"",due:/^\d{4}-\d{2}-\d{2}$/.test(d??"")?d:undefined};});
const stripActions=(t:string)=>t.replace(ACT,"").trim();
type Msg={role:"user"|"q";text:string};
type NewsItem={id:string|number;title:string;url:string;publisher:string|null;geography:"Angola"|"Lebanon"|"Global";category?:string|null;impact?:string|null;published_at:string|null;retrieved_at:string};
type NewsStream="Angola"|"Lebanon"|"Global";

const LOGOS:Record<string,string>={"NASSIM AI HQ / Q":"/os/logo-q.webp","CERTIGO":"/os/logo-certigo.webp","DALIL AL-BAZOURIEH":"/os/logo-dalil.webp","LUMERIS":"/os/logo-lumeris.webp","NOVAÉ":"/os/logo-novae.webp","XAU/USD TRADING HQ":"/os/logo-xau.webp","RADIO CEDARS":"/os/logo-radio.webp"};
const NAV:{label:string;href?:string;icon:string;tab?:boolean}[]=[
 {label:"Command Center",href:"/dashboard",icon:"M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",tab:true},
 {label:"Projects",href:"#ecosystem",icon:"M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",tab:true},
 {label:"Markets & Trading",href:"#markets",icon:"M3 17l6-6 4 4 8-8M15 7h6v6",tab:true},
 {label:"AngolaIQ",href:"/iq",icon:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",tab:true},
 {label:"AI Assistant (Q)",href:"/chat",icon:"M12 21a9 9 0 1 1 6.4-2.6L21 21M15 15l3 3",tab:true},
 {label:"Morning Brief",href:"/brief",icon:"M12 4v2M12 18v2M4 12H2M22 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"},
 {label:"Alerts",href:"/alerts",icon:"M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"},];
const QUICK:[string,string,string][]=[
 ["Business Analysis","M4 20V10M10 20V4M16 20v-7","Give me a business analysis of my ecosystem: what is working, what is not, and the single highest-value next move."],
 ["Project Update","M12 3l9 5-9 5-9-5zM3 13l9 5 9-5","Give me a status update on all my projects: live status, blockers and the next action for each."],
 ["Market Intelligence","M3 17l6-6 4 4 8-8","Give me a market intelligence brief on gold (XAU/USD): key drivers, risks and what to watch this week. Say clearly what you cannot verify live."],
 ["Content Creation","M4 20l4-1 11-11-3-3L5 16z","Help me plan this week's content for LUMERIS and NOVAÉ with one strong idea per day."],
 ["Decision Support","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4l3 2","Act as Devil's Advocate on my most important current decision: state the proposal, assumptions, strongest counterargument, failure scenarios, missing evidence and a verdict (approve / approve with conditions / reconsider / postpone / reject)."]];

const days=(d?:string|null)=>d?Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/864e5)):null;
const ago=(iso:string|number)=>{const m=Math.round((Date.now()-new Date(iso).getTime())/6e4);return m<60?`${Math.max(1,m)}m ago`:m<2880?`${Math.round(m/60)}h ago`:`${Math.round(m/1440)}d ago`;};
const clean=(n:string)=>n.replace(" / Q","");
/* Polyline points for a series scaled into w×h (2px top/bottom padding). */
const spark=(s:number[],w:number,h:number)=>{const lo=Math.min(...s),hi=Math.max(...s),r=hi-lo||1;return s.map((v,i)=>`${(i/Math.max(1,s.length-1)*w).toFixed(1)},${(h-2-(v-lo)/r*(h-4)).toFixed(1)}`).join(" ");};
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Luanda"});
function Ico({d,s=18}:{d:string;s?:number}){return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d}/></svg>;}

export default function WebOS({conversationCount=0,activityCount=0,metrics={},metricsError=null}:{conversationCount?:number;activityCount?:number;metrics?:MetricsMap;metricsError?:string|null}){
 const [clock,setClock]=useState<Date|null>(null),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [apps,setApps]=useState<AppLink[]|null>(null),[tasks,setTasks]=useState<Task[]|null>(null),[taskErr,setTaskErr]=useState(""),[newTask,setNewTask]=useState(""),[newDue,setNewDue]=useState(""),[newPri,setNewPri]=useState<"high"|"normal"|"low">("normal"),[newRecur,setNewRecur]=useState(""),[doneWeek,setDoneWeek]=useState<number|null>(null),[editing,setEditing]=useState<{id:string;title:string;due:string}|null>(null);
 const dueRef=useRef<HTMLInputElement>(null);
 const [sheet,setSheet]=useState(false),[online,setOnline]=useState(true),[doneActs,setDoneActs]=useState<Record<string,string>>({});
 const [commandOpen,setCommandOpen]=useState(false),[commandQuery,setCommandQuery]=useState("");
 const [news,setNews]=useState<NewsItem[]>([]),[newsStream,setNewsStream]=useState<NewsStream>("Angola"),[newsCategory,setNewsCategory]=useState("All"),[newsLoading,setNewsLoading]=useState(true),[newsRefreshing,setNewsRefreshing]=useState(false),[newsError,setNewsError]=useState("");
 const [weather,setWeather]=useState<{t:number;code:number}|null>(null),[search,setSearch]=useState<string|null>(null),[drawer,setDrawer]=useState(false);
 const [qState,setQState]=useState<"checking"|"online"|"offline">("checking"),[qMsgs,setQMsgs]=useState<Msg[]>([]),[qInput,setQInput]=useState(""),[qBusy,setQBusy]=useState(false),[qConv,setQConv]=useState<string|undefined>();
 const qRef=useRef<HTMLDivElement>(null);

 const refresh=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/projects",{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"Sign in to load live data":`Projects API returned ${r.status}`);setData(await r.json());}catch(e){setError(e instanceof Error?e.message:"Live data unavailable");}finally{setLoading(false)}},[]);
 const loadTasks=useCallback(async()=>{try{const r=await fetch("/api/tasks",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error);setTasks(j.tasks);setDoneWeek(typeof j.doneWeek==="number"?j.doneWeek:null);setTaskErr("");}catch(e){setTaskErr(e instanceof Error&&e.message?e.message:"Tasks unavailable");}},[]);
 useEffect(()=>{setClock(new Date());const t=window.setInterval(()=>setClock(new Date()),30000);return()=>window.clearInterval(t)},[]);
 useEffect(()=>{refresh();const t=window.setInterval(refresh,300000);return()=>window.clearInterval(t)},[refresh]);
 useEffect(()=>{loadTasks();
  fetch("/api/apps",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>j&&setApps(j.apps)).catch(()=>{});
  fetch("/api/chat",{cache:"no-store"}).then(r=>setQState(r.ok?"online":"offline")).catch(()=>setQState("offline"));
  let wx:{at:number;t:number;code:number}|null=null;try{wx=JSON.parse(sessionStorage.getItem("os-wx")??"null");}catch{}
  if(wx&&Date.now()-wx.at<18e5)setWeather({t:wx.t,code:wx.code}); // 30 min cache: one weather call per session window
  else fetch("https://api.open-meteo.com/v1/forecast?latitude=-8.84&longitude=13.23&current=temperature_2m,weather_code&timezone=Africa%2FLuanda").then(r=>r.json()).then(j=>{if(!j?.current)return;const w={t:Math.round(j.current.temperature_2m),code:j.current.weather_code};setWeather(w);try{sessionStorage.setItem("os-wx",JSON.stringify({...w,at:Date.now()}));}catch{}}).catch(()=>{});
  if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{}); // offline copy of the last dashboard
  const on=()=>setOnline(navigator.onLine);on();window.addEventListener("online",on);window.addEventListener("offline",on);
  return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",on);};
 },[loadTasks]);
 useEffect(()=>{let live=true;const load=async()=>{try{const response=await fetch("/api/iq/q-news?stream=All",{cache:"no-store"});if(!response.ok)throw new Error(response.status===401?"Sign in to view news":"News feed unavailable");const payload=await response.json();let items=Array.isArray(payload.items)?payload.items as NewsItem[]:[];if(live){setNews(items);setNewsError("");}const missing=(["Angola","Lebanon","Global"] as NewsStream[]).filter(stream=>!items.some(item=>item.geography===stream));if(missing.length){await Promise.all(missing.map(stream=>fetch("/api/iq/q-news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stream})})));const refreshed=await fetch("/api/iq/q-news?stream=All",{cache:"no-store"});if(refreshed.ok){const next=await refreshed.json();items=Array.isArray(next.items)?next.items as NewsItem[]:[];if(live)setNews(items);}}}catch(error){if(live)setNewsError(error instanceof Error?error.message:"News feed unavailable");}finally{if(live)setNewsLoading(false);}};void load();return()=>{live=false;};},[]);
 const refreshNews=async()=>{setNewsRefreshing(true);setNewsError("");try{const response=await fetch("/api/iq/q-news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stream:newsStream})});const payload=await response.json().catch(()=>({}));if(!response.ok&&payload.status!=="partial")throw new Error(payload.error??"News refresh failed");const latest=await fetch("/api/iq/q-news?stream=All",{cache:"no-store"});if(!latest.ok)throw new Error("Could not reload headlines");const data=await latest.json();setNews(Array.isArray(data.items)?data.items:[]);}catch(error){setNewsError(error instanceof Error?error.message:"News refresh failed");}finally{setNewsRefreshing(false);}};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommandOpen(v=>!v);setCommandQuery("");}if(e.key==="Escape"){setSheet(false);setDrawer(false);setCommandOpen(false);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);
 useEffect(()=>{qRef.current?.scrollTo({top:qRef.current.scrollHeight,behavior:"smooth"})},[qMsgs]);

 const projects=useMemo(()=>data?.projects??[],[data]);
 const ready=projects.filter(p=>p.deployment?.state==="READY").length,failed=projects.filter(p=>p.deployment?.state==="ERROR").length;
 const p1=projects.filter(p=>p.priority==="P1").length,verified=projects.filter(p=>p.githubDataStatus==="VERIFIED"&&p.deploymentDataStatus==="VERIFIED").length;
 const active7=projects.filter(p=>(days(p.lastCommit?.date)??99)<=7).length;
 const exec=projects.length?Math.round(active7/projects.length*100):null;
 const alerts:Alert[]=[...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${clean(p.name)} — deploy failed`,level:"red" as const})),...projects.filter(p=>(p.openIssues??0)>0).map(p=>({title:`${clean(p.name)} — ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,level:"amber" as const}))];
 const gold=metrics.xauusd;
 const activity=useMemo(()=>[...projects.filter(p=>p.lastCommit).map(p=>({t:new Date(p.lastCommit!.date).getTime(),title:`${clean(p.name)} — ${p.lastCommit!.message}`,src:"GitHub",href:p.lastCommit!.url})),...(gold?[{t:new Date(gold.updatedAt).getTime(),title:`Trading HQ — gold updated ${gold.value.price.toFixed(2)}`,src:"Counter-Trader",href:""}]:[])].sort((a,b)=>b.t-a.t).slice(0,6),[projects,gold]);
 const open=(tasks??[]).filter(t=>!t.done);
 const overdue=open.filter(t=>t.due&&t.due<today()).length,redCount=alerts.filter(a=>a.level==="red").length;
 const agenda=[...open.filter(t=>t.due&&t.due<=today()).map(t=>({id:t.id,time:t.due===today()?(t.dueTime??"Today"):"Overdue",title:t.title,hot:t.due!==today()})),...alerts.filter(a=>a.level==="red").map(a=>({id:a.title,time:"Now",title:a.title,hot:true}))].slice(0,6);
 const filtered=search?projects.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())):projects;
 const dueNow=open.filter(t=>t.due===today()).length;
 /* Ecosystem health 0-100: builds 40%, activity 20%, tasks on time 20%, no urgent alerts 20%. */
 const pBuild=projects.length?Math.round(ready/projects.length*100):null,pTasks=tasks?Math.round(100-Math.min(100,overdue/Math.max(1,open.length)*100)):null,pAlerts=data?Math.max(0,100-redCount*25):null;
 const health=pBuild===null?null:Math.round(pBuild*.4+(exec??0)*.2+(pTasks??100)*.2+(pAlerts??100)*.2);
 const healthParts:[string,number|null][]=[["Builds",pBuild],["Activity 7d",exec],["Tasks on time",pTasks],["Alerts clear",pAlerts],["Data verified",projects.length?Math.round(verified/projects.length*100):null]];
 const time=clock?clock.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"}):"";
 const date=clock?clock.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",timeZone:"Africa/Luanda"}):"";

 async function addT(e:FormEvent){e.preventDefault();if(!newTask.trim())return;const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:newTask.trim(),priority:newPri,...(newDue?{due:newDue}:{}),...(newRecur?{recur:newRecur}:{})})});if(r.ok){setNewTask("");setNewDue("");setNewRecur("");setNewPri("normal");loadTasks();}else setTaskErr((await r.json().catch(()=>({}))).error??"Could not save");}
 async function toggleT(t:Task){setTasks(ts=>ts?.map(x=>x.id===t.id?{...x,done:!x.done}:x)??null);const r=await fetch("/api/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:t.id,done:!t.done})});if(!r.ok)loadTasks();}
 async function delT(t:Task){if(!window.confirm(`Delete “${t.title}”?`))return;setTasks(ts=>ts?.filter(x=>x.id!==t.id)??null);const r=await fetch(`/api/tasks?id=${encodeURIComponent(t.id)}`,{method:"DELETE"});if(!r.ok){setTaskErr("Could not delete");loadTasks();}}
 async function saveEdit(e:FormEvent){e.preventDefault();if(!editing||!editing.title.trim())return;const r=await fetch("/api/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editing.id,title:editing.title.trim(),due:editing.due||null})});setEditing(null);if(!r.ok)setTaskErr("Could not save");loadTasks();}
 async function snoozeT(t:Task,d:number){const r=await fetch("/api/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:t.id,snoozeDays:d})});if(r.ok)loadTasks();else setTaskErr("Could not snooze");}
 async function runAction(a:QAction,key:string){
  const mark=(v:string)=>setDoneActs(d=>({...d,[key]:v}));mark("…");
  try{
   if(a.kind==="task"){const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:a.arg.slice(0,160),...(a.due?{due:a.due}:{})})});if(!r.ok)throw new Error();loadTasks();mark("✓ Added");}
   else if(a.kind==="checks"){const r=await fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"check"})});if(!r.ok)throw new Error();refresh();mark("✓ Checks ran");}
   else if(a.kind==="open"){const p=projects.find(x=>clean(x.name).toLowerCase().includes(a.arg.toLowerCase())||x.id===a.arg.toLowerCase());const href=p?(p.url??apps?.find(x=>x.id===p.vercel)?.url):null;if(!href)throw new Error();window.open(href,"_blank","noopener");mark("✓ Opened");}
   else if(a.kind==="iq"){const r=await fetch("/api/iq/dashboard",{cache:"no-store"});if(!r.ok)throw new Error();const j=await r.json();mark("✓ Loaded");
    const facts=JSON.stringify({counts:j.counts,headlines:(j.top??[]).slice(0,8).map((x:{title:string;category:string})=>`${x.category}: ${x.title}`),indicators:(j.obs??[]).slice(0,12).map((o:{indicator:string;value:number;unit:string;period:string})=>`${o.indicator} ${o.value} ${o.unit??""} (${o.period})`),watch:j.hits,briefing:j.briefing?.output?String(typeof j.briefing.output==="string"?j.briefing.output:JSON.stringify(j.briefing.output)).slice(0,1500):null}).slice(0,6000);
    askQ(`Summarise AngolaIQ for me in 5 bullets plus one action, using only this data:\n${facts}`);}
  }catch{mark("Failed");}
 }
 async function askQ(text:string){const msg=text.trim();if(!msg||qBusy)return;setQBusy(true);setQInput("");setQMsgs(m=>[...m,{role:"user",text:msg},{role:"q",text:""}]);
  try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,portfolioContext:buildQContext({projects,tasks,alerts,gold:gold?{price:gold.value.price,changePct:gold.value.changePct,updatedAt:gold.updatedAt}:null}),...(qConv?{conversationId:qConv}:{})})});
   if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));throw new Error(j.error??`Q returned ${r.status}`);}
   setQState("online");const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
   for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});const parts=buf.split("\n\n");buf=parts.pop()??"";
    for(const part of parts){const line=part.replace(/^data: /,"");try{const ev=JSON.parse(line);if(ev.conversationId)setQConv(ev.conversationId);if(ev.delta)setQMsgs(m=>{const c=[...m];c[c.length-1]={role:"q",text:c[c.length-1].text+ev.delta};return c;});if(ev.error)throw new Error(ev.error);}catch(err){if(err instanceof Error&&err.message&&!(err instanceof SyntaxError))throw err;}}}
  }catch(e){setQState("offline");setQMsgs(m=>{const c=[...m];c[c.length-1]={role:"q",text:`⚠ ${e instanceof Error?e.message:"Q is unavailable"}`};return c;});}
  finally{setQBusy(false);}}


 const commandActions=[
  {label:"Ask Q for today's priorities",detail:"Strategic briefing",run:()=>askQ("Review my live Q OS dashboard data. Identify the single most important priority today, explain why, and recommend the next action.")},
  {label:"What matters in today’s news?",detail:"Analyse latest Angola, Lebanon and Global headlines",run:async()=>{const r=await fetch("/api/iq/q-news?stream=All",{cache:"no-store"});if(!r.ok)return;const j=await r.json();const headlines=(j.items??[]).slice(0,18).map((x:NewsItem)=>x.geography+" | "+x.title+" | "+(x.publisher??"Unknown source")+" | "+x.url);askQ("What matters in today’s news? Analyse only these latest Q News headlines. Identify the 3 most consequential developments, implications, risks and actions. Separate facts from inference.\n"+headlines.join("\n"));document.getElementById("q")?.scrollIntoView({behavior:"smooth"});}},
  {label:"Run system checks",detail:"Refresh alerts and project telemetry",run:()=>{fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"check"})}).then(()=>refresh());}},
  {label:"Open portfolio",detail:"Projects and deployments",run:()=>document.getElementById("ecosystem")?.scrollIntoView({behavior:"smooth"})},
  {label:"Open priority queue",detail:"Tasks requiring attention",run:()=>document.getElementById("agenda")?.scrollIntoView({behavior:"smooth"})},
  {label:"Open market pulse",detail:"XAU/USD monitoring",run:()=>document.getElementById("markets")?.scrollIntoView({behavior:"smooth"})}
 ];
 const navLink=(n:typeof NAV[number],cls:string)=>n.href?<a key={n.label} href={n.href} className={`${cls}${n.label==="Command Center"?" on":""}`} onClick={()=>setDrawer(false)}><Ico d={n.icon}/><span>{n.label}</span></a>:<span key={n.label} className={`${cls} soon`} aria-disabled="true"><Ico d={n.icon}/><span>{n.label}</span><em>Soon</em></span>;

 return <main className="os" id="top">
  <aside className="os-side">
   <div className="os-brand"><img src="/os/q-emblem.webp" alt="" width={84} height={76}/><b>Q <i>OS</i></b><small>PRIVATE COMMAND CENTRE</small></div>
   <nav>{NAV.map(n=>navLink(n,"os-nav"))}</nav>
   <div className="os-side-art" aria-hidden="true"/>
  </aside>

  <div className="os-center">
   <header className="os-top">
    <div className="os-mbrand"><img src="/os/q-emblem.webp" alt="" width={34} height={31}/><b>Q <i>OS</i></b></div>
    {search!==null&&<input className="os-search" autoFocus placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setSearch(null)}}/>}
    <div className="os-tools">
     <button aria-label="Open command palette" title="Command palette · Ctrl K" onClick={()=>{setCommandOpen(true);setCommandQuery("");}}><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></button>
     <a aria-label="Alerts" href="#alerts" className="os-bell"><Ico d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>{alerts.length>0&&<i>{alerts.length}</i>}</a>
     <a aria-label="Projects and apps" href="#ecosystem"><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></a>
    </div>
    {weather&&<div className="os-weather"><Ico d={weather.code<3?"M12 4v2M12 18v2M4 12H2M22 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z":"M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3 3 0 0 0 7 18z"} s={22}/><span><small>Luanda, AO</small>{weather.t}°C</span></div>}
    <div className="os-clock"><strong>{time}</strong><small>{date}</small></div>
   </header>

   <section className="os-hello">
    <div>
     <p className="os-kicker"><span className="os-live-dot"/>Q OS · Command centre · {date}</p>
     <h1>{clock&&clock.getHours()<12?"Good morning":clock&&clock.getHours()<18?"Good afternoon":"Good evening"}, Nassim.</h1>
     <p className="os-hello-sub">{data?`${ready} of ${projects.length} apps live`:"Loading portfolio"}{tasks?` · ${dueNow} due today`:""}{overdue?` · ${overdue} overdue`:""}{gold?` · gold ${gold.value.changePct>=0?"+":""}${gold.value.changePct.toFixed(2)}%`:""}</p>
    </div>
    <button className="os-cmdk" onClick={()=>{setCommandOpen(true);setCommandQuery("");}} aria-label="Open command palette"><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" s={16}/><span>Search or ask Q…</span><kbd>Ctrl K</kbd></button>
   </section>
   {!online&&<p className="os-offline" role="status">Offline: showing the last saved data.</p>}
   {(error||metricsError)&&<p className="os-err">{error||metricsError}</p>}

   <section className="os-bento" aria-label="Today at a glance">
    <a className="os-health" href="/brief" aria-label={`Ecosystem health ${health??"unknown"} out of 100. Open morning brief`}>
     <div className="os-health-h"><small>Ecosystem health</small><em>Brief →</em></div>
     <div className="os-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="osRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4d5e"/><stop offset="1" stopColor="#8b7cff"/></linearGradient></defs>
       <circle cx="60" cy="60" r="50" className="trk"/><circle cx="60" cy="60" r="50" className="val" strokeDasharray={`${(health??0)/100*314.2} 314.2`}/></svg>
      <div><b>{health??"—"}</b><small>{health===null?"loading":health>=85?"Excellent":health>=65?"Good":"Needs attention"}</small></div>
     </div>
     <ul>{healthParts.map(([l,v])=><li key={l}><span>{l}</span><i><b style={{width:`${v??0}%`}}/></i><em>{v===null?"—":v}</em></li>)}</ul>
    </a>
    <a className="os-tile os-tile-hero" href="#ecosystem">
     <small>Apps live</small><b>{data?ready:"—"}<span>/{data?projects.length:"—"}</span></b>
     <p className="os-dots" aria-hidden="true">{projects.map(p=><i key={p.id} className={p.deployment?.state==="READY"?"ok":p.deployment?.state==="ERROR"?"bad":""} title={clean(p.name)}/>)}</p>
     <em>{failed?`${failed} failing · fix first`:"All production builds healthy"}</em>
    </a>
    <a className="os-tile" href="#agenda"><small>Open tasks</small><b>{tasks?open.length:"—"}</b><em className={overdue?"bad":""}>{tasks?(overdue?`${overdue} overdue · ${dueNow} today`:`${dueNow} due today`):"…"}</em></a>
    <a className="os-tile" href="/alerts"><small>Urgent alerts</small><b className={redCount?"bad":""}>{data?redCount:"—"}</b><em>{alerts.length?`${alerts.length} signal${alerts.length===1?"":"s"} in total`:"All quiet"}</em></a>
    <a className="os-tile" href="#markets"><small>Gold · XAU/USD</small><b>{gold?gold.value.price.toFixed(0):"—"}</b>
     {gold&&<svg className="os-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={spark(gold.value.series,100,24)} className={gold.value.changePct>=0?"ok":"bad"}/></svg>}
     <em className={gold?(gold.value.changePct>=0?"ok":"bad"):""}>{gold?`${gold.value.changePct>=0?"▲ +":"▼ "}${gold.value.changePct.toFixed(2)}% today`:"No feed"}</em></a>
   </section>

   <section className="os-eco" id="ecosystem">
    <div className="os-eco-h"><h2>Portfolio</h2><button className="os-newbtn" onClick={()=>{askQ("Help me plan a new venture: ask me 3 sharp questions first, then outline Plan, Build, Launch.");document.getElementById("q")?.scrollIntoView({behavior:"smooth"})}}>+ New Venture</button></div>
    <div className="os-grid">
     {(filtered.length||!data?filtered:[]).map(p=>{const st=p.deployment?.state==="READY"?"ok":p.deployment?.state==="ERROR"?"bad":"idle";
      const href=p.url??apps?.find(a=>a.id===p.vercel)?.url??(p.repo?`https://github.com/nas393/${p.repo}`:undefined);
      const pages=apps?.find(a=>a.id===p.vercel)?.pages??[];
      return <div key={p.id} className="os-card">
       <a href={href} target="_blank" rel="noreferrer" className="os-card-a" aria-label={`Open ${clean(p.name)}`}/>
       <div className="os-logo">{LOGOS[p.name]?<img src={LOGOS[p.name]} alt={clean(p.name)} loading="lazy" decoding="async" width={170} height={60}/>:<span className="os-word">{clean(p.name)}</span>}</div>
       {LOGOS[p.name]&&p.name==="NASSIM AI HQ / Q"&&<strong>NASSIM AI HQ</strong>}
       <small>{p.area}</small>
       {pages.length>0&&<p className="os-card-pg">{pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</p>}
       <em className={st}><i/>{st==="ok"?"Active":st==="bad"?"Failed":"Unverified"}</em>
      </div>;})}
     {data&&!search&&(apps??[]).filter(a=>a.url&&!projects.some(p=>p.vercel===a.id||p.url===a.url)).map(a=><div key={a.id} className="os-card">
       <a href={a.url!} target="_blank" rel="noreferrer" className="os-card-a" aria-label={`Open ${a.name}`}/>
       <div className="os-logo"><span className="os-word">{a.name.replace(/-/g," ").toUpperCase()}</span></div><small>{a.url!.replace("https://","")}</small>
       {a.pages?.length?<p className="os-card-pg">{a.pages.map(pg=><a key={pg.url} href={pg.url} target="_blank" rel="noreferrer">{pg.label}</a>)}</p>:null}
       <em className="ok"><i/>Live</em></div>)}
     {!data&&loading&&Array.from({length:7},(_,i)=><div key={i} className="os-card ghost"/>)}
     {data&&!filtered.length&&<p className="os-muted">No project matches “{search}”.</p>}
    </div>

   </section>

   <section className="os-panel os-news" aria-label="Q Global Radar">
    <div className="os-news-head"><div><h3><Ico d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"/>Q Global Radar</h3><p className="os-news-kicker">Global intelligence. Strategic awareness.</p></div><div className="os-news-controls"><button className="os-news-refresh" type="button" onClick={refreshNews} disabled={newsRefreshing||newsLoading}><Ico d="M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" s={13}/>{newsRefreshing?"Refreshing…":"Refresh"}</button><div className="os-news-tabs" role="tablist" aria-label="Geographic stream">{(["Angola","Lebanon","Global"] as NewsStream[]).map(stream=><button key={stream} type="button" role="tab" aria-selected={newsStream===stream} className={newsStream===stream?"on":""} onClick={()=>setNewsStream(stream)}>{stream}</button>)}</div></div></div>
    <div className="os-radar-categories" role="group" aria-label="Intelligence category">{["All","Commodities","Economy","Geopolitics","Security","Technology"].map(category=><button key={category} type="button" className={newsCategory===category?"on":""} aria-pressed={newsCategory===category} onClick={()=>setNewsCategory(category)}>{category}</button>)}</div>
    {newsError?<p className="os-muted">{newsError}</p>:newsLoading?<p className="os-muted">Loading intelligence…</p>:<ol className="os-news-list">{news.filter(item=>item.geography===newsStream&&(newsCategory==="All"||({Commodities:["oil_gas","agriculture"],Economy:["finance","trade","economy"],Geopolitics:["politics","geopolitics"],Security:["security"],Technology:["technology"]} as Record<string,string[]>)[newsCategory]?.includes(item.category??""))).slice(0,8).map(item=><li key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><b>{item.title}</b><small>{item.category?.replace(/_/g," ")||"General"} · {item.publisher||"Unknown source"} · {ago(item.published_at||item.retrieved_at)}</small></a><Ico d="M7 17 17 7M8 7h9v9" s={14}/></li>)}</ol>}
    {!newsLoading&&!newsError&&!news.some(item=>item.geography===newsStream&&(newsCategory==="All"||({Commodities:["oil_gas","agriculture"],Economy:["finance","trade","economy"],Geopolitics:["politics","geopolitics"],Security:["security"],Technology:["technology"]} as Record<string,string[]>)[newsCategory]?.includes(item.category??"")))&&<p className="os-muted">No matching intelligence in this stream. Try another category or refresh.</p>}
   </section>

   <section className="os-panels">
    <article className="os-panel os-focus">
     <h3><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>Priority Queue <span>Next 15 days</span></h3>
     {taskErr&&<p className="os-err">{taskErr}</p>}
     {tasks&&!open.length&&<p className="os-muted">No focus items yet. Add your first below.</p>}
     <ul>{open.filter(t=>!t.due||t.due<=new Date(Date.now()+15*864e5).toISOString().slice(0,10)).slice(0,6).map(t=>editing?.id===t.id?
      <li key={t.id}><form className="os-edit" onSubmit={saveEdit}><input autoFocus value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} maxLength={160} aria-label="Task title"/><input type="date" value={editing.due} onChange={e=>setEditing({...editing,due:e.target.value})} aria-label="Due date"/><button type="submit">Save</button><button type="button" onClick={()=>setEditing(null)} aria-label="Cancel edit">✕</button></form></li>:
      <li key={t.id} className={`pri-${t.priority??"normal"}`}><input type="checkbox" checked={t.done} onChange={()=>toggleT(t)} aria-label={`Done: ${t.title}`}/><button className="os-ttl" onClick={()=>setEditing({id:t.id,title:t.title,due:t.due??""})} title="Tap to edit">{t.priority==="high"&&<i className="os-pri" title="High priority">!</i>}{t.title}{t.recur&&<small className="os-rec" title={`Repeats ${t.recur}`}> ↻</small>}</button>{t.due&&<time className={t.due<today()?"late":""}>{new Date(t.due+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</time>}<button className="os-snz" onClick={()=>snoozeT(t,1)} aria-label={`Snooze ${t.title} one day`} title="Snooze 1 day">+1d</button><button className="os-snz os-del" onClick={()=>delT(t)} aria-label={`Delete ${t.title}`} title="Delete">✕</button></li>)}</ul>
     <form onSubmit={addT} className="os-add os-add1"><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a focus item" maxLength={160} aria-label="New focus item"/>
      <span className="os-datebtn"><button type="button" onClick={()=>{const el=dueRef.current;if(!el)return;try{el.showPicker();}catch{el.focus();}}} aria-label="Pick due date" title="Due date" className={newDue?"set":""}>{newDue?new Date(newDue+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):<Ico d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" s={16}/>}</button><input ref={dueRef} type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} tabIndex={-1} aria-hidden="true"/></span>
      <button type="button" className={newPri!=="normal"?"set":""} onClick={()=>setNewPri(p=>p==="normal"?"high":p==="high"?"low":"normal")} aria-label={`Priority: ${newPri}`} title={`Priority: ${newPri}`}>{newPri==="high"?"!":newPri==="low"?"↓":"–"}</button>
      <button type="button" className={newRecur?"set":""} onClick={()=>setNewRecur(r=>({"":"daily",daily:"weekdays",weekdays:"weekly",weekly:"monthly",monthly:""} as Record<string,string>)[r])} aria-label={`Repeat: ${newRecur||"none"}`} title={`Repeat: ${newRecur||"none"}`}>{newRecur?newRecur.slice(0,2):"↻"}</button>
      <button type="submit" aria-label="Add focus item" className="os-plus">+</button></form>
    </article>
    <article className="os-panel os-activity">
     <h3><Ico d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>System Activity</h3>
     {activity.length?<ol className="os-tl">{activity.map(a=><li key={a.title+a.t}><time title={a.src}>{new Date(a.t).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"})}</time><i/><span>{a.href?<a href={a.href} target="_blank" rel="noreferrer">{a.title}</a>:a.title}<small>{a.src} · {ago(a.t)}</small></span></li>)}</ol>:<p className="os-muted">{loading?"Loading…":"No activity found."}</p>}
     <p className="os-foot">Q: {activityCount} events · {conversationCount} chats (24h)</p>
    </article>
   </section>

   <section className="os-panel os-markets" id="markets">
    <h3><Ico d="M3 17l6-6 4 4 8-8M15 7h6v6"/>Market Pulse · XAU/USD</h3>
    {gold?<div className="os-gold"><b>{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</b><em className={gold.value.changePct>=0?"ok":"bad"}>{gold.value.changePct>=0?"▲ +":"▼ "}{gold.value.changePct.toFixed(2)}% today</em>{(()=>{const se=gold.value.series,c=(se[se.length-1]/se[0]-1)*100;return <em className={`os-gold2 ${c>=0?"ok":"bad"}`} title="Change across the chart">{c>=0?"+":""}{c.toFixed(2)}% on chart</em>;})()}<small>{gold.source} · {ago(gold.updatedAt)}</small>
     <svg viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="osGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff4d5e" stopOpacity=".35"/><stop offset="1" stopColor="#ff4d5e" stopOpacity="0"/></linearGradient></defs>
      <polygon fill="url(#osGold)" points={`0,80 ${spark(gold.value.series,300,76)} 300,80`}/><polyline fill="none" stroke="#ff4d5e" strokeWidth="2" points={spark(gold.value.series,300,76)}/></svg></div>:<p className="os-muted">Waiting for Counter-Trader.</p>}
   </section>

  </div>

  <aside className="os-right">
   <section className="os-q" id="q">
    <div className="os-qhead"><img src="/os/q-emblem.webp" alt="" width={88} height={88} decoding="async"/><div><b>Q</b><span>Your Strategic Assistant</span><em className={qState}><i/>{qState==="online"?"Online":qState==="offline"?"Offline":"Checking"}</em></div></div>
    {qMsgs.length>0&&<div className="os-thread" ref={qRef}>{qMsgs.map((m,i)=>{const acts=m.role==="q"&&!(qBusy&&i===qMsgs.length-1)?parseActions(m.text):[];return <div key={i} className={`os-msg ${m.role}`}>{m.text?(m.role==="q"?<QMd text={stripActions(m.text)}/>:m.text):(qBusy&&i===qMsgs.length-1?"Thinking…":"")}
     {acts.length>0&&<div className="os-acts">{acts.map((a,k)=>{const key=`${i}-${k}`,st=doneActs[key];return <button key={key} disabled={!!st&&st!=="Failed"} onClick={()=>runAction(a,key)}>{st&&st!=="…"?st:a.kind==="task"?`＋ Task: ${a.arg}${a.due?` (${a.due})`:""}`:a.kind==="checks"?"Run checks":a.kind==="open"?`Open ${a.arg}`:"Summarise AngolaIQ"}</button>;})}</div>}</div>;})}</div>}
    <form className="os-ask" onSubmit={e=>{e.preventDefault();askQ(qInput)}}><input value={qInput} onChange={e=>setQInput(e.target.value)} placeholder="How can I help you today?" maxLength={2000} aria-label="Ask Q"/><button type="submit" disabled={qBusy||!qInput.trim()} aria-label="Send"><Ico d="M5 12h14M13 6l6 6-6 6"/></button></form>
    <div className="os-quick">{QUICK.map(([l,ic,prompt])=><button key={l} onClick={()=>askQ(prompt)} disabled={qBusy}><Ico d={ic} s={16}/>{l}</button>)}<button onClick={()=>runAction({kind:"iq",arg:""},"quick-iq")} disabled={qBusy}><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18" s={16}/>AngolaIQ Summary</button><button onClick={()=>commandActions.find(x=>x.label.startsWith("What matters"))?.run()} disabled={qBusy}><Ico d="M4 5h16v14H4zM8 9h8M8 13h8" s={16}/>What matters in today’s news?</button><Link href="/chat"><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" s={16}/>More Tools</Link></div>
   </section>
   <section className="os-panel os-agenda" id="agenda">
    <h3><Ico d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>Today</h3>
    {agenda.length?<ul>{agenda.map(a=><li key={a.id}><i className={a.hot?"hot":""}/><span>{a.title}</span><time>{a.time}</time></li>)}</ul>:<p className="os-muted">{tasks?"Nothing due today. Add focus items with a date.":"Loading…"}</p>}
   </section>
   <AlertsPanel goldPrice={gold?.value.price}/>
  </aside>

  <nav className="os-tabs" aria-label="Main">
   <a href="#top" className="on" aria-current="page" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"})}}><Ico d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" s={20}/>Today</a>
   <button onClick={()=>setSheet(true)} aria-haspopup="dialog"><Ico d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" s={20}/>Apps</button>
   <a href="#q"><Ico d="M12 21a9 9 0 1 1 6.4-2.6L21 21M15 15l3 3" s={20}/>Q</a>
   <a href="/alerts" className="os-tab-al"><Ico d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" s={20}/>Alerts{redCount>0&&<i>{redCount}</i>}</a>
   <button onClick={()=>setDrawer(true)} aria-haspopup="dialog"><Ico d="M4 6h16M4 12h16M4 18h16" s={20}/>More</button>
  </nav>
  {sheet&&<div className="os-drawer os-sheet" role="dialog" aria-modal="true" aria-label="Apps" onClick={()=>setSheet(false)}><nav onClick={e=>e.stopPropagation()}>
   <h3>Apps</h3>
   <div className="os-sheet-g">{(apps??[]).filter(a=>a.url).map(a=>{const p=projects.find(x=>x.vercel===a.id);const logo=p&&LOGOS[p.name];return <a key={a.id} href={a.url!} target="_blank" rel="noreferrer">{logo?<img src={logo} alt="" width={90} height={32} loading="lazy"/>:<b>{a.name.slice(0,2)}</b>}<span>{a.name}</span></a>;})}
    {!apps&&<p className="os-muted">Loading apps…</p>}</div>
   <h3>Q OS</h3>
   <div className="os-sheet-l"><a href="/brief">☀ Morning brief</a><a href="/alerts">🔔 Alerts</a><a href="/iq">🌍 AngolaIQ</a><a href="/chat">💬 Q chat</a></div>
   <button className="os-close" onClick={()=>setSheet(false)}>Close</button></nav></div>}
  {commandOpen&&<div className="os-command-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCommandOpen(false);}}>
   <section className="os-command" role="dialog" aria-modal="true" aria-label="Q command palette">
    <form className="os-command-search" onSubmit={e=>{e.preventDefault();const q=commandQuery.trim();if(!q)return;const action=commandActions.find(x=>(x.label+" "+x.detail).toLowerCase().includes(q.toLowerCase()));const project=projects.find(p=>clean(p.name).toLowerCase().includes(q.toLowerCase()));if(action){setCommandOpen(false);action.run();}else if(project){setCommandOpen(false);const href=project.url??apps?.find(a=>a.id===project.vercel)?.url;if(href)window.open(href,"_blank","noopener");else document.getElementById("ecosystem")?.scrollIntoView({behavior:"smooth"});}else{setCommandOpen(false);askQ(q);window.setTimeout(()=>document.getElementById("q")?.scrollIntoView({behavior:"smooth"}),0);}}}><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" s={20}/><input autoFocus enterKeyHint="go" value={commandQuery} onChange={e=>setCommandQuery(e.target.value)} placeholder="Search or ask Q…"/><kbd>GO</kbd></form>
    <div className="os-command-group"><small>QUICK COMMANDS</small>
     {commandActions.filter(x=>(x.label+" "+x.detail).toLowerCase().includes(commandQuery.toLowerCase())).map(x=><button key={x.label} onClick={()=>{setCommandOpen(false);x.run();}}><span><b>{x.label}</b><small>{x.detail}</small></span><kbd>↵</kbd></button>)}
    </div>
    <div className="os-command-group"><small>PROJECTS</small>
     {projects.filter(p=>clean(p.name).toLowerCase().includes(commandQuery.toLowerCase())).slice(0,5).map(p=><button key={p.id} onClick={()=>{setCommandOpen(false);const href=p.url??apps?.find(a=>a.id===p.vercel)?.url;if(href)window.open(href,"_blank","noopener");else document.getElementById("ecosystem")?.scrollIntoView({behavior:"smooth"});}}><span><b>{clean(p.name)}</b><small>{p.area} · {p.deployment?.state??"Status unavailable"}</small></span><kbd>↗</kbd></button>)}
     {!projects.some(p=>clean(p.name).toLowerCase().includes(commandQuery.toLowerCase()))&&<p>No matching projects.</p>}
     {commandQuery.trim()&&<button className="os-command-ask" onClick={()=>{const q=commandQuery.trim();setCommandOpen(false);askQ(q);window.setTimeout(()=>document.getElementById("q")?.scrollIntoView({behavior:"smooth"}),0);}}><span><b>Ask Q → “{commandQuery.trim()}”</b><small>Send this question to your assistant</small></span><kbd>↵</kbd></button>}
    </div>
    <footer><span><kbd>CTRL</kbd> <kbd>K</kbd> to toggle</span><span>Q OS COMMAND LAYER</span></footer>
   </section>
  </div>}
  {drawer&&<div className="os-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={()=>setDrawer(false)}><nav onClick={e=>e.stopPropagation()}><div className="os-brand"><img src="/os/q-emblem.webp" alt="" width={60} height={54}/><b>Q <i>OS</i></b><small>PRIVATE COMMAND CENTRE</small></div>{NAV.map(n=>navLink(n,"os-nav"))}<button className="os-close" onClick={()=>setDrawer(false)}>Close</button></nav></div>}
 </main>;
}
