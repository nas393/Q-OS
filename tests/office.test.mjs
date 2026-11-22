import test from "node:test";
import assert from "node:assert/strict";
import {STAFF,ROOMS,ownerOf,deskFor,standup,opsDesk} from "../src/lib/office/staff.ts";

test("every employee has a room, a role and a job, and ids are unique", () => {
  const ids=new Set();
  for(const s of STAFF){
    assert.ok(ROOMS[s.room],`${s.id} room`);assert.ok(s.role&&s.job,`${s.id} role/job`);
    assert.ok(!ids.has(s.id),`${s.id} duplicate`);ids.add(s.id);
  }
  assert.equal(STAFF[0].id,"q");
});

test("alerts go to the employee they mention, else to Ops", () => {
  assert.equal(ownerOf({level:"red",title:"Build failed: certigo-institute"}),"certigo");
  assert.equal(ownerOf({level:"amber",title:"Deploy",url:"https://vercel.com/x/radio-cedars/abc"}),"radio");
  assert.equal(ownerOf({level:"amber",title:"Gold moved -3% today"}),"xauusd");
  assert.equal(ownerOf({level:"red",title:"Database unreachable"}),"ops");
});

test("desk lights: failed deploy or red alert is down; building or amber is watch; no data is idle", () => {
  assert.equal(deskFor({state:"ERROR",alerts:[],stats:[]}).light,"down");
  assert.equal(deskFor({state:"READY",alerts:[{level:"red",title:"x"}],stats:[]}).light,"down");
  assert.equal(deskFor({state:"BUILDING",alerts:[],stats:[]}).light,"watch");
  assert.equal(deskFor({state:"READY",alerts:[{level:"amber",title:"slow"}],stats:[]}).light,"watch");
  assert.equal(deskFor({state:null,alerts:[],stats:[]}).light,"idle");
  const ok=deskFor({state:"READY",alerts:[{level:"info",title:"fyi"}],stats:[{label:"certificates",value:"12"}]});
  assert.equal(ok.light,"ok");assert.equal(ok.headline,"12 certificates");assert.match(ok.line,/All good/);
});

test("stand-up lists what needs you, red first, at most three", () => {
  const S=STAFF.slice(1,6);
  const d=S.map((s,i)=>({staff:s,desk:deskFor({state:i===3?"ERROR":i===1?"BUILDING":"READY",alerts:[],stats:[]})}));
  const r=standup(d);
  assert.equal(r.allClear,false);assert.equal(r.lines.length,2);assert.match(r.lines[0],/Needs you/);
  assert.equal(standup(S.map(s=>({staff:s,desk:deskFor({state:"READY",alerts:[],stats:[]})}))).allClear,true);
});

test("Ops speaks in the stand-up only for alerts no app owns", () => {
  const ops=STAFF.find(s=>s.id==="ops"),bad=deskFor({state:"ERROR",alerts:[],stats:[]});
  const r=standup([{staff:STAFF[1],desk:bad},{staff:ops,desk:opsDesk([bad],[])}]);
  assert.equal(r.lines.length,1);
  const r2=standup([{staff:ops,desk:opsDesk([],[{level:"red",title:"DB down"}])}]);
  assert.match(r2.lines[0],/^Ops: /);
});

test("Ops rolls up the floor", () => {
  const ok=deskFor({state:"READY",alerts:[],stats:[]}),bad=deskFor({state:"ERROR",alerts:[],stats:[]});
  assert.match(opsDesk([ok,ok],[]).line,/All 2 live apps are up/);
  const o=opsDesk([ok,bad],[]);assert.equal(o.light,"down");assert.match(o.line,/1 app needs you/);
});
