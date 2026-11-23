"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INITIAL_EMPLOYEES } from "@/lib/simulation/seed";
import { tickSimulation } from "@/lib/simulation/engine";
import type { SimulationState, SimTask } from "@/lib/simulation/types";

type V3 = [number, number, number];
type Mesh = { positions: number[]; normals: number[]; count: number };
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function sphere(lat=12,lon=16):Mesh {
  const p:number[]=[],n:number[]=[];
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
    const a=(y/lat)*Math.PI,b=((y+1)/lat)*Math.PI,c=(x/lon)*Math.PI*2,d=((x+1)/lon)*Math.PI*2;
    const v=(t:number,u:number):V3=>[Math.sin(t)*Math.cos(u),Math.cos(t),Math.sin(t)*Math.sin(u)];
    const q=[v(a,c),v(b,c),v(b,d),v(a,c),v(b,d),v(a,d)];
    for(const w of q){p.push(...w);n.push(...w);}
  }
  return {positions:p,normals:n,count:p.length/3};
}
function cylinder(segments=12):Mesh {
  const p:number[]=[],n:number[]=[];
  for(let i=0;i<segments;i++){
    const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
    const p1:V3=[Math.cos(a),-.5,Math.sin(a)],p2:V3=[Math.cos(b),-.5,Math.sin(b)],p3:V3=[Math.cos(b),.5,Math.sin(b)],p4:V3=[Math.cos(a),.5,Math.sin(a)];
    for(const v of [p1,p2,p3,p1,p3,p4]){p.push(...v);n.push(v[0],0,v[2]);}
  }
  return {positions:p,normals:n,count:p.length/3};
}
function box():Mesh {
  const faces:V3[][]=[
    [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5]],
    [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
    [[-.5,-.5,-.5],[-.5,.5,-.5],[-.5,.5,.5],[-.5,-.5,-.5],[-.5,.5,.5],[-.5,-.5,.5]],
    [[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,-.5],[.5,.5,.5],[.5,-.5,.5]],
    [[-.5,-.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,.5],[.5,-.5,-.5]],
    [[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[-.5,.5,-.5],[.5,.5,.5],[.5,.5,-.5]]
  ];
  const ns:V3[]=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]],p:number[]=[],n:number[]=[];
  faces.forEach((f,i)=>f.forEach(v=>{p.push(...v);n.push(...ns[i]);}));
  return {positions:p,normals:n,count:p.length/3};
}
function multiply(a:number[],b:number[]){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function model(x:number,y:number,z:number,sx:number,sy:number,sz:number,rz=0){const c=Math.cos(rz),s=Math.sin(rz);return [c*sx,s*sx,0,0,-s*sy,c*sy,0,0,0,0,sz,0,x,y,z,1];}
function perspective(f:number,aspect:number,n:number,far:number){const t=1/Math.tan(f/2);return [t/aspect,0,0,0,0,t,0,0,0,0,(far+n)/(n-far),-1,0,0,(2*far*n)/(n-far),0];}
function lookAt(eye:V3,center:V3){const norm=(v:V3):V3=>{const l=Math.hypot(...v)||1;return [v[0]/l,v[1]/l,v[2]/l]},sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const z=norm(sub(eye,center)),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1];}
function makeTasks():SimTask[]{
 const specs=[["Finance","Close monthly forecast",["finance"],4],["Finance","Review working capital",["planning"],3],["Commercial","Analyse key-account performance",["sales"],4],["Commercial","Prepare channel growth plan",["marketing"],3],["Operations","Review supply reliability",["operations"],4],["Operations","Improve process yield",["quality"],3],["Strategy","Assess market opportunity",["strategy"],3],["Strategy","Build transformation roadmap",["research"],2],["Executive Office","Prepare leadership briefing",["coordination"],3]];
 return specs.map((s,i)=>({id:"world-task-"+i,title:String(s[1]),department:String(s[0]),requiredSkills:s[2] as string[],priority:Number(s[3]),effortRemaining:18+i*2,status:"queued",assigneeId:null,dueAt:null,createdAt:i}));
}
function initialWorld():SimulationState {
 const now=Date.UTC(2026,10,23,9);
 return {worldId:"q-executive-world-local",version:0,simulatedAt:now,lastWallClockAt:Date.now(),speed:1,paused:false,
 employees:INITIAL_EMPLOYEES.map((e,i)=>({...e,position:{...e.position},destination:i%3===0?{x:e.position.x+(i%2?2.5:-2.5),y:0,z:e.position.z+(i%2?-1.5:1.5)}:null})),
 tasks:makeTasks(),events:[]};
}
type Props={rooms:{id:string;label:string;note:string;desks:{id:string;name:string;role:string;light:string;needs:number;open:number}[]}[];onSelectDesk:(id:string)=>void};
export function ExecutiveWorld3D({rooms,onSelectDesk}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),[world,setWorld]=useState<SimulationState>(initialWorld),[selected,setSelected]=useState("ceo"),[camera,setCamera]=useState<"CEO"|"FREE">("FREE"),[rotation,setRotation]=useState(.55),[zoom,setZoom]=useState(1),[drag,setDrag]=useState(false);
 const pointer=useRef(0),worldRef=useRef(world),selectedEmployee=world.employees.find(e=>e.id===selected)??world.employees[0];
 worldRef.current=world;
 useEffect(()=>{const timer=window.setInterval(()=>setWorld(w=>{const next=tickSimulation(w,10_000).state;return {...next,lastWallClockAt:Date.now()}}),900);return()=>window.clearInterval(timer)},[]);
 const active=world.employees.filter(e=>e.status==="active").length,working=world.employees.filter(e=>e.activity==="working").length,walking=world.employees.filter(e=>e.activity==="walking").length;
 const shader=useMemo(()=>({vs:"attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMvp;uniform mat4 uModel;varying vec3 vNormal;void main(){vNormal=mat3(uModel)*aNormal;gl_Position=uMvp*vec4(aPosition,1.0);}",fs:"precision mediump float;varying vec3 vNormal;uniform vec3 uColor;void main(){float l=max(dot(normalize(vNormal),normalize(vec3(-.4,.9,.5))),0.0);gl_FragColor=vec4(uColor*(.48+l*.7),1.0);}" }),[]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const gl=el.getContext("webgl",{antialias:true,alpha:false});if(!gl)return;
  const compile=(type:number,src:string)=>{const sh=gl.createShader(type)!;gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||"shader");return sh};
  const program=gl.createProgram()!;gl.attachShader(program,compile(gl.VERTEX_SHADER,shader.vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,shader.fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
  const meshes={box:box(),sphere:sphere(),cylinder:cylinder()};
  const buffers=Object.fromEntries(Object.entries(meshes).map(([key,m])=>{const p=gl.createBuffer()!,n=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.positions),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.normals),gl.STATIC_DRAW);return [key,{p,n,count:m.count}]})) as Record<string,{p:WebGLBuffer;n:WebGLBuffer;count:number}>;
  const ap=gl.getAttribLocation(program,"aPosition"),an=gl.getAttribLocation(program,"aNormal"),um=gl.getUniformLocation(program,"uMvp"),uModel=gl.getUniformLocation(program,"uModel"),uc=gl.getUniformLocation(program,"uColor");
  let vp:number[]=[];
  const drawMesh=(kind:keyof typeof meshes,m:number[],color:V3)=>{const b=buffers[kind];gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(uModel,false,new Float32Array(m));gl.uniformMatrix4fv(um,false,new Float32Array(multiply(vp,m)));gl.uniform3fv(uc,new Float32Array(color));gl.drawArrays(gl.TRIANGLES,0,b.count)};
  let frame=0;
  const render=()=>{
   const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(window.devicePixelRatio||1,1.5);if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(h*dpr)}
   gl.viewport(0,0,el.width,el.height);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.035,.045,.065,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   const focused=worldRef.current.employees.find(e=>e.id===selected);const target:V3=camera==="CEO"&&focused?[focused.position.x,0,focused.position.z]:[0,0,0];
   const radius=35/zoom,eye:[number,number,number]=[target[0]+Math.sin(rotation)*radius,22,target[2]+Math.cos(rotation)*radius];const view=lookAt(eye,target),proj=perspective(.66,w/h,.1,100);vp=multiply(proj,view);
   // One open-plan headquarters shell with glass perimeter, warm timber zones and meeting spaces.
   const draw=(kind:keyof typeof meshes,x:number,y:number,z:number,sx:number,sy:number,sz:number,c:V3,rz=0)=>drawMesh(kind,model(x,y,z,sx,sy,sz,rz),c);
   draw("box",0,-.22,0,42,.35,30,[.18,.19,.21]);draw("box",0,-.03,0,40,.08,28,[.30,.25,.18]);
   for(const x of [-20,20])draw("box",x,2,0,.18,4,28,[.18,.34,.42]);
   for(const z of [-14,14])draw("box",0,2,z,40,4,.18,[.18,.34,.42]);
   // Room dividers and glass executive suite.
   for(const x of [-10,0,10])draw("box",x,1.35,0,.10,2.7,20,[.24,.26,.29]);
   for(const z of [-4,5])draw("box",0,1.3,z,40,.08,.08,[.65,.48,.24]);
   // Desks and workstations: distributed by department.
   worldRef.current.employees.forEach((e,i)=>{const x=e.position.x,z=e.position.z;draw("box",x,.78,z,1.65,.14,.9,[.34,.23,.14]);draw("box",x+.42,1.12,z-.22,.5,.48,.06,[.08,.12,.16]);draw("box",x+.42,1.12,z-.18,.42,.35,.025,[.16,.48,.59]);});
   // Meeting table and lounge furniture.
   draw("box",0,.55,-1,4.8,.16,1.5,[.22,.19,.16]);draw("box",-3,.48,-1,1,.7,.9,[.17,.18,.2]);draw("box",3,.48,-1,1,.7,.9,[.17,.18,.2]);
   // Human characters: ellipsoid heads/torso and articulated cylindrical limbs, animated from simulation state.
   const now=performance.now()/1000;
   world.employees.forEach((e,i)=>{
    const x=e.position.x,z=e.position.z,phase=now*5+i*1.7,walkingNow=e.activity==="walking",swing=walkingNow?Math.sin(phase)*.42:Math.sin(now*1.2+i)*.035;
    const coat=e.tier==="leadership"?[.55,.39,.18] as V3:[.20+(i%4)*.025,.29,.39] as V3,skin=[.68,.48,.34] as V3,shirt=[.72,.73,.70] as V3;
    const leg=(side:number,angle:number)=>{const hx=x+side*.17,hz=z;draw("cylinder",hx,.48,hz,.13,.68,.13,coat,angle);draw("sphere",hx+Math.sin(angle)*.23,.14,hz+Math.cos(angle)*.23,.14,.14,.14,skin)};
    const arm=(side:number,angle:number)=>draw("cylinder",x+side*.29,.99,z,.115,.56,.115,skin,angle);
    const bob=walkingNow?Math.abs(Math.sin(phase*2))*.045:Math.sin(now*1.4+i)*.012;
    draw("sphere",x,1.38+bob,z,.27,.31,.25,skin);
    draw("cylinder",x,.91+bob,z,.46,.66,.27,coat);
    draw("sphere",x,.68+bob,z,.24,.22,.19,shirt);
    leg(-1,swing);leg(1,-swing);arm(-1,-swing*.8);arm(1,swing*.8);
    // Dark hair cap gives each character a readable human silhouette.
    draw("sphere",x,1.55+bob,z-.015,.275,.13,.26,[.10,.085,.075]);
   });
   frame=requestAnimationFrame(render);
  };
  // Bind drawMesh to the current view-projection matrix without recreating GPU resources.
  let vp:number[]=[];const oldDraw=drawMesh;
  const renderWithVp=()=>{frame=requestAnimationFrame(renderWithVp);};
  void oldDraw;void renderWithVp;
  // The frame loop uses a shared matrix assigned immediately before each draw call.
  const setMatrix=(m:number[])=>{vp=m;};
  void setMatrix;
  frame=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(frame);Object.values(buffers).forEach(b=>{gl.deleteBuffer(b.p);gl.deleteBuffer(b.n)});gl.deleteProgram(program)};
 },[camera,selected,rotation,zoom,shader]);
 const togglePause=()=>setWorld(w=>({...w,paused:!w.paused}));
 const setSpeed=(speed:0|1|2|4)=>setWorld(w=>({...w,speed}));
 return <div className="q3d-shell q3d-living">
  <div className="q3d-toolbar"><span className="q3d-live"><i/>SIMULATION · {active} PEOPLE</span><span>{working} working · {walking} walking · {world.events.length} events</span>
   <div><button type="button" onClick={togglePause}>{world.paused?"Resume":"Pause"}</button>{([1,2,4] as const).map(s=><button key={s} type="button" aria-pressed={world.speed===s} onClick={()=>setSpeed(s)}>{s}×</button>)}<button type="button" onClick={()=>setCamera(c=>c==="CEO"?"FREE":"CEO")}>{camera==="CEO"?"Free camera":"CEO view"}</button></div>
  </div>
  <canvas ref={canvas} aria-label="Live 3D company simulation with autonomous fictional employees" onPointerDown={e=>{pointer.current=e.clientX;setDrag(true);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag){const dx=e.clientX-pointer.current;pointer.current=e.clientX;setRotation(r=>r+dx*.008)}}} onPointerUp={()=>setDrag(false)} onPointerCancel={()=>setDrag(false)} onWheel={e=>setZoom(z=>clamp(z-e.deltaY*.0008,.65,1.6))}/>
  <div className="q3d-room-selector"><div className="q3d-room-tabs">{rooms.map(r=><button type="button" key={r.id} onClick={()=>{setCamera("FREE");setSelected(r.desks[0]?.id??"ceo")}}>{r.label}</button>)}</div>
   <div className="q3d-desks">{world.employees.map(e=><button type="button" key={e.id} onClick={()=>{setSelected(e.id);if(e.tier==="leadership")setCamera("CEO");}}><span data-light={e.activity==="working"?"ok":e.activity==="walking"?"watch":"idle"}/><b>{e.name}</b><small>{e.role} · {e.activity} · energy {Math.round(e.energy)}%</small></button>)}</div>
   <div className="q3d-profile"><b>{selectedEmployee.name}</b><span>{selectedEmployee.role} · reports to {selectedEmployee.reportsTo}</span><span>Energy {Math.round(selectedEmployee.energy)} · morale {Math.round(selectedEmployee.morale)} · stress {Math.round(selectedEmployee.stress)}</span><span>Skills: {selectedEmployee.skills.join(" · ")}</span></div>
   <p className="q3d-disclaimer">FICTIONAL WORKFORCE · SIMULATION ONLY · NO LIVE Q OS TASKS OR BUSINESS RECORDS ARE MODIFIED</p>
  </div>
 </div>;
}
