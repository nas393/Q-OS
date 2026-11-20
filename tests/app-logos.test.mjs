import test from "node:test";
import assert from "node:assert/strict";
import {existsSync} from "node:fs";
import {logoFor,logoSources} from "../src/lib/app-logos.ts";

const REGISTRY=["q-jarvis","certigo","dalil","lumeris","xauusd","novae","lep","ali-quest","radio"];

test("every registry app has a logo", () => {
  for(const id of REGISTRY)assert.ok(logoSources([id]).length>0,`${id} has no logo`);
});

test("every local logo copy exists in /public", () => {
  for(const id of [...REGISTRY,"ala-hawa"]){
    const local=logoFor(id)?.local;
    if(local)assert.ok(existsSync(new URL(`../public${local}`,import.meta.url)),`missing public${local}`);
  }
});

test("Vercel project names and ids resolve to the same logo as the registry id", () => {
  assert.deepEqual(logoSources(["counter-trader"]),logoSources(["xauusd"]));
  assert.deepEqual(logoSources(["ali-quest-battle-academy"]),logoSources(["ali-quest"]));
  assert.deepEqual(logoSources([null,"prj_fIQ16ehm4dg42uJgf0RApHS1qyMI"]),logoSources(["ala-hawa"]));
});

test("the local copy comes first, then the live icon, then discovery; no duplicates", () => {
  const s=logoSources(["lumeris"],"https://lumeris-mocha.vercel.app/favicon.svg");
  assert.deepEqual(s,["/os/apps/lumeris.svg","https://lumeris-mocha.vercel.app/favicon.svg"]);
});

test("an unknown app falls back to the discovered icon, or nothing", () => {
  assert.deepEqual(logoSources(["new-app"],"https://new.example/icon.png"),["https://new.example/icon.png"]);
  assert.deepEqual(logoSources(["new-app"]),[]);
});

test("Ali-Quest uses its own quest icon, never the platform's default favicon", () => {
  for(const src of logoSources(["ali-quest"]))assert.ok(!/favicon\.ico$/.test(src),src);
});
