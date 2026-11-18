import webpush from "web-push";
import {getDb} from "@/lib/db";
import {ensureSchema} from "@/lib/schema";
import {listProjects,pickProductionUrl,vercelGet} from "@/lib/vercel";
import {loadMetrics} from "@/lib/metrics";
import {listTasks} from "@/lib/tasks";
import {externalApps} from "@/lib/external-apps";
import {runIqJobs} from "@/lib/iq/engine";
import {alertBody,alertTitle,digestLine,evaluateBuilds,firstBuildError,type BuildEvent,type Deployment} from "@/lib/build-alerts";

/*
 * NASSIM OS alerts. Checks run at most every 10 minutes: GitHub Actions every 15 min + Vercel Cron 07:00 UTC (/api/cron/check),
 * or by the owner. A push notification is sent only when something CHANGES.
 * Urgent (pushed right away): production build ERROR, site down/back up, a check that fails, gold levels the owner set.
 * Non-urgent (logged now, pushed once in the 07:00 UTC / 08:00 Luanda morning brief): preview builds whose LATEST build
 * on the branch is ERROR (see src/lib/build-alerts.ts). Every alert is keyed by deployment id and never sent twice.
 */

export type AlertRow={id:number;level:"red"|"amber"|"info";title:string;body:string;url:string|null;createdAt:string};
export type GoldRule={id:string;direction:"above"|"below";price:number;active:boolean;firedAt:string|null};

const LUANDA_MS=3600_000; // Luanda is UTC+1, no daylight saving
const luanda=()=>new Date(Date.now()+LUANDA_MS);
const today=()=>luanda().toISOString().slice(0,10);
const db=()=>getDb();

async function ensure(){await ensureSchema();}
async function kvGet<T>(k:string):Promise<T|null>{const {rows}=await db().query("SELECT v FROM q_kv WHERE k=$1",[k]);return rows[0]?.v??null;}
async function kvSet(k:string,v:unknown){await db().query("INSERT INTO q_kv (k,v,updated_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT (k) DO UPDATE SET v=EXCLUDED.v,updated_at=now()",[k,JSON.stringify(v)]);}

/* VAPID keys are generated once and kept in the database: no setup needed. */
async function vapid(){
  await ensure();
  let keys=await kvGet<{publicKey:string;privateKey:string}>("vapid");
  if(!keys){keys=webpush.generateVAPIDKeys();await kvSet("vapid",keys);}
  return keys;
}
export async function publicKey(){return (await vapid()).publicKey;}

export async function saveSubscription(sub:{endpoint:string;keys:{p256dh:string;auth:string}}){await ensure();await db().query("INSERT INTO q_push_subs (endpoint,sub) VALUES ($1,$2::jsonb) ON CONFLICT (endpoint) DO UPDATE SET sub=EXCLUDED.sub",[sub.endpoint,JSON.stringify(sub)]);}
export async function removeSubscription(endpoint:string){await ensure();await db().query("DELETE FROM q_push_subs WHERE endpoint=$1",[endpoint]);}
export async function subscriptionCount(){await ensure();const {rows}=await db().query("SELECT count(*)::int n FROM q_push_subs");return rows[0].n as number;}

/* Log the alert and push it to every subscribed device (push:false = log only, for the daily digest). Dead subscriptions are removed. */
export async function notify(a:{level:AlertRow["level"];title:string;body:string;url?:string|null;push?:boolean}){
  await ensure();
  await db().query("INSERT INTO q_alerts (level,title,body,url) VALUES ($1,$2,$3,$4)",[a.level,a.title.slice(0,120),a.body.slice(0,1000),a.url??null]);
  if(a.push===false)return 0;
  const keys=await vapid();
  webpush.setVapidDetails("mailto:owner@nassim-os.app",keys.publicKey,keys.privateKey);
  const {rows}=await db().query("SELECT endpoint,sub FROM q_push_subs");
  let sent=0;
  await Promise.all(rows.map(async r=>{
    try{await webpush.sendNotification(r.sub,JSON.stringify({title:a.title,body:a.body,url:a.url??"/dashboard",tag:a.title}),{TTL:3600});sent++;}
    catch(e){const code=(e as {statusCode?:number}).statusCode;if(code===404||code===410)await removeSubscription(r.endpoint);}
  }));
  return sent;
}

