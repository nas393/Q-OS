import { Fragment } from "react";
/* Minimal safe markdown for Q replies: **bold**, bullet and numbered lines, headings. No HTML injection. */
function inline(t:string){return t.split(/(\*\*[^*]+\*\*)/g).map((x,i)=>x.startsWith("**")&&x.endsWith("**")?<strong key={i}>{x.slice(2,-2)}</strong>:<Fragment key={i}>{x}</Fragment>);}
export default function QMd({text}:{text:string}){
 const lines=text.split("\n");
 return <>{lines.map((l,i)=>{const t=l.trim();if(!t)return <br key={i}/>;
  if(/^#{1,4}\s/.test(t))return <b key={i} className="qmd-h">{inline(t.replace(/^#+\s/,""))}</b>;
  if(/^[-•*]\s/.test(t))return <span key={i} className="qmd-li">{inline(t.replace(/^[-•*]\s/,""))}</span>;
  if(/^\d+[.)]\s/.test(t))return <span key={i} className="qmd-li n"><em>{t.match(/^\d+/)![0]}</em>{inline(t.replace(/^\d+[.)]\s/,""))}</span>;
  return <span key={i} className="qmd-p">{inline(t)}</span>;})}</>;
}
