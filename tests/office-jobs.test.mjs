import test from "node:test";
import assert from "node:assert/strict";
import {JOBS,jobById,jobsFor,isoWeek,studioLink,promptFor,parseWork,healthReport,weeklyReview,queuePlan} from "../src/lib/office/jobs.ts";
import {STAFF,deskFor,inbox} from "../src/lib/office/staff.ts";

test("every job belongs to a real employee and ids are unique", () => {
  const ids=new Set();
  for(const j of JOBS){assert.ok(STAFF.some(s=>s.id===j.staff),j.id);assert.ok(!ids.has(j.id));ids.add(j.id);}
  assert.deepEqual(jobsFor("novae").map(j=>j.id),["week-posts"]);
});

test("ISO weeks", () => {
  assert.equal(isoWeek(new Date("2026-11-23T10:00:00Z")),"2026-W48");
  assert.equal(isoWeek(new Date("2027-01-01T10:00:00Z")),"2026-W53");
  assert.equal(isoWeek(new Date("2024-12-30T10:00:00Z")),"2025-W01");
});

test("studio links open Autopilot with the subject, only for the two Studios", () => {
  assert.equal(studioLink("novae","Posicionamento claro"),"https://novae-mu.vercel.app/studio?subject=Posicionamento%20claro");
  assert.match(studioLink("lumeris","x"),/^https:\/\/lumeris-mocha\.vercel\.app\/studio\?subject=x$/);
  assert.equal(studioLink("certigo","x"),null);
});

test("prompts carry the brand voice and the no-invention rule", () => {
  const p=promptFor(jobById("week-posts"),"Past approved subjects (do not repeat): A | B");
  assert.match(p.system,/Muitas marcas são vistas/);assert.match(p.system,/publicações/);assert.match(p.system,/Never invent/);
  assert.match(p.user,/do not repeat/);
  assert.match(promptFor(jobById("gold-note"),"").system,/ONLY numbers present in the evidence/);
});

test("AI answers are cleaned into a draft, with Studio links; an empty answer is refused", () => {
  const w=parseWork(jobById("week-posts"),{summary:"Semana",items:[{title:"  A sua marca  fala ",text:"Texto"},{title:"",text:"x"},{title:"B",text:"y"}]});
  assert.equal(w.items.length,2);assert.equal(w.items[0].title,"A sua marca fala");assert.match(w.items[0].link,/subject=A%20sua%20marca%20fala/);
  assert.throws(()=>parseWork(jobById("week-reels"),{items:[]}));
  assert.equal(parseWork(jobById("gold-note"),{items:[{title:"t",text:"x"}]}).items[0].link,null);
});

test("health report, weekly review and queue plan need no AI", () => {
  const h=healthReport({runs:96,failed:1,avgMs:4200,alerts:[{level:"red",title:"Build failed"}],stateByApp:{a:"READY",b:"ERROR"}});
  assert.match(h.summary,/2 things need you/);assert.match(h.items[0].text,/1 of 2 apps live\. Down: b/);
  const r=weeklyReview({doneWeek:4,open:[{title:"Call bank",due:"2026-11-01"}],today:"2026-11-23",approvals:[{label:"Job posts to review",count:2}],alerts:[]});
  assert.match(r.items[0].text,/1 late: Call bank/);assert.match(r.items[3].text,/Start with: Call bank/);
  const q=queuePlan([{label:"Events to review",count:1,url:"u1"},{label:"Job posts to review",count:3,url:"u2"}]);
  assert.equal(q.items[0].title,"1. Job posts to review");assert.equal(queuePlan([]).summary,"The review queue is empty.");
});

test("a waiting draft is a need: the desk waits for your yes and the inbox lists it after approvals", () => {
  const d=deskFor({state:"READY",alerts:[],stats:[],drafts:[{id:"w1",title:"3 posts for this week"}]});
  assert.equal(d.light,"watch");assert.equal(d.line,"Draft ready for your yes: 3 posts for this week.");
  const ap=deskFor({state:"READY",alerts:[],stats:[],approvals:[{app:"dalil",kind:"jobs",label:"Jobs",count:1,url:"u"}]});
  assert.deepEqual(inbox([{staff:STAFF[1],desk:d},{staff:STAFF[7],desk:ap}]).map(x=>x.need.kind),["approval","draft"]);
});
