import type {ReactNode} from "react";
import {requireOwner} from "@/lib/auth";
import {PORTFOLIO_PROJECTS} from "@/lib/portfolio/registry";
import {AppShell,type ShellApp} from "@/components/shell/app-shell";
import "@/styles/tokens.css";
import "@/styles/ui.css";

export const dynamic="force-dynamic";

/* Every owner section (Command centre, Q Assistant, AngolaIQ, Morning brief, Alerts) mounts in one shell.
   The app list comes from the registry on the server, so it is never part of a public script bundle. */
export default async function OsLayout({children}:{children:ReactNode}){
  await requireOwner();
  const apps:ShellApp[]=PORTFOLIO_PROJECTS.map(p=>({id:p.id,name:p.name==="NASSIM AI HQ / Q"?"NASSIM AI HQ":p.name,area:p.area,
    vercel:p.vercel??null,url:(p as {url?:string|null}).url??null}));
  return <AppShell apps={apps}>{children}</AppShell>;
}