export async function recentAlerts(limit=20):Promise<AlertRow[]>{
  await ensure();
  const {rows}=await db().query("SELECT id,level,title,body,url,created_at FROM q_alerts ORDER BY id DESC LIMIT $1",[limit]);
  return rows.map(r=>({id:Number(r.id),level:r.level,title:r.title,body:r.body,url:r.url,createdAt:new Date(r.created_at).toISOString()}));
}

export async function alertHistory(o:{level?:string;q?:string;limit?:number}={}){
  await ensure();
  const {rows}=await db().query("SELECT id,level,title,body,url,created_at,acknowledged_at FROM q_alerts WHERE ($1::text IS NULL OR level=$1) AND ($2::text IS NULL OR title ILIKE '%'||$2||'%' OR body ILIKE '%'||$2||'%') ORDER BY id DESC LIMIT $3",[o.level??null,o.q??null,Math.min(o.limit??200,500)]);
  return rows.map(r=>({id:Number(r.id),level:r.level as AlertRow["level"],title:r.title as string,body:r.body as string,url:r.url as string|null,createdAt:new Date(r.created_at).toISOString(),ack:!!r.acknowledged_at}));
}
export async function acknowledgeAlert(id:number|"all"){await ensure();if(id==="all")await db().query("UPDATE q_alerts SET acknowledged_at=now() WHERE acknowledged_at IS NULL");else await db().query("UPDATE q_alerts SET acknowledged_at=now() WHERE id=$1",[id]);}
/* System health for the last 24 h, from the cron run log. */
export async function systemHealth(){
  await ensure();
  const {rows}=await db().query("SELECT count(*)::int runs, count(*) FILTER (WHERE jsonb_array_length(errors)>0)::int failed, coalesce(round(avg(ms)),0)::int avg_ms, max(at) last_at FROM q_check_runs WHERE at>now()-interval '24 hours'");
  const r=rows[0];return {runs:r.runs as number,failed:r.failed as number,avgMs:r.avg_ms as number,lastAt:r.last_at?new Date(r.last_at).toISOString():null};
}
export async function buildDigest(){await ensure();return Object.values((await kvGet<Record<string,{id:string;line:string;url:string|null}>>("build_digest"))??{});}
export async function listGoldRules():Promise<GoldRule[]>{
  await ensure();
  const {rows}=await db().query("SELECT id,direction,price,active,fired_at FROM q_gold_rules ORDER BY price DESC");
  return rows.map(r=>({id:r.id,direction:r.direction,price:Number(r.price),active:r.active,firedAt:r.fired_at?new Date(r.fired_at).toISOString():null}));
}
export async function addGoldRule(direction:"above"|"below",price:number){await ensure();await db().query("INSERT INTO q_gold_rules (direction,price) VALUES ($1,$2)",[direction,price]);}
export async function removeGoldRule(id:string){await ensure();await db().query("DELETE FROM q_gold_rules WHERE id=$1",[id]);}

/* Remember the last status per key; return the previous one. */
async function transition(key:string,status:string){
  const {rows}=await db().query("SELECT status FROM q_alert_state WHERE key=$1",[key]);
  await db().query("INSERT INTO q_alert_state (key,status,updated_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET status=EXCLUDED.status,updated_at=now()",[key,status]);
  return (rows[0]?.status as string|undefined)??null;
}

async function checkSite(url:string){
  try{const r=await fetch(url,{method:"GET",redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(8000),headers:{"user-agent":"NASSIM-OS-uptime/1.0"}});return r.status<500;}
  catch{return false;}
}

