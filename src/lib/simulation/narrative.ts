/* Language-model wording for finished work. The numbers come from the simulation, so the model may reword a summary but may
   never change, drop or add a number. A reworded summary that breaks that rule is rejected and the template text is kept.
   Pure: the model call is passed in, so this file has no network or database code and can be tested directly. */
import type { SimulationState, WorkResult } from "./types.ts";

export const NARRATE_EVERY_MS = 15 * 60 * 1000;
export const NARRATE_PER_RUN = 3;
const BUDGET_MS = 5000;
const CALL_MS = 3500;

export type Ask = (system: string, user: string) => Promise<{ summary?: unknown }>;

const SYSTEM = "You write one short status line for a company's work log. Rewrite the facts you are given as one or two plain English sentences. Keep every number exactly as written. Do not add numbers, names, dates or claims that are not in the facts. Do not mention AI. Reply only with JSON: {\"summary\": \"...\"}.";

/** Every number in a text, with thousands separators removed, sorted. "€4,205k and 83%" gives ["4205", "83"]. */
export function numbersIn(text: string): string[] {
  const plain = text.replace(/(\d),(\d{3})/g, "$1$2");
  return (plain.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/** True when the candidate has the same numbers as the template and is a sensible length with nothing broken in it. */
export function keepsFacts(template: string, candidate: string): boolean {
  if (candidate.length < 20 || candidate.length > 420) return false;
  if (/undefined|NaN|null|https?:|www\./i.test(candidate)) return false;
  const want = numbersIn(template), got = numbersIn(candidate);
  return want.length === got.length && want.every((n, i) => n === got[i]);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

function promptFor(result: WorkResult, author: string): string {
  return JSON.stringify({ deliverable: result.title, department: result.department, author, facts: result.summary });
}

/**
 * Rewrites the newest unworded results, at most `perRun` per call, and at most once per `everyMs` of real time.
 * A result the model reworded is marked "ai". One that breaks the number rule is marked "template" and never retried.
 * If the model cannot be reached, the result stays unmarked and the run stops, so it is tried again later.
 */
export async function narrateResults(
  state: SimulationState,
  nowMs: number,
  ask: Ask,
  options: { everyMs?: number; perRun?: number; budgetMs?: number; callMs?: number } = {},
): Promise<SimulationState> {
  const { everyMs = NARRATE_EVERY_MS, perRun = NARRATE_PER_RUN, budgetMs = BUDGET_MS, callMs = CALL_MS } = options;
  const planner = state.planner;
  const results = state.results ?? [];
  if (!planner || results.length === 0) return state;
  if (planner.narrativeAt !== undefined && nowMs - planner.narrativeAt < everyMs) return state;
  const pending = results.filter(r => r.source === undefined).slice(-perRun);
  if (pending.length === 0) return state;

  const names = new Map(state.employees.map(e => [e.id, e.name] as const));
  const next = [...results];
  const started = Date.now();
  for (const result of pending) {
    if (Date.now() - started > budgetMs) break;
    let out: { summary?: unknown } | undefined;
    try {
      out = await withTimeout(ask(SYSTEM, promptFor(result, names.get(result.authorId) ?? "Team")), callMs);
    } catch {
      break;
    }
    const text = typeof out?.summary === "string" ? out.summary.trim() : "";
    const index = next.findIndex(r => r.id === result.id);
    next[index] = keepsFacts(result.summary, text)
      ? { ...result, summary: text, source: "ai" }
      : { ...result, source: "template" };
  }
  return { ...state, results: next, planner: { ...planner, narrativeAt: nowMs } };
}
