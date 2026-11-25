"use client";
/* The v2 shell: a rail on desktop, a tab bar on phones, and a thin top bar with the section title and the theme switch.
   It only frames the page; it never changes size between sections. */
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState,type ReactNode} from "react";
import "./q2.css";
import {NAV,navFor} from "./nav";
import {Icon,Mark} from "./ui";

type Theme="paper"|"dusk";
const KEY="q2.theme";

export function Q2Shell({children}:{children:ReactNode}){
  const path=usePathname()??"/";
  const current=navFor(path);
  const [theme,setTheme]=useState<Theme>("paper");
  useEffect(()=>{try{if(localStorage.getItem(KEY)==="dusk")setTheme("dusk");}catch{}},[]);
  const flip=()=>setTheme(t=>{const n:Theme=t==="paper"?"dusk":"paper";try{localStorage.setItem(KEY,n);}catch{}return n;});

  return <div className="q2" data-theme={theme}>
    <nav className="q2-rail" aria-label="Q OS sections">
      <Link href="/dashboard" className="q2-brand" aria-label="Q OS, AI HQ"><Mark/><span>Q OS<small>AI HQ</small></span></Link>
      <ul>{NAV.map(i=><li key={i.id}><Link href={i.href} aria-current={i.id===current.id?"page":undefined}><Icon name={i.icon}/><span>{i.label}</span></Link></li>)}</ul>
      <button type="button" className="q2-theme" onClick={flip} aria-label={`Switch to ${theme==="paper"?"Dusk":"Paper"} theme`}>{theme==="paper"?"Dusk":"Paper"}</button>
    </nav>
    <div className="q2-body">
      <header className="q2-top"><span className="q2-crumb">{current.label}</span></header>
      <main className="q2-main" id="main">{children}</main>
    </div>
    <nav className="q2-tabbar" aria-label="Q OS sections, phone">
      {NAV.map(i=><Link key={i.id} href={i.href} aria-current={i.id===current.id?"page":undefined}><Icon name={i.icon}/><span>{i.label}</span></Link>)}
    </nav>
  </div>;
}