async function checkUptime(out:string[]){
  const projects=[...(await listProjects()).map(p=>({p:{id:p.id,name:p.name},url:pickProductionUrl(p)})),...externalApps.map(x=>({p:{id:x.id,name:x.name},url:x.url as string|null}))].filter(x=>x.url);
  await Promise.all(projects.map(async({p,url})=>{
    let up=await checkSite(url!);
    if(!up){await new Promise(r=>setTimeout(r,3000));up=await checkSite(url!);} // retry once to avoid false alarms
    const prev=await transition(`up:${p.id}`,up?"up":"down");
    if(prev==="up"&&!up){out.push(`down:${p.name}`);await notify({level:"red",title:`🔴 ${p.name} is DOWN`,body:`${url} is not responding.`,url:url!});}
    if(prev==="down"&&up){out.push(`up:${p.name}`);await notify({level:"info",title:`🟢 ${p.name} is back up`,body:url!,url:url!});}
  }));
}

/* Non-urgent items waiting for the morning brief, keyed by project@branch (newest failure only). */
type DigestItem={id:string;line:string;url:string|null};
const DIGEST_KEY="build_digest";

async function buildLogLine(id:string){
  try{
    const ev=await vercelGet<BuildEvent[]|{events?:BuildEvent[]}>(`/v3/deployments/${encodeURIComponent(id)}/events`,{builds:"1",limit:"-1",direction:"forward"});
    return firstBuildError(Array.isArray(ev)?ev:ev.events??[]);
  }catch{return null;}
}

/* "Latest build failed only": see src/lib/build-alerts.ts for the rule and tests/build-alerts.test.mjs for fixtures. */
async function checkBuilds(out:string[]){
  const {deployments=[]}=await vercelGet<{deployments?:Deployment[]}>("/v6/deployments",{limit:"100",since:String(Date.now()-72*3600_000)});
  const {alerts,clearedKeys}=evaluateBuilds(deployments);
  const digest=(await kvGet<Record<string,DigestItem>>(DIGEST_KEY))??{};
  for(const k of clearedKeys)if(digest[k]){delete digest[k];out.push(`build-cleared:${k}`);} // a later READY clears it
  for(const a of alerts){
    if(await transition(`build:${a.id}`,"error"))continue; // dedupe: deployment id already reported
    const log=await buildLogLine(a.id);
    out.push(`build:${a.project}@${a.branch}${a.urgent?":prod":""}`);
    await notify({level:a.urgent?"red":"amber",title:alertTitle(a),body:alertBody(a,log),url:a.inspectorUrl,push:a.urgent});
    if(!a.urgent)digest[a.key]={id:a.id,line:digestLine(a,log),url:a.inspectorUrl};
  }
  await kvSet(DIGEST_KEY,digest);
}

async function checkGold(out:string[]){
  const gold=(await loadMetrics()).metrics.xauusd;
  if(!gold||Date.now()-Date.parse(gold.updatedAt)>3*3600_000)return; // stale price: never alert on old data
  const price=gold.value.price;
  for(const r of await listGoldRules()){
    if(!r.active)continue;
    if((r.direction==="above"&&price>=r.price)||(r.direction==="below"&&price<=r.price)){
      await db().query("UPDATE q_gold_rules SET active=false,fired_at=now() WHERE id=$1",[r.id]);
      out.push(`gold:${r.direction}:${r.price}`);
      await notify({level:"amber",title:`🥇 Gold ${r.direction==="above"?"above":"below"} ${r.price}`,body:`XAU/USD now ${price.toFixed(2)} (${gold.value.changePct>=0?"+":""}${gold.value.changePct.toFixed(2)}%). Level is now off. Set it again in Q.`,url:"/dashboard#markets"});
    }
  }
  if(Math.abs(gold.value.changePct)>=1.5&&await transition(`goldmove:${today()}`,"sent")===null){
    out.push("gold:move");
    await notify({level:"amber",title:`🥇 Gold ${gold.value.changePct>0?"up":"down"} ${Math.abs(gold.value.changePct).toFixed(1)}% today`,body:`XAU/USD ${price.toFixed(2)}.`,url:"/dashboard#markets"});
  }
}

