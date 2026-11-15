import {NextResponse} from "next/server";
import {readSession} from "@/lib/session";
import {appPages} from "@/lib/app-pages";

export const dynamic="force-dynamic";
const TEAM_ID="team_sWS7qi1gaGUI9lifKbbjERXj";

type VercelProject={id:string;name:string;updatedAt?:number;framework?:string|null;targets?:{production?:{alias?:string[];readyState?:string;createdAt?:number}|null};alias?:Array<{domain?:string}>};

/* Pick the address a person would open: a custom domain first, then the shortest clean *.vercel.app alias. */
function pickProductionUrl(p:VercelProject){
  const aliases=[...(p.targets?.production?.alias??[]),...(p.alias??[]).map(a=>a.domain??"")].filter(Boolean);
  if(!aliases.length)return null;
  const custom=aliases.find(a=>!a.endsWith(".vercel.app"));
  const clean=aliases.filter(a=>!a.includes("-git-")).sort((a,b)=>a.length-b.length)[0];
  return `https://${custom??clean??aliases[0]}`;
}

/* Owner-only launcher: every project in the Vercel team with its live production address. Read-only. */
export async function GET(){
  if(!await readSession())return NextResponse.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  const token=process.env.VERCEL_TOKEN;
  if(!token)return NextResponse.json({error:"VERCEL_TOKEN is not configured",apps:[]},{status:503,headers:{"Cache-Control":"no-store"}});
  try{
    const url=new URL("https://api.vercel.com/v9/projects");
    url.searchParams.set("teamId",TEAM_ID);url.searchParams.set("limit","100");
    const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
    if(!r.ok)return NextResponse.json({error:`Vercel API returned ${r.status}`,apps:[]},{status:502,headers:{"Cache-Control":"no-store"}});
    const body=await r.json() as {projects?:VercelProject[]};
    const apps=(body.projects??[]).map(p=>{const url=pickProductionUrl(p);return {id:p.id,name:p.name,url,pages:url?(appPages[p.name]??[]).map(x=>({label:x.label,url:url+x.path})):[],state:p.targets?.production?.readyState??null,updatedAt:p.updatedAt??null};})
      .sort((a,b)=>(b.url?1:0)-(a.url?1:0)||(b.updatedAt??0)-(a.updatedAt??0));
    return NextResponse.json({updatedAt:new Date().toISOString(),apps},{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:"Vercel request failed",apps:[]},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
