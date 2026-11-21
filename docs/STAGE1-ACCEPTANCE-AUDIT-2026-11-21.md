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
| Stage 1 CI | GitHub Actions run 44835716023 passed typecheck, unit tests, lint and production build | PASS |
| Isolated preview database | Vercel branch-scoped DATABASE_URL added for q-os/stage1-acceptance-2026-11-21, pointing to Neon branch q-os-preview-auth (br-shiny-fire-bas0oqmp), separate from Neon main | CONFIGURED |
| Preview DB application role | Created q_os_preview_app with read_write access to q_jarvis/public; SQL verification confirms non-superuser and SELECT/INSERT/UPDATE/DELETE access on 32 app tables | PASS |
| Preview environment scope | Vercel inventory confirms DATABASE_URL targets Preview only and is scoped to the Stage 1 branch; secret values were not exposed | PASS |

## Not yet verified

| Criterion | Required evidence | Status |
|---|---|---|
| Preview runtime uses isolated DB | New Vercel deployment becomes READY and /api/health returns HTTP 200 against the branch-scoped DATABASE_URL | PENDING DEPLOYMENT |
| Authenticated protected API | Authenticated request succeeds and unauthenticated request returns application-level 401 | NOT TESTED |
| Persistent database read/write through app | Create a test conversation on isolated preview, reload and confirm persistence | NOT TESTED |
| Invalid credentials fail safely | POST login returns 401 without disclosing configuration | NOT TESTED |
| Database-backed throttling | Controlled invalid attempts reach 429 and reset after the configured window | NOT TESTED |
| No secret exposure | Source scan, client bundle scan and runtime-log review | NOT TESTED |
| Responsive desktop and Android web | Authenticated browser checks at 360, 390, 768, 1024, 1440 and 1920 px | NOT TESTED |
| Navigation and status | Authenticated dashboard entry, navigation, sign-out and status flow | NOT TESTED |
| Degraded health handling | Isolated test with unavailable DB returns 503 without leaking internals | NOT TESTED |
| Reproducible deployment | Clean install and deployment steps followed from docs | NOT TESTED |

## Historical runtime signals

- Vercel aggregated 32 auth_configuration_invalid events across 8 users on /api/auth/login during the previous 7 days. The latest event was 2026-11-20 14:41 UTC on an older preview deployment. The owner has since verified successful login on the current Stage 1 preview.
- Older Global Radar logs included fetch failures and a SQL syntax error on 2026-11-16. These are historical signals, not confirmed current defects. Re-test current Radar flows and inspect fresh logs before closing them.
- Vercel deployment build reported non-blocking lint/deprecation warnings, including deprecated ESLint version and existing image/unused-import warnings. CI still passed.

## Security and release controls

- No secret values were displayed or copied into source control.
- A restricted read/write Postgres role was created on the isolated Neon preview branch; it is not a superuser.
- DATABASE_URL was added only to the Stage 1 Preview branch scope. Production environment variables and production deployment were not changed.
- The isolated Neon branch is a snapshot derived from Neon main, but all subsequent writes through this preview role remain on that separate branch.
- Shared AUTH_SECRET and other shared provider keys targeting multiple environments remain a separate environment-separation review item. Do not rotate or change them as part of this audit without explicit approval.
- Do not merge this branch or promote a production deployment without separate approval.

## Next execution order

1. Confirm the new Vercel preview deployment is READY and health-checks against the isolated DB.
2. Verify authenticated protected APIs and end-to-end conversation persistence on the preview.
3. Test invalid credentials, rate limiting, sign-out and session expiry.
4. Complete source/client-bundle secret review and fresh runtime error review.
5. Run authenticated responsive and keyboard checks across the viewport matrix.
6. Re-test Global Radar, tasks, Q Assistant, alerts and project telemetry end to end.
7. Reconcile this checklist with actual evidence. Only then calculate a weighted completion percentage.
