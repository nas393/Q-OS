"use client";
import {useId} from "react";

/*
 * The Q mark, drawn as vector so it stays sharp at every size and follows the theme (tokens in tokens.css):
 * red ring and tail always; the Q itself is silver on the dark themes and graphite on Light Executive,
 * with a soft red glow on dark only. Outside the shell (sign-in) the dark defaults below apply.
 */
export function QMark({size=28,className="",title}:{size?:number;className?:string;title?:string}){
  const id=useId().replace(/[^a-zA-Z0-9]/g,"");
  const ring=`qmr${id}`,glyph=`qmg${id}`;
  return (
    <svg className={`qmark${className?` ${className}`:""}`} width={size} height={size} viewBox="0 0 64 64"
      role={title?"img":undefined} aria-label={title} aria-hidden={title?undefined:true} focusable="false">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{stopColor:"var(--qm-ring-a,#FF4D5E)"}}/>
          <stop offset="1" style={{stopColor:"var(--qm-ring-b,#C8102E)"}}/>
        </linearGradient>
        <linearGradient id={glyph} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{stopColor:"var(--qm-glyph-a,#FFFFFF)"}}/>
          <stop offset="1" style={{stopColor:"var(--qm-glyph-b,#AEB3BF)"}}/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28.6" fill="none" stroke={`url(#${ring})`} strokeWidth="3.6"/>
      <circle cx="30.6" cy="30.6" r="13.6" fill="none" stroke={`url(#${glyph})`} strokeWidth="6.6"/>
      <path d="M36.4 36.4 L47.2 47.2" fill="none" stroke={`url(#${ring})`} strokeWidth="6.6" strokeLinecap="round"/>
    </svg>
  );
}
