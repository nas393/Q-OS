import {requireOwner} from "@/lib/auth";
import {alertHistory} from "@/lib/alerts";
import {AlertsView} from "./view";

export const dynamic="force-dynamic";
export const metadata={title:"Alerts"};

export default async function AlertsPage({searchParams}:{searchParams:Promise<{level?:string;q?:string}>}){
 await requireOwner();
 const sp=await searchParams,level=["red","amber","info"].includes(sp.level??"")?sp.level:undefined,q=(sp.q??"").trim().slice(0,60)||undefined;
 const rows=await alertHistory({level,q,limit:200}).catch(()=>null);
 return <AlertsView rows={rows} level={level} q={q}/>;
}
