"use client";

import { useEffect, useRef, useState } from "react";
import "./q-world.css";

type Unit = { id:string; name:string; department:string; role:string; color:[number,number,number]; x:number; z:number; mission:string };
const UNITS:Unit[] = [
 {id:"q",name:"NASSIM AI HQ / Q",department:"Headquarters",role:"Company operating system",color:[.82,.16,.19],x:0,z:0,mission:"Coordinate the company and its operating systems"},
 {id:"certigo",name:"CERTIGO",department:"Education",role:"Learning platform",color:[.18,.52,.88],x:-22,z:-17,mission:"Build and monetise professional learning"},
 {id:"dalil",name:"DALIL AL-BAZOURIEH",department:"Directory",role:"Business directory",color:[.76,.62,.4],x:-39,z:0,mission:"Build a trusted local business discovery network"},
 {id:"lumeris",name:"LUMERIS",department:"Media",role:"Media and audience business",color:[.82,.19,.22],x:22,z:16,mission:"Grow audience and monetise media"},
 {id:"xauusd",name:"XAU/USD TRADING HQ",department:"Trading",role:"Trading research system",color:[.22,.68,.38],x:0,z:31,mission:"Analyse markets; all trades remain owner-controlled"},
 {id:"novae",name:"NOVAÉ",department:"Agency",role:"Brand and growth studio",color:[.79,.58,.26],x:21,z:-17,mission:"Acquire clients and deliver brand services"},
 {id:"lep",name:"LUANDA EDGE PULSE",department:"Intelligence",role:"Market intelligence",color:[.2,.68,.57],x:-22,z:16,mission:"Turn verified market signals into decisions"},
 {id:"ali-quest",name:"ALI-QUEST / CISA QUEST",department:"Education",role:"Learning game",color:[.22,.65,.78],x:-39,z:-18,mission:"Create engaging educational experiences"},
 {id:"radio",name:"RADIO CEDARS",department:"Media",role:"Audio and community media",color:[.54,.38,.78],x:39,z:0,mission:"Build a loyal audience and sponsorship revenue"}
];
type Cube={x:number;y:number;z:number;sx:number;sy:number;sz:number;color:[number,number,number]};
type VisualSettings={environment:"executive"|"daylight"|"sunset";palette:"brand"|"monochrome"|"vibrant";brightness:number;zoom:number;quality:"performance"|"balanced"|"high";labels:boolean};
const DEFAULT_VISUALS:VisualSettings={environment:"executive",palette:"brand",brightness:1,zoom:1,quality:"balanced",labels:true};
const cube=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:[number,number,number]):Cube=>({x,y,z,sx,sy,sz,color});
const scene:Cube[]=[];
const ground:[number,number,number]=[.12,.16,.17], road:[number,number,number]=[.19,.23,.25], glass:[number,number,number]=[.28,.49,.56], dark:[number,number,number]=[.055,.075,.09], leaf:[number,number,number]=[.13,.31,.22], gold:[number,number,number]=[.62,.43,.22];
scene.push(cube(0,-.7,0,110,1,88,ground),cube(0,-.1,0,7,.12,86,road),cube(0,-.08,0,104,.12,6,road));
for(let x=-48;x<=48;x+=12){scene.push(cube(x,-.03,0,.25,.05,86,[.2,.27,.27]));}
for(let z=-38;z<=38;z+=12){scene.push(cube(0,-.02,z,104,.05,.25,[.2,.27,.27]));}
function building(x:number,z:number,w:number,d:number,h:number,c:[number,number,number]){
 scene.push(cube(x,h/2,z,w,h,d,c),cube(x,h+.12,z,w+.5,.24,d+.5,dark),cube(x,h*.52,z-d/2-.08,w*.82,h*.55,.12,glass),cube(x,h*.52,z+d/2+.08,w*.82,h*.55,.12,glass),cube(x-w/2-.08,h*.52,z,.12,h*.55,d*.72,glass),cube(x+w/2+.08,h*.52,z,.12,h*.55,d*.72,glass),cube(x,h+.3,z,w*.3,.12,.35,gold));
 for(let yy=2;yy<h-1;yy+=2.3){for(let xx=-w/2+1.2;xx<w/2-1;xx+=2.5){scene.push(cube(x+xx,yy,z-d/2-.16,1.15,1.05,.08,glass));}}
}
building(0,0,20,17,13,[.16,.2,.24]);
for(const u of UNITS.slice(1)){building(u.x,u.z,10,8,7,u.color);}
for(let x=-45;x<=45;x+=9){for(let z=-34;z<=34;z+=11){if(Math.abs(x)<7&&Math.abs(z)<9)continue;scene.push(cube(x,.9,z,.45,1.8,.45,[.31,.25,.18]),cube(x,2.15,z,2.2,2.6,2.2,leaf));}}
for(let x=-45;x<=45;x+=6){scene.push(cube(x,.015,-43,3,.03,.18,gold),cube(x,.015,43,3,.03,.18,gold));}
const AVATARS:Cube[]=[];
for(const u of UNITS){AVATARS.push(cube(u.x+7,.75,u.z+6,.85,1.5,.7,u.color),cube(u.x+7,1.85,u.z+6,.8,.7,.72,[.82,.72,.59]),cube(u.x+7,.1,u.z+6,.6,.2,.55,dark));}
const OBJECTS=[...scene,...AVATARS];
const POS:number[]=[];const NOR:number[]=[];
const faces:[number[][],number[]][]=[
 [[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[0,0,1]],
 [[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],[0,0,-1]],
 [[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],[-1,0,0]],
 [[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[1,0,0]],
 [[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[0,1,0]],
 [[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[0,-1,0]]
];
for(const [v,n] of faces){for(const i of [0,1,2,0,2,3]){POS.push(...v[i]);NOR.push(...n);}}
function mul(a:number[],b:number[]){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function perspective(f:number,aspect:number,n:number,far:number){const t=1/Math.tan(f/2);return [t/aspect,0,0,0,0,t,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0];}
function lookAt(e:number[],c:number[]){const norm=(v:number[])=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};const sub=(a:number[],b:number[])=>a.map((x,i)=>x-b[i]);const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const z=norm(sub(e,c)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*e[i],0),-y.reduce((s,v,i)=>s+v*e[i],0),-z.reduce((s,v,i)=>s+v*e[i],0),1];}
const VS=`attribute vec3 p;attribute vec3 n;uniform mat4 mvp;varying vec3 normal;void main(){normal=n;gl_Position=mvp*vec4(p,1.0);}`;
const FS=`precision mediump float;uniform vec3 color;uniform float intensity;varying vec3 normal;void main(){float light=.48+max(dot(normalize(normal),normalize(vec3(-.4,.9,.5))),0.0)*.55;gl_FragColor=vec4(color*light*intensity,1.0);}`;
function shader(gl:WebGLRenderingContext,type:number,src:string){const s=gl.createShader(type);if(!s)throw Error("WebGL shader unavailable");gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||"Shader compile failed");return s;}
function translateScale(o:Cube){return [o.sx,0,0,0,0,o.sy,0,0,0,0,o.sz,0,o.x,o.y,o.z,1];}

export function QWorldView(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [mode,setMode]=useState<"isometric"|"third-person">("isometric");
 const [selected,setSelected]=useState("q");
 const [webgl,setWebgl]=useState(true);
 const [visuals,setVisuals]=useState<VisualSettings>(DEFAULT_VISUALS);
 const [directorOpen,setDirectorOpen]=useState(true);
 const position=useRef({x:0,z:24,yaw:0});
 const visualsRef=useRef(visuals);visualsRef.current=visuals;
 useEffect(()=>{try{const saved=localStorage.getItem("q-world.visuals");if(saved){const parsed=JSON.parse(saved) as Partial<VisualSettings>;setVisuals(v=>({...v,...parsed}));}}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("q-world.visuals",JSON.stringify(visuals));}catch{}},[visuals]);
 const updateVisuals=(patch:Partial<VisualSettings>)=>setVisuals(v=>({...v,...patch}));
 useEffect(()=>{
  const el=canvas.current;if(!el)return;
  let gl:WebGLRenderingContext|null=null;
  try{gl=el.getContext("webgl",{antialias:true,alpha:false,powerPreference:"low-power"});}catch{}
  if(!gl){setWebgl(false);return;}
  let program:WebGLProgram|null=null,raf=0,disposed=false;
  try{
   program=gl.createProgram();if(!program)throw Error("WebGL program unavailable");
   gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("WebGL link failed");
   gl.useProgram(program);
   const pb=gl.createBuffer(),nb=gl.createBuffer();if(!pb||!nb)throw Error("WebGL buffers unavailable");
   gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(POS),gl.STATIC_DRAW);
   const p=gl.getAttribLocation(program,"p");gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,0,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(NOR),gl.STATIC_DRAW);
   const n=gl.getAttribLocation(program,"n");gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,3,gl.FLOAT,false,0,0);
   const mvp=gl.getUniformLocation(program,"mvp"),color=gl.getUniformLocation(program,"color"),intensity=gl.getUniformLocation(program,"intensity");
   gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.035,.05,.065,1);
   const resize=()=>{const rect=el.getBoundingClientRect(),quality=visualsRef.current.quality,dpr=Math.min(window.devicePixelRatio||1,quality==="high"?1.5:quality==="balanced"?1.25:1),w=Math.max(1,Math.floor(rect.width*dpr)),h=Math.max(1,Math.floor(rect.height*dpr));if(el.width!==w||el.height!==h){el.width=w;el.height=h;gl!.viewport(0,0,w,h);}};
   const keys=new Set<string>();const down=(e:KeyboardEvent)=>{if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());if(mode==="third-person")e.preventDefault();}};const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
   window.addEventListener("keydown",down);window.addEventListener("keyup",up);
   const render=()=>{if(disposed)return;resize();if(!document.hidden){
    if(mode==="third-person"){const step=.18,p=position.current;if(keys.has("a")||keys.has("arrowleft"))p.yaw+=.035;if(keys.has("d")||keys.has("arrowright"))p.yaw-=.035;if(keys.has("w")||keys.has("arrowup")){p.x+=Math.sin(p.yaw)*step;p.z-=Math.cos(p.yaw)*step;}if(keys.has("s")||keys.has("arrowdown")){p.x-=Math.sin(p.yaw)*step;p.z+=Math.cos(p.yaw)*step;}p.x=Math.max(-48,Math.min(48,p.x));p.z=Math.max(-38,Math.min(38,p.z));}
    const v=visualsRef.current,sky=v.environment==="daylight"?[.28,.39,.47]:v.environment==="sunset"?[.12,.055,.07]:[.035,.05,.065];gl!.clearColor(sky[0],sky[1],sky[2],1);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);
    const eye=mode==="isometric"?[57/v.zoom,52/v.zoom,62/v.zoom] :[position.current.x,3.2,position.current.z];
    const target=mode==="isometric"?[0,0,0] :[position.current.x+Math.sin(position.current.yaw)*14,2.6,position.current.z-Math.cos(position.current.yaw)*14];
    const proj=perspective((mode==="isometric"?.78:1.02)/v.zoom,el.width/Math.max(1,el.height),.1,220),view=lookAt(eye,target),vp=mul(proj,view);
    gl!.uniform1f(intensity,v.brightness);
    for(const o of OBJECTS){let rgb=[...o.color];if(v.palette==="monochrome"){const l=rgb[0]*.3+rgb[1]*.59+rgb[2]*.11;rgb=[l*.78,l*.84,l*.9];}else if(v.palette==="vibrant"){const l=(rgb[0]+rgb[1]+rgb[2])/3;rgb=rgb.map(ch=>Math.max(0,Math.min(1,l+(ch-l)*1.45)));}gl!.uniformMatrix4fv(mvp,false,new Float32Array(mul(vp,translateScale(o))));gl!.uniform3fv(color,new Float32Array(rgb));gl!.drawArrays(gl!.TRIANGLES,0,36);}
   }raf=window.requestAnimationFrame(render);};
   const observer=new ResizeObserver(resize);observer.observe(el);raf=window.requestAnimationFrame(render);
   return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  }catch{setWebgl(false);}
 },[mode]);
 const active=UNITS.find(u=>u.id===selected)??UNITS[0];
 const move=(dx:number,dz:number)=>{const p=position.current;p.x=Math.max(-48,Math.min(48,p.x+dx));p.z=Math.max(-38,Math.min(38,p.z+dz));};
 return <main className="qw-shell">
  <header className="qw-header"><div><span className="qw-kicker">Q COMPANY · CAMPUS SIMULATOR</span><h1>Q WORLD</h1><p>One company. Connected businesses. One objective: profitable growth.</p></div><div className="qw-live"><i/> WORLD FOUNDATION · READ ONLY</div></header>
  <div className="qw-toolbar"><div className="qw-mode" role="group" aria-label="Camera mode"><button type="button" aria-pressed={mode==="isometric"} onClick={()=>setMode("isometric")}>Isometric management</button><button type="button" aria-pressed={mode==="third-person"} onClick={()=>setMode("third-person")}>Third-person walk</button></div><span className="qw-hint">{mode==="isometric"?"Campus overview · select a unit below": "Walk with W A S D or arrow keys · select a unit below"}</span></div>
  <div className="qw-layout">
   <section className="qw-stage" aria-label="Interactive three-dimensional campus">
    {webgl?<canvas ref={canvas} aria-label="Three-dimensional Q company campus, with headquarters and business-unit buildings"/>:<div className="qw-fallback"><b>3D graphics are unavailable on this device.</b><p>The business campus remains accessible in the unit directory.</p></div>}
    <div className="qw-overlay"><b>Q HEADQUARTERS</b><span>ANGOLA · GLOBAL DIGITAL BUSINESS CAMPUS</span></div>
    {mode==="third-person"&&<div className="qw-pad" aria-label="Walk controls"><button type="button" onClick={()=>move(0,-2)} aria-label="Move forward">↑</button><div><button type="button" onClick={()=>move(-2,0)} aria-label="Move left">←</button><button type="button" onClick={()=>move(2,0)} aria-label="Move right">→</button></div><button type="button" onClick={()=>move(0,2)} aria-label="Move backward">↓</button></div>}
   </section>
   <aside className="qw-inspector" aria-label="Selected business unit"><span className="qw-kicker">SELECTED BUSINESS UNIT</span><h2>{active.name}</h2><p>{active.role}</p><div className="qw-dept">{active.department}</div><p className="qw-mission">{active.mission}</p><small>Live financial KPIs: not connected in this foundation PR.</small><a href="/office">Open existing Office</a></aside>
  </div>
  <section className="qw-units" aria-labelledby="qw-units-title"><div><span className="qw-kicker">THE COMPANY</span><h2 id="qw-units-title">Business units</h2></div><div className="qw-unit-grid">{UNITS.map(u=><button key={u.id} type="button" className={selected===u.id?"active":""} onClick={()=>setSelected(u.id)} aria-pressed={selected===u.id}><span style={{background:`rgb(${u.color.map(v=>Math.round(v*255)).join(",")})`}}/><b>{u.name}</b><small>{u.department}</small></button>)}</div><p className="qw-simulation-note">Illustrative campus layout · no live tasks, revenue or costs are changed. Real KPIs will only appear after verified data connections.</p></section>
 </main>;
}
