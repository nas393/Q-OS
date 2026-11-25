# Q OS redesign plan

Status: approved direction. Phase 0 (foundation and the preview) is built and awaiting review. Branch `q-os/redesign`.

## Decisions (from the owner)

1. **Scope: UI and UX only.** APIs, data stores, auth, integrations and the alert and task rules stay as they are.
2. **The floor is the home screen.** It replaces the Command centre and the separate Office page.
3. **Merge the AngolaIQ pages into four groups** (see "Information architecture").
4. **Keep Executive Twin and Studio.**
5. **Keep the name and the descriptor: Q OS · AI HQ.**

## Principles

- **One design system.** One token set, one component set, one layout. The old token names and the old component classes go once a page has moved.
- **The floor is the product's centre.** Everything else is a room you go to from it.
- **Calm, warm, legible.** Paper and Dusk themes. Clay is the only accent. Status colour carries meaning, always with a word.
- **No decoration that does not carry information.** No glow, no pulsing except a live dot, no gradients on text.
- **Every screen works on a phone.** Layouts are designed at 390 px first, then widened.
- **Every state has a design:** loading, empty, error, and data not available (with the reason).

## Information architecture

Rail (desktop) and tab bar (phone), five items:

| Item | What it is | Replaces |
| --- | --- | --- |
| **Floor** | Home. The plan, the command bar, the briefing rail. | Command centre, Office, Morning brief (its summary) |
| **Q** | The conversation with Q. | Q Assistant |
| **Intelligence** | Four groups (below). | AngolaIQ |
| **Alerts** | Every alert, with the push and gold-level settings. | Alerts |
| **More** | Executive Twin, Studio, Apps, Sign out. | The More drawer |

**Intelligence, merged into four groups:**

- **Overview:** Overview, News, Global Radar.
- **Strategy:** Sectors and ideas, Devil's Advocate.
- **Markets:** Business map, Trade, Ports, Watchlist.
- **Workspace:** Projects, Saved, Sources.

Open: `clusters` and `compliance` exist as routes but are not linked from the nav today. They need a decision: fold into a group, or retire.

## Design system (v2)

Lives in `src/components/q2/q2.css`, scoped to the `.q2` root. Components, shell and navigation in `src/components/q2/`. Routes live in the `(q2)` route group.

- **Type:** the serif for display and page titles (Instrument Serif, already loaded); Inter for everything else. Sizes 12, 14, 16, 20, 28, 40.
- **Space:** 4 px grid. **Radius:** 8, 12, 16, 24, pill.
- **Surfaces:** canvas, surface, raised. Hairline borders. Shadows only for drawers and menus.
- **Colour:** clay accent; sage (ok), ochre (watch), brick (crit), slate (info). Every status colour has an ink variant for text.
- **Components:** Button (primary, secondary, ghost, danger), Card, Pill, Count badge, Field, Segmented tabs, List row, Drawer, Empty state, Skeleton, Toast.
- **Layout:** rail, content with an optional context rail on the right, and the tab bar on phones.

## Phases

0. **Foundation (this change).** This plan. The v2 tokens and components. The shell (rail, top bar, tab bar). A preview page at `/preview` that shows every component in both themes, so the direction can be reviewed before any page moves.
1. **Floor.** The home screen on real data. Reuses the staff logic and the plan geometry; the bubbles, the rail and the command bar are rebuilt on v2.
2. **Q and Alerts.** The conversation, the alert list and the settings.
3. **Intelligence.** Group by group: Overview, Strategy, Markets, Workspace. Old pages stay live until each group reaches parity.
4. **Executive Twin, Studio, Apps, More.**
5. **Retire.** Delete the old routes, the old CSS and the dead code. Update `docs/design-system.md` to v2.

Each phase ships with a parity list (what the old page did, and that it still does), browser tests, and screenshots at 1440 px and 390 px in both themes.

## Risks

- **Parity loss during the move.** Mitigation: the parity list per page, and the old route stays live until the new one passes.
- **Intelligence is the largest move.** Mitigation: groups move one at a time.
- **Two shells at once during the move.** Mitigation: the rail links to both, and the old shell is not changed until phase 5.
- **Visual decisions take longer than a port.** Mitigation: review the preview page before building pages.

## Not in this plan

- Backend, data and auth changes.
- The 3D scroll experience. It needs its own decisions and comes after the redesign.
