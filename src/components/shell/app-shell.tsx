"use client";
/*
 * Q OS shell: the frame every section mounts in. It never changes geometry between sections.
 * Desktop: a left rail (sections, applications, Studio) and a 56px top bar (breadcrumb, search, alerts, profile).
 * Phone: a compact top bar and a bottom tab bar. Global overlays: command palette (Ctrl/Cmd K), Studio,
 * alerts, applications. Studio (theme, accent, cards, motion, density) applies to every section.
 */
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {AlertsPanel} from "@/components/alerts-panel";
import {ACCENTS,DEFAULT_STUDIO,SIG_NAMES,STACK_NAMES,THEMES,loadStudio,saveStudio,type SigType,type Studio} from "@/components/qlive/studio";
import {AppMark} from "./app-mark";
import {I} from "./icons";
import {IQ_PAGES,SECTIONS,crumbsFor,sectionFor} from "./nav";
import "./shell.css";

export type ShellApp={id:string;name:string;area:string;vercel:string|null;url:string|null};
type LiveApp={id:string;name:string;url:string|null;state:string|null;icon?:string|null};
export type Command={id:string;label:string;detail?:string;icon?:string;group?:string;keywords?:string;run:()=>void};
type Panel="studio"|"alerts"|"apps"|"more";
type Toast={id:number;msg:string;undo?:()=>void};
type ShellCtx={
  studio:Studio;setStudio:(p:Partial<Studio>)=>void;openPanel:(p:Panel)=>void;toast:(msg:string,undo?:()=>void)=>void;
  setPageCommands:(cmds:Command[])=>void;setAskHandler:(fn:((q:string)=>void)|null)=>void;
  weather:{t:number;code:number}|null;apps:ShellApp[];liveApps:LiveApp[]|null;
};
const Ctx=createContext<ShellCtx|null>(null);
/* In-app confirmation (replaces window.confirm): themed, keyboard-first, Cancel focused by default. */
export type Ask={title:string;body?:string;action?:string;danger?:boolean};
let openConfirm:((a:Ask)=>Promise<boolean>)|null=null;
/** Ask the owner to confirm an action. Resolves true on confirm, false on cancel or Esc. */
export function askConfirm(a:Ask):Promise<boolean>{return openConfirm?openConfirm(a):Promise.resolve(typeof window!=="undefined"&&window.confirm(a.title));}
/** Shell services for a section: Studio, panels, toasts, palette commands. */
export function useShell(){const c=useContext(Ctx);if(!c)throw new Error("useShell must be used inside <AppShell>");return c;}

const BG:Record<Studio["theme"],string>={obsidian:"#090A0E",aurora:"#0A0B1D",graphite:"#161718",light:"#F3F1EC"};
const RAIL_KEY="os.rail.open";

