import {getDb} from "@/lib/db";
import {ensureSchema} from "@/lib/schema";
import {jsonFromAI} from "@/lib/iq/ai";
import {loadMetrics} from "@/lib/metrics";
import {recentAlerts,systemHealth} from "@/lib/alerts";
import {listTasks,doneThisWeek} from "@/lib/tasks";
import {loadApprovals} from "@/lib/approvals";
import {loadAppStats} from "@/lib/app-stats";
import {listProjects} from "@/lib/vercel";
import {JOBS,jobById,isoWeek,parseWork,promptFor,healthReport,weeklyReview,queuePlan,type Job,type WorkBody} from "./jobs";

/* Office phase 3: employees make drafts; the owner approves or discards each one. Nothing here posts or sends anything. */
export type Work={id:string;staff:string;job:string;title:string;body:WorkBody;status:"waiting"|"approved"|"discarded";createdAt:string;decidedAt:string|null};
const row=(r:Record<string,unknown>):Work=>({id:String(r.id),staff:String(r.staff),job:String(r.job),title:String(r.title),body:r.body as WorkBody,status:r.status as Work["status"],
  createdAt:new Date(r.created_at as string).toISOString(),decidedAt:r.decided_at?new Date(r.decided_at as string).toISOString():null});

/** Waiting drafts first, then the last two weeks of decided ones. */
export async function listWork(limit=40):Promise<Work[]>{
  await ensureSchema();
  const {rows}=await getDb().query("SELECT * FROM q_office_work WHERE status='waiting' OR created_at>now()-interval '14 days' ORDER BY (status='waiting') DESC, created_at DESC LIMIT $1",[limit]);
  return rows.map(row);
}

export async function decideWork(id:string,decision:"approved"|"discarded"):Promise<Work|null>{
  await ensureSchema();
  const {rows}=await getDb().query("UPDATE q_office_work SET status=$2, decided_at=now() WHERE id=$1 AND status='waiting' RETURNING *",[id,decision]);
  return rows[0]?row(rows[0]):null;
}

async function pastTitles(job:Job){
  const {rows}=await getDb().query("SELECT body FROM q_office_work WHERE job=$1 AND status='approved' ORDER BY created_at DESC LIMIT 6",[job.id]);
  return rows.flatMap(r=>((r.body as WorkBody).items??[]).map(i=>i.title)).slice(0,15);
}

/** Builds the draft for a job from the data Q already has. AI jobs use the existing Groq/Gemini keys. */
async function makeBody(job:Job):Promise<WorkBody>{
  const today=new Date().toISOString().slice(0,10);
  if(job.id==="health-report"){
    const [h,alerts,projects]=await Promise.all([systemHealth(),recentAlerts(30),listProjects().catch(()=>[])]);
    return healthReport({...h,alerts,stateByApp:Object.fromEntries(projects.map(p=>[p.name,p.targets?.production?.readyState??"UNKNOWN"]))});
  }
  if(job.id==="weekly-review"){
    const [done,tasks,ap,alerts]=await Promise.all([doneThisWeek(),listTasks(),loadApprovals(),recentAlerts(30)]);
    return weeklyReview({doneWeek:done,open:tasks.filter(t=>!t.done).map(t=>({title:t.title,due:t.due})),today,approvals:ap.items,alerts});
  }
  if(job.id==="queue-plan"){const ap=await loadApprovals();return queuePlan(ap.items.filter(a=>a.app==="dalil"));}
  let evidence="";
  if(job.id==="gold-note"){const m=await loadMetrics();evidence=`XAU/USD metrics stored by Q: ${JSON.stringify(m.metrics.xauusd??null).slice(0,3000)}`;}
  if(job.id==="course-promo"){const s=await loadAppStats().catch(()=>null);evidence=`Certigo numbers: ${JSON.stringify(s?.stats?.certigo?.stats??[])}`;}
  if(job.id==="week-posts"||job.id==="week-reels"){const past=await pastTitles(job);evidence=past.length?`Past approved subjects (do not repeat): ${past.join(" | ")}`:"";}
  const p=promptFor(job,evidence);
  const out=await jsonFromAI(p.system,p.user);
  return parseWork(job,out.data);
}

/** Runs one job and stores its draft. A weekly run passes its ISO week, so it drafts at most once per week. */
export async function runJob(jobId:string,period:string|null=null):Promise<Work|null>{
  const job=jobById(jobId);
  if(!job)throw new Error("Unknown job");
  await ensureSchema();
  if(period){const {rows}=await getDb().query("SELECT 1 FROM q_office_work WHERE staff=$1 AND job=$2 AND period=$3",[job.staff,job.id,period]);if(rows.length)return null;}
  const body=await makeBody(job);
  const {rows}=await getDb().query("INSERT INTO q_office_work (staff,job,title,body,period) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *",[job.staff,job.id,job.label.replace(/^(Draft|Write|Prepare|Plan) /,""),JSON.stringify(body),period]);
  return rows[0]?row(rows[0]):null;
}

/** Called by the scheduled checks: each weekly job drafts once per ISO week (the first check of the week). */
export async function runWeeklyJobs(out:string[]=[]){
  const week=isoWeek();
  for(const j of JOBS.filter(x=>x.weekly)){
    try{const w=await runJob(j.id,week);if(w)out.push(`office: ${j.staff} drafted ${j.id} for ${week}`);}
    catch(e){out.push(`office: ${j.id} failed: ${e instanceof Error?e.message:"error"}`);}
  }
}
