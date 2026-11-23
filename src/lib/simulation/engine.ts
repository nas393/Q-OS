import type { EmployeeAgent, SimulationEvent, SimulationState, SimulationTickResult, SimTask, Vec3 } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const moveToward = (from: Vec3, to: Vec3, maxDistance: number): Vec3 => {
  const d = distance(from, to);
  if (d <= maxDistance || d === 0) return { ...to };
  const t = maxDistance / d;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
};
const eventId = (version: number, index: number) => "sim-" + version + "-" + index;
const isOnShift = (employee: EmployeeAgent, hour: number) =>
  employee.status === "active" && hour >= employee.schedule.startHour && hour < employee.schedule.endHour;

function chooseTask(employee: EmployeeAgent, tasks: SimTask[]): SimTask | undefined {
  return tasks
    .filter((task) => task.status === "queued" && task.assigneeId === null && task.department === employee.department)
    .filter((task) => task.requiredSkills.every((skill) => employee.skills.includes(skill)))
    .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)[0];
}

/** Pure deterministic simulation slice. elapsedMs is simulation time; caller persists state and events transactionally. */
export function tickSimulation(state: SimulationState, elapsedMs: number): SimulationTickResult {
  if (state.paused || state.speed === 0 || elapsedMs <= 0) return { state, emitted: [] };
  const simulatedDelta = Math.min(elapsedMs * state.speed, 15 * 60 * 1000);
  const nextTime = state.simulatedAt + simulatedDelta;
  const hour = new Date(nextTime).getUTCHours();
  const version = state.version + 1;
  const employees = state.employees.map((e) => ({ ...e, position: { ...e.position }, destination: e.destination ? { ...e.destination } : null }));
  const tasks = state.tasks.map((t) => ({ ...t }));
  const emitted: SimulationEvent[] = [];
  const emit = (event: Omit<SimulationEvent, "id" | "at" | "source">) =>
    emitted.push({ ...event, id: eventId(version, emitted.length), at: nextTime, source: "simulation" as const });

  for (const employee of employees) {
    if (!isOnShift(employee, hour)) {
      employee.activity = "idle";
      continue;
    }
    if (employee.destination) {
      const previous = employee.position;
      employee.position = moveToward(employee.position, employee.destination, Math.max(0.05, simulatedDelta / 1000 * 0.18));
      employee.activity = "walking";
      if (distance(employee.position, employee.destination) < 0.01) {
        employee.destination = null; employee.activity = employee.currentTaskId ? "working" : "idle";
      }
      if (distance(previous, employee.position) > 0)
        emit({ type: "employee.moved", employeeId: employee.id, message: employee.name + " moved through the office." });
      continue;
    }
    if (hour === employee.schedule.breakAtHour && employee.activity !== "break") {
      employee.activity = "break"; employee.currentTaskId = null;
      employee.energy = clamp(employee.energy + 8); employee.stress = clamp(employee.stress - 7);
      emit({ type: "employee.started_break", employeeId: employee.id, message: employee.name + " took a scheduled break." });
      continue;
    }
    if (employee.activity === "break") { employee.activity = "idle"; continue; }
    let task = employee.currentTaskId ? tasks.find((t) => t.id === employee.currentTaskId) : undefined;
    if (!task || task.status !== "in-progress") {
      task = chooseTask(employee, tasks);
      if (task) {
        task.assigneeId = employee.id; task.status = "in-progress"; employee.currentTaskId = task.id; employee.activity = "working";
        emit({ type: "employee.started_task", employeeId: employee.id, taskId: task.id, message: employee.name + " started: " + task.title + "." });
      } else {
        employee.activity = "idle"; employee.energy = clamp(employee.energy - 0.2); continue;
      }
    }
    const efficiency = Math.max(0.2, employee.focus / 100) * Math.max(0.25, employee.energy / 100);
    task.effortRemaining = Math.max(0, task.effortRemaining - simulatedDelta / 60000 * efficiency);
    employee.energy = clamp(employee.energy - simulatedDelta / 60000 * 0.45);
    employee.stress = clamp(employee.stress + (task.priority >= 4 ? 0.08 : 0.02));
    if (task.effortRemaining === 0) {
      task.status = "completed"; employee.currentTaskId = null; employee.activity = "idle";
      employee.morale = clamp(employee.morale + 2);
      emit({ type: "employee.finished_task", employeeId: employee.id, taskId: task.id, message: employee.name + " completed the simulated task: " + task.title + "." });
    }
    employee.lastDecisionAt = nextTime;
  }
  emit({ type: "simulation.tick", message: "Simulation advanced." });
  return {
    state: { ...state, version, simulatedAt: nextTime, employees, tasks, events: [...state.events, ...emitted].slice(-500) },
    emitted,
  };
}
