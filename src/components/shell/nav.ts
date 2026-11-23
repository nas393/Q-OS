/* Q OS information architecture: the sections in the rail and the pages inside AngolaIQ.
   Pure data, shared by the rail, the breadcrumb, the command palette and the AngolaIQ sub-navigation. */
export type Section={id:string;href:string;label:string;short:string;icon:string;desc:string};

export const SECTIONS:Section[]=[
  {id:"dashboard",href:"/dashboard",label:"Command centre",short:"Today",icon:"orbit",desc:"Ecosystem, briefing, priorities and signals"},
  {id:"office",href:"/office",label:"Office",short:"Office",icon:"home",desc:"Q and the team: every app at its desk"},
  {id:"twin",href:"/twin",label:"Executive Twin",short:"Twin",icon:"spark",desc:"Your private strategic partner and executive perspectives"},
  {id:"chat",href:"/chat",label:"Q Assistant",short:"Q",icon:"spark",desc:"Conversations with Q on your live data"},
  {id:"iq",href:"/iq",label:"AngolaIQ",short:"AngolaIQ",icon:"compass",desc:"Angola market intelligence and tools"},
  {id:"brief",href:"/brief",label:"Morning brief",short:"Brief",icon:"sunrise",desc:"What needs you today, in one page"},
  {id:"alerts",href:"/alerts",label:"Alerts",short:"Alerts",icon:"bell",desc:"Every alert Q has sent or logged"}
];

export type IqPage={href:string;label:string;icon:string;group:"Intelligence"|"Strategy"|"Tools"|"Workspace";desc:string};
export const IQ_PAGES:IqPage[]=[
  {href:"/iq",label:"Overview",icon:"chart",group:"Intelligence",desc:"Indicators, briefing and action centre"},
  {href:"/iq/news",label:"News",icon:"news",group:"Intelligence",desc:"Angola business news, rated by source"},
  {href:"/iq/q-news",label:"Global Radar",icon:"globe",group:"Intelligence",desc:"Angola, Lebanon and global headlines"},
  {href:"/iq/suggest",label:"Sectors & ideas",icon:"lightbulb",group:"Strategy",desc:"Opportunities by sector and region"},
  {href:"/iq/devil",label:"Devil's Advocate",icon:"sword",group:"Strategy",desc:"Stress-test a decision before you make it"},
  {href:"/iq/map",label:"Business map",icon:"map",group:"Tools",desc:"Companies and places across Angola"},
  {href:"/iq/trade",label:"Trade",icon:"swap",group:"Tools",desc:"Imports and exports by commodity (UN Comtrade)"},
  {href:"/iq/ports",label:"Ports",icon:"anchor",group:"Tools",desc:"Vessel arrivals at Angolan ports"},
  {href:"/iq/watch",label:"Watchlist",icon:"binoc",group:"Tools",desc:"Keywords Q watches for you"},
  {href:"/iq/projects",label:"Projects",icon:"folder",group:"Workspace",desc:"Opportunities you are pursuing"},
  {href:"/iq/saved",label:"Saved",icon:"star",group:"Workspace",desc:"Analyses and items you kept"},
  {href:"/iq/sources",label:"Sources",icon:"db",group:"Workspace",desc:"Data sources and their health"}
];

export function sectionFor(path:string):Section{
  return SECTIONS.find(s=>path===s.href||path.startsWith(s.href+"/"))??SECTIONS[0];
}
/** Breadcrumb trail after "Q OS": the section, then the AngolaIQ page when inside one. */
export function crumbsFor(path:string):{label:string;href:string}[]{
  const s=sectionFor(path),out=[{label:s.label,href:s.href}];
  if(s.id==="iq"&&path!=="/iq"){const p=IQ_PAGES.find(x=>x.href===path||path.startsWith(x.href+"/"));if(p&&p.href!=="/iq")out.push({label:p.label,href:p.href});}
  return out;
}
