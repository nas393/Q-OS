/*
 * Key pages per Vercel project, joined at runtime to each app's live production address.
 * Paths were read from each app's source code (routes / html files) on 2026-11-15.
 * Apps not listed get their home page tile only. Edit this file to add or remove buttons.
 */
export const appPages:Record<string,Array<{label:string;path:string}>>={
  "certigo":[{label:"Catalog",path:"/catalog"},{label:"Pricing",path:"/pricing"},{label:"Dashboard",path:"/dashboard"},{label:"Portal",path:"/portal"},{label:"HR",path:"/hr"},{label:"Shop",path:"/shop"},{label:"Admin",path:"/admin"}],
  "dalil-al-bazouria":[{label:"Admin",path:"/admin"},{label:"Edit",path:"/edit"}],
  "ala-hawa":[{label:"TV Remote",path:"/remote.html"},{label:"Classic",path:"/classic/index.html"},{label:"Phone",path:"/classic/phone.html"}],
  "lumeris":[{label:"Guide",path:"/guide/"},{label:"Welcome",path:"/welcome/"},{label:"Posts",path:"/posts/"},{label:"Studio",path:"/studio"}],
  "radio-cedars":[{label:"Admin",path:"/admin.html"}],
  "novae":[{label:"Book a call",path:"/book"},{label:"Studio",path:"/studio"}],
  "counter-trader":[{label:"Overview",path:"/#overview"},{label:"Track record",path:"/#record"},{label:"News",path:"/#news"},{label:"Settings",path:"/#settings"}]
};
