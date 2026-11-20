/* Q Live Studio: the owner's personal look for Q OS. Saved per device (localStorage); never required for the page to work. */
export type Theme="obsidian"|"aurora"|"graphite"|"light";
export type Accent="halo"|"red"|"purple"|"blue"|"emerald"|"amber"|"rose";
export type CardStyle="glass"|"solid"|"outline";
export type Motion="full"|"calm"|"off";
export type Density="comfortable"|"compact";
export type StackCard="crit"|"brief"|"today"|"eco"|"mkt"|"world";
export type SigType="attn"|"radar"|"mk"|"sys";

export type Studio={theme:Theme;accent:Accent;cards:CardStyle;motion:Motion;density:Density;stackOrder:StackCard[];stackHidden:StackCard[];sigHidden:SigType[]};

export const THEMES:{id:Theme;name:string;note:string;sw:[string,string,string]}[]=[
  {id:"obsidian",name:"Obsidian",note:"Deep black, calm",sw:["#090A0E","#12141B","#202431"]},
  {id:"aurora",name:"Aurora",note:"Blue-violet night",sw:["#0A0B1D","#1A1D45","#6E78FF"]},
  {id:"graphite",name:"Graphite",note:"Soft charcoal",sw:["#161718","#26272A","#3A3B3F"]},
  {id:"light",name:"Light Executive",note:"Warm paper, daylight",sw:["#F3F1EC","#FFFFFF","#15161A"]}
];
export const ACCENTS:{id:Accent;name:string;hex:string}[]=[
  {id:"halo",name:"Halo",hex:"#E9DCC4"},{id:"red",name:"Q red",hex:"#F12D43"},{id:"purple",name:"Purple",hex:"#A855F7"},
  {id:"blue",name:"Blue",hex:"#5797E8"},{id:"emerald",name:"Emerald",hex:"#22C58B"},{id:"amber",name:"Amber",hex:"#E9A23B"},{id:"rose",name:"Rose",hex:"#F472B6"}
];
export const STACK_NAMES:Record<StackCard,string>={crit:"Needs you",brief:"Q briefing",today:"Today",eco:"Ecosystem",mkt:"Markets",world:"World radar"};
export const SIG_NAMES:Record<SigType,string>={attn:"Attention",radar:"Global Radar",mk:"Markets",sys:"System activity"};

export const DEFAULT_STUDIO:Studio={theme:"obsidian",accent:"halo",cards:"glass",motion:"full",density:"comfortable",
  stackOrder:["crit","brief","today","eco","mkt","world"],stackHidden:[],sigHidden:[]};

const KEY="qlive.studio.v1";
const pick=<T extends string>(v:unknown,allowed:readonly T[],fb:T):T=>allowed.includes(v as T)?v as T:fb;

/** Reads saved settings, validating every field so a corrupted entry can never break the dashboard. */
export function loadStudio():Studio{
  let raw:Partial<Studio>={};
  try{raw=JSON.parse(localStorage.getItem(KEY)??"{}")??{};}catch{raw={};}
  const all=DEFAULT_STUDIO.stackOrder;
  const order=Array.isArray(raw.stackOrder)?raw.stackOrder.filter((k):k is StackCard=>all.includes(k as StackCard)):[];
  const s:Studio={
    theme:pick(raw.theme,["obsidian","aurora","graphite","light"],DEFAULT_STUDIO.theme),
    accent:pick(raw.accent,ACCENTS.map(a=>a.id),DEFAULT_STUDIO.accent),
    cards:pick(raw.cards,["glass","solid","outline"],DEFAULT_STUDIO.cards),
    motion:pick(raw.motion,["full","calm","off"],matchMedia?.("(prefers-reduced-motion: reduce)").matches?"off":DEFAULT_STUDIO.motion),
    density:pick(raw.density,["comfortable","compact"],DEFAULT_STUDIO.density),
    stackOrder:[...order,...all.filter(k=>!order.includes(k))],
    stackHidden:Array.isArray(raw.stackHidden)?raw.stackHidden.filter((k):k is StackCard=>all.includes(k as StackCard)):[],
    sigHidden:Array.isArray(raw.sigHidden)?raw.sigHidden.filter((k):k is SigType=>["attn","radar","mk","sys"].includes(k)):[]
  };
  /* URL overrides for previews and screenshots: ?theme=light&accent=blue&cards=solid&motion=off&density=compact */
  try{
    const q=new URLSearchParams(location.search);
    if(q.get("theme"))s.theme=pick(q.get("theme"),["obsidian","aurora","graphite","light"],s.theme);
    if(q.get("accent"))s.accent=pick(q.get("accent"),ACCENTS.map(a=>a.id),s.accent);
    if(q.get("cards"))s.cards=pick(q.get("cards"),["glass","solid","outline"],s.cards);
    if(q.get("motion"))s.motion=pick(q.get("motion"),["full","calm","off"],s.motion);
    if(q.get("density"))s.density=pick(q.get("density"),["comfortable","compact"],s.density);
  }catch{}
  return s;
}
export function saveStudio(s:Studio){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
