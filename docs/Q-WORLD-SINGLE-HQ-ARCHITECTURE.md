# Q WORLD — Single Headquarters Architecture Decision

**Status:** Proposed product direction, owner-requested on 2026-11-24  
**Decision:** Replace the multi-building campus concept with one unified Q Headquarters containing dedicated offices for every business unit.

## 1. Product principle

Q WORLD is a navigable company headquarters, not a city-building exercise. The owner should understand the whole company from one place and enter any business unit's office without travelling across a large campus.

The visual metaphor is a premium, multi-floor headquarters:
- One iconic Q HQ building as the entire world environment.
- A central reception / executive atrium as the starting point.
- A clearly legible floor directory and office navigation.
- Each business unit has its own office, identity, team presence and operational dashboard.
- Shared services and executive leadership occupy central spaces.
- Keep the experience useful in isometric management mode; third-person walking is secondary.

## 2. Proposed building programme

| Level / zone | Space | Purpose |
|---|---|---|
| Ground floor | Reception and central atrium | Entry point, company status, owner navigation |
| Ground floor | Executive Office | Owner cockpit, priorities, approvals and company-wide view |
| Floor 1 | Commercial & Growth | NOVAÉ and revenue-generating business development |
| Floor 2 | Education | CERTIGO and ALI-QUEST / CISA QUEST |
| Floor 3 | Media & Community | LUMERIS and RADIO CEDARS |
| Floor 4 | Intelligence | LUANDA EDGE PULSE and research operations |
| Floor 5 | Trading & Investment | XAU/USD Trading HQ; read-only analysis area, no autonomous trade execution |
| Floor 6 | Directory & Local Network | DALIL AL-BAZOURIEH |
| Floor 7 | Technology & Operations | Q OS / NASSIM AI HQ, platform engineering and shared infrastructure |

This is a proposed information architecture, not a claim that all teams or offices are already implemented. The floor plan can be consolidated further after the first usable prototype.

## 3. Office experience

Every office should use the same reusable office template, populated with unit-specific configuration:
- Office sign, brand colour and identity.
- Unit lead / digital employee avatar and team stations.
- Mission, mandate, current priorities and status.
- Work queue: planned, active, blocked and completed.
- Verified KPIs only when a real source is connected.
- Clearly labelled estimates / simulations when data is illustrative.
- Quick links to the real application and its existing workflows.
- Owner approval gate for external, financial or consequential actions.

No fabricated staff activity, revenue, cost, productivity or completion metrics.

## 4. Navigation and interaction

- Default landing: central atrium with the owner overview.
- Select a floor from a persistent vertical directory / lift panel.
- Select an office from the floor plan or directory.
- Office entry opens a close-up room view and its inspector panel.
- Provide a fast directory/search path so walking is never required.
- Keep keyboard, touch and screen-reader access for every navigation action.
- Isometric view remains the primary management camera; third-person mode is optional.

## 5. Visual direction

- Premium dark architectural language: charcoal stone, glass, brushed metal, restrained Q-red accents and warm executive lighting.
- One recognisable silhouette and entrance, not a sprawling campus.
- Distinct office interiors through lighting, signage, furniture and restrained brand accents.
- High-resolution detail should be concentrated in the HQ exterior, atrium, corridors and reusable office kit.
- Do not spend effort on roads, parking, perimeter landscaping or separate exterior buildings.

## 6. Technical / delivery constraints

- Preserve the current owner-only access boundary.
- Preserve existing Office and Executive Twin routes and behavior.
- Keep Q WORLD isolated to its route; lazy-load the renderer.
- No new dependencies, external asset/CDN downloads, paid services, schema migrations or new API routes without a separate approved rationale.
- Use self-authored procedural geometry or verified, properly licensed self-hosted assets.
- Keep WebGL fallback, reduced-motion support, hidden-tab render pause, DPR cap <= 1.5 and mobile performance safeguards.
- Do not alter auth/session behavior.
- No external or consequential actions without exact owner approval.
- One feature per branch / PR. No force pushes. Do not merge without green checks, an accessible preview and owner acceptance.

## 7. Migration from the campus prototype

The current multi-building scene is a prototype, not a production baseline. Retain reusable renderer primitives, camera, lighting, visual settings and business-unit metadata where useful. Replace the repeated standalone buildings and campus props with:
1. One HQ exterior shell and entrance.
2. A multi-floor interior / cutaway view.
3. A floor directory and office selection model.
4. A reusable office scene driven by the selected unit.
5. A company-wide owner overview.

Avoid polishing or expanding the separate-campus buildings further. Existing draft PRs in the campus sequence remain unmerged and must not be merged as the final product direction.

## 8. Acceptance criteria for the first single-HQ milestone

- One clearly dominant HQ building; no separate business-unit buildings.
- All business units are reachable as offices inside the same building.
- Owner can move from atrium to any office through both directory and direct selection.
- Unit identity and mission remain visible and correct.
- Office template is reusable and driven by unit metadata.
- Desktop and 390px mobile layouts remain usable.
- Keyboard-only navigation works.
- WebGL failure leaves a usable accessible office directory.
- No existing Office / Executive Twin regression.
- No invented live KPIs or unapproved external actions.
