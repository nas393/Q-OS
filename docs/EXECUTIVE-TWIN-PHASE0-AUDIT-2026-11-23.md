# Executive Twin — Phase 0 Architecture & Safety Audit

**Date:** 2026-11-23  
**Repository:** `nas393/Q-OS`  
**Audited ref:** `main` at `55fe0991ccbad77940adfd0a2e7eddee18804a86`  
**Audit type:** Read-only source, schema, CI, GitHub and Vercel configuration review  
**Outcome:** Architecture is reusable, but autonomous execution must not be enabled until policy enforcement and audit reliability are strengthened.

## 1. Executive summary

Q OS already has useful foundations: owner authentication, private conversations, a streamed AI chat path, an employee/Office model, task delegation, approval-backed drafts, event records, an integration registry, and scheduled health checks.

It does **not** yet implement the Executive Twin described in the product specification. The current chat orchestrator classifies intent, loads recorded Q OS context and streams a provider response. It does not dispatch an agent/tool plan or execute a governed action. Existing Office jobs create drafts and wait for owner approval; they do not independently run the organisation.

The recommended approach is to extend existing foundations, introduce a central server-side policy/decision layer, and enable autonomy progressively. Do not create a second parallel chat system or a broad set of new API routes.

## 2. Verified repository baseline

| Area | Finding |
|---|---|
| Repository | Public GitHub repository; authenticated connection has push/admin permissions |
| Default branch | `main` |
| Audited main commit | `55fe0991ccbad77940adfd0a2e7eddee18804a86` |
| Open pull requests at audit time | 0 |
| Branch protection | `main` is not protected; required status checks are not enforced |
| Stack | Next.js 15 App Router, React 19, TypeScript, Neon Postgres |
| AI providers | Server-side Groq primary and Gemini fallback |
| Existing Office | Employee desks, task delegation, stand-up, approvals inbox and draft jobs |
| Existing CI | Typecheck, tests, ESLint, production build |
| Current API route handlers | 16 |
| Existing migration IDs | 1, 2, 3; next available ID is 4 |

The latest Stage 1 CI run for the Office phase 3 head commit completed successfully. Its steps passed: dependency installation, typecheck, tests, lint and build. The phase 3 commit message reports 83 passing tests. The current `main` production deployment is marked READY and is built from the audited main commit.

This audit did not execute commands locally, inspect production database contents, retrieve secret values, or perform a live application login. CI and deployment statements above are based on GitHub Actions and Vercel metadata.

## 3. Current architecture

### 3.1 Chat and AI

- `src/lib/core/orchestrator.ts` classifies the latest user message, loads server-recorded context and calls the existing streaming AI provider.
- `src/lib/core/intent.ts` is a deterministic routing hint; its own comment states that it does not grant execution permission.
- `src/lib/ai/provider.ts` contains the current Q system prompt and server-side Groq/Gemini streaming.
- `src/lib/iq/ai.ts` exposes `jsonFromAI` for structured JSON work.
- Current context includes stored tasks, alerts, metrics, app stats, static portfolio configuration and integration configuration. It explicitly distinguishes configuration from independently verified live status.
- The chat route stores owner conversations and messages. The bootstrap script provisions the owner user with ID `owner`, matching the current chat route's owner scope.

**Gap:** There is no verified central action planner/executor that turns an AI proposal into a typed, permission-checked action. The existing action tags are dashboard confirmation requests, not an autonomous tool execution framework.

### 3.2 Identity, sessions and privacy

- The database baseline constrains user roles to `owner`.
- The owner session is a signed JWT in an HttpOnly cookie, Secure in production, SameSite Strict, with an eight-hour lifetime.
- Session revocation is checked against database state with a short per-instance cache.
- Chat and private conversation endpoints require a valid owner session.
- Office write operations check the request origin as well as the owner session.

This matches the initial owner-only Executive Twin requirement. Preserve the existing login and session model. Do not introduce employee logins or change access control as part of the first implementation phase.

### 3.3 Database foundations

The initial schema already contains:

- `users`, `user_preferences`
- `conversations`, `messages`
- `memory_records`
- `integrations`
- `permissions`
- `approvals`
- `activity_logs`
- `system_settings`

The permissions schema supports system, agent, integration and workflow subjects, risk levels 0–3, allow/deny state and JSON constraints. The approvals schema supports pending, approved, rejected, expired and cancelled states. Activity logs support owner, system, agent and integration actors.

The application also has additive runtime migrations 1–3 in `src/lib/schema.ts`. Future schema work must append migration 4 or higher; never edit or reorder existing migrations.

