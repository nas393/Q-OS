"use client";
import { useId } from "react";

/* Nassim Watfa brand mark: faceted N in silver with warm gold edge light (from the personal brand identity). */
export function NMark({size=48}:{size?:number}){
 const u=useId().replace(/:/g,"");const s=`s${u}`,g=`g${u}`;
 return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="nmark">
  <defs>
   <linearGradient id={s} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF"/><stop offset=".45" stopColor="#C9CED6"/><stop offset="1" stopColor="#6E7480"/></linearGradient>
   <linearGradient id={g} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#7A5420"/><stop offset=".5" stopColor="#F2C979"/><stop offset="1" stopColor="#9A6B28"/></linearGradient>
  </defs>
  <path d="M10 54 L10 12 L20 12 L20 54 Z" fill={`url(#${s})`}/>
  <path d="M10 12 L20 12 L44 46 L44 56 Z" fill={`url(#${s})`} opacity=".92"/>
  <path d="M44 56 L44 18 L54 8 L54 46 Z" fill={`url(#${g})`}/>
  <path d="M20 12 L24 18 L24 54 L20 54 Z" fill="#000" opacity=".25"/>
  <path d="M54 8 L60 8 L44 30 L44 24 Z" fill={`url(#${g})`} opacity=".85"/>
 </svg>;
}

/* Lines from his own narrative and philosophy; one is shown per day. */
export const narrative=["From roots to markets","From operations to creation","From execution to ownership","From ideas to systems","From today to a lasting legacy"];
export const philosophy=["Build. Create. Grow.","Stay curious.","Stay independent.","Turn pressure into progress.","Leave a positive legacy."];
export const dayPick=<T,>(list:T[],offset=0)=>list[(Math.floor(Date.now()/864e5)+offset)%list.length];
