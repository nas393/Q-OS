/** Q Executive World simulation-only domain contracts. No live Q OS records are mutated here. */
export type Vec3 = { x: number; y: number; z: number };
export type EmployeeActivity = "idle" | "walking" | "working" | "meeting" | "break" | "presenting";
export type EmployeeStatus = "active" | "away" | "off-duty";
export type SimTaskStatus = "queued" | "in-progress" | "blocked" | "completed";

export type SimTask = {
  id: string; title: string; department: string; requiredSkills: string[];
  priority: number; effortRemaining: number; status: SimTaskStatus;
  assigneeId: string | null; dueAt: number | null; createdAt: number;
  /* Autopilot fields. Optional so older saved states still load. */
  projectId?: string; kind?: string; completedAt?: number | null;
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
    | "recruitment.requested" | "recruitment.search_opened" | "recruitment.shortlist_ready" | "recruitment.approval" | "recruitment.declined" | "recruitment.hired"
    | "project.opened" | "project.completed" | "work.published" | "autopilot.hiring";
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

/* Autopilot: projects are opened from fixed templates, their tasks are spawned, and finished work becomes results. */
export type ProjectStatus = "active" | "at-risk" | "done";
export type Project = {
  id: string; title: string; department: string; goal: string; ownerId: string; status: ProjectStatus;
  milestones: { id: string; title: string; done: boolean }[]; taskIds: string[]; progress: number;
  openedAt: number; completedAt: number | null;
};
export type WorkResult = {
  id: string; taskId: string; projectId: string; department: string; authorId: string; kind: string;
  title: string; summary: string; metrics: { label: string; value: string }[]; publishedAt: number; day: number;
  /* "ai" when a language model reworded the summary; "template" when it was kept as written. Unset = not yet tried. */
  source?: "ai" | "template";
};
export type CompanyKpis = {
  revenueRunRateK: number; grossMarginPct: number; pipelineCoverage: number; onTimePct: number;
  engagement: number; cashRunwayMonths: number; supplierOnTimePct: number; mttrMinutes: number;
};
export type Planner = { startedAt: number; counter: number; nextTemplate: Record<string, number>; narrativeAt?: number };

export type SimulationState = {
  worldId: string; version: number; simulatedAt: number; lastWallClockAt: number;
  speed: 0 | 1 | 2 | 4; paused: boolean; employees: EmployeeAgent[]; tasks: SimTask[]; events: SimulationEvent[];
  recruitment?: RecruitmentState;
  projects?: Project[];
  results?: WorkResult[];
  company?: CompanyKpis;
  planner?: Planner;
};
export type SimulationCommand =
  | { type: "pause" } | { type: "resume" } | { type: "set-speed"; speed: 0 | 1 | 2 | 4 }
  | { type: "assign-simulated-task"; taskId: string; employeeId: string }
  | { type: "call-simulated-meeting"; attendeeIds: string[]; roomPosition: Vec3 };
export type SimulationTickResult = { state: SimulationState; emitted: SimulationEvent[] };
