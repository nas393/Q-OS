# Q OS — Stage 1 Acceptance Audit
Date: 2026-11-21
Branch: q-os/stage1-acceptance-2026-11-21
Scope: evidence-based audit of the application. This document does not authorize production changes.

## Verified

| Criterion | Evidence | Status |
|---|---|---|
| Production deployment exists | Vercel reports deployment dpl_5mgXbKGLn7hRJ9C6PiAChmMnBWav as READY on main, commit 3a0c488ed0f175707b1b52391a82eb683c70711c | PASS |
| Production health endpoint | GET /api/health returned HTTP 200; application=ok and database=ok | PASS |
| Preview login | Owner reports successful login on the Stage 1 preview | USER-VERIFIED |
| Stage 1 CI | GitHub Actions run 44848521152 passed typecheck, unit tests, lint and production build | PASS |
| Isolated preview database | Vercel branch-scoped DATABASE_URL points to Neon branch q-os-preview-auth (br-shiny-fire-bas0oqmp), separate from Neon main | PASS |
| Preview runtime DB connectivity | New Vercel deployment dpl_ELF2s7BaHQhHGRsNEPkNVsnkYXHL returned HTTP 200 from /api/health with application=ok and database=ok | PASS |
| Preview DB app role | q_os_preview_app is a non-superuser scoped to q_jarvis on the isolated branch; it owns 32 application tables and has CREATE on public so the existing runtime schema migration check can execute | PASS |
| Preview environment scope | Vercel inventory confirms DATABASE_URL targets Preview only and is scoped to the Stage 1 branch; secret values were not exposed | PASS |

## Verified by Claude on 2026-11-21 (local production build)

Environment: `next build` + `next start` of `main` (31de677) against a throwaway local PostgreSQL 16 with both
migrations applied and a test owner; test-only AUTH_SECRET / OWNER_PASSKEY / CRON_SECRET / INGEST_TOKEN generated
for the run (no real credentials used or shown). Same code as the preview; only the database is local.

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 9 | Authenticated protected API | Logged out: `/api/tasks`, `/api/projects`, `/api/alerts`, `/api/chat` all 401 `{"error":"Unauthorized"}`. Logged in: all 200 | PASS |
| 10 | Persistent read/write through the app | Task created via `POST /api/tasks`, returned by a fresh `GET /api/tasks`, row in `q_tasks`. Conversation: real `/api/chat` route with the Groq call answered by a local stand-in (no key): reply streamed, then after a full server restart `GET /api/chat` lists the conversation and `GET /api/chat/{id}` returns the user and assistant messages (rows in `messages`). Same through the Ask Q screen: reply shown, still listed after reload | PASS |
| 11 | Invalid credentials fail safely | Wrong passkey: 401 `{"error":"Invalid passkey"}`; no configuration detail | PASS |
| 12 | Database-backed throttling | Same client: tries 1-6 → 401, 7+ → 429 "Too many attempts. Try again in 15 minutes."; correct passkey also 429 while locked; another client unaffected (401); after the 15-min window (row aged in DB) → 200 | PASS |
| 13 | No secret exposure | Built with known test secret values: 0 of 4 values and 0 secret variable names in `.next/static`. `git grep` (source + history) for API keys, private keys, Postgres URLs with passwords, Neon/Resend/GitHub/Slack tokens, JWTs: none (only the `.env.example` placeholder). 18 log calls, none print env, passkey, token or cookie; local server log contains no secret. Production runtime logs: none in Hobby's 1-hour window | PASS |
| 14 | Responsive desktop and Android web | Real login via UI, then Command centre, AngolaIQ, News, Q Assistant, Alerts, Brief at 360/390/768/1024/1440/1920 px: 36/36 without horizontal scroll, axe WCAG 2.2 AA 0 violations. Keyboard: first Tab is "Skip to content", every stop shows a focus ring | PASS |
| 15 | Navigation and status | UI login → `/dashboard`; rail navigation to every section; account menu → Sign out → `/login`; after sign-out API 401 and pages 307 → `/login`; forged expired session → 401 / 307 → `/login`; session TTL 8 h | PASS (finding F1) |
| 16 | Degraded health handling | Database stopped: `/api/health` 503 `{"status":"degraded","checks":{"application":"ok","database":"error"}}`; login 503 "Authentication service temporarily unavailable"; logs show error names only; recovers to 200 when the DB returns | PASS |
| 17 | Reproducible deployment | Fresh clone of `main`, README steps: `npm install` 28 s, `npm run build` 29 s, `npm test` 58/58 | PASS (finding F2) |


