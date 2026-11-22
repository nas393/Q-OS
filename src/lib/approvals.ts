import {parseApprovals,type DeskApproval} from "@/lib/office/staff";

/*
 * The Office approvals inbox asks each app how many things wait for the owner's yes.
 * Each app answers counts only, behind the shared Q_APPROVALS_TOKEN (set in Q OS and in each app on Vercel).
 */
const SOURCES=[
  {app:"dalil",base:"https://dalil-al-bazouria.vercel.app",path:"/api/q/pending"},
  {app:"radio",base:"https://radio-cedars.vercel.app",path:"/api/qos/pending"},
  {app:"xauusd",base:"https://counter-trader.vercel.app",path:"/api/auth?a=q-pending"}
] as const;

export type Approvals={items:DeskApproval[];failed:string[]};
let cache:{at:number;v:Approvals}|null=null;

/** Counts from every app, cached for a minute per server instance. An app that does not answer is listed in `failed`. */
export async function loadApprovals():Promise<Approvals>{
  if(cache&&Date.now()-cache.at<60_000)return cache.v;
  const token=process.env.Q_APPROVALS_TOKEN;
  if(!token)return {items:[],failed:SOURCES.map(s=>s.app)};
  const got=await Promise.all(SOURCES.map(async s=>{
    try{
      const r=await fetch(s.base+s.path,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(6000)});
      if(!r.ok)throw new Error(String(r.status));
      return {app:s.app,items:parseApprovals(s.app,s.base,await r.json())};
    }catch{return {app:s.app,items:null}}
  }));
  const v={items:got.flatMap(g=>g.items??[]),failed:got.filter(g=>g.items===null).map(g=>g.app)};
  cache={at:Date.now(),v};
  return v;
}
