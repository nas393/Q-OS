"use client";
import Link from "next/link";
import {AlertsPanel} from "@/components/alerts-panel";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./qlive/qlive.css";
import {orbitLayout,shortName} from "./qlive/layout";
import {ACCENTS,DEFAULT_STUDIO,SIG_NAMES,STACK_NAMES,THEMES,loadStudio,saveStudio,type SigType,type StackCard,type Studio} from "./qlive/studio";
import type { MetricsMap } from "@/lib/metrics";
import { buildQContext } from "@/lib/q-context";
import QMd from "@/components/q-md";

type Project={id:string;name:string;url?:string;repo:string|null;vercel:string|null;priority:string;next:string;area:string;openIssues:number|null;lastCommit:{message:string;date:string;url:string}|null;deployment:{state:string;url:string|null;created:number|null;target:string|null;inspectorUrl:string|null;sourceMatches?:boolean|null}|null;deploymentDataStatus?:string;githubDataStatus?:string};
type Telemetry={updatedAt:string;projects:Project[]};
type AppLink={id:string;name:string;url:string|null;state:string|null;pages?:{label:string;url:string}[];icon?:string|null};
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
const initials=(n:string)=>n.split(/[^A-Za-z0-9À-ÿ]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Africa/Luanda"});

export default function WebOS({conversationCount=0,activityCount=0,metrics={},metricsError=null}:{conversationCount?:number;activityCount?:number;metrics?:MetricsMap;metricsError?:string|null}){
 const [clock,setClock]=useState<Date|null>(null),[data,setData]=useState<Telemetry|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [apps,setApps]=useState<AppLink[]|null>(null),[tasks,setTasks]=useState<Task[]|null>(null),[taskErr,setTaskErr]=useState(""),[newTask,setNewTask]=useState(""),[newDue,setNewDue]=useState(""),[newPri,setNewPri]=useState<"high"|"normal"|"low">("normal"),[newRecur,setNewRecur]=useState(""),[doneWeek,setDoneWeek]=useState<number|null>(null),[editing,setEditing]=useState<{id:string;title:string;due:string}|null>(null);
 const [trend,setTrend]=useState<number|null>(null);
 const [online,setOnline]=useState(true),[doneActs,setDoneActs]=useState<Record<string,string>>({});
 const [commandOpen,setCommandOpen]=useState(false),[commandQuery,setCommandQuery]=useState("");
 const [news,setNews]=useState<NewsItem[]>([]),[newsStream,setNewsStream]=useState<NewsStream>("Angola"),[newsCategory,setNewsCategory]=useState("All"),[newsLoading,setNewsLoading]=useState(true),[newsRefreshing,setNewsRefreshing]=useState(false),[newsError,setNewsError]=useState(""),[selectedNews,setSelectedNews]=useState<string|null>(null);
 const [weather,setWeather]=useState<{t:number;code:number}|null>(null);
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
 useEffect(()=>{let live=true;const request=async(input:string,init?:RequestInit)=>{let last:unknown;for(let attempt=0;attempt<2;attempt++){try{return await fetch(input,{...init,cache:"no-store",credentials:"same-origin"});}catch(error){last=error;if(attempt===0)await new Promise(resolve=>window.setTimeout(resolve,700));}}throw last instanceof Error?last:new Error("Network request failed");};const read=async()=>{const response=await request("/api/iq/q-news?stream=All");const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error??(response.status===401?"Sign in to view news":`News service returned ${response.status}`));return Array.isArray(body.items)?body.items as NewsItem[]:[];};const load=async()=>{try{let items=await read();if(live){setNews(items);setNewsError("");}const missing=(["Angola","Lebanon","Global"] as NewsStream[]).filter(stream=>!items.some(item=>item.geography===stream));if(missing.length){const response=await request("/api/iq/q-news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stream:"All"})});const result=await response.json().catch(()=>({}));if(!response.ok&&result.status!=="partial")throw new Error(result.error??"Automatic news refresh failed");items=await read();if(live)setNews(items);if(result.status==="partial"&&live){const failures=Object.entries(result.results??{}).filter(([,value])=>(value as {error?:string}).error).map(([name,value])=>`${name}: ${(value as {error:string}).error}`);if(failures.length)setNewsError(`Some sources need attention — ${failures.join(" · ")}`);}}}catch(error){if(live)setNewsError(error instanceof TypeError?"Connection to Q Global Radar failed. Check your connection and tap Refresh.":error instanceof Error?error.message:"News feed unavailable");}finally{if(live)setNewsLoading(false);}};void load();return()=>{live=false;};},[]);
 const refreshNews=async()=>{setNewsRefreshing(true);setNewsError("");try{const response=await fetch("/api/iq/q-news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stream:newsStream}),cache:"no-store",credentials:"same-origin"});const payload=await response.json().catch(()=>({}));if(!response.ok&&payload.status!=="partial")throw new Error(payload.error??`News refresh returned ${response.status}`);const latest=await fetch("/api/iq/q-news?stream=All",{cache:"no-store",credentials:"same-origin"});const data=await latest.json().catch(()=>({}));if(!latest.ok)throw new Error(data.error??`Could not reload headlines (${latest.status})`);setNews(Array.isArray(data.items)?data.items:[]);if(payload.status==="partial"){const failures=Object.entries(payload.results??{}).filter(([,value])=>(value as {error?:string}).error).map(([name,value])=>`${name}: ${(value as {error:string}).error}`);if(failures.length)setNewsError(`Some sources failed — ${failures.join(" · ")}`);}}catch(error){setNewsError(error instanceof TypeError?"Connection to Q Global Radar failed. Check your connection and retry.":error instanceof Error?error.message:"News refresh failed");}finally{setNewsRefreshing(false);}};
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommandOpen(v=>!v);setCommandQuery("");}if(e.key==="Escape")setCommandOpen(false);};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);
 useEffect(()=>{qRef.current?.scrollTo({top:qRef.current.scrollHeight,behavior:"smooth"})},[qMsgs]);

 const projects=useMemo(()=>data?.projects??[],[data]);
 const ready=projects.filter(p=>p.deployment?.state==="READY").length;
 const verified=projects.filter(p=>p.githubDataStatus==="VERIFIED"&&p.deploymentDataStatus==="VERIFIED").length;
 const active7=projects.filter(p=>(days(p.lastCommit?.date)??99)<=7).length;
 const exec=projects.length?Math.round(active7/projects.length*100):null;
 const alerts:Alert[]=[...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({title:`${clean(p.name)} — deploy failed`,level:"red" as const})),...projects.filter(p=>(p.openIssues??0)>0).map(p=>({title:`${clean(p.name)} — ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,level:"amber" as const}))];
 const gold=metrics.xauusd;
 const activity=useMemo(()=>[...projects.filter(p=>p.lastCommit).map(p=>({t:new Date(p.lastCommit!.date).getTime(),title:`${clean(p.name)} — ${p.lastCommit!.message}`,src:"GitHub",href:p.lastCommit!.url})),...(gold?[{t:new Date(gold.updatedAt).getTime(),title:`Trading HQ — gold updated ${gold.value.price.toFixed(2)}`,src:"Counter-Trader",href:""}]:[])].sort((a,b)=>b.t-a.t).slice(0,6),[projects,gold]);
 const open=(tasks??[]).filter(t=>!t.done);
 const focusTasks=[...open.filter(t=>!t.due||t.due<=new Date(Date.now()+15*864e5).toISOString().slice(0,10))].sort((a,b)=>{const overdueA=!!a.due&&a.due<today()?1:0,overdueB=!!b.due&&b.due<today()?1:0;if(overdueA!==overdueB)return overdueB-overdueA;const rank={high:0,normal:1,low:2};const priority=(rank[a.priority??"normal"]??1)-(rank[b.priority??"normal"]??1);if(priority)return priority;return (a.due??"9999").localeCompare(b.due??"9999");}).slice(0,6);
 const overdue=open.filter(t=>t.due&&t.due<today()).length,redCount=alerts.filter(a=>a.level==="red").length;
 const visibleNews=useMemo(()=>{const categories:Record<string,string[]>={Commodities:["oil_gas","agriculture"],Economy:["finance","trade","economy"],Geopolitics:["politics","geopolitics"],Security:["security"],Technology:["technology"]};const seen=new Set<string>();return news.filter(item=>item.geography===newsStream&&(newsCategory==="All"||categories[newsCategory]?.includes(item.category??""))).filter(item=>{const key=(item.url||item.title).trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,8);},[news,newsStream,newsCategory]);
 const selectedNewsItem=selectedNews?news.find(item=>String(item.id)===selectedNews)??null:null;
 /* Ecosystem health 0-100: builds 40%, activity 20%, tasks on time 20%, no urgent alerts 20%. */
 const pBuild=projects.length?Math.round(ready/projects.length*100):null,pTasks=tasks?Math.round(100-Math.min(100,overdue/Math.max(1,open.length)*100)):null,pAlerts=data?Math.max(0,100-redCount*25):null;
 const health=pBuild===null?null:Math.round(pBuild*.4+(exec??0)*.2+(pTasks??100)*.2+(pAlerts??100)*.2);
 /* Trend: today's score vs the last saved day on this device (kept 14 days). */
 useEffect(()=>{if(health===null)return;try{const k=today(),h=JSON.parse(localStorage.getItem("os-health")??"{}") as Record<string,number>;const prev=Object.keys(h).filter(d=>d<k).sort().pop();setTrend(prev?health-h[prev]:null);h[k]=health;localStorage.setItem("os-health",JSON.stringify(Object.fromEntries(Object.entries(h).sort().slice(-14))));}catch{}},[health]);
 const healthParts:[string,number|null][]=[["Builds",pBuild],["Activity 7d",exec],["Tasks on time",pTasks],["Alerts clear",pAlerts],["Data verified",projects.length?Math.round(verified/projects.length*100):null]];
 /* Attention: only genuine exceptions from live data (failed builds, open issues, overdue tasks, big gold moves). */
 type Attn={id:string;sev:"critical"|"watch"|"info";title:string;app:string;when:string;advice:string;action:string;href:string};
 const attention:Attn[]=[
  ...projects.filter(p=>p.deployment?.state==="ERROR").map(p=>({id:"d"+p.id,sev:"critical" as const,title:`${shortName(clean(p.name))} production build failed`,app:p.area,when:p.deployment?.created?ago(p.deployment.created):"",advice:"Check the build log and redeploy",action:"Open build",href:p.deployment?.inspectorUrl??"/alerts"})),
  ...open.filter(t=>t.due&&t.due<today()).map(t=>({id:"t"+t.id,sev:"watch" as const,title:`Overdue: ${t.title}`,app:t.project??"Personal priority",when:`due ${new Date(t.due+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`,advice:"Complete, reschedule or delete",action:"Open queue",href:"#agenda"})),
  ...projects.filter(p=>(p.openIssues??0)>0).map(p=>({id:"i"+p.id,sev:"watch" as const,title:`${clean(p.name)}: ${p.openIssues} open issue${p.openIssues===1?"":"s"}`,app:p.area,when:"",advice:"Triage on GitHub",action:"View issues",href:p.repo?`https://github.com/nas393/${p.repo}/issues`:"/alerts"})),
  ...(gold&&Math.abs(gold.value.changePct)>=1.5?[{id:"gold",sev:"info" as const,title:`Gold ${gold.value.changePct>0?"up":"down"} ${Math.abs(gold.value.changePct).toFixed(2)}% today`,app:"XAU/USD Trading HQ",when:ago(gold.updatedAt),advice:"Review positions and levels",action:"View market",href:"#markets"}]:[])
 ].slice(0,5);
 const firstTask=focusTasks[0];
 const nextAction=attention[0]?{title:attention[0].title,action:attention[0].action,href:attention[0].href}:firstTask?{title:firstTask.title,action:"Open priorities",href:"#agenda"}:{title:"Read today's brief",action:"Open brief",href:"/brief"};
 const critical=attention.filter(a=>a.sev==="critical"),watch=attention.filter(a=>a.sev==="watch");
 /* Q suggestions follow the current situation; the full list stays one tap away. */
 const qSuggest:{label:string;prompt:string;ctx?:boolean}[]=[
  ...projects.filter(p=>p.deployment?.state==="ERROR").slice(0,1).map(p=>({label:`Investigate ${shortName(clean(p.name))}`,prompt:`${clean(p.name)}'s latest production build failed. Using the live snapshot, list the likely causes, what to check first and the fastest safe fix.`,ctx:true})),
  ...(overdue?[{label:"Review overdue priorities",prompt:"I have overdue tasks. Using my live task list, tell me which to do today, which to reschedule and which to drop, in that order.",ctx:true}]:[]),
  ...(news.some(n=>(n.impact??"").toLowerCase()==="high")?[{label:"Prepare an intelligence briefing",prompt:"Prepare a short intelligence briefing from today's high-impact Global Radar headlines for Angola, Lebanon and Global: what happened, why it matters for my ventures, one action.",ctx:true}]:[]),
  {label:"What matters most today?",prompt:"Review my live Q OS data. Identify the single most important priority today, explain why, and recommend the next action."},
  {label:"Portfolio review",prompt:"Give me a status update on all my projects: live status, blockers and the next action for each."}
 ].slice(0,4);
 const time=clock?clock.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"}):"";
 const date=clock?clock.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric",timeZone:"Africa/Luanda"}):"";

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


 /* ===================== Q LIVE: presentation layer (data + actions above are unchanged) ===================== */
 const [studio,setStudio]=useState<Studio>(DEFAULT_STUDIO);
 useEffect(()=>{setStudio(loadStudio());},[]);
 const setS=(p:Partial<Studio>)=>setStudio(s=>{const n={...s,...p};saveStudio(n);return n;});
 const [panel,setPanel]=useState<Panel|null>(null);
 const [qOpen,setQOpen]=useState(false);
 const [focusId,setFocusId]=useState<string|null>(null);
 const [region,setRegion]=useState<"All"|NewsStream>("All");
 const [sigType,setSigType]=useState<"all"|SigType>("all");
 const [card,setCard]=useState(0);
 const [toasts,setToasts]=useState<{id:number;msg:string;undo?:()=>void}[]>([]);
 const [stage,setStage]=useState({w:1440,h:900});
 const [arcOn,setArcOn]=useState(false);
 const [flashId,setFlashId]=useState("");
 const stageRef=useRef<HTMLElement>(null),pRef=useRef<HTMLDivElement>(null),stackRef=useRef<HTMLDivElement>(null),qInputRef=useRef<HTMLInputElement>(null),addDateRef=useRef<HTMLInputElement>(null);
 const motion=studio.motion;

 useEffect(()=>{const el=stageRef.current;const read=()=>setStage({w:window.innerWidth,h:window.innerHeight});read();
  const ro=el?new ResizeObserver(read):null;if(el&&ro)ro.observe(el);window.addEventListener("resize",read);
  const t=window.setTimeout(()=>setArcOn(true),120);return()=>{ro?.disconnect();window.removeEventListener("resize",read);window.clearTimeout(t);};},[]);
 /* Keep the page background (overscroll, notch areas) in the Studio theme. */
 useEffect(()=>{const bg={obsidian:"#090A0E",aurora:"#0A0B1D",graphite:"#161718",light:"#F3F1EC"}[studio.theme];const prev=document.body.style.background;document.body.style.background=bg;return()=>{document.body.style.background=prev;};},[studio.theme]);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==="Escape"){setPanel(null);setQOpen(false);setFocusId(null);}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[]);
 useEffect(()=>{if(qOpen&&window.innerWidth>860)qInputRef.current?.focus({preventScroll:true});},[qOpen]);

 const toast=useCallback((msg:string,undo?:()=>void)=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg,undo}]);window.setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4800);},[]);
 const flash=(id:string)=>{setFlashId(id);window.setTimeout(()=>setFlashId(""),1300);};
 const openQ=(prompt?:string)=>{setPanel(null);setQOpen(true);if(prompt)askQ(prompt);};
 /* One place decides where an action link goes: in-app panels, anchors, or the real external page. */
 const go=(href:string)=>{
  if(href==="#agenda")setPanel("priorities");
  else if(href==="#markets"){setPanel(null);if(window.innerWidth<=860){const i=stackOrder.indexOf("mkt");if(i>=0)goCard(i);}else flash("mkt");}
  else if(href==="/alerts")setPanel("alerts");
  else if(/^https?:/.test(href))window.open(href,"_blank","noopener");
  else window.location.href=href;
 };

 const greet=clock?(clock.getHours()<12?"Good morning":clock.getHours()<18?"Good afternoon":"Good evening"):"Welcome back";
 const hm=useCountUp(health??0,motion!=="off");
 const nodes=useMemo<ONode[]>(()=>{
  const fromRegistry=projects.map(p=>{
   const app=apps?.find(a=>a.id===p.vercel)??(p.url?apps?.find(a=>a.url===p.url):undefined);
   const st=p.deployment?.state;
   const state:ONode["state"]=st==="READY"?"ok":st==="ERROR"?"crit":st==="BUILDING"||st==="QUEUED"||st==="INITIALIZING"?"dep":"idle";
   const name=p.name==="NASSIM AI HQ / Q"?"NASSIM AI HQ":clean(p.name);
   return {id:p.id,name,area:p.area,state,url:p.url??app?.url??null,icon:app?.icon??null,logo:LOGOS[p.name]??null,pages:app?.pages??[],
    updated:p.lastCommit?.date??null,deployAt:p.deployment?.created??null,inspector:p.deployment?.inspectorUrl??null,issues:p.openIssues,commit:p.lastCommit?.message??null,commitUrl:p.lastCommit?.url??null,repo:p.repo};
  });
  const extra=(apps??[]).filter(a=>a.url&&!projects.some(p=>p.vercel===a.id||(!!p.url&&p.url===a.url))).map(a=>({id:a.id,
   name:a.name.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()),area:"App",state:(a.state==="ERROR"?"crit":a.state==="READY"||a.state==="EXTERNAL"?"ok":"idle") as ONode["state"],
   url:a.url,icon:a.icon??null,logo:null,pages:a.pages??[],updated:null,deployAt:null,inspector:null,issues:null,commit:null,commitUrl:null,repo:null}));
  return [...fromRegistry,...extra];
 },[projects,apps]);
 const liveCount=nodes.filter(n=>n.state==="ok").length;
 const focus=focusId?nodes.find(n=>n.id===focusId)??null:null;

 /* ---------- Orbit geometry (desktop) ---------- */
 const isWide=stage.w>860;
 const {cx,cy,RX,RY,placed}=orbitLayout(nodes,stage.w,stage.h);
 const fpos=focus?placed.find(p=>p.n.id===focus.id)??null:null;
 const worldTransform=fpos?`translate(${-170-fpos.x*1.12}px,${-fpos.y*1.12}px) scale(1.12)`:"none";
 const S2=Math.max(RX,RY)+180,C=2*Math.PI*78;
 const glow=critical.length?"rgba(241,45,67,.26)":watch.length?"rgba(233,162,59,.22)":"rgba(var(--accent-rgb),.22)";

 /* Signal particles travel along the spokes into Q (decorative; off with Motion: Off or reduced motion). */
 useEffect(()=>{
  if(!isWide||motion==="off"||!placed.length)return;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const layer=pRef.current;if(!layer)return;
  const spawn=(p:typeof placed[number],cls:string,out:boolean)=>{
   const el=document.createElement("div");el.className="particle"+(cls?" "+cls:"");
   const ex=Math.cos(p.ang)*86,ey=Math.sin(p.ang)*86;
   el.style.setProperty("offset-path",`path('${out?`M ${ex} ${ey} L ${p.x} ${p.y}`:`M ${p.x} ${p.y} L ${ex} ${ey}`}')`);
   layer.appendChild(el);
   const an=el.animate([{offsetDistance:"0%",opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.85},{offsetDistance:"100%",opacity:0}],{duration:motion==="calm"?3600:2200,easing:"cubic-bezier(.4,0,.2,1)"});
   an.onfinish=()=>{el.remove();if(!out&&motion==="full"){const r=document.createElement("div");r.className="ripple";layer.appendChild(r);r.animate([{transform:"scale(.9)",opacity:.7},{transform:"scale(1.5)",opacity:0}],{duration:1400,easing:"ease-out"}).onfinish=()=>r.remove();}};
  };
  const tick=()=>{if(document.visibilityState!=="visible")return;const ok=placed.filter(p=>p.n.state!=="crit");const p=ok[Math.floor(Math.random()*ok.length)];if(p)spawn(p,p.n.name.startsWith("XAU")?"gold":"",false);
   const bad=placed.find(q=>q.n.state==="crit");if(bad&&Math.random()<.35)spawn(bad,"red",true);};
  const t=window.setInterval(tick,motion==="calm"?2600:1500);return()=>{window.clearInterval(t);layer.replaceChildren();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[isWide,motion,nodes,RX,RY,cx,cy]);

 /* ---------- Signals: one stream for attention, Global Radar, markets and system activity ---------- */
 const sigs=useMemo<Sig[]>(()=>{
  const seen=new Set<string>();
  const radar=news.filter(n=>{const k=(n.url||n.title).toLowerCase();if(seen.has(k))return false;seen.add(k);return true;})
   .map(n=>({id:"n"+n.id,type:"radar" as const,sev:"info" as const,region:n.geography,src:n.publisher??"Source",title:n.title,t:Date.parse(n.published_at??n.retrieved_at)||null,news:n,impact:n.impact??null,cat:(n.category??"general").replace(/_/g," ")}));
  const sys=activity.filter(a=>a.src==="GitHub").map((a,i)=>{const [app,...rest]=a.title.split(" — ");return {id:"s"+i,type:"sys" as const,sev:"ok" as const,src:app,title:rest.join(" — ")||a.title,t:a.t,href:a.href||undefined,cat:"Deploy"};});
  const mk=gold&&Math.abs(gold.value.changePct)<1.5?[{id:"gold",type:"mk" as const,sev:(Math.abs(gold.value.changePct)>=1.5?"watch":"info") as Sig["sev"],src:"XAU/USD",title:`Gold ${gold.value.changePct>=0?"up":"down"} ${Math.abs(gold.value.changePct).toFixed(2)}% today`,t:Date.parse(gold.updatedAt),cat:"Markets",gold:true}]:[];
  return [...radar,...sys,...mk].sort((a,b)=>(b.t??0)-(a.t??0));
 },[news,activity,gold]);
 const pinned:Sig[]=attention.map(a=>({id:"a"+a.id,type:"attn",sev:a.sev==="critical"?"crit":a.sev,src:a.app,title:a.title,sub:a.advice,t:null,href:a.href,action:a.action,when:a.when,cat:a.sev==="critical"?"Critical":a.sev==="watch"?"Watch":"Info"}));
 const shown=(s:Sig)=>!studio.sigHidden.includes(s.type)&&(sigType==="all"||s.type===sigType)&&(region==="All"||s.type!=="radar"||s.region===region)&&(region==="All"||s.type==="radar"||s.type==="attn");
 const pinnedShown=pinned.filter(shown),feedShown=sigs.filter(shown).slice(0,40);

 /* ---------- Phone Smart Stack ---------- */
 const stackOrder=studio.stackOrder.filter(k=>!studio.stackHidden.includes(k));
 const goCard=(i:number)=>{const st=stackRef.current,c=st?.children[i] as HTMLElement|undefined;if(!st||!c)return;st.scrollTo({left:c.offsetLeft-16,behavior:motion==="off"?"auto":"smooth"});setCard(i);};
 const onStackScroll=()=>{const st=stackRef.current,c=st?.firstElementChild as HTMLElement|null;if(!st||!c)return;const i=Math.round(st.scrollLeft/(c.offsetWidth+10));if(i!==card)setCard(i);};

 async function addTask(e:FormEvent){e.preventDefault();const title=newTask.trim();if(!title)return;
  const r=await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,priority:newPri,...(newDue?{due:newDue}:{}),...(newRecur?{recur:newRecur}:{})})});
  if(r.ok){setNewTask("");setNewDue("");setNewRecur("");setNewPri("normal");loadTasks();toast(`Added “${title.slice(0,40)}”`);}else setTaskErr((await r.json().catch(()=>({}))).error??"Could not save");}
 async function complete(t:Task){await toggleT(t);if(!t.done)toast(`Done · ${t.title.slice(0,36)}`,()=>{toggleT({...t,done:true});});}
 async function snooze(t:Task){await snoozeT(t,1);toast(`Snoozed “${t.title.slice(0,30)}” to tomorrow`);}
 async function signOut(){await fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});try{if("caches" in window)await Promise.all((await caches.keys()).map(k=>caches.delete(k)));}catch{}window.location.replace("/login");}
 const pickDue=()=>{const el=addDateRef.current;if(!el)return;try{el.showPicker();}catch{el.focus();}};

 const cmdActions=[
  {label:"Ask Q for today's priorities",detail:"Strategic briefing from live data",run:()=>openQ("Review my live Q OS dashboard data. Identify the single most important priority today, explain why, and recommend the next action.")},
  {label:"What matters in today’s news?",detail:"Analyse latest Angola, Lebanon and Global headlines",run:async()=>{setQOpen(true);const r=await fetch("/api/iq/q-news?stream=All",{cache:"no-store"});if(!r.ok)return;const j=await r.json();const headlines=(j.items??[]).slice(0,18).map((x:NewsItem)=>x.geography+" | "+x.title+" | "+(x.publisher??"Unknown source")+" | "+x.url);askQ("What matters in today’s news? Analyse only these latest Q News headlines. Identify the 3 most consequential developments, implications, risks and actions. Separate facts from inference.\n"+headlines.join("\n"));}},
  {label:"Run system checks",detail:"Refresh alerts and project telemetry",run:()=>{fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"check"})}).then(()=>{refresh();toast("Checks complete");});}},
  {label:"Open applications",detail:"Every app, status and page",run:()=>setPanel("apps")},
  {label:"Open priorities",detail:"Add, edit, complete, snooze",run:()=>setPanel("priorities")},
  {label:"Open alerts",detail:"Push, gold levels, history",run:()=>setPanel("alerts")},
  {label:"Open Studio",detail:"Theme, accent, cards, motion, sections",run:()=>setPanel("studio")},
  {label:studio.theme==="light"?"Switch to dark (Obsidian)":"Switch to Light Executive",detail:"Theme",run:()=>setS({theme:studio.theme==="light"?"obsidian":"light"})}
 ];
 const cq=commandQuery.trim().toLowerCase();
 const cmdShown=cmdActions.filter(x=>(x.label+" "+x.detail).toLowerCase().includes(cq));
 const appShown=nodes.filter(n=>n.name.toLowerCase().includes(cq)).slice(0,6);
 const runCommand=(e:FormEvent)=>{e.preventDefault();const q=commandQuery.trim();if(!q)return;setCommandOpen(false);
  if(cmdShown[0])cmdShown[0].run();else if(appShown[0]){if(appShown[0].url)window.open(appShown[0].url,"_blank","noopener");else setPanel("apps");}else openQ(q);};

 /* ---------- Shared bits ---------- */
 const sevTag=(s:"crit"|"watch"|"info"|"ok",label?:string)=><span className={`tag ${s}`}><I n={s==="crit"?"alert":s==="watch"?"clock":s==="ok"?"check":"info"}/>{label??(s==="crit"?"Critical":s==="watch"?"Watch":s==="ok"?"OK":"Info")}</span>;
 const statusText=(n:ONode)=>n.state==="ok"?"Operational":n.state==="crit"?"Build failed":n.state==="dep"?"Deploying":"Unverified";
 const priMeta=(t:Task)=>{const td=today();if(t.due&&t.due<td)return <span className="pm od"><I n="clock"/>Overdue</span>;
  if(t.due===td)return <span className={`pm${t.priority==="high"?" hi":""}`}>{t.priority==="high"&&<I n="up"/>}{t.dueTime??"Today"}{t.recur&&<I n="repeat"/>}</span>;
  return <span className={`pm${t.priority==="high"?" hi":""}`}>{t.priority==="high"&&<I n="up"/>}{t.priority==="high"&&!t.due?"High":t.due?new Date(t.due+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):""}{t.recur&&<><I n="repeat"/>{t.recur}</>}</span>;};
 const priRow=(t:Task,phone=false)=><div key={t.id} className={`pri${t.done?" done":""}`}>
   {phone?<span className="chk-wrap"><button className="chk press" role="checkbox" aria-checked={t.done} aria-label={`Complete ${t.title}`} onClick={()=>complete(t)}><I n="check"/></button></span>
    :<button className="chk press" role="checkbox" aria-checked={t.done} aria-label={`Complete ${t.title}`} onClick={()=>complete(t)}><I n="check"/></button>}
   <span className="pt" title={t.title}>{t.title}</span>{priMeta(t)}
   <button className="snz press" onClick={()=>snooze(t)} aria-label={`Snooze ${t.title} one day`} title="Snooze 1 day"><I n="clock"/></button></div>;
 const addRow=(phone=false)=><form className="addrow" onSubmit={addTask}><I n="plus"/>
   <input type="text" value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a priority…" aria-label="Add a priority" maxLength={160} enterKeyHint="done"/>
   {!phone&&<><button type="button" className={`tg press${newDue?" set":""}`} onClick={pickDue} aria-label="Due date" title="Due date">{newDue?new Date(newDue+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):<I n="cal"/>}<input ref={addDateRef} type="date" value={newDue} onChange={e=>setNewDue(e.target.value)} tabIndex={-1} aria-hidden="true"/></button>
   <button type="button" className={`tg press${newPri!=="normal"?" set":""}`} onClick={()=>setNewPri(p=>p==="normal"?"high":p==="high"?"low":"normal")} aria-label={`Priority ${newPri}`} title={`Priority: ${newPri}`}>{newPri==="high"?<I n="up"/>:newPri==="low"?<I n="down"/>:<I n="flag"/>}</button></>}
  </form>;
 const goldSeries=gold?.value.series??[];
 const sparkD=(w:number,h:number)=>goldSeries.length>1?spark(goldSeries,w,h):"";
 const goldUp=(gold?.value.changePct??0)>=0;
 const headline=!data?<>{greet}, Nassim. <em>Reading your ecosystem…</em></>
  :critical.length?<>{greet}, Nassim. <em>{critical.length===1?"One thing needs you":`${critical.length} things need you`}:</em> {critical[0].title.replace(" production build failed","’s build failed")}.{attention.length===critical.length?" Everything else is calm.":` ${attention.length-critical.length} more to watch.`}</>
  :attention.length?<>{greet}, Nassim. <em>Nothing critical.</em> {attention.length} item{attention.length===1?"":"s"} to watch today.</>
  :<>{greet}, Nassim. <em>All clear.</em> Every system is running.</>;
 const nextBtn=(cls="sm")=>attention[0]||firstTask
  ?<button className={`btn ${cls} press ${critical.length?"danger":"primary"}`} onClick={()=>go(nextAction.href)}>{nextAction.action}<I n="arrow"/></button>
  :<Link className={`btn ${cls} primary press`} href="/brief">Open brief<I n="arrow"/></Link>;
 const verifiedPct=projects.length?Math.round(verified/projects.length*100):null;
 const trendEl=trend!==null&&trend!==0?<span className={trend>0?"up":"down"}>{trend>0?"▲":"▼"} {Math.abs(trend)}</span>:null;
 const bellCount=attention.length;

 const sigRow=(s:Sig)=><div key={s.id} className={`sig ${s.type==="attn"?s.sev:s.type}`}>
   <span className="ic"><I n={s.type==="attn"?(s.sev==="crit"?"alert":s.sev==="watch"?"clock":"info"):s.type==="radar"?"globe":s.type==="mk"?"chart":"activity"}/></span>
   <div style={{minWidth:0}}>
    <div className="mt">{s.type==="attn"?sevTag(s.sev):s.type==="radar"?<span className="tag info">{s.region}</span>:s.type==="mk"?<span className="tag watch">Markets</span>:<span className="tag ok">System</span>}
     <span className="src">{s.src}</span>{s.type==="radar"&&<span style={{textTransform:"capitalize"}}>{s.cat}</span>}<time>{s.t?ago(s.t):s.when}</time></div>
    {s.news?<button className="h" onClick={()=>setSelectedNews(String(s.news!.id))}><h4>{s.title}</h4></button>
     :s.href&&s.type==="sys"?<a className="h" href={s.href} target="_blank" rel="noreferrer"><h4>{s.title}</h4></a>:<h4>{s.title}</h4>}
    {s.sub&&<p className="sub">{s.sub}</p>}
    {s.type==="radar"&&s.impact&&<span className={`imp${s.impact.toLowerCase()==="high"?" hi":""}`}>{s.impact.toLowerCase()==="high"&&"▲ "}{s.impact.charAt(0).toUpperCase()+s.impact.slice(1).toLowerCase()} impact</span>}
    {s.gold&&gold&&<div className="mini"><b className="num">{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</b><span className={goldUp?"up":"down"}>{goldUp?"▲":"▼"} {Math.abs(gold.value.changePct).toFixed(2)}%</span><svg viewBox="0 0 96 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={sparkD(96,24)} fill="none" stroke={goldUp?"var(--ok)":"var(--watch)"} strokeWidth="1.5"/></svg></div>}
    {s.type==="attn"&&s.href&&<div className="acts"><button className={`btn sm press ${s.sev==="crit"?"danger":""}`} onClick={()=>go(s.href!)}>{s.action}</button>{s.sev==="crit"&&<button className="btn sm press" onClick={()=>openQ(`${s.title}. Using the live snapshot, list the likely causes, what to check first and the fastest safe fix.`)}><I n="spark"/>Ask Q</button>}</div>}
   </div></div>;
 const feedBody=<>
  {pinnedShown.length>0&&<><div className="fgroup"><span>Needs you</span><span className="num">{pinnedShown.length}</span></div>{pinnedShown.map(sigRow)}</>}
  {(!studio.sigHidden.includes("radar"))&&(sigType==="all"||sigType==="radar")&&newsError&&<div className="sig info"><span className="ic"><I n="alert"/></span><div><h4>Global Radar could not load</h4><p className="sub">{newsError}</p><div className="acts"><button className="btn sm press" onClick={refreshNews} disabled={newsRefreshing}>{newsRefreshing?"Retrying…":"Retry"}</button></div></div></div>}
  <div className="fgroup"><span>Latest</span><span className="num">{feedShown.length}</span></div>
  {newsLoading&&!news.length&&(sigType==="all"||sigType==="radar")?[0,1,2].map(i=><div key={i} className="sig"><span className="ic"/><div><span className="skel" style={{width:"40%"}}/><span className="skel" style={{width:"90%",marginTop:8}}/></div></div>)
   :feedShown.length?feedShown.map(sigRow):<p className="feed-empty">{region!=="All"?`No ${region} intelligence right now. Try another stream or refresh.`:"Nothing new. Q is watching."}</p>}
 </>;
 const typeChips:[("all"|SigType),string][]=[["all","All types"],["attn","Attention"],["radar","Radar"],["mk","Markets"],["sys","System"]];

 /* ---------- Phone moments ---------- */
 const crit0=critical[0],critNode=nodes.find(n=>n.state==="crit");
 const moment=(k:StackCard)=>{
  if(k==="crit")return crit0?<article key={k} className="moment m-crit" aria-label={`Needs you: ${crit0.title}`}>
    <div className="mh">{sevTag("crit")}<span className="num" style={{fontSize:12.5,color:"var(--text-2)"}}>{crit0.when}</span></div>
    <div className="aq">{critNode?<AppMark n={critNode} big/>:<span className="mono">!</span>}<div><b>{critNode?.name??crit0.app}</b><small>{crit0.app}</small></div></div>
    <h2>{crit0.title.replace(/^.*? production build failed$/,"Production build failed.")}{/production build failed/.test(crit0.title)?" Releases are blocked.":""}</h2>
    <dl className="stats3"><div><dt>Apps live</dt><dd className="num">{liveCount}/{nodes.length}</dd></div><div><dt>Health</dt><dd className="num">{health??"—"}</dd></div><div><dt>Open for</dt><dd className="num">{crit0.when?crit0.when.replace(" ago",""):"—"}</dd></div></dl>
    <div className="qnote"><I n="spark"/><span><b>Q:</b> {liveCount} other app{liveCount===1?" is":"s are"} unaffected. {crit0.advice}.</span></div>
    <div className="grow"/>
    <div className="m-acts"><button className="btn danger press" onClick={()=>go(crit0.href)}>{crit0.action}<I n="arrow"/></button><button className="btn press" onClick={()=>openQ(`${crit0.title}. Using the live snapshot, list the likely causes, what to check first and the fastest safe fix.`)}><I n="spark"/>Ask Q</button><button className="btn press" onClick={()=>setPanel("alerts")}><I n="bell"/>Alerts</button></div>
   </article>
   :<article key={k} className="moment m-clear" aria-label="All clear">
    <div className="mh">{sevTag("ok","All clear")}<span style={{fontSize:12.5,color:"var(--text-2)"}}>{time}</span></div>
    <h2>{attention.length?<>Nothing critical. <em>{attention.length} to watch.</em></>:<>Everything is running. <em>Nothing needs you.</em></>}</h2>
    <dl className="stats3"><div><dt>Apps live</dt><dd className="num">{data?`${liveCount}/${nodes.length}`:"—"}</dd></div><div><dt>Health</dt><dd className="num">{health??"—"}</dd></div><div><dt>Watch</dt><dd className="num">{watch.length}</dd></div></dl>
    <div className="qnote"><I n="spark"/><span><b>Q:</b> {qSuggest[0]?.label??"Ask me anything"}.</span></div>
    <div className="grow"/>
    <div className="m-acts"><button className="btn primary press" onClick={()=>openQ(qSuggest[0]?.prompt)}><I n="spark"/>{qSuggest[0]?.label??"Ask Q"}</button></div>
   </article>;
  if(k==="brief")return <article key={k} className="moment m-brief" aria-label="Q briefing">
    <div className="mh"><span className="ey"><img src="/os/q-emblem.webp" alt="" width={20} height={20}/>Q briefing · {time}</span><span className={`live${online?"":" off"}`}><i/>{online?"Live":"Offline"}</span></div>
    <h2>{headline}</h2>
    <div className="radar-mini">{attention.filter(a=>a.sev!=="critical").slice(0,2).map(a=><div key={a.id}><I n={a.sev==="watch"?"clock":"chart"}/><span><b>{a.title}</b>{a.when?` · ${a.when}`:""}</span></div>)}</div>
    <div className="grow"/>
    <dl className="rows">
     <div className="r"><dt>Ecosystem</dt><dd><b className="num">{health??"—"}</b>/100 {trendEl} <span className="sub">· {liveCount}/{nodes.length} live</span></dd></div>
     <div className="r"><dt>Needs you</dt><dd>{attention[0]?.title??"Nothing urgent"}</dd></div>
     <div className="r"><dt>Next action</dt><dd>{nextBtn("sm")}</dd></div>
    </dl></article>;
  if(k==="today"){const doneN=(tasks??[]).filter(t=>t.done).length,all=open.length+doneN;
   return <article key={k} className="moment m-today" aria-label="Today's priorities">
    <div className="mh"><span className="ey">Today’s priorities</span><span className="num" style={{fontSize:12.5,color:"var(--muted)"}}>{open.length} open{overdue?` · ${overdue} late`:""}</span></div>
    <h2 style={{fontSize:27}}>{!tasks?"Loading…":focusTasks[0]?<>{open.length===1?"One thing.":`${open.length} things.`} <em>Start with {focusTasks[0].title.length>26?focusTasks[0].title.slice(0,26)+"…":focusTasks[0].title}.</em></>:<>A clear day. <em>Add what matters.</em></>}</h2>
    <div className="prog" aria-hidden="true"><i style={{width:`${all?Math.round(doneN/all*100):0}%`}}/></div>
    {taskErr&&<p className="banner err" style={{marginTop:8}}>{taskErr}</p>}
    <div className="list" style={{marginTop:6}}>{focusTasks.slice(0,4).map(t=>priRow(t,true))}</div>
    {focusTasks.length>4&&<button className="more-link" onClick={()=>setPanel("priorities")}>+{focusTasks.length-4} more</button>}
    <div className="grow"/>{addRow(true)}</article>;}
  if(k==="eco")return <article key={k} className="moment m-eco" aria-label="Ecosystem">
    <div className="mh"><span className="ey">Ecosystem · {nodes.length} apps</span><button className="btn sm ghost press" style={{height:36,marginRight:-8}} onClick={()=>setPanel("apps")}>All apps<I n="chev"/></button></div>
    <MiniOrbit nodes={nodes} health={health} onPick={id=>{setFocusId(id);setPanel("apps");}}/>
    <div className="legend"><span><span className="sdot"/>{liveCount} operational</span>{critical.length>0&&<span style={{color:"var(--crit-ink)"}}><I n="alert"/>{nodes.filter(n=>n.state==="crit").length} failing</span>}<span style={{marginLeft:"auto"}}>Data {verifiedPct??"—"}%</span></div></article>;
  if(k==="mkt")return <article key={k} className="moment m-mkt" aria-label="Markets: gold">
    <div className="mh"><span className="ey">Gold · XAU/USD</span><span style={{fontSize:12.5,color:"var(--muted)"}}>{gold?`updated ${ago(gold.updatedAt)}`:"no feed"}</span></div>
    {gold?<><div className="px"><b className="num">{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</b><span className={goldUp?"up":"down"}><I n={goldUp?"up":"down"}/>{Math.abs(gold.value.changePct).toFixed(2)}%</span></div>
     <Spark d={sparkD(300,130)} w={300} h={130} up={goldUp} id="m"/>
     <dl className="lv"><div><dt>Open</dt><dd className="num">{goldSeries[0]?.toFixed(1)??"—"}</dd></div><div><dt>Low</dt><dd className="num">{goldSeries.length?Math.min(...goldSeries).toFixed(1):"—"}</dd></div><div><dt>High</dt><dd className="num">{goldSeries.length?Math.max(...goldSeries).toFixed(1):"—"}</dd></div></dl></>
     :<p className="feed-empty">Waiting for Counter-Trader.</p>}
    <div className="grow"/>
    <button className="btn press" onClick={()=>setPanel("alerts")}><I n="bell"/>Price alerts</button></article>;
  return <article key={k} className="moment m-world" aria-label="World radar">
    <div className="mh"><span className="ey">Global Radar</span><button className="btn sm ghost press" style={{height:36,marginRight:-8}} onClick={refreshNews} disabled={newsRefreshing}>{newsRefreshing?"Refreshing…":"Refresh"}</button></div>
    <div className="seg" role="tablist" aria-label="Radar stream">{(["Angola","Lebanon","Global"] as NewsStream[]).map(r=><button key={r} role="tab" className="press" aria-selected={newsStream===r} onClick={()=>{setNewsStream(r);setNewsCategory("All");}}>{r}</button>)}</div>
    <div className="news">{newsLoading&&!news.length?[0,1,2].map(i=><div key={i} style={{padding:"12px 0"}}><span className="skel" style={{width:"35%"}}/><span className="skel" style={{width:"95%",marginTop:8}}/></div>)
     :newsError?<p className="feed-empty">{newsError}</p>
     :visibleNews.length?visibleNews.slice(0,4).map(n=><button key={n.id} onClick={()=>setSelectedNews(String(n.id))}><div className="mt"><span>{(n.category??"general").replace(/_/g," ")}</span>·<span>{n.publisher??"Source"} · {ago(n.published_at??n.retrieved_at)}</span>{n.impact&&<span style={{marginLeft:"auto",fontWeight:600,color:n.impact.toLowerCase()==="high"?"var(--crit-ink)":"var(--text-2)"}}>{n.impact.toLowerCase()==="high"?"▲ ":""}{n.impact}</span>}</div><h5>{n.title}</h5></button>)
     :<p className="feed-empty">No {newsStream} intelligence yet. Refresh to fetch the latest.</p>}</div></article>;
 };

 /* ---------- Drawer content ---------- */
 const drawerTitle:Record<Panel,[string,string]>={studio:["Studio","Make Q OS yours. Saved on this device."],apps:["Applications",`${liveCount} of ${nodes.length} operational`],alerts:["Alerts","Push, gold levels and recent alerts"],priorities:["Priorities",`${open.length} open${overdue?` · ${overdue} overdue`:""}${doneWeek!==null?` · ${doneWeek} done this week`:""}`],more:["More","Every Q OS destination"]};
 const ord=(key:"stackOrder",names:Record<string,string>,hiddenKey:"stackHidden")=><div className="ord">{studio[key].map((k,i)=>{const offK=studio[hiddenKey].includes(k);return <div key={k} className={`o${offK?" off":""}`}><span className="n num">{i+1}</span><span>{names[k]}</span>
   <button className="press" aria-label={`Move ${names[k]} up`} disabled={i===0} onClick={()=>{const a=[...studio[key]];[a[i-1],a[i]]=[a[i],a[i-1]];setS({[key]:a} as Partial<Studio>);}}><I n="up"/></button>
   <button className="press" aria-label={`Move ${names[k]} down`} disabled={i===studio[key].length-1} onClick={()=>{const a=[...studio[key]];[a[i+1],a[i]]=[a[i],a[i+1]];setS({[key]:a} as Partial<Studio>);}}><I n="down"/></button>
   <button className="press" aria-label={`${offK?"Show":"Hide"} ${names[k]}`} aria-pressed={!offK} onClick={()=>setS({[hiddenKey]:offK?studio[hiddenKey].filter(x=>x!==k):[...studio[hiddenKey],k]} as Partial<Studio>)}><I n={offK?"eyeoff":"eye"}/></button></div>;})}</div>;
 const seg=<K extends "cards"|"motion"|"density">(key:K,opts:[Studio[K],string][],label:string)=><div className="seg" role="group" aria-label={label} style={{marginTop:0}}>{opts.map(([v,l])=><button key={v} className="press" aria-pressed={studio[key]===v} onClick={()=>setS({[key]:v} as Partial<Studio>)}>{l}</button>)}</div>;
 const drawerBody=(p:Panel)=>{
  if(p==="studio")return <>
   <div className="st-sec"><h4>Theme</h4><div className="themes">{THEMES.map(t=><button key={t.id} className="th press" aria-pressed={studio.theme===t.id} onClick={()=>setS({theme:t.id})}>
     <span className="pv" style={{background:t.sw[0]}}><i style={{left:8,top:8,width:"42%",height:16,background:t.sw[1]}}/><i style={{left:8,top:30,width:"62%",height:16,background:t.sw[1]}}/><i style={{right:8,top:8,width:22,height:22,borderRadius:"50%",background:t.sw[2]}}/></span>
     <b>{t.name}<I n="check"/></b><small>{t.note}</small></button>)}</div></div>
   <div className="st-sec"><h4>Signature accent<span style={{textTransform:"none",letterSpacing:0,fontWeight:500}}>{ACCENTS.find(a=>a.id===studio.accent)?.name}</span></h4><div className="swatches">{ACCENTS.map(a=><button key={a.id} className="sw press" aria-pressed={studio.accent===a.id} aria-label={`Accent ${a.name}`} onClick={()=>setS({accent:a.id})}><i style={{background:a.hex,color:["halo","amber","emerald"].includes(a.id)?"#111":"#fff"}}><I n="check"/></i>{a.name}</button>)}</div></div>
   <div className="st-sec"><h4>Cards</h4>{seg("cards",[["glass","Glass"],["solid","Solid"],["outline","Outline"]],"Card style")}</div>
   <div className="st-sec"><h4>Motion</h4>{seg("motion",[["full","Full"],["calm","Calm"],["off","Off"]],"Motion")}</div>
   <div className="st-sec"><h4>Density</h4>{seg("density",[["comfortable","Comfortable"],["compact","Compact"]],"Density")}</div>
   <div className="st-sec"><h4>Phone Smart Stack</h4>{ord("stackOrder",STACK_NAMES,"stackHidden")}</div>
   <div className="st-sec"><h4>Signals feed</h4><div className="ord">{(Object.keys(SIG_NAMES) as SigType[]).map(k=>{const offK=studio.sigHidden.includes(k);return <div key={k} className={`o${offK?" off":""}`}><span>{SIG_NAMES[k]}</span><button className="switch" role="switch" aria-checked={!offK} aria-label={`Show ${SIG_NAMES[k]}`} onClick={()=>setS({sigHidden:offK?studio.sigHidden.filter(x=>x!==k):[...studio.sigHidden,k]})}/></div>;})}</div></div>
  </>;
  if(p==="apps")return <div className="applist">{nodes.map(n=><div key={n.id} className={`ap${flashId==="app-"+n.id?" flash":""}`}>
    <div className="ap-h"><span className="plate">{n.logo?<img src={n.logo} alt=""/>:<AppMark n={n}/>}</span><div className="tx"><b>{n.name}</b><small>{n.area} · {statusText(n)}{n.updated?` · ${ago(n.updated)}`:""}</small></div>
     {n.url&&<a className="btn sm press" href={n.url} target="_blank" rel="noreferrer">Open<I n="ext"/></a>}</div>
    {(n.pages.length>0||(n.state==="crit"&&n.inspector))&&<div className="pages">{n.state==="crit"&&n.inspector&&<a className="page press" style={{color:"var(--crit-ink)"}} href={n.inspector.startsWith("http")?n.inspector:`https://${n.inspector}`} target="_blank" rel="noreferrer">Build log<I n="ext"/></a>}{n.pages.map(pg=><a key={pg.url} className="page press" href={pg.url} target="_blank" rel="noreferrer">{pg.label}<I n="ext"/></a>)}</div>}
   </div>)}{!nodes.length&&<p className="feed-empty">{loading?"Loading applications…":error||"No applications found."}</p>}</div>;
  if(p==="alerts")return <><AlertsPanel goldPrice={gold?.value.price}/><Link className="btn press" style={{marginTop:14,width:"100%"}} href="/alerts">Full alert history<I n="arrow"/></Link></>;
  if(p==="priorities")return <div className="prilist">
   {taskErr&&<p className="banner err" style={{margin:"10px 0"}}>{taskErr}</p>}
   {(tasks??[]).filter(t=>!t.done).map(t=>editing?.id===t.id
    ?<form key={t.id} className="pedit" onSubmit={saveEdit}><input autoFocus value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})} maxLength={160} aria-label="Task title"/><input type="date" value={editing.due} onChange={e=>setEditing({...editing,due:e.target.value})} aria-label="Due date"/><button className="btn sm press" type="submit">Save</button></form>
    :<div key={t.id} className="pri"><button className="chk press" role="checkbox" aria-checked={false} aria-label={`Complete ${t.title}`} onClick={()=>complete(t)}><I n="check"/></button>
      <button className="pt" style={{textAlign:"left"}} onClick={()=>setEditing({id:t.id,title:t.title,due:t.due??""})} title="Edit">{t.title}</button>{priMeta(t)}
      <button className="snz press" onClick={()=>snooze(t)} aria-label={`Snooze ${t.title}`} title="Snooze 1 day"><I n="clock"/></button>
      <button className="snz press" onClick={()=>delT(t)} aria-label={`Delete ${t.title}`} title="Delete"><I n="trash"/></button></div>)}
   {tasks&&!open.length&&<p className="feed-empty">Nothing open. Add your first priority below.</p>}
   <div className="st-sec"><h4>Add</h4>{addRow()}
    <div className="seg" role="group" aria-label="Repeat" style={{marginTop:10}}>{([["","Once"],["daily","Daily"],["weekdays","Weekdays"],["weekly","Weekly"],["monthly","Monthly"]] as const).map(([v,l])=><button key={l} className="press" aria-pressed={newRecur===v} onClick={()=>setNewRecur(v)}>{l}</button>)}</div></div>
  </div>;
  return <div className="navlist">
   <button onClick={()=>{setPanel(null);window.scrollTo({top:0,behavior:"smooth"});}}><I n="home"/>Command centre<I n="chev" c="chev"/></button>
   <button onClick={()=>setPanel("apps")}><I n="grid"/>Applications<I n="chev" c="chev"/></button>
   <Link href="/iq/q-news"><I n="globe"/>Global Radar<I n="chev" c="chev"/></Link>
   <button onClick={()=>setPanel("priorities")}><I n="list"/>Priorities<I n="chev" c="chev"/></button>
   <button onClick={()=>openQ()}><I n="spark"/>Q Assistant<I n="chev" c="chev"/></button>
   <Link href="/chat"><I n="file"/>Q conversations<I n="chev" c="chev"/></Link>
   <Link href="/alerts"><I n="bell"/>Alerts history<I n="chev" c="chev"/></Link>
   <Link href="/brief"><I n="sunrise"/>Morning Brief<I n="chev" c="chev"/></Link>
   <Link href="/iq"><I n="map"/>AngolaIQ<I n="chev" c="chev"/></Link>
   <button onClick={()=>setPanel("studio")}><I n="sliders"/>Studio · Settings<I n="chev" c="chev"/></button>
   <button onClick={signOut} style={{color:"var(--crit-ink)"}}><I n="logout"/>Sign out</button>
  </div>;
 };

 return <div className="ql" data-theme={studio.theme} data-accent={studio.accent} data-cards={studio.cards} data-motion={motion} data-density={studio.density}>
  <svg width="0" height="0" style={{position:"absolute"}} aria-hidden="true"><defs>
   <linearGradient id="ql-hgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{stopColor:"var(--accent)"}}/><stop offset="1" stopColor="#A855F7"/></linearGradient>
   <linearGradient id="ql-up" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22C58B" stopOpacity=".28"/><stop offset="1" stopColor="#22C58B" stopOpacity="0"/></linearGradient>
   <linearGradient id="ql-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9A23B" stopOpacity=".3"/><stop offset="1" stopColor="#E9A23B" stopOpacity="0"/></linearGradient>
  </defs></svg>

  {/* ======================= DESKTOP ======================= */}
  <div className={`d-app${qOpen?" qopen":""}`}>
   <main className="stage" ref={stageRef} aria-label="Ecosystem orbit" onClick={e=>{if(e.target===e.currentTarget||(e.target as HTMLElement).classList.contains("stage-bg"))setFocusId(null);}}>
    <div className="stage-bg"/>
    {isWide&&<div className={`world${focus?" focusing":""}`} style={{left:cx,top:cy,transform:worldTransform}}>
     <svg className="rings" width={S2*2} height={S2*2} viewBox={`${-S2} ${-S2} ${S2*2} ${S2*2}`} style={{left:-S2,top:-S2}}>
      <ellipse className="ring faint" rx={RX+64} ry={RY+56}/><ellipse className="ring" rx={RX} ry={RY}/><ellipse className="ring faint" rx={RX*0.62} ry={RY*0.62}/>
      {placed.map(p=>p.n.state==="crit"
       ?<g key={p.n.id}><circle className="ghost-slot" cx={p.gx} cy={p.gy} r={7}/><line className="spoke" x1={p.gx} y1={p.gy} x2={p.x} y2={p.y} strokeDasharray="2 4"/><line className="tether" x1={Math.cos(p.ang)*86} y1={Math.sin(p.ang)*86} x2={p.x-Math.cos(p.ang)*58} y2={p.y-Math.sin(p.ang)*14}/></g>
       :<line key={p.n.id} className="spoke" x1={Math.cos(p.ang)*84} y1={Math.sin(p.ang)*84} x2={p.x} y2={p.y}/>)}
     </svg>
     <div ref={pRef} style={{position:"absolute",left:0,top:0}}/>
     <div className="core" role="button" tabIndex={0} style={{["--state-glow" as string]:glow} as React.CSSProperties} aria-label={`Q. Ecosystem health ${health??"unknown"} of 100, ${critical.length} critical. Open Q.`} onClick={()=>openQ()} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openQ();}}}>
      <div className="breath"/><div className="disc"/>
      <svg className="hr" viewBox="0 0 184 184" aria-hidden="true"><circle className="track" cx="92" cy="92" r="78"/><circle className="arc" cx="92" cy="92" r="78" strokeDasharray={C} strokeDashoffset={arcOn&&health!==null?C*(1-health/100):C}/></svg>
      <img src="/os/q-emblem.webp" alt="" width={86} height={86}/></div>
     <div className="health" style={{top:104}} title={healthParts.map(([l,v])=>`${l}: ${v??"—"}`).join(" · ")}><div className="big num">{health===null?"—":hm}<small>/100</small></div><div className="lbl">Ecosystem health{trend!==null&&trend!==0&&<> · <b className={trend>0?"up":"down"}>{trend>0?"▲ +":"▼ "}{Math.abs(trend)}</b></>}</div></div>
     {placed.map(p=><button key={p.n.id} className={`node press${p.n.state==="crit"?" crit":""}${focus?.id===p.n.id?" focus":""}`} style={{transform:`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}} aria-label={`${p.n.name}: ${statusText(p.n)}`} onClick={()=>setFocusId(p.n.id)}>
      {p.n.state==="crit"?<I n="alert" c="qwarn"/>:<span className={`sdot${p.n.state==="idle"?" idle":p.n.state==="dep"?" dep":""}`} aria-hidden="true"/>}
      <AppMark n={p.n}/>
      <span className="nm">{shortName(p.n.name)}</span></button>)}
     {placed.filter(p=>p.n.state==="crit").map(p=><div key={"f"+p.n.id} className="node-flag" style={{transform:`translate(${p.x}px,${p.y+34}px) translate(-50%,0)`}}><I n="alert"/>Build failed{p.n.deployAt?` · ${ago(p.n.deployAt)}`:""}</div>)}
     {!placed.length&&<div className="health" style={{top:150}}><div className="lbl">{loading?"Connecting to your ecosystem…":error||"No applications"}</div></div>}
    </div>}
    {focus&&fpos&&<section className="focus-card card cpad on" style={{left:cx-170+100+28,top:Math.max(84,cy-190)}} aria-live="polite">
     <button className="icon-btn press fc-x" aria-label="Close" onClick={()=>setFocusId(null)}><I n="x"/></button>
     <div className="fc-h"><span className="plate">{focus.logo?<img src={focus.logo} alt=""/>:<AppMark n={focus} big/>}</span><div><div className="t">{focus.name}</div><div className="c">{focus.area}</div></div></div>
     <dl className="fc-grid"><div><dt>Status</dt><dd>{focus.state==="crit"?sevTag("crit","Failed"):focus.state==="ok"?sevTag("ok","Live"):sevTag("watch",statusText(focus))}</dd></div>
      <div><dt>{focus.state==="crit"?"Failed":"Last deploy"}</dt><dd className="num">{focus.deployAt?ago(focus.deployAt):focus.updated?ago(focus.updated):"—"}</dd></div>
      <div><dt>Open issues</dt><dd className="num">{focus.issues??"—"}</dd></div><div><dt>Pages</dt><dd className="num">{focus.pages.length}</dd></div></dl>
     {focus.commit&&<p className="fc-msg">Latest: {focus.commitUrl?<a href={focus.commitUrl} target="_blank" rel="noreferrer" style={{textDecoration:"underline"}}>{focus.commit}</a>:focus.commit}</p>}
     {focus.pages.length>0&&<div className="pages">{focus.pages.map(pg=><a key={pg.url} className="page press" href={pg.url} target="_blank" rel="noreferrer">{pg.label}<I n="ext"/></a>)}</div>}
     <div className="fc-acts">{focus.state==="crit"&&focus.inspector?<a className="btn danger press" href={focus.inspector.startsWith("http")?focus.inspector:`https://${focus.inspector}`} target="_blank" rel="noreferrer">Open build log<I n="arrow"/></a>
      :focus.url?<a className="btn primary press" href={focus.url} target="_blank" rel="noreferrer">Open app<I n="ext"/></a>:null}
      <button className="btn press" onClick={()=>openQ(`How is ${focus.name} doing? Use the live snapshot: status, latest change, risks and the next action.`)}><I n="spark"/>Ask Q</button></div>
    </section>}
   </main>

   <header className="qtop">
    <div className="brand"><img src="/os/q-emblem.webp" alt="" width={28} height={28}/><span>Q OS</span><small>Live</small></div>
    <nav className="nav" aria-label="Primary">
     <button className="on press" onClick={()=>{setPanel(null);setFocusId(null);setQOpen(false);}}>Command centre</button>
     <button className="press" onClick={()=>setPanel("apps")}>Applications</button>
     <button className="press" onClick={()=>{setSigType("radar");flash("sig");}}>Global Radar</button>
     <button className="press" onClick={()=>setPanel("priorities")}>Priorities</button>
     <button className="press" onClick={()=>openQ()}>Q Assistant</button>
     <button className="press" onClick={()=>setPanel("alerts")}>Alerts</button>
     <Link className="press" href="/brief">Morning Brief</Link>
     <Link className="press" href="/iq">AngolaIQ</Link>
     <button className="press" onClick={()=>setPanel("studio")}>Settings</button>
    </nav>
    <div className="top-r">
     <span className="meta dt num">{date&&`${date.split(" ").slice(0,3).join(" ")} · ${time}`}</span>
     {weather&&<span className="meta"><I n={weather.code<3?"sun":"cloud"}/>Luanda {weather.t}°</span>}
     <button className="icon-btn press" aria-label="Search or command (Ctrl K)" title="Search or command · Ctrl K" onClick={()=>{setCommandQuery("");setCommandOpen(true);}}><I n="search"/></button>
     <button className="icon-btn press" aria-label="Studio: personalise Q OS" title="Studio" onClick={()=>setPanel("studio")}><I n="sliders"/></button>
     <button className="icon-btn press" aria-label={`Alerts, ${bellCount} need attention`} onClick={()=>setPanel("alerts")}><I n="bell"/>{bellCount>0&&<b className="badge">{bellCount}</b>}</button>
     <button className="qav press" aria-label="More and sign out" onClick={()=>setPanel("more")}>N</button>
    </div>
   </header>

   <aside className="qpanel left" aria-label="Briefing and today">
    {(!online||error||metricsError)&&<p className={`banner ${!online?"wn":"err"}`}>{!online?"Offline: showing the last saved data.":error||metricsError}</p>}
    <section className="card cpad brief">
     <div className="chead"><span className="ey"><img src="/os/q-emblem.webp" alt="" width={22} height={22}/>Q briefing · {time}</span><span className={`live${online?"":" off"}`}><i/>{online?"Live":"Offline"}</span></div>
     <h1>{headline}</h1>
     <dl className="rows">
      <div className="r"><dt>Ecosystem</dt><dd><b className="num">{health??"—"}</b>/100 {trendEl} <span className="sub">· {data?`${liveCount} of ${nodes.length} live`:"checking"}</span></dd></div>
      <div className="r"><dt>Needs you</dt><dd>{attention[0]?<>{attention[0].title.replace(" production build failed"," build failed").replace(/^Overdue: /,"")}{attention[0].when&&<span className="sub"> · {attention[0].when}</span>}</>:"Nothing urgent"}</dd></div>
      <div className="r"><dt>Next action</dt><dd>{nextBtn()}</dd></div>
     </dl>
     <div className="foot"><I n="spark"/><span>{activityCount} events · {conversationCount} chats in 24h{verifiedPct!==null?` · data verified ${verifiedPct}%`:""}</span></div>
    </section>
    <section className={`card cpad today${flashId==="today"?" flash":""}`}>
     <div className="chead"><span className="ey">Today</span><button style={{fontSize:12,color:"var(--muted)"}} className="num" onClick={()=>setPanel("priorities")}>{tasks?`${open.length} open${overdue?` · ${overdue} late`:""}`:"…"}</button></div>
     {taskErr&&<p className="banner err" style={{marginTop:8}}>{taskErr}</p>}
     <div className="list">{focusTasks.slice(0,5).map(t=>priRow(t))}{tasks&&!focusTasks.length&&<p className="feed-empty" style={{padding:"12px 0"}}>A clear day. Add what matters.</p>}</div>
     {focusTasks.length>5&&<button className="more-link" onClick={()=>setPanel("priorities")}>+{focusTasks.length-5} more priorities</button>}
     {addRow()}
    </section>
    <section className={`card cpad mkt${flashId==="mkt"?" flash":""}`} id="markets">
     <div className="chead"><span className="ey">Gold · XAU/USD</span><span style={{fontSize:12,color:"var(--muted)"}}>{gold?ago(gold.updatedAt):""}</span></div>
     {gold?<><div className="px"><b className="num">{gold.value.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</b><span className={goldUp?"up":"down"}><I n={goldUp?"up":"down"}/>{Math.abs(gold.value.changePct).toFixed(2)}% today</span></div>
      <Spark d={sparkD(300,56)} w={300} h={56} up={goldUp} id="d"/>
      <div className="lv"><span>Open <b className="num">{goldSeries[0]?.toFixed(1)??"—"}</b></span><span>Low <b className="num">{goldSeries.length?Math.min(...goldSeries).toFixed(1):"—"}</b></span><button onClick={()=>setPanel("alerts")} style={{color:"var(--accent-ink)",fontSize:12}}>Price alerts</button></div></>
      :<p className="feed-empty">Waiting for Counter-Trader.</p>}
    </section>
   </aside>

   <aside className="qpanel right" aria-label="Signals">
    <section className={`card signals${flashId==="sig"?" flash":""}`}>
     <div className="shead">
      <div className="chead"><h2>Signals <span className={`live${online?"":" off"}`}><i/>{online?"Live":"Offline"}</span></h2><button style={{fontSize:12,color:"var(--muted)"}} onClick={refreshNews} disabled={newsRefreshing} title="Refresh Global Radar">{newsRefreshing?"Refreshing…":`${pinnedShown.length+feedShown.length} signals`}</button></div>
      <div className="seg" role="group" aria-label="Region">{(["All","Angola","Lebanon","Global"] as const).map(r=><button key={r} className="press" aria-pressed={region===r} onClick={()=>{setRegion(r);if(r!=="All")setNewsStream(r);}}>{r}</button>)}</div>
      <div className="chips" role="group" aria-label="Type">{typeChips.filter(([k])=>k==="all"||!studio.sigHidden.includes(k as SigType)).map(([k,l])=><button key={k} className="chip press" aria-pressed={sigType===k} onClick={()=>setSigType(k)}>{l}</button>)}</div>
     </div>
     <div className="feed">{feedBody}</div>
    </section>
   </aside>
  </div>

  {/* ======================= PHONE ======================= */}
  <div className="m-app">
   <div className="m-bg"/>
   <header className="m-head">
    <img src="/os/q-emblem.webp" alt="Q OS" width={36} height={36}/>
    <div className="tx"><b>{greet}, Nassim</b><span className="num">{date&&`${date.split(" ").slice(0,3).join(" ")} · ${time}`}{weather?` · Luanda ${weather.t}°`:""}</span></div>
    <button className="icon-btn press" aria-label="Search or command" onClick={()=>{setCommandQuery("");setCommandOpen(true);}}><I n="search"/></button>
    <button className="icon-btn press" aria-label="Studio: personalise Q OS" onClick={()=>setPanel("studio")}><I n="sliders"/></button>
   </header>
   {(!online||error||metricsError)&&<div className="m-banner"><p className={`banner ${!online?"wn":"err"}`}>{!online?"Offline: showing the last saved data.":error||metricsError}</p></div>}
   <div className="m-status" aria-label="Ecosystem status">
    <span className="pill"><span className="sdot"/><b className="num">{health??"—"}</b> health {trendEl}</span>
    <span className="pill"><b className="num">{data?`${liveCount}/${nodes.length}`:"—"}</b> live</span>
    {critical.length>0&&<span className="pill crit"><I n="alert"/><b>{critical.length} critical</b></span>}
    <span className="pill"><b className="num">{watch.length}</b> watch</span>
    {gold&&<span className="pill"><b className="num">{gold.value.price.toFixed(0)}</b> gold <span className={goldUp?"up":"down"}>{goldUp?"+":""}{gold.value.changePct.toFixed(1)}%</span></span>}
   </div>
   <div className="stack" ref={stackRef} onScroll={onStackScroll} aria-roledescription="carousel" aria-label="Smart Stack">{stackOrder.map(moment)}</div>
   <div className="pager"><div className="dots" role="tablist" aria-label="Smart Stack cards">{stackOrder.map((k,i)=><button key={k} role="tab" aria-label={STACK_NAMES[k]} aria-current={i===card} onClick={()=>goCard(i)}><i/></button>)}</div>
    <div className="lbl">{stackOrder[card]&&<><b>{STACK_NAMES[stackOrder[card]]}</b><span className="num">{card+1} of {stackOrder.length}</span></>}</div></div>
   <section className="card m-sig" aria-label="Signals">
    <div className="chead"><h3>Signals <span className={`live${online?"":" off"}`}><i/>{online?"Live":"Offline"}</span></h3><span className="num" style={{fontSize:12.5,color:"var(--muted)"}}>{pinnedShown.length+feedShown.length}</span></div>
    <div className="chips" role="group" aria-label="Filter signals">
     {typeChips.filter(([k])=>k==="all"||!studio.sigHidden.includes(k as SigType)).map(([k,l])=><button key={k} className="chip press" aria-pressed={sigType===k} onClick={()=>setSigType(k)}>{l}</button>)}<span className="sep"/>
     {(["All","Angola","Lebanon","Global"] as const).map(r=><button key={"r"+r} className="chip press" aria-pressed={region===r} onClick={()=>{setRegion(r);if(r!=="All")setNewsStream(r);}}>{r==="All"?"All regions":r}</button>)}
    </div>
    <div className="feed">{feedBody}</div>
   </section>
   <nav className="tabbar" aria-label="Tabs">
    <button className="press" aria-current={!panel&&!qOpen?"page":undefined} onClick={()=>{setPanel(null);setQOpen(false);window.scrollTo({top:0,behavior:"smooth"});goCard(0);}}><I n="home"/>Today</button>
    <button className="press" aria-current={panel==="apps"?"page":undefined} onClick={()=>setPanel("apps")}><I n="grid"/>Apps</button>
    <button className="orb press" aria-label="Ask Q" onClick={()=>openQ()}><span className="ob"><img src="/os/q-emblem.webp" alt="" width={40} height={40}/></span><span>Ask Q</span></button>
    <button className="press" aria-current={panel==="alerts"?"page":undefined} onClick={()=>setPanel("alerts")}><I n="bell"/>Alerts{bellCount>0&&<b className="badge">{bellCount}</b>}</button>
    <button className="press" aria-current={panel==="more"?"page":undefined} onClick={()=>setPanel("more")}><I n="more"/>More</button>
   </nav>
  </div>

  {/* ======================= Q (dock on desktop, full sheet on phone) ======================= */}
  <div className={`qdock${qOpen?" open":""}`}>
   <section className="qsheet card" aria-label="Q conversation">
    <div className="qs-h"><img src="/os/q-emblem.webp" alt="" width={28} height={28}/><div><b>Q</b> <span>· {qState==="offline"?"offline":`sees ${nodes.length||"all"} systems`}</span></div><span className="sp"/>
     <button className="icon-btn press" aria-label="New conversation" title="New conversation" onClick={()=>{setQMsgs([]);setQConv(undefined);}}><I n="plus"/></button>
     <Link className="icon-btn press" href="/chat" aria-label="Open full Q workspace" title="Q workspace"><I n="ext"/></Link>
     <button className="icon-btn press" aria-label="Close Q" onClick={()=>setQOpen(false)}><I n="x"/></button></div>
    <div className="qlog" ref={qRef} aria-live="polite">
     {!qMsgs.length&&<div className="msg q"><img src="/os/q-emblem.webp" alt="" width={28} height={28}/><div className="body"><p className="qempty">{critical.length?`I’m watching all ${nodes.length} systems. ${critical[0].title} — that’s the one thing that needs you.`:`I’m watching all ${nodes.length||"your"} systems. Nothing critical right now.`} Ask me anything, or pick a suggestion.</p>
      <div className="qacts">{QUICK.map(([l,,p])=><button key={l} className="btn sm press" onClick={()=>askQ(p)} disabled={qBusy}>{l}</button>)}<button className="btn sm press" onClick={()=>runAction({kind:"iq",arg:""},"q-iq")} disabled={qBusy}>AngolaIQ summary</button></div></div></div>}
     {qMsgs.map((m,i)=>{const last=i===qMsgs.length-1,acts=m.role==="q"&&!(qBusy&&last)?parseActions(m.text):[];
      return m.role==="user"?<div key={i} className="msg me">{m.text}</div>
       :<div key={i} className="msg q"><img src="/os/q-emblem.webp" alt="" width={28} height={28}/><div className="body">{m.text?<QMd text={stripActions(m.text)}/>:<span className="thinking"><i/><i/><i/> Q is reading your live data</span>}
        {acts.length>0&&<div className="qacts">{acts.map((a,k)=>{const key=`${i}-${k}`,st=doneActs[key];return <button key={key} className="btn sm press" disabled={!!st&&st!=="Failed"} onClick={()=>runAction(a,key)}>{st&&st!=="…"?st:a.kind==="task"?`＋ Task: ${a.arg}${a.due?` (${a.due})`:""}`:a.kind==="checks"?"Run checks":a.kind==="open"?`Open ${a.arg}`:"Summarise AngolaIQ"}</button>;})}</div>}</div></div>;})}
    </div>
   </section>
   <div className="qsugs">{qSuggest.slice(0,3).map(s=><button key={s.label} className={`qsug press${s.ctx?" ctx":""}`} onClick={()=>openQ(s.prompt)} disabled={qBusy}><I n="spark"/>{s.label}</button>)}</div>
   <form className="qbar" onSubmit={e=>{e.preventDefault();if(!qInput.trim())return;setQOpen(true);askQ(qInput);}}>
    <img src="/os/q-emblem.webp" alt="" width={38} height={38}/>
    <label className="sr" htmlFor="ql-q">Ask Q</label>
    <input id="ql-q" ref={qInputRef} value={qInput} onChange={e=>setQInput(e.target.value)} onFocus={()=>{if(window.innerWidth>860&&qMsgs.length)setQOpen(true);}} placeholder="Ask Q anything about your ecosystem…" autoComplete="off" enterKeyHint="send" maxLength={2000}/>
    <kbd className="kbd">⌘K</kbd>
    <button className="send press" aria-label="Send to Q" disabled={qBusy||!qInput.trim()}><I n="send"/></button>
   </form>
  </div>

  {/* ======================= Drawer + overlays ======================= */}
  <div className={`scrim${panel?" on":""}`} onClick={()=>setPanel(null)}/>
  <aside className={`drawer${panel?" on":""}`} role="dialog" aria-modal="true" aria-label={panel?drawerTitle[panel][0]:"Panel"}>
   <div className="grab"/>
   {panel&&<><div className="dr-h"><div style={{flex:1}}><h3>{drawerTitle[panel][0]}</h3><p>{drawerTitle[panel][1]}</p></div><button className="icon-btn press" aria-label="Close" onClick={()=>setPanel(null)}><I n="x"/></button></div>
    <div className="dr-b">{drawerBody(panel)}</div>
    {panel==="studio"&&<div className="dr-f"><button className="btn ghost press" onClick={()=>{const prev=studio;setS({...DEFAULT_STUDIO});toast("Studio reset to defaults",()=>setS(prev));}}><I n="reset"/>Reset</button><button className="btn primary press" onClick={()=>setPanel(null)}>Done</button></div>}</>}
  </aside>

  {commandOpen&&<div className="cmd-back" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCommandOpen(false);}}>
   <section className="cmd" role="dialog" aria-modal="true" aria-label="Search or ask Q">
    <form onSubmit={runCommand}><I n="search"/><input autoFocus enterKeyHint="go" value={commandQuery} onChange={e=>setCommandQuery(e.target.value)} placeholder="Search apps, run a command, or ask Q…" aria-label="Search or ask Q" onKeyDown={e=>{if(e.key==="Escape")setCommandOpen(false);}}/><kbd className="kbd">ESC</kbd></form>
    <div className="cmd-g"><small>Commands</small>{cmdShown.map(x=><button key={x.label} onClick={()=>{setCommandOpen(false);x.run();}}><span><b>{x.label}</b><small>{x.detail}</small></span><kbd className="kbd">↵</kbd></button>)}{!cmdShown.length&&<p>No matching command.</p>}</div>
    <div className="cmd-g"><small>Applications</small>{appShown.map(n=><button key={n.id} onClick={()=>{setCommandOpen(false);if(n.url)window.open(n.url,"_blank","noopener");else setPanel("apps");}}><span><b>{n.name}</b><small>{n.area} · {statusText(n)}</small></span><kbd className="kbd">↗</kbd></button>)}
     {commandQuery.trim()&&<button className="ask" onClick={()=>{const q=commandQuery.trim();setCommandOpen(false);openQ(q);}}><span><b>Ask Q → “{commandQuery.trim()}”</b><small>Send this question to your assistant</small></span><kbd className="kbd">↵</kbd></button>}</div>
    <footer><span>Ctrl K to toggle</span><span>Q OS</span></footer>
   </section></div>}

  {selectedNewsItem&&<div className="nd-back" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedNews(null);}}>
   <article className="nd" role="dialog" aria-modal="true" aria-labelledby="ql-nd-t">
    <div className="chead"><span className="ey">Global Radar · {selectedNewsItem.geography}</span><button className="icon-btn press" onClick={()=>setSelectedNews(null)} aria-label="Close article"><I n="x"/></button></div>
    <h4 id="ql-nd-t">{selectedNewsItem.title}</h4>
    <p style={{textTransform:"capitalize"}}>{selectedNewsItem.publisher??"Unknown source"} · {(selectedNewsItem.category??"general").replace(/_/g," ")} · {ago(selectedNewsItem.published_at??selectedNewsItem.retrieved_at)}</p>
    {selectedNewsItem.impact&&<div className="imp"><b>Impact: {selectedNewsItem.impact}</b></div>}
    <p>Open the original source for the full report. Q OS never invents missing article content.</p>
    <div className="nd-acts"><a className="btn primary press" href={selectedNewsItem.url} target="_blank" rel="noreferrer">Read original<I n="ext"/></a><button className="btn press" onClick={()=>{const n=selectedNewsItem;setSelectedNews(null);openQ(`Brief me on this headline and why it matters for my ventures: "${n.title}" (${n.geography}, ${n.publisher??"unknown source"}). Separate facts from inference.`);}}><I n="spark"/>Ask Q</button></div>
   </article></div>}

  <div className="toasts" aria-live="polite">{toasts.map(t=><div key={t.id} className="toast"><I n="check"/><span>{t.msg}</span>{t.undo&&<button onClick={()=>{t.undo?.();setToasts(x=>x.filter(y=>y.id!==t.id));}}>Undo</button>}</div>)}</div>
 </div>;
}

