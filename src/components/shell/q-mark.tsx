"use client";
import {useId} from "react";

/*
 * The Q mark, drawn as vector so it stays sharp at every size and follows the theme (tokens in tokens.css):
 * a brick ring and tail, and a flat glyph in ink (Paper) or warm white (Dusk). No glow in any theme.
 * Outside the shell (sign-in) the Dusk defaults below apply.
 */
export function QMark({size=28,className="",title}:{size?:number;className?:string;title?:string}){
  const id=useId().replace(/[^a-zA-Z0-9]/g,"");
  const ring=`qmr${id}`,glyph=`qmg${id}`;
  return (
    <svg className={`qmark${className?` ${className}`:""}`} width={size} height={size} viewBox="0 0 64 64"
      role={title?"img":undefined} aria-label={title} aria-hidden={title?undefined:true} focusable="false">
      <defs>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{stopColor:"var(--qm-ring-a,#E5776C)"}}/>
          <stop offset="1" style={{stopColor:"var(--qm-ring-b,#B5443A)"}}/>
        </linearGradient>
        <linearGradient id={glyph} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{stopColor:"var(--qm-glyph-a,#F2EDE3)"}}/>
          <stop offset="1" style={{stopColor:"var(--qm-glyph-b,#CFC7B8)"}}/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28.6" fill="none" stroke={`url(#${ring})`} strokeWidth="3.6"/>
      <circle cx="30.6" cy="30.6" r="13.6" fill="none" stroke={`url(#${glyph})`} strokeWidth="6.6"/>
      <path d="M36.4 36.4 L47.2 47.2" fill="none" stroke={`url(#${ring})`} strokeWidth="6.6" strokeLinecap="round"/>
    </svg>
  );
}
