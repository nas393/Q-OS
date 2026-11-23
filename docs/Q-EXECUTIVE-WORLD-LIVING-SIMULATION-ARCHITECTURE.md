# Q Executive World — Living Company Simulation Architecture

**Status:** approved product direction; implementation foundation in progress  
**Decisions:** cinematic 3D · full simulation autonomy · CEO + free camera · continuous persistent world

## Product contract

Q Executive World is a persistent, playable company simulation. It is not a dashboard with avatars and it is not a representation that every simulated action happened in the real world.

Employees are autonomous inside the simulation: they choose work, move through the office, collaborate, attend meetings, take breaks, respond to simulated events and develop performance histories. The owner can enter as CEO, inspect/follow any employee, convene meetings, delegate simulated work, or switch to free camera.

Every simulated event is labelled as simulated. Real Q OS tasks, deployments, external messages, spending, permissions and business records remain separate systems. A simulated task completion never marks a real Q OS task complete.

## Experience

- Cinematic architectural quality: realistic materials, lighting, reflections, shadows, volumetric atmosphere and high-quality rigged human characters.
- Third-person CEO mode and free spectator camera, with orbit, pan, zoom, follow and focus.
- Employees visibly walk between locations, sit, stand, type, talk, present, listen, gesture, pause and react.
- Rooms have functional meaning: executive offices, open work areas, meeting rooms, collaboration lounge, operations/war room, studio and break areas.
- Character selection opens a live profile: role, goals, current activity, workload, energy, morale, skills, relationships, recent decisions and activity history.
- Time controls: pause, resume, speed presets and a clear world clock. No rewind until event-sourcing and deterministic replay are proven.

## Organisation model

The initial playable organisation is seeded with **6 AI leadership agents and 20 fictional workforce employees** across Finance, Commercial, Operations, Strategy and the Executive Office. Each fictional employee has a named identity, role, skills, personality profile, schedule, starting position and explicit reporting line. The workforce reports to the relevant executive seat; the CEO reports to the owner. The roster is fictional simulation data and does not represent real Q OS staff.

The workforce is deliberately separate from Q OS app identities and live project owners. The initial roster is a vertical-slice cast and can expand by department after performance and simulation load are measured.

### Leadership layer
- CEO: company direction and cross-functional decisions.
- CFO: finance, planning, controls and resource allocation.
- Commercial Director: revenue, sales, customers and marketing.
- COO: operations, delivery, capacity and resilience.
- CSO: strategy, intelligence and transformation.
- Chief of Staff: priorities, executive cadence and follow-through.

### Employee agent
Each agent owns:
- Stable identity, job title, department, reporting line and authority policy.
- Skills, personality traits, work preferences and collaboration relationships.
- Needs and state: energy, focus, morale, stress and workload.
- Schedule, goals, assigned simulated work, current activity and physical location.
- Short-term context and a durable decision/activity history.
- A bounded action set: choose a task, request help, invite a colleague, attend a meeting, move, work, rest, escalate or report.

### Simulation loop
1. Read durable world state and due events.
2. Advance simulation clock by elapsed real time × selected speed.
3. Evaluate schedules, agent needs, priorities, dependencies and interruptions.
4. Produce candidate actions under each employee's role policy.
5. Resolve conflicts and resource contention centrally.
6. Apply only valid state transitions.
7. Append an immutable event record and checkpoint the world.
8. Publish a compact update to connected clients.

The first runtime uses a deterministic rules engine for predictable movement, schedules and task progression. LLM reasoning is introduced behind a bounded planner interface in a later phase; model output is a proposal, never direct database mutation.

### Work and meetings
- Work items have scope, owner, skills required, priority, estimated effort, dependencies, status and simulation-only provenance.
- Employees select eligible work according to role, goals, deadline, capability and workload.
- Collaboration requires availability and compatible schedules; meetings have attendees, agenda, outcomes and follow-up work.
- Work completion is a simulated outcome with evidence in the simulation event log. It cannot mutate real Q OS tasks.

## Runtime architecture

