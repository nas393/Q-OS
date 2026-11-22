/*
 * The Office: Q is the Chief of Staff and every app is an employee at a desk, with one job.
 * Pure data and rules, no "@/..." imports, so tests can load this file with Node's --experimental-strip-types.
 * The live inputs (deploy state, alerts, app numbers) come from data Q OS already collects.
 */
export type Room="corner"|"studio"|"academy"|"markets"|"community"|"screens"|"ops";
export type Staff={id:string;keys:string[];name:string;role:string;job:string;room:Room};
export type Light="ok"|"watch"|"down"|"idle";
export type DeskAlert={level:"red"|"amber"|"info";title:string;body?:string;url?:string|null};
export type DeskInput={state?:string|null;alerts:DeskAlert[];stats:{label:string;value:string}[]};
export type Desk={light:Light;headline:string|null;needs:DeskAlert[];line:string};

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

/** The employee an alert belongs to: the first staff member whose app name or key appears in it, else Ops. */
export function ownerOf(a:DeskAlert,staff:Staff[]=STAFF):string{
  const t=text(a);
  for(const s of staff){
    if(s.id==="q"||s.id==="ops")continue;
    if(s.keys.some(k=>k.length>=4&&t.includes(k))||t.includes(s.name.toLowerCase()))return s.id;
  }
  return "ops";
}

/** One desk: status light, the headline number, what needs you, and the stand-up line. */
export function deskFor(i:DeskInput):Desk{
  const needs=i.alerts.filter(a=>a.level!=="info").sort((a,b)=>(a.level==="red"?0:1)-(b.level==="red"?0:1)).slice(0,3);
  const state=(i.state??"").toUpperCase();
  const light:Light=BAD.has(state)||needs.some(a=>a.level==="red")?"down":BUSY.has(state)||needs.length?"watch":!state&&!i.stats.length?"idle":"ok";
  const s=i.stats[0],headline=s?`${s.value} ${s.label}`:null;
  const line=light==="down"?`Needs you: ${needs[0]?.title??"the last deploy failed"}.`
    :light==="watch"?(needs[0]?`Watching: ${needs[0].title}.`:"Shipping a new version now.")
    :light==="idle"?"No live data at this desk yet."
    :headline?`All good. ${headline}.`:"All good, live.";
  return {light,headline,needs,line};
}

/** Q's stand-up: what needs you first (red, then amber), at most three items, or a clear all-good. */
export function standup(desks:{staff:Staff;desk:Desk}[]):{lines:string[];allClear:boolean}{
  const rank:Record<Light,number>={down:0,watch:1,ok:2,idle:3};
  // Ops only speaks for alerts no app owns; its roll-up would repeat the other desks.
  const urgent=desks.filter(d=>(d.desk.light==="down"||d.desk.light==="watch")&&!(d.staff.id==="ops"&&!d.desk.needs.length)).sort((a,b)=>rank[a.desk.light]-rank[b.desk.light]);
  if(!urgent.length)return {lines:["Nothing needs you right now. Every desk reports in."],allClear:true};
  return {lines:urgent.slice(0,3).map(d=>`${d.staff.name}: ${d.desk.line}`),allClear:false};
}

/** Ops' own desk: a roll-up of the whole floor plus any alert that belongs to no app. */
export function opsDesk(desks:Desk[],stray:DeskAlert[]):Desk{
  const down=desks.filter(d=>d.light==="down").length,watch=desks.filter(d=>d.light==="watch").length;
  const live=desks.filter(d=>d.light==="ok").length;
  const base=deskFor({state:down?"ERROR":watch?"BUILDING":"READY",alerts:stray,stats:[]});
  const line=down?`${down} ${down===1?"app needs":"apps need"} you.`:watch?`${watch} ${watch===1?"app is":"apps are"} changing.`:stray.length?base.line:`All ${live} live apps are up.`;
  return {...base,light:down?"down":watch||stray.some(a=>a.level!=="info")?"watch":"ok",headline:`${live} live`,line};
}
