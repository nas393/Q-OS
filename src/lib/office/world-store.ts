/* Server-side storage for the fictional Q Executive World. One row, versioned: a save only lands if nobody else
   saved since it was read, so two visitors (or a visit and the scheduled run) can never overwrite each other. */
import { getDb } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { advanceWorld, createWorld } from "@/lib/simulation/autopilot";
import type { SimulationState } from "@/lib/simulation/types";

export const WORLD_ID = "q-executive-world";
const ATTEMPTS = 3;

type Stored = { state: SimulationState; revision: number };
export type Change<T> = (state: SimulationState, nowMs: number) => { state: SimulationState; result: T };

async function readRow(): Promise<Stored | null> {
  const { rows } = await getDb().query("SELECT state, revision FROM q_world_state WHERE id = $1", [WORLD_ID]);
  return rows[0] ? { state: rows[0].state as SimulationState, revision: Number(rows[0].revision) } : null;
}

async function loadOrCreate(nowMs: number): Promise<Stored> {
  await ensureSchema();
  const existing = await readRow();
  if (existing) return existing;
  await getDb().query(
    "INSERT INTO q_world_state (id, state, revision) VALUES ($1, $2::jsonb, 1) ON CONFLICT (id) DO NOTHING",
    [WORLD_ID, JSON.stringify(createWorld(nowMs))],
  );
  const created = await readRow();
  if (!created) throw new Error("The executive world could not be created.");
  return created;
}

async function save(state: SimulationState, expectedRevision: number): Promise<boolean> {
  const { rowCount } = await getDb().query(
    "UPDATE q_world_state SET state = $2::jsonb, revision = revision + 1, updated_at = now() WHERE id = $1 AND revision = $3",
    [WORLD_ID, JSON.stringify(state), expectedRevision],
  );
  return rowCount === 1;
}

/** Brings the company up to the present, applies one change, and saves. Retries if someone else saved first. */
export async function mutateWorld<T>(change: Change<T>, nowMs: number = Date.now()): Promise<{ state: SimulationState; result: T }> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const stored = await loadOrCreate(nowMs);
    const advanced = advanceWorld(stored.state, nowMs);
    const { state, result } = change(advanced, nowMs);
    if (await save(state, stored.revision)) return { state, result };
  }
  throw new Error("The executive world was busy. Try again.");
}

/** Used by the scheduled run: the company keeps working even when nobody has the page open. */
export async function advanceStoredWorld(nowMs: number = Date.now()): Promise<void> {
  await mutateWorld(state => ({ state, result: null }), nowMs);
}
