"use client";
import {useState} from "react";
import {logoSources} from "@/lib/app-logos";

const initials=(n:string)=>n.replace(/\s*\/.*$/,"").split(/[^A-Za-z0-9À-ÿ]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";

/**
 * An app's own logo. Tries the copy kept in Q OS, then the app's live icon, then the icon /api/apps discovered;
 * only when every source fails does it show initials. `keys` are the registry id, Vercel project id and name.
 */
export function AppMark({name,keys,icon,size=28,radius}:{name:string;keys:(string|null|undefined)[];icon?:string|null;size?:number;radius?:number}){
  const srcs=logoSources(keys,icon);
  const [i,setI]=useState(0);
  const r=radius??Math.round(size*0.29);
  if(i<srcs.length)return <img className="mark" src={srcs[i]} alt="" width={size} height={size} loading="lazy" decoding="async"
    referrerPolicy="no-referrer" onError={()=>setI(x=>x+1)} style={{width:size,height:size,borderRadius:r}}/>;
  return <span className="mono" aria-hidden="true" style={{width:size,height:size,borderRadius:r,fontSize:Math.max(10,Math.round(size*0.36))}}>{initials(name)}</span>;
}
