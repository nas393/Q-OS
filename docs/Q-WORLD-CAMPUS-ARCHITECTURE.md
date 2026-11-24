# Q WORLD — Campus Simulator Architecture

**Product direction:** hybrid cinematic/stylised game world · isometric management + third-person exploration · connected business campus.

## Product contract

Q WORLD is the playable operating environment for Q, the company. Q OS remains the source of truth for real applications, projects, tasks, deployments, approvals and verified business data. The campus is a new presentation and simulation layer; it must never silently replace or mutate existing workflows.

The user's portfolio applications are represented as digital employees/business units. Each unit will have an identity, department, mandate, owner-approved missions, workload, operating cost and measurable contribution. The initial 3D foundation uses labelled, stylised representations; it does not invent real people or imply autonomous work has occurred.

## Two camera modes

- **Isometric management:** campus overview, department selection, app/employee inspection, workload and KPI overlays.
- **Third-person exploration:** owner-controlled walk-through with keyboard and touch-friendly movement, collision boundaries and focus/inspect interactions.
- Both modes share one world model and selected entity. Camera changes never alter business data.

## Campus layout

1. **Q Headquarters:** owner command suite, Executive Twin room, decision room.
2. **Revenue district:** NOVAÉ, LUMERIS and commercial/product workspaces.
3. **Education district:** CERTIGO and learning operations.
4. **Intelligence district:** Angola Edge / Luanda Price Intel and market research.
5. **Trading and investment wing:** Counter-Trader / XAUUSD, isolated and read-only.
6. **Media and community district:** Radio Cedars, DALIL AL-BAZOURIEH and creator/community projects.
7. **Operations and technology hub:** Q OS, platform engineering, deployment and reliability.

The campus begins as one connected, walkable map. Additional city blocks and external customer/market zones are future expansions.

## Technical architecture

- Next.js App Router route at `/q-world`, inside the existing owner-authenticated OS shell.
- Isolated client scene, loaded only on the Q WORLD route. Existing `/office` remains unchanged and available as a fallback.
- First vertical slice uses a self-contained WebGL renderer and procedural, self-authored geometry. No remote model downloads, external asset CDN, new API routes, database migrations or new paid services in this PR.
- Renderer caps device pixel ratio at 1.5, pauses rendering when the document is hidden, responds to reduced-motion preferences, and presents accessible DOM controls and a non-WebGL fallback.
- Scene data is typed and separated from rendering. Later phases can move the renderer to Three.js / React Three Fiber once dependency, bundle, lockfile and performance budgets are validated.
- Live Q OS data enters through explicit read-only adapters. Simulation projections are labelled **SIMULATION** and are never blended with verified business data.

## Business and employee model

Every portfolio app is a digital employee / business unit, not a human staff claim. Its future profile includes:
- stable app identity and department;
- mandate, capabilities and service/product offering;
- approved missions and dependencies;
- workload, operating cost and monetisation model;
- verified revenue, gross margin, customers and conversion where source systems provide them;
- data freshness, source and confidence.

No KPI is fabricated. Missing data displays as unavailable. Forecasts and scenario results are visibly marked as estimates or simulations. Financial contribution is not inferred from deploy status or task counts.

## Governance and security

- Reuse the existing owner-only OS authentication; do not change sessions, roles or access controls.
- The 3D scene is read-only in this first PR. No external communications, publishing, spending, trading, deployment, permission changes or edits to real business records.
- Any future consequential action requires exact, explicit owner approval bound to the action and payload.
- Simulated tasks and events are stored separately from real Q OS tasks and activity.
- AI output is a proposal only; server-side validation and audit are required before any future state transition.

## Delivery phases

### PR 1 — Campus foundation (this PR)
- Separate `/q-world` route and navigation entry.
- Responsive 3D campus, isometric management and third-person follow-camera modes.
- Stylised low-poly business-unit avatars and department buildings, with accessible selection/inspection.
- Owner Visual Director: environment preset, building colour treatment, lighting, camera zoom, graphics quality and campus-label visibility; settings persist locally in the browser.
- Reduced-motion, WebGL fallback, hidden-tab pause, DPR cap.
- No persistence, AI autonomy or real-world side effects.

### PR 2 — Employee identity and business units
- Map the real portfolio registry into typed app-employee profiles.
- Department mandates, ownership, app links and current operational status.
- Display only verified source metrics with provenance and freshness.

### PR 3 — Missions and simulation engine
- Simulation-only task lifecycle, schedules, bounded movement and deterministic progression.
- Explicit separation from Q OS tasks and business records.

### PR 4 — Business economy
- Product/service catalogue, customer acquisition, conversion, revenue, cost, gross margin and cash-flow scenarios.
- Actuals and forecasts shown separately; no synthetic actuals.

### PR 5 — Persistent world and executive gameplay
- Neon persistence, event log, versioned snapshots and single-writer tick coordinator.
- Owner missions, meetings, interventions and controlled AI planning.
- External and consequential actions remain approval-gated.

## Acceptance gates

- Existing Q OS routes and Office workflows remain unchanged.
- `npm test`, `npx tsc --noEmit`, `npx eslint .`, production build all pass.
- axe WCAG 2 A/AA reports zero violations on `/q-world`.
- Preview is opened and tested at desktop and 390px mobile.
- WebGL failure, keyboard-only operation, reduced motion, hidden-tab pause and Visual Director settings persistence are verified.
- No merge until the preview is accessible and all required checks are green.