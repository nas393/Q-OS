/*
 * Office phase 3: the jobs each employee can do. A job makes a DRAFT; nothing is posted or sent.
 * The owner approves or discards every draft in the Office inbox.
 * Pure data and rules, no "@/..." imports, so tests can load this file with Node's --experimental-strip-types.
 */
export type WorkItem={title:string;text:string;link?:string|null};
export type WorkBody={summary:string;items:WorkItem[];note?:string};
export type Job={id:string;staff:string;label:string;weekly:boolean;ai:boolean;what:string};

export const JOBS:Job[]=[
  {id:"week-posts",staff:"novae",label:"Draft this week's 3 posts",weekly:true,ai:true,what:"Three Instagram post ideas in Portuguese for @novae.brandstudio, each ready to open in NOVAE Studio."},
  {id:"week-reels",staff:"lumeris",label:"Draft this week's 3 reels",weekly:true,ai:true,what:"Three reel ideas for @lumeris, each ready to open in Lumeris Studio."},
  {id:"course-promo",staff:"certigo",label:"Draft a course promotion",weekly:false,ai:true,what:"One post that promotes Certigo's courses and verifiable certificates."},
  {id:"gold-note",staff:"xauusd",label:"Write the weekly gold note",weekly:true,ai:true,what:"A short XAU/USD note from the latest numbers Q has, with no invented figures."},
  {id:"queue-plan",staff:"dalil",label:"Plan the review queue",weekly:false,ai:false,what:"What to review first in Dalil, from the live counts."},
  {id:"health-report",staff:"ops",label:"Write the weekly health report",weekly:true,ai:false,what:"Builds, checks and open alerts across every app this week."},
  {id:"weekly-review",staff:"q",label:"Prepare my weekly review",weekly:true,ai:false,what:"Tasks done and open, approvals waiting and alerts, in one page."}
];
export const jobsFor=(staff:string)=>JOBS.filter(j=>j.staff===staff);
export const jobById=(id:string)=>JOBS.find(j=>j.id===id)??null;

/** Studio deep links: Autopilot opens with the subject already typed. */
export const STUDIO:Record<string,string>={novae:"https://novae-mu.vercel.app/studio",lumeris:"https://lumeris-mocha.vercel.app/studio"};
export const studioLink=(staff:string,subject:string)=>STUDIO[staff]?`${STUDIO[staff]}?subject=${encodeURIComponent(subject.slice(0,200))}`:null;

/** ISO week like "2026-W48", used so a weekly job drafts once per week. */
export function isoWeek(d=new Date()):string{
  const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
  const y=t.getUTCFullYear(),w=Math.ceil(((t.getTime()-Date.UTC(y,0,1))/864e5+1)/7);
  return `${y}-W${String(w).padStart(2,"0")}`;
}

const NOVAE_VOICE="NOVAE is a brand and marketing studio in Luanda, Angola, for founders, personal brands and growing businesses. Brand line: 'Muitas marcas são vistas. Poucas são escolhidas.' Pillars: Posição, Presença, Crescimento. Voice: calm, confident, clear, warm; short contrast lines. Portuguese as written in Angola: say 'publicações' (not 'posts'), 'website', 'auditoria gratuita'. Easy grammar. Never invent numbers, client results or guarantees.";
const LUMERIS_VOICE="LUMERIS is a faceless Instagram page about psychology and confidence for overthinkers. Voice: calm, cold, direct; short hard truths; no emojis, no cliches; simple English.";
const RULES="Return ONLY valid JSON. Keep every text short and easy to read. Never invent statistics, client names, results or quotes.";

/** The AI prompt for a job, given the evidence Q collected (numbers, past titles). */
export function promptFor(job:Job,evidence:string):{system:string;user:string}{
  const shape='{"summary":"one line","items":[{"title":"short subject, max 10 words","text":"the draft, 2-4 short sentences"}]}';
  const ask:Record<string,string>={
    "week-posts":`${NOVAE_VOICE}\nTASK: Propose 3 Instagram post subjects for this week, each different (one per pillar if possible). For each, write a short caption draft in Portuguese with one call to action (follow @novae.brandstudio or ask for the free audit). Avoid repeating past subjects.`,
    "week-reels":`${LUMERIS_VOICE}\nTASK: Propose 3 reel subjects for this week, each with a 2-3 line hook script. Avoid repeating past subjects.`,
    "course-promo":`Certigo sells short professional courses with verifiable certificates (employers check a certificate number or QR code online).\nTASK: Write 1 promotion post (title + text) for LinkedIn or Instagram. Use only the numbers in the evidence, if any.`,
    "gold-note":`You write a weekly XAU/USD (gold) note for the owner of a gold signals app.\nTASK: 3 short items: what price did, what to watch, one risk reminder. Use ONLY numbers present in the evidence; if a number is missing, say it is not available. Not financial advice.`
  };
  return {system:`${ask[job.id]??`TASK: ${job.what}`}\n${RULES}\nJSON SHAPE: ${shape}`,user:`EVIDENCE:\n${evidence.slice(0,6000)||"(none)"}`};
}