/* 08:00 Luanda morning brief, once per day. */
async function morningBrief(out:string[]){
  if(luanda().getUTCHours()<8)return;
  if(await transition(`brief:${today()}`,"sent")!==null)return;
  const [{rows:down},tasks,gold]=await Promise.all([
    db().query("SELECT count(*)::int n FROM q_alert_state WHERE key LIKE 'up:%' AND status='down'"),
    listTasks().catch(()=>[]),
    loadMetrics().then(m=>m.metrics.xauusd).catch(()=>undefined)
  ]);
  const open=tasks.filter(t=>!t.done),dueToday=open.filter(t=>t.due===today()).length,overdue=open.filter(t=>t.due&&t.due<today()).length;
  const parts=[down[0].n?`🔴 ${down[0].n} site(s) down`:"✅ All sites up",`${dueToday} task(s) today${overdue?`, ${overdue} overdue`:""}`];
  if(gold&&Date.now()-Date.parse(gold.updatedAt)<24*3600_000)parts.push(`Gold ${gold.value.price.toFixed(0)} (${gold.value.changePct>=0?"+":""}${gold.value.changePct.toFixed(2)}%)`);
  // Daily digest: non-urgent items still current (builds already re-checked earlier in this run).
  const items=Object.values((await kvGet<Record<string,DigestItem>>(DIGEST_KEY))??{});
  const body=parts.join(" · ")+(items.length?`\n${items.length} preview build(s) failing:\n${items.map(i=>i.line).join("\n")}`:"");
  out.push("brief");
  await notify({level:"info",title:"☀️ Morning brief",body,url:"/brief"});
  await kvSet(DIGEST_KEY,{});
}

/* Main entry. force=true skips the 10-minute throttle (owner "check now"). */
export async function runChecks(force=false){
  await ensure();
  const last=(await kvGet<number>("last_check"))??0;
  if(!force&&Date.now()-last<10*60_000)return {skipped:true,events:[] as string[]};
  await kvSet("last_check",Date.now());
  const started=Date.now(),out:string[]=[],errors:string[]=[];
  for(const [name,fn] of [["uptime",()=>checkUptime(out)],["builds",()=>checkBuilds(out)],["gold",()=>checkGold(out)],["brief",()=>morningBrief(out)],["angolaiq",async()=>{const r=await runIqJobs();if(Object.keys(r).length>1)out.push("iq:"+Object.keys(r).join(","));}]] as const){
    try{await fn();}catch(e){
      const msg=e instanceof Error?e.message:"failed";
      errors.push(`${name}: ${msg}`);
      // Cron failure is urgent; at most one push per failing check per day.
      if(await transition(`cronfail:${name}:${today()}`,"sent")===null)await notify({level:"red",title:`⚠️ Q check "${name}" failed`,body:msg.slice(0,200),url:"/dashboard"}).catch(()=>{});
    }
  }
  await kvSet("last_check_result",{at:Date.now(),events:out,errors});
  // Own history (Vercel Hobby keeps runtime logs for 1 h only). Keep 30 days.
  await db().query("INSERT INTO q_check_runs (ms,events,errors) VALUES ($1,$2::jsonb,$3::jsonb)",[Date.now()-started,JSON.stringify(out),JSON.stringify(errors)]);
  await db().query("DELETE FROM q_check_runs WHERE at<now()-interval '30 days'");
  return {skipped:false,events:out,errors};
}

export async function lastCheck(){await ensure();return kvGet<{at:number;events:string[];errors:string[]}>("last_check_result");}
