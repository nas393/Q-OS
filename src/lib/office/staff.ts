/*
 * The Office: Q is the Chief of Staff and every app is an employee at a desk, with one job.
 * Pure data and rules, no "@/..." imports, so tests can load this file with Node's --experimental-strip-types.
 * The live inputs (deploy state, alerts, app numbers, delegated tasks, approvals) come from data Q OS already has.
 */
export type Room="corner"|"studio"|"academy"|"markets"|"community"|"screens"|"ops";
export type Staff={id:string;keys:string[];name:string;role:string;job:string;room:Room};
export type Light="ok"|"watch"|"down"|"idle";
export type DeskAlert={id?:number;level:"red"|"amber"|"info";title:string;body?:string;url?:string|null};
export type DeskTask={id:string;title:string;project:string|null;due:string|null;done:boolean};
export type DeskApproval={app:string;kind:string;label:string;count:number;url:string};
/** Something that needs you at a desk: an alert, an approval waiting for your yes, or a delegated task that is late. */
export type DeskDraft={id:string;title:string};
export type Need={kind:"alert"|"approval"|"draft"|"task";level:"red"|"amber";title:string;url?:string|null;alertId?:number;taskId?:string;workId?:string};
export type DeskInput={state?:string|null;alerts:DeskAlert[];stats:{label:string;value:string}[];tasks?:DeskTask[];approvals?:DeskApproval[];drafts?:DeskDraft[];today?:string};
export type Desk={light:Light;headline:string|null;needs:Need[];line:string;open:DeskTask[];overdue:DeskTask[]};

export const ROOMS:Record<Room,{label:string;note:string}>={
  corner:{label:"Chief of Staff",note:"Q's office"},
  studio:{label:"Media studio",note:"Brand and content"},
  academy:{label:"Academy",note:"Learning"},
  markets:{label:"Markets desk",note:"Trading and intelligence"},
  community:{label:"Community hall",note:"Neighbours and family"},
  screens:{label:"Screening room",note:"TV and streaming"},
  ops:{label:"Server room",note:"Builds, uptime, speed"}
};

export const STAFF:Staff[]=[
  {id:"q",keys:["q-jarvis","q-os"],name:"Q",role:"Chief of Staff",job:"Runs the office, writes the morning brief and tells you what needs you.",room:"corner"},
  {id:"novae",keys:["novae","novae-site"],name:"NOVAÉ",role:"Marketing Director",job:"Brand studio: positioning, content, the free guide and free audits.",room:"studio"},
  {id:"lumeris",keys:["lumeris"],name:"Lumeris",role:"Content Creator",job:"Reels and posts for @lumeris, made in the Studio.",room:"studio"},
  {id:"certigo",keys:["certigo","certigo-institute"],name:"Certigo",role:"Head of Learning",job:"Courses, exams and verifiable certificates.",room:"academy"},
  {id:"ali-quest",keys:["ali-quest","ali-quest-battle-academy"],name:"Ali Quest",role:"Tutor",job:"The study game and its AI study decks.",room:"academy"},
  {id:"xauusd",keys:["xauusd","counter-trader","xau/usd","gold"],name:"Counter-Trader",role:"Gold Analyst",job:"XAU/USD signals, risk and the track record.",room:"markets"},
  {id:"lep",keys:["lep","luanda-edge-pulse"],name:"Edge Pulse",role:"Intelligence Analyst",job:"Angola market intelligence (Base44), next to AngolaIQ in Q OS.",room:"markets"},
  {id:"dalil",keys:["dalil","dalil-al-bazouria","dalil-al-bazourieh"],name:"Dalil",role:"Community Manager",job:"Al-Bazourieh directory, jobs, events and photos; everything waits for your approval.",room:"community"},
  {id:"radio",keys:["radio","radio-cedars"],name:"Radio Cedars",role:"Family Host",job:"The family living room: radio, TV, rooms, games and the cookbook.",room:"community"},
  {id:"ala-hawa",keys:["ala-hawa"],name:"Ala Hawa",role:"TV Producer",job:"The IPTV app for the TV, with skins and multi-view.",room:"screens"},
  {id:"arz",keys:["arz-vidaa","arz"],name:"ARZ",role:"Streaming Lead",job:"The VIDAA TV streaming app, still in development.",room:"screens"},
  {id:"ops",keys:[],name:"Ops",role:"IT Manager",job:"Watches builds, uptime and speed across every app.",room:"ops"}
];

const BAD=new Set(["ERROR","CANCELED","FAILED"]),BUSY=new Set(["BUILDING","QUEUED","INITIALIZING"]);
const text=(a:DeskAlert)=>`${a.title} ${a.body??""} ${a.url??""}`.toLowerCase();
const fold=(s:string)=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();

/** The employee an alert belongs to: the first staff member whose app name or key appears in it, else Ops. */
export function ownerOf(a:DeskAlert,staff:Staff[]=STAFF):string{
  const t=text(a);
  for(const s of staff){
    if(s.id==="q"||s.id==="ops")continue;
    if(s.keys.some(k=>k.length>=4&&t.includes(k))||t.includes(s.name.toLowerCase()))return s.id;
  }
  return "ops";
}

/** The employee a task was given to: its project is the employee's name (or app key). Unassigned tasks stay with Q. */
export function assigneeOf(t:Pick<DeskTask,"project">,staff:Staff[]=STAFF):string{
  const p=fold(t.project??"");
  if(!p)return "q";
  const hit=staff.find(s=>fold(s.name)===p||s.keys.some(k=>fold(k)===p)||s.id===p);
  return hit?.id??"q";
}

