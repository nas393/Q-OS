"use client";
import {useCallback,useEffect,useState} from "react";

type AlertRow={id:number;level:"red"|"amber"|"info";title:string;body:string;url:string|null;createdAt:string};
type Rule={id:string;direction:"above"|"below";price:number;active:boolean;firedAt:string|null};
type Data={alerts:AlertRow[];rules:Rule[];devices:number;lastCheck:{at:number;events:string[];errors:string[]}|null;publicKey:string};

const ago=(t:number)=>{const m=Math.round((Date.now()-t)/60000);return m<1?"now":m<60?`${m}m`:m<1440?`${Math.round(m/60)}h`:`${Math.round(m/1440)}d`;};
const b64=(s:string)=>{const p="=".repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(r,c=>c.charCodeAt(0));};
const post=(body:unknown)=>fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error??"Failed");return j;});

/* Alerts: push on/off, gold levels, last check and the alert feed. */
export function AlertsPanel({goldPrice}:{goldPrice?:number}){
  const [d,setD]=useState<Data|null>(null),[err,setErr]=useState(""),[busy,setBusy]=useState(""),[here,setHere]=useState<boolean|null>(null);
  const [dir,setDir]=useState<"above"|"below">("above"),[price,setPrice]=useState("");
  const load=useCallback(()=>fetch("/api/alerts",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(setD).catch(()=>setErr("Alerts unavailable")),[]);
  useEffect(()=>{load();
    if("serviceWorker" in navigator&&"PushManager" in window)navigator.serviceWorker.getRegistration("/").then(r=>r?.pushManager.getSubscription()).then(s=>setHere(!!s)).catch(()=>setHere(false));else setHere(false);
  },[load]);
  const run=async(label:string,fn:()=>Promise<unknown>)=>{setBusy(label);setErr("");try{await fn();await load();}catch(e){setErr(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};

  const ios=typeof navigator!=="undefined"&&/iphone|ipad/i.test(navigator.userAgent);
  const standalone=typeof window!=="undefined"&&(window.matchMedia("(display-mode: standalone)").matches||(navigator as {standalone?:boolean}).standalone===true);
  const canPush=typeof window!=="undefined"&&"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;

  const enable=()=>run("on",async()=>{
    if(!d)throw new Error("Not loaded");
    if(await Notification.requestPermission()!=="granted")throw new Error("Notifications are blocked. Allow them in phone settings.");
    const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(d.publicKey)});
    await post({action:"subscribe",subscription:sub.toJSON()});setHere(true);
    await post({action:"test"});
  });
  const disable=()=>run("off",async()=>{const reg=await navigator.serviceWorker.getRegistration("/");const s=await reg?.pushManager.getSubscription();if(s){await post({action:"unsubscribe",endpoint:s.endpoint});await s.unsubscribe();}setHere(false);});
  const addRule=()=>{const n=Number(price);if(!(n>0))return setErr("Enter a gold price");run("rule",async()=>{await post({action:"addRule",direction:dir,price:n});setPrice("");});};

  const key=(t:string)=>t.replace(/[^\p{L}\s]/gu,"").replace(/\s+/g," ").trim().toLowerCase().split(" ").slice(0,3).join(" ");
  const feed=(d?.alerts??[]).filter((a,i,all)=>all.findIndex(x=>key(x.title)===key(a.title))===i);
  return <section className="os-panel os-alerts" id="alerts">
    <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg>Alerts</h3>
    <div className="os-al-row">
      <span><b className={here?"on":""}>{here?"Push ON":"Push OFF"}</b><small>{d?`${d.devices} device${d.devices===1?"":"s"}`:"…"}{d?.lastCheck?` · checked ${ago(d.lastCheck.at)} ago`:" · no check yet"}</small></span>
      {here?<button onClick={()=>run("test",()=>post({action:"test"}))} disabled={!!busy}>{busy==="test"?"…":"Test"}</button>:null}
      {canPush&&(!ios||standalone)?<button className={here?"":"red"} onClick={here?disable:enable} disabled={!!busy||!d}>{busy==="on"||busy==="off"?"…":here?"Turn off":"Turn on"}</button>:null}
    </div>
    {ios&&!standalone&&<p className="os-muted">iPhone: tap Share → <b>Add to Home Screen</b>, open NASSIM OS from there, then turn alerts on.</p>}
    {!ios&&!canPush&&<p className="os-muted">This browser can&apos;t receive push alerts.</p>}

    <div className="os-al-gold">
      <small>Gold levels{goldPrice?` · now ${goldPrice.toFixed(2)}`:""}</small>
      <div>{d?.rules.map(r=><span key={r.id} className={r.active?"":"off"} title={r.firedAt?`Hit ${new Date(r.firedAt).toLocaleString()}`:"Waiting"}>{r.direction==="above"?"▲":"▼"} {r.price}{!r.active&&" ✓"}<button aria-label="Remove level" onClick={()=>run("rm",()=>post({action:"removeRule",id:r.id}))}>×</button></span>)}{d&&!d.rules.length&&<em className="os-muted">No levels set.</em>}</div>
      <form className="os-add" onSubmit={e=>{e.preventDefault();addRule();}}>
        <select value={dir} onChange={e=>setDir(e.target.value as "above"|"below")} aria-label="Direction"><option value="above">Above</option><option value="below">Below</option></select>
        <input inputMode="decimal" placeholder={goldPrice?goldPrice.toFixed(0):"Price"} value={price} onChange={e=>setPrice(e.target.value)} aria-label="Gold price"/>
        <button disabled={busy==="rule"} aria-label="Add level">+</button>
      </form>
    </div>

    {err&&<p className="os-al-err">{err}</p>}
    {/* Unseen only, newest first; repeats of the same alert (e.g. each morning brief) collapse into the latest one. */}
    <ul className="os-al-list">{feed.slice(0,5).map(a=><li key={a.id}><i className={a.level}/><span><b>{a.title}</b>{a.body&&<small>{a.body}</small>}</span><time>{ago(Date.parse(a.createdAt))}</time></li>)}</ul>
    {d&&!feed.length&&<p className="os-muted">All clear. Checked every 15 min.</p>}
    <div className="os-al-foot"><a href="/alerts">All alerts →</a>{feed.length>0&&<button onClick={()=>run("ack",()=>post({action:"ack",id:"all"}))} disabled={!!busy}>{busy==="ack"?"…":"Mark all seen"}</button>}</div>
    <button className="os-al-check" onClick={()=>run("check",()=>post({action:"check"}))} disabled={!!busy}>{busy==="check"?"Checking…":"Check now"}</button>
  </section>;
}
