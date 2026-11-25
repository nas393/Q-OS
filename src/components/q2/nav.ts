/* The v2 information architecture (docs/redesign-plan.md). Five items: the rail on desktop, the tab bar on phones.
   The "System" item is temporary: it is this design-system preview, and it leaves the rail in phase 5. */
export type NavItem={id:string;label:string;href:string;icon:string};

export const NAV:NavItem[]=[
  {id:"floor",label:"Floor",href:"/dashboard",icon:"floor"},
  {id:"q",label:"Q",href:"/chat",icon:"spark"},
  {id:"intelligence",label:"Intelligence",href:"/iq",icon:"compass"},
  {id:"alerts",label:"Alerts",href:"/alerts",icon:"bell"},
  {id:"system",label:"System",href:"/preview",icon:"grid"}
];

/** The item a path belongs to. Unknown paths fall back to the floor. */
export function navFor(path:string):NavItem{
  return NAV.find(i=>path===i.href||path.startsWith(i.href+"/"))??NAV[0];
}
