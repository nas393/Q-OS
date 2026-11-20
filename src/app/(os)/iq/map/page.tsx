"use client";
import "leaflet/dist/leaflet.css";
import {useEffect,useMemo,useRef,useState} from "react";
import type {Map as LMap,LayerGroup} from "leaflet";
import {Badge,Empty,ErrorBox,Field,Head,Loading,Toast,api,useApi} from "../ui";
import {PROV} from "../lists";
import {askConfirm} from "@/components/shell/app-shell";

type Loc={id:string;name:string;category:string;province:string|null;lat:number;lng:number;source:string;source_url:string|null;verified:boolean;notes:string|null};
const OSM=[["ports","Ports"],["airports","Airports"],["industrial","Industrial areas"],["markets","Markets"],["hospitals","Hospitals"],["fuel","Fuel stations"]] as const;
const CATS=["Special Economic Zone","Port","Airport","Logistics","Industrial area","Commercial hub","Project","Business location","Agricultural area","Mining","Energy","Market","Hospital","Fuel station"];
const COL:Record<string,string>={Port:"#60a5fa",Airport:"#a78bfa","Industrial area":"#f5b142",Market:"#4ade80",Hospital:"#f2545b","Fuel station":"#9a9fb8",Project:"#ff7ad9"};

export default function MapPage(){
 const {data,error,loading,reload}=useApi<{locations:Loc[]}>("/api/iq/locations");
 const el=useRef<HTMLDivElement>(null),map=useRef<LMap|null>(null),layer=useRef<LayerGroup|null>(null);
 const [cat,setCat]=useState(""),[prov,setProv]=useState(""),[q,setQ]=useState(""),[busy,setBusy]=useState(""),[toast,setToast]=useState(""),[form,setForm]=useState<Record<string,string>|null>(null);
 const shown=useMemo(()=>(data?.locations??[]).filter(l=>(!cat||l.category===cat)&&(!prov||l.province===prov)&&(!q||l.name.toLowerCase().includes(q.toLowerCase()))),[data,cat,prov,q]);
 useEffect(()=>{let off=false;(async()=>{const L=(await import("leaflet")).default;if(off||!el.current||map.current)return;
  map.current=L.map(el.current,{zoomControl:true}).setView([-11.5,17.8],5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap contributors"}).addTo(map.current);
  layer.current=L.layerGroup().addTo(map.current);
  map.current.on("click",e=>setForm(f=>f?{...f,lat:e.latlng.lat.toFixed(5),lng:e.latlng.lng.toFixed(5)}:f));
 })();return()=>{off=true;};},[]);
 useEffect(()=>{(async()=>{const L=(await import("leaflet")).default;if(!layer.current)return;layer.current.clearLayers();
  for(const l of shown){const m=L.circleMarker([l.lat,l.lng],{radius:6,color:COL[l.category]??"#8b5cf6",weight:2,fillOpacity:.7});
   const div=document.createElement("div");div.innerHTML=`<b></b><br><small></small><br><small></small>`;(div.children[0] as HTMLElement).textContent=l.name;(div.children[2] as HTMLElement).textContent=`${l.category}${l.province?" · "+l.province:""}`;(div.children[4] as HTMLElement).textContent=`${l.lat.toFixed(4)}, ${l.lng.toFixed(4)} · ${l.source}${l.verified?" · verified":" · unverified"}`;
   if(l.source_url){const a=document.createElement("a");a.href=l.source_url;a.target="_blank";a.rel="noreferrer";a.textContent="Source ↗";div.append(document.createElement("br"),a);}
   m.bindPopup(div).addTo(layer.current);}
 })();},[shown]);
 const doImport=async(c:string)=>{setBusy(c);try{const r=await api<{added:number}>("/api/iq/osm","POST",{category:c});setToast(`${r.added} new from OpenStreetMap`);reload();}catch(e){setToast(e instanceof Error?e.message:"Failed");}finally{setBusy("");}};
 const exportCsv=()=>{const rows=[["name","category","province","lat","lng","source","source_url","verified"],...shown.map(l=>[l.name,l.category,l.province??"",l.lat,l.lng,l.source,l.source_url??"",l.verified])];
  const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="angolaiq-locations.csv";a.click();};
 return <>
  <Head title="Business map" desc="Geographic intelligence. Real places only: imported from OpenStreetMap with source links, or added by you. Nothing is invented. Mark a place verified once you have confirmed it.">
   <button className="iq-btn" onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
   <button className="iq-btn pri" onClick={()=>setForm({name:"",category:"Business location",province:"",lat:"",lng:"",source_url:"",notes:""})}>+ Add location</button>
  </Head>
  <div className="iq-filters">
   <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search places" aria-label="Search places"/>
   <select value={cat} onChange={e=>setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{[...new Set((data?.locations??[]).map(l=>l.category))].map(c=><option key={c}>{c}</option>)}</select>
   <select value={prov} onChange={e=>setProv(e.target.value)} aria-label="Province"><option value="">All provinces</option>{PROV.map(p=><option key={p}>{p}</option>)}</select>
  </div>
  <div className="iq-map" ref={el}/>
  <p className="iq-meta">{shown.length} places shown. Tap a marker for source and coordinates.{form?" Tap the map to set coordinates.":""}</p>
  {form&&<section className="iq-card" style={{marginTop:10}}><h3>Add location</h3><form className="iq-form two" onSubmit={async e=>{e.preventDefault();try{await api("/api/iq/locations","POST",{name:form.name,category:form.category,province:form.province||undefined,lat:Number(form.lat),lng:Number(form.lng),source_url:form.source_url||undefined,notes:form.notes||undefined});setForm(null);setToast("Location saved");reload();}catch(er){setToast(er instanceof Error?er.message:"Failed");}}}>
   <Field label="Name *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
   <Field label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
   <Field label="Province"><select value={form.province} onChange={e=>setForm({...form,province:e.target.value})}><option value="">—</option>{PROV.map(p=><option key={p}>{p}</option>)}</select></Field>
   <Field label="Source link (proof)"><input type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})}/></Field>
   <Field label="Latitude * (tap map)"><input required inputMode="decimal" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})}/></Field>
   <Field label="Longitude * (tap map)"><input required inputMode="decimal" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})}/></Field>
   <div className="full iq-tags"><button className="iq-btn pri">Save</button><button type="button" className="iq-btn" onClick={()=>setForm(null)}>Cancel</button></div></form></section>}
  <section className="iq-card" style={{marginTop:12}}><h3>Import from OpenStreetMap</h3><div className="iq-chips">{OSM.map(([k,l])=><button key={k} className="iq-chip" disabled={!!busy} onClick={()=>doImport(k)}>{busy===k?"Importing…":l}</button>)}</div><p className="iq-meta">Community data, stored as <Badge kind="unverified"/> with a link to the OSM record.</p></section>
  <section className="iq-card" style={{marginTop:12}}><h3>Places ({shown.length})</h3>
   {loading&&!data?<Loading/>:error?<ErrorBox msg={error} retry={reload}/>:!shown.length?<Empty>No places yet. Import from OpenStreetMap or add your own.</Empty>:
   <ul className="iq-list">{shown.slice(0,60).map(l=><li key={l.id} className="iq-row"><div><b>{l.name}</b><div className="iq-tags"><Badge kind={l.verified?"verified":"unverified"}/><span className="iq-sub">{l.category}{l.province?` · ${l.province}`:""} · {l.source}</span></div></div>
    <button className="iq-btn sm" onClick={()=>{map.current?.setView([l.lat,l.lng],13);window.scrollTo({top:0,behavior:"smooth"});}} aria-label={`Show ${l.name} on the map`}>Show on map</button>
    <button className="iq-btn sm" onClick={async()=>{await api("/api/iq/locations","PATCH",{id:l.id,verified:!l.verified});reload();}}>{l.verified?"Unverify":"✓ Verify"}</button>
    <button className="iq-btn sm" onClick={()=>api("/api/iq/saved","POST",{kind:"location",refId:l.id,title:l.name,url:l.source_url??undefined}).then(()=>setToast("Saved"))}>☆</button>
    <button className="iq-btn sm danger" aria-label="Delete" onClick={async()=>{if(await askConfirm({title:`Delete ${l.name}?`,body:"The place is removed from the map."})){await api(`/api/iq/locations?id=${l.id}`,"DELETE");reload();}}}>Delete</button></li>)}</ul>}
  </section>
  <Toast msg={toast} onDone={()=>setToast("")}/>
 </>;
}
