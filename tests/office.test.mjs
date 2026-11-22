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

import {assigneeOf,inbox,parseApprovals} from "../src/lib/office/staff.ts";

test("tasks go to the employee named in their project; unassigned ones stay with Q", () => {
  assert.equal(assigneeOf({project:"Certigo"}),"certigo");
  assert.equal(assigneeOf({project:"NOVAE"}),"novae");   // accent-insensitive
  assert.equal(assigneeOf({project:"counter-trader"}),"xauusd");
  assert.equal(assigneeOf({project:null}),"q");
  assert.equal(assigneeOf({project:"Bank"}),"q");
});

test("approvals and late delegated tasks make a desk wait for you, with Q following up", () => {
  const d=deskFor({state:"READY",alerts:[],stats:[],today:"2026-11-23",
    approvals:[{app:"dalil",kind:"jobs",label:"Job posts to review",count:3,url:"https://d/admin"},{app:"dalil",kind:"events",label:"Events to review",count:0,url:"https://d/admin"}],
    tasks:[{id:"t1",title:"Fix pricing page",project:"Dalil",due:"2026-11-20",done:false},{id:"t2",title:"Later",project:"Dalil",due:"2026-12-01",done:false},{id:"t3",title:"Old",project:"Dalil",due:null,done:true}]});
  assert.equal(d.light,"watch");
  assert.equal(d.open.length,2);assert.equal(d.overdue.length,1);
  assert.deepEqual(d.needs.map(n=>n.kind),["approval","task"]);
  assert.equal(d.line,"Waiting for your yes: Job posts to review: 3.");
  const busy=deskFor({state:"READY",alerts:[],stats:[],tasks:[{id:"x",title:"Plan",project:"Certigo",due:null,done:false}]});
  assert.equal(busy.light,"ok");assert.match(busy.line,/On it: 1 task from you/);
});

test("the inbox lists every need, red first, then approvals, then late tasks", () => {
  const S=STAFF;
  const red=deskFor({state:"READY",alerts:[{id:9,level:"red",title:"Build failed"}],stats:[]});
  const apr=deskFor({state:"READY",alerts:[],stats:[],approvals:[{app:"radio",kind:"recipes",label:"Recipes to review",count:2,url:"https://r/admin"}]});
  const late=deskFor({state:"READY",alerts:[],stats:[],today:"2026-11-23",tasks:[{id:"t",title:"Call",project:"X",due:"2026-11-01",done:false}]});
  const box=inbox([{staff:S[1],desk:late},{staff:S[2],desk:apr},{staff:S[3],desk:red}]);
  assert.deepEqual(box.map(b=>b.need.kind),["alert","approval","task"]);
  assert.equal(box[0].need.alertId,9);
});

test("approval answers are validated and links stay on the app's own site", () => {
  const base="https://dalil.example";
  const got=parseApprovals("dalil",base,{items:[{kind:"jobs",label:"Job posts to review",count:2,url:"/admin"},{kind:"x",label:"Evil",count:1,url:"https://evil.example/x"},{kind:"bad",label:"",count:1},{kind:"neg",label:"Neg",count:-1}]});
  assert.deepEqual(got.map(g=>[g.label,g.count,g.url]),[["Job posts to review",2,"https://dalil.example/admin"],["Evil",1,"https://dalil.example"]]);
  assert.deepEqual(parseApprovals("dalil",base,{error:"Unauthorized"}),[]);
});
