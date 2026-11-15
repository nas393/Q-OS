import {NextResponse} from "next/server";
import {z} from "zod";
import {readSession} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
import {addGoldRule,lastCheck,listGoldRules,notify,publicKey,recentAlerts,removeGoldRule,removeSubscription,runChecks,saveSubscription,subscriptionCount} from "@/lib/alerts";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;
const ok=(b:unknown)=>NextResponse.json(b,{headers:{"Cache-Control":"no-store"}});

/* Owner-only: alert feed, push subscription, gold levels, manual check. */
export async function GET(){
  if(!await readSession())return jsonError(401,"Unauthorized");
  try{
    const [alerts,rules,devices,check,key]=await Promise.all([recentAlerts(),listGoldRules(),subscriptionCount(),lastCheck(),publicKey()]);
    return ok({alerts,rules,devices,lastCheck:check,publicKey:key});
  }catch{return jsonError(500,"Alerts unavailable");}
}

const sub=z.object({endpoint:z.string().url().startsWith("https://"),keys:z.object({p256dh:z.string().min(1).max(200),auth:z.string().min(1).max(100)})});
const action=z.discriminatedUnion("action",[
  z.object({action:z.literal("subscribe"),subscription:sub}),
  z.object({action:z.literal("unsubscribe"),endpoint:z.string().url()}),
  z.object({action:z.literal("addRule"),direction:z.enum(["above","below"]),price:z.number().positive().max(100000)}),
  z.object({action:z.literal("removeRule"),id:z.string().uuid()}),
  z.object({action:z.literal("check")}),
  z.object({action:z.literal("test")})
]);

export async function POST(req:Request){
  if(!await readSession())return jsonError(401,"Unauthorized");
  if(!requestOriginAllowed(req))return jsonError(403,"Request origin rejected");
  const p=action.safeParse(await req.json().catch(()=>null));
  if(!p.success)return jsonError(400,"Invalid alerts request");
  const a=p.data;
  try{
    if(a.action==="subscribe")await saveSubscription(a.subscription);
    if(a.action==="unsubscribe")await removeSubscription(a.endpoint);
    if(a.action==="addRule")await addGoldRule(a.direction,a.price);
    if(a.action==="removeRule")await removeGoldRule(a.id);
    let result:unknown=null;
    if(a.action==="check")result=await runChecks(true);
    if(a.action==="test")result={sent:await notify({level:"info",title:"✅ NASSIM OS alerts are on",body:"This phone will get build, uptime, gold and morning-brief alerts.",url:"/dashboard"})};
    await writeAudit({action:`alerts.${a.action}`,outcome:"succeeded"});
    return ok({ok:true,result});
  }catch(e){
    console.error("alerts_action_failed",{action:a.action,error:e instanceof Error?e.name:"unknown"});
    return jsonError(500,"Alerts action failed");
  }
}
