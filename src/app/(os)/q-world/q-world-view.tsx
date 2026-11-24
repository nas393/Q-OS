"use client";

import { useEffect, useRef, useState } from "react";
import "./q-world.css";
import QWorldSpacePlan from "./q-world-space-plan";

type Unit = { id:string; name:string; department:string; role:string; color:[number,number,number]; x:number; z:number; mission:string };
const UNITS:Unit[] = [
 {id:"q",name:"Q EXECUTIVE OFFICE",department:"Executive",role:"Owner cockpit and company command",color:[.82,.16,.19],x:0,z:0,mission:"Set direction, review priorities and approve consequential company actions"},
 {id:"novae",name:"NOVAÉ",department:"Commercial & Growth",role:"Brand and growth studio",color:[.79,.58,.26],x:-11,z:8,mission:"Acquire clients and deliver brand services"},
 {id:"certigo",name:"CERTIGO",department:"Education",role:"Learning platform",color:[.18,.52,.88],x:11,z:8,mission:"Build and monetise professional learning"},
 {id:"ali-quest",name:"ALI-QUEST / CISA QUEST",department:"Education",role:"Learning game",color:[.22,.65,.78],x:0,z:8,mission:"Create engaging educational experiences"},
 {id:"lumeris",name:"LUMERIS",department:"Media & Community",role:"Media and audience business",color:[.82,.19,.22],x:-11,z:0,mission:"Grow audience and monetise media"},
 {id:"radio",name:"RADIO CEDARS",department:"Media & Community",role:"Audio and community media",color:[.54,.38,.78],x:11,z:0,mission:"Build a loyal audience and sponsorship revenue"},
 {id:"lep",name:"LUANDA EDGE PULSE",department:"Intelligence",role:"Market intelligence",color:[.2,.68,.57],x:-11,z:-8,mission:"Turn verified market signals into decisions"},
 {id:"dalil",name:"DALIL AL-BAZOURIEH",department:"Directory & Network",role:"Business directory",color:[.76,.62,.4],x:0,z:-8,mission:"Build a trusted local business discovery network"},
 {id:"xauusd",name:"XAU/USD TRADING HQ",department:"Trading & Investment",role:"Trading research system",color:[.22,.68,.38],x:11,z:-8,mission:"Analyse markets; all trades remain owner-controlled"}
];
type Cube={x:number;y:number;z:number;sx:number;sy:number;sz:number;color:[number,number,number];shape?:"cube"|"sphere"|"cylinder"|"cone"|"beveled"|"frustum"};
type VisualSettings={environment:"executive"|"daylight"|"sunset";palette:"brand"|"monochrome"|"vibrant";brightness:number;zoom:number;orbit:number;quality:"performance"|"balanced"|"high";labels:boolean};
const DEFAULT_VISUALS:VisualSettings={environment:"executive",palette:"brand",brightness:1,zoom:1,orbit:42,quality:"balanced",labels:true};
const cube=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:[number,number,number]):Cube=>({x,y,z,sx,sy,sz,color,shape:"cube"});
const primitive=(shape:Exclude<Cube["shape"],"cube">,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:[number,number,number]):Cube=>({x,y,z,sx,sy,sz,color,shape});
const scene:Cube[]=[];
const ground:[number,number,number]=[.12,.16,.17],glass:[number,number,number]=[.28,.49,.56],dark:[number,number,number]=[.055,.075,.09],gold:[number,number,number]=[.62,.43,.22];
const floorY=()=>.35;
// A single-storey cutaway headquarters shell with an open front elevation,
// rear service core and continuous side walls keep the interior legible in isometric view.
scene.push(
 cube(0,-.72,0,44,1.1,34,ground),
 primitive("sphere",0,-.13,0,40,.08,30,[.035,.045,.052]),
 primitive("beveled",0,-.02,0,39,.52,29,[.23,.27,.29])
);
// Single-storey executive headquarters: one continuous level, nine private suites.
scene.push(
 cube(0,-.72,0,44,1.1,34,ground),
 primitive("sphere",0,-.13,0,40,.08,30,[.035,.045,.052]),
 primitive("beveled",0,-.02,0,39,.52,29,[.23,.27,.29]),
 cube(-18,2.8,0,.8,5.6,27,[.23,.28,.31]),
 cube(18,2.8,0,.8,5.6,27,[.23,.28,.31]),
 cube(0,2.8,-13.1,36,5.6,.8,[.23,.28,.31]),
 cube(0,.95,13.05,35,1.65,.55,[.23,.28,.31]),
 cube(0,1.86,13.05,35,.12,.62,gold),
 cube(0,2.7,-10.45,8.2,5.1,4.5,dark),
 cube(0,2.7,-8.05,8.4,5.1,.18,gold),
 cube(-2.1,2.7,-7.9,.14,4.7,.12,[.38,.46,.49]),
 cube(2.1,2.7,-7.9,.14,4.7,.12,[.38,.46,.49]),
 cube(0,1.1,13.8,16,.28,1.2,dark),
 cube(0,2.7,14.0,12,3.2,.34,glass),
 cube(-6.3,2.7,14.0,.32,3.6,.5,gold),
 cube(6.3,2.7,14.0,.32,3.6,.5,gold),
 cube(0,4.65,14.0,13,.24,.7,gold),
 cube(0,5.45,14.0,18,.25,2.0,dark),
 cube(0,5.55,14.0,14,.12,1.5,gold),
 // Suite partitions and glazed office fronts.
 cube(-5.85,2.45,-.1,.22,4.7,24,[.31,.38,.41]),
 cube(5.85,2.45,-.1,.22,4.7,24,[.31,.38,.41]),
 cube(0,2.45,-4.0,35,.18,.22,[.31,.38,.41]),
 cube(0,2.45,4.0,35,.18,.22,[.31,.38,.41]),
 cube(0,3.0,-3.65,9.8,.2,.18,gold),
 cube(0,3.75,-3.65,7,.95,.16,glass)
);
for(const x of [-16.8,-11.2,-5.6,0,5.6,11.2,16.8]){
 scene.push(primitive("cylinder",x,2.45,12.7,.28,4.8,.28,[.52,.57,.57]));
}
// Executive facade and single-height glazed entrance.
scene.push(
 cube(0,5.65,-13.1,37,.55,1.1,dark),
 cube(-18,2.8,-.2,.9,5.6,27,[.19,.24,.27]),
 cube(18,2.8,-.2,.9,5.6,27,[.19,.24,.27]),
 cube(0,5.9,0,37,.3,.5,gold),
 cube(0,1.1,13.15,15,.28,1.2,dark),
 cube(0,2.7,13.3,12,3.2,.34,glass),
 cube(-6.3,2.7,13.3,.32,3.6,.5,gold),
 cube(6.3,2.7,13.3,.32,3.6,.5,gold),
 cube(0,4.65,13.3,13,.24,.7,gold)
);
// Individual executive suites: compact, separated furniture layouts on one continuous floor.
for(const u of UNITS){
 const y=floorY(),x=u.x,z=u.z;
 const accent:[number,number,number]=u.color;
 if(u.id==="q"){
  // Private owner suite: reception facing the entrance, boardroom table and executive desk behind it.
  scene.push(
   cube(0,y+.31,0,10.8,.08,7.5,[.19,.23,.25]),
   cube(0,y+.48,2.35,6.6,.18,1.05,gold),
   cube(0,y+1.02,2.35,6.2,.9,.85,dark),
   cube(0,y+1.5,2.35,4.6,.12,.08,glass),
   cube(0,y+.42,-.05,4.4,.16,2.0,[.22,.26,.28]),
   cube(0,y+.78,-.05,4.0,.55,1.65,[.32,.36,.38]),
   cube(-2.55,y+.42,-.05,.16,.72,.16,gold),
   cube(2.55,y+.42,-.05,.16,.72,.16,gold),
   // Six boardroom chairs around the conference table.
   cube(-2.15,y+.42,-1.35,.72,.18,.72,dark),
   cube(-2.15,y+.92,-1.72,.72,.82,.16,[.28,.32,.34]),
   cube(0,y+.42,-1.35,.72,.18,.72,dark),
   cube(0,y+.92,-1.72,.72,.82,.16,[.28,.32,.34]),
   cube(2.15,y+.42,-1.35,.72,.18,.72,dark),
   cube(2.15,y+.92,-1.72,.72,.82,.16,[.28,.32,.34]),
   cube(-2.15,y+.42,1.25,.72,.18,.72,dark),
   cube(-2.15,y+.92,1.62,.72,.82,.16,[.28,.32,.34]),
   cube(0,y+.42,1.25,.72,.18,.72,dark),
   cube(0,y+.92,1.62,.72,.82,.16,[.28,.32,.34]),
   cube(2.15,y+.42,1.25,.72,.18,.72,dark),
   cube(2.15,y+.92,1.62,.72,.82,.16,[.28,.32,.34]),
   cube(0,y+.48,-2.45,3.8,.18,1.05,[.82,.16,.19]),
   cube(0,y+.98,-2.45,3.6,.82,.9,[.28,.32,.34]),
   cube(0,y+1.52,-2.45,1.9,1.18,.14,dark),
   cube(0,y+1.53,-2.45,1.7,.94,.08,glass),
   cube(-5.2,y+1.65,-2.9,.16,3.3,.22,gold),
   cube(5.2,y+1.65,-2.9,.16,3.3,.22,gold),
   cube(0,y+3.35,-2.9,10.4,.16,.22,accent)
  );
 }else{
  scene.push(
   cube(x,y+.31,z,10.4,.08,7.35,[.19,.23,.25]),
   cube(x,y+.48,z+1.0,3.6,.18,1.15,accent),
   cube(x,y+.98,z+1.0,3.4,.82,1.0,[.28,.32,.34]),
   cube(x,y+1.52,z+1.0,1.75,1.18,.14,dark),
   cube(x,y+1.53,z+1.0,1.55,.94,.08,glass),
   cube(x,y+.62,z+2.25,2.0,.16,.9,dark),
   cube(x,y+1.05,z+2.25,.9,.8,.7,[.2,.24,.27]),
   cube(x-3.6,y+1.05,z-1.65,1.5,1.15,.95,dark),
   cube(x-3.6,y+1.68,z-1.65,1.6,.12,1.05,accent),
   cube(x+3.35,y+.75,z-1.7,2.0,.8,.9,[.24,.28,.3]),
   cube(x+3.35,y+1.2,z-1.7,2.0,.12,.9,accent),
   cube(x,y+2.45,z-3.25,4.6,.18,.12,accent),
   cube(x-5.2,y+1.65,z+3.0,.16,3.3,.22,gold),
   cube(x+5.2,y+1.65,z+3.0,.16,3.3,.22,gold),
   cube(x,y+3.35,z+3.0,10.4,.16,.22,accent)
  );
 }
}
// Entrance forecourt is compact and directly connected to the single building.
scene.push(
 cube(0,-.05,17.6,22,.16,7,[.2,.24,.26]),
 cube(0,.05,17.6,12,.08,3,[.31,.36,.37]),
 cube(0,.11,17.6,4,.08,1.2,gold)
);
const AVATARS:Cube[]=[];
for(const u of UNITS){
 const x=u.x+1.1,z=u.z+1.0,y=floorY();
 const shirt:[number,number,number]=u.color;
 AVATARS.push(
  primitive("cylinder",x,y+1.05,z,.62,.92,.42,shirt),
  primitive("cylinder",x,y+1.62,z,.2,.2,.2,[.82,.72,.59]),
  primitive("sphere",x,y+1.94,z,.48,.5,.48,[.82,.72,.59]),
  primitive("cylinder",x-.43,y+1.08,z,.2,.78,.24,shirt),
  primitive("cylinder",x+.43,y+1.08,z,.2,.78,.24,shirt),
  primitive("sphere",x-.55,y+.72,z,.2,.2,.2,[.82,.72,.59]),
  primitive("sphere",x+.55,y+.72,z,.2,.2,.2,[.82,.72,.59]),
  primitive("cylinder",x-.17,y+.38,z,.24,.7,.28,dark),
  primitive("cylinder",x+.17,y+.38,z,.24,.7,.28,dark)
 );
}
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
function buildMesh(shape:"sphere"|"cylinder"|"cone"){
 const positions:number[]=[],normals:number[]=[];
 const segments=shape==="sphere"?20:24;
 if(shape==="sphere"){
  const rings=12;
  for(let r=0;r<rings;r++){const a0=-Math.PI/2+r*Math.PI/rings,a1=-Math.PI/2+(r+1)*Math.PI/rings;
   for(let i=0;i<segments;i++){const t0=i*2*Math.PI/segments,t1=(i+1)*2*Math.PI/segments;
    const point=(a:number,t:number)=>[Math.cos(a)*Math.cos(t),Math.sin(a),Math.cos(a)*Math.sin(t)];
    const p00=point(a0,t0),p01=point(a0,t1),p10=point(a1,t0),p11=point(a1,t1);
    for(const p of [p00,p10,p11,p00,p11,p01]){positions.push(...p);normals.push(...p);}
   }
  }
 }else{
  for(let i=0;i<segments;i++){
   const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
   const p0=[Math.cos(a),-.5,Math.sin(a)],p1=[Math.cos(b),-.5,Math.sin(b)];
   const top0=shape==="cone"?[0,.5,0] as number[]:[Math.cos(a),.5,Math.sin(a)];
   const top1=shape==="cone"?[0,.5,0] as number[]:[Math.cos(b),.5,Math.sin(b)];
   const normal=(x:number,z:number)=>{const l=Math.hypot(x,shape==="cone"?.5:0,z)||1;return [x/l,shape==="cone"?.5/l:0,z/l];};
   const n0=normal(Math.cos((a+b)/2),Math.sin((a+b)/2));
   for(const p of [p0,top0,top1,p0,top1,p1]){positions.push(...p);normals.push(...n0);}
   for(const [p,n] of [[ [0,.5,0],[0,1,0] ],[top1,[0,1,0]],[top0,[0,1,0]],[ [0,-.5,0],[0,-1,0] ],[p0,[0,-1,0]],[p1,[0,-1,0] ]] as [number[],number[]][]) {positions.push(...p);normals.push(...n);}
  }
 }
 return {positions,normals,count:positions.length/3};
}
function buildBeveledBox(){
 const positions:number[]=[],normals:number[]=[];
 const tri=(a:number[],b:number[],c:number[],n:number[])=>{for(const p of [a,b,c]){positions.push(...p);normals.push(...n);}};
 const quad=(a:number[],b:number[],c:number[],d:number[],n:number[])=>{tri(a,b,c,n);tri(a,c,d,n);};
 const f=.42;
 quad([-.5,-f,-f],[-.5,-f,f],[-.5,f,f],[-.5,f,-f],[-1,0,0]);
 quad([.5,-f,-f],[.5,f,-f],[.5,f,f],[.5,-f,f],[1,0,0]);
 quad([-f,.5,-f],[-f,.5,f],[f,.5,f],[f,.5,-f],[0,1,0]);
 quad([-f,-.5,-f],[f,-.5,-f],[f,-.5,f],[-f,-.5,f],[0,-1,0]);
 quad([-f,-f,.5],[f,-f,.5],[f,f,.5],[-f,f,.5],[0,0,1]);
 quad([-f,-f,-.5],[-f,f,-.5],[f,f,-.5],[f,-f,-.5],[0,0,-1]);
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const n=[sx/Math.SQRT2,sy/Math.SQRT2,0];
  quad([sx*.5,sy*f,-f],[sx*f,sy*.5,-f],[sx*f,sy*.5,f],[sx*.5,sy*f,f],n);
 }
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const n=[sx/Math.SQRT2,0,sz/Math.SQRT2];
  quad([sx*.5,-f,sz*f],[sx*f,-f,sz*.5],[sx*f,f,sz*.5],[sx*.5,f,sz*f],n);
 }
 for(const sy of [-1,1])for(const sz of [-1,1]){
  const n=[0,sy/Math.SQRT2,sz/Math.SQRT2];
  quad([-f,sy*.5,sz*f],[f,sy*.5,sz*f],[f,sy*f,sz*.5],[-f,sy*f,sz*.5],n);
 }
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const l=1/Math.sqrt(3),n=[sx*l,sy*l,sz*l];
  tri([sx*.5,sy*f,sz*f],[sx*f,sy*.5,sz*f],[sx*f,sy*f,sz*.5],n);
 }
 return {positions,normals,count:positions.length/3};
}
function buildFrustum(){
 const positions:number[]=[],normals:number[]=[];
 const bottom=.5,top=.37,y0=-.5,y1=.5;
 const tri=(a:number[],b:number[],c:number[],n:number[])=>{for(const p of [a,b,c]){positions.push(...p);normals.push(...n);}};
 const quad=(a:number[],b:number[],c:number[],d:number[],n:number[])=>{tri(a,b,c,n);tri(a,c,d,n);};
 // Four sloped faces with deliberate normals for clean directional lighting.
 const sides=[
  [[-bottom,y0,-bottom],[-top,y1,-top],[top,y1,-top],[bottom,y0,-bottom],[0,0,-1]],
  [[bottom,y0,-bottom],[top,y1,-top],[top,y1,top],[bottom,y0,bottom],[1,0,0]],
  [[bottom,y0,bottom],[top,y1,top],[-top,y1,top],[-bottom,y0,bottom],[0,0,1]],
  [[-bottom,y0,bottom],[-top,y1,top],[-top,y1,-top],[-bottom,y0,-bottom],[-1,0,0]]
 ] as [number[],number[],number[],number[],number[]][];
 for(const [a,b,c,d] of sides){
  const u=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const len=Math.hypot(...normal)||1;const corrected=normal.map(q=>q/len);
  quad(a,b,c,d,corrected);
 }
 quad([-top,y1,-top],[-top,y1,top],[top,y1,top],[top,y1,-top],[0,1,0]);
 quad([-bottom,y0,-bottom],[bottom,y0,-bottom],[bottom,y0,bottom],[-bottom,y0,bottom],[0,-1,0]);
 return {positions,normals,count:positions.length/3};
}
const GEOMETRY={cube:{positions:POS,normals:NOR,count:POS.length/3},sphere:buildMesh("sphere"),cylinder:buildMesh("cylinder"),cone:buildMesh("cone"),beveled:buildBeveledBox(),frustum:buildFrustum()};
function mul(a:number[],b:number[]){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function perspective(f:number,aspect:number,n:number,far:number){const t=1/Math.tan(f/2);return [t/aspect,0,0,0,0,t,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0];}
function lookAt(e:number[],c:number[]){const norm=(v:number[])=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};const sub=(a:number[],b:number[])=>a.map((x,i)=>x-b[i]);const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const z=norm(sub(e,c)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*e[i],0),-y.reduce((s,v,i)=>s+v*e[i],0),-z.reduce((s,v,i)=>s+v*e[i],0),1];}
const VS=`attribute vec3 p;attribute vec3 n;uniform mat4 mvp;varying vec3 normal;void main(){normal=n;gl_Position=mvp*vec4(p,1.0);}`;
const FS=`precision mediump float;uniform vec3 color;uniform float intensity;varying vec3 normal;void main(){vec3 n=normalize(normal);vec3 l=normalize(vec3(-.42,.88,.36));float diffuse=max(dot(n,l),0.0);float sky=.42+max(n.y,0.0)*.16;float spec=pow(max(dot(reflect(-l,n),normalize(vec3(.25,.72,.58))),0.0),22.0)*.12;float rim=pow(1.0-max(dot(n,normalize(vec3(.2,.7,.65))),0.0),3.0)*.055;vec3 lit=color*(sky+diffuse*.62)*intensity+vec3(spec+rim);lit=lit/(vec3(1.0)+lit*.12);gl_FragColor=vec4(pow(max(lit,vec3(0.0)),vec3(.92)),1.0);}`;
function shader(gl:WebGLRenderingContext,type:number,src:string){const s=gl.createShader(type);if(!s)throw Error("WebGL shader unavailable");gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||"Shader compile failed");return s;}
function translateScale(o:Cube){return [o.sx,0,0,0,0,o.sy,0,0,0,0,o.sz,0,o.x,o.y,o.z,1];}

