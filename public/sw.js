/* NASSIM OS service worker: push alerts + an offline copy of the last dashboard.
 * Pages and the dashboard's GET APIs are network-first (fresh when online, last copy when offline);
 * build assets and images are cache-first. Only successful same-origin GETs are stored, and the
 * logout button clears every cache. */
const CACHE="nos-v1";
const PAGES=["/dashboard","/brief","/alerts"];
const APIS=["/api/projects","/api/tasks","/api/apps","/api/alerts"];
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
const store=(req,res)=>{if(res.ok&&res.type==="basic"){const c=res.clone();caches.open(CACHE).then(x=>x.put(req,c));}return res;};
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const u=new URL(req.url);if(u.origin!==self.location.origin)return;
  if(u.pathname.startsWith("/_next/static/")||u.pathname.startsWith("/os/")){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>store(req,r))));return;
  }
  const page=req.mode==="navigate"&&PAGES.includes(u.pathname),api=APIS.includes(u.pathname);
  if(!page&&!api)return;
  e.respondWith(fetch(req).then(r=>store(req,r)).catch(()=>caches.match(req,{ignoreSearch:page}).then(hit=>hit||new Response(page?"<!doctype html><meta name=viewport content='width=device-width'><body style='background:#070708;color:#eee;font:16px system-ui;padding:24px'>Offline, and no saved copy yet. Open the dashboard once while online.":JSON.stringify({error:"Offline"}),{status:503,headers:{"Content-Type":page?"text/html":"application/json"}}))));
});
self.addEventListener("message",e=>{if(e.data==="clear-cache")e.waitUntil(caches.delete(CACHE));});
self.addEventListener("push",e=>{
  let d={};try{d=e.data?e.data.json():{};}catch{d={title:"NASSIM OS",body:e.data?e.data.text():""};}
  e.waitUntil(self.registration.showNotification(d.title||"NASSIM OS",{body:d.body||"",icon:"/icon-192.png",badge:"/icon-192.png",tag:d.tag,data:{url:d.url||"/dashboard"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=new URL(e.notification.data?.url||"/dashboard",self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    const same=list.find(c=>c.url.startsWith(self.location.origin));
    if(same&&url.startsWith(self.location.origin)){same.navigate(url);return same.focus();}
    return self.clients.openWindow(url);
  }));
});
