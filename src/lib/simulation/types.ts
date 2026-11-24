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
  id: string; name: string; role: string; department: string; reportsTo: string; tier: "leadership" | "workforce"; skills: string[];
  goal?: string; autonomyMode?: "independent" | "collaborative"; recentDecisions?: string[];
  personality: { conscientiousness: number; sociability: number; curiosity: number };
  position: Vec3; destination: Vec3 | null; activity: EmployeeActivity; status: EmployeeStatus;
  energy: number; focus: number; morale: number; stress: number; currentTaskId: string | null;
  schedule: { startHour: number; endHour: number; breakAtHour: number }; lastDecisionAt: number;
};
export type SimulationEvent = {
  id: string; at: number;
  type: "employee.started_task" | "employee.finished_task" | "employee.started_break" | "employee.moved" | "simulation.tick"
    | "recruitment.requested" | "recruitment.search_opened" | "recruitment.shortlist_ready" | "recruitment.approval" | "recruitment.declined" | "recruitment.hired";
  employeeId?: string; taskId?: string; message: string; source: "simulation";
};
/* Hiring workflow inside the fictional company. Nothing here posts a job or contacts a real person. */
export type StaffingStatus = "needs-review" | "sourcing" | "awaiting-approval" | "hired" | "declined";
export type CandidateProfile = { id: string; name: string; currentRole: string; skills: string[]; yearsExperience: number; fit: number; fictional: true };
export type TrainingModule = { id: string; title: string; weeks: number; closesSkill: string };
export type ApprovalRecord = { stage: "search" | "hire"; by: "hr" | "ceo"; actorId: string; decision: "approved" | "declined"; at: number };
export type StaffingRequest = {
  id: string; requestedBy: string; department: string; roleTitle: string; skills: string[]; reason: string;
  status: StaffingStatus; createdAt: number; shortlist: CandidateProfile[]; chosenCandidateId: string | null;
  trainingPlan: TrainingModule[]; approvals: ApprovalRecord[]; hiredEmployeeId: string | null;
};
export type RecruitmentState = { requests: StaffingRequest[]; cursor: number };
export type SimulationState = {
  worldId: string; version: number; simulatedAt: number; lastWallClockAt: number;
  speed: 0 | 1 | 2 | 4; paused: boolean; employees: EmployeeAgent[]; tasks: SimTask[]; events: SimulationEvent[];
  recruitment?: RecruitmentState;
};
export type SimulationCommand =
  | { type: "pause" } | { type: "resume" } | { type: "set-speed"; speed: 0 | 1 | 2 | 4 }
  | { type: "assign-simulated-task"; taskId: string; employeeId: string }
  | { type: "call-simulated-meeting"; attendeeIds: string[]; roomPosition: Vec3 };
export type SimulationTickResult = { state: SimulationState; emitted: SimulationEvent[] };
