/* The five parts of Q OS (docs/rebuild-plan.md). The rail on desktop, the tab bar on phones. */
export type NavKey="command"|"q"|"intelligence"|"alerts"|"more";
export type NavItem={key:NavKey;label:string;href:string};

export const NAV:NavItem[]=[
  {key:"command",label:"Command",href:"/"},
  {key:"q",label:"Q",href:"/q"},
  {key:"intelligence",label:"Intelligence",href:"/intelligence"},
  {key:"alerts",label:"Alerts",href:"/alerts"},
  {key:"more",label:"More",href:"/more"}
];

/* The item a path belongs to. Unknown paths fall back to Command. */
export function navFor(path:string):NavItem{
  return NAV.find(i=>i.href!=="/"&&(path===i.href||path.startsWith(i.href+"/")))??NAV[0];
}
