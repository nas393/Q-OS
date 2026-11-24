/* Fictional candidate pool and training catalogue for the Q Executive World simulation.
   Every person here is invented for the simulation. No real person, employer or contact detail is used. */

export type CandidateSeed = { id: string; name: string; currentRole: string; skills: string[]; yearsExperience: number };

export const CANDIDATE_POOL: CandidateSeed[] = [
  { id: "cand-01", name: "Zara Mensah", currentRole: "Senior Software Engineer", skills: ["technology", "engineering", "architecture"], yearsExperience: 7 },
  { id: "cand-02", name: "Tomas Ruiz", currentRole: "Platform Reliability Engineer", skills: ["technology", "security", "operations"], yearsExperience: 5 },
  { id: "cand-03", name: "Ines Costa", currentRole: "Brand Strategist", skills: ["marketing", "brand", "campaigns"], yearsExperience: 6 },
  { id: "cand-04", name: "Kwame Asante", currentRole: "Digital Marketing Lead", skills: ["marketing", "analytics", "campaigns"], yearsExperience: 8 },
  { id: "cand-05", name: "Lina Farah", currentRole: "Corporate Counsel", skills: ["legal", "compliance", "governance"], yearsExperience: 9 },
  { id: "cand-06", name: "Omar Idris", currentRole: "Enterprise Risk Analyst", skills: ["risk", "governance", "analytics"], yearsExperience: 4 },
  { id: "cand-07", name: "Priya Raman", currentRole: "Management Accountant", skills: ["finance", "planning", "controls"], yearsExperience: 6 },
  { id: "cand-08", name: "Samuel Duarte", currentRole: "Commercial Analyst", skills: ["sales", "analytics", "negotiation"], yearsExperience: 5 },
  { id: "cand-09", name: "Helena Vidal", currentRole: "Operations Excellence Manager", skills: ["operations", "process", "quality"], yearsExperience: 10 },
  { id: "cand-10", name: "Felix Ndaye", currentRole: "Market Research Lead", skills: ["research", "strategy", "analytics"], yearsExperience: 7 },
  { id: "cand-11", name: "Aisha Bello", currentRole: "Learning Designer", skills: ["learning", "development", "communication"], yearsExperience: 6 },
  { id: "cand-12", name: "Marco Lopes", currentRole: "Talent Partner", skills: ["talent", "recruitment", "interviewing"], yearsExperience: 5 },
  { id: "cand-13", name: "Nadia Okoye", currentRole: "Data Engineer", skills: ["data-engineering", "analytics", "technology"], yearsExperience: 6 },
];

/** What the training expert prepares for each skill gap: a module title and its length in weeks. */
export const TRAINING_CATALOGUE: Record<string, { title: string; weeks: number }> = {
  technology: { title: "Platform engineering fundamentals", weeks: 3 },
  architecture: { title: "Architecture review practice", weeks: 2 },
  security: { title: "Security and access essentials", weeks: 2 },
  marketing: { title: "Brand and campaign playbook", weeks: 2 },
  brand: { title: "Brand standards workshop", weeks: 1 },
  campaigns: { title: "Campaign planning sprint", weeks: 2 },
  legal: { title: "Legal governance essentials", weeks: 2 },
  compliance: { title: "Compliance and policy training", weeks: 2 },
  governance: { title: "Board and governance basics", weeks: 1 },
  risk: { title: "Enterprise risk workshop", weeks: 2 },
  finance: { title: "Financial controls refresher", weeks: 2 },
  planning: { title: "Planning and forecasting course", weeks: 2 },
  sales: { title: "Sales method intensive", weeks: 2 },
  negotiation: { title: "Negotiation skills lab", weeks: 2 },
  operations: { title: "Operations and service standards", weeks: 2 },
  process: { title: "Process improvement practice", weeks: 2 },
  quality: { title: "Quality management essentials", weeks: 2 },
  research: { title: "Market research methods", weeks: 2 },
  strategy: { title: "Strategy frameworks workshop", weeks: 2 },
  analytics: { title: "Analytics for business decisions", weeks: 2 },
  learning: { title: "Learning design practice", weeks: 1 },
  development: { title: "Coaching and development skills", weeks: 2 },
  communication: { title: "Communication essentials", weeks: 1 },
  "data-engineering": { title: "Data pipeline fundamentals", weeks: 3 },
};

export const trainingFor = (skill: string) => TRAINING_CATALOGUE[skill] ?? { title: `${skill} foundations`, weeks: 2 };
