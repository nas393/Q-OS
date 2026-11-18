import test from "node:test";
import assert from "node:assert/strict";
import { classifyIntent } from "../src/lib/core/intent.ts";

test("classifies explicit execution requests as action proposals", () => {
  assert.equal(classifyIntent("Create a task for tomorrow"), "action_proposal");
  assert.equal(classifyIntent("Deploy the new version"), "action_proposal");
});

test("classifies portfolio and project questions", () => {
  assert.equal(classifyIntent("Review my project portfolio"), "portfolio");
});

test("classifies research and analysis requests", () => {
  assert.equal(classifyIntent("Research the Angola wheat market"), "research");
  assert.equal(classifyIntent("Compare these two strategies and assess risk"), "analysis");
});

test("defaults ordinary messages to conversation", () => {
  assert.equal(classifyIntent("Good morning, how are you?"), "conversation");
});

test("intent classification never implies execution permission", () => {
  assert.equal(classifyIntent("Delete an old project"), "action_proposal");
});
