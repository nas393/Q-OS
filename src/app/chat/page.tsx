import ChatWorkspace from "./workspace";
import { loadMetrics } from "@/lib/metrics";
export const dynamic="force-dynamic";
export default async function ChatPage(){
 const {metrics}=await loadMetrics();
 const g=metrics.xauusd;
 return <ChatWorkspace gold={g?{price:g.value.price,changePct:g.value.changePct,updatedAt:g.updatedAt}:null}/>;
}
