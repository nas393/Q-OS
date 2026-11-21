import {getDb} from "@/lib/db";
import {ensureSchema} from "@/lib/schema";
import {PORTFOLIO_PROJECTS} from "@/lib/portfolio/registry";
import {listProjects,vercelGet} from "@/lib/vercel";
import {certigoStats,dalilStats,listCount,visitCount,visitStat,type AppStat} from "@/lib/app-stats-parse";

/*
 * Links the other apps into Q OS: a few real numbers per app, collected by the 15-minute check and when the
 * Command centre opens with numbers older than an hour. Stored per app in command_metrics as "stats:<app id>".
 * - Certigo: public_stats() RPC on its Supabase project, with the publishable key (public by design: it ships in
 *   Certigo's browser bundle, and the function is granted to anon). Read-only.
 * - Dalil: counts of its public lists (businesses, events, jobs). Read-only.
 * - Every app: page views in the last 7 days from Vercel Web Analytics, where the owner has enabled it.
 */
const CERTIGO_RPC="https://yatkrfwgwubcrlnnpooc.supabase.co/rest/v1/rpc/public_stats";
const CERTIGO_PUBLISHABLE_KEY="sb_publishable_vPaOP8SvqyIwO7MtdfvbKg_gob5WKtw";
const DALIL="https://dalil-al-bazouria.vercel.app";
const MAX_AGE_MS=60*60_000;

export type AppStatsMap=Record<string,{stats:AppStat[];updatedAt:string}>;

async function getJson(url:string,init?:RequestInit):Promise<unknown>{
  const r=await fetch(url,{...init,cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function certigo():Promise<AppStat[]>{
  const headers={apikey:CERTIGO_PUBLISHABLE_KEY,Authorization:`Bearer ${CERTIGO_PUBLISHABLE_KEY}`,"Content-Type":"application/json"};
  return certigoStats(await getJson(CERTIGO_RPC,{method:"POST",headers,body:"{}"}));
}

async function dalil():Promise<AppStat[]>{
  const count=(p:string)=>getJson(`${DALIL}/api/${p}`).then(listCount).catch(()=>null);
  const [b,e,j]=await Promise.all([count("directory"),count("events"),count("jobs")]);
  return dalilStats(b,e,j);
}

async function visits():Promise<Record<string,AppStat>>{
  const byVercel=new Map<string,string>(PORTFOLIO_PROJECTS.filter(p=>p.vercel).map(p=>[p.vercel as string,p.id]));
  const since=new Date(Date.now()-7*864e5).toISOString(),until=new Date(Date.now()+864e5).toISOString();
  const out:Record<string,AppStat>={};
  const projects=await listProjects().catch(()=>[]);
  await Promise.all(projects.map(async pr=>{
    try{
      const n=visitCount(await vercelGet<unknown>("/v1/query/web-analytics/visits/count",{projectId:pr.id,since,until}));
      if(n!==null)out[byVercel.get(pr.id)??pr.id]=visitStat(n);
    }catch{/* Web Analytics not enabled for this project */}
  }));
  return out;
}

export async function collectAppStats(out:string[]=[]){
  const found:Record<string,AppStat[]>={};
  const [c,d,v]=await Promise.allSettled([certigo(),dalil(),visits()]);
  if(c.status==="fulfilled"&&c.value.length)found.certigo=c.value;
  if(d.status==="fulfilled"&&d.value.length)found.dalil=d.value;
  if(v.status==="fulfilled")for(const [id,stat] of Object.entries(v.value))(found[id]??=[]).push(stat);
  if(!Object.keys(found).length)return found;
  await ensureSchema();
  for(const [id,stats] of Object.entries(found)){
    await getDb().query("INSERT INTO command_metrics (metric_key,payload,source,updated_at) VALUES ($1,$2::jsonb,'q-os',now()) ON CONFLICT (metric_key) DO UPDATE SET payload=EXCLUDED.payload,source=EXCLUDED.source,updated_at=now()",[`stats:${id}`,JSON.stringify({stats:stats.slice(0,4)})]);
  }
  out.push(`app-stats:${Object.keys(found).join(",")}`);
  return found;
}

export async function loadAppStats():Promise<{stats:AppStatsMap;stale:boolean}>{
  await ensureSchema();
  const {rows}=await getDb().query("SELECT metric_key,payload,updated_at FROM command_metrics WHERE metric_key LIKE 'stats:%'");
  const stats:AppStatsMap={};
  let newest=0;
  for(const r of rows){
    const list=(r.payload as {stats?:unknown})?.stats;
    if(!Array.isArray(list))continue;
    const clean=list.filter((s):s is AppStat=>!!s&&typeof (s as AppStat).label==="string"&&typeof (s as AppStat).value==="string").slice(0,4);
    const at=new Date(r.updated_at);newest=Math.max(newest,at.getTime());
    if(clean.length)stats[String(r.metric_key).slice(6)]={stats:clean,updatedAt:at.toISOString()};
  }
  return {stats,stale:Date.now()-newest>MAX_AGE_MS};
}