/** One desk: status light, the headline number, what needs you, its delegated tasks, and the stand-up line. */
export function deskFor(i:DeskInput):Desk{
  const today=i.today??new Date().toISOString().slice(0,10);
  const open=(i.tasks??[]).filter(t=>!t.done);
  const overdue=open.filter(t=>t.due&&t.due<today);
  const alertNeeds:Need[]=i.alerts.filter(a=>a.level!=="info").map(a=>({kind:"alert",level:a.level as "red"|"amber",title:a.title,url:a.url??null,alertId:a.id}));
  const approvalNeeds:Need[]=(i.approvals??[]).filter(a=>a.count>0).map(a=>({kind:"approval",level:"amber",title:`${a.label}: ${a.count}`,url:a.url}));
  const taskNeeds:Need[]=overdue.map(t=>({kind:"task",level:"amber",title:t.title,taskId:t.id}));
  const draftNeeds:Need[]=(i.drafts??[]).map(d=>({kind:"draft",level:"amber",title:d.title,workId:d.id}));
  const rank=(n:Need)=>n.level==="red"?0:n.kind==="approval"?1:n.kind==="draft"?2:n.kind==="task"?3:4;
  const needs=[...alertNeeds,...approvalNeeds,...draftNeeds,...taskNeeds].sort((a,b)=>rank(a)-rank(b));
  const state=(i.state??"").toUpperCase();
  const light:Light=BAD.has(state)||needs.some(n=>n.level==="red")?"down":BUSY.has(state)||needs.length?"watch":!state&&!i.stats.length&&!open.length?"idle":"ok";
  const s=i.stats[0],headline=s?`${s.value} ${s.label}`:null;
  const top=needs[0];
  const line=light==="down"?`Needs you: ${top?.title??"the last deploy failed"}.`
    :top?.kind==="approval"?`Waiting for your yes: ${top.title}.`
    :top?.kind==="draft"?`Draft ready for your yes: ${top.title}.`
    :top?.kind==="task"?`Behind on a task you gave: ${top.title}.`
    :light==="watch"?(top?`Watching: ${top.title}.`:"Shipping a new version now.")
    :light==="idle"?"No live data at this desk yet."
    :open.length?`On it: ${open.length} ${open.length===1?"task":"tasks"} from you.${headline?` ${headline}.`:""}`
    :headline?`All good. ${headline}.`:"All good, live.";
  return {light,headline,needs,line,open,overdue};
}

/** Q's stand-up: what needs you first (red, approvals, late tasks, then the rest), at most three items, or a clear all-good. */
export function standup(desks:{staff:Staff;desk:Desk}[]):{lines:string[];allClear:boolean}{
  const rank=(d:Desk)=>d.light==="down"?0:d.needs[0]?.kind==="approval"?1:d.needs[0]?.kind==="draft"?2:d.needs[0]?.kind==="task"?3:4;
  // Ops only speaks for alerts no app owns; its roll-up would repeat the other desks.
  const urgent=desks.filter(d=>(d.desk.light==="down"||d.desk.light==="watch")&&!(d.staff.id==="ops"&&!d.desk.needs.length)).sort((a,b)=>rank(a.desk)-rank(b.desk));
  if(!urgent.length)return {lines:["Nothing needs you right now. Every desk reports in."],allClear:true};
  return {lines:urgent.slice(0,3).map(d=>`${d.staff.name}: ${d.desk.line}`),allClear:false};
}

/** Ops' own desk: a roll-up of the whole floor plus any alert that belongs to no app. */
export function opsDesk(desks:Desk[],stray:DeskAlert[]):Desk{
  const down=desks.filter(d=>d.light==="down").length,watch=desks.filter(d=>d.light==="watch").length;
  const live=desks.filter(d=>d.light==="ok").length;
  const base=deskFor({state:"READY",alerts:stray,stats:[]});
  const line=down?`${down} ${down===1?"app needs":"apps need"} you.`:watch?`${watch} ${watch===1?"app is":"apps are"} waiting on something.`:stray.length?base.line:`All ${live} live apps are up.`;
  return {...base,light:down?"down":watch||base.needs.length?"watch":"ok",headline:`${live} live`,line};
}

/** Every need on the floor, for the approvals inbox: red first, then approvals, late tasks and amber alerts. */
export function inbox(desks:{staff:Staff;desk:Desk}[]):{staff:Staff;need:Need}[]{
  const rank=(n:Need)=>n.level==="red"?0:n.kind==="approval"?1:n.kind==="draft"?2:n.kind==="task"?3:4;
  return desks.flatMap(d=>d.desk.needs.map(need=>({staff:d.staff,need}))).sort((a,b)=>rank(a.need)-rank(b.need));
}

/** Validates one app's /pending answer: items with a label, a count and a link (relative links are made absolute). */
export function parseApprovals(app:string,base:string,body:unknown):DeskApproval[]{
  const items=(body as {items?:unknown})?.items;
  if(!Array.isArray(items))return [];
  return items.flatMap(x=>{
    const o=x as Record<string,unknown>;
    const count=Number(o.count),label=String(o.label??"").slice(0,80),kind=String(o.kind??"").slice(0,30);
    if(!label||!Number.isInteger(count)||count<0||count>100000)return [];
    let url=String(o.url??"/");
    try{url=new URL(url,base).toString();if(new URL(url).origin!==new URL(base).origin)url=base;}catch{url=base;}
    return [{app,kind,label,count,url}];
  });
}
