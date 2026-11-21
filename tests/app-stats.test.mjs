// Run: npm test
import {test} from "node:test";
import assert from "node:assert/strict";
import {certigoStats,dalilStats,listCount,visitCount,visitStat,statLine} from "../src/lib/app-stats-parse.ts";

test("Certigo public_stats → courses, certificates, checks this week",()=>{
  const s=certigoStats({courses:63,holders:2,issuers:1,credentials:4,verifications:19,verifications_7d:1});
  assert.deepEqual(s,[{label:"courses",value:"63"},{label:"certificates",value:"4"},{label:"check this week",value:"1"}]);
  assert.equal(statLine(s),"63 courses · 4 certificates · 1 check this week");
});
test("Certigo: missing or malformed answer shows nothing, never zeros",()=>{
  assert.deepEqual(certigoStats(null),[]);
  assert.deepEqual(certigoStats([1,2]),[]);
  assert.deepEqual(certigoStats({courses:"12"}),[{label:"courses",value:"12"}]);
});
test("Dalil counts its public lists; a failed list is left out",()=>{
  assert.equal(listCount([{},{},{}]),3);
  assert.equal(listCount({error:"Database unavailable"}),null);
  assert.deepEqual(dalilStats(1,0,null),[{label:"business",value:"1"},{label:"events",value:"0"}]);
});
test("Vercel page views: several response shapes; unknown shape is null",()=>{
  assert.equal(visitCount({data:{count:1204}}),1204);
  assert.equal(visitCount({count:"88"}),88);
  assert.equal(visitCount({data:[{count:10},{total:5},{x:1}]}),15);
  assert.equal(visitCount({data:{pageViews:7}}),7);
  assert.equal(visitCount({data:{browserName:"Chrome"}}),null);
  assert.equal(visitCount(null),null);
  assert.deepEqual(visitStat(1204),{label:"page views · 7 days",value:"1,204"});
});
