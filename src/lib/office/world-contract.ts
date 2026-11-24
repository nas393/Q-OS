/* Shapes shared by the server actions and the page. Types only, plus one pure helper, so it is safe in both places. */
import type { RecruitAction } from "@/lib/simulation/recruit";
import type { SimulationState } from "@/lib/simulation/types";

export type WorldControl = { type: "pause" } | { type: "resume" } | { type: "speed"; speed: 1 | 2 | 4 };
export type WorldAction = RecruitAction | WorldControl;
export type WorldReply =
  | { ok: true; state: SimulationState; message: string }
  | { ok: false; error: string; state?: SimulationState };

/** What the page receives: the whole company, with only the most recent events, to keep each reply small. */
export function toView(state: SimulationState): SimulationState {
  return { ...state, events: state.events.slice(-120) };
}
