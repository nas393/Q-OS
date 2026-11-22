import {requireOwner} from "@/lib/auth";
import {recentAlerts} from "@/lib/alerts";
import {loadAppStats} from "@/lib/app-stats";
import {loadApprovals} from "@/lib/approvals";
import {listTasks} from "@/lib/tasks";
import {OfficeFloor} from "./floor";

export const dynamic="force-dynamic";
export const metadata={title:"Office"};

/* The Office opens even when the database or an app is down: each source falls back on its own. Live deploy states load in the browser. */
export default async function OfficePage(){
  await requireOwner();
  const [alerts,stats,tasks,approvals]=await Promise.all([
    recentAlerts(50).catch(()=>[]),
    loadAppStats().then(r=>r.stats).catch(()=>({})),
    listTasks().catch(()=>[]),
    loadApprovals().catch(()=>({items:[],failed:[]}))
  ]);
  return <OfficeFloor alerts={alerts.map(a=>({id:a.id,level:a.level,title:a.title,body:a.body,url:a.url}))} stats={stats}
    tasks={tasks.map(t=>({id:t.id,title:t.title,project:t.project,due:t.due,done:t.done}))} approvals={approvals.items} approvalsFailed={approvals.failed}
    today={new Date().toISOString().slice(0,10)}/>;
}
