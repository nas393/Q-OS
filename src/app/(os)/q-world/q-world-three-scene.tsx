"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const -- temporary for first preview; tighten types later */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type Unit = { id: string; name: string; department: string; color: [number, number, number]; x: number; z: number };
type Visuals = { environment: "executive" | "daylight" | "sunset"; palette: "brand" | "monochrome" | "vibrant"; brightness: number; zoom: number; orbit: number; quality: "performance" | "balanced" | "high"; labels: boolean };
type Props = { mode: "isometric" | "third-person"; selected: string; visuals: Visuals; walkAngle: number; onWalkAngleChange: (angle: number) => void };

const units: Unit[] = [
 {id:"q",name:"Q EXECUTIVE OFFICE",department:"Executive",color:[.82,.16,.19],x:0,z:0},
 {id:"novae",name:"NOVAÉ",department:"Commercial & Growth",color:[.79,.58,.26],x:-11,z:8},
 {id:"certigo",name:"CERTIGO",department:"Education",color:[.18,.52,.88],x:11,z:8},
 {id:"ali-quest",name:"ALI-QUEST / CISA QUEST",department:"Education",color:[.22,.65,.78],x:0,z:8},
 {id:"lumeris",name:"LUMERIS",department:"Media & Community",color:[.82,.19,.22],x:-11,z:0},
 {id:"radio",name:"RADIO CEDARS",department:"Media & Community",color:[.54,.38,.78],x:11,z:0},
 {id:"lep",name:"LUANDA EDGE PULSE",department:"Intelligence",color:[.2,.68,.57],x:-11,z:-8},
 {id:"dalil",name:"DALIL AL-BAZOURIEH",department:"Directory & Network",color:[.76,.62,.4],x:0,z:-8},
 {id:"xauusd",name:"XAU/USD TRADING HQ",department:"Trading & Investment",color:[.22,.68,.38],x:11,z:-8}
];

