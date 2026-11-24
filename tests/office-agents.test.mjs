import test from "node:test";
import assert from "node:assert/strict";
import { JOBS, jobById, jobsFor, promptFor, parseWork } from "../src/lib/office/jobs.ts";
import { STAFF, ROOMS, ownerOf } from "../src/lib/office/staff.ts";

const PILOT = [
  { id: "forge", name: "Forge", role: "Backend Architect", job: "architecture-review", room: "ops" },
  { id: "shield", name: "Shield", role: "Security Engineer", job: "security-review", room: "ops" },
  { id: "quill", name: "Quill", role: "Content Creator", job: "content-plan", room: "studio" },
];

test("the three pilot employees exist, in real rooms, with their own names", () => {
  for (const p of PILOT) {
    const staff = STAFF.find(s => s.id === p.id);
    assert.ok(staff, p.id);
    assert.equal(staff.name, p.name);
    assert.equal(staff.role, p.role);
    assert.equal(staff.room, p.room);
    assert.ok(ROOMS[staff.room], `room ${staff.room}`);
    assert.deepEqual(staff.keys, [], "pilot staff own no apps, so they never take over alerts");
  }
  assert.equal(new Set(STAFF.map(s => s.name)).size, STAFF.length, "names are unique");
});

test("the pilot is appended, so existing staff keep their positions", () => {
  assert.equal(STAFF[0].id, "q");
  assert.equal(STAFF[STAFF.length - 3].id, "forge");
});

test("each pilot employee has one weekly AI job", () => {
  for (const p of PILOT) {
    const jobs = jobsFor(p.id);
    assert.equal(jobs.length, 1, p.id);
    assert.equal(jobs[0].id, p.job);
    assert.equal(jobs[0].weekly, true);
    assert.equal(jobs[0].ai, true);
    assert.ok(JOBS.some(j => j.id === p.job));
  }
});

test("each pilot prompt carries its own brief and the output shape", () => {
  for (const p of PILOT) {
    const { system, user } = promptFor(jobById(p.job), "evidence text");
    assert.ok(system.includes(`You are ${p.name}`), p.name);
    assert.ok(system.includes("JSON SHAPE"));
    assert.ok(system.includes("Return ONLY valid JSON"));
    assert.ok(user.includes("evidence text"));
  }
});

test("pilot prompts never ask for secret values", () => {
  const shield = promptFor(jobById("security-review"), "").system;
  assert.match(shield, /Never ask for, repeat or guess secret values/);
});

test("a pilot draft is kept as written, with no studio link", () => {
  const w = parseWork(jobById("architecture-review"), { summary: "One fix first.", items: [{ title: "Retry the deploy check", text: "Add a timeout and one retry." }] });
  assert.equal(w.items.length, 1);
  assert.equal(w.items[0].link, null);
});

test("pilot employees do not change who owns an existing alert", () => {
  assert.equal(ownerOf({ level: "red", title: "Database unreachable" }), "ops");
  assert.equal(ownerOf({ level: "amber", title: "Vercel build slow" }), "ops");
  assert.equal(ownerOf({ level: "red", title: "Build failed: certigo-institute" }), "certigo");
});