/* ===================== Q Live helpers ===================== */
type Panel="studio"|"apps"|"alerts"|"priorities"|"more";
type ONode={id:string;name:string;area:string;state:"ok"|"crit"|"dep"|"idle";url:string|null;icon:string|null;logo:string|null;pages:{label:string;url:string}[];updated:string|null;deployAt:number|null;inspector:string|null;issues:number|null;commit:string|null;commitUrl:string|null;repo:string|null};
type Sig={id:string;type:SigType;sev:"crit"|"watch"|"info"|"ok";region?:NewsStream;src:string;title:string;sub?:string;t:number|null;href?:string;action?:string;when?:string;news?:NewsItem;impact?:string|null;cat?:string;gold?:boolean};

const IC:Record<string,ReactNode>={
 check:<path d="M20 6 9 17l-5-5"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,plus:<path d="M12 5v14M5 12h14"/>,
 arrow:<path d="M5 12h14M13 6l6 6-6 6"/>,up:<path d="M12 19V5M6 11l6-6 6 6"/>,down:<path d="M12 5v14M6 13l6 6 6-6"/>,
 alert:<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
 spark:<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
 sliders:<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>,
 bell:<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></>,x:<path d="M18 6 6 18M6 6l12 12"/>,
 eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
 eyeoff:<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>,
 ext:<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>,chart:<><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 5-6"/></>,
 globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
 home:<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/>,
 grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
 more:<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
 file:<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
 cloud:<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3 3 0 0 0 7 18z"/>,
 repeat:<><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></>,
 activity:<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,send:<path d="M12 19V5M5 12l7-7 7 7"/>,
 sunrise:<path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"/>,
 map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></>,list:<><path d="M9 6h12M9 12h12M9 18h12"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></>,
 chev:<path d="m9 6 6 6-6 6"/>,search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,reset:<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
 trash:<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>,
 cal:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
 flag:<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>,
 logout:<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
};
function I({n,c}:{n:string;c?:string}){return <svg className={`i${c?" "+c:""}`} viewBox="0 0 24 24" aria-hidden="true">{IC[n]}</svg>;}

