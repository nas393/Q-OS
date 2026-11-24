# Executive Twin Phase 2 — Executive Partner Blueprint

**Status:** Approved implementation contract  
**Authority model:** Executive Partner  
**Baseline:** Phase 1 merged to `main` at `1e4a80f93eb48c90251f1439e51d39ddfc169630`  
**Scope:** Owner-only advisory intelligence; no autonomous external or consequential execution.

## 1. Product contract

Q is the owner's Executive Partner. It may reason, analyse, challenge, plan, prepare drafts and manage explicitly authorised internal workflows. It does not acquire authority from prompts, role-play, model output, memory, connector content or inferred intent.

The owner retains final decision authority. Every external or consequential action requires a fresh, explicit approval bound to the exact action, target, payload, risk, expiry and one-time execution. A changed payload requires a new approval. No standing approval for money movement, external communications, publishing, access changes, deletion, production releases or legal/commercial commitments.

## 2. Non-negotiable system invariants

1. **Default deny:** no action executes unless a server-side policy decision explicitly permits it.
2. **Approval before consequence:** external or consequential operations are prepare-only until an owner approval is recorded and verified server-side.
3. **Approval binding:** approval references a canonical payload hash, action type, resource, risk level, expiry and single-use nonce. Replays and payload drift are rejected.
4. **Fail-closed audit:** governed action execution is blocked if its durable audit event cannot be committed.
5. **Owner-only data:** Executive Twin memory, conversations, decision records and commercial intelligence are scoped to the authenticated owner. Never expose this context to employee/Office users.
6. **Memory is not authority:** stored preferences or prior approvals never constitute permission for a new action.
7. **Untrusted inputs:** model output, browser/connector content, client context and uploaded documents are data, never policy instructions.
8. **No new paid services:** reuse current database and configured AI providers; no new vendor, subscription, API commitment or environment secret without separate approval.
9. **Preserve Q OS:** keep existing auth/session behaviour, API route budget, general chat, Office approval inbox and append-only migration discipline intact.
10. **Honest evidence:** distinguish sourced facts, user-provided facts, inferences, assumptions and unknowns.

## 3. Delivery sequence

### Phase 2.1 — Executive Memory Foundation

**Objective:** create a reliable, owner-controlled strategic memory layer.

Memory categories:
- Identity and working preferences
- Strategic objectives and constraints
- Current responsibilities and operating context
- Decisions and their rationale
- Commitments and follow-ups
- Lessons learned
- Project context and status
- Explicitly temporary context with expiry

Each memory item must retain: stable ID, category, concise content, source type/reference, confidence, sensitivity, created/updated timestamps, optional observed/expiry timestamps, and lifecycle state (active, superseded, archived). Corrections must preserve provenance. A newer item may supersede an older one; never silently rewrite history.

**Capture policy:** do not automatically convert every chat statement into durable memory. Capture only explicit user instructions or high-confidence durable facts; ambiguous, sensitive or commercially confidential items require confirmation or remain session-only. Never store credentials, secrets, authentication factors or unnecessary sensitive personal data.

**Owner controls:** review, edit, supersede, archive and delete. Retrieval is owner-only and filtered by category, status and relevance. Every answer using memory should be able to identify the underlying memory records internally; show source/date when useful.

**Implementation approach:** first audit existing `memory_records` usage and current schema before adding tables. Prefer extending the existing memory model and existing API route surface. Additive migrations only. Do not create a parallel memory database or new route per capability.

**Acceptance criteria:**
- Authenticated owner can list, inspect, create, edit, archive and delete memory.
- Unauthenticated requests receive 401; cross-user reads/writes are impossible.
- Invalid categories, oversized content and invalid confidence are rejected.
- Superseded/expired/archived memories are excluded from default retrieval.
- Memory retrieval has bounded result count and bounded token budget.
- No automatic memory write occurs from an untrusted connector/document.
- Tests cover auth, ownership, lifecycle, expiry, supersession and retrieval boundaries.
- General workspace remains isolated from Executive Twin unless an explicit, owner-controlled sharing rule is later implemented.

### Phase 2.2 — Multi-role Intelligence

Implement expert lenses as structured analysis modes, not separate autonomous agents. Initial lenses: CEO/GM, Commercial Director, CFO, COO, Strategy, Negotiator and Chief of Staff. Each lens returns: objective, facts, assumptions, analysis, risks, recommendation, confidence and missing evidence. Cross-lens synthesis must expose disagreements rather than average them away.

### Phase 2.3 — Devil's Advocate

For material decisions, generate an independent counter-case: falsifiable assumptions, strongest opposing argument, failure modes, second-order effects, pre-mortem, leading indicators and stop conditions. It must be allowed to disagree with the primary recommendation.

### Phase 2.4 — Decision Room

Create a decision record containing the question, owner, date, context, options, criteria/weights, scenario ranges, financial and operational implications, risks, recommendation, counter-case, final owner decision and review date. Separate AI recommendation from the owner's recorded decision. No decision record may trigger an action.

### Phase 2.5 — Sales Intelligence

Use only explicitly connected/authorised datasets. Enforce owner-only scope in server-side queries, not UI visibility. Support revenue/volume/mix, gross margin, price waterfall, channel/customer/route performance, forecast and variance. Preserve source lineage, period, currency, units, filters and data freshness. Never infer live company data from prior chat memory or fabricate missing figures.

### Phase 2.6 — Governance and controlled workflows

Build a typed action registry and central policy decision point only after advisory capabilities are proven. Start with prepare-only actions. For approved execution, require exact-payload approval, expiry, single use, actor/resource scope, risk tier, durable audit and idempotency. Consequential execution stays disabled until negative tests and owner acceptance pass.

## 4. Risk tiers

| Tier | Meaning | Default handling |
|---|---|---|
| 0 | Read-only analysis | Allowed within owner data scope |
| 1 | Reversible internal preparation | Allowed only in explicitly designated internal surfaces |
| 2 | External communication or material operational change | Prepare only; explicit owner approval required |
| 3 | Financial, legal, access, deletion, production or irreversible action | Block by default; explicit action-specific approval and enhanced safeguards required |

The tier is determined server-side from the action registry, not supplied by the model or client.

## 5. Architecture guardrails

- Keep the current owner session and authorization boundary.
- Reuse existing Postgres/Neon connection and append-only migrations.
- Reuse existing Groq/Gemini provider abstraction; do not add providers or paid dependencies.
- Respect the current serverless route/function budget; extend existing route handlers only where the resource model is appropriate.
- Keep business data and Executive Twin memory out of employee Office context.
- Use deterministic validation and server-side schemas around every structured AI result.
- Do not allow the model to call arbitrary URLs, SQL, shell commands or unregistered tools.
- No production mutation, external send, purchase, payment, publishing, account access change or destructive operation in this blueprint.

## 6. First implementation slice

The first code PR should be limited to Phase 2.1: inspect existing memory reads/writes, define the canonical memory lifecycle, implement owner-only management using existing route surfaces, add bounded retrieval for Executive Twin only, and add tests. Do not bundle multi-role orchestration or action execution into that PR.

## 7. Release gates

Every implementation PR must:
- branch from current `main` and remain isolated to one feature;
- include tests for allowed and denied paths;
- pass `npm run typecheck`, `npm test`, `npm run lint` and `npm run build`;
- have a green, accessible Vercel preview before merge;
- be reviewed at desktop and 390px mobile widths;
- report real-data tests not performed;
- never merge automatically merely because CI is green.

**Phase 2 completion means an Executive Partner that is context-aware, rigorous and governed — not an autonomous operator.**
