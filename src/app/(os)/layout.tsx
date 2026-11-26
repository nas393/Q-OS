import type {ReactNode} from "react";
import Link from "next/link";
import {requireOwner} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function OsLayout({children}:{children:ReactNode}){await requireOwner();return <div className="q-frame"><aside className="q-rail"><Link className="q-brand" href="/dashboard" aria-label="Q OS home">Q<span>.</span></Link><nav><Link href="/dashboard">Overview</Link><Link href="/q">Q Assistant</Link><Link href="/intelligence">Intelligence</Link><Link href="/projects">Projects</Link><Link href="/tasks">Tasks</Link><Link href="/alerts">Alerts</Link></nav><div className="q-rail-foot">PRIVATE SYSTEM</div></aside><main className="q-main"><header className="q-top"><span>Q OS <i>/</i> Command</span><span className="q-live"><b/> SYSTEM ONLINE</span></header>{children}</main></div>;}
