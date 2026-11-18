"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
export default function AckButton({id,label}:{id:number|"all";label:string}){
 const r=useRouter();const [busy,setBusy]=useState(false);
 return <button className="op-btn" disabled={busy} onClick={async()=>{setBusy(true);await fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ack",id})});setBusy(false);r.refresh();}}>{busy?"…":label}</button>;
}
