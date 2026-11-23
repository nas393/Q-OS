"use client";

import { useEffect, useRef, useState } from "react";

type DeskItem = { id: string; name: string; role: string; light: "ok" | "watch" | "down" | "idle"; needs: number; open: number };
type RoomItem = { id: string; label: string; note: string; desks: DeskItem[] };
type Props = { rooms: RoomItem[]; onSelectDesk: (id: string) => void };

type V3 = [number, number, number];
type Part = { p: V3; s: V3; c: [number, number, number] };
const cube = (p: V3, s: V3, c: [number, number, number]): Part => ({ p, s, c });
const COLORS = {
  floor: [0.43, 0.29, 0.19] as [number, number, number],
  wall: [0.19, 0.22, 0.27] as [number, number, number],
  dark: [0.075, 0.085, 0.105] as [number, number, number],
  wood: [0.30, 0.19, 0.12] as [number, number, number],
  leather: [0.20, 0.22, 0.25] as [number, number, number],
  gold: [0.72, 0.53, 0.22] as [number, number, number],
  glass: [0.20, 0.48, 0.62] as [number, number, number],
  screen: [0.22, 0.66, 0.78] as [number, number, number],
  plant: [0.12, 0.34, 0.20] as [number, number, number],
};

function roomParts(roomIndex: number, deskCount: number): Part[] {
  const col = roomIndex % 4;
  const row = Math.floor(roomIndex / 4);
  const ox = col * 7.2 - 10.8;
  const oz = row * 7.0 - 3.5;
  const a: Part[] = [];
  const add = (x:number,y:number,z:number,w:number,h:number,d:number,c:[number,number,number]) => a.push(cube([ox+x,y,oz+z],[w,h,d],c));
  // Raised timber floor, rear and left walls; front/right are cut away for the architectural view.
  add(3,0,2.5,6.2,.22,5.2,COLORS.floor);
  add(3,1.65,0,6.2,3.1,.18,COLORS.wall);
  add(0,1.65,2.5,.18,3.1,5.2,COLORS.wall);
  add(3,3.15,0,6.25,.12,.24,COLORS.gold);
  // Timber feature wall and shelving.
  add(3,1.35,.14,3.2,2.45,.12,COLORS.wood);
  for(let i=0;i<4;i++) add(4.7,1.25+i*.48,.35,1.4,.08,.55,COLORS.dark);
  // Executive desks, monitor, task light, chair.
  const count = Math.max(1,Math.min(deskCount,3));
  for(let i=0;i<count;i++){
    const dx = 1.35 + (i%2)*2.6;
    const dz = 1.45 + Math.floor(i/2)*2.1;
    add(dx,.78,dz,1.9,.16,1.05,COLORS.wood);
    add(dx,.38,dz,.12,.72,.12,COLORS.dark);
    add(dx+0.7,1.08,dz-.22,.62,.48,.08,COLORS.dark);
    add(dx+0.7,1.08,dz-.16,.52,.36,.025,COLORS.screen);
    add(dx,.52,dz+1.0,.62,.72,.62,COLORS.leather);
    add(dx,.16,dz+1.0,.72,.12,.72,COLORS.dark);
    add(dx-.65,.89,dz-.25,.08,.28,.08,COLORS.gold);
  }
  // Meeting/lounge furniture.
  add(3,.48,3.75,2.5,.18,.95,COLORS.dark);
  add(1.45,.45,3.8,1.2,.65,.72,COLORS.leather);
  add(4.65,.45,3.8,1.2,.65,.72,COLORS.leather);
  // Plants and architectural glazing.
  add(5.55,.55,4.55,.42,.9,.42,COLORS.plant);
  add(5.55,1.5,4.55,.06,1.0,.06,COLORS.plant);
  add(3.3,1.45,.04,1.1,1.45,.04,COLORS.glass);
  return a;
}

