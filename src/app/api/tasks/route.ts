import {NextResponse} from "next/server";
import {z} from "zod";
import {readSession} from "@/lib/session";
import {jsonError,requestOriginAllowed} from "@/lib/http";
import {writeAudit} from "@/lib/audit";
import {addTask,listTasks,removeTask,setDone} from "@/lib/tasks";

export const dynamic="force-dynamic";
const ok=(b:unknown)=>NextResponse.json(b,{headers:{"Cache-Control":"no-store"}});
async function guard(req:Request,write=false){if(!await readSession())return jsonError(401,"Unauthorized");if(write&&!requestOriginAllowed(req))return jsonError(403,"Request origin rejected");return null;}

export async function GET(req:Request){const g=await guard(req);if(g)return g;try{return ok({tasks:await listTasks()});}catch{return jsonError(500,"Tasks unavailable");}}
export async function POST(req:Request){const g=await guard(req,true);if(g)return g;
 const p=z.object({title:z.string().trim().min(1).max(160),project:z.string().trim().max(60).optional(),due:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),dueTime:z.string().regex(/^[0-2]\d:[0-5]\d$/).optional()}).safeParse(await req.json().catch(()=>null));
 if(!p.success)return jsonError(400,"Enter a task (max 160 characters).");
 try{const t=await addTask(p.data);await writeAudit({action:"task.create",outcome:"succeeded",details:{id:t.id}});return ok({task:t});}catch{return jsonError(500,"Could not save task");}}
export async function PATCH(req:Request){const g=await guard(req,true);if(g)return g;
 const p=z.object({id:z.string().uuid(),done:z.boolean()}).safeParse(await req.json().catch(()=>null));if(!p.success)return jsonError(400,"Invalid task update");
 try{const t=await setDone(p.data.id,p.data.done);if(!t)return jsonError(404,"Task not found");await writeAudit({action:p.data.done?"task.complete":"task.reopen",outcome:"succeeded",details:{id:t.id}});return ok({task:t});}catch{return jsonError(500,"Could not update task");}}
export async function DELETE(req:Request){const g=await guard(req,true);if(g)return g;
 const id=new URL(req.url).searchParams.get("id")??"";if(!z.string().uuid().safeParse(id).success)return jsonError(400,"Invalid task id");
 try{await removeTask(id);await writeAudit({action:"task.delete",outcome:"succeeded",details:{id}});return ok({ok:true});}catch{return jsonError(500,"Could not delete task");}}
