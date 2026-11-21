// Run: npm test  (node --test with built-in TypeScript type stripping; no extra dependencies)
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateBuilds,firstBuildError,alertBody,toAlert} from "../src/lib/build-alerts.ts";

const dep=(uid,state,created,{target=null,ref="stage1/implementation",sha="a0864881aaaaaaa",msg="msg",project="q-jarvis"}={})=>({
  uid,name:project,projectId:`prj_${project}`,state,target,created,inspectorUrl:`vercel.com/nas393s-projects/${project}/${uid}`,
  meta:{githubCommitRef:ref,githubCommitSha:sha,githubCommitMessage:msg}
});

test("ERROR then READY on the same branch → no alert (the 16 Nov false alarm)",()=>{
  const r=evaluateBuilds([
    dep("dpl_5MqeQ6Eg57HBMHAoXjRSkz4v77Wb","ERROR",1794830220000,{sha:"a0864881"}),
    dep("dpl_34h7MMF8fE9pyUB8c4fXa2Mcijbd","READY",1794830256329,{sha:"de134c33"})
  ]);
  assert.deepEqual(r.alerts,[]);
  assert.deepEqual(r.clearedKeys,["prj_q-jarvis@stage1/implementation"]);
});

test("READY then ERROR on the same branch → alert (non-urgent, preview)",()=>{
  const r=evaluateBuilds([dep("d1","READY",1000),dep("d2","ERROR",2000,{msg:"Break it\n\nbody"})]);
  assert.equal(r.alerts.length,1);
  assert.equal(r.alerts[0].id,"d2");
  assert.equal(r.alerts[0].urgent,false);
  assert.equal(r.alerts[0].target,"preview");
  assert.equal(r.alerts[0].message,"Break it");
  assert.equal(r.alerts[0].sha,"a086488");
  assert.equal(r.alerts[0].inspectorUrl,"https://vercel.com/nas393s-projects/q-jarvis/d2");
});

test("production ERROR → immediate alert, even if a later READY exists",()=>{
  const r=evaluateBuilds([dep("p1","ERROR",1000,{target:"production",ref:"main"}),dep("p2","READY",2000,{target:"production",ref:"main"})]);
  assert.equal(r.alerts.length,1);
  assert.equal(r.alerts[0].urgent,true);
  assert.equal(r.alerts[0].target,"production");
});

test("production ERROR that is also the newest is reported once, not twice",()=>{
  const r=evaluateBuilds([dep("p1","ERROR",1000,{target:"production",ref:"main"})]);
  assert.equal(r.alerts.length,1);
});

test("branches and projects are independent; CANCELED is ignored",()=>{
  const r=evaluateBuilds([
    dep("a1","ERROR",1000,{ref:"feat/a"}),
    dep("b1","ERROR",1000,{ref:"feat/b"}),dep("b2","READY",2000,{ref:"feat/b"}),
    dep("c1","ERROR",1000,{ref:"feat/a",project:"lumeris"}),dep("c2","CANCELED",3000,{ref:"feat/a",project:"lumeris"})
  ]);
  assert.deepEqual(r.alerts.map(a=>a.id).sort(),["a1","c1"]);
});

test("first build-log error line → file:line:col + rule (real dpl_5Mqe… events)",()=>{
  const events=JSON.parse(readFileSync(new URL("./fixtures/dpl_5MqeQ6Eg57HBMHAoXjRSkz4v77Wb.events.json",import.meta.url),"utf8"));
  const line=firstBuildError(events);
  assert.match(line,/^src\/app\/iq\/trade\/page\.tsx:48:42 react\/no-unescaped-entities: /);
});

test("falls back to the generic spawn error, or null when there is no error",()=>{
  assert.match(firstBuildError([{text:"Error: [BUILD_UTILS_SPAWN_1] Command \"x\" exited with 1",level:"error"}]),/BUILD_UTILS_SPAWN_1/);
  assert.equal(firstBuildError([{text:"ok"}]),null);
  assert.equal(firstBuildError([{text:"src/x.ts(3,5): error TS2322: Type 'a' is not assignable",level:"error"}]),"src/x.ts(3,5): error TS2322: Type 'a' is not assignable");
});

test("alert body carries branch, short SHA, first line of commit and the log line",()=>{
  const a=toAlert(dep("d2","ERROR",2000,{msg:"Add trade page\nmore"}));
  const body=alertBody(a,"src/app/iq/trade/page.tsx:48:42 react/no-unescaped-entities: …");
  assert.match(body,/stage1\/implementation @ a086488 · Add trade page/);
  assert.match(body,/page\.tsx:48:42 react\/no-unescaped-entities/);
});

/* ---- Old alerts are closed once a newer build on the branch is READY ---- */
import {deploymentIdFromInspector,isSuperseded} from "../src/lib/build-alerts.ts";

test("inspector URL → deployment id; anything else → null",()=>{
  assert.equal(deploymentIdFromInspector("https://vercel.com/nas393s-projects/q-jarvis/5MqeQ6Eg57HBMHAoXjRSkz4v77Wb"),"dpl_5MqeQ6Eg57HBMHAoXjRSkz4v77Wb");
  assert.equal(deploymentIdFromInspector("https://vercel.com/nas393s-projects/q-jarvis/5MqeQ6Eg57HBMHAoXjRSkz4v77Wb/"),"dpl_5MqeQ6Eg57HBMHAoXjRSkz4v77Wb");
  assert.equal(deploymentIdFromInspector("/dashboard"),null);
  assert.equal(deploymentIdFromInspector("https://example.com/a/b/5MqeQ6Eg57HBMHAoXjRSkz4v77Wb"),null);
});

test("the 16 Nov q-jarvis alert is superseded by the READY build a minute later",()=>{
  const failed={...dep("dpl_5MqeQ6Eg57HBMHAoXjRSkz4v77Wb","ERROR",1794830221661),readyState:"ERROR",state:undefined};
  assert.equal(isSuperseded(failed,[dep("dpl_34h7MMF8fE9pyUB8c4fXa2Mcijbd","READY",1794830256329)]),true);
});

test("not superseded by a newer failure, an older READY, or another branch",()=>{
  const failed=dep("dpl_A","ERROR",2000);
  assert.equal(isSuperseded(failed,[dep("dpl_B","ERROR",3000)]),false);
  assert.equal(isSuperseded(failed,[dep("dpl_C","READY",1000)]),false);
  assert.equal(isSuperseded(failed,[dep("dpl_D","READY",3000,{ref:"main"})]),false);
  assert.equal(isSuperseded(failed,[dep("dpl_E","BUILDING",3000)]),false);
});

test("a production failure is closed only by a newer READY production build",()=>{
  const failed=dep("dpl_P","ERROR",2000,{target:"production",ref:"main"});
  assert.equal(isSuperseded(failed,[dep("dpl_Q","READY",3000,{ref:"main"})]),false);
  assert.equal(isSuperseded(failed,[dep("dpl_R","READY",3000,{target:"production",ref:"main"})]),true);
});

test("matches across the q-jarvis → q-os rename and when list items omit projectId",()=>{
  const failed=dep("dpl_A","ERROR",2000,{project:"q-jarvis"});
  const renamed={...dep("dpl_B","READY",3000,{project:"q-os"}),projectId:"prj_q-jarvis"};
  const noId={...dep("dpl_C","READY",3000,{project:"q-os"}),projectId:undefined};
  assert.equal(isSuperseded(failed,[renamed]),true);
  assert.equal(isSuperseded(failed,[noId]),true);
  assert.equal(isSuperseded(failed,[{...dep("dpl_D","READY",3000),projectId:"prj_other"}]),false);
});