export function QWorldView(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [mode,setMode]=useState<"isometric"|"third-person">("isometric");
 const [selected,setSelected]=useState("q");
 const [viewMode,setViewMode]=useState<"world"|"plan">("world");
 const [webgl,setWebgl]=useState(true);
 const [visuals,setVisuals]=useState<VisualSettings>(DEFAULT_VISUALS);
 const [directorOpen,setDirectorOpen]=useState(true);
 const position=useRef({x:0,z:9,yaw:0});
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
   const buffers=Object.fromEntries(Object.entries(GEOMETRY).map(([key,mesh])=>{const pb=gl!.createBuffer(),nb=gl!.createBuffer();if(!pb||!nb)throw Error("WebGL buffers unavailable");gl!.bindBuffer(gl!.ARRAY_BUFFER,pb);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(mesh.positions),gl!.STATIC_DRAW);gl!.bindBuffer(gl!.ARRAY_BUFFER,nb);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(mesh.normals),gl!.STATIC_DRAW);return [key,{pb,nb,count:mesh.count}];})) as Record<string,{pb:WebGLBuffer;nb:WebGLBuffer;count:number}>;
   const pLoc=gl.getAttribLocation(program,"p"),nLoc=gl.getAttribLocation(program,"n");gl.enableVertexAttribArray(pLoc);gl.enableVertexAttribArray(nLoc);
   const mvp=gl.getUniformLocation(program,"mvp"),color=gl.getUniformLocation(program,"color"),intensity=gl.getUniformLocation(program,"intensity");
   gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.035,.05,.065,1);
   const resize=()=>{const rect=el.getBoundingClientRect(),quality=visualsRef.current.quality,dpr=Math.min(window.devicePixelRatio||1,quality==="high"?1.5:quality==="balanced"?1.25:1),w=Math.max(1,Math.floor(rect.width*dpr)),h=Math.max(1,Math.floor(rect.height*dpr));if(el.width!==w||el.height!==h){el.width=w;el.height=h;gl!.viewport(0,0,w,h);}};
   const keys=new Set<string>();const down=(e:KeyboardEvent)=>{if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());if(mode==="third-person")e.preventDefault();}};const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
   window.addEventListener("keydown",down);window.addEventListener("keyup",up);
   const render=()=>{if(disposed)return;resize();if(!document.hidden){
    if(mode==="third-person"){const step=.18,p=position.current;if(keys.has("a")||keys.has("arrowleft"))p.yaw+=.035;if(keys.has("d")||keys.has("arrowright"))p.yaw-=.035;if(keys.has("w")||keys.has("arrowup")){p.x+=Math.sin(p.yaw)*step;p.z-=Math.cos(p.yaw)*step;}if(keys.has("s")||keys.has("arrowdown")){p.x-=Math.sin(p.yaw)*step;p.z+=Math.cos(p.yaw)*step;}p.x=Math.max(-16,Math.min(16,p.x));p.z=Math.max(-10,Math.min(21,p.z));}
    const v=visualsRef.current,sky=v.environment==="daylight"?[.28,.39,.47]:v.environment==="sunset"?[.12,.055,.07]:[.035,.05,.065];gl!.clearColor(sky[0],sky[1],sky[2],1);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);
    const eye=mode==="isometric"?[Math.sin(v.orbit*Math.PI/180)*84/v.zoom,52/v.zoom,Math.cos(v.orbit*Math.PI/180)*84/v.zoom] :[position.current.x-Math.sin(position.current.yaw)*7,floorY()+4.2,position.current.z+Math.cos(position.current.yaw)*7];
    const target=mode==="isometric"?[0,0,0] :[position.current.x,floorY()+1.45,position.current.z];
    const proj=perspective((mode==="isometric"?.78:1.02)/v.zoom,el.width/Math.max(1,el.height),.1,220),view=lookAt(eye,target),vp=mul(proj,view);
    gl!.uniform1f(intensity,v.brightness);
    for(const o of OBJECTS){let rgb=[...o.color];if(v.palette==="monochrome"){const l=rgb[0]*.3+rgb[1]*.59+rgb[2]*.11;rgb=[l*.78,l*.84,l*.9];}else if(v.palette==="vibrant"){const l=(rgb[0]+rgb[1]+rgb[2])/3;rgb=rgb.map(ch=>Math.max(0,Math.min(1,l+(ch-l)*1.45)));}const mesh=buffers[o.shape??"cube"];gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.pb);gl!.vertexAttribPointer(pLoc,3,gl!.FLOAT,false,0,0);gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.nb);gl!.vertexAttribPointer(nLoc,3,gl!.FLOAT,false,0,0);gl!.uniformMatrix4fv(mvp,false,new Float32Array(mul(vp,translateScale(o))));gl!.uniform3fv(color,new Float32Array(rgb));gl!.drawArrays(gl!.TRIANGLES,0,mesh.count);}
    if(mode==="third-person"){const pos=position.current,parts=[primitive("cylinder",pos.x,1.35,pos.z,.78,1.05,.46,[.82,.16,.19]),primitive("cylinder",pos.x,1.92,pos.z,.22,.22,.22,[.82,.72,.59]),primitive("sphere",pos.x,2.18,pos.z,.58,.58,.58,[.82,.72,.59]),primitive("cylinder",pos.x-.52,1.38,pos.z,.25,.92,.3,[.82,.16,.19]),primitive("cylinder",pos.x+.52,1.38,pos.z,.25,.92,.3,[.82,.16,.19]),primitive("sphere",pos.x-.68,.92,pos.z,.24,.24,.24,[.82,.72,.59]),primitive("sphere",pos.x+.68,.92,pos.z,.24,.24,.24,[.82,.72,.59]),primitive("cylinder",pos.x-.22,.48,pos.z,.3,.88,.34,dark),primitive("cylinder",pos.x+.22,.48,pos.z,.3,.88,.34,dark)];for(const o of parts){const mesh=buffers[o.shape??"cube"];gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.pb);gl!.vertexAttribPointer(pLoc,3,gl!.FLOAT,false,0,0);gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.nb);gl!.vertexAttribPointer(nLoc,3,gl!.FLOAT,false,0,0);gl!.uniformMatrix4fv(mvp,false,new Float32Array(mul(vp,translateScale(o))));gl!.uniform3fv(color,new Float32Array(o.color));gl!.drawArrays(gl!.TRIANGLES,0,mesh.count);}}
   }raf=window.requestAnimationFrame(render);};
   const observer=new ResizeObserver(resize);observer.observe(el);raf=window.requestAnimationFrame(render);
   return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  }catch{setWebgl(false);}
 },[mode]);
 const active=UNITS.find(u=>u.id===selected)??UNITS[0];
 useEffect(()=>{position.current.x=active.x;position.current.z=active.z+0.8;},[active]);
 const move=(dx:number,dz:number)=>{const p=position.current;p.x=Math.max(-16,Math.min(16,p.x+dx));p.z=Math.max(-10,Math.min(21,p.z+dz));};
 return <main className="qw-shell">
  <header className="qw-header"><div><span className="qw-kicker">Q COMPANY · HEADQUARTERS SIMULATOR</span><h1>Q WORLD</h1><p>One company. Connected businesses. One objective: profitable growth.</p></div><div className="qw-live"><i/> HQ FOUNDATION · READ ONLY</div></header>
  <div className="qw-toolbar"><div className="qw-mode" role="group" aria-label="Camera mode"><button type="button" aria-pressed={mode==="isometric"} onClick={()=>setMode("isometric")}>Isometric management</button><button type="button" aria-pressed={mode==="third-person"} onClick={()=>setMode("third-person")}>Walk inside HQ</button></div><span className="qw-hint">{mode==="isometric"?"Headquarters overview · choose an office below": "Walk the selected office with W A S D or arrow keys"}</span><div className="qw-mode" role="group" aria-label="Headquarters view"><button type="button" aria-pressed={viewMode==="world"} onClick={()=>setViewMode("world")}>3D HQ</button><button type="button" aria-pressed={viewMode==="plan"} onClick={()=>setViewMode("plan")}>Space plan</button></div></div>
  {viewMode==="plan" ? <QWorldSpacePlan/> : <> 
  <div className="qw-layout">
   <section className="qw-stage" aria-label="Interactive three-dimensional Q headquarters">
    {webgl?<canvas ref={canvas} aria-label="Three-dimensional Q headquarters with one floor and business-unit offices"/>:<div className="qw-fallback"><b>3D graphics are unavailable on this device.</b><p>The headquarters office directory remains available below.</p></div>}
    {visuals.labels&&<div className="qw-overlay"><b>Q HEADQUARTERS</b><span>ONE EXECUTIVE HQ · EIGHT BUSINESS UNITS</span></div>}
    {mode==="third-person"&&<div className="qw-pad" aria-label="Walk controls"><button type="button" onClick={()=>move(0,-2)} aria-label="Move forward">↑</button><div><button type="button" onClick={()=>move(-2,0)} aria-label="Move left">←</button><button type="button" onClick={()=>move(2,0)} aria-label="Move right">→</button></div><button type="button" onClick={()=>move(0,2)} aria-label="Move backward">↓</button></div>}
   </section>
   <aside className="qw-inspector" aria-label="Selected business unit"><span className="qw-kicker">SELECTED OFFICE</span><h2>{active.name}</h2><div className="qw-floor-tag">SINGLE-LEVEL EXECUTIVE SUITE</div><p>{active.role}</p><div className="qw-dept">{active.department}</div><p className="qw-mission">{active.mission}</p><small>Live financial KPIs: not connected in this foundation PR.</small><a href="/office">Open existing Office</a></aside>
  </div>
  <section className="qw-director" aria-labelledby="qw-director-title">
   <div className="qw-director-head"><div><span className="qw-kicker">OWNER CONTROL PANEL</span><h2 id="qw-director-title">Visual Director</h2><p>Change the look and presentation of the Q executive headquarters.</p></div><button type="button" aria-expanded={directorOpen} onClick={()=>setDirectorOpen(v=>!v)}>{directorOpen?"Hide controls":"Show controls"}</button></div>
   {directorOpen&&<div className="qw-control-grid">
    <label>Environment<select value={visuals.environment} onChange={e=>updateVisuals({environment:e.target.value as VisualSettings["environment"]})}><option value="executive">Executive night</option><option value="daylight">Daylight</option><option value="sunset">Sunset</option></select></label>
    <label>Building colour style<select value={visuals.palette} onChange={e=>updateVisuals({palette:e.target.value as VisualSettings["palette"]})}><option value="brand">Brand colours</option><option value="vibrant">Vibrant</option><option value="monochrome">Monochrome</option></select></label>
    <label>Graphics quality<select value={visuals.quality} onChange={e=>updateVisuals({quality:e.target.value as VisualSettings["quality"]})}><option value="performance">Performance · 1×</option><option value="balanced">Balanced · 1.25×</option><option value="high">High · 1.5×</option></select></label>
    <label className="qw-range">Lighting <b>{Math.round(visuals.brightness*100)}%</b><input type="range" min=".55" max="1.45" step=".05" value={visuals.brightness} onChange={e=>updateVisuals({brightness:Number(e.target.value)})}/></label>
    <label className="qw-range">Camera zoom <b>{Math.round(visuals.zoom*100)}%</b><input type="range" min=".65" max="1.45" step=".05" value={visuals.zoom} onChange={e=>updateVisuals({zoom:Number(e.target.value)})}/></label>
    <label className="qw-range">Isometric camera angle <b>{Math.round(visuals.orbit)}°</b><input type="range" min="0" max="360" step="5" value={visuals.orbit} onChange={e=>updateVisuals({orbit:Number(e.target.value)})}/></label>
    <label className="qw-toggle"><input type="checkbox" checked={visuals.labels} onChange={e=>updateVisuals({labels:e.target.checked})}/> Show headquarters labels</label>
    <button type="button" className="qw-reset" onClick={()=>setVisuals(DEFAULT_VISUALS)}>Reset visual settings</button>
   </div>}
   <p className="qw-simulation-note">Visual settings are saved in this browser on this device. They do not change live business data.</p>
  </section>
  <section className="qw-units" aria-labelledby="qw-units-title"><div><span className="qw-kicker">HQ OFFICE DIRECTORY</span><h2 id="qw-units-title">Choose an office</h2></div><div className="qw-unit-grid">{UNITS.map(u=><button key={u.id} type="button" className={selected===u.id?"active":""} onClick={()=>setSelected(u.id)} aria-pressed={selected===u.id}><span style={{background:`rgb(${u.color.map(v=>Math.round(v*255)).join(",")})`}}/><b>{u.name}</b><small>{u.department} · Executive suite</small></button>)}</div><p className="qw-simulation-note">One headquarters · one executive floor · nine dedicated offices. No live tasks, revenue or costs are changed. Real KPIs will only appear after verified data connections.</p></section>
  </>}
 </main>;
}