### Client
- Three.js via React Three Fiber and Drei for scene graph, cameras, lighting, assets and animation.
- Rigged character assets with animation state machines and locomotion blending.
- Navigation mesh/pathfinding and collision-aware movement; Rapier only where physical interaction adds value.
- LOD, instancing, asset streaming, capped device pixel ratio and reduced-motion/low-power fallbacks.
- Scene reads a versioned snapshot and receives deltas; it does not own canonical state.

### Server
- Pure simulation domain package shared by worker and tests.
- Durable world state, agent state, task state, event log and checkpoints in Neon Postgres.
- A single-writer tick coordinator with leases/optimistic version checks to prevent overlapping ticks.
- Background worker/scheduler advances the world while the browser is closed. Vercel request handlers are not a permanently running game loop.
- Authenticated snapshot/action endpoints reuse existing route budget where possible; do not create new routes until route inventory and platform limits are rechecked.
- Realtime delivery is an optimization. The database and event log remain authoritative.

### Continuous time
Persist last simulated timestamp, simulation speed, pause state and world version. On each worker run, calculate elapsed time, cap catch-up per batch, process bounded ticks and persist progress. If the worker is delayed, the world catches up in bounded batches instead of silently skipping time. Pausing freezes simulation time. Owner can resume or change speed.

## Authority and safety
- Full autonomy applies to fictional/simulated employee behaviour and simulation-owned records.
- No real-world side effects from the simulation: no external communications, purchases, transfers, trading, deployment, account/access changes, publishing or edits to business records.
- All UI labels distinguish SIMULATION from LIVE Q OS DATA.
- Agent prompts and model outputs are untrusted proposals. Server-side validators enforce role scope, allowed action types, budget/time limits and data provenance.
- Audit every simulated decision; fail closed on malformed or out-of-scope proposals.

## Delivery plan and acceptance gates

### Foundation (current branch)
- Define simulation state, action/event contracts and deterministic tick engine.
- Unit-test state transitions, schedules, movement and strict simulation/live-data separation.
- Document the full architecture and quality gates.

### Phase 1 — Playable vertical slice
- Add production-grade 3D engine and cinematic asset pipeline.
- Build one complete floor with the seeded executive team and a representative subset of the 20-person fictional workforce; include walkable rooms, desks, meeting room and break area.
- Add CEO/free camera switch, select/follow employee and inspect live simulated state.
- Local deterministic simulation only; no database writes yet.
- Acceptance: real character locomotion and animation, collisions/pathfinding, smooth 60fps target on desktop and graceful mobile fallback.

### Phase 2 — Persistent company
- Add additive Neon migration only after existing pending Office/Executive Twin work is accepted and migration policy is reviewed.
- Persist world, agents, tasks, events, checkpoints and simulation clock.
- Add single-writer background tick worker, pause/resume/speed and offline catch-up.
- Acceptance: close browser, wait, reopen; world time and agent activity progress without duplicate or lost events.

### Phase 3 — Autonomous workforce
- Expand the 20-person seeded cast into a configurable workforce with departmental hiring, reporting-line changes and role-based skill profiles.
- Add bounded agent planner, role mandates, skills, schedules, memory retrieval and collaboration.
- Introduce meeting lifecycle, delegation, task dependencies, performance and emergent events.
- Add deterministic fallback when AI is unavailable.
- Acceptance: employees independently select work, coordinate, move, meet and react while staying within simulation-only authority.

### Phase 4 — CEO gameplay
- CEO avatar/third-person mode, free camera, employee follow, meeting controls, task assignment, event interventions and world timeline.
- Scenario controls and analytics, with all simulation results clearly separated from live company data.
- Acceptance: user can operate the simulated company as a playable management experience.

## Non-negotiable quality bar
- No static cubes presented as people; no teleporting employees presented as locomotion.
- No fabricated live business status or simulated activity presented as actual execution.
- No autonomous LLM action directly mutates persistent state without validation.
- No merge or production deployment until CI, preview, performance, accessibility, desktop and mobile acceptance pass.
