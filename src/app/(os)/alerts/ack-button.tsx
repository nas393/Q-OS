"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
/* Marks one alert (or all) as seen; secondary style for rows, primary for "mark all". */
export default function AckButton({id,label,primary}:{id:number|"all";label:string;primary?:boolean}){
 const r=useRouter();const [busy,setBusy]=useState(false),[err,setErr]=useState(false);
 return <button className={`btn sm${primary?" primary":""}`} disabled={busy} onClick={async()=>{setBusy(true);setErr(false);
  const res=await fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"ack",id})}).catch(()=>null);
  setBusy(false);if(!res?.ok){setErr(true);return;}r.refresh();}}>{busy?"Saving…":err?"Retry":label}</button>;
}