## Findings (status 2026-11-21)

| # | Finding | Status |
|---|---|---|
| F1 | Sign-out did not revoke a copied session | Fixed in PR #39 (server-side "sessions valid after"; sign-out ends every session) |
| F2 | No package-lock.json | Fixed in PR #38 |
| F3 | Scheduled check never reached Q OS (Vercel login) | Fixed in PR #37 and #41; owner added the bypass secret; run 17 returned HTTP 200 |
| F4 | AUTH_SECRET shared by Production and Preview | Fixed: production value is Production-only; Preview/Development have their own |
| F5 | Fixed build alerts stayed open | Fixed in PR #36 |
| F6 | Most preview branches use the production DATABASE_URL | Open: needs the isolated Neon preview connection string from the owner (only branch-scoped previews are isolated today) |

Details:

- **F1. Sign-out does not revoke a copied session.** The JWT stays valid until it expires (8 h): a cookie copied
  before sign-out still returned 200. Fix: a server-side "sessions valid after" timestamp checked in `readSession`
  and set on sign-out. Changes authentication, so it needs owner approval.
- **F2. No `package-lock.json` in the repo.** Every install resolves `^` ranges afresh, so two deployments of the
  same commit can get different dependency versions. Fix: commit the lock file (separate PR).
- **F3. The 15-minute scheduled check never reached Q OS.** All 15 GitHub runs failed with "Redirecting..." because
  Vercel Authentication covers `q-jarvis.vercel.app`; only the daily Vercel Cron ran. Fixed in PR #37 (bypass header);
  needs the owner to add the `VERCEL_AUTOMATION_BYPASS_SECRET` Actions secret.
- **F4. Shared AUTH_SECRET across Production and Preview** (from the ChatGPT handover). Preview code can mint
  sessions that production accepts. Recommend a separate Preview value; needs owner approval.
- **F5. Stale build alerts** (16 Nov q-jarvis lint failure, fixed a minute later) stayed open and were ranked top
  priority. Fixed in PR #36 (merged).

## Historical runtime signals

- Vercel aggregated 32 auth_configuration_invalid events across 8 users on /api/auth/login during the previous 7 days. The latest event was 2026-11-20 14:41 UTC on an older preview deployment. The owner has since verified successful login on the Stage 1 preview.
- Older Global Radar logs included fetch failures and a SQL syntax error on 2026-11-16. These are historical signals, not confirmed current defects. Re-test current Radar flows and inspect fresh logs before closing them.
- Vercel deployment build reported non-blocking lint/deprecation warnings, including deprecated ESLint version and existing image/unused-import warnings. CI passed.

## Security and release controls

- No secret values were displayed or copied into source control.
- The preview application role is not a superuser. It owns only application tables in the isolated preview database and has schema CREATE permission needed by the current runtime migration check.
- DATABASE_URL was added only to the Stage 1 Preview branch scope. Production environment variables and production deployment were not changed.
- The isolated Neon branch is a snapshot derived from Neon main; subsequent writes through this preview role remain on that separate branch.
- Shared AUTH_SECRET and other shared provider keys targeting multiple environments remain a separate environment-separation review item. Do not rotate or change them as part of this audit without explicit approval.
- Do not merge this branch or promote a production deployment without separate approval.

## Next execution order

1. Verify authenticated protected APIs and end-to-end conversation persistence on the preview.
2. Test invalid credentials, rate limiting, sign-out and session expiry.
3. Complete source/client-bundle secret review and fresh runtime error review.
4. Run authenticated responsive and keyboard checks across the viewport matrix.
5. Re-test Global Radar, tasks, Q Assistant, alerts and project telemetry end to end.
6. Reconcile this checklist with actual evidence. Only then calculate a weighted completion percentage.

Status 2026-11-21: 17/17 verified. Findings F1-F5 fixed; F6 open (owner input).
