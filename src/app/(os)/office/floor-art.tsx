/* The Office floor, drawn as an illustrated isometric plan: a warm floor with low partitions, desks with monitors and
   chairs, a meeting table on a rug, plants, framed art, a screening wall and a server room. Each staff member sits at a
   station: a person behind a desk, or a robot for an automated app. The people are drawn here; the speech bubbles and
   the hit areas are laid over the plan with the same projection (see place()). Colours come from CSS (.office). */
import type {ReactNode} from "react";

type Pt=[number,number];
type Box={x0:number;y0:number;x1:number;y1:number;h:number;z0?:number;cls:string};
export type Look={hair?:string;skin?:string;shirt?:string;metal?:string;eye?:string;hairStyle?:"short"|"long"|"bun"};
export type Station={id:string;x:number;y:number;kind:"person"|"robot";look:Look;standing?:boolean};

const S=20,K=0.866*S;
/** The floor is FLOOR units square. */
export const FLOOR=34;

/** A floor point on the screen. z lifts it above the floor, in drawing pixels. */
export function iso(x:number,y:number,z=0):Pt{return [(x-y)*K,(x+y)*S/2-z];}
const poly=(ps:Pt[])=>ps.map(([a,b])=>`${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

/* The picture's frame, fitted to the floor and its walls. */
const frame=[iso(0,0,40),iso(FLOOR,0,0),iso(0,FLOOR,0),iso(FLOOR,FLOOR,0)];
const X0=Math.min(...frame.map(p=>p[0]))-16,X1=Math.max(...frame.map(p=>p[0]))+16;
const Y0=Math.min(...frame.map(p=>p[1]))-60,Y1=Math.max(...frame.map(p=>p[1]))+14;
export const VIEW={x:X0,y:Y0,w:X1-X0,h:Y1-Y0};
/** The drawing's design size. The page scales the whole plan, so people and floor always move together. */
export const MAP_W=VIEW.w,MAP_H=VIEW.h;

/** Where a floor point lands on the picture, as percentages of the picture's box. */
export function place(x:number,y:number,z=0):{left:string;top:string}{
  const [px,py]=iso(x,y,z);
  return {left:`${((px-VIEW.x)/VIEW.w*100).toFixed(3)}%`,top:`${((py-VIEW.y)/VIEW.h*100).toFixed(3)}%`};
}

/** Room names, for the legend under the plan. */
export const ROOM_LEGEND:{id:string;label:string}[]=[
  {id:"corner",label:"Chief of Staff"},{id:"studio",label:"Media studio"},{id:"academy",label:"Academy"},
  {id:"markets",label:"Markets desk"},{id:"community",label:"Community hall"},{id:"screens",label:"Screening room"},{id:"ops",label:"Server room"}
];

/* ---------- The stations: where each staff member sits. A station is the seat behind its desk (x, y). Stations sit on a
   diamond grid, six or more units apart, so each speech bubble clears its neighbours. Ops stands at the racks. ---------- */
export const STATIONS:Station[]=[
  {id:"q",x:3.5,y:18.5,kind:"person",look:{hair:"#2B211C",skin:"#B57A54",shirt:"#A95431",hairStyle:"short"}},
  {id:"xauusd",x:7.25,y:14.75,kind:"robot",look:{metal:"#C9CDD2",eye:"#E0A43A"}},
  {id:"novae",x:11,y:11,kind:"person",look:{hair:"#5B3A29",skin:"#E0B08C",shirt:"#7E9C6A",hairStyle:"long"}},
  {id:"lumeris",x:14.75,y:7.25,kind:"person",look:{hair:"#1E1B19",skin:"#8D5A3B",shirt:"#D9C7A5",hairStyle:"bun"}},
  {id:"ala-hawa",x:18.5,y:3.5,kind:"person",look:{hair:"#3A2D25",skin:"#F0C4A0",shirt:"#6F8FA8",hairStyle:"short"}},
  {id:"certigo",x:8.75,y:31.25,kind:"person",look:{hair:"#6A4A33",skin:"#D9A27E",shirt:"#4E6D8A",hairStyle:"short"}},
  {id:"ali-quest",x:12.5,y:27.5,kind:"person",look:{hair:"#171412",skin:"#7A4B2F",shirt:"#C98C5B",hairStyle:"long"}},
  {id:"lep",x:16.25,y:23.75,kind:"robot",look:{metal:"#B9C4BF",eye:"#7FB38B"}},
  {id:"arz",x:20,y:20,kind:"robot",look:{metal:"#D4CBBE",eye:"#7FA7C9"}},
  {id:"dalil",x:23.75,y:16.25,kind:"person",look:{hair:"#2D2420",skin:"#A56C47",shirt:"#A96B59",hairStyle:"bun"}},
  {id:"radio",x:27.5,y:12.5,kind:"person",look:{hair:"#8A5A3C",skin:"#F1CBA6",shirt:"#8DA37A",hairStyle:"long"}},
  {id:"ops",x:31.25,y:8.75,kind:"robot",look:{metal:"#9AA0A8",eye:"#E5776C"},standing:true}
];

/* The meeting table, the rug, and the six chairs around the table. */
const TABLE={x:16.5,y:15,r:2.4,h:12};
const CHAIRS=[0,60,120,180,240,300].map(a=>{const t=a*Math.PI/180;return {x:TABLE.x+3.9*Math.cos(t),y:TABLE.y+3.9*Math.sin(t)};});

/* Walls, partitions and furniture that stands on its own. */
const WALLS:Box[]=[
  {x0:0,y0:0,x1:FLOOR,y1:0.35,h:26,cls:"wall"},
  {x0:0,y0:0,x1:0.35,y1:FLOOR,h:26,cls:"wall"}
];
const PARTITIONS:Box[]=[
  {x0:5.2,y0:21.5,x1:5.45,y1:27.5,h:18,cls:"partition"},
  {x0:21.5,y0:24.3,x1:25.5,y1:24.55,h:18,cls:"partition"},
  {x0:12.0,y0:5.4,x1:12.25,y1:9.6,h:18,cls:"partition"}
];
const FURNITURE:Box[]=[
  /* framed art on the two back walls */
  {x0:0.35,y0:8,x1:0.6,y1:10.5,h:24,z0:12,cls:"frame"},
  {x0:0.35,y0:15,x1:0.6,y1:17.5,h:24,z0:12,cls:"frame"},
  {x0:6,y0:0.35,x1:8.5,y1:0.6,h:24,z0:12,cls:"frame"},
  {x0:24,y0:0.35,x1:26.5,y1:0.6,h:24,z0:12,cls:"frame"},
  /* the screening wall */
  {x0:14.2,y0:0.7,x1:18.8,y1:1.0,h:24,cls:"screen"},
  /* the server racks, behind the server room's robot */
  {x0:29.4,y0:4.3,x1:30.7,y1:5.4,h:34,cls:"rack"},
  {x0:31.2,y0:4.1,x1:32.5,y1:5.2,h:34,cls:"rack"},
  /* the sofa in the community hall */
  {x0:28,y0:25.2,x1:32.6,y1:26.4,h:10,cls:"sofa"},
  {x0:28,y0:24.9,x1:32.6,y1:25.2,h:18,cls:"sofa"}
];
const PLANTS:Pt[]=[[1.2,26],[33,31],[21,1.2],[1.2,1.6],[33,1.6]];

/* ---------- Drawing ---------- */

/** One solid block: its left, right and top faces. */
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

/** A seated person, drawn from the chair up: shoulders, arms to the desk, neck, head, hair. (px, py) is the chair. */
function personNode(s:Station,px:number,py:number):ReactNode{
  const L=s.look,hair=L.hair??"#2B211C",shirt=L.shirt??"#7E9C6A",skin=L.skin??"#E0B08C";
  const style=L.hairStyle??"short";
  return <g key={`p-${s.id}`} className="person">
    {style==="long"&&<rect x={px-13} y={py-60} width={26} height={24} rx={10} style={{fill:hair}}/>}
    <path d={`M${px-14},${py-4} L${px-14},${py-28} Q${px-14},${py-40} ${px},${py-40} Q${px+14},${py-40} ${px+14},${py-28} L${px+14},${py-4} Z`} style={{fill:shirt}}/>
    <path d={`M${px-10},${py-32} L${px-16},${py-12}`} className="limb" style={{stroke:shirt}}/>
    <path d={`M${px+10},${py-32} L${px+16},${py-12}`} className="limb" style={{stroke:shirt}}/>
    <rect x={px-4} y={py-48} width={8} height={9} style={{fill:skin}}/>
    <circle cx={px} cy={py-56} r={11} style={{fill:skin}}/>
    <path d={`M${px-11.5},${py-56} Q${px-12},${py-69} ${px},${py-69} Q${px+12},${py-69} ${px+11.5},${py-56} Q${px+6},${py-62} ${px},${py-62} Q${px-6},${py-62} ${px-11.5},${py-56} Z`} style={{fill:hair}}/>
    {style==="bun"&&<circle cx={px} cy={py-72} r={5} style={{fill:hair}}/>}
    <circle cx={px-4} cy={py-55} r={1.3} className="face"/>
    <circle cx={px+4} cy={py-55} r={1.3} className="face"/>
  </g>;
}

/** A robot: a boxy head with a dark screen face, an antenna, a body and a chest light. (px, py) is its base. */
function robotNode(s:Station,px:number,py:number):ReactNode{
  const L=s.look,metal=L.metal??"#C9CDD2",eye=L.eye??"#7FB38B";
  return <g key={`r-${s.id}`} className="robot">
    <line x1={px} y1={py-52} x2={px} y2={py-61} className="antenna"/>
    <circle cx={px} cy={py-63} r={2.8} style={{fill:eye}}/>
    <rect x={px-14} y={py-54} width={28} height={23} rx={7} style={{fill:metal}}/>
    <rect x={px-10} y={py-50} width={20} height={13} rx={4} className="face-dark"/>
    <circle cx={px-4} cy={py-44} r={2.2} style={{fill:eye}}/>
    <circle cx={px+4} cy={py-44} r={2.2} style={{fill:eye}}/>
    <rect x={px-5} y={py-31} width={10} height={3} rx={1.5} style={{fill:"#4A4A4A"}}/>
    <rect x={px-12} y={py-28} width={24} height={26} rx={8} style={{fill:metal}}/>
    <rect x={px-5} y={py-22} width={10} height={6} rx={2} style={{fill:eye,opacity:.75}}/>
    <rect x={px-16} y={py-24} width={5} height={16} rx={2.5} style={{fill:metal}}/>
    <rect x={px+11} y={py-24} width={5} height={16} rx={2.5} style={{fill:metal}}/>
  </g>;
}

function figureNode(s:Station):ReactNode{
  const z=s.standing?0:9;
  const [px,py]=iso(s.x,s.y,z);
  return s.kind==="person"?personNode(s,px,py):robotNode(s,px,py);
}

/** Everything one station needs: its chair, the figure, and its desk in front (or the racks, for a standing robot). */
function stationItems(s:Station):{d:number;node:ReactNode}[]{
  const d0=s.x+s.y;
  if(s.standing){
    return [{d:d0-1,node:<g key={`stand-${s.id}`}>{figureNode(s)}</g>}];
  }
  const chair=<g key={`chair-${s.id}`}>
    {boxNode({x0:s.x-0.4,y0:s.y-0.45,x1:s.x+0.4,y1:s.y+0.25,h:9,cls:"chair"},`cs-${s.id}`)}
    {boxNode({x0:s.x-0.4,y0:s.y-0.7,x1:s.x+0.4,y1:s.y-0.5,h:20,cls:"chair"},`cb-${s.id}`)}
  </g>;
  const desk=<g key={`desk-${s.id}`}>
    {boxNode({x0:s.x-1.1,y0:s.y+0.3,x1:s.x+1.1,y1:s.y+1.4,h:16,cls:"desk"},`dk-${s.id}`)}
    {boxNode({x0:s.x-0.5,y0:s.y+0.5,x1:s.x+0.5,y1:s.y+0.72,h:28,z0:16,cls:"screen"},`mn-${s.id}`)}
  </g>;
  return [
    {d:d0-0.6,node:chair},
    {d:d0+0.2,node:figureNode(s)},
    {d:d0+1.0,node:desk}
  ];
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
PARTITIONS.forEach((b,i)=>ITEMS.push({d:b.x1+b.y1,node:boxNode(b,`part-${i}`)}));
FURNITURE.forEach((b,i)=>ITEMS.push({d:b.x1+b.y1,node:boxNode(b,`fx-${i}`)}));
ITEMS.push(cylinderNode(TABLE.x,TABLE.y,TABLE.r,TABLE.h,"table"));
CHAIRS.forEach((c,i)=>ITEMS.push({d:c.x+c.y,node:boxNode({x0:c.x-0.35,y0:c.y-0.35,x1:c.x+0.35,y1:c.y+0.35,h:9,cls:"chair"},`mcs-${i}`)}));
PLANTS.forEach(([x,y],i)=>plantItems(x,y,`p${i}`).forEach(it=>ITEMS.push(it)));
STATIONS.forEach(s=>stationItems(s).forEach(it=>ITEMS.push(it)));
ITEMS.sort((a,b)=>a.d-b.d);

/** The rug under the meeting table: a flat ellipse, drawn on the floor. */
const RUG:Pt[]=Array.from({length:28},(_,i)=>{const t=(i/28)*Math.PI*2;return iso(TABLE.x+5.6*Math.cos(t),TABLE.y+5.6*Math.sin(t));});

const GRID=[
  ...Array.from({length:FLOOR+1},(_,i)=>`M${iso(i,0).join(",")}L${iso(i,FLOOR).join(",")}`),
  ...Array.from({length:FLOOR+1},(_,j)=>`M${iso(0,j).join(",")}L${iso(FLOOR,j).join(",")}`)
].join("");

/** The illustrated plan. It is decoration with no interaction: the people on it are buttons laid over it. */
export function FloorArt(){
  return <svg className="of-art" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
    <polygon className="iso-base" points={poly([iso(0,0),iso(FLOOR,0),iso(FLOOR,FLOOR),iso(0,FLOOR)])}/>
    <path className="iso-grid" d={GRID}/>
    <polygon className="iso-rug" points={poly(RUG)}/>
    {ITEMS.map(i=>i.node)}
  </svg>;
}
