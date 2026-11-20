"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Fragment,useEffect,useState,type ReactNode} from "react";
import {IQ_PAGES} from "@/components/shell/nav";
import {Toast} from "./ui";

/* AngolaIQ inside the Q OS shell: the standard page frame plus a sub-navigation for its pages.
   Search lives in the global palette (Ctrl/Cmd K), which also searches AngolaIQ news, projects and saved items. */
export function IqShell({children}:{children:ReactNode}){
 const path=(usePathname()??"/iq").replace(/^\/zzprev(?=\/|$)/,"");
 const [err,setErr]=useState("");
 /* Any action that fails without its own handler shows the error instead of failing silently. */
 useEffect(()=>{const h=(e:PromiseRejectionEvent)=>{setErr(e.reason instanceof Error?e.reason.message:"That action failed. Try again.");};window.addEventListener("unhandledrejection",h);return()=>window.removeEventListener("unhandledrejection",h);},[]);
 return <div className="page wide iq">
  <nav className="subnav" aria-label="AngolaIQ pages">
   {IQ_PAGES.map((p,i)=><Fragment key={p.href}>{i>0&&IQ_PAGES[i-1].group!==p.group&&<span className="sep" aria-hidden="true"/>}
    <Link href={p.href} aria-current={path===p.href?"page":undefined} title={p.desc}>{p.label}</Link></Fragment>)}
  </nav>
  {children}
  <Toast msg={err} onDone={()=>setErr("")}/>
 </div>;
}