export default function QWorldThreeScene({mode,selected,visuals,walkAngle,onWalkAngleChange}:Props) {
 const [webglUnavailable,setWebglUnavailable]=useState(false);
 const host=useRef<HTMLDivElement>(null);
 const api=useRef<{setMode:(m:string)=>void;setOrbit:(n:number)=>void;setWalkAngle:(n:number)=>void;setSelected:(id:string)=>void;setVisuals:(v:Visuals)=>void;move:(dx:number,dz:number)=>void}|null>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  let renderer:any,controls:any,frame=0,observer:any,disposed=false;
  const scene=new THREE.Scene();
  const worldBg=visuals.environment==="daylight"?0x9aaeb9:visuals.environment==="sunset"?0x33262a:0x111923;
  scene.background=new THREE.Color(worldBg);scene.fog=new THREE.Fog(worldBg,65,115);
  const camera=new THREE.PerspectiveCamera(39,1,.1,180);
  camera.position.set(43,31,48);
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
  }catch{
   setWebglUnavailable(true);
   return;
  }
  const onContextLost=(event:Event)=>{event.preventDefault();setWebglUnavailable(true);};
  renderer.domElement.addEventListener("webglcontextlost",onContextLost);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,visuals.quality==="high"?1.5:visuals.quality==="balanced"?1.25:1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.setSize(root.clientWidth,root.clientHeight);renderer.domElement.className="qw-three-canvas";renderer.domElement.setAttribute("aria-label","Interactive Three.js model of Q executive headquarters");root.appendChild(renderer.domElement);
  const pmrem=new THREE.PMREMGenerator(renderer);
  const envScene=new RoomEnvironment();scene.environment=pmrem.fromScene(envScene,.04).texture;envScene.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdce8f1,0x262b31,visuals.brightness*1.45));
  const key=new THREE.DirectionalLight(0xffe4c0,visuals.brightness*3.4);key.position.set(-24,36,22);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-32;key.shadow.camera.right=32;key.shadow.camera.top=32;key.shadow.camera.bottom=-32;key.shadow.bias=-.00018;key.shadow.normalBias=.025;scene.add(key);
  const fill=new THREE.DirectionalLight(0x9fc7e8,visuals.brightness*1.1);fill.position.set(26,18,-20);scene.add(fill);
  const warm=new THREE.PointLight(0xffbd72,visuals.brightness*80,38,2);warm.position.set(0,7,11);scene.add(warm);
  const mat=(color:number,rough=.62,metal=0,extra:any={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});m.userData.baseColor=m.color.clone();return m;};
  const stone=mat(0x777b7b,.86),floor=mat(0x555c60,.36,.18),dark=mat(0x171e25,.35,.32),wall=mat(0x39434a,.48,.18),wood=mat(0x71563c,.34,.16),brass=mat(0xb18a50,.28,.72),fabric=mat(0x343e47,.92),screen=mat(0x1a3947,.22,.2,{emissive:0x102d3a,emissiveIntensity:.45}),green=mat(0x31523c,.9),white=mat(0xd8d3c8,.48,.12);
  const glass=new THREE.MeshPhysicalMaterial({color:0x9bc1ce,roughness:.12,metalness:.12,transparent:true,opacity:.26,transmission:.38,thickness:.12,side:THREE.DoubleSide});
  const group=new THREE.Group();scene.add(group);
  const box=(parent:any,x:number,y:number,z:number,w:number,h:number,d:number,material:any,shadow=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;};
  const cylinder=(parent:any,x:number,y:number,z:number,r:number,h:number,material:any)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const sphere=(parent:any,x:number,y:number,z:number,r:number,material:any)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  const label=(text:string,color="#e9e3d7")=>{const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;const ctx=canvas.getContext("2d")!;ctx.clearRect(0,0,1024,256);ctx.fillStyle="rgba(10,16,22,.88)";ctx.fillRect(0,0,1024,256);ctx.fillStyle="#b99760";ctx.fillRect(0,0,12,256);ctx.fillStyle=color;ctx.font="700 64px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,512,130,940);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide});return material;};
  // Site platform and architectural plinth.
  box(group,0,-.8,0,48,1.2,38,stone);box(group,0,-.16,0,43,.18,33,dark);box(group,0,.02,0,41,.18,31,floor);
  // Inlaid floor joints and brass perimeter lines.
  for(let x=-18;x<=18;x+=6)box(group,x,.12,0,.025,.012,27,brass,false);
  for(let z=-12;z<=12;z+=6)box(group,0,.12,z,37,.012,.025,brass,false);
  // Rear and side walls form a deliberate cutaway; front remains open for the walkthrough.
  box(group,-19,3,0,.65,6,31,wall);box(group,19,3,0,.65,6,31,wall);box(group,0,3,-15.2,38,6,.65,wall);
  const roof=[box(group,0,6.15,-.2,38,.42,31,dark),box(group,0,5.92,-.2,37.4,.08,30.4,brass)];
  // Rear glass ribbon and vertical mullions.
  box(group,0,3.05,-14.82,30,3.6,.08,glass);
  for(let x=-15;x<=15;x+=3)box(group,x,3.05,-14.7,.075,3.8,.12,brass);
  // Single floor suite divisions, with glazed fronts and real door gaps.
  for(const x of [-6,6])for(const z of [-10,-4,4,10]){
   box(group,x,2.1,z,.18,4.2,4.2,wall);
   box(group,x,3.7,z,.11,.12,4.2,brass);
  }
  for(const z of [-4,4])box(group,0,2.0,z,11.8,.16,.16,wall);
  // Reception portal, monumental canopy and Q signature wall.
  box(group,0,6.55,15.0,22,.38,3.8,dark);box(group,0,6.34,15.0,20,.08,3.4,brass);
  for(const x of [-9.5,9.5]){box(group,x,3.2,14.1,.82,6.4,.9,stone);box(group,x,6.0,14.1,1,.15,1.1,brass);}
  box(group,0,2.8,10.7,10,5.2,.34,dark);box(group,0,2.9,10.48,7.8,3.2,.1,wall);
  box(group,-.1,3.05,10.38,1.9,2.1,.12,brass);box(group,-.1,3.05,10.28,1.35,1.55,.08,dark);
  // Front desk, visitor lounge, security podium.
  box(group,0,.85,11.7,6.4,1.35,1.25,dark);box(group,0,1.55,11.7,6.55,.12,1.32,brass);box(group,0,1.72,11.7,2.1,.08,.08,glass);
  for(const x of [-4.4,4.4]){box(group,x,.62,9.65,2.1,.8,1.05,fabric);box(group,x,1.06,9.25,2.1,.72,.18,wood);}
  box(group,-7.2,.55,11.2,1.7,.9,1.4,dark);box(group,7.2,.55,11.2,1.7,.9,1.4,dark);
  // Main boardroom table and eight executive chairs.
  box(group,0,.75,-1.1,5.6,.18,2.4,wood);
  for(const x of [-2.1,0,2.1])for(const z of [-2.45,.25]){box(group,x,.52,z,.72,.22,.72,dark);box(group,x,.98,z,.72,.86,.16,fabric);}
  box(group,0,1.25,-1.1,2.8,.05,.08,brass);
  // Corporate meeting suites: long conference tables, task seating and presentation walls.
  for(const [x,z,w,d] of [[-12,8,7,4],[12,8,7,4],[-12,0,7,4],[12,0,7,4],[-12,-8,7,4],[12,-8,7,4]] as number[][]){
   box(group,x,.55,z,w,.12,d,wood);box(group,x,.92,z-d*.5+.3,w*.6,.7,.12,fabric);
   for(const sx of [-w*.35,w*.35])for(const sz of [-d*.25,d*.25]){box(group,x+sx,.4,z+sz,.55,.12,.55,dark);box(group,x+sx,.72,z+sz,.55,.6,.12,fabric);}
  }
  // Eight named business-unit suites: executive desk, screen, lounge chairs, storage and identity sign.
  // Q's owner suite is built separately below; skip its generic module to avoid overlapping duplicate furniture.
  for(const u of units){
   if(u.id==="q")continue;
   const accent=mat(new THREE.Color(u.color[0],u.color[1],u.color[2]),.38,.28);
   const area=new THREE.Group();area.position.set(u.x,0,u.z);group.add(area);
   box(area,0,.19,0,10.7,.12,7.1,mat(0x343c42,.72));
   box(area,1.4,.86,-1.0,3.2,.16,1.55,wood);box(area,.1,.47,-1.0,.08,.78,.08,brass);box(area,2.7,.47,-1.0,.08,.78,.08,brass);
   box(area,1.4,1.65,-1.55,1.5,.92,.12,dark);box(area,1.4,1.65,-1.47,1.35,.76,.035,screen,false);
   box(area,1.4,1.08,-.25,.55,.07,.36,white);
   cylinder(area,1.4,.56,.25,.34,.42,dark);box(area,1.4,.96,.53,.8,.8,.18,accent);
   box(area,-2.8,.55,.6,1.85,.7,1.15,fabric);box(area,-2.8,1.0,.18,1.85,.75,.18,wood);
   box(area,3.4,.5,1.7,1.65,.55,.86,fabric);box(area,3.4,.88,1.35,1.65,.7,.18,wood);
   // Storage credenza and wall art.
   box(area,-4.25,.65,-2.6,1.2,1.25,.65,wood);box(area,-4.25,1.35,-2.6,1.25,.06,.7,brass);
   box(area,0,2.75,-3.48,5.2,.06,.12,accent);
   box(area,0,3.45,-3.5,4.8,1.15,.1,dark);box(area,0,3.45,-3.42,4.45,.91,.035,accent,false);
   // Planter with trunk and layered foliage.
   cylinder(area,-4.3,.45,2.5,.42,.7,mat(0x554535));cylinder(area,-4.3,1.45,2.5,.07,1.5,wood);
   sphere(area,-4.3,2.25,2.5,.78,green);sphere(area,-4.72,2.0,2.5,.48,green);sphere(area,-3.9,2.0,2.55,.5,green);
   const plaque=new THREE.Mesh(new THREE.PlaneGeometry(4.7,.85),label(u.name));plaque.position.set(0,3.45,3.54);area.add(plaque);
   // Glass office frontage with metal frame; gaps left at the centre for access.
   if(u.x!==0){box(area,-5.15,2.05,0,.09,4.1,6.6,glass);box(area,5.15,2.05,0,.09,4.1,6.6,glass);for(const px of [-5.15,5.15])box(area,px,2.05,0,.1,4.25,.1,brass);}
  }
  // Owner suite focal furniture, leather seating, desk, display and Q mark.
  box(group,0,.3,0,11.2,.12,7.8,mat(0x282d32,.5));
  box(group,0,.86,-3.0,5.4,.18,1.4,wood);box(group,0,1.65,-3.45,2.6,1.15,.12,dark);box(group,0,1.65,-3.37,2.4,.94,.03,screen,false);
  for(const x of [-3.4,3.4]){box(group,x,.62,1.4,2.0,.8,1.05,fabric);box(group,x,1.05,1.0,2.0,.72,.18,wood);}
  // Reception planting, driveway and entry path.
  for(const x of [-15,-12,12,15]){cylinder(group,x,.45,16.8,.75,.7,mat(0x594936));cylinder(group,x,1.2,16.8,.08,1.5,wood);sphere(group,x,2.0,16.8,.9,green);sphere(group,x-.4,1.8,16.7,.55,green);}
  box(group,0,-.04,19.2,25,.14,6,mat(0x333c43,.9));box(group,0,.05,19.2,10,.06,2.4,brass,false);
  // Continuous low-profile lighting rails and warm recessed fixtures.
  for(const u of units){box(group,u.x,5.5,u.z,7,.08,.12,brass,false);const lamp=new THREE.PointLight(0xffd39b,12,13,2);lamp.position.set(u.x,5.2,u.z);group.add(lamp);}
  // Fine facade fins and window mullions create real depth and highlights.
  for(let x=-17;x<=17;x+=2.8){box(group,x,3,-14.82,.055,5.2,.14,brass);box(group,x,3,14.8,.055,4.4,.12,brass);}
  // Decorative structural columns.
  for(const x of [-17,-11.5,-6,0,6,11.5,17]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,5.2,20),mat(0x777d7e,.28,.62));col.position.set(x,2.6,14.3);col.castShadow=true;group.add(col);}
  // Lighting, palette, and quality are owner-controlled.
  if(visuals.palette==="monochrome")group.traverse((o:any)=>{if(o.isMesh&&o.material?.color){const c=o.material.color;const l=c.r*.3+c.g*.59+c.b*.11;o.material.color.setRGB(l*.82,l*.86,l*.9);}});
  if(visuals.palette==="vibrant")group.traverse((o:any)=>{if(o.isMesh&&o.material?.color)o.material.color.offsetHSL(0,.12,.02);});
  const groundMat=mat(visuals.environment==="daylight"?0x66727a:visuals.environment==="sunset"?0x27242a:0x111820,.95);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(220,220),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-1.42;ground.receiveShadow=true;scene.add(ground);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=25;controls.maxDistance=95;controls.maxPolarAngle=Math.PI*.47;controls.target.set(0,1.2,0);controls.minPolarAngle=.12;
  let currentVisuals=visuals;
  const walk={x:0,z:8,yaw:0};let currentMode=mode;
  const setSelected=(id:string)=>{const u=units.find(v=>v.id===id)??units[0];const spot=u.id==="q"?{x:0,z:5.2,yaw:0}:u.x<0?{x:-6.2,z:u.z,yaw:-90}:u.x>0?{x:6.2,z:u.z,yaw:90}:u.z>0?{x:0,z:4.8,yaw:180}:{x:0,z:-4.8,yaw:0};walk.x=spot.x;walk.z=spot.z;if(currentMode==="third-person"){setWalkAngle(spot.yaw);return;}const d=u.id==="q"?30:24,a=currentVisuals.orbit*Math.PI/180;controls.target.set(u.x,1,u.z);camera.position.set(u.x+Math.sin(a)*d,20/currentVisuals.zoom,u.z+Math.cos(a)*d);controls.update();};
  const setMode=(m:string)=>{currentMode=m as typeof mode;roof.forEach((r:any)=>{r.visible=m!=="isometric";});if(m==="isometric"){controls.enabled=true;camera.position.set(Math.sin(visuals.orbit*Math.PI/180)*48,32,Math.cos(visuals.orbit*Math.PI/180)*48);controls.target.set(0,1,0);controls.update();}else{controls.enabled=false;camera.position.set(walk.x-Math.sin(walk.yaw)*6,3.2,walk.z+Math.cos(walk.yaw)*6);camera.lookAt(walk.x,1.6,walk.z);}};
  const setOrbit=(angle:number)=>{if(currentMode==="isometric"){const distance=56/currentVisuals.zoom;camera.position.set(Math.sin(angle*Math.PI/180)*distance,35/currentVisuals.zoom,Math.cos(angle*Math.PI/180)*distance);controls.target.set(0,1,0);controls.update();}};
  const setVisuals=(v:Visuals)=>{currentVisuals=v;renderer.toneMappingExposure=1.12*v.brightness;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,v.quality==="high"?1.5:v.quality==="balanced"?1.25:1));scene.background.set(v.environment==="daylight"?0x9aaeb9:v.environment==="sunset"?0x33262a:0x111923);scene.fog.color.copy(scene.background);key.intensity=v.brightness*3.4;fill.intensity=v.brightness*1.1;warm.intensity=v.brightness*80;group.traverse((o:any)=>{if(!o.isMesh||!o.material?.userData?.baseColor)return;const base=o.material.userData.baseColor.clone();if(v.palette==="monochrome"){const l=base.r*.3+base.g*.59+base.b*.11;base.setRGB(l*.82,l*.86,l*.9);}else if(v.palette==="vibrant")base.offsetHSL(0,.12,.02);o.material.color.copy(base);});setOrbit(v.orbit);resize();};
  const setWalkAngle=(angle:number)=>{walk.yaw=angle*Math.PI/180;camera.position.set(walk.x-Math.sin(walk.yaw)*6,3.2,walk.z+Math.cos(walk.yaw)*6);camera.lookAt(walk.x,1.6,walk.z);onWalkAngleChange((angle%360+360)%360);};
  const move=(dx:number,dz:number)=>{walk.x=Math.max(-16,Math.min(16,walk.x+Math.cos(walk.yaw)*dx+Math.sin(walk.yaw)*(-dz)));walk.z=Math.max(-10,Math.min(21,walk.z+Math.sin(walk.yaw)*dx-Math.cos(walk.yaw)*(-dz)));setWalkAngle(walk.yaw*180/Math.PI);onWalkAngleChange((walk.yaw*180/Math.PI+360)%360);};
  const keydown=(e:KeyboardEvent)=>{if(currentMode!=="third-person")return;const step=.42;if(e.key==="ArrowLeft")setWalkAngle((walk.yaw*180/Math.PI+3));if(e.key==="ArrowRight")setWalkAngle((walk.yaw*180/Math.PI-3));if(e.key.toLowerCase()==="w"||e.key==="ArrowUp")move(0,-step);if(e.key.toLowerCase()==="s"||e.key==="ArrowDown")move(0,step);if(e.key.toLowerCase()==="a")move(-step,0);if(e.key.toLowerCase()==="d")move(step,0);};
  window.addEventListener("keydown",keydown);
  let drag=false,lastX=0;const down=(e:PointerEvent)=>{if(currentMode!=="third-person")return;drag=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);};const movePointer=(e:PointerEvent)=>{if(!drag||currentMode!=="third-person")return;const delta=e.clientX-lastX;lastX=e.clientX;setWalkAngle(walk.yaw*180/Math.PI-delta*.32);onWalkAngleChange((walk.yaw*180/Math.PI+360)%360);};const up=()=>{drag=false;};renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",movePointer);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",up);
  const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};
  observer=new ResizeObserver(resize);observer.observe(root);resize();
  api.current={setMode,setOrbit,setWalkAngle,setSelected,setVisuals,move};
  setMode(mode);setOrbit(visuals.orbit);
  const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);if(document.hidden)return;controls.update();renderer.render(scene,camera);};animate();
  return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener("keydown",keydown);renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",movePointer);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",up);renderer.domElement.removeEventListener("webglcontextlost",onContextLost);controls.dispose();scene.traverse((o:any)=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach((m:any)=>{m.map?.dispose?.();m.dispose?.();});else{o.material?.map?.dispose?.();o.material?.dispose?.();}});renderer.dispose();renderer.domElement.remove();};
 // Renderer lifetime is tied to the mounted HQ viewport; settings are applied by the effect below.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{api.current?.setMode(mode);},[mode]);
 useEffect(()=>{api.current?.setOrbit(visuals.orbit);},[visuals.orbit,visuals.zoom]);
 useEffect(()=>{api.current?.setWalkAngle(walkAngle);},[walkAngle]);
 useEffect(()=>{api.current?.setSelected(selected);},[selected]);
 useEffect(()=>{api.current?.setVisuals(visuals);},[visuals]);
 return <div className="qw-three-host" ref={host}>{webglUnavailable&&<div className="qw-three-fallback" role="status"><b>3D view unavailable</b><p>This device or browser could not keep WebGL running. Use the office directory below to continue in Q OS.</p></div>}{mode==="third-person"&&<div className="qw-three-pad" aria-label="Walk controls"><button type="button" onClick={()=>api.current?.move(0,-1)} aria-label="Move forward">↑</button><div><button type="button" onClick={()=>api.current?.move(-1,0)} aria-label="Move left">←</button><button type="button" onClick={()=>api.current?.move(1,0)} aria-label="Move right">→</button></div><button type="button" onClick={()=>api.current?.move(0,1)} aria-label="Move backward">↓</button></div>}</div>;
}