**Important:** The presence of these tables does not prove that every permission or approval path is currently enforced. Before autonomous execution, trace every policy read/write call site and add negative tests for denied, expired, replayed and cross-scope actions.

### 3.4 Office and employee workflows

- `src/lib/office/staff.ts` defines the existing employee directory and responsibility mapping.
- `src/lib/office/jobs.ts` defines employee jobs and output parsing.
- `src/lib/office/work.ts` generates and stores employee drafts.
- `/api/office/work` is owner-only; writes are origin-checked and audited.
- Drafts remain in waiting state until approved or discarded.
- Existing weekly jobs are invoked through the existing scheduled checks.

This is a strong starting point for the Executive Twin's command structure, Devil's Advocate reviews and Sales Analyst employee. Keep the current approval inbox as the source of truth.

### 3.5 Integrations

The current registry describes Neon, Groq, Gemini, GitHub, Vercel, metrics ingest and the scheduler. Registry status is based on environment-variable presence; it does not establish that a remote connection is reachable or that permissions are valid.

The requested Google Drive, Gmail, WhatsApp Business, CRM, ERP, accounting and calendar integrations are not represented as active integrations in the current registry. Treat them as future, separately authorised connectors. Never infer that selecting an integration during product discovery means an account has already been connected.

Existing code references `GITHUB_TOKEN` and `CRON_SECRET`. Reconcile those references with the approved environment-variable policy before adding or changing any environment variable. Do not add secret values to source control.

### 3.6 Scheduling and cost

- GitHub Actions calls the existing checks endpoint every 15 minutes.
- Vercel Cron is configured for a daily 07:00 UTC run.
- `runChecks` throttles work to at most once per 10 minutes and includes uptime, deployment checks, app stats, gold alerts, weekly Office drafts, morning briefing and AngolaIQ jobs.
- Weekly Office jobs are throttled separately and some use the existing AI providers.

This is scheduled monitoring, not true continuous or real-time execution. With the approved additional AI budget set to USD 0, do not increase polling or AI job frequency. Prefer event-driven updates, existing schedules, batching, caching and deterministic checks. Existing provider usage may still incur charges under the user's current provider arrangements; no new paid service or commitment is authorised.

## 4. Safety findings and required controls

### Finding 1 — Main branch has no protection

GitHub reports `main` as unprotected, with no required status checks. This weakens the user's intended PR/CI gate.

**Recommendation:** Propose branch protection requiring pull requests and successful CI before merge. Do not change repository protection until the owner explicitly approves the settings.

### Finding 2 — Audit logging is currently best-effort

`src/lib/audit.ts` catches database write failures and logs an error instead of propagating the failure. That is acceptable for some telemetry, but not sufficient for irreversible or high-impact autonomous actions.

**Recommendation:** Introduce a durable audit contract for governed actions. For high-risk operations, the action must fail closed if its audit record cannot be committed. Record actor, action, resource, risk, policy decision, approval reference, outcome and timestamps. Avoid storing secrets or full sensitive payloads in logs.

### Finding 3 — Permission policy must be centralised before autonomy

The schema has permission and approval structures, but the chat orchestrator does not currently expose a central policy-enforced tool executor.

**Recommendation:** Implement a server-side policy decision point and typed action registry. Every proposed action must be checked against actor, subject, resource, risk tier, owner approval and expiry. The model must never grant itself permissions. Default deny.

### Finding 4 — Existing AI prompt rules are not an enforcement boundary

The system prompt describes approval requirements, but prompt text alone cannot enforce money, external communication, access, deletion or production-release restrictions.

**Recommendation:** Enforce restrictions in server-side code before execution. Treat model output, client context, connector content and retrieved documents as untrusted input.

### Finding 5 — Route budget is already constrained

There are 16 App Router API route handlers. This is above the approximately 12-function planning ceiling supplied for the current Vercel Hobby setup; actual deployment function mapping still needs confirmation.

**Recommendation:** Do not add a new API route for every employee or capability. Reuse existing chat and Office endpoints where appropriate, consolidate compatible handlers and verify the deployed function count before any new route is approved.

### Finding 6 — Confidential data needs explicit partitioning

The owner-only session is a useful baseline, but Sales Analyst conversations, Executive Twin conversations, personal records and general Office context require distinct data scopes.

**Recommendation:** Enforce isolation in database queries and server-side policy, not merely in UI visibility. Define separate conversation types and memory classifications. The Sales Analyst private workspace is visible only to the owner and Executive Twin. Other employees receive only approved, minimal derived information.

### Finding 7 — Integration status is not connection verification

