/* Compact live snapshot sent with every Q question, so Q answers from real data. Client-safe (no server imports). */
type P={name:string;area?:string;priority?:string;next?:string;openIssues?:number|null;lastCommit?:{message:string;date:string}|null;deployment?:{state?:string;target?:string|null}|null};
type T={title:string;due:string|null;done:boolean};
export function buildQContext(i:{projects:P[];tasks?:T[]|null;alerts?:{title:string}[];gold?:{price:number;changePct:number;updatedAt:string}|null}){
 const d=(s?:string)=>s?Math.floor((Date.now()-new Date(s).getTime())/864e5):null;
 const lines=i.projects.map(p=>{const c=p.lastCommit;return `- ${p.name.replace(" / Q","")} [${p.priority??"?"}] ${p.area??""} | deploy: ${p.deployment?.state??"UNKNOWN"}${p.deployment?.target?`/${p.deployment.target}`:""} | last commit: ${c?`${d(c.date)}d ago "${c.message.slice(0,70)}"`:"unknown"} | open issues: ${p.openIssues??"unknown"} | recorded next: ${(p.next??"").slice(0,90)}`;});
 const open=(i.tasks??[]).filter(t=>!t.done).map(t=>`- ${t.title}${t.due?` (due ${t.due})`:""}`);
 return [`SNAPSHOT ${new Date().toISOString()} (Luanda owner: Nassim)`,`VENTURES (${i.projects.length}):`,...lines,
  `ALERTS: ${i.alerts?.length?i.alerts.map(a=>a.title).join("; "):"none"}`,
  `OPEN FOCUS TASKS: ${open.length?"\n"+open.join("\n"):"none recorded"}`,
  `GOLD XAU/USD: ${i.gold?`${i.gold.price.toFixed(2)} (${i.gold.changePct>=0?"+":""}${i.gold.changePct.toFixed(2)}% 24h, updated ${i.gold.updatedAt})`:"no feed"}`,
  "NOT CONNECTED: revenue, sales, growth, content analytics, Instagram metrics."].join("\n").slice(0,8800);
}
