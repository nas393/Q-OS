# Q OS — Stage 1 Acceptance Audit
Date: 2026-11-21
Branch: q-os/stage1-acceptance-2026-11-21
Scope: evidence-based audit of the currently deployed application. This document does not authorize production changes.

## Verified

| Criterion | Evidence | Status |
|---|---|---|
| Production deployment exists | Vercel reports deployment dpl_5mgXbKGLn7hRJ9C6PiAChmMnBWav as READY on main, commit 3a0c488ed0f175707b1b52391a82eb683c70711c | PASS |
| Health endpoint | GET /api/health returned HTTP 200 at 2026-11-20 23:16 UTC; application=ok and database=ok | PASS |
| Login page delivery | GET /login returned HTTP 200 and rendered the owner passkey form | PASS |
| Production auth configuration entries | Vercel environment inventory lists OWNER_PASSKEY, AUTH_SECRET and DATABASE_URL targeting production; secret values were not retrieved | CONFIGURED, NOT AUTH-TESTED |
| Preview database isolation | Branch q-os/2.0-completion has a branch-scoped DATABASE_URL described as a dedicated isolated Neon preview branch | CONFIGURED, NOT CONNECTIVITY-TESTED |
| Preview owner credential | Branch q-os/2.0-completion has a branch-scoped OWNER_PASSKEY entry | CONFIGURED, NOT LOGIN-TESTED |

## Not yet verified

| Criterion | Required evidence | Status |
|---|---|---|
| Owner login succeeds | Successful authenticated browser login against an isolated preview | BLOCKED |
| Invalid credentials fail safely | POST login returns 401 without disclosing configuration | NOT TESTED |
| Protected API | Unauthenticated request to a private API returns application-level 401 | NOT TESTED; Vercel Deployment Protection blocked direct fetch |
| Persistent database read/write | Create a test conversation on isolated preview DB, reload and confirm persistence | NOT TESTED |
| Database-backed throttling | Controlled invalid attempts reach 429 and reset after the configured window | NOT TESTED |
| No secret exposure | Source scan, client bundle scan and runtime-log review | NOT TESTED |
| Responsive desktop and Android web | Authenticated browser checks at 360, 390, 768, 1024, 1440 and 1920 px | NOT TESTED |
| Navigation and status | Authenticated dashboard entry, navigation, sign-out and status flow | NOT TESTED |
| Degraded health handling | Isolated test with unavailable DB returns 503 without leaking internals | NOT TESTED |
| Full automated checks | CI typecheck, unit tests, lint and production build on this branch | PENDING CI |
| Reproducible deployment | Clean install and deployment steps followed from docs | NOT TESTED |

## Historical runtime signals

- Vercel aggregated 32 auth_configuration_invalid events across 8 users on /api/auth/login during the last 7 days. The latest event was 2026-11-20 14:41 UTC on an older preview deployment.
- The required preview OWNER_PASSKEY entry for q-os/2.0-completion was created later on 2026-11-20. The inventory also shows a common AUTH_SECRET entry targeting production, preview and development. This makes the historical errors potentially resolved, but only a successful login test can close the item.
- Older Global Radar logs included fetch failures and a SQL syntax error on 2026-11-16. These are historical signals, not confirmed current defects. Re-test current Radar flows and inspect fresh logs before closing them.

## Security and release controls

- No secret values were read or copied.
- No environment variables, database settings, production data, deployment protection or production deployments were changed.
- The branch-specific preview database entry is present, but its actual connection target has not been proven by a write/read test.
- The shared AUTH_SECRET targeting production, preview and development should be reviewed for environment separation. Do not rotate or change it as part of this audit without explicit approval.
- Do not merge this branch or promote a production deployment without separate approval.

## Next execution order

1. Run CI on this branch and fix only reproducible failures.
2. Obtain a usable authenticated preview session; verify login, protected APIs, persistence and throttling against the isolated preview database.
3. Complete source/client-bundle secret review and runtime error review.
4. Run authenticated responsive and keyboard checks across the viewport matrix.
5. Re-test Global Radar, tasks, Q Assistant, alerts and project telemetry end to end.
6. Reconcile this checklist with actual evidence. Only then calculate a weighted completion percentage.
