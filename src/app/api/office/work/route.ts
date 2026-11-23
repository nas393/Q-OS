import {NextResponse} from "next/server";
import {z} from "zod";
import {readSession} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
import {JOBS} from "@/lib/office/jobs";
import {decideWork,listWork,runJob} from "@/lib/office/work";

export const dynamic="force-dynamic";
export const maxDuration=60;
const ok=(b:unknown)=>NextResponse.json(b,{headers:{"Cache-Control":"no-store"}});
async function guard(req:Request,write=false){if(!await readSession())return jsonError(401,"Unauthorized");if(write&&!requestOriginAllowed(req))return jsonError(403,"Request origin rejected");return null;}

/* Office phase 3. GET drafts · POST {job} asks an employee for a draft · PATCH {id, decision} approves or discards it. Owner only. */
export async function GET(req:Request){const g=await guard(req);if(g)return g;try{return ok({work:await listWork()});}catch{return jsonError(503,"Drafts are unavailable right now");}}

export async function POST(req:Request){const g=await guard(req,true);if(g)return g;
  const p=z.object({job:z.enum(JOBS.map(j=>j.id) as [string,...string[]])}).safeParse(await req.json().catch(()=>null));
  if(!p.success)return jsonError(400,"Unknown job");
  try{const w=await runJob(p.data.job);await writeAudit({action:"office.draft",outcome:"succeeded",details:{job:p.data.job}});return ok({work:w});}
  catch(e){await writeAudit({action:"office.draft",outcome:"failed",details:{job:p.data.job}}).catch(()=>{});return jsonError(502,e instanceof Error?e.message.slice(0,200):"The draft failed. Try again.");}}

export async function PATCH(req:Request){const g=await guard(req,true);if(g)return g;
  const p=z.object({id:z.string().uuid(),decision:z.enum(["approved","discarded"])}).safeParse(await req.json().catch(()=>null));
  if(!p.success)return jsonError(400,"Invalid request");
  try{const w=await decideWork(p.data.id,p.data.decision);if(!w)return jsonError(404,"Draft not found or already decided");await writeAudit({action:`office.${p.data.decision}`,outcome:"succeeded",details:{id:w.id}});return ok({work:w});}
  catch{return jsonError(500,"Could not save the decision");}}
