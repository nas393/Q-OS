# Q OS design system

Q OS is the owner's control room. It should feel like a calm place to work: clear space, flat tactile
objects, warm light, and colour that only ever means something. This document says what that means in
practice. The values themselves live in code (see "Where it lives"); change them there, and update this
page when a rule changes.

## Principles

Taken from Monument Valley and Gather.town.

1. **Space before chrome.** The page and the floor are the interface. The frame (rail, top bar, tab bar)
   stays thin and quiet.
2. **Flat, tactile planes.** Surfaces are solid. Anything you can touch has a lower edge (`--edge`), and it
   sinks when pressed. There is one light direction: from above.
3. **A warm, quiet palette.** Ivory or warm graphite. Never blue-black, never pure black, never neon.
   No glow, no gradient on text, no pulsing decoration.
4. **Colour means state.** Status colours (ok, watch, down, info) say what is happening. The accent marks
   the one primary action or the current place. Zone tints on the floor are a soft wash, not a signal.
5. **Few choices.** Two themes, one accent, one motion switch. Fewer settings, fewer ways for a screen to
   drift.

## Themes

| Theme | Use | Canvas | Ink | Accent |
| --- | --- | --- | --- | --- |
| Paper (default) | Daylight, reading | `#F3EFE6` | `#2B2A27` | clay `#A9562F` |
| Dusk | Low light, evenings | `#1F1D1A` | `#F2EDE3` | clay `#C9744F` |

Motion has two settings. **Calm** is the default: short, soft transitions. **Off** stops every transition and
animation. A system that asks for reduced motion starts with Off.

## Colour

- **Surfaces:** `--bg` (canvas), `--surface` (cards, rail), `--surface-2` (wells, inputs), `--elevated` (menus, toasts).
- **Lines:** `--line`, `--line-2` (card edges), `--line-3` (hover edges). Lines are hairlines, never thick borders.
- **Text:** `--text`, `--text-2` (secondary), `--muted` (labels). Every text token is at least 4.5:1 on its surface.
- **Controls:** `--control-line` is at least 3:1 against the canvas, so an input's edge is always visible.
- **Accent:** `--accent-solid` for the primary button, `--accent-ink` for text and focus rings. One accent per screen.
- **Status:** `--ok`, `--watch`, `--crit`, `--info`, each with an `-ink` text variant. Use the ink for words, the solid for dots.
- **Zone tints (office only):** seven muted tones, mixed at 16% into the surface so they read as a wash.

## Type, space, shape

- One sans family for everything (`--sans`). Scale 12, 13, 14, 16, 20, 24, 32 px.
- A 4 px space grid (`--s-1` to `--s-12`).
- Radii grow with the size of the object: 6 px tags, 10 px controls, 14 px tiles, 18 to 24 px panels and rooms.
- Pill shapes (`--r-full`) only for chips, badges and the command bar.

## Depth and motion

- **Raised objects** carry a lower edge: `box-shadow: 0 var(--edge-h) 0 var(--edge)`. Pressing moves the
  surface down by about 3 px and shortens the edge. Use this for desks, big buttons and tiles, not for text.
- **Panels** use `--shadow-sm` for a hairline lift. `--shadow` is only for drawers, menus and the command palette.
- **Transitions** use `--dur-1` (120 ms) for presses and `--dur-2` (200 ms) for states, with `--ease`.
  Nothing animates for decoration. The one exception is the live dot on a status, which breathes slowly and stops under Off.

## Components

- **Shell:** rail (five sections on desktop), top bar (breadcrumb, search, alerts, account), tab bar on phones.
  Every section is also in the command palette (Ctrl or Cmd K), the More menu and the breadcrumb.
- **Buttons:** `primary` (accent), default (surface), `ghost` (text only), `danger` (crit). Minimum 40 px tall; 44 px on phones.
- **Cards and panels:** one surface, one hairline, one radius. No card inside a card.
- **Forms:** label above the field, helper text below, error text under the field. Inputs keep a visible edge.
- **Tags and badges:** a tinted pill for status; a solid dot-count badge for "needs you".
- **Drawer and sheet:** slides in from the right on desktop and up from the bottom on phones. Esc closes it.

## Floor grammar (the Office)

The Office is the spatial heart of Q OS. It is drawn as a floor plan, as in Gather.town, and each part has a job.

- **Rooms are tiles.** Each room is a flat tile in one zone tint, with a lower edge like a physical tile.
- **Corridors are the ground.** The dot-grid ground between rooms is the walkway. Keep the gaps even.
- **Doorways are arches.** A small rounded cut in the top wall of each room marks the way in.
- **Q's office has a double wall,** like glass, so it reads as the place where decisions are made.
- **Desks are objects.** Each has a surface, a seat with the app's mark, a chair and a name plate.
  Pressing a desk sinks it and opens its sheet.
- **Status is a dot in the name plate.** Ok, watch, down or no data. Never a glow.
- **Counts sit on the object they belong to.** A red badge on a desk is "needs you". An accent tray is "tasks from you".

| Room | Zone | Tint |
| --- | --- | --- |
| Chief of Staff (Q) | corner | clay |
| Media studio | studio | sand |
| Academy | academy | sage |
| Markets desk | markets | slate |
| Community hall | community | rose |
| Screening room | screens | ochre |
| Server room | ops | stone |

Layout: a four-column grid on desktop (Q's office and the studio take two columns each); one column on phones,
with the desk sheet rising from the bottom.

## Do and do not

- Do keep one accent per screen and one primary action per panel.
- Do use the status colours for words and dots; keep them off large decorative areas.
- Do keep text on the tokens. A colour written into a component is a bug.
- Do not add glow, neon, gradient text, pure black, or pulsing decoration.
- Do not add a new theme or a new accent. Change the tokens instead.
- Do not nest cards or boxes inside boxes. Use space and a hairline.

## Where it lives

| What | Where |
| --- | --- |
| Tokens (themes, type, space, edges, Q mark) | `src/styles/tokens.css` |
| Shared components (buttons, forms, tables, drawers, palette) | `src/styles/ui.css` |
| Shell (rail, top bar, tab bar, confirm) | `src/components/shell/shell.css` |
| Studio (theme, motion) | `src/components/shell/studio.ts` |
| Shell layout and navigation | `src/components/shell/app-shell.tsx`, `src/components/shell/nav.ts` |
| Office floor (rooms, desks, zone tints) | `src/app/(os)/office/office.css`, `src/app/(os)/office/floor.tsx` |
| Office data (rooms, staff, status rules) | `src/lib/office/staff.ts` |
| Sign-in | `src/components/lock.css`, `src/components/login-form.tsx` |

## Adding a room or a desk

1. Add the room to `ROOMS` and, if it is a new room, to `LAYOUT` in `floor.tsx`.
2. Give the room a zone class in `office.css` (`--a` for its grid area and `--z` for its tint).
3. Add the staff member to `STAFF` in `staff.ts` with its room.
4. Check the floor at 1440 px and 390 px, in both themes, before merging.
