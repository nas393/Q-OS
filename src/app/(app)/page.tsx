import {recentAlerts} from "@/lib/alerts";
import {listTasks} from "@/lib/tasks";
import {Command} from "@/design/command";

export const dynamic="force-dynamic";
export const metadata={title:"Command"};

/* Command opens even when the database is down: each source falls back on its own. */
export default async function CommandPage(){
  const [alerts,tasks]=await Promise.all([
    recentAlerts(20).catch(()=>[]),
    listTasks().catch(()=>[])
  ]);
  return <Command
    alerts={alerts.map(a=>({id:a.id,level:a.level,title:a.title,body:a.body,url:a.url}))}
    tasks={tasks.map(t=>({id:t.id,title:t.title,project:t.project,due:t.due,done:t.done}))}
    today={new Date().toISOString().slice(0,10)}
  />;
}
