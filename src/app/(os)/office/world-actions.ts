"use server";

import { z } from "zod";
import { readSession } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { mutateWorld } from "@/lib/office/world-store";
import { toView, type WorldAction, type WorldReply } from "@/lib/office/world-contract";
import { applyRecruitAction } from "@/lib/simulation/recruit";
import type { SimulationState } from "@/lib/simulation/types";

/* Owner-only actions for the fictional executive world. Every input is validated, and nothing here touches Q OS records. */
const id = z.string().min(1).max(40);
const recruit = z.discriminatedUnion("type", [
  z.object({ type: z.literal("raise"), requestedBy: id, department: z.string().min(1).max(60), roleTitle: z.string().min(1).max(80), skills: z.array(z.string().max(40)).max(8), reason: z.string().max(280) }),
  z.object({ type: z.literal("open-search"), requestId: id, actorId: id }),
  z.object({ type: z.literal("source"), requestId: id }),
  z.object({ type: z.literal("approve"), requestId: id, actorId: id, decision: z.enum(["approved", "declined"]) }),
]);
const control = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pause") }),
  z.object({ type: z.literal("resume") }),
  z.object({ type: z.literal("speed"), speed: z.union([z.literal(1), z.literal(2), z.literal(4)]) }),
]);
const action = z.union([recruit, control]);

async function requireOwner() {
  if (!(await readSession())) throw new Error("Unauthorized");
}

/** The company at this moment. Opening the page brings it up to date, the same as the scheduled run does. */
export async function loadWorld(): Promise<SimulationState> {
  await requireOwner();
  const { state } = await mutateWorld(current => ({ state: current, result: null }));
  return toView(state);
}

/** One change to the company: a hiring step, an approval decision, or a control (pause, resume, speed). */
export async function runWorldAction(input: unknown): Promise<WorldReply> {
  await requireOwner();
  const parsed = action.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That action is not allowed." };
  const request = parsed.data as WorldAction;
  const { result } = await mutateWorld(current => apply(current, request, Date.now()));
  if (result.ok && request.type === "approve") {
    await writeAudit({ action: "world.hire-decision", outcome: "succeeded", details: { requestId: request.requestId, decision: request.decision, actorId: request.actorId } });
  }
  return result;
}

function apply(current: SimulationState, request: WorldAction, now: number): { state: SimulationState; result: WorldReply } {
  const done = (next: SimulationState, message: string) => ({ state: next, result: { ok: true as const, state: toView(next), message } });
  if (request.type === "pause") return done({ ...current, paused: true }, "The company is paused.");
  if (request.type === "resume") return done({ ...current, paused: false }, "The company is running.");
  if (request.type === "speed") return done({ ...current, speed: request.speed, paused: false }, `Running at ${request.speed}×.`);
  const outcome = applyRecruitAction(current, request, now);
  if (!outcome.ok) return { state: current, result: { ok: false, error: outcome.error, state: toView(current) } };
  return done(outcome.state, outcome.message);
}
