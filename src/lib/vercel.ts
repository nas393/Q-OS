export const TEAM_ID="team_sWS7qi1gaGUI9lifKbbjERXj";

export type VercelProject={id:string;name:string;updatedAt?:number;framework?:string|null;targets?:{production?:{alias?:string[];readyState?:string;createdAt?:number}|null};alias?:Array<{domain?:string}>};

/* Pick the address a person would open: a custom domain first, then the shortest clean *.vercel.app alias. */
export function pickProductionUrl(p:VercelProject){
  const aliases=[...(p.targets?.production?.alias??[]),...(p.alias??[]).map(a=>a.domain??"")].filter(Boolean);
  if(!aliases.length)return null;
  const custom=aliases.find(a=>!a.endsWith(".vercel.app"));
  const clean=aliases.filter(a=>!a.includes("-git-")).sort((a,b)=>a.length-b.length)[0];
  return `https://${custom??clean??aliases[0]}`;
}

export async function vercelGet<T>(path:string,params:Record<string,string>={}):Promise<T>{
  const token=process.env.VERCEL_TOKEN;
  if(!token)throw new Error("VERCEL_TOKEN is not configured");
  const url=new URL(`https://api.vercel.com${path}`);
  url.searchParams.set("teamId",TEAM_ID);
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error(`Vercel API returned ${r.status}`);
  return r.json() as Promise<T>;
}

export const listProjects=async()=>(await vercelGet<{projects?:VercelProject[]}>("/v9/projects",{limit:"100"})).projects??[];
