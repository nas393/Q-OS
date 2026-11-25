# Q OS design system

Q OS is the owner's control room, branded **Q OS · AI HQ**. It should feel like a calm, warm workplace: clear
space, flat tactile objects, and colour that only ever means something. This page says what that means in
practice. The values live in code (see "Where it lives"); change them there, and update this page when a rule changes.

## Principles

Taken from the virtual office floor and Monument Valley.

1. **Space before chrome.** The page and the floor are the interface. The frame (rail, top bar, tab bar) stays thin.
2. **Objects you can touch have a lower edge** (`--edge`) and sink when pressed.
3. **Warm light.** Cream or charcoal, never blue-black, never neon. No glow, no pure black, no decorative motion.
4. **Colour means state.** Status colours say what is happening. The clay accent marks the one primary action or the current place.
5. **Few choices.** Two themes, one accent, one motion switch.

## Brand

- **Mark:** the Q, a flat disc in clay with a cream Q (`src/components/shell/q-mark.tsx`).
- **Lockup:** the mark, "Q OS", and "AI HQ" in small caps under it, in the rail.
- **Type:** titles are set in the serif (`--serif`, Instrument Serif). Everything else is the sans (`--sans`).
- **Name:** the product stays Q OS. "AI HQ" is its descriptor.

## Themes

| Theme | Use | Canvas | Ink | Accent |
| --- | --- | --- | --- | --- |
| Paper (default) | Daylight, reading | `#F4EEE2` | `#2A2622` | clay `#A95431` |
| Dusk | Low light, evenings | `#1B1915` | `#F3EDE1` | clay `#CC7A52` |

Motion has two settings. **Calm** is the default: short, soft transitions. **Off** stops every transition and
animation. A system that asks for reduced motion starts with Off.

## Colour

- **Surfaces:** `--bg` (canvas), `--surface` (cards, rail), `--surface-2` (wells, inputs), `--elevated` (menus, toasts).
- **Lines:** `--line`, `--line-2` (card edges), `--line-3` (hover edges). Hairlines, never thick borders.
- **Text:** `--text`, `--text-2` (secondary), `--muted` (labels). Every text token is at least 4.5:1 on its surface.
- **Controls:** `--control-line` is at least 3:1 against the canvas, so an input's edge is always visible.
- **Accent:** `--accent-solid` for the primary button, `--accent-ink` for text and focus rings. One accent per screen.
- **Status:** `--ok`, `--watch`, `--crit`, `--info`, each with an `-ink` text variant. Ink for words, solid for dots.
- **Floor palette:** the plan's own warm tones (floor, wood, chairs, walls, plants), defined in `office.css` on `.office`, with a Dusk variant.

## Type, space, shape

- Serif for page titles; one sans for everything else. Scale 12, 13, 14, 16, 20, 24, 26, 34 px.
- A 4 px space grid (`--s-1` to `--s-12`).
- Radii grow with the size of the object: 6 px tags, 10 px controls, 14 px tiles, 18 to 24 px panels.
- Pill shapes (`--r-full`) for status pills, chips, badges and the command bar.

## Depth and motion

- **Raised objects** carry a lower edge: `box-shadow: 0 var(--edge-h) 0 var(--edge)`. Pressing sinks them about 3 px.
- **Panels** use `--shadow-sm`. `--shadow` is for drawers, menus and the command palette.
- **Transitions** use `--dur-1` (120 ms) for presses and `--dur-2` (200 ms) for states, with `--ease`.
  Nothing animates for decoration.

## Components

- **Shell:** rail (five sections on desktop), top bar (breadcrumb, search, alerts, account), tab bar on phones.
  Every section is also in the command palette (Ctrl or Cmd K), the More menu and the breadcrumb.
- **Buttons:** `primary` (accent), default (surface), `ghost` (text only), `danger` (crit). 40 px tall; 44 px on phones.
- **Cards:** one surface, one hairline, one radius. No card inside a card. Rail cards collapse with their heading.
- **Command bar:** an inverted bar above the plan, with the input and the desk to send to.
- **Forms:** label above the field, helper text below, error text under the field.
- **Status pills:** a tinted pill with its word in capitals. **Count badges:** a solid circle on the thing they count.
- **Drawer and sheet:** from the right on desktop, from the bottom on phones. Esc closes it.

## Floor grammar (the Office)

The Office is an illustrated isometric floor. A warm floor, low partitions, and framed art on the back walls. Desks
with monitors and chairs, a meeting table on a rug, plants, a screening wall, a sofa, and server racks.

- **People sit behind their desks.** Each staff member is a station: a seated person, or a robot for an automated app.
  The person is drawn in the plan; the desk sits in front of them.
- **Speech bubbles** carry the name and a status pill: All good, Watching, Needs you, or No data. They never carry colour alone.
- **Counts sit on the figure.** A red badge is "needs you"; an accent tray is "tasks from you".
- **Stations sit on a diamond grid,** at least six floor units from their neighbours, so no bubble covers another.
- **Room names are a legend under the plan,** not text on the floor. A figure and its bubble would cover a name placed on the floor.
- **The plan keeps one design size and scales with the window.** On phones it keeps at least 62% scale and scrolls sideways
  inside its own box, so the people stay readable.

Rooms, for the legend: Chief of Staff (Q), Media studio, Academy, Markets desk, Community hall, Screening room, Server room.

Layout: the command bar and the plan on the left; the rail on the right (executive briefing, inbox, autopilot
workflows, daily focus). Under 1180 px the rail sits below the plan.

## Do and do not

- Do keep one accent per screen and one primary action per panel.
- Do use status colours for words and dots, and keep them off large decorative areas.
- Do keep text on the tokens. A colour written into a component is a bug.
- Do not add glow, neon, gradient text, pure black, or pulsing decoration.
- Do not put room names on the floor where figures can cover them.
- Do not nest cards inside cards. Use space and a hairline.

## Where it lives

| What | Where |
| --- | --- |
| Tokens (themes, type, space, edges, brand) | `src/styles/tokens.css` |
| Shared components (buttons, forms, tables, drawers, palette) | `src/styles/ui.css` |
| Shell (rail, top bar, tab bar, confirm) | `src/components/shell/shell.css` |
| Q mark | `src/components/shell/q-mark.tsx` |
| Studio (theme, motion) | `src/components/shell/studio.ts` |
| Shell layout and navigation | `src/components/shell/app-shell.tsx`, `src/components/shell/nav.ts` |
| Office plan (stations, people, furniture, the drawing) | `src/app/(os)/office/floor-art.tsx` |
| Office page (bubbles, command bar, rail, desk sheet) | `src/app/(os)/office/floor.tsx`, `src/app/(os)/office/office.css` |
| Office data (rooms, staff, status rules) | `src/lib/office/staff.ts` |
| Sign-in | `src/components/lock.css`, `src/components/login-form.tsx` |

## Adding a desk

1. Add the staff member to `STAFF` in `staff.ts` with its room.
2. Add a station to `STATIONS` in `floor-art.tsx`: its seat (x, y), its kind (person or robot) and its look.
   Keep it at least six floor units from its neighbours.
3. Check the floor at 1440 px and 390 px, in both themes, before merging.
