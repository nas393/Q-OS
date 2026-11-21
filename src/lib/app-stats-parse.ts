/*
 * Per-app numbers shown in the Command centre ("63 courses · 4 certificates"). Pure parsing rules, no imports,
 * so tests can load this file directly. Sources are public by design or read through Q OS's own Vercel token;
 * nothing here invents a number: a source that does not answer simply shows nothing.
 */
export type AppStat={label:string;value:string};

const fmt=(n:number)=>n.toLocaleString("en-US");
const num=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)?v:typeof v==="string"&&v.trim()!==""&&Number.isFinite(Number(v))?Number(v):null;
const plural=(n:number,one:string,many:string)=>n===1?one:many;

/* Certigo: public.public_stats() → {courses, holders, issuers, credentials, verifications, verifications_7d}. */
export function certigoStats(json:unknown):AppStat[]{
  if(!json||typeof json!=="object"||Array.isArray(json))return [];
  const o=json as Record<string,unknown>,out:AppStat[]=[];
  const courses=num(o.courses),certs=num(o.credentials),week=num(o.verifications_7d);
  if(courses!==null)out.push({label:plural(courses,"course","courses"),value:fmt(courses)});
  if(certs!==null)out.push({label:plural(certs,"certificate","certificates"),value:fmt(certs)});
  if(week!==null)out.push({label:plural(week,"check this week","checks this week"),value:fmt(week)});
  return out;
}

/* Dalil: its public lists (approved businesses, upcoming events, open jobs) are JSON arrays. */
export const listCount=(json:unknown):number|null=>Array.isArray(json)?json.length:null;
export function dalilStats(businesses:number|null,events:number|null,jobs:number|null):AppStat[]{
  const out:AppStat[]=[];
  if(businesses!==null)out.push({label:plural(businesses,"business","businesses"),value:fmt(businesses)});
  if(events!==null)out.push({label:plural(events,"event","events"),value:fmt(events)});
  if(jobs!==null)out.push({label:plural(jobs,"job","jobs"),value:fmt(jobs)});
  return out;
}

/* Vercel Web Analytics page-view count. Accepts {data:{count}}, {count}, {data:[{count|total}...]} and the
   total/pageViews/visits spellings; anything else is "no answer" (null), never zero. */
export function visitCount(json:unknown):number|null{
  const pick=(o:unknown):number|null=>{
    if(!o||typeof o!=="object")return null;
    const r=o as Record<string,unknown>;
    for(const k of ["count","total","pageViews","pageviews","visits"]){const n=num(r[k]);if(n!==null)return n;}
    return null;
  };
  if(!json||typeof json!=="object")return null;
  const root=json as Record<string,unknown>;
  const direct=pick(root.data)??pick(root);
  if(direct!==null)return direct;
  if(Array.isArray(root.data)){
    let sum=0,seen=false;
    for(const row of root.data){const n=pick(row);if(n!==null){sum+=n;seen=true;}}
    return seen?sum:null;
  }
  return null;
}
export const visitStat=(n:number):AppStat=>({label:plural(n,"page view · 7 days","page views · 7 days"),value:fmt(n)});

/* One short line for lists: "63 courses · 4 certificates". */
export const statLine=(stats:AppStat[]|undefined)=>(stats??[]).slice(0,3).map(s=>`${s.value} ${s.label}`).join(" · ");
