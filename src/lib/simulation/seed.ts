import type { EmployeeAgent } from "./types";

export type LeadershipSeat = {
  id: string;
  title: string;
  department: string;
  mandate: string;
};

export const LEADERSHIP_TEAM: LeadershipSeat[] = [
  { id: "ceo", title: "Chief Executive Officer", department: "Executive", mandate: "Set company direction, resolve cross-functional trade-offs and chair executive decisions." },
  { id: "cfo", title: "Chief Financial Officer", department: "Finance", mandate: "Own simulated finance, planning, controls, reporting and resource allocation." },
  { id: "commercial-director", title: "Commercial Director", department: "Commercial", mandate: "Own revenue strategy, sales execution, customer growth and commercial performance." },
  { id: "coo", title: "Chief Operating Officer", department: "Operations", mandate: "Coordinate delivery, service levels, processes, capacity and operational resilience." },
  { id: "cso", title: "Chief Strategy Officer", department: "Strategy", mandate: "Own strategic planning, market intelligence, transformation and new opportunities." },
  { id: "chief-of-staff", title: "Chief of Staff", department: "Executive Office", mandate: "Coordinate priorities, executive cadence, follow-through and cross-team alignment." },
];

type EmployeeSeed = {
  id: string; name: string; role: string; department: string; reportsTo: string;
  skills: string[]; position: [number, number, number]; start?: number; end?: number; breakAt?: number;
};

const LEADERS: EmployeeSeed[] = [
  { id: "ceo", name: "Alex Morgan", role: "Chief Executive Officer", department: "Executive", reportsTo: "owner", skills: ["leadership", "strategy", "decisions"], position: [0, 0, 0] },
  { id: "cfo", name: "Jordan Ellis", role: "Chief Financial Officer", department: "Finance", reportsTo: "ceo", skills: ["finance", "planning", "controls"], position: [-8, 0, -4] },
  { id: "commercial-director", name: "Taylor Reed", role: "Commercial Director", department: "Commercial", reportsTo: "ceo", skills: ["sales", "marketing", "negotiation"], position: [8, 0, -4] },
  { id: "coo", name: "Morgan Blake", role: "Chief Operating Officer", department: "Operations", reportsTo: "ceo", skills: ["operations", "supply-chain", "quality"], position: [-8, 0, 4] },
  { id: "cso", name: "Casey Jordan", role: "Chief Strategy Officer", department: "Strategy", reportsTo: "ceo", skills: ["strategy", "research", "analytics"], position: [8, 0, 4] },
  { id: "chief-of-staff", name: "Riley Quinn", role: "Chief of Staff", department: "Executive Office", reportsTo: "ceo", skills: ["coordination", "communication", "planning"], position: [0, 0, -8] },
];