/* App mark: the app's own icon read from its website, else initials. */
function AppMark({n,big}:{n:Pick<ONode,"name"|"icon">;big?:boolean}){
 const [failed,setFailed]=useState(false);
 const ini=initials(n.name.replace(/\s*\/.*$/,""))||"?";
 if(n.icon&&!failed)return <img className="mark" src={n.icon} alt="" width={big?52:28} height={big?52:28} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)} style={big?{width:52,height:52,borderRadius:16}:undefined}/>;
 return <span className="mono" style={big?{width:52,height:52,borderRadius:16,fontSize:16}:undefined}>{ini}</span>;
}

function Spark({d,w,h,up,id}:{d:string;w:number;h:number;up:boolean;id:string}){
 if(!d)return null;const pts=d.split(" "),last=pts[pts.length-1]?.split(",").map(Number)??[w,h/2];
 return <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label={`Gold intraday, trending ${up?"up":"down"}`} role="img">
  <polygon points={`0,${h} ${d} ${w},${h}`} fill={`url(#ql-${up?"up":"down"})`}/>
  <polyline points={d} fill="none" stroke={up?"var(--ok)":"var(--watch)"} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
  <circle cx={last[0]} cy={last[1]} r="3" fill={up?"var(--ok)":"var(--watch)"} data-id={id}/></svg>;
}

