/* Fictional work catalogue for the Q Executive World. Every company, account, person and number here is invented.
   Deliverables are written from templates with seeded values, so the same history always produces the same results. */
import type { CompanyKpis } from "./types";

export type TaskTemplate = { title: string; skills: string[]; effort: number; priority: number; kind: string };
export type ProjectTemplate = { key: string; title: string; goal: string; milestones: string[]; tasks: TaskTemplate[] };

export const INITIAL_COMPANY: CompanyKpis = {
  revenueRunRateK: 4200, grossMarginPct: 31.4, pipelineCoverage: 2.8, onTimePct: 92,
  engagement: 74, cashRunwayMonths: 14, supplierOnTimePct: 91, mttrMinutes: 46,
};

/** Project templates per department. Tasks need one person with all listed skills, or the work waits for a hire. */
export const PROJECT_TEMPLATES: Record<string, ProjectTemplate[]> = {
  Finance: [
    { key: "monthly-close", title: "Monthly close and forecast", goal: "Close the month and refresh the rolling forecast.", milestones: ["Ledger closed", "Reconciliations cleared", "Forecast published"], tasks: [
      { title: "Close monthly ledger", skills: ["finance", "controls"], effort: 220, priority: 4, kind: "close" },
      { title: "Clear intercompany reconciliations", skills: ["accounting", "reconciliation"], effort: 180, priority: 3, kind: "reconciliation" },
      { title: "Refresh rolling forecast", skills: ["planning", "forecasting"], effort: 260, priority: 4, kind: "forecast" }] },
    { key: "working-capital", title: "Working capital review", goal: "Free up cash in receivables and supplier terms.", milestones: ["Ageing reviewed", "Supplier terms agreed", "Benefit confirmed"], tasks: [
      { title: "Review receivables ageing", skills: ["finance", "controls"], effort: 160, priority: 3, kind: "receivables" },
      { title: "Review supplier payment terms", skills: ["procurement", "cost-analysis"], effort: 200, priority: 3, kind: "procurement" }] },
  ],
  Commercial: [
    { key: "pipeline-review", title: "Quarter pipeline review", goal: "Protect next-quarter revenue and grow key accounts.", milestones: ["Coverage checked", "Account plans agreed", "Churn explained"], tasks: [
      { title: "Review pipeline coverage", skills: ["sales", "crm"], effort: 200, priority: 4, kind: "pipeline" },
      { title: "Prepare key-account plans", skills: ["key-accounts", "negotiation"], effort: 240, priority: 3, kind: "accountPlan" },
      { title: "Analyse customer churn", skills: ["research", "analytics"], effort: 200, priority: 3, kind: "churn" }] },
    { key: "campaign-performance", title: "Campaign performance", goal: "Measure what the campaigns produced.", milestones: ["Brief approved", "Results read out", "Next moves chosen"], tasks: [
      { title: "Write campaign brief", skills: ["marketing", "campaigns"], effort: 180, priority: 3, kind: "campaignBrief" },
      { title: "Campaign results readout", skills: ["marketing", "analytics"], effort: 200, priority: 3, kind: "campaignReadout" }] },
  ],
  Operations: [
    { key: "supply-reliability", title: "Supply reliability", goal: "Lift supplier on-time delivery and line quality.", milestones: ["Delivery reviewed", "Audit complete", "Actions owned"], tasks: [
      { title: "Review supplier on-time delivery", skills: ["supply-chain", "planning"], effort: 220, priority: 4, kind: "supply" },
      { title: "Quality audit of key lines", skills: ["quality", "compliance"], effort: 200, priority: 3, kind: "quality" }] },
    { key: "process-yield", title: "Process yield programme", goal: "Find the bottlenecks and recover yield.", milestones: ["Bottlenecks mapped", "Fix proposed", "Saving confirmed"], tasks: [
      { title: "Map process bottlenecks", skills: ["process", "analytics"], effort: 240, priority: 3, kind: "process" },
      { title: "Review operations briefing", skills: ["operations"], effort: 120, priority: 2, kind: "opsReview" }] },
  ],
  Strategy: [
    { key: "market-scan", title: "Market scan", goal: "Track competitors and score growth options.", milestones: ["Moves logged", "Options scored", "Recommendation issued"], tasks: [
      { title: "Track competitor moves", skills: ["research", "analytics"], effort: 200, priority: 3, kind: "competitor" },
      { title: "Score growth opportunities", skills: ["strategy", "research"], effort: 240, priority: 4, kind: "opportunity" }] },
    { key: "partnerships", title: "Partnership pipeline", goal: "Turn partner leads into proposals.", milestones: ["Leads qualified", "Proposals sent", "Roadmap aligned"], tasks: [
      { title: "Qualify partner leads", skills: ["business-development", "partnerships"], effort: 200, priority: 3, kind: "partner" },
      { title: "Transformation roadmap check-in", skills: ["transformation", "project-management"], effort: 180, priority: 2, kind: "roadmap" }] },
  ],
  "Executive Office": [
    { key: "leadership-briefing", title: "Leadership briefing cycle", goal: "Keep the executive team aligned and the actions moving.", milestones: ["Briefing issued", "Actions tracked", "Staff informed"], tasks: [
      { title: "Draft leadership briefing", skills: ["coordination", "communication"], effort: 200, priority: 4, kind: "briefing" },
      { title: "Update action tracker", skills: ["project-management", "coordination"], effort: 150, priority: 3, kind: "actions" },
      { title: "Publish staff update", skills: ["communication", "writing"], effort: 140, priority: 2, kind: "staffUpdate" }] },
    { key: "management-reporting", title: "Management reporting", goal: "Consolidate department KPIs into one pack.", milestones: ["Data pulled", "Pack reviewed", "Pack issued"], tasks: [
      { title: "Consolidate department KPIs", skills: ["analytics", "reporting"], effort: 220, priority: 3, kind: "kpiPack" }] },
  ],
  Technology: [
    { key: "platform-reliability", title: "Platform reliability", goal: "Shorten recovery times and close access gaps.", milestones: ["Incidents reviewed", "Access reviewed", "Backlog updated"], tasks: [
      { title: "Review incidents and recovery times", skills: ["technology", "architecture"], effort: 200, priority: 4, kind: "incident" },
      { title: "Security access review", skills: ["security", "engineering"], effort: 180, priority: 3, kind: "security" }] },
    { key: "analytics-data-pipeline", title: "Analytics data pipeline", goal: "Give every department one trusted data feed.", milestones: ["Sources mapped", "Jobs built", "Alerts live"], tasks: [
      { title: "Build analytics data pipeline", skills: ["data-engineering"], effort: 300, priority: 3, kind: "dataPipeline" }] },
  ],
  "People & Culture": [
    { key: "hiring-pipeline", title: "Hiring pipeline", goal: "Fill open roles from a screened, shortlisted pool.", milestones: ["Applications screened", "Interviews run", "Offers ready"], tasks: [
      { title: "Screen talent for open roles", skills: ["talent", "recruitment"], effort: 200, priority: 4, kind: "talent" },
      { title: "Review interview feedback", skills: ["interviewing"], effort: 120, priority: 2, kind: "interview" }] },
    { key: "engagement-learning", title: "Engagement and learning", goal: "Measure how people feel and build their skills.", milestones: ["Pulse run", "Pathway designed", "First cohort started"], tasks: [
      { title: "Run engagement pulse", skills: ["people-ops", "analytics"], effort: 180, priority: 3, kind: "pulse" },
      { title: "Design learning pathway", skills: ["learning", "development"], effort: 220, priority: 3, kind: "learning" }] },
  ],
  Marketing: [
    { key: "brand-campaign", title: "Brand campaign", goal: "Brief and plan the next brand campaign.", milestones: ["Brief written", "Channels chosen", "Launch ready"], tasks: [
      { title: "Write campaign brief", skills: ["marketing", "brand"], effort: 200, priority: 3, kind: "campaignBrief" },
      { title: "Plan channel mix", skills: ["campaigns", "strategy"], effort: 180, priority: 3, kind: "channelPlan" }] },
    { key: "campaign-measurement", title: "Campaign measurement", goal: "Read out campaign results with confidence.", milestones: ["Data pulled", "Readout written"], tasks: [
      { title: "Campaign results readout", skills: ["campaigns", "analytics"], effort: 200, priority: 3, kind: "campaignReadout" }] },
  ],
  "Legal & Risk": [
    { key: "risk-register", title: "Enterprise risk register", goal: "Keep the risk register current with owners and controls.", milestones: ["Risks reviewed", "Controls agreed", "Register issued"], tasks: [
      { title: "Review enterprise risk register", skills: ["risk", "governance"], effort: 220, priority: 4, kind: "riskRegister" },
      { title: "Policy compliance check", skills: ["compliance", "legal"], effort: 180, priority: 3, kind: "compliance" }] },
    { key: "contract-review", title: "Contract review", goal: "Review key contracts before renewal.", milestones: ["Contracts read", "Flags raised"], tasks: [
      { title: "Review supplier and customer contracts", skills: ["legal", "compliance"], effort: 240, priority: 3, kind: "contract" }] },
  ],
  Executive: [
    { key: "quarterly-priorities", title: "Quarterly company priorities", goal: "Set the three priorities for the quarter.", milestones: ["Priorities drafted", "Trade-offs decided"], tasks: [
      { title: "Set quarterly company priorities", skills: ["leadership"], effort: 200, priority: 5, kind: "priorities" },
      { title: "Decide on priority trade-offs", skills: ["decisions"], effort: 160, priority: 4, kind: "decision" }] },
  ],
};