const WORKFORCE: EmployeeSeed[] = [
  { id: "fin-01", name: "Avery Brooks", role: "Financial Controller", department: "Finance", reportsTo: "cfo", skills: ["finance", "controls", "reporting"], position: [-12, 0, -2] },
  { id: "fin-02", name: "Jamie Carter", role: "FP&A Analyst", department: "Finance", reportsTo: "cfo", skills: ["planning", "forecasting", "analytics"], position: [-12, 0, 0] },
  { id: "fin-03", name: "Drew Parker", role: "Accounts Specialist", department: "Finance", reportsTo: "cfo", skills: ["accounting", "reconciliation"], position: [-12, 0, 2] },
  { id: "fin-04", name: "Emerson Lane", role: "Procurement Analyst", department: "Finance", reportsTo: "cfo", skills: ["procurement", "cost-analysis"], position: [-10, 0, 4] },

  { id: "com-01", name: "Harper Scott", role: "Sales Manager", department: "Commercial", reportsTo: "commercial-director", skills: ["sales", "negotiation", "crm"], position: [12, 0, -2] },
  { id: "com-02", name: "Logan Hayes", role: "Key Account Manager", department: "Commercial", reportsTo: "commercial-director", skills: ["key-accounts", "sales", "negotiation"], position: [12, 0, 0] },
  { id: "com-03", name: "Peyton Gray", role: "Marketing Manager", department: "Commercial", reportsTo: "commercial-director", skills: ["marketing", "campaigns", "brand"], position: [12, 0, 2] },
  { id: "com-04", name: "Cameron Price", role: "Customer Insights Analyst", department: "Commercial", reportsTo: "commercial-director", skills: ["research", "analytics", "crm"], position: [10, 0, 4] },

  { id: "ops-01", name: "Skyler James", role: "Operations Manager", department: "Operations", reportsTo: "coo", skills: ["operations", "process"], position: [-16, 0, -2] },
  { id: "ops-02", name: "Rowan Miller", role: "Supply Chain Planner", department: "Operations", reportsTo: "coo", skills: ["supply-chain", "planning"], position: [-16, 0, 0] },
  { id: "ops-03", name: "Finley Davis", role: "Quality Lead", department: "Operations", reportsTo: "coo", skills: ["quality", "compliance"], position: [-16, 0, 2] },
  { id: "ops-04", name: "Reese Bennett", role: "Process Improvement Analyst", department: "Operations", reportsTo: "coo", skills: ["process", "analytics"], position: [-14, 0, 4] },

  { id: "str-01", name: "Kendall Ross", role: "Strategy Manager", department: "Strategy", reportsTo: "cso", skills: ["strategy", "research"], position: [16, 0, -2] },
  { id: "str-02", name: "Micah Foster", role: "Market Intelligence Analyst", department: "Strategy", reportsTo: "cso", skills: ["research", "analytics"], position: [16, 0, 0] },
  { id: "str-03", name: "Sage Murphy", role: "Transformation Lead", department: "Strategy", reportsTo: "cso", skills: ["transformation", "project-management"], position: [16, 0, 2] },
  { id: "str-04", name: "Elliot Ward", role: "Business Development Manager", department: "Strategy", reportsTo: "cso", skills: ["business-development", "partnerships"], position: [14, 0, 4] },

  { id: "exec-01", name: "Dakota Bell", role: "Executive Assistant", department: "Executive Office", reportsTo: "chief-of-staff", skills: ["coordination", "scheduling"], position: [-2, 0, -10] },
  { id: "exec-02", name: "Alexis Cooper", role: "Project Coordinator", department: "Executive Office", reportsTo: "chief-of-staff", skills: ["project-management", "coordination"], position: [0, 0, -10] },
  { id: "exec-03", name: "River Kelly", role: "Internal Communications Specialist", department: "Executive Office", reportsTo: "chief-of-staff", skills: ["communication", "writing"], position: [2, 0, -10] },
  { id: "exec-04", name: "Blair Turner", role: "Business Analyst", department: "Executive Office", reportsTo: "chief-of-staff", skills: ["analytics", "reporting"], position: [4, 0, -10] },
];

function createAgent(seed: EmployeeSeed, index: number): EmployeeAgent {
  return {
    id: seed.id, name: seed.name, role: seed.role, department: seed.department,
    reportsTo: seed.reportsTo, tier: index < LEADERS.length ? "leadership" : "workforce",
    skills: seed.skills,
    personality: {
      conscientiousness: 62 + (index * 7) % 35,
      sociability: 42 + (index * 11) % 50,
      curiosity: 48 + (index * 13) % 45,
    },
    position: { x: seed.position[0], y: seed.position[1], z: seed.position[2] },
    destination: null, activity: "idle", status: "active",
    energy: 82 + (index * 3) % 18, focus: 75 + (index * 5) % 25,
    morale: 68 + (index * 4) % 25, stress: 8 + (index * 6) % 28,
    currentTaskId: null,
    schedule: { startHour: seed.start ?? 8, endHour: seed.end ?? 17, breakAtHour: seed.breakAt ?? 13 },
    lastDecisionAt: 0,
  };
}

/** 6 executive agents and 20 fictional employees. Every workforce member reports to one executive seat. */
export const INITIAL_EMPLOYEES: EmployeeAgent[] = [...LEADERS, ...WORKFORCE].map(createAgent);

/** Useful for org charts, reporting-line validation and workforce sizing. */
export function directReports(managerId: string): EmployeeAgent[] {
  return INITIAL_EMPLOYEES.filter((employee) => employee.reportsTo === managerId);
}

export function validateOrgChart(agents: EmployeeAgent[] = INITIAL_EMPLOYEES): string[] {
  const ids = new Set(agents.map((agent) => agent.id));
  const errors: string[] = [];
  for (const agent of agents) {
    if (agent.reportsTo !== "owner" && !ids.has(agent.reportsTo)) errors.push(agent.id + " has missing manager " + agent.reportsTo);
    if (agent.id === agent.reportsTo) errors.push(agent.id + " reports to itself");
  }
  return errors;
}
