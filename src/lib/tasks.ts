import {getDb} from "@/lib/db";
import {ensureSchema} from "@/lib/schema";

/* Owner's own tasks: feed Strategic Focus and Today's Agenda. Nothing is pre-filled. */
export type Priority="high"|"normal"|"low";export type Recur="daily"|"weekdays"|"weekly"|"monthly";
export type Task={id:string;title:string;project:string|null;due:string|null;dueTime:string|null;done:boolean;createdAt:string;priority:Priority;recur:Recur|null};
export async function ensureTasks(){await ensureSchema();}
const row=(r:Record<string,unknown>):Task=>({id:String(r.id),title:String(r.title),project:(r.project as string)??null,due:r.due_date?new Date(r.due_date as string).toISOString().slice(0,10):null,dueTime:(r.due_time as string)??null,done:Boolean(r.done),createdAt:new Date(r.created_at as string).toISOString(),priority:((r.priority as Priority)??"normal"),recur:(r.recur as Recur)??null});
export async function listTasks(){await ensureTasks();const {rows}=await getDb().query("SELECT * FROM q_tasks WHERE done=false OR done_at>now()-interval '2 days' ORDER BY done ASC, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, due_date ASC NULLS LAST, due_time ASC NULLS LAST, created_at ASC LIMIT 60");return rows.map(row);}
export async function addTask(t:{title:string;project?:string|null;due?:string|null;dueTime?:string|null;priority?:Priority;recur?:Recur|null}){await ensureTasks();const {rows}=await getDb().query("INSERT INTO q_tasks (title,project,due_date,due_time,priority,recur) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[t.title,t.project??null,t.due??(t.recur?new Date(Date.now()+3600e3).toISOString().slice(0,10):null),t.dueTime??null,t.priority??"normal",t.recur??null]);return row(rows[0]);}
/* Next date for a recurring task, from its due date (or today). Weekdays skips Saturday and Sunday. */
export function nextDue(from:string,recur:Recur){const d=new Date(from+"T12:00:00Z");if(recur==="daily")d.setUTCDate(d.getUTCDate()+1);else if(recur==="weekly")d.setUTCDate(d.getUTCDate()+7);else if(recur==="monthly")d.setUTCMonth(d.getUTCMonth()+1);else{do{d.setUTCDate(d.getUTCDate()+1);}while(d.getUTCDay()===0||d.getUTCDay()===6);}return d.toISOString().slice(0,10);}
export async function snooze(id:string,days:number){await ensureTasks();const {rows}=await getDb().query("UPDATE q_tasks SET due_date=GREATEST(coalesce(due_date,current_date),current_date)+$2::int WHERE id=$1 RETURNING *",[id,days]);return rows[0]?row(rows[0]):null;}
export async function setDone(id:string,done:boolean){await ensureTasks();const {rows}=await getDb().query("UPDATE q_tasks SET done=$2, done_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$1 RETURNING *",[id,done]);const t=rows[0]?row(rows[0]):null;
 /* Completing a recurring task creates the next one. */
 if(t&&done&&t.recur)await addTask({title:t.title,project:t.project,due:nextDue(t.due??new Date().toISOString().slice(0,10),t.recur),dueTime:t.dueTime,priority:t.priority,recur:t.recur});
 return t;}
export async function removeTask(id:string){await ensureTasks();await getDb().query("DELETE FROM q_tasks WHERE id=$1",[id]);}
