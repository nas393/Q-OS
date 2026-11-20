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

/** The web app manifest declared in `html`, as an absolute URL, or null. */
export function manifestHref(html:string,pageUrl:string):string|null{
  for(const tag of html.match(/<link\b[^>]*>/gi)??[]){
    if(attr(tag,"rel").toLowerCase()!=="manifest")continue;
    const href=attr(tag,"href");
    try{return href?new URL(href,pageUrl).href:null;}catch{return null;}
  }
  return null;
}

/** Best icon in a web app manifest: an SVG ("any" size) first, else the largest raster; absolute URL or null. */
export function pickManifestIcon(manifest:unknown,manifestUrl:string):string|null{
  const icons=(manifest as {icons?:{src?:string;sizes?:string;type?:string}[]})?.icons;
  if(!Array.isArray(icons))return null;
  const rank=(i:{src?:string;sizes?:string;type?:string})=>/svg/.test(i.type??"")||/\.svg(\?|$)/i.test(i.src??"")?1e6:
    Math.max(0,...(i.sizes??"").split(/\s+/).map(s=>Number(s.split("x")[0])||0));
  const best=icons.filter(i=>typeof i.src==="string"&&i.src&&!/^data:/i.test(i.src)).sort((a,b)=>rank(b)-rank(a))[0];
  try{return best?.src?new URL(best.src,manifestUrl).href:null;}catch{return null;}
}

/** True when two URLs are on the same site, ignoring a leading "www." (example.com -> www.example.com is fine). */
export function sameSite(a:string,b:string):boolean{
  try{const h=(u:string)=>new URL(u).hostname.toLowerCase().replace(/^www\./,"");return h(a)===h(b);}catch{return false;}
}

/** Fetches the homepage (cached for a day by Next's fetch cache) and returns its icon URL; null on any failure. */
export async function discoverIcon(url:string):Promise<string|null>{
  try{
    const r=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(4000),headers:{Accept:"text/html"},next:{revalidate:86400}} as RequestInit);
    if(!r.ok)return null;
    /* A redirect to another site (e.g. a sign-in wall) would hand us that site's logo: keep only the app's own. */
    if(r.url&&!sameSite(r.url,url))return null;
    const html=(await r.text()).slice(0,200_000);
    const head=html.split(/<\/head>/i)[0];
    let icon=pickIcon(head,r.url||url);
    /* A bare favicon.ico is often a platform default (e.g. a site builder's logo): prefer the app's manifest icon. */
    const man=/\.ico(\?|$)/i.test(icon)?manifestHref(head,r.url||url):null;
    if(man&&sameSite(man,url)){
      const m=await fetch(man,{signal:AbortSignal.timeout(3000),next:{revalidate:86400}} as RequestInit).then(x=>x.ok?x.json():null).catch(()=>null);
      icon=pickManifestIcon(m,man)??icon;
    }
    return icon.startsWith("https://")?icon:null;
  }catch{return null;}
}
