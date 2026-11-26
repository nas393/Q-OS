# Q OS rebuild plan

Status: draft for review (2026-11-26). Branch `claude/q-jarvis-build-alerts-v18dru`, reset to `main` (1e4a80f).
`main` stays live and untouched until this rebuild is finished and approved.

## What stays (backend, not changed)

- `src/app/api/*` (15 routes): alerts, apps, auth login and logout, chat, cron check, health, ingest, iq, office work, private, projects, tasks.
- `src/lib/*`: data, database, auth and sessions, alert engine, AngolaIQ engine, integrations, office work, Q context.
- `next.config.ts` security headers. The CSP has no `unsafe-eval`, so `next dev` shows blank pages. Test with `next build` and `next start`.
- `public/` assets.

## What gets rebuilt (front end)

- Every page under `src/app/(os)` (21 pages), the login page, the shell, `src/components/*`, `src/styles/*` and the root layout.

## Information architecture: five items

| Item | Route | Replaces (today on `main`) |
| --- | --- | --- |
| Command | `/` | dashboard, office floor, morning brief summary |
| Q | `/q` | chat (`/chat`) |
| Intelligence | `/intelligence` (groups: Overview, Strategy, Markets, Workspace) | all 14 `/iq/*` pages |
| Alerts | `/alerts` | alerts |
| More | `/more` | Executive Twin, Studio, Apps, sign out |

Owner decisions carried over: keep Executive Twin and Studio. Keep the name "Q OS · AI HQ".
Old URLs keep working (redirects), because alerts and notifications link to `/dashboard` and `/iq/...`.

## Parity inventory (what the current app does)

- `/dashboard`: command overview with live app status and today's priorities.
- `/brief`: morning brief.
- `/chat`: conversations with Q, streamed replies, live context.
- `/alerts`: alert feed, push on and off, gold levels, check now.
- `/executive-twin`: private advisory workspace (phase 1, advisory only).
- `/office`: the floor, with desks per app, delegation, approvals and drafts.
- `/iq/*`: Overview, News, Global Radar, Sectors and ideas, Devil's Advocate, Business map, Trade, Ports, Watchlist, Projects, Saved, Sources, and two redirects (clusters, compliance).
- `/login`: owner passkey sign-in.

Every item above needs a parity check before the old page is removed.

## Design

- Paper and Dusk themes. Clay is the only accent.
- Every status colour has a word beside it.
- Lay out at 390 px first, then widen.
- Every state is designed: loading, empty, error, and data not available (with the reason).
- No illustration as a requirement. The command centre is a list of apps with their status.

## Phases

0. **Plan (this document).** Owner review and approval.
1. **Foundation.** Tokens, shell with five items, sign-in page, Command home using the existing data loaders.
2. **Q and Alerts.**
3. **Intelligence**, one group at a time: Overview, Strategy, Markets, Workspace.
4. **More.** Executive Twin, Studio, Apps, sign out.
5. **Retire the old front end.** Remove `(os)`, old components and styles. Update `DESIGN-SYSTEM.md` and `ARCHITECTURE.md`.
6. **3D view (three.js).** An optional "3D floor" on Command, after the 2D version is finished. The 2D list stays the default and the accessible version.

## Rules for every phase

- Parity list for the phase, browser checks with mocked `/api/*`, screenshots at 1440 px and 390 px in both themes.
- Nothing is merged to `main` until phase 5 is done and approved.
- Backend changes need the owner's approval.

## Open decisions

1. Do the five items all have to exist before the rebuild replaces the live app, or can it go live in stages?
2. Keep `main` live until the rebuild is finished? (Recommended: yes.)
3. Reuse the earlier Paper and Dusk tokens (recoverable from this repo's history), or start with new tokens?