const VS = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; varying vec3 vWorld; void main(){ vec4 w=uModel*vec4(aPosition,1.0); vWorld=w.xyz; vNormal=mat3(uModel)*aNormal; gl_Position=uMvp*vec4(aPosition,1.0); }`;
const FS = `precision mediump float; varying vec3 vNormal; varying vec3 vWorld; uniform vec3 uColor; void main(){ vec3 n=normalize(vNormal); vec3 l=normalize(vec3(-.45,.9,.55)); float d=max(dot(n,l),0.0); float ambient=.48; float shade=ambient+d*.72; float fog=smoothstep(18.0,34.0,length(vWorld.xz)); vec3 base=uColor*shade; vec3 bg=vec3(.045,.055,.075); gl_FragColor=vec4(mix(base,bg,fog*.5),1.0); }`;
const POS = [-.5,-.5,-.5, .5,-.5,-.5, .5,.5,-.5, -.5,-.5,-.5, .5,.5,-.5, -.5,.5,-.5, -.5,-.5,.5, .5,-.5,.5, .5,.5,.5, -.5,-.5,.5, .5,.5,.5, -.5,.5,.5, -.5,-.5,-.5, -.5,.5,-.5, -.5,.5,.5, -.5,-.5,-.5, -.5,.5,.5, -.5,-.5,.5, .5,-.5,-.5, .5,.5,-.5, .5,.5,.5, .5,-.5,-.5, .5,.5,.5, .5,-.5,.5, -.5,-.5,-.5, -.5,-.5,.5, .5,-.5,.5, -.5,-.5,-.5, .5,-.5,.5, .5,-.5,-.5, -.5,.5,-.5, -.5,.5,.5, .5,.5,.5, -.5,.5,-.5, .5,.5,.5, .5,.5,-.5];
const NOR = Array.from({length:6},(_,i)=>Array.from({length:6},()=>[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]][i]).flat()).flat();

function matMul(a:number[],b:number[]) { const o=new Array(16).fill(0); for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k]; return o; }
function perspective(f:number,aspect:number,n:number,far:number){const t=1/Math.tan(f/2);return [t/aspect,0,0,0,0,t,0,0,0,0,(far+n)/(n-far),-1,0,0,(2*far*n)/(n-far),0];}
function lookAt(eye:V3,center:V3){const norm=(v:V3):V3=>{const l=Math.hypot(...v)||1;return [v[0]/l,v[1]/l,v[2]/l]};const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const z=norm(sub(eye,center)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1];}

export function ExecutiveWorld3D({rooms,onSelectDesk}:Props){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [zoom,setZoom]=useState(1);
  const [rotation,setRotation]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [activeRoom,setActiveRoom]=useState(rooms[0]?.id??"");
  useEffect(()=>{
    const el=canvas.current; if(!el)return;
    const gl=el.getContext("webgl",{antialias:true,alpha:false}); if(!gl)return;
    const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Shader error");return s;};
    const program=gl.createProgram()!;gl.attachShader(program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    gl.useProgram(program);
    const pb=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(POS),gl.STATIC_DRAW);
    const nb=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(NOR),gl.STATIC_DRAW);
    const p=gl.getAttribLocation(program,"aPosition");gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,0,0);
    const n=gl.getAttribLocation(program,"aNormal");gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,3,gl.FLOAT,false,0,0);
    const um=gl.getUniformLocation(program,"uMvp"),uModel=gl.getUniformLocation(program,"uModel"),uc=gl.getUniformLocation(program,"uColor");
    const parts=rooms.flatMap((r,i)=>roomParts(i,r.desks.length));
    const draw=()=>{
      const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(window.devicePixelRatio||1,1.7);
      if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);}
      gl.viewport(0,0,el.width,el.height);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.045,.055,.075,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const radius=31/zoom,eye:[number,number,number]=[Math.sin(rotation)*radius,20,Math.cos(rotation)*radius];
      const view=lookAt(eye,[0,0,0]);const proj=perspective(.62,w/h,.1,100);const vp=matMul(proj,view);
      for(const part of parts){const [x,y,z]=part.p,[sx,sy,sz]=part.s;const model=[sx,0,0,0,0,sy,0,0,0,0,sz,0,x,y,z,1];gl.uniformMatrix4fv(uModel,false,new Float32Array(model));gl.uniformMatrix4fv(um,false,new Float32Array(matMul(vp,model)));gl.uniform3fv(uc,new Float32Array(part.c));gl.drawArrays(gl.TRIANGLES,0,36);}
      frame=requestAnimationFrame(draw);
    };
    let frame=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(frame);gl.deleteProgram(program);gl.deleteBuffer(pb);gl.deleteBuffer(nb);};
  },[rooms,zoom,rotation]);
  const pointer=useRef(0);
  return <div className="q3d-shell">
    <div className="q3d-toolbar"><span className="q3d-live"><i/>3D EXECUTIVE HQ</span><span>Drag to rotate · Scroll or use controls to zoom</span>
      <div><button type="button" onClick={()=>setZoom(z=>Math.min(1.5,z+.1))} aria-label="Zoom in">＋</button><button type="button" onClick={()=>setZoom(z=>Math.max(.65,z-.1))} aria-label="Zoom out">－</button><button type="button" onClick={()=>{setZoom(1);setRotation(0)}}>Reset view</button></div>
    </div>
    <canvas ref={canvas} aria-label="Interactive three-dimensional isometric model of Q Executive Headquarters" onPointerDown={e=>{pointer.current=e.clientX;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(dragging){const dx=e.clientX-pointer.current;pointer.current=e.clientX;setRotation(r=>r+dx*.008)}}} onPointerUp={()=>setDragging(false)} onPointerCancel={()=>setDragging(false)} onWheel={e=>setZoom(z=>Math.max(.65,Math.min(1.5,z-e.deltaY*.0008))}/>
    <div className="q3d-room-selector"><div className="q3d-room-tabs">{rooms.map(r=><button type="button" key={r.id} className={activeRoom===r.id?"active":""} onClick={()=>setActiveRoom(r.id)}>{r.label}</button>)}</div>
      <div className="q3d-desks">{rooms.find(r=>r.id===activeRoom)?.desks.map(d=><button type="button" key={d.id} onClick={()=>onSelectDesk(d.id)}><span data-light={d.light}/><b>{d.name}</b><small>{d.role} · {d.open} open · {d.needs} need you</small></button>)}</div>
    </div>
  </div>;
}
