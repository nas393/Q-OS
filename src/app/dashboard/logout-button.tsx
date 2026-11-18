"use client";
import {useRouter} from "next/navigation";
/* Signing out also wipes the offline copy kept by the service worker, so nothing private stays on the device. */
export default function LogoutButton(){const router=useRouter();async function logout(){await fetch("/api/auth/logout",{method:"POST"});try{if("caches" in window)await Promise.all((await caches.keys()).map(k=>caches.delete(k)));}catch{}router.replace("/login");router.refresh();}return <button className="logout-button" onClick={logout}>Sign out</button>;}
