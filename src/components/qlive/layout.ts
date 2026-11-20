/*
 * Q Live orbit geometry. Pure functions (no React, no "@/..." imports) so tests/qlive-layout.test.mjs can load
 * this file directly with Node's --experimental-strip-types.
 */
export type OrbitState="ok"|"crit"|"dep"|"idle";
export type OrbitInput={id:string;name:string;state:OrbitState};
export type Placed<T>={n:T;ang:number;x:number;y:number;gx:number;gy:number;w:number};

/** Short display name for tight spaces: "ALI-QUEST / CISA QUEST" -> "ALI-QUEST", "DALIL AL-BAZOURIEH" -> "DALIL". */
export function shortName(n:string):string{
  const a=n.split(" / ")[0].trim();
  if(a.length<=13)return a;
  const w=a.split(/\s+/),two=w.slice(0,2).join(" ");
  return two.length<=13?two:w[0];
}
/** Estimated pill width of an orbit node (status dot + 28px mark + uppercase label + padding). */
export const nodeWidth=(name:string)=>64+8.6*shortName(name).length;

/**
 * Lays the apps out on an ellipse sized to the free space between the side panels.
 * Healthy apps share the ring evenly; failing apps are pulled in (62%) toward the Signals side, in a gap left for them.
 * A node that would touch an already-placed node steps to an outer or inner orbit.
 */
export function orbitLayout<T extends OrbitInput>(nodes:T[],w:number,h:number){
  const panelW=w<=1320?300:340,H=Math.max(h,720);
  /* The stage sits below the shell's top bar: 24px of air above, 196px below for the Q dock. */
  const cx=w/2,top=24,bottom=H-196,cy=top+(bottom-top)/2;
  const RX=Math.max(170,Math.min((w-2*(24+panelW+16))/2-78,330)),RY=Math.max(170,Math.min((bottom-top)/2-26,300));
  const ring=(a:number,k:number)=>({x:Math.cos(a)*RX*k,y:Math.sin(a)*RY*k});
  const crit=nodes.filter(n=>n.state==="crit"),ok=nodes.filter(n=>n.state!=="crit");
  const step=360/Math.max(1,ok.length),boxes:{x:number;y:number;w:number}[]=[];
  const hits=(x:number,y:number,bw:number)=>boxes.some(b=>Math.abs(b.x-x)<(b.w+bw)/2+10&&Math.abs(b.y-y)<54);
  const placed:Placed<T>[]=[];
  crit.forEach((n,i)=>{
    const ang=((i-(crit.length-1)/2)*24)*Math.PI/180,p=ring(ang,0.62),g=ring(ang,1),bw=nodeWidth(n.name);
    boxes.push({x:p.x,y:p.y,w:bw});placed.push({n,ang,...p,gx:g.x,gy:g.y,w:bw});
  });
  ok.forEach((n,i)=>{
    const ang=(crit.length?step/2+i*step:-90+i*step)*Math.PI/180,bw=nodeWidth(n.name);
    let p=ring(ang,1);
    for(const k of [1,1.16,0.84,1.3]){const q=ring(ang,k);if(!hits(q.x,q.y,bw)){p=q;break;}}
    boxes.push({x:p.x,y:p.y,w:bw});placed.push({n,ang,...p,gx:p.x,gy:p.y,w:bw});
  });
  return {cx,cy,RX,RY,panelW,placed};
}