export function AppShell({apps,children}:{apps:ShellApp[];children:ReactNode}){
  /* The "/zzprev" prefix is only used by the local preview harness (sample data); real routes have none. */
  const path=(usePathname()??"/dashboard").replace(/^\/zzprev(?=\/|$)/,"")||"/dashboard",router=useRouter();
  const section=sectionFor(path),crumbs=crumbsFor(path);
  const [studio,setStudioState]=useState<Studio>(DEFAULT_STUDIO);
  const [railOpen,setRailOpen]=useState(false);
  const [panel,setPanel]=useState<Panel|null>(null);
  const [menu,setMenu]=useState(false);
  const [palette,setPalette]=useState(false);
  const [alerts,setAlerts]=useState<{n:number;red:boolean}>({n:0,red:false});
  const [liveApps,setLiveApps]=useState<LiveApp[]|null>(null);
  const [weather,setWeather]=useState<{t:number;code:number}|null>(null);
  const [clock,setClock]=useState<Date|null>(null);
  const [toasts,setToasts]=useState<Toast[]>([]);
  const [pageCmds,setPageCmds]=useState<Command[]>([]);
  const [ask,setAsk]=useState<{a:Ask;done:(v:boolean)=>void}|null>(null);
  useEffect(()=>{openConfirm=a=>new Promise<boolean>(res=>setAsk({a,done:res}));return()=>{openConfirm=null;};},[]);
  const answer=(v:boolean)=>{ask?.done(v);setAsk(null);};
  const askRef=useRef<((q:string)=>void)|null>(null);
  const lastFocus=useRef<HTMLElement|null>(null);

  /* Studio + rail state from this device; keep the page background (overscroll, notch) in the theme. */
  useEffect(()=>{setStudioState(loadStudio());try{setRailOpen(localStorage.getItem(RAIL_KEY)==="1");}catch{}},[]);
  useEffect(()=>{const prev=document.body.style.background;document.body.style.background=BG[studio.theme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",BG[studio.theme]);return()=>{document.body.style.background=prev;};},[studio.theme]);
  const setStudio=useCallback((p:Partial<Studio>)=>setStudioState(s=>{const n={...s,...p};saveStudio(n);return n;}),[]);
  const toggleRail=()=>setRailOpen(o=>{try{localStorage.setItem(RAIL_KEY,o?"0":"1");}catch{}return !o;});

  /* Live context for the top bar: unseen alerts, Luanda weather and time. */
  const loadAlerts=useCallback(()=>fetch("/api/alerts",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
    const a=(j?.alerts??[]) as {level:string}[];const urgent=a.filter(x=>x.level!=="info");setAlerts({n:urgent.length,red:urgent.some(x=>x.level==="red")});}).catch(()=>{}),[]);
  useEffect(()=>{loadAlerts();const t=window.setInterval(loadAlerts,300000);return()=>window.clearInterval(t);},[loadAlerts]);
  useEffect(()=>{setClock(new Date());const t=window.setInterval(()=>setClock(new Date()),30000);
    let wx:{at:number;t:number;code:number}|null=null;try{wx=JSON.parse(sessionStorage.getItem("os-wx")??"null");}catch{}
    if(wx&&Date.now()-wx.at<18e5)setWeather({t:wx.t,code:wx.code});
    else fetch("https://api.open-meteo.com/v1/forecast?latitude=-8.84&longitude=13.23&current=temperature_2m,weather_code&timezone=Africa%2FLuanda")
      .then(r=>r.json()).then(j=>{if(!j?.current)return;const w={t:Math.round(j.current.temperature_2m),code:j.current.weather_code};setWeather(w);try{sessionStorage.setItem("os-wx",JSON.stringify({...w,at:Date.now()}));}catch{}}).catch(()=>{});
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>{});
    return()=>window.clearInterval(t);},[]);
  const ensureApps=useCallback(()=>{if(liveApps)return;fetch("/api/apps",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>setLiveApps(j?.apps??[])).catch(()=>setLiveApps([]));},[liveApps]);

  const toast=useCallback((msg:string,undo?:()=>void)=>{const id=Date.now()+Math.random();setToasts(t=>[...t,{id,msg,undo}]);window.setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4800);},[]);
  const openPanel=useCallback((p:Panel)=>{lastFocus.current=document.activeElement as HTMLElement;setMenu(false);setPalette(false);setPanel(p);if(p==="apps")ensureApps();if(p==="alerts")loadAlerts();},[ensureApps,loadAlerts]);
  const closePanel=useCallback(()=>{setPanel(null);window.setTimeout(()=>lastFocus.current?.focus?.(),0);},[]);
  const openPalette=useCallback(()=>{lastFocus.current=document.activeElement as HTMLElement;setMenu(false);setPanel(null);setPalette(true);ensureApps();},[ensureApps]);
  const closePalette=useCallback(()=>{setPalette(false);window.setTimeout(()=>lastFocus.current?.focus?.(),0);},[]);
  const setAskHandler=useCallback((fn:((q:string)=>void)|null)=>{askRef.current=fn;},[]);
  const signOut=useCallback(async()=>{await fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});try{if("caches" in window)await Promise.all((await caches.keys()).map(k=>caches.delete(k)));}catch{}window.location.replace("/login");},[]);

  /* Keyboard: Ctrl/Cmd K toggles the palette anywhere; Esc closes the shell's overlays. */
  useEffect(()=>{const k=(e:KeyboardEvent)=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(palette)closePalette();else openPalette();}
    else if(e.key==="Escape"){if(palette)closePalette();else if(panel)closePanel();else if(menu)setMenu(false);}};
    window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k);},[palette,panel,menu,openPalette,closePalette,closePanel]);
  useEffect(()=>{setPanel(null);setMenu(false);setPalette(false);},[path]);

  const ctx=useMemo<ShellCtx>(()=>({studio,setStudio,openPanel,toast,setPageCommands:setPageCmds,setAskHandler,weather,apps,liveApps}),[studio,setStudio,openPanel,toast,setAskHandler,weather,apps,liveApps]);
  const time=clock?clock.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Luanda"}):"";
  const alertLabel=alerts.n?`Alerts: ${alerts.n} need${alerts.n===1?"s":""} attention`:"Alerts: nothing new";

  /* Every application: the registry first (real names, areas), then other live apps. */
  const appRows=useMemo(()=>{
    const fromReg=apps.map(a=>{const live=liveApps?.find(x=>x.id===a.vercel)??(a.url?liveApps?.find(x=>x.url===a.url):undefined);
      return {key:a.id,name:a.name,area:a.area,url:a.url??live?.url??null,state:live?.state??null,keys:[a.id,a.vercel,live?.name],icon:live?.icon??null};});
    const extra=(liveApps??[]).filter(l=>l.url&&!apps.some(a=>a.vercel===l.id||(!!a.url&&a.url===l.url)))
      .map(l=>({key:l.id,name:l.name.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()),area:"App",url:l.url,state:l.state,keys:[l.id,l.name],icon:l.icon??null}));
    return [...fromReg,...extra];},[apps,liveApps]);
  const openApp=(url:string|null)=>{if(url)window.open(url,"_blank","noopener");};

  /* Command palette catalogue */
  const commands=useMemo<Command[]>(()=>[
    ...SECTIONS.map(s=>({id:"go-"+s.id,group:"Go to",label:s.label,detail:s.desc,icon:s.icon,run:()=>router.push(s.href)})),
    ...IQ_PAGES.filter(p=>p.href!=="/iq").map(p=>({id:"iq-"+p.href,group:"AngolaIQ",label:p.label,detail:p.desc,icon:p.icon,keywords:"angolaiq angola iq",run:()=>router.push(p.href)})),
    ...pageCmds.map(c=>({...c,group:c.group??section.label})),
    {id:"new-q",group:"Actions",label:"New conversation with Q",detail:"Open Q Assistant on a blank page",icon:"plus",keywords:"chat ask",run:()=>router.push("/chat?new=1")},
    {id:"studio",group:"Actions",label:"Open Studio",detail:"Theme, accent, cards, motion, density",icon:"sliders",keywords:"settings theme appearance",run:()=>openPanel("studio")},
    {id:"theme",group:"Actions",label:studio.theme==="light"?"Switch to dark theme":"Switch to light theme",detail:"Studio theme",icon:studio.theme==="light"?"cloud":"sun",keywords:"dark light mode",run:()=>setStudio({theme:studio.theme==="light"?"obsidian":"light"})},
    {id:"apps",group:"Actions",label:"All applications",detail:"Every app with status and links",icon:"grid",run:()=>openPanel("apps")},
    {id:"signout",group:"Actions",label:"Sign out",detail:"End this session on this device",icon:"logout",run:()=>{void signOut();}}
  ],[router,pageCmds,section.label,studio.theme,setStudio,openPanel,signOut]);

  return <Ctx.Provider value={ctx}>
    <div className={`os${railOpen?" rail-open":""}`} data-theme={studio.theme} data-accent={studio.accent} data-cards={studio.cards} data-motion={studio.motion} data-density={studio.density}>
      <a className="skip" href="#main">Skip to content</a>

      {/* ---------- Rail (desktop) ---------- */}
      <nav className="rail" aria-label="Q OS sections">
        <Link href="/dashboard" className="rail-brand" aria-label="Q OS, Command centre"><img src="/os/q-emblem.webp" alt="" width={30} height={30}/><span className="lbl">Q OS</span></Link>
        <ul className="rail-list">{SECTIONS.map(s=>{const on=s.id===section.id;return <li key={s.id}>
          <Link href={s.href} className="rail-i" aria-current={on?"page":undefined} data-tip={s.label}>
            <I n={s.icon}/><span className="lbl">{s.label}</span>
            {s.id==="alerts"&&alerts.n>0&&<b className={`badge${alerts.red?"":" watch"}`} aria-label={`${alerts.n} unseen`}>{alerts.n}</b>}
          </Link></li>;})}</ul>
        <div className="rail-sep" role="presentation"/>
        <button className="rail-i" onClick={()=>openPanel("apps")} data-tip="Applications" aria-haspopup="dialog"><I n="grid"/><span className="lbl">Applications</span></button>
        <div className="rail-foot">
          <button className="rail-i" onClick={()=>openPanel("studio")} data-tip="Studio" aria-haspopup="dialog"><I n="sliders"/><span className="lbl">Studio</span></button>
          <button className="rail-i" onClick={toggleRail} data-tip={railOpen?"Collapse":"Expand"} aria-expanded={railOpen} aria-label={railOpen?"Collapse sidebar":"Expand sidebar"}><I n="panel"/><span className="lbl">Collapse</span></button>
        </div>
      </nav>

      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <Link href="/dashboard" className="tb-brand" aria-label="Q OS, Command centre"><img src="/os/q-emblem.webp" alt="" width={28} height={28}/></Link>
        <nav className="crumbs" aria-label="Breadcrumb"><ol>
          <li className="cr-root"><Link href="/dashboard">Q OS</Link></li>
          {crumbs.map((c,i)=><li key={c.href}>{i===crumbs.length-1?<span aria-current="page"><I n={i===0?section.icon:"chev"} c={i===0?"cr-ic":"cr-sep"}/>{c.label}</span>:<Link href={c.href}><I n={section.icon} c="cr-ic"/>{c.label}</Link>}</li>)}
        </ol></nav>
        <button className="tb-search" onClick={openPalette} aria-label="Search or jump to (Ctrl K)" aria-haspopup="dialog"><I n="search"/><span>Search or jump to…</span><kbd className="kbd">Ctrl K</kbd></button>
        <div className="tb-r">
          {(weather||time)&&<span className="tb-ctx num" title="Luanda">{weather&&<><I n={weather.code<3?"sun":"cloud"}/>{weather.t}° · </>}Luanda {time}</span>}
          <button className="icon-btn tb-only-phone" onClick={openPalette} aria-label="Search or jump to"><I n="search"/></button>
          <button className="icon-btn" onClick={()=>openPanel("alerts")} aria-label={alertLabel} title={alertLabel}><I n="bell"/>{alerts.n>0&&<b className={`badge${alerts.red?"":" watch"}`}>{alerts.n}</b>}</button>
          <div className="tb-menu">
            <button className="avatar" onClick={()=>setMenu(m=>!m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account">N</button>
            {menu&&<div className="menu" role="menu" onKeyDown={e=>{if(e.key==="Escape")setMenu(false);}}>
              <div className="menu-h"><b>Nassim</b><small>Owner · this device</small></div>
              <button role="menuitem" onClick={()=>openPanel("studio")}><I n="sliders"/>Studio</button>
              <Link role="menuitem" href="/brief" onClick={()=>setMenu(false)}><I n="sunrise"/>Morning brief</Link>
              <button role="menuitem" onClick={()=>{void signOut();}}><I n="logout"/>Sign out</button>
            </div>}
          </div>
        </div>
      </header>
      {menu&&<div className="menu-back" onClick={()=>setMenu(false)} aria-hidden="true"/>}

      <main id="main" className="main" tabIndex={-1}>{children}</main>

      {/* ---------- Tab bar (phone) ---------- */}
      <nav className="tabbar" aria-label="Q OS sections">
        <Link href="/dashboard" aria-current={section.id==="dashboard"?"page":undefined}><I n="orbit"/>Today</Link>
        <Link href="/iq" aria-current={section.id==="iq"?"page":undefined}><I n="compass"/>AngolaIQ</Link>
        <Link href="/chat" className="orb" aria-current={section.id==="chat"?"page":undefined} aria-label="Q Assistant"><span className="ob"><img src="/os/q-emblem.webp" alt="" width={34} height={34}/></span><span>Ask Q</span></Link>
        <Link href="/alerts" aria-current={section.id==="alerts"?"page":undefined}><I n="bell"/>Alerts{alerts.n>0&&<b className={`badge${alerts.red?"":" watch"}`}>{alerts.n}</b>}</Link>
        <button onClick={()=>openPanel("more")} aria-current={panel==="more"||section.id==="brief"?"page":undefined} aria-haspopup="dialog"><I n="more"/>More</button>
      </nav>

      {/* ---------- Panels ---------- */}
      <div className={`scrim${panel?" on":""}`} onClick={closePanel} aria-hidden="true"/>
      <ShellDrawer open={!!panel} onClose={closePanel} title={panel==="studio"?"Studio":panel==="alerts"?"Alerts":panel==="apps"?"Applications":"More"}
        sub={panel==="studio"?"Your look for every Q OS section. Saved on this device.":panel==="alerts"?"Push, gold levels and unseen alerts":panel==="apps"?`${appRows.length} apps · logos from each app`:"Everything else in Q OS"}
        foot={panel==="studio"?<><button className="btn ghost" onClick={()=>{const prev=studio;setStudio({...DEFAULT_STUDIO});toast("Studio reset to defaults",()=>setStudio(prev));}}><I n="reset"/>Reset</button><button className="btn primary" onClick={closePanel}>Done</button></>:panel==="alerts"?<Link className="btn" style={{width:"100%"}} href="/alerts" onClick={closePanel}>Full alert history<I n="arrow"/></Link>:null}>
        {panel==="studio"&&<StudioPanel studio={studio} set={setStudio}/>}
        {panel==="alerts"&&<AlertsPanel/>}
        {panel==="apps"&&<ul className="os-apps">{appRows.map(a=><li key={a.key}>
          <AppMark name={a.name} keys={a.keys} icon={a.icon} size={36}/>
          <div className="tx"><b>{a.name}</b><small>{a.area}{a.state?` · ${a.state==="READY"||a.state==="EXTERNAL"?"Live":a.state==="ERROR"?"Build failed":a.state.toLowerCase()}`:""}</small></div>
          {a.state&&<span className={`sdot${a.state==="ERROR"?" crit":a.state==="READY"||a.state==="EXTERNAL"?"":" watch"}`} aria-hidden="true"/>}
          {a.url?<button className="btn sm" onClick={()=>openApp(a.url)} aria-label={`Open ${a.name} in a new tab`}>Open<I n="ext"/></button>:<span className="muted" style={{fontSize:12}}>{liveApps?"No address":"Loading…"}</span>}
        </li>)}</ul>}
        {panel==="more"&&<div className="navlist">
          <Link href="/brief" onClick={closePanel}><I n="sunrise"/>Morning brief<I n="chev" c="chev"/></Link>
          <Link href="/iq/q-news" onClick={closePanel}><I n="globe"/>Global Radar<I n="chev" c="chev"/></Link>
          <button onClick={()=>openPanel("apps")}><I n="grid"/>Applications<I n="chev" c="chev"/></button>
          <button onClick={()=>openPanel("studio")}><I n="sliders"/>Studio<I n="chev" c="chev"/></button>
          <button onClick={()=>{void signOut();}} className="danger-row"><I n="logout"/>Sign out</button>
        </div>}
      </ShellDrawer>

      {palette&&<Palette commands={commands} apps={appRows} onClose={closePalette} openApp={openApp}
        ask={q=>{closePalette();if(askRef.current)askRef.current(q);else router.push(`/chat?q=${encodeURIComponent(q)}`);}}/>}

      {ask&&<div className="cmd-back" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)answer(false);}} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();answer(false);}}}>
        <section className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="os-confirm-t" aria-describedby={ask.a.body?"os-confirm-b":undefined}>
          <h2 id="os-confirm-t">{ask.a.title}</h2>{ask.a.body&&<p id="os-confirm-b">{ask.a.body}</p>}
          <div className="confirm-acts"><button className="btn" autoFocus onClick={()=>answer(false)}>Cancel</button><button className={`btn ${ask.a.danger===false?"primary":"danger"}`} onClick={()=>answer(true)}>{ask.a.action??"Delete"}</button></div>
        </section></div>}

      <div className="toasts" aria-live="polite">{toasts.map(t=><div key={t.id} className="toast" role="status"><I n="check"/><span>{t.msg}</span>{t.undo&&<button onClick={()=>{t.undo?.();setToasts(x=>x.filter(y=>y.id!==t.id));}}>Undo</button>}</div>)}</div>
    </div>
  </Ctx.Provider>;
}