The current registry checks environment-variable presence only.

**Recommendation:** Model connection state, granted scopes, last successful verification, health and revocation separately. Start with read-only scopes. External writes and sends require explicit owner approval.

### Finding 8 — Public repository

The repository is public. Source code and documentation committed here are publicly visible.

**Recommendation:** Do not commit owner-private conversation content, personal profile data, commercial source records, customer information, financial records, secrets or production identifiers that should remain private. Keep private runtime data in the protected database and secrets in Vercel.

### Finding 9 — Accessibility and security validation are not in the current CI gate

The current CI runs typecheck, tests, lint and build. It does not show an automated axe WCAG 2 A/AA check.

**Recommendation:** Add accessibility checks for every touched UI page and test both desktop and mobile. Add policy tests for authorization and data isolation alongside existing unit tests.

## 5. Recommended target architecture

1. **Executive Twin identity and private workspace:** reuse owner authentication and conversation storage, with a distinct conversation type and server-enforced owner scope.
2. **Executive profile and memory:** use existing memory records only after verifying current usage and adding approval workflow for permanent memory changes.
3. **Policy decision point:** central server-side default-deny authorization for every tool and agent action.
4. **Action registry:** typed, allowlisted internal actions with risk levels, input schemas, idempotency and explicit execution outcomes.
5. **Approval service:** reuse the existing approval model where suitable; approval must bind to the exact action payload, expire and be single-use.
6. **Durable audit:** strengthen audit writes so high-risk actions cannot execute without a committed audit event.
7. **Agent/employee orchestration:** reuse Office staff and job definitions; introduce role-specific prompts and scoped context, not separate uncontrolled agents.
8. **Devil's Advocate review:** independent review stage for meaningful work, with immediate escalation of material concerns.
9. **Sales Analyst:** separate confidential workspace and commercial data scope, with no general employee visibility.
10. **Executive War Room:** build on the existing Office and dashboard experience rather than duplicating the application shell.
11. **Scheduled intelligence:** piggyback on existing scheduler with strict budgets and no uncontrolled background model loops.
12. **Integration adapters:** add only after the owner connects the provider and approves scopes.

## 6. Phased delivery plan

| Phase | Deliverable | Gate |
|---|---|---|
| 0 | Architecture and safety audit | Audit accepted; no runtime changes |
| 1 | Executive identity, private conversation and owner-only scope | Privacy and cross-scope tests pass |
| 2 | Policy engine, action registry, approvals and durable audit | Default-deny and fail-closed tests pass |
| 3 | Decision engine, memory proposals and Devil's Advocate | Evidence, challenge and approval tests pass |
| 4 | Sales Analyst confidential workspace | Owner + Twin only; data isolation verified |
| 5 | Employee command, delegation and performance | Existing Office flows preserved; accountability tests pass |
| 6 | Executive War Room and reporting | Desktop/mobile/accessibility QA passes |
| 7 | Research and opportunity business cases | Sources, dates, confidence and limitations visible |
| 8 | Approved integrations and financial intelligence | Per-connector scopes and audit verified |
| 9 | Knowledge, calendar and personal strategy | Personal/business data separation verified |
| 10 | Progressive autonomous internal operations | Security, cost, recovery and acceptance tests pass |

## 7. Engineering gates

- One feature per `office/<short-name>` branch and one PR.
- Read existing code before editing.
- Preserve authentication and session behaviour unless separately approved.
- Schema migrations are append-only; next free ID is 4.
- Count API routes before adding any route; prefer existing endpoints.
- Reuse `jsonFromAI` for structured AI tasks; provider calls remain server-side.
- No new paid services or provider commitments.
- No secrets or secret values in source control.
- Run `npm test`, `npx tsc --noEmit` and `npx eslint`; also run `npm run build`.
- Run axe WCAG 2 A/AA on each UI page changed.
- Test desktop and 390px mobile where UI changes.
- Verify Vercel preview is green **and accessible** before merge.
- If the preview cannot be opened, stop before merge.
- Never force-push `main`; do not merge a PR without the required checks and accessible preview.

## 8. Phase 0 conclusion

**The project is technically feasible using existing Q OS foundations, but it is not ready for autonomous execution today.**

The two highest-priority prerequisites are:

1. A central, server-enforced policy/action layer with default-deny behaviour.
2. Reliable audit logging that blocks high-impact actions when the audit record cannot be written.

The immediate next implementation should be Phase 1: a private Executive Twin workspace with no new autonomous action permissions. Build the safety foundation before granting the Twin authority.

**No application code, database schema, authentication, integrations or production settings were changed during this audit.**
