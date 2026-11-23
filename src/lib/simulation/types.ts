/** Q Executive World simulation-only domain contracts. No live Q OS records are mutated here. */
export type Vec3 = { x: number; y: number; z: number };
export type EmployeeActivity = "idle" | "walking" | "working" | "meeting" | "break" | "presenting";
export type EmployeeStatus = "active" | "away" | "off-duty";
export type SimTaskStatus = "queued" | "in-progress" | "blocked" | "completed";

export type SimTask = {
  id: string; title: string; department: string; requiredSkills: string[];
  priority: number; effortRemaining: number; status: SimTaskStatus;
  assigneeId: string | null; dueAt: number | null; createdAt: number;
};
export type EmployeeAgent = {
  id: string; name: string; role: string; department: string; skills: string[];
  personality: { conscientiousness: number; sociability: number; curiosity: number };
  position: Vec3; destination: Vec3 | null; activity: EmployeeActivity; status: EmployeeStatus;
  energy: number; focus: number; morale: number; stress: number; currentTaskId: string | null;
  schedule: { startHour: number; endHour: number; breakAtHour: number }; lastDecisionAt: number;
};
export type SimulationEvent = {
  id: string; at: number;
  type: "employee.started_task" | "employee.finished_task" | "employee.started_break" | "employee.moved" | "simulation.tick";
  employeeId?: string; taskId?: string; message: string; source: "simulation";
};
export type SimulationState = {
  worldId: string; version: number; simulatedAt: number; lastWallClockAt: number;
  speed: 0 | 1 | 2 | 4; paused: boolean; employees: EmployeeAgent[]; tasks: SimTask[]; events: SimulationEvent[];
};
export type SimulationCommand =
  | { type: "pause" } | { type: "resume" } | { type: "set-speed"; speed: 0 | 1 | 2 | 4 }
  | { type: "assign-simulated-task"; taskId: string; employeeId: string }
  | { type: "call-simulated-meeting"; attendeeIds: string[]; roomPosition: Vec3 };
export type SimulationTickResult = { state: SimulationState; emitted: SimulationEvent[] };
