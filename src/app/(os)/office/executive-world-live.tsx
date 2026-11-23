"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, Text } from "@react-three/drei";
import { AnimationMixer, Group, MathUtils, Vector3, type AnimationAction } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { INITIAL_EMPLOYEES } from "@/lib/simulation/seed";
import { tickSimulation } from "@/lib/simulation/engine";
import type { EmployeeAgent, SimulationState, SimTask } from "@/lib/simulation/types";

const MODEL_URLS = [
  "https://models.vinish.dev/people/business-man.glb",
  "https://models.vinish.dev/people/business-woman.glb",
  "https://models.vinish.dev/people/casual-man.glb",
  "https://models.vinish.dev/people/casual-woman.glb",
];
function makeTasks():SimTask[]{
  const specs:[string,string,string[],number][]=[
    ["Finance","Close monthly forecast",["finance"],4],["Finance","Review working capital",["planning"],3],
    ["Commercial","Analyse key-account performance",["sales"],4],["Commercial","Prepare channel growth plan",["marketing"],3],
    ["Operations","Review supply reliability",["operations"],4],["Operations","Improve process yield",["quality"],3],
    ["Strategy","Assess market opportunity",["strategy"],3],["Strategy","Build transformation roadmap",["research"],2],
    ["Executive Office","Prepare leadership briefing",["coordination"],3],
  ];
  return specs.map((s,i)=>({id:"world-task-"+i,title:s[1],department:s[0],requiredSkills:s[2],priority:s[3],effortRemaining:18+i*2,status:"queued",assigneeId:null,dueAt:null,createdAt:i}));
}
function initialWorld():SimulationState{
  const now=Date.UTC(2026,10,23,9);
  return {worldId:"q-executive-world-local",version:0,simulatedAt:now,lastWallClockAt:Date.now(),speed:1,paused:false,
    employees:INITIAL_EMPLOYEES.map((e,i)=>({...e,position:{...e.position},destination:i%4===0?{x:e.position.x+(i%2?2.2:-2.2),y:0,z:e.position.z+(i%2?-1.6:1.6)}:null})),tasks:makeTasks(),events:[]};
}
type Props={rooms:{id:string;label:string;note:string;desks:{id:string;name:string;role:string;light:string;needs:number;open:number}[]}[];onSelectDesk:(id:string)=>void};
function useAssets(){
  const [businessMan,businessWoman,casualMan,casualWoman]=useLoader(GLTFLoader,MODEL_URLS);
  return [businessMan,businessWoman,casualMan,casualWoman];
}
function MatBox({position,scale,color,roughness=.65,metalness=0,emissive="#000000",emissiveIntensity=0}:{position:[number,number,number];scale:[number,number,number];color:string;roughness?:number;metalness?:number;emissive?:string;emissiveIntensity?:number}){
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={scale}/><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive} emissiveIntensity={emissiveIntensity}/></mesh>;
}
function Desk({position,rotation=0,executive=false}:{position:[number,number,number];rotation?:number;executive?:boolean}){
  return <group position={position} rotation={[0,rotation,0]}>
    <MatBox position={[0,.76,0]} scale={[1.75,.12,.82]} color={executive?"#59432f":"#76563b"}/>
    <MatBox position={[-.72,.37,0]} scale={[.09,.72,.72]} color="#262a30" />
    <MatBox position={[.72,.37,0]} scale={[.09,.72,.72]} color="#262a30" />
    <MatBox position={[0,1.05,-.22]} scale={[.62,.42,.055]} color="#141c24" metalness={.25}/>
    <MatBox position={[0,1.05,-.185]} scale={[.55,.33,.012]} color="#183342" metalness={.2}/>
    <MatBox position={[.48,.84,.16]} scale={[.22,.025,.28]} color="#24272c"/>
    <MatBox position={[-.43,.84,.14]} scale={[.28,.025,.2]} color="#b4b6b8"/>
    <OfficeChair position={[0,0,1.02]}/>
  </group>;
}
function OfficeChair({position}:{position:[number,number,number]}){
  return <group position={position}>
    <MatBox position={[0,.52,0]} scale={[.55,.12,.52]} color="#242932"/>
    <MatBox position={[0,.91,-.2]} scale={[.52,.62,.12]} color="#303640"/>
    <MatBox position={[0,.25,0]} scale={[.08,.48,.08]} color="#6a7079" metalness={.7}/>
    {[-.22,.22].map(x=>[-.2,.2].map(z=><MatBox key={x+"-"+z} position={[x,.08,z]} scale={[.08,.08,.08]} color="#7d838b" metalness={.7}/>))}
  </group>;
}
function Plant({position}:{position:[number,number,number]}){
  return <group position={position}>
    <mesh position={[0,.28,0]} castShadow><cylinderGeometry args={[.28,.22,.55,16]}/><meshStandardMaterial color="#514237"/></mesh>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.18,.72+(i%3)*.12,Math.cos(i*2.4)*.18]} rotation={[.2,0,(i-3)*.2]} castShadow><coneGeometry args={[.16,.65,7]}/><meshStandardMaterial color={i%2?"#35624b":"#477a57"}/></mesh>)}
  </group>;
}
function Sofa({position,rotation=0}:{position:[number,number,number];rotation?:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <MatBox position={[0,.28,0]} scale={[2.6,.45,.9]} color="#343d49"/>
    <MatBox position={[0,.68,-.36]} scale={[2.6,.85,.18]} color="#465361"/>
    {[-.9,0,.9].map(x=><MatBox key={x} position={[x,.56,.02]} scale={[.78,.08,.72]} color="#586574"/>)}
  </group>;
}
function GlassWall({position,scale}:{position:[number,number,number];scale:[number,number,number]}){
  return <mesh position={position} castShadow><boxGeometry args={scale}/><meshPhysicalMaterial color="#9fc4d4" transparent opacity={.2} roughness={.12} metalness={.2} transmission={.15} thickness={.12}/></mesh>;
}
function RoomSign({children,position}:{children:string;position:[number,number,number]}){
  return <Text position={position} fontSize={.34} color="#d9c08b" anchorX="center" anchorY="middle" outlineWidth={.012} outlineColor="#11151b">{children}</Text>;
}
function Architecture({employees}:{employees:EmployeeAgent[]}){
  const desks=employees.filter(e=>e.id!=="ceo").map(e=>({id:e.id,position:[e.position.x,0,e.position.z+1.15] as [number,number,number]}));
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.16,0]} receiveShadow><planeGeometry args={[48,34]}/><meshStandardMaterial color="#222a31" roughness={.82}/></mesh>
    <gridHelper args={[48,48,"#45515a","#303a43"]} position={[0,-.145,0]}/>
    <MatBox position={[0,-.02,0]} scale={[43,.16,29]} color="#a59b8a" roughness={.82}/>
    <MatBox position={[0,.03,0]} scale={[41.8,.025,27.8]} color="#c2b9aa" roughness={.7}/>
    {[-20.8,20.8].map(x=><group key={x}><MatBox position={[x,1.75,0]} scale={[.18,3.5,28]} color="#384752"/><GlassWall position={[x,1.9,0]} scale={[.05,2.95,27.5]}/></group>)}
    {[-13.8,13.8].map(z=><group key={z}><MatBox position={[0,1.75,z]} scale={[41.6,3.5,.18]} color="#384752"/><GlassWall position={[0,1.9,z]} scale={[41,.05,2.95]}/></group>)}
    {[-10.2,0,10.2].map(x=><group key={x}><MatBox position={[x,1.5,-2.5]} scale={[.12,3,20]} color="#5c6268"/><GlassWall position={[x,1.5,7.2]} scale={[.06,2.8,5.8]}/></group>)}
    {[-6,4].map(z=><MatBox key={z} position={[0,1.48,z]} scale={[41,.12,.12]} color="#8c795f"/>)}
    <RoomSign position={[-15,2.8,-12.4]}>FINANCE</RoomSign>
    <RoomSign position={[0,2.8,-12.4]}>EXECUTIVE SUITE</RoomSign>
    <RoomSign position={[15,2.8,-12.4]}>COMMERCIAL</RoomSign>
    <RoomSign position={[-15,2.8,12.2]}>OPERATIONS</RoomSign>
    <RoomSign position={[0,2.8,12.2]}>WAR ROOM</RoomSign>
    <RoomSign position={[15,2.8,12.2]}>STRATEGY</RoomSign>
    {desks.map(d=><Desk key={d.id} position={d.position}/>)}
    {[-8,8].map(x=><group key={x}><MatBox position={[x,.8,7.5]} scale={[5,.16,2.1]} color="#493d32"/>{[-1.6,1.6].map(dx=><OfficeChair key={dx} position={[x+dx,0,9]}/>)}</group>)}
    <MatBox position={[0,.78,0]} scale={[5.4,.18,1.7]} color="#59442f" />
    {[-2,0,2].map(x=><OfficeChair key={x} position={[x,0,1.5]}/>)}
    <Sofa position={[-5,0,-10]} rotation={Math.PI/2}/><Sofa position={[-1.8,0,-10]} rotation={-Math.PI/2}/>
    <MatBox position={[-3.4,.38,-10]} scale={[1.2,.12,1.2]} color="#57483b"/>
    <Plant position={[-19,0,-11]}/><Plant position={[19,0,-11]}/><Plant position={[-19,0,11]}/><Plant position={[19,0,11]}/>
    {[-18,-9,0,9,18].map(x=><group key={x}><MatBox position={[x,3.25,-13.4]} scale={[.12,.12,.7]} color="#d7c9a7" emissive="#d7c9a7" emissiveIntensity={.45}/><MatBox position={[x,3.25,13.4]} scale={[.12,.12,.7]} color="#d7c9a7" emissive="#d7c9a7"/></group>)}
    <MatBox position={[0,.85,-13]} scale={[5,.2,.9]} color="#3a454f"/>
    <MatBox position={[0,1.3,-13.32]} scale={[2.2,.7,.06]} color="#152d3a"/>
  </group>;
}
function Character({employee,asset,onSelect,selected}:{employee:EmployeeAgent;asset:GLTF;onSelect:(id:string)=>void;selected:boolean}){
  const root=useRef<Group>(null),mixer=useRef<AnimationMixer|null>(null),action=useRef<AnimationAction|null>(null);
  const model=useMemo(()=>clone(asset.scene),[asset]);
  useEffect(()=>{
    const m=new AnimationMixer(model);mixer.current=m;
    return()=>{m.stopAllAction();mixer.current=null};
  },[asset,model]);
  useEffect(()=>{
    const m=mixer.current;if(!m)return;
    const preferred=employee.activity==="walking"?/walk/i:/idle/i;
    const clip=asset.animations.find(a=>preferred.test(a.name))??asset.animations.find(a=>/idle/i.test(a.name))??asset.animations[0];
    if(!clip)return;
    const next=m.clipAction(clip);next.reset().fadeIn(.22).play();action.current?.fadeOut(.22);action.current=next;
  },[asset,employee.activity]);
  useFrame((_,delta)=>{
    mixer.current?.update(Math.min(delta,.05));
    const g=root.current;if(!g)return;
    const target=new Vector3(employee.position.x,0,employee.position.z);
    g.position.lerp(target,1-Math.exp(-delta*7));
    if(employee.destination){
      const dx=employee.destination.x-employee.position.x,dz=employee.destination.z-employee.position.z;
      if(Math.abs(dx)+Math.abs(dz)>.05)g.rotation.y=MathUtils.damp(g.rotation.y,Math.atan2(dx,dz),5,delta);
    }
  });
  return <group ref={root} position={[employee.position.x,0,employee.position.z]} onClick={e=>{e.stopPropagation();onSelect(employee.id)}}>
    <primitive object={model} scale={.98} />
    {selected&&<mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.72,.84,48]}/><meshBasicMaterial color="#e1bd70" transparent opacity={.95}/></mesh>}
    <mesh position={[0,2.12,0]}><sphereGeometry args={[.045,12,12]}/><meshBasicMaterial color={employee.activity==="working"?"#65c18a":employee.activity==="walking"?"#e1bd70":"#7c8793"}/></mesh>
  </group>;
}
function People({employees,selected,onSelect}:{employees:EmployeeAgent[];selected:string;onSelect:(id:string)=>void}){
  const assets=useAssets();
  return <>{employees.map((employee,index)=><Character key={employee.id} employee={employee} asset={assets[index%assets.length]} selected={selected===employee.id} onSelect={onSelect}/>)}</>;
}
function CameraRig({mode}:{mode:"CEO"|"FREE"}){
  const {camera}=useThree();
  useEffect(()=>{const target=mode==="CEO"?new Vector3(0,7,15):new Vector3(29,25,31);camera.position.copy(target);camera.lookAt(0,0,0);},[camera,mode]);
  return null;
}
function WorldScene({employees,selected,onSelect,cameraMode}:{employees:EmployeeAgent[];selected:string;onSelect:(id:string)=>void;cameraMode:"CEO"|"FREE"}){
  return <Canvas shadows dpr={[1,1.6]} camera={{position:[29,25,31],fov:42,near:.1,far:150}} gl={{antialias:true,alpha:false}}>
    <color attach="background" args={["#101820"]}/>
    <fog attach="fog" args={["#101820",42,85]}/>
    <ambientLight intensity={.75}/>
    <hemisphereLight args={["#dce8f0","#4a4035",1.1]}/>
    <directionalLight position={[-15,24,10]} intensity={2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={24} shadow-camera-bottom={-24}/>
    <pointLight position={[0,7,0]} intensity={.7} color="#e8c88d"/>
    <Architecture employees={employees}/>
    <CameraRig mode={cameraMode}/>
    <Suspense fallback={null}><People employees={employees} selected={selected} onSelect={onSelect}/></Suspense>
    <ContactShadows position={[0,-.12,0]} opacity={.28} scale={48} blur={2.6} far={6}/>
    <Environment preset="city"/>
    <OrbitControls makeDefault target={[0,0,0]} minDistance={9} maxDistance={58} maxPolarAngle={Math.PI/2.08} minPolarAngle={.18} enableDamping dampingFactor={.08}/>
  </Canvas>;
}
export function ExecutiveWorld3D({rooms,onSelectDesk}:Props){
  const [world,setWorld]=useState<SimulationState>(initialWorld),[selected,setSelected]=useState("ceo"),[camera,setCamera]=useState<"CEO"|"FREE">("FREE");
  
  useEffect(()=>{const timer=window.setInterval(()=>setWorld(w=>{if(w.paused||w.speed===0)return w;const next=tickSimulation(w,10_000).state;return {...next,lastWallClockAt:Date.now()}}),900);return()=>window.clearInterval(timer)},[]);
  const active=world.employees.filter(e=>e.status==="active").length,working=world.employees.filter(e=>e.activity==="working").length,walking=world.employees.filter(e=>e.activity==="walking").length;
  const selectedEmployee=world.employees.find(e=>e.id===selected)??world.employees[0];
  const setSpeed=(next:0|1|2|4)=>{setWorld(w=>({...w,speed:next,paused:next===0}))};
  return <div className="q3d-shell q3d-living q3d-premium">
    <div className="q3d-toolbar">
      <span className="q3d-live"><i/>SIMULATION · {active} PEOPLE</span>
      <span>{working} working · {walking} moving · {world.events.length} events</span>
      <div><button type="button" onClick={()=>setWorld(w=>({...w,paused:!w.paused}))}>{world.paused?"Resume":"Pause"}</button>
        {([1,2,4] as const).map(s=><button key={s} type="button" aria-pressed={world.speed===s} onClick={()=>setSpeed(s)}>{s}×</button>)}
        <button type="button" onClick={()=>setCamera(c=>c==="CEO"?"FREE":"CEO")}>{camera==="CEO"?"Free camera":"CEO view"}</button>
      </div>
    </div>
    <div className="q3d-stage">
      <Suspense fallback={<div className="q3d-loading">Loading realistic people and headquarters…</div>}>
        <WorldScene employees={world.employees} selected={selected} onSelect={id=>{setSelected(id);setCamera("CEO")}} cameraMode={camera}/>
      </Suspense>
      <div className="q3d-scene-hud"><span>Q EXECUTIVE CAMPUS</span><span>26 AGENTS · 6 DEPARTMENTS</span></div>
    </div>
    <div className="q3d-room-selector">
      <div className="q3d-room-tabs">{rooms.map(r=><button type="button" key={r.id} onClick={()=>{const first=r.desks[0];if(first){onSelectDesk(first.id);setSelected(first.id)}}}>{r.label}</button>)}</div>
      <div className="q3d-desks">{world.employees.map(e=><button type="button" key={e.id} onClick={()=>setSelected(e.id)} aria-pressed={selected===e.id}>
        <span data-light={e.activity==="working"?"ok":e.activity==="walking"?"watch":"idle"}/><b>{e.name}</b><small>{e.role} · {e.activity} · energy {Math.round(e.energy)}%</small>
      </button>)}</div>
      <div className="q3d-profile"><b>{selectedEmployee.name}</b><span>{selectedEmployee.role} · reports to {selectedEmployee.reportsTo}</span><span>Energy {Math.round(selectedEmployee.energy)} · morale {Math.round(selectedEmployee.morale)} · stress {Math.round(selectedEmployee.stress)}</span><span>Skills: {selectedEmployee.skills.join(" · ")}</span></div>
      <p className="q3d-disclaimer">FICTIONAL WORKFORCE · SIMULATION ONLY · NO LIVE Q OS TASKS OR BUSINESS RECORDS ARE MODIFIED</p>
      <p className="q3d-asset-credit">Character models: vinish.dev · CC BY 4.0 · included in asset credits</p>
    </div>
  </div>;
}
