"use client";

import dynamic from "next/dynamic";

const QWorldView=dynamic(()=>import("./q-world-view").then(m=>m.QWorldView),{
 ssr:false,
 loading:()=> <div role="status" style={{padding:24}}>Preparing Q WORLD…</div>
});

export function QWorldEntry(){return <QWorldView/>;}
