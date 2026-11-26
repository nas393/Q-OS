"use client";
/* The app frame: a rail on desktop, a tab bar on phones, and a top bar with the current part's name. */
import Link from "next/link";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";
import {NAV,navFor,type NavKey} from "./nav";

/* One small line icon per part. Stroke only, so they follow the text colour. */
const ICON:Record<NavKey,ReactNode>={
  command:<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>,
  q:<path d="M12 4l1.8 4.6L18 10.4l-4.2 1.8L12 17l-1.8-4.8L6 10.4l4.2-1.8z"/>,
  intelligence:<><circle cx="12" cy="12" r="8"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></>,
  alerts:<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>,
  more:<><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></>
};

export function Shell({children}:{children:ReactNode}){
  const path=usePathname()??"/";
  const current=navFor(path);
  return <div className="app">
    <nav className="rail" aria-label="Q OS sections">
      <Link href="/" className="brand" aria-label="Q OS, AI HQ">Q OS<small>AI HQ</small></Link>
      <div>
        {NAV.map(i=><Link key={i.key} href={i.href} aria-current={i.key===current.key?"page":undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[i.key]}</svg><span>{i.label}</span>
        </Link>)}
      </div>
    </nav>
    <div className="main">
      <header className="topbar"><h2>{current.label}</h2></header>
      <main className="content" id="main">{children}</main>
    </div>
    <nav className="tabbar" aria-label="Q OS sections, phone">
      {NAV.map(i=><Link key={i.key} href={i.href} aria-current={i.key===current.key?"page":undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[i.key]}</svg><span>{i.label}</span>
      </Link>)}
    </nav>
  </div>;
}