/* Slide-over drawer (bottom sheet on phones): labelled dialog, focus moves in, Esc closes (handled by the shell). */
export function ShellDrawer({open,onClose,title,sub,foot,children}:{open:boolean;onClose:()=>void;title:string;sub?:string;foot?:ReactNode;children:ReactNode}){
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{if(open)window.setTimeout(()=>ref.current?.querySelector<HTMLElement>(".dr-x")?.focus(),60);},[open]);
  return <aside ref={ref} className={`drawer${open?" on":""}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} inert={!open}>
    <div className="grab" aria-hidden="true"/>
    <div className="dr-h"><div style={{flex:1,minWidth:0}}><h3>{title}</h3>{sub&&<p>{sub}</p>}</div><button className="icon-btn dr-x" aria-label={`Close ${title}`} onClick={onClose}><I n="x"/></button></div>
    <div className="dr-b">{open&&children}</div>
    {open&&foot&&<div className="dr-f">{foot}</div>}
  </aside>;
}

function StudioPanel({studio,set}:{studio:Studio;set:(p:Partial<Studio>)=>void}){
  const seg=<K extends "cards"|"motion"|"density">(key:K,opts:[Studio[K],string][],label:string)=><div className="seg" role="group" aria-label={label}>{opts.map(([v,l])=><button key={v} aria-pressed={studio[key]===v} onClick={()=>set({[key]:v} as Partial<Studio>)}>{l}</button>)}</div>;
  const move=(i:number,d:number)=>{const a=[...studio.stackOrder];[a[i+d],a[i]]=[a[i],a[i+d]];set({stackOrder:a});};
  return <>
    <div className="st-sec"><h4>Theme</h4><div className="themes">{THEMES.map(t=><button key={t.id} className="th" aria-pressed={studio.theme===t.id} onClick={()=>set({theme:t.id})}>
      <span className="pv" style={{background:t.sw[0]}}><i style={{left:8,top:8,width:"42%",height:14,background:t.sw[1]}}/><i style={{left:8,top:28,width:"62%",height:14,background:t.sw[1]}}/><i style={{right:8,top:8,width:20,height:20,borderRadius:"50%",background:t.sw[2]}}/></span>
      <b>{t.name}<I n="check"/></b><small>{t.note}</small></button>)}</div></div>
    <div className="st-sec"><h4>Accent<span className="st-val">{ACCENTS.find(a=>a.id===studio.accent)?.name}</span></h4><div className="swatches">{ACCENTS.map(a=><button key={a.id} className="sw" aria-pressed={studio.accent===a.id} aria-label={`Accent ${a.name}`} onClick={()=>set({accent:a.id})}><i style={{background:a.hex,color:["halo","amber","emerald"].includes(a.id)?"#111":"#fff"}}><I n="check"/></i>{a.name}</button>)}</div>
      <p className="help" style={{marginTop:10}}>The accent marks primary buttons and where you are. Red, amber and green always mean status.</p></div>
    <div className="st-sec"><h4>Cards</h4>{seg("cards",[["solid","Solid"],["glass","Glass"],["outline","Outline"]],"Card style")}</div>
    <div className="st-sec"><h4>Motion</h4>{seg("motion",[["calm","Calm"],["full","Full"],["off","Off"]],"Motion")}</div>
    <div className="st-sec"><h4>Density</h4>{seg("density",[["comfortable","Comfortable"],["compact","Compact"]],"Density")}</div>
    <div className="st-sec"><h4>Command centre · phone cards</h4><div className="ord">{studio.stackOrder.map((k,i)=>{const off=studio.stackHidden.includes(k);return <div key={k} className={`o${off?" off":""}`}><span className="n num">{i+1}</span><span className="nm">{STACK_NAMES[k]}</span>
      <button aria-label={`Move ${STACK_NAMES[k]} up`} disabled={i===0} onClick={()=>move(i,-1)}><I n="up"/></button>
      <button aria-label={`Move ${STACK_NAMES[k]} down`} disabled={i===studio.stackOrder.length-1} onClick={()=>move(i,1)}><I n="down"/></button>
      <button aria-label={`${off?"Show":"Hide"} ${STACK_NAMES[k]}`} aria-pressed={!off} onClick={()=>set({stackHidden:off?studio.stackHidden.filter(x=>x!==k):[...studio.stackHidden,k]})}><I n={off?"eyeoff":"eye"}/></button></div>;})}</div></div>
    <div className="st-sec"><h4>Command centre · signals</h4><div className="ord">{(Object.keys(SIG_NAMES) as SigType[]).map(k=>{const off=studio.sigHidden.includes(k);return <div key={k} className={`o${off?" off":""}`}><span className="nm">{SIG_NAMES[k]}</span>
      <button className="switch" role="switch" aria-checked={!off} aria-label={`Show ${SIG_NAMES[k]}`} onClick={()=>set({sigHidden:off?studio.sigHidden.filter(x=>x!==k):[...studio.sigHidden,k]})}/></div>;})}</div></div>
  </>;
}

/* ---------- Command palette: sections, AngolaIQ pages, apps, actions, AngolaIQ search, then Ask Q ---------- */
type Opt={key:string;group:string;label:string;detail?:string;icon?:ReactNode;run:()=>void};
function score(q:string,text:string){const t=text.toLowerCase();if(!q)return 1;if(t.startsWith(q))return 4;if(t.split(/[\s·/-]+/).some(w=>w.startsWith(q)))return 3;return t.includes(q)?1:0;}
function Palette({commands,apps,onClose,openApp,ask}:{commands:Command[];apps:{key:string;name:string;area:string;url:string|null;keys:(string|null|undefined)[];icon:string|null}[];onClose:()=>void;openApp:(u:string|null)=>void;ask:(q:string)=>void}){
  const [q,setQ]=useState(""),[active,setActive]=useState(0),[iq,setIq]=useState<{kind:string;id:string;title:string;url:string|null}[]>([]);
  const router=useRouter(),listRef=useRef<HTMLDivElement>(null);
  const qq=q.trim().toLowerCase();
  useEffect(()=>{if(qq.length<2){setIq([]);return;}const t=window.setTimeout(()=>fetch("/api/iq/search?q="+encodeURIComponent(qq)).then(r=>r.ok?r.json():{results:[]}).then(j=>setIq((j.results??[]).slice(0,5))).catch(()=>setIq([])),220);return()=>window.clearTimeout(t);},[qq]);
  const opts=useMemo<Opt[]>(()=>{
    const cmd=commands.map(c=>({c,s:Math.max(score(qq,c.label)*2,score(qq,(c.detail??"")+" "+(c.keywords??"")))})).filter(x=>x.s>0).sort((a,b)=>qq?b.s-a.s:0);
    const order=["Go to",...new Set(cmd.map(x=>x.c.group??"")).values()];
    const out:Opt[]=[];
    for(const g of [...new Set(order)]){
      const items=cmd.filter(x=>(x.c.group??"")===g).slice(0,qq?5:g==="AngolaIQ"?4:8);
      out.push(...items.map(({c})=>({key:c.id,group:g,label:c.label,detail:c.detail,icon:c.icon?<I n={c.icon}/>:undefined,run:c.run})));
      if(g==="Go to"){const ap=apps.map(a=>({a,s:score(qq,a.name+" "+a.area)})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).slice(0,qq?5:4);
        out.push(...ap.map(({a})=>({key:"app-"+a.key,group:"Applications",label:a.name,detail:`${a.area} · opens in a new tab`,icon:<AppMark name={a.name} keys={a.keys} icon={a.icon} size={32} radius={8}/>,run:()=>openApp(a.url)})));}
    }
    out.push(...iq.map(r=>({key:"iq-"+r.kind+r.id,group:"AngolaIQ results",label:r.title,detail:r.kind,icon:<I n={r.kind==="news"?"news":r.kind==="project"?"folder":r.kind==="location"?"map":"star"}/>,
      run:()=>{if(r.kind==="news"&&r.url)window.open(r.url,"_blank","noopener");else router.push(r.kind==="project"?"/iq/projects":r.kind==="location"?"/iq/map":"/iq/saved");}})));
    if(qq)out.push({key:"ask",group:"Ask Q",label:`Ask Q: “${q.trim()}”`,detail:"Q answers from your live data",icon:<I n="spark"/>,run:()=>ask(q.trim())});
    return out;},[commands,apps,qq,q,iq,openApp,ask,router]);
  useEffect(()=>setActive(0),[qq]);
  useEffect(()=>{listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({block:"nearest"});},[active]);
  const run=(o?:Opt)=>{if(!o)return;onClose();o.run();};
  let lastGroup="";
  return <div className="cmd-back" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="cmd" role="dialog" aria-modal="true" aria-label="Search Q OS">
      <div className="cmd-in"><I n="search"/>
        <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search sections, apps, AngolaIQ… or ask Q" aria-label="Search Q OS" role="combobox" aria-expanded="true" aria-controls="os-cmd-list" aria-activedescendant={opts[active]?`os-cmd-${active}`:undefined} enterKeyHint="go"
          onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setActive(a=>Math.min(opts.length-1,a+1));}else if(e.key==="ArrowUp"){e.preventDefault();setActive(a=>Math.max(0,a-1));}else if(e.key==="Enter"){e.preventDefault();run(opts[active]);}else if(e.key==="Escape"){e.preventDefault();onClose();}}}/>
        <kbd className="kbd">Esc</kbd></div>
      <div className="cmd-list" id="os-cmd-list" role="listbox" aria-label="Results" ref={listRef}>
        {opts.map((o,i)=>{const head=o.group!==lastGroup;lastGroup=o.group;return <div key={o.key} role="presentation">
          {head&&<div className="cmd-g" role="presentation">{o.group}</div>}
          <div className="cmd-o" id={`os-cmd-${i}`} data-i={i} role="option" aria-selected={i===active} onMouseMove={()=>setActive(i)} onClick={()=>run(o)}>
            <span className="ic">{o.icon}</span><span className="tx"><b>{o.label}</b>{o.detail&&<small>{o.detail}</small>}</span><kbd className="kbd">Enter</kbd></div></div>;})}
        {!opts.length&&<p className="cmd-empty">Type to search, or press Enter to ask Q.</p>}
      </div>
      <div className="cmd-f"><span><I n="updown"/>Move</span><span><I n="enter"/>Open</span><span><kbd className="kbd">Ctrl K</kbd>Toggle</span></div>
    </section>
  </div>;
}

/** Register a section's own commands in the palette while it is mounted. */
export function usePageCommands(cmds:Command[]){
  const {setPageCommands}=useShell();
  const sig=cmds.map(c=>c.id+c.label).join("|");
  const ref=useRef(cmds);ref.current=cmds;
  useEffect(()=>{setPageCommands(ref.current.map(c=>({...c,run:()=>ref.current.find(x=>x.id===c.id)?.run()})));return()=>setPageCommands([]);},[sig,setPageCommands]);
}
