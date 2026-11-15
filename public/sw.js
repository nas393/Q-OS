/* NASSIM OS service worker: shows push alerts and opens the right page on tap. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
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