/* Phone ecosystem card: every app on one ring around the health core; percentages keep it fluid. */
function MiniOrbit({nodes,health,onPick}:{nodes:ONode[];health:number|null;onPick:(id:string)=>void}){
 const N=Math.max(1,nodes.length),ci=Math.max(0,nodes.findIndex(n=>n.state==="crit")),step=360/N,C=2*Math.PI*42;
 return <div className="mini-orbit">
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="48" rx="38" ry="38" fill="none" stroke="var(--line-2)" vectorEffect="non-scaling-stroke"/></svg>
  {nodes.map((n,i)=>{const a=((i-ci)*step)*Math.PI/180,x=50+Math.cos(a)*38,y=48+Math.sin(a)*38;const above=Math.sin(a)<-0.2;
   return <span key={n.id}><button className={`planet press${n.state==="crit"?" crit":n.state==="ok"?"":" idle"}`} style={{left:`${x}%`,top:`${y}%`}} aria-label={`${n.name}: ${n.state==="crit"?"build failed":n.state==="ok"?"operational":"unverified"}`} onClick={()=>onPick(n.id)}>
     {n.icon?<AppMark n={n}/>:initials(n.name.replace(/\s*\/.*$/,"")).slice(0,2)}{n.state==="crit"&&<span className="qwarn"><I n="alert"/></span>}</button>
    <span className={`plabel${n.state==="crit"?" crit":""}`} style={{left:`${x}%`,top:`calc(${y}% + ${above?-44:27}px)`}}>{n.name.split(" ")[0].replace(/\/.*/,"").slice(0,12)}</span></span>;})}
  <div className="mcore" style={{top:"48%"}}><svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="42" fill="none" stroke="var(--line-2)" strokeWidth="3"/><circle cx="46" cy="46" r="42" fill="none" stroke="url(#ql-hgrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-(health??0)/100)}/></svg><div><b className="num">{health??"—"}</b><small>health</small></div></div>
 </div>;
}

/* Count-up for the health score (instant when motion is off). */
function useCountUp(target:number,animate:boolean){
 const [v,setV]=useState(animate?0:target);
 useEffect(()=>{if(!animate){setV(target);return;}let raf=0;const t0=performance.now(),from=0;
  const step=(t:number)=>{const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);setV(Math.round(from+(target-from)*e));if(k<1)raf=requestAnimationFrame(step);};
  raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);},[target,animate]);
 return v;
}
