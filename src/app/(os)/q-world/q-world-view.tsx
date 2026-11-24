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
type Cube={x:number;y:number;z:number;sx:number;sy:number;sz:number;color:[number,number,number];shape?:"cube"|"sphere"|"cylinder"|"cone"|"beveled"};
type VisualSettings={environment:"executive"|"daylight"|"sunset";palette:"brand"|"monochrome"|"vibrant";brightness:number;zoom:number;orbit:number;quality:"performance"|"balanced"|"high";labels:boolean};
const DEFAULT_VISUALS:VisualSettings={environment:"executive",palette:"brand",brightness:1,zoom:1,orbit:42,quality:"balanced",labels:true};
const cube=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:[number,number,number]):Cube=>({x,y,z,sx,sy,sz,color,shape:"cube"});
const primitive=(shape:Exclude<Cube["shape"],"cube">,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:[number,number,number]):Cube=>({x,y,z,sx,sy,sz,color,shape});
const scene:Cube[]=[];
const ground:[number,number,number]=[.12,.16,.17], road:[number,number,number]=[.19,.23,.25], glass:[number,number,number]=[.28,.49,.56], dark:[number,number,number]=[.055,.075,.09], leaf:[number,number,number]=[.13,.31,.22], gold:[number,number,number]=[.62,.43,.22];
scene.push(cube(0,-.7,0,110,1,88,ground),cube(0,-.1,0,7,.12,86,road),cube(0,-.08,0,104,.12,6,road));
for(let x=-48;x<=48;x+=12){scene.push(cube(x,-.03,0,.25,.05,86,[.2,.27,.27]));}
for(let z=-38;z<=38;z+=12){scene.push(cube(0,-.02,z,104,.05,.25,[.2,.27,.27]));}
function building(x:number,z:number,w:number,d:number,h:number,c:[number,number,number]){
 const trim:[number,number,number]=[.32,.38,.4],stone:[number,number,number]=[.23,.27,.29],glow:[number,number,number]=[.72,.53,.29];
 const floors=Math.max(2,Math.floor(h/2.25));
 // Architectural plinth, layered facade and floating roof line.
 scene.push(
  primitive("sphere",x,-.145,z,w+4,.08,d+4,[.035,.045,.052]),
  primitive("beveled",x,.18,z,w+1.7,.36,d+1.7,stone),
  cube(x,.43,z,w+.8,.14,d+.8,trim),
  primitive("beveled",x,h/2,z,w,h,d,c),
  primitive("beveled",x,h+.12,z,w+.75,.24,d+.75,dark),
  cube(x,h+.28,z,w+.25,.1,d+.25,trim),
  cube(x,h*.52,z-d/2-.08,w*.82,h*.55,.12,glass),
  cube(x,h*.52,z+d/2+.08,w*.82,h*.55,.12,glass),
  cube(x-w/2-.08,h*.52,z,.12,h*.55,d*.72,glass),
  cube(x+w/2+.08,h*.52,z,.12,h*.55,d*.72,glass),
  cube(x,h+.38,z,w*.34,.12,.38,glow),
  cube(x,h+.8,z,w*.2,.72,d*.2,stone),
  cube(x,h+1.2,z,w*.12,.08,d*.12,glow)
 );
 // Recessed floor bands and window bays on all four elevations.
 for(let floor=1;floor<=floors;floor++){
  const yy=Math.min(h-.65,floor*2.05);
  scene.push(cube(x,yy,z-d/2-.18,w*.86,.09,.1,trim),cube(x,yy,z+d/2+.18,w*.86,.09,.1,trim));
  scene.push(cube(x-w/2-.18,yy,z,.1,.09,d*.76,trim),cube(x+w/2+.18,yy,z,.1,.09,d*.76,trim));
  for(let xx=-w/2+1.05;xx<w/2-.7;xx+=2.05){
   scene.push(cube(x+xx,yy-.72,z-d/2-.17,.11,1.22,.1,trim),cube(x+xx,yy-.72,z+d/2+.17,.11,1.22,.1,trim));
  }
  for(let zz=-d/2+1;zz<d/2-.6;zz+=1.8){
   scene.push(cube(x-w/2-.17,yy-.72,z+zz,.1,1.22,.1,trim),cube(x+w/2+.17,yy-.72,z+zz,.1,1.22,.1,trim));
  }
 }
 // Distinctive entrance, canopy, illuminated portal and approach steps.
 scene.push(
  cube(x,h*.34,z-d/2-.28,w*.34,h*.64,.12,dark),
  cube(x,h*.34,z-d/2-.38,w*.27,h*.56,.08,glass),
  cube(x,h*.76,z-d/2-.72,w*.55,.16,1.05,trim),
  cube(x-w*.29,h*.34,z-d/2-.7,.18,h*.72,.2,glow),
  cube(x+w*.29,h*.34,z-d/2-.7,.18,h*.72,.2,glow),
  cube(x,h*.08,z-d/2-1.15,w*.58,.16,1.15,stone),
  cube(x,h*.035,z-d/2-1.65,w*.72,.12,.72,trim),
  cube(x,h+.55,z-d/2-.2,w*.42,.3,.12,glow)
 );
 // Corner fins create depth and a recognisable premium facade.
 for(const side of [-1,1]){
  scene.push(cube(x+side*(w/2+.13),h*.52,z-d/2-.24,.18,h*.92,.22,trim));
  scene.push(cube(x+side*(w/2+.13),h*.52,z+d/2+.24,.18,h*.92,.22,trim));
 }
 // Sculpted entrance columns and illuminated canopy supports.
 for(const side of [-1,1]){
  scene.push(primitive("cylinder",x+side*w*.34,h*.35,z-d/2-.82,.28,h*.7,.28,trim));
  scene.push(primitive("cylinder",x+side*w*.34,h*.35,z-d/2-.82,.13,h*.68,.13,glow));
  scene.push(primitive("sphere",x+side*w*.34,h*.72,z-d/2-.82,.38,.24,.38,glow));
 }
 // Rooftop mechanical housings and a raised architectural crown.
 scene.push(
  cube(x-w*.28,h+.72,z+d*.18,w*.18,.65,d*.22,stone),
  cube(x+w*.28,h+.72,z+d*.18,w*.18,.65,d*.22,stone),
  cube(x-w*.28,h+1.08,z+d*.18,w*.2,.08,d*.24,trim),
  cube(x+w*.28,h+1.08,z+d*.18,w*.2,.08,d*.24,trim),
  primitive("cylinder",x,h+.95,z,.18,.55,.18,glow),
  primitive("sphere",x,h+1.28,z,.34,.34,.34,glow)
 );
 // Low illuminated bollards define the public entrance without blocking movement.
 for(const side of [-1,1]){
  scene.push(primitive("cylinder",x+side*w*.43,.48,z-d/2-2.15,.16,.9,.16,trim),primitive("sphere",x+side*w*.43,.98,z-d/2-2.15,.28,.22,.28,glow));
 }
}
building(0,0,20,17,13,[.16,.2,.24]);
for(const u of UNITS.slice(1)){building(u.x,u.z,10,8,7,u.color);}
// A formal arrival sequence, central executive plaza and district wayfinding.
scene.push(
 cube(0,-.02,-12,24,.08,5,[.24,.28,.3]),
 cube(0,.035,-12,16,.06,2,[.34,.38,.39]),
 cube(0,.08,-12,7,.08,1.2,gold),
 cube(0,.12,10,17,.12,10,[.2,.25,.27]),
 cube(0,.2,10,10,.08,6,[.27,.31,.32]),
 cube(0,.26,10,3,.08,3,[.66,.48,.27]),
 cube(0,1.5,-43,24,3,.6,[.12,.17,.2]),
 cube(-12,1.5,-43,.6,3,1.4,[.68,.5,.28]),
 cube(12,1.5,-43,.6,3,1.4,[.68,.5,.28]),
 cube(0,3.1,-43,24,.16,1.8,[.22,.28,.31]),
 cube(0,2.4,-42.2,8,.7,.08,[.72,.57,.35])
);
// Landscaped courtyards: layered planter beds, benches and water basins.
for(const [x,z] of [[-12,-12],[12,-12],[-12,12],[12,12],[-33,-10],[33,10]] as number[][]){
 scene.push(
  cube(x,.12,z,5.2,.24,4.2,[.25,.3,.27]),
  cube(x,.27,z,4.7,.12,3.7,[.15,.28,.2]),
  cube(x,.38,z,3.9,.1,2.9,[.12,.34,.23]),
  cube(x,.46,z,1.4,.06,1.4,[.28,.43,.34])
 );
}
// Walkway pavers, kerb edges and subtle road markings improve scale and orientation.
for(const side of [-1,1]){
 scene.push(cube(side*5.35,.015,0,.42,.12,84,[.29,.32,.32]),cube(0,.015,side*5.35,102,.12,.42,[.29,.32,.32]));
}
for(let z=-39;z<=39;z+=7){scene.push(cube(0,.045,z,.28,.035,2.4,[.74,.65,.48]));}
for(let x=-45;x<=45;x+=7){scene.push(cube(x,.045,0,2.4,.035,.28,[.74,.65,.48]));}
for(let x=-8;x<=8;x+=2){
 for(let z=-15;z<=-9;z+=2){scene.push(cube(x,.085,z,1.7,.05,1.7,[.25,.29,.3]));}
}
// Parking and service bays are deliberately placed at the campus perimeter.
for(let i=0;i<8;i++){
 const x=-35+i*4.2;
 scene.push(cube(x,.035,37,3.2,.06,7,[.16,.2,.22]),cube(x,.07,33.5,2.8,.035,.12,[.7,.61,.43]));
}
// Pedestrian light bollards around the main paths.
for(let x=-42;x<=42;x+=14){
 for(const z of [-29,29]){
  scene.push(primitive("cylinder",x,.8,z,.14,1.6,.14,[.23,.28,.3]),primitive("sphere",x,1.68,z,.42,.28,.42,[.76,.62,.38]));
 }
}
for(let x=-45;x<=45;x+=9){for(let z=-34;z<=34;z+=11){if(Math.abs(x)<7&&Math.abs(z)<9)continue;scene.push(primitive("sphere",x,-.145,z,3.2,.07,2.8,[.035,.045,.052]),primitive("cylinder",x,.9,z,.34,1.8,.34,[.31,.25,.18]),primitive("cone",x,2.25,z,2.5,2.9,2.5,leaf),primitive("cone",x,3.05,z,1.8,2.1,1.8,[.16,.39,.26]));}}
for(let x=-45;x<=45;x+=6){scene.push(cube(x,.015,-43,3,.03,.18,gold),cube(x,.015,43,3,.03,.18,gold));}
const AVATARS:Cube[]=[];
for(const u of UNITS){const x=u.x+7,z=u.z+6;AVATARS.push(primitive("cylinder",x,1.35,z,.78,1.05,.46,u.color),primitive("cylinder",x,1.92,z,.22,.22,.22,[.82,.72,.59]),primitive("sphere",x,2.18,z,.58,.58,.58,[.82,.72,.59]),primitive("cylinder",x-.52,1.38,z,.25,.92,.3,u.color),primitive("cylinder",x+.52,1.38,z,.25,.92,.3,u.color),primitive("sphere",x-.68,.92,z,.24,.24,.24,[.82,.72,.59]),primitive("sphere",x+.68,.92,z,.24,.24,.24,[.82,.72,.59]),primitive("cylinder",x-.22,.48,z,.3,.88,.34,dark),primitive("cylinder",x+.22,.48,z,.3,.88,.34,dark));}
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
const GEOMETRY={cube:{positions:POS,normals:NOR,count:POS.length/3},sphere:buildMesh("sphere"),cylinder:buildMesh("cylinder"),cone:buildMesh("cone"),beveled:buildBeveledBox()};
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
   const buffers=Object.fromEntries(Object.entries(GEOMETRY).map(([key,mesh])=>{const pb=gl!.createBuffer(),nb=gl!.createBuffer();if(!pb||!nb)throw Error("WebGL buffers unavailable");gl!.bindBuffer(gl!.ARRAY_BUFFER,pb);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(mesh.positions),gl!.STATIC_DRAW);gl!.bindBuffer(gl!.ARRAY_BUFFER,nb);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(mesh.normals),gl!.STATIC_DRAW);return [key,{pb,nb,count:mesh.count}];})) as Record<string,{pb:WebGLBuffer;nb:WebGLBuffer;count:number}>;
   const pLoc=gl.getAttribLocation(program,"p"),nLoc=gl.getAttribLocation(program,"n");gl.enableVertexAttribArray(pLoc);gl.enableVertexAttribArray(nLoc);
   const mvp=gl.getUniformLocation(program,"mvp"),color=gl.getUniformLocation(program,"color"),intensity=gl.getUniformLocation(program,"intensity");
   gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.035,.05,.065,1);
   const resize=()=>{const rect=el.getBoundingClientRect(),quality=visualsRef.current.quality,dpr=Math.min(window.devicePixelRatio||1,quality==="high"?1.5:quality==="balanced"?1.25:1),w=Math.max(1,Math.floor(rect.width*dpr)),h=Math.max(1,Math.floor(rect.height*dpr));if(el.width!==w||el.height!==h){el.width=w;el.height=h;gl!.viewport(0,0,w,h);}};
   const keys=new Set<string>();const down=(e:KeyboardEvent)=>{if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());if(mode==="third-person")e.preventDefault();}};const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
   window.addEventListener("keydown",down);window.addEventListener("keyup",up);
   const render=()=>{if(disposed)return;resize();if(!document.hidden){
    if(mode==="third-person"){const step=.18,p=position.current;if(keys.has("a")||keys.has("arrowleft"))p.yaw+=.035;if(keys.has("d")||keys.has("arrowright"))p.yaw-=.035;if(keys.has("w")||keys.has("arrowup")){p.x+=Math.sin(p.yaw)*step;p.z-=Math.cos(p.yaw)*step;}if(keys.has("s")||keys.has("arrowdown")){p.x-=Math.sin(p.yaw)*step;p.z+=Math.cos(p.yaw)*step;}p.x=Math.max(-48,Math.min(48,p.x));p.z=Math.max(-38,Math.min(38,p.z));}
    const v=visualsRef.current,sky=v.environment==="daylight"?[.28,.39,.47]:v.environment==="sunset"?[.12,.055,.07]:[.035,.05,.065];gl!.clearColor(sky[0],sky[1],sky[2],1);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);
    const eye=mode==="isometric"?[Math.sin(v.orbit*Math.PI/180)*84/v.zoom,52/v.zoom,Math.cos(v.orbit*Math.PI/180)*84/v.zoom] :[position.current.x-Math.sin(position.current.yaw)*7,4.2,position.current.z+Math.cos(position.current.yaw)*7];
    const target=mode==="isometric"?[0,0,0] :[position.current.x,1.45,position.current.z];
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
 const move=(dx:number,dz:number)=>{const p=position.current;p.x=Math.max(-48,Math.min(48,p.x+dx));p.z=Math.max(-38,Math.min(38,p.z+dz));};
 return <main className="qw-shell">
  <header className="qw-header"><div><span className="qw-kicker">Q COMPANY · CAMPUS SIMULATOR</span><h1>Q WORLD</h1><p>One company. Connected businesses. One objective: profitable growth.</p></div><div className="qw-live"><i/> WORLD FOUNDATION · READ ONLY</div></header>
  <div className="qw-toolbar"><div className="qw-mode" role="group" aria-label="Camera mode"><button type="button" aria-pressed={mode==="isometric"} onClick={()=>setMode("isometric")}>Isometric management</button><button type="button" aria-pressed={mode==="third-person"} onClick={()=>setMode("third-person")}>Third-person walk</button></div><span className="qw-hint">{mode==="isometric"?"Campus overview · select a unit below": "Walk with W A S D or arrow keys · select a unit below"}</span></div>
  <div className="qw-layout">
   <section className="qw-stage" aria-label="Interactive three-dimensional campus">
    {webgl?<canvas ref={canvas} aria-label="Three-dimensional Q company campus, with headquarters and business-unit buildings"/>:<div className="qw-fallback"><b>3D graphics are unavailable on this device.</b><p>The business campus remains accessible in the unit directory.</p></div>}
    {visuals.labels&&<div className="qw-overlay"><b>Q HEADQUARTERS</b><span>ANGOLA · GLOBAL DIGITAL BUSINESS CAMPUS</span></div>}
    {mode==="third-person"&&<div className="qw-pad" aria-label="Walk controls"><button type="button" onClick={()=>move(0,-2)} aria-label="Move forward">↑</button><div><button type="button" onClick={()=>move(-2,0)} aria-label="Move left">←</button><button type="button" onClick={()=>move(2,0)} aria-label="Move right">→</button></div><button type="button" onClick={()=>move(0,2)} aria-label="Move backward">↓</button></div>}
   </section>
   <aside className="qw-inspector" aria-label="Selected business unit"><span className="qw-kicker">SELECTED BUSINESS UNIT</span><h2>{active.name}</h2><p>{active.role}</p><div className="qw-dept">{active.department}</div><p className="qw-mission">{active.mission}</p><small>Live financial KPIs: not connected in this foundation PR.</small><a href="/office">Open existing Office</a></aside>
  </div>
  <section className="qw-director" aria-labelledby="qw-director-title">
   <div className="qw-director-head"><div><span className="qw-kicker">OWNER CONTROL PANEL</span><h2 id="qw-director-title">Visual Director</h2><p>Change the look and presentation of your company campus.</p></div><button type="button" aria-expanded={directorOpen} onClick={()=>setDirectorOpen(v=>!v)}>{directorOpen?"Hide controls":"Show controls"}</button></div>
   {directorOpen&&<div className="qw-control-grid">
    <label>Environment<select value={visuals.environment} onChange={e=>updateVisuals({environment:e.target.value as VisualSettings["environment"]})}><option value="executive">Executive night</option><option value="daylight">Daylight</option><option value="sunset">Sunset</option></select></label>
    <label>Building colour style<select value={visuals.palette} onChange={e=>updateVisuals({palette:e.target.value as VisualSettings["palette"]})}><option value="brand">Brand colours</option><option value="vibrant">Vibrant</option><option value="monochrome">Monochrome</option></select></label>
    <label>Graphics quality<select value={visuals.quality} onChange={e=>updateVisuals({quality:e.target.value as VisualSettings["quality"]})}><option value="performance">Performance · 1×</option><option value="balanced">Balanced · 1.25×</option><option value="high">High · 1.5×</option></select></label>
    <label className="qw-range">Lighting <b>{Math.round(visuals.brightness*100)}%</b><input type="range" min=".55" max="1.45" step=".05" value={visuals.brightness} onChange={e=>updateVisuals({brightness:Number(e.target.value)})}/></label>
    <label className="qw-range">Camera zoom <b>{Math.round(visuals.zoom*100)}%</b><input type="range" min=".65" max="1.45" step=".05" value={visuals.zoom} onChange={e=>updateVisuals({zoom:Number(e.target.value)})}/></label>
    <label className="qw-range">Isometric camera angle <b>{Math.round(visuals.orbit)}°</b><input type="range" min="0" max="360" step="5" value={visuals.orbit} onChange={e=>updateVisuals({orbit:Number(e.target.value)})}/></label>
    <label className="qw-toggle"><input type="checkbox" checked={visuals.labels} onChange={e=>updateVisuals({labels:e.target.checked})}/> Show campus labels</label>
    <button type="button" className="qw-reset" onClick={()=>setVisuals(DEFAULT_VISUALS)}>Reset visual settings</button>
   </div>}
   <p className="qw-simulation-note">Visual settings are saved in this browser on this device. They do not change live business data.</p>
  </section>
  <section className="qw-units" aria-labelledby="qw-units-title"><div><span className="qw-kicker">THE COMPANY</span><h2 id="qw-units-title">Business units</h2></div><div className="qw-unit-grid">{UNITS.map(u=><button key={u.id} type="button" className={selected===u.id?"active":""} onClick={()=>setSelected(u.id)} aria-pressed={selected===u.id}><span style={{background:`rgb(${u.color.map(v=>Math.round(v*255)).join(",")})`}}/><b>{u.name}</b><small>{u.department}</small></button>)}</div><p className="qw-simulation-note">Illustrative campus layout · no live tasks, revenue or costs are changed. Real KPIs will only appear after verified data connections.</p></section>
 </main>;
}
