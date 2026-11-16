import {NextResponse} from "next/server";
import {timingSafeEqual,createHash} from "node:crypto";
import {runChecks} from "@/lib/alerts";
import {jsonError} from "@/lib/http";

export const runtime="nodejs",dynamic="force-dynamic",maxDuration=60;

/*
 * Scheduler entry, independent of Counter-Trader.
 * - Vercel Cron (vercel.json) calls GET daily ~08:00 Luanda with "Authorization: Bearer <CRON_SECRET>" (Vercel adds it when CRON_SECRET is set).
 * - GitHub Actions (.github/workflows/checks.yml) calls it every 15 min with the same header.
 * Accepts CRON_SECRET or INGEST_TOKEN. Returns only a summary, never stored data.
 */
function authorized(header:string|null){
  const given=header?.startsWith("Bearer ")?header.slice(7).trim():"";
  if(!given)return false;
  const g=createHash("sha256").update(given).digest();
  return [process.env.CRON_SECRET,process.env.INGEST_TOKEN].some(s=>!!s&&s.length>=24&&timingSafeEqual(g,createHash("sha256").update(s).digest()));
}

async function handle(request:Request){
  if(!process.env.CRON_SECRET&&!process.env.INGEST_TOKEN)return jsonError(503,"Scheduler is not configured");
  if(!authorized(request.headers.get("authorization")))return jsonError(401,"Unauthorized");
  try{
    const r=await runChecks(false);
    return NextResponse.json({ok:true,skipped:r.skipped,events:r.events.length,errors:r.errors?.length??0},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    console.error("cron_check_failed",{error:e instanceof Error?e.name:"unknown"});
    return jsonError(500,"Checks failed");
  }
}
export const GET=handle,POST=handle;
