/*
 * App icons come from the web apps themselves: read each app's homepage <head> and pick its best icon.
 * Preference: apple-touch-icon (square, 180px, made for app grids) > SVG icon > largest PNG icon > /favicon.ico.
 * Pure parsing lives in pickIcon() so it can be unit-tested (tests/app-icons.test.mjs); keep this file free of
 * "@/..." imports so Node can load it directly with --experimental-strip-types.
 */

type Candidate={href:string;rel:string;sizes:number;type:string};

const attr=(tag:string,name:string)=>{
  const m=new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,"i").exec(tag);
  return (m?.[2]??m?.[3]??m?.[4]??"").trim();
};

function score(c:Candidate){
  if(/apple-touch-icon/.test(c.rel))return 3000+c.sizes;
  if(c.type.includes("svg")||/\.svg(\?|$)/i.test(c.href))return 2000;
  if(/icon/.test(c.rel))return 1000+c.sizes;
  return 0;
}

/** Returns the absolute URL of the best icon declared in `html`, or `${origin}/favicon.ico` when none is declared. */
export function pickIcon(html:string,pageUrl:string):string{
  const base=new URL(pageUrl);
  const baseHref=/<base\b[^>]*>/i.exec(html);
  const root=baseHref&&attr(baseHref[0],"href")?new URL(attr(baseHref[0],"href"),base):base;
  const cands:Candidate[]=[];
  for(const tag of html.match(/<link\b[^>]*>/gi)??[]){
    const rel=attr(tag,"rel").toLowerCase(),href=attr(tag,"href");
    if(!href||!/(^|\s)(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)(\s|$)/.test(rel))continue;
    if(/^data:/i.test(href))continue;
    const sizes=Math.max(0,...attr(tag,"sizes").split(/\s+/).map(s=>Number(s.split("x")[0])||0));
    cands.push({href,rel,sizes,type:attr(tag,"type").toLowerCase()});
  }
  cands.sort((a,b)=>score(b)-score(a));
  try{return cands[0]?new URL(cands[0].href,root).href:new URL("/favicon.ico",base).href;}
  catch{return new URL("/favicon.ico",base).href;}
}

/** Fetches the homepage (cached for a day by Next's fetch cache) and returns its icon URL; null on any failure. */
export async function discoverIcon(url:string):Promise<string|null>{
  try{
    const r=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(4000),headers:{Accept:"text/html"},next:{revalidate:86400}} as RequestInit);
    if(!r.ok)return null;
    const html=(await r.text()).slice(0,200_000);
    const head=html.split(/<\/head>/i)[0];
    const icon=pickIcon(head,r.url||url);
    return icon.startsWith("https://")?icon:null;
  }catch{return null;}
}
