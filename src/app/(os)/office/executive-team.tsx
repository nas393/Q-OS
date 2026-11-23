"use client";

import Link from "next/link";
import { QMark } from "@/components/shell/q-mark";

const TEAM = [
  { id:"ceo", title:"CEO / General Manager", area:"Executive leadership", mission:"Translate the owner's direction into priorities, operating targets and accountable decisions.", focus:"Strategy · Leadership · Performance", reports:"Owner", code:"CEO" },
  { id:"cfo", title:"Chief Financial Officer", area:"Finance", mission:"Challenge budgets, cash, margins, unit economics and investment cases.", focus:"Cash · Profitability · CAPEX", reports:"Q / Owner", code:"CFO" },
  { id:"commercial", title:"Commercial Director", area:"Revenue", mission:"Drive revenue quality through pricing, channels, customers, distribution and trade execution.", focus:"Revenue · Margin · RTM", reports:"CEO / GM", code:"COM" },
  { id:"coo", title:"Chief Operating Officer", area:"Operations", mission:"Convert plans into reliable delivery across supply chain, production, service and execution.", focus:"Service · Cost · Productivity", reports:"CEO / GM", code:"COO" },
  { id:"cso", title:"Chief Strategy Officer", area:"Strategy", mission:"Evaluate strategic options, portfolio choices, market shifts and long-term advantage.", focus:"Scenarios · Growth · Portfolio", reports:"CEO / GM", code:"CSO" },
  { id:"chief_of_staff", title:"Chief of Staff", area:"Coordination", mission:"Coordinate priorities, prepare briefings, track decisions and surface dependencies.", focus:"Priorities · Decisions · Follow-up", reports:"Q / Owner", code:"COS" },
  { id:"sales_analyst", title:"Sales & BI Analyst", area:"Commercial intelligence", mission:"Analyse sales, customers, channels, pricing, promotions, forecasts and performance files.", focus:"Sales data · Forecasts · Reports", reports:"Commercial Director", code:"BI" },
  { id:"negotiator", title:"Negotiator", area:"Commercial strategy", mission:"Prepare negotiation positions, counterarguments, concessions and deal scenarios.", focus:"Terms · Leverage · Deal strategy", reports:"Commercial Director / Owner", code:"NEG" },
  { id:"devils_advocate", title:"Devil's Advocate", area:"Independent challenge", mission:"Stress-test proposals, expose blind spots and make the strongest opposing case.", focus:"Risks · Assumptions · Resilience", reports:"Owner", code:"DA" }
] as const;

export function ExecutiveTeam() {
  return <section className="of-ai-team" aria-labelledby="of-ai-title">
    <div className="of-ai-head">
      <div><span className="of-ai-kicker">Q EXECUTIVE OFFICE</span><h2 id="of-ai-title">Your AI leadership team</h2>
        <p>Dedicated executive roles with defined mandates. Select an employee to open their private workspace.</p></div>
      <div className="of-ai-commander"><QMark size={34}/><div><b>Q</b><small>Executive Commander</small><em>Coordinates the office</em></div></div>
    </div>
    <div className="of-ai-grid">
      {TEAM.map((person) => <article className="of-ai-card" key={person.id}>
        <div className="of-ai-card-top"><span className="of-ai-avatar">{person.code}</span><span className="of-ai-state"><i/>AI employee</span></div>
        <span className="of-ai-area">{person.area}</span>
        <h3>{person.title}</h3>
        <p>{person.mission}</p>
        <div className="of-ai-focus">{person.focus}</div>
        <small className="of-ai-reports">Reports to: {person.reports}</small>
        <Link className="btn ghost sm of-ai-open" href={`/twin?role=${person.id}`}>Open workspace <span aria-hidden="true">↗</span></Link>
      </article>)}
    </div>
    <p className="of-ai-boundary">Current capability: role-specific analysis and planning. Delegated multi-agent execution, shared employee memory and autonomous actions are not enabled yet. Owner approval remains mandatory for consequential actions.</p>
  </section>;
}
