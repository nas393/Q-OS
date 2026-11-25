/* The Office floor, drawn as an illustrated isometric plan in the spirit of Gather.town: rooms are tiled floors,
   walls and furniture are solid blocks, and every staff member sits at a desk. The drawing and the people on it
   share one projection, so a seat is always in the same place on the picture. Colours come from the theme (CSS). */
import type {ReactNode} from "react";

type Pt=[number,number];
type Box={x0:number;y0:number;x1:number;y1:number;h:number;z0?:number;cls:string};
export type Zone={id:string;label:string;x0:number;y0:number;x1:number;y1:number;tint:string};
export type Seat={x:number;y:number;desk:boolean};

/* One floor unit is S drawing pixels along the screen's diagonals. Desks sit six units apart so that a speech
   bubble never covers the neighbouring figure. */
const S=20,K=0.866*S;
export const FLOOR_W=26,FLOOR_D=30;

/** A floor point on the screen. z lifts it above the floor, in drawing pixels. */
export function iso(x:number,y:number,z=0):Pt{return [(x-y)*K,(x+y)*S/2-z];}
const poly=(ps:Pt[])=>ps.map(([a,b])=>`${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

/* The picture's frame, fitted to the floor, its walls and its tallest objects. */
const frame=[iso(0,0,40),iso(FLOOR_W,0,0),iso(0,FLOOR_D,0),iso(FLOOR_W,FLOOR_D,0)];
const X0=Math.min(...frame.map(p=>p[0]))-12,X1=Math.max(...frame.map(p=>p[0]))+12;
/* Headroom above the floor: the back figures' speech bubbles rise above the walls. */
const Y0=Math.min(...frame.map(p=>p[1]))-72,Y1=Math.max(...frame.map(p=>p[1]))+14;
export const VIEW={x:X0,y:Y0,w:X1-X0,h:Y1-Y0};
/** The drawing's design size. The page scales the whole plan, so people and floor always move together. */
export const MAP_W=VIEW.w,MAP_H=VIEW.h;

/** Where a floor point lands on the picture, as percentages of the picture's box. */
export function place(x:number,y:number,z=0):{left:string;top:string}{
  const [px,py]=iso(x,y,z);
  return {left:`${((px-VIEW.x)/VIEW.w*100).toFixed(3)}%`,top:`${((py-VIEW.y)/VIEW.h*100).toFixed(3)}%`};
}

/* ---------- The plan: zones, seats and the things in them ---------- */

/** The rooms: each is a tiled floor in one tint. The tints are the zone colours of the design system. */
export const ZONES:Zone[]=[
  {id:"corner",label:"Chief of Staff",x0:0,y0:0,x1:10.5,y1:10.4,tint:"var(--iso-clay)"},
  {id:"studio",label:"Media studio",x0:11,y0:0,x1:26,y1:10.4,tint:"var(--iso-sand)"},
  {id:"academy",label:"Academy",x0:0,y0:11,x1:9.5,y1:22.4,tint:"var(--iso-sage)"},
  {id:"markets",label:"Markets desk",x0:10,y0:11,x1:16.5,y1:22.4,tint:"var(--iso-slate)"},
  {id:"community",label:"Community hall",x0:17,y0:11,x1:26,y1:22.4,tint:"var(--iso-rose)"},
  {id:"screens",label:"Screening room",x0:0,y0:23,x1:13,y1:30,tint:"var(--iso-ochre)"},
  {id:"ops",label:"Server room",x0:13.5,y0:23,x1:26,y1:30,tint:"var(--iso-stone)"}
];

/** Where each staff member sits: the chair's floor point. Ops stands at the racks, so it has no desk. */
export const SEATS:Record<string,Seat>={
  q:{x:4.2,y:3.6,desk:true},
  novae:{x:13.5,y:3.6,desk:true},lumeris:{x:21.0,y:3.6,desk:true},
  certigo:{x:3.0,y:13.2,desk:true},"ali-quest":{x:3.0,y:20.2,desk:true},
  xauusd:{x:13.0,y:13.2,desk:true},lep:{x:13.0,y:20.2,desk:true},
  dalil:{x:21.5,y:13.2,desk:true},radio:{x:21.5,y:20.2,desk:true},
  "ala-hawa":{x:4.0,y:26.0,desk:true},arz:{x:11.5,y:26.0,desk:true},
  ops:{x:20.0,y:26.6,desk:false}
};

/* Walls around the floor, and low partitions between the rooms. */
const WALLS:Box[]=[
  {x0:0,y0:0,x1:FLOOR_W,y1:0.3,h:16,cls:"wall"},
  {x0:0,y0:0,x1:0.3,y1:FLOOR_D,h:16,cls:"wall"},
  {x0:FLOOR_W-0.3,y0:0,x1:FLOOR_W,y1:FLOOR_D,h:16,cls:"wall"},
  {x0:0,y0:FLOOR_D-0.3,x1:FLOOR_W,y1:FLOOR_D,h:16,cls:"wall"},
  {x0:10.6,y0:0,x1:10.85,y1:10.4,h:11,cls:"wall"},
  {x0:0,y0:10.4,x1:FLOOR_W,y1:10.65,h:11,cls:"wall"},
  {x0:9.6,y0:11,x1:9.85,y1:22.4,h:11,cls:"wall"},
  {x0:16.6,y0:11,x1:16.85,y1:22.4,h:11,cls:"wall"},
  {x0:0,y0:22.4,x1:FLOOR_W,y1:22.65,h:11,cls:"wall"},
  {x0:13.1,y0:23,x1:13.35,y1:FLOOR_D,h:11,cls:"wall"}
];

/* Furniture that stands on its own: a bookshelf, a whiteboard, wall screens, a sofa, two racks. */
const FURNITURE:Box[]=[
  {x0:0.6,y0:0.3,x1:3.8,y1:0.95,h:28,cls:"shelf"},
  {x0:13,y0:0.3,x1:19.5,y1:0.5,h:26,cls:"board"},
  {x0:11.2,y0:11.3,x1:15.8,y1:11.5,h:24,cls:"screen"},
  {x0:18.5,y0:11.3,x1:24.5,y1:12.1,h:10,cls:"sofa"},
  {x0:1.4,y0:23.3,x1:8.6,y1:23.5,h:22,cls:"screen"},
  {x0:17.2,y0:23.8,x1:18.6,y1:24.6,h:34,cls:"rack"},
  {x0:21.4,y0:23.8,x1:22.8,y1:24.6,h:34,cls:"rack"}
];

/** Plants, by their floor point. */
const PLANTS:Pt[]=[[9.0,9.4],[25.4,0.6],[0.6,21.3],[25.4,21.3],[0.6,29.2],[12.6,29.2],[25.4,29.2]];

/* ---------- Drawing ---------- */

/** One solid block: its left, right and top faces, shaded by the theme. */
function boxNode(b:Box,key:string):ReactNode{
  const z0=b.z0??0,h=b.h;
  return <g key={key} className={`iso-${b.cls}`}>
    <polygon className="iso-l" points={poly([iso(b.x0,b.y1,h),iso(b.x1,b.y1,h),iso(b.x1,b.y1,z0),iso(b.x0,b.y1,z0)])}/>
    <polygon className="iso-r" points={poly([iso(b.x1,b.y0,h),iso(b.x1,b.y1,h),iso(b.x1,b.y1,z0),iso(b.x1,b.y0,z0)])}/>
    <polygon className="iso-top" points={poly([iso(b.x0,b.y0,h),iso(b.x1,b.y0,h),iso(b.x1,b.y1,h),iso(b.x0,b.y1,h)])}/>
  </g>;
}

/** A round table: its sides drawn back to front, then its top. */
function cylinderNode(cx:number,cy:number,r:number,h:number,key:string):{d:number;node:ReactNode}{
  const n=18;
  const P=(i:number):Pt=>{const a=(i/n)*Math.PI*2;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  const sides:{d:number;el:ReactNode}[]=[];
  for(let i=0;i<n;i++){
    const [ax,ay]=P(i),[bx,by]=P(i+1);
    sides.push({d:(ax+bx)/2+(ay+by)/2,el:<polygon key={i} className="iso-l" points={poly([iso(ax,ay,0),iso(bx,by,0),iso(bx,by,h),iso(ax,ay,h)])}/>});
  }
  sides.sort((a,b)=>a.d-b.d);
  const top:Pt[]=[];
  for(let i=0;i<n;i++){const [px,py]=P(i);top.push(iso(px,py,h));}
  return {d:cx+cy,node:<g key={key} className="iso-table">{sides.map(s=>s.el)}<polygon className="iso-top" points={poly(top)}/></g>};
}

/** A potted plant: a pot and three leaves, drawn after the pot. */
function plantItems(x:number,y:number,key:string):{d:number;node:ReactNode}[]{
  const a=iso(x,y,20),b=iso(x-0.2,y+0.1,27),c=iso(x+0.2,y-0.1,26);
  return [
    {d:x+y+0.5,node:boxNode({x0:x-0.25,y0:y-0.25,x1:x+0.25,y1:y+0.25,h:8,cls:"pot"},`pot-${key}`)},
    {d:x+y+0.9,node:<g key={`leaf-${key}`}>
      <circle className="iso-leaf" cx={a[0]} cy={a[1]} r={9}/>
      <circle className="iso-leaf" cx={b[0]} cy={b[1]} r={7}/>
      <circle className="iso-leaf" cx={c[0]} cy={c[1]} r={6}/>
    </g>}
  ];
}

/* Everything that stands on the floor, drawn back to front. */
const ITEMS:{d:number;node:ReactNode}[]=[];
WALLS.forEach((b,i)=>ITEMS.push({d:b.x1+b.y1,node:boxNode(b,`wall-${i}`)}));
FURNITURE.forEach((b,i)=>ITEMS.push({d:b.x1+b.y1,node:boxNode(b,`fx-${i}`)}));
ITEMS.push(cylinderNode(7.8,6.8,1.3,12,"q-table"));
PLANTS.forEach(([x,y],i)=>plantItems(x,y,`p${i}`).forEach(it=>ITEMS.push(it)));
Object.entries(SEATS).forEach(([id,s])=>{
  if(!s.desk)return;
  const desk:Box={x0:s.x-1,y0:s.y-1.1,x1:s.x+1,y1:s.y-0.1,h:16,cls:"desk"};
  const monitor:Box={x0:s.x-0.35,y0:s.y-1.0,x1:s.x+0.35,y1:s.y-0.8,h:28,z0:16,cls:"screen"};
  const seatBlock:Box={x0:s.x-0.35,y0:s.y+0.05,x1:s.x+0.35,y1:s.y+0.6,h:9,cls:"chair"};
  const chairBack:Box={x0:s.x-0.35,y0:s.y+0.55,x1:s.x+0.35,y1:s.y+0.7,h:18,cls:"chair"};
  ITEMS.push({d:s.x+s.y+0.9,node:boxNode(desk,`desk-${id}`)});
  ITEMS.push({d:s.x+s.y+1.0,node:boxNode(monitor,`mon-${id}`)});
  ITEMS.push({d:s.x+s.y+1.2,node:<g key={`chair-${id}`}>{boxNode(seatBlock,`seat-${id}`)}{boxNode(chairBack,`back-${id}`)}</g>});
});
ITEMS.sort((a,b)=>a.d-b.d);

const GRID=[
  ...Array.from({length:FLOOR_W+1},(_,i)=>`M${iso(i,0).join(",")}L${iso(i,FLOOR_D).join(",")}`),
  ...Array.from({length:FLOOR_D+1},(_,j)=>`M${iso(0,j).join(",")}L${iso(FLOOR_W,j).join(",")}`)
].join("");

/** The illustrated plan. It is decoration with no interaction: the people on it are buttons laid over it. */
export function FloorArt(){
  return <svg className="of-art" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
    <polygon className="iso-base" points={poly([iso(0,0),iso(FLOOR_W,0),iso(FLOOR_W,FLOOR_D),iso(0,FLOOR_D)])}/>
    {ZONES.map(z=><polygon key={z.id} className="iso-zone" style={{fill:z.tint}} points={poly([iso(z.x0,z.y0),iso(z.x1,z.y0),iso(z.x1,z.y1),iso(z.x0,z.y1)])}/>)}
    <path className="iso-grid" d={GRID}/>
    {ITEMS.map(i=>i.node)}
  </svg>;
}