/** Validates the AI's answer into a draft: 1-5 items, every text trimmed and capped, studio links added where they apply. */
export function parseWork(job:Job,raw:unknown):WorkBody{
  const o=(raw??{}) as {summary?:unknown;items?:unknown};
  const clip=(v:unknown,n:number)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
  const items=(Array.isArray(o.items)?o.items:[]).slice(0,5).map(x=>{
    const i=x as {title?:unknown;text?:unknown};
    const title=clip(i.title,120),text=clip(i.text,900);
    return {title,text,link:studioLink(job.staff,title)};
  }).filter(i=>i.title&&i.text);
  if(!items.length)throw new Error("The draft came back empty. Try again.");
  return {summary:clip(o.summary,200)||job.label,items};
}

/** Ops' weekly health report, from data Q already has (no AI). */
export function healthReport(i:{runs:number;failed:number;avgMs:number;alerts:{level:string;title:string}[];stateByApp:Record<string,string>}):WorkBody{
  const apps=Object.entries(i.stateByApp),bad=apps.filter(([,s])=>["ERROR","CANCELED","FAILED"].includes(s));
  const red=i.alerts.filter(a=>a.level==="red"),amber=i.alerts.filter(a=>a.level==="amber");
  return {summary:bad.length||red.length?`${bad.length+red.length} things need you this week.`:"A quiet week: every app is up.",items:[
    {title:"Apps",text:apps.length?`${apps.length-bad.length} of ${apps.length} apps live.${bad.length?` Down: ${bad.map(([n])=>n).join(", ")}.`:""}`:"App states were not available."},
    {title:"Checks",text:`${i.runs} automatic checks in the last 24 hours, ${i.failed} with errors, about ${(i.avgMs/1000).toFixed(1)} s each.`},
    {title:"Open alerts",text:red.length||amber.length?`${red.length} red, ${amber.length} amber. ${[...red,...amber].slice(0,3).map(a=>a.title).join(" · ")}`:"No open alerts."}
  ]};
}

/** Q's weekly review: tasks, approvals and alerts (no AI). */
export function weeklyReview(i:{doneWeek:number;open:{title:string;due:string|null}[];today:string;approvals:{label:string;count:number}[];alerts:{level:string}[]}):WorkBody{
  const late=i.open.filter(t=>t.due&&t.due<i.today),waiting=i.approvals.filter(a=>a.count>0);
  const red=i.alerts.filter(a=>a.level==="red").length;
  return {summary:`${i.doneWeek} tasks done this week, ${i.open.length} open.`,items:[
    {title:"Tasks",text:`${i.doneWeek} done in 7 days. ${i.open.length} open${late.length?`, ${late.length} late: ${late.slice(0,3).map(t=>t.title).join(" · ")}`:", none late"}.`},
    {title:"Waiting for your yes",text:waiting.length?waiting.map(a=>`${a.label}: ${a.count}`).join(" · "):"Nothing waits for approval."},
    {title:"Alerts",text:red?`${red} red ${red===1?"alert is":"alerts are"} still open.`:"No red alerts open."},
    {title:"Next week",text:late.length?`Start with: ${late[0].title}.`:waiting.length?`Start with: ${waiting[0].label.toLowerCase()}.`:"Pick one growth task for the week."}
  ]};
}

/** Dalil's queue plan: what to review first, from the live counts (no AI). */
export function queuePlan(approvals:{label:string;count:number;url:string}[]):WorkBody{
  const q=approvals.filter(a=>a.count>0).sort((a,b)=>b.count-a.count);
  if(!q.length)return {summary:"The review queue is empty.",items:[{title:"Queue",text:"Nothing waits for review in Dalil."}]};
  return {summary:`${q.reduce((n,a)=>n+a.count,0)} items wait for review.`,items:q.map((a,i)=>({title:`${i+1}. ${a.label}`,text:`${a.count} waiting. ${i===0?"Start here: it is the longest line.":"Then this."}`,link:a.url}))};
}
