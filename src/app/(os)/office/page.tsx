import {requireOwner} from "@/lib/auth";
import {recentAlerts} from "@/lib/alerts";
import {loadAppStats} from "@/lib/app-stats";
import {OfficeFloor} from "./floor";

export const dynamic="force-dynamic";
export const metadata={title:"Office"};

/* The Office opens even when the database is down: each source falls back on its own. Live deploy states load in the browser. */
export default async function OfficePage(){
  await requireOwner();
  const [alerts,stats]=await Promise.all([
    recentAlerts(50).catch(()=>[]),
    loadAppStats().then(r=>r.stats).catch(()=>({}))
  ]);
  return <OfficeFloor alerts={alerts.map(a=>({level:a.level,title:a.title,body:a.body,url:a.url}))} stats={stats}/>;
}
