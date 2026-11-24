import { HR_ACTOR_ID, staffingNeeds, type RecruitAction } from "@/lib/simulation/recruit";
import type { SimulationState, StaffingRequest } from "@/lib/simulation/types";

const CEO_ACTOR_ID = "ceo";
const OPEN: StaffingRequest["status"][] = ["needs-review", "sourcing", "awaiting-approval"];
const STATUS_LABEL: Record<StaffingRequest["status"], string> = {
  "needs-review": "Waiting for HR",
  sourcing: "Head-hunter sourcing",
  "awaiting-approval": "Waiting for HR and CEO",
  hired: "Hired",
  declined: "Declined",
};

/* Fictional hiring flow for the Q Executive World. Every candidate is invented and every approval is simulated. */
export function HiringDesk({world,onAction,notice}:{world:SimulationState;onAction:(action:RecruitAction)=>void;notice:string|null}){
  const requests=world.recruitment?.requests??[];
  const nameOf=(id:string)=>world.employees.find(e=>e.id===id)?.name??id;
  const needs=staffingNeeds(world).filter(n=>!requests.some(r=>r.department===n.department&&OPEN.includes(r.status)));
  return <section className="q3d-hiring" aria-label="Hiring desk">
    <h3>Hiring desk</h3>
    <p className="q3d-hiring-note">Fictional candidates and simulated approvals. No job is posted and no real person is contacted.</p>
    {notice&&<p className="q3d-hiring-notice" role="status">{notice}</p>}
    <div className="q3d-hiring-needs">
      <h4>Needs from queued work</h4>
      {needs.length===0&&<p className="q3d-hiring-empty">Every queued skill is covered, or a request is already open.</p>}
      {needs.map(n=><article className="q3d-hire-card" key={n.department}>
        <b>{n.department}</b>
        <small>Skills needed: {n.skills.join(" · ")}</small>
        <small>Queued work: {n.taskTitles.join("; ")}</small>
        <button type="button" onClick={()=>onAction({type:"raise",requestedBy:n.requestedBy,department:n.department,roleTitle:n.roleTitle,skills:n.skills,reason:`Queued work needs ${n.skills.join(", ")}.`})}>
          {nameOf(n.requestedBy)} raises a request
        </button>
      </article>)}
    </div>
    <div className="q3d-hiring-requests">
      <h4>Requests</h4>
      {requests.length===0&&<p className="q3d-hiring-empty">No requests yet.</p>}
      {requests.map(r=>{
        const hr=r.approvals.find(a=>a.stage==="hire"&&a.by==="hr");
        const ceo=r.approvals.find(a=>a.stage==="hire"&&a.by==="ceo");
        const declinedBy=r.approvals.find(a=>a.decision==="declined");
        const chosen=r.shortlist.find(c=>c.id===r.chosenCandidateId);
        const hire=world.employees.find(e=>e.id===r.hiredEmployeeId);
        const steps:[string,boolean][]=[
          ["Raised",true],
          ["HR search",r.status!=="needs-review"],
          ["Shortlist and plan",r.shortlist.length>0],
          ["HR approval",hr?.decision==="approved"],
          ["CEO approval",ceo?.decision==="approved"],
          ["Joined",r.status==="hired"],
        ];
        const done=steps.filter(([,d])=>d).length;
        return <article className="q3d-hire-card" key={r.id}>
          <header><b>{r.roleTitle}</b><span className="q3d-hire-status" data-status={r.status}>{STATUS_LABEL[r.status]}</span></header>
          <small>{r.department} · raised by {nameOf(r.requestedBy)} · skills: {r.skills.join(" · ")}</small>
          <progress max={steps.length} value={done} aria-label={`Progress for ${r.roleTitle}`}/>
          <small>{steps.map(([label,d])=>(d?"✓ ":"○ ")+label).join("  ·  ")}</small>

          {r.status==="needs-review"&&<button type="button" onClick={()=>onAction({type:"open-search",requestId:r.id,actorId:HR_ACTOR_ID})}>HR opens the search</button>}
          {r.status==="sourcing"&&<button type="button" onClick={()=>onAction({type:"source",requestId:r.id})}>Head-hunter shortlists, training expert plans</button>}

          {r.status==="awaiting-approval"&&<>
            <ol className="q3d-shortlist" aria-label="Shortlist">
              {r.shortlist.map(c=><li key={c.id} aria-current={c.id===r.chosenCandidateId?"true":undefined}>{c.name} · {c.currentRole} · fit {c.fit}%</li>)}
            </ol>
            <small><b>Training plan for {chosen?.name??"the chosen candidate"}</b></small>
            <ul className="q3d-training">{r.trainingPlan.map(m=><li key={m.id}>{m.title} · {m.weeks} wk</li>)}</ul>
            <div className="q3d-hire-decisions">
              <span>HR: {hr?(hr.decision==="approved"?"approved":"declined"):"pending"}</span>
              <span>CEO: {ceo?(ceo.decision==="approved"?"approved":"declined"):"pending"}</span>
            </div>
            {!hr&&<div className="q3d-hire-actions">
              <button type="button" onClick={()=>onAction({type:"approve",requestId:r.id,actorId:HR_ACTOR_ID,decision:"approved"})}>HR approves</button>
              <button type="button" onClick={()=>onAction({type:"approve",requestId:r.id,actorId:HR_ACTOR_ID,decision:"declined"})}>HR declines</button>
            </div>}
            {!ceo&&<div className="q3d-hire-actions">
              <button type="button" onClick={()=>onAction({type:"approve",requestId:r.id,actorId:CEO_ACTOR_ID,decision:"approved"})}>CEO approves</button>
              <button type="button" onClick={()=>onAction({type:"approve",requestId:r.id,actorId:CEO_ACTOR_ID,decision:"declined"})}>CEO declines</button>
            </div>}
          </>}

          {r.status==="hired"&&hire&&<small>{hire.name} joined as {hire.role}, reporting to {nameOf(hire.reportsTo)}.</small>}
          {r.status==="declined"&&declinedBy&&<small>Declined by {nameOf(declinedBy.actorId)}.</small>}
        </article>;
      })}
    </div>
  </section>;
}
