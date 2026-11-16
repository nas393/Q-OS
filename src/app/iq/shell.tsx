"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState,type ReactNode} from "react";
import {Toast} from "./ui";

const NAV=[
 ["Intelligence",[["/iq","Dashboard","◈"],["/iq/news","Live News","◉"]]],
 ["Strategy",[["/iq/suggest","Sectors & Ideas","✦"],["/iq/devil","Devil's Advocate","⚔"]]],
 ["Tools",[["/iq/map","Business Map","⌖"],["/iq/trade","Trade Analytics","⇄"],["/iq/ports","Port Arrivals","⚓"],["/iq/watch","Market Watchlist","👁"]]],
 ["Workspace",[["/iq/saved","Saved Items","★"],["/iq/sources","Data Sources","⚙"]]]
] as const;

export function IqShell({children}:{children:ReactNode}){
 const path=usePathname(),router=useRouter();
 const [open,setOpen]=useState(false),[q,setQ]=useState(""),[res,setRes]=useState<Array<{kind:string;id:string;title:string;url:string|null}>>([]);
 useEffect(()=>setOpen(false),[path]);
 const [err,setErr]=useState("");
 /* Any button whose action fails without its own handler shows the error here instead of failing silently. */
 useEffect(()=>{const h=(e:PromiseRejectionEvent)=>{setErr("⚠ "+(e.reason instanceof Error?e.reason.message:"Action failed"));};window.addEventListener("unhandledrejection",h);return()=>window.removeEventListener("unhandledrejection",h);},[]);
 useEffect(()=>{if(q.trim().length<2){setRes([]);return;}const t=setTimeout(()=>fetch("/api/iq/search?q="+encodeURIComponent(q)).then(r=>r.json()).then(j=>setRes(j.results??[])).catch(()=>setRes([])),250);return()=>clearTimeout(t);},[q]);
 const go=(r:{kind:string;id:string;url:string|null})=>{setQ("");setRes([]);if(r.kind==="news"&&r.url)window.open(r.url,"_blank","noopener");else router.push(r.kind==="project"?"/iq/projects":r.kind==="location"?"/iq/map":"/iq/saved");};
 const nav=<nav className="iq-nav" aria-label="AngolaIQ">
  <Link href="/iq" className="iq-brand"><b>Angola<i>IQ</i></b><small>Commercial Suite</small></Link>
  {NAV.map(([g,items])=><div key={g}><span className="iq-group">{g}</span>{items.map(([href,label,ic])=><Link key={href} href={href} className={path===href?"on":""}><em aria-hidden="true">{ic}</em>{label}</Link>)}</div>)}
  <Link href="/dashboard" className="iq-back">← NASSIM OS</Link>
 </nav>;
 return <div className="iq">
  <aside className="iq-side">{nav}</aside>
  {open&&<div className="iq-drawer" onClick={()=>setOpen(false)}><div onClick={e=>e.stopPropagation()}>{nav}</div></div>}
  <div className="iq-main">
   <div className="iq-top">
    <button className="iq-menu" aria-label="Open menu" onClick={()=>setOpen(true)}>☰</button>
    <Link href="/iq" className="iq-top-brand">Angola<i>IQ</i></Link>
    <div className="iq-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search news, analyses, projects…" aria-label="Search AngolaIQ"/>
     {res.length>0&&<ul>{res.map(r=><li key={r.kind+r.id}><button onClick={()=>go(r)}><small>{r.kind}</small>{r.title}</button></li>)}</ul>}</div>
   </div>
   <main className="iq-body">{children}</main>
   <Toast msg={err} onDone={()=>setErr("")}/>
  </div>
 </div>;
}
