import {getDb} from "@/lib/db";

/* Owner's own tasks: feed Strategic Focus and Today's Agenda. Nothing is pre-filled. */
export type Task={id:string;title:string;project:string|null;due:string|null;dueTime:string|null;done:boolean;createdAt:string};
let ensured=false;
export async function ensureTasks(){
 if(ensured)return;
 await getDb().query(`CREATE TABLE IF NOT EXISTS q_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  project text,
  due_date date,
  due_time text CHECK (due_time IS NULL OR due_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz)`);
 ensured=true;
}
const row=(r:Record<string,unknown>):Task=>({id:String(r.id),title:String(r.title),project:(r.project as string)??null,due:r.due_date?new Date(r.due_date as string).toISOString().slice(0,10):null,dueTime:(r.due_time as string)??null,done:Boolean(r.done),createdAt:new Date(r.created_at as string).toISOString()});
export async function listTasks(){await ensureTasks();const {rows}=await getDb().query("SELECT * FROM q_tasks WHERE done=false OR done_at>now()-interval '2 days' ORDER BY done ASC, due_date ASC NULLS LAST, due_time ASC NULLS LAST, created_at ASC LIMIT 60");return rows.map(row);}
export async function addTask(t:{title:string;project?:string|null;due?:string|null;dueTime?:string|null}){await ensureTasks();const {rows}=await getDb().query("INSERT INTO q_tasks (title,project,due_date,due_time) VALUES ($1,$2,$3,$4) RETURNING *",[t.title,t.project??null,t.due??null,t.dueTime??null]);return row(rows[0]);}
export async function setDone(id:string,done:boolean){await ensureTasks();const {rows}=await getDb().query("UPDATE q_tasks SET done=$2, done_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$1 RETURNING *",[id,done]);return rows[0]?row(rows[0]):null;}
export async function removeTask(id:string){await ensureTasks();await getDb().query("DELETE FROM q_tasks WHERE id=$1",[id]);}
