/* Q OS v2 components. Plain markup and the classes in q2.css; no logic beyond composition. */
import type {ButtonHTMLAttributes,ReactNode} from "react";

type Tone="ok"|"watch"|"crit"|"info"|"neutral";

/** The Q mark for v2: a clay disc with a cream Q. */
export function Mark({size=34}:{size?:number}){
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="31" style={{fill:"var(--q2-accent)"}}/>
    <circle cx="29.5" cy="29.5" r="12.5" fill="none" strokeWidth="6.5" style={{stroke:"var(--q2-on-accent)"}}/>
    <path d="M35.6 35.6 L46.2 46.2" fill="none" strokeWidth="6.5" strokeLinecap="round" style={{stroke:"var(--q2-on-accent)"}}/>
  </svg>;
}

const ICONS:Record<string,string[]>={
  floor:["M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  spark:["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"],
  compass:["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z","M15.5 8.5l-2 5-5 2 2-5z"],
  bell:["M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z","M10 20a2 2 0 0 0 4 0"],
  grid:["M4 4h6v6H4z","M14 4h6v6h-6z","M4 14h6v6H4z","M14 14h6v6h-6z"]
};

/** A line icon by name. Unknown names fall back to the grid. */
export function Icon({name}:{name:string}){
  return <svg className="q2-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{(ICONS[name]??ICONS.grid).map((d,i)=><path key={i} d={d}/>)}</svg>;
}

export function Button({variant="secondary",...rest}:{variant?:"primary"|"secondary"|"ghost"|"danger"}&ButtonHTMLAttributes<HTMLButtonElement>){
  return <button type="button" {...rest} className={`q2-btn q2-btn--${variant}`}/>;
}

export function Pill({tone="neutral",children}:{tone?:Tone;children:ReactNode}){
  return <span className="q2-pill" data-tone={tone}>{children}</span>;
}

export function Count({n,tone}:{n:number;tone?:"crit"}){
  return <span className="q2-count" data-tone={tone} aria-label={`${n} waiting`}>{n}</span>;
}

export function Card({title,meta,children}:{title:string;meta?:ReactNode;children:ReactNode}){
  return <section className="q2-card" aria-label={title}>
    <header className="q2-card-h"><h3>{title}</h3>{meta&&<span className="q2-meta">{meta}</span>}</header>
    {children}
  </section>;
}

export function Row({title,meta,trailing}:{title:string;meta?:ReactNode;trailing?:ReactNode}){
  return <li className="q2-row"><div><b>{title}</b>{meta&&<small>{meta}</small>}</div><div>{trailing}</div></li>;
}

export function Empty({title,children}:{title:string;children?:ReactNode}){
  return <div className="q2-empty"><b>{title}</b>{children&&<span>{children}</span>}</div>;
}

export function Skeleton({lines=3}:{lines?:number}){
  return <div aria-hidden="true" style={{display:"grid",gap:10}}>{Array.from({length:lines},(_,i)=><span key={i} className="q2-skel" style={{width:`${92-i*14}%`}}/>)}</div>;
}
