import test from "node:test";
import assert from "node:assert/strict";
import {parseChatWorkspace,executiveTwinSystemGuidance} from "../src/lib/chat-workspace.ts";

test("general Q remains the default workspace",()=>{
  assert.equal(parseChatWorkspace(undefined),"general");
  assert.equal(parseChatWorkspace(null),"general");
  assert.equal(parseChatWorkspace("unknown"),"general");
});

test("only the explicit Executive Twin key selects the private workspace",()=>{
  assert.equal(parseChatWorkspace("executive_twin"),"executive_twin");
});

test("Phase 1 Executive Twin is advisory-only and role-flexible",()=>{
  const guidance=executiveTwinSystemGuidance();
  assert.match(guidance,/CEO\/GM/);
  assert.match(guidance,/Devil's Advocate/);
  assert.match(guidance,/Do not execute actions/);
  assert.match(guidance,/Do not emit Q OS action tags/);
  assert.match(guidance,/separate conversation space/);
});
