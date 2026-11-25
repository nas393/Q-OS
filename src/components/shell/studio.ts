/* Studio: the owner's look for Q OS. Two themes (Paper and Dusk) and calm or off motion. Saved per device; never required. */
export type Theme="paper"|"dusk";
export type Motion="calm"|"off";
export type Studio={theme:Theme;motion:Motion};

export const THEMES:{id:Theme;name:string;note:string;sw:[string,string,string]}[]=[
  {id:"paper",name:"Paper",note:"Warm ivory, daylight",sw:["#F3EFE6","#FBF9F4","#A9562F"]},
  {id:"dusk",name:"Dusk",note:"Warm graphite, low light",sw:["#1F1D1A","#282622","#C9744F"]}
];

/* Calm by default: Paper with calm motion. A system that asks for reduced motion starts with motion off. */
export const DEFAULT_STUDIO:Studio={theme:"paper",motion:"calm"};

const KEY="qos.studio.v3";
/* Themes saved by earlier Studio versions map to the nearest of the two that remain. */
const OLD_THEME:Record<string,Theme>={light:"paper",obsidian:"dusk",graphite:"dusk",aurora:"dusk"};
const pick=<T extends string>(v:unknown,allowed:readonly T[],fb:T):T=>allowed.includes(v as T)?v as T:fb;
const themeOf=(v:unknown):Theme|undefined=>{
  if(typeof v!=="string")return undefined;
  const mapped=OLD_THEME[v]??v;
  return mapped==="paper"||mapped==="dusk"?mapped:undefined;
};

/** Reads saved settings. Every field is validated, so a corrupted entry falls back to the defaults. */
export function loadStudio():Studio{
  let raw:{theme?:unknown;motion?:unknown}={};
  try{raw=JSON.parse(localStorage.getItem(KEY)??"null")??{};}catch{raw={};}
  const reduce=typeof window!=="undefined"&&!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const s:Studio={
    theme:themeOf(raw.theme)??DEFAULT_STUDIO.theme,
    motion:pick(raw.motion,["calm","off"],reduce?"off":DEFAULT_STUDIO.motion)
  };
  /* URL overrides for previews and screenshots: ?theme=dusk&motion=off */
  try{
    const q=new URLSearchParams(location.search);
    s.theme=themeOf(q.get("theme"))??s.theme;
    s.motion=pick(q.get("motion"),["calm","off"],s.motion);
  }catch{}
  return s;
}
export function saveStudio(s:Studio){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