/** Deterministic random numbers from a text seed (FNV-1a hash feeding mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Deliverable = { title: string; summary: string; metrics: { label: string; value: string }[] };
export type WriterContext = { rng: () => number; co: CompanyKpis; monthName: string; day: number; author: string };

const between = (rng: () => number, min: number, max: number) => min + (max - min) * rng();
const whole = (rng: () => number, min: number, max: number) => Math.round(between(rng, min, max));
const pick = <T,>(rng: () => number, items: T[]): T => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const kEuro = (k: number) => `€${Math.round(k).toLocaleString("en-US")}k`;
const kEuroDecimal = (k: number) => `€${k.toFixed(1)}k`;
const signed = (n: number) => (n >= 0 ? "+" : "") + n;

const ACCOUNTS = ["Atlas Retail", "Bluewater Logistics", "Crescent Health", "Delta Foods", "Evergreen Telecom", "Harbor Energy", "Ironbridge Motors", "Juniper Hotels"];
const RISKS = ["supplier concentration in one region", "slower renewals in mid-market accounts", "currency exposure on imported inputs", "two large deals slipping a quarter", "rising logistics costs"];
const CAMPAIGNS = ["the autumn product launch", "the loyalty programme relaunch", "the spring brand refresh", "the partner webinar series"];
const CHANNELS = ["paid search", "email nurture", "partner co-marketing", "events and webinars"];
const LINES = ["bottling line", "packing line", "assembly cell 2", "cold store intake"];
const COMPETITORS = ["Northgate Supply", "Vantage Retail", "Summit Logistics", "Brightline Foods"];
const SEGMENTS = ["mid-market distributors", "regional grocers", "field services firms"];
const OPPORTUNITIES = ["a regional distribution partnership", "a subscription tier for small businesses", "a service contract in the north region"];
const CHURN_DRIVERS = ["price concessions at renewal", "onboarding delays in the first 60 days", "a competitor's bundled offer", "slow support response in one region"];
const THEMES = ["workload peaks", "career paths", "clarity on priorities", "recognition"];
const TRADEOFFS = ["fund the data pipeline before the new product tier", "delay one regional expansion to protect margin", "hire for quality ahead of volume growth", "keep prices flat for two more quarters"];
const PRIORITY_SETS = [
  ["grow recurring revenue", "protect gross margin", "shorten incident recovery"],
  ["close the hiring gaps in technology and marketing", "lift supplier on-time delivery", "improve engagement scores"],
  ["defend key accounts", "cut working capital days", "finish the data platform"],
];

/* One writer per deliverable kind. Writers may nudge company KPIs, so the numbers in results and dashboards agree. */
export const WRITERS: Record<string, (c: WriterContext) => Deliverable> = {
  close: c => {
    c.co.revenueRunRateK = clamp(c.co.revenueRunRateK + whole(c.rng, -35, 55), 3600, 5200);
    c.co.grossMarginPct = clamp(c.co.grossMarginPct + between(c.rng, -0.4, 0.4), 27, 36);
    const vs = whole(c.rng, -4, 6), open = whole(c.rng, 2, 11);
    return { title: `${c.monthName} ledger closed`, summary: `${c.monthName} closed on day ${c.day}. Revenue run-rate is ${kEuro(c.co.revenueRunRateK)} a month, ${signed(vs)}% against plan. ${open} reconciling items carried into the next close.`,
      metrics: [{ label: "Revenue run-rate", value: `${kEuro(c.co.revenueRunRateK)}/mo` }, { label: "Gross margin", value: `${c.co.grossMarginPct.toFixed(1)}%` }, { label: "Open items", value: String(open) }] };
  },
  reconciliation: c => {
    const matched = whole(c.rng, 14, 48), variance = between(c.rng, 0.2, 4.8);
    return { title: "Intercompany reconciliation", summary: `${matched} balances matched. ${kEuroDecimal(variance)} of unexplained variance, each item with a named owner and a clearing date.`,
      metrics: [{ label: "Balances matched", value: String(matched) }, { label: "Unexplained", value: kEuroDecimal(variance) }] };
  },
  forecast: c => {
    c.co.cashRunwayMonths = clamp(c.co.cashRunwayMonths + between(c.rng, -0.6, 0.5), 9, 24);
    const fy = (c.co.revenueRunRateK * 12) / 1000, risk = pick(c.rng, RISKS);
    return { title: "Rolling forecast refreshed", summary: `Full-year revenue is now €${fy.toFixed(1)}M on the current run-rate. Main risk: ${risk}. Cash runway holds at ${c.co.cashRunwayMonths.toFixed(1)} months.`,
      metrics: [{ label: "FY revenue (forecast)", value: `€${fy.toFixed(1)}M` }, { label: "Cash runway", value: `${c.co.cashRunwayMonths.toFixed(1)} months` }] };
  },
  receivables: c => {
    const over60 = whole(c.rng, 4, 14), escalated = whole(c.rng, 2, 7);
    return { title: "Receivables ageing review", summary: `${over60}% of receivables are over 60 days. ${escalated} accounts escalated, with payment plans agreed for three of them.`,
      metrics: [{ label: "Over 60 days", value: `${over60}%` }, { label: "Accounts escalated", value: String(escalated) }] };
  },
  procurement: c => {
    const suppliers = whole(c.rng, 3, 8), saving = whole(c.rng, 12, 64);
    return { title: "Supplier payment terms", summary: `Payment terms renegotiated with ${suppliers} suppliers. Working-capital benefit of ${kEuro(saving)} a year. Two suppliers remain on the watch list.`,
      metrics: [{ label: "Suppliers renegotiated", value: String(suppliers) }, { label: "Annual benefit", value: kEuro(saving) }] };
  },
  pipeline: c => {
    c.co.pipelineCoverage = clamp(c.co.pipelineCoverage + between(c.rng, -0.15, 0.18), 2, 3.8);
    const deals = whole(c.rng, 9, 24), atRisk = whole(c.rng, 1, 4);
    return { title: "Pipeline coverage review", summary: `Pipeline covers ${c.co.pipelineCoverage.toFixed(1)}x next quarter's target across ${deals} open opportunities. ${atRisk} deals flagged at risk, each with an owner.`,
      metrics: [{ label: "Coverage", value: `${c.co.pipelineCoverage.toFixed(1)}x` }, { label: "Open deals", value: String(deals) }] };
  },
  accountPlan: c => {
    const account = pick(c.rng, ACCOUNTS), upsell = whole(c.rng, 40, 260), accounts = whole(c.rng, 3, 6);
    return { title: "Key-account plans", summary: `Plans agreed for ${accounts} key accounts. Expansion opportunity of €${upsell}k identified with ${account}, next step booked.`,
      metrics: [{ label: "Accounts planned", value: String(accounts) }, { label: "Expansion", value: `€${upsell}k` }] };
  },
  churn: c => {
    const rate = between(c.rng, 2.1, 6.4), delta = between(c.rng, -1.1, 0.9), driver = pick(c.rng, CHURN_DRIVERS);
    return { title: "Customer churn analysis", summary: `Quarterly churn ${rate.toFixed(1)}%, ${delta < 0 ? "down" : "up"} ${Math.abs(delta).toFixed(1)} points. Top driver: ${driver}.`,
      metrics: [{ label: "Churn", value: `${rate.toFixed(1)}%` }, { label: "Change", value: `${signed(Number(delta.toFixed(1)))} pts` }] };
  },
  campaignBrief: c => {
    const campaign = pick(c.rng, CAMPAIGNS), budget = whole(c.rng, 60, 220), reach = whole(c.rng, 400, 1800);
    return { title: "Campaign brief approved", summary: `Brief approved for ${campaign}. Target reach of ${reach}k with a budget of €${budget}k across three channels.`,
      metrics: [{ label: "Target reach", value: `${reach}k` }, { label: "Budget", value: `€${budget}k` }] };
  },
  channelPlan: c => {
    const channel = pick(c.rng, CHANNELS), split = whole(c.rng, 30, 50);
    return { title: "Channel mix agreed", summary: `Channel mix agreed. ${channel} takes ${split}% of spend, with a monthly review against cost per lead.`,
      metrics: [{ label: "Lead channel", value: channel }, { label: "Share of spend", value: `${split}%` }] };
  },
  campaignReadout: c => {
    const leads = whole(c.rng, 180, 920), cpa = whole(c.rng, 18, 64), ctr = between(c.rng, 1.2, 3.9), best = pick(c.rng, CHANNELS);
    return { title: "Campaign results readout", summary: `${leads} qualified leads at €${cpa} each, click-through ${ctr.toFixed(1)}%. Best channel: ${best}.`,
      metrics: [{ label: "Qualified leads", value: String(leads) }, { label: "Cost per lead", value: `€${cpa}` }, { label: "Click-through", value: `${ctr.toFixed(1)}%` }] };
  },
  supply: c => {
    c.co.supplierOnTimePct = clamp(c.co.supplierOnTimePct + between(c.rng, -1.2, 1.2), 84, 98);
    const watch = whole(c.rng, 1, 5);
    return { title: "Supplier on-time delivery", summary: `On-time delivery ${c.co.supplierOnTimePct.toFixed(1)}% against a 95% target. ${watch} suppliers on watch, with recovery plans due this month.`,
      metrics: [{ label: "On-time delivery", value: `${c.co.supplierOnTimePct.toFixed(1)}%` }, { label: "Suppliers on watch", value: String(watch) }] };
  },
  quality: c => {
    const score = whole(c.rng, 78, 97), actions = whole(c.rng, 1, 6), closed = whole(c.rng, 0, actions);
    return { title: "Line quality audit", summary: `Audit scored ${score}/100. ${actions} corrective actions raised, ${closed} closed before sign-off.`,
      metrics: [{ label: "Audit score", value: `${score}/100` }, { label: "Actions raised", value: String(actions) }] };
  },
  process: c => {
    const gain = between(c.rng, 0.4, 2.6), yieldNow = between(c.rng, 91, 97), line = pick(c.rng, LINES), saving = whole(c.rng, 30, 140);
    return { title: "Process bottleneck map", summary: `Yield up ${gain.toFixed(1)} points to ${yieldNow.toFixed(1)}% on the ${line}. Estimated saving of ${kEuro(saving)} a year once the fix is standard.`,
      metrics: [{ label: "Yield", value: `${yieldNow.toFixed(1)}%` }, { label: "Estimated saving", value: `${kEuro(saving)}/yr` }] };
  },
  opsReview: c => {
    const actions = whole(c.rng, 3, 7);
    return { title: "Operations briefing review", summary: `Operations briefing reviewed. ${actions} actions agreed, with owners and dates recorded.`,
      metrics: [{ label: "Actions agreed", value: String(actions) }] };
  },
  competitor: c => {
    const moves = whole(c.rng, 3, 9), rival = pick(c.rng, COMPETITORS), segment = pick(c.rng, SEGMENTS);
    return { title: "Competitor moves this week", summary: `${moves} competitor moves logged. Most relevant: ${rival} piloting a bundled offer for ${segment}.`,
      metrics: [{ label: "Moves logged", value: String(moves) }] };
  },
  opportunity: c => {
    const options = whole(c.rng, 4, 8), score = whole(c.rng, 62, 91), pickOne = pick(c.rng, OPPORTUNITIES);
    return { title: "Growth options scored", summary: `${options} growth options scored on value, fit and risk. Recommend ${pickOne} (score ${score}/100) for the next steering discussion.`,
      metrics: [{ label: "Options scored", value: String(options) }, { label: "Top score", value: `${score}/100` }] };
  },
  partner: c => {
    const qualified = whole(c.rng, 4, 12), proposals = whole(c.rng, 1, 4);
    return { title: "Partner leads qualified", summary: `${qualified} partner leads qualified this month. ${proposals} moved to proposal, with decision dates agreed.`,
      metrics: [{ label: "Leads qualified", value: String(qualified) }, { label: "Proposals", value: String(proposals) }] };
  },
  roadmap: c => {
    const onTrack = whole(c.rng, 35, 80);
    return { title: "Transformation roadmap check-in", summary: `${onTrack}% of this quarter's roadmap milestones are on track. Two dependencies raised with the steering group.`,
      metrics: [{ label: "On track", value: `${onTrack}%` }] };
  },
  briefing: c => {
    const decisions = whole(c.rng, 2, 5), info = whole(c.rng, 3, 8);
    return { title: "Leadership briefing issued", summary: `Briefing issued to the executive team. ${decisions} decisions queued and ${info} items for information.`,
      metrics: [{ label: "Decisions queued", value: String(decisions) }, { label: "For information", value: String(info) }] };
  },
  actions: c => {
    const total = whole(c.rng, 18, 40), overdue = whole(c.rng, 1, 5), closed = whole(c.rng, 6, 14);
    return { title: "Action tracker update", summary: `${total} actions tracked. ${closed} closed this week; ${overdue} overdue and escalated to their executive sponsor.`,
      metrics: [{ label: "Tracked", value: String(total) }, { label: "Overdue", value: String(overdue) }] };
  },
  staffUpdate: c => {
    const read = whole(c.rng, 72, 94), questions = whole(c.rng, 1, 4);
    return { title: "Staff update published", summary: `Update sent to all employees. ${read}% read it within the first day; ${questions} questions routed to HR.`,
      metrics: [{ label: "Read rate", value: `${read}%` }, { label: "Questions routed", value: String(questions) }] };
  },
  kpiPack: c => {
    const green = whole(c.rng, 8, 14), amber = whole(c.rng, 2, 5), red = whole(c.rng, 0, 2);
    return { title: "Department KPI pack", summary: `KPI pack consolidated across ten teams: ${green} green, ${amber} amber, ${red} red. Red items each have an owner and a recovery date.`,
      metrics: [{ label: "Green", value: String(green) }, { label: "Amber", value: String(amber) }, { label: "Red", value: String(red) }] };
  },
  priorities: c => {
    const set = pick(c.rng, PRIORITY_SETS);
    return { title: "Quarterly priorities set", summary: `Three priorities set for the quarter: ${set.join("; ")}.`,
      metrics: set.map((p, i) => ({ label: `Priority ${i + 1}`, value: p })) };
  },
  decision: c => {
    const trade = pick(c.rng, TRADEOFFS);
    return { title: "Trade-off decided", summary: `Decision: ${trade}. Recorded with its rationale and a review date.`,
      metrics: [{ label: "Review", value: "next quarter" }] };
  },
  incident: c => {
    const incidents = whole(c.rng, 2, 7), before = c.co.mttrMinutes;
    c.co.mttrMinutes = clamp(before + between(c.rng, -5, 4), 25, 70);
    const dir = c.co.mttrMinutes <= before ? "down" : "up";
    return { title: "Incident and recovery review", summary: `${incidents} incidents reviewed. Mean time to recover ${c.co.mttrMinutes.toFixed(0)} minutes, ${dir} from ${before.toFixed(0)}. Two follow-ups added to the platform backlog.`,
      metrics: [{ label: "Mean time to recover", value: `${c.co.mttrMinutes.toFixed(0)} min` }, { label: "Incidents", value: String(incidents) }] };
  },
  security: c => {
    const accounts = whole(c.rng, 40, 120), removed = whole(c.rng, 3, 15);
    return { title: "Access review", summary: `Access review covered ${accounts} accounts. ${removed} stale permissions removed; no privileged access is left without an owner.`,
      metrics: [{ label: "Accounts reviewed", value: String(accounts) }, { label: "Permissions removed", value: String(removed) }] };
  },
  dataPipeline: c => {
    const sources = whole(c.rng, 5, 11), jobs = whole(c.rng, 6, 14);
    return { title: "Analytics data pipeline live", summary: `Pipeline live for ${sources} sources, with ${jobs} nightly loads and alerts on any failure.`,
      metrics: [{ label: "Sources", value: String(sources) }, { label: "Nightly jobs", value: String(jobs) }] };
  },
  talent: c => {
    const applied = whole(c.rng, 18, 42), shortlisted = whole(c.rng, 3, 8), days = whole(c.rng, 3, 7);
    return { title: "Talent screen", summary: `${applied} applications screened against open roles; ${shortlisted} candidates moved to interview. Time to first interview: ${days} days.`,
      metrics: [{ label: "Screened", value: String(applied) }, { label: "Shortlisted", value: String(shortlisted) }] };
  },
  interview: c => {
    const scorecards = whole(c.rng, 4, 9), agreed = whole(c.rng, 2, 4);
    return { title: "Interview feedback review", summary: `${scorecards} interview scorecards reviewed. Panels agree on ${agreed} hires; one role needs a second round.`,
      metrics: [{ label: "Scorecards", value: String(scorecards) }, { label: "Agreed hires", value: String(agreed) }] };
  },
  pulse: c => {
    c.co.engagement = clamp(c.co.engagement + between(c.rng, -2, 2.5), 60, 90);
    const response = whole(c.rng, 78, 95), theme = pick(c.rng, THEMES);
    return { title: "Engagement pulse", summary: `Pulse score ${c.co.engagement.toFixed(0)}/100 from a ${response}% response rate. Top theme: ${theme}.`,
      metrics: [{ label: "Pulse score", value: `${c.co.engagement.toFixed(0)}/100` }, { label: "Response rate", value: `${response}%` }] };
  },
  learning: c => {
    const enrolled = whole(c.rng, 12, 38), completion = whole(c.rng, 40, 85);
    return { title: "Learning pathway update", summary: `${enrolled} learners on the pathway; ${completion}% have completed module one.`,
      metrics: [{ label: "Learners", value: String(enrolled) }, { label: "Module one complete", value: `${completion}%` }] };
  },
  riskRegister: c => {
    const risks = whole(c.rng, 9, 16), high = whole(c.rng, 2, 6), controls = whole(c.rng, 1, 4);
    return { title: "Enterprise risk register", summary: `${risks} enterprise risks reviewed. ${high} rated high, with ${controls} new controls agreed and owners confirmed.`,
      metrics: [{ label: "Risks reviewed", value: String(risks) }, { label: "Rated high", value: String(high) }] };
  },
  compliance: c => {
    const policies = whole(c.rng, 6, 14), gaps = whole(c.rng, 0, 3);
    return { title: "Policy compliance check", summary: `${policies} policies checked. ${gaps} gaps found, each with a remediation date inside 30 days.`,
      metrics: [{ label: "Policies checked", value: String(policies) }, { label: "Gaps", value: String(gaps) }] };
  },
  contract: c => {
    const reviewed = whole(c.rng, 8, 18), flagged = whole(c.rng, 1, 5);
    return { title: "Contract review", summary: `${reviewed} supplier and customer contracts reviewed. ${flagged} flagged for negotiation, mainly on liability caps and renewal terms.`,
      metrics: [{ label: "Contracts reviewed", value: String(reviewed) }, { label: "Flagged", value: String(flagged) }] };
  },
};

/** Writes a deliverable for a kind. Unknown kinds fall back to a neutral note, so a template can never break the engine. */
export function writeDeliverable(kind: string, c: WriterContext, fallbackTitle: string): Deliverable {
  const writer = WRITERS[kind];
  if (writer) return writer(c);
  return { title: fallbackTitle, summary: "Work completed and filed.", metrics: [] };
}

/** Readable label for a task kind, shown in the results feed. */
export function kindLabel(kind: string): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}
