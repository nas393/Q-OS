import {NextResponse,after} from "next/server";
import {runChecks} from "@/lib/alerts";
import {timingSafeEqual,createHash} from "node:crypto";
import {ingestSchema,saveMetrics} from "@/lib/metrics";
import {writeAudit} from "@/lib/audit";
import {jsonError} from "@/lib/http";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;

/* Push endpoint for other projects. Auth: Authorization: Bearer <INGEST_TOKEN>. Write-only: never returns stored data. */
function tokenOk(header:string|null){
  const expected=process.env.INGEST_TOKEN;
  if(!expected||expected.length<24)return null;
  const given=header?.startsWith("Bearer ")?header.slice(7).trim():"";
  const a=createHash("sha256").update(given).digest(),b=createHash("sha256").update(expected).digest();
  return given.length>0&&timingSafeEqual(a,b);
}

export async function POST(request:Request){
  const ok=tokenOk(request.headers.get("authorization"));
  if(ok===null)return jsonError(503,"Ingest is not configured");
  if(!ok){await writeAudit({action:"metrics.ingest",outcome:"blocked",details:{reason:"bad_token"}});return jsonError(401,"Unauthorized");}
  if(Number(request.headers.get("content-length")??0)>64_000)return jsonError(413,"Payload too large");
  const body=await request.json().catch(()=>null);
  const parsed=ingestSchema.safeParse(body);
  if(!parsed.success)return jsonError(400,parsed.error.issues.slice(0,5).map(i=>`${i.path.join(".")||"body"}: ${i.message}`).join("; "));
  try{
    const saved=await saveMetrics(parsed.data.source,parsed.data.metrics);
    await writeAudit({action:"metrics.ingest",outcome:"succeeded",details:{source:parsed.data.source,keys:saved}});
    after(()=>runChecks().catch(e=>console.error("alert_checks_failed",{error:e instanceof Error?e.name:"unknown"}))); // alerts ride on the 15-min push
    return NextResponse.json({ok:true,saved},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    console.error("metrics_ingest_failed",{error:e instanceof Error?e.name:"unknown"});
    return jsonError(500,"Could not store metrics");
  }
}
