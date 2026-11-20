import test from "node:test";
import assert from "node:assert/strict";
import {orbitLayout,shortName} from "../src/components/qlive/layout.ts";

const APPS=[
  ["q-jarvis","NASSIM AI HQ","ok"],["certigo","CERTIGO","ok"],["dalil","DALIL AL-BAZOURIEH","ok"],["lumeris","LUMERIS","ok"],
  ["xauusd","XAU/USD TRADING HQ","ok"],["novae","NOVAÉ","ok"],["lep","LUANDA EDGE PULSE","ok"],["ali","ALI-QUEST / CISA QUEST","crit"],
  ["radio","RADIO CEDARS","ok"],["alahawa","Ala Hawa","ok"]
].map(([id,name,state])=>({id,name,state}));

const overlaps=(placed)=>{const out=[];for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){const a=placed[i],b=placed[j];
  if(Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<46)out.push(`${a.n.id}/${b.n.id}`);}return out;};

test("short names fit orbit pills", () => {
  assert.equal(shortName("ALI-QUEST / CISA QUEST"),"ALI-QUEST");
  assert.equal(shortName("XAU/USD TRADING HQ"),"XAU/USD");
  assert.equal(shortName("DALIL AL-BAZOURIEH"),"DALIL");
  assert.equal(shortName("LUANDA EDGE PULSE"),"LUANDA EDGE");
  assert.equal(shortName("RADIO CEDARS"),"RADIO CEDARS");
});

for(const [w,h] of [[1920,1080],[1440,900],[1366,768],[1280,800],[1024,768]]){
  test(`no two app nodes overlap at ${w}x${h}`, () => {
    const {placed}=orbitLayout(APPS,w,h);
    assert.equal(placed.length,APPS.length);
    assert.deepEqual(overlaps(placed),[]);
  });
}

test("a failing app is pulled inside the ring, toward the Signals side", () => {
  const {placed,RX}=orbitLayout(APPS,1440,900);
  const ali=placed.find(p=>p.n.id==="ali");
  assert.ok(ali.x>0&&ali.x<RX*0.7,"pulled in on the right");
  assert.ok(Math.abs(ali.y)<5,"level with the core");
});

test("every app stays inside the space between the side panels", () => {
  for(const [w,h] of [[1440,900],[1280,800]]){
    const {placed,panelW}=orbitLayout(APPS,w,h);
    const half=w/2-(24+panelW+8);
    for(const p of placed)assert.ok(Math.abs(p.x)+p.w/2<=half+40,`${p.n.id} at ${w}px reaches into a side panel`);
  }
});

test("works with no failing apps and with a single app", () => {
  assert.deepEqual(overlaps(orbitLayout(APPS.map(a=>({...a,state:"ok"})),1440,900).placed),[]);
  assert.equal(orbitLayout([APPS[0]],1440,900).placed.length,1);
});
