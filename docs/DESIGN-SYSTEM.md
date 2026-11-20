# Q OS design system and suite shell

One shell, one token set, one component layer for every owner section: Command centre, Q Assistant, AngolaIQ (12 pages), Morning brief and Alerts.

## 1. Audit: what fragmented the suite (before)

1. **Five visual systems.** The global skin (Space Grotesk, a green/red "matrix" look with clipped corners), Q Assistant (Montserrat, red gradients), AngolaIQ (navy and violet), Brief/Alerts (Inter with a serif) and the Command centre (Q Live) each had their own palette, fonts, radii and buttons.
2. **No persistent frame.** Each section drew its own header and back link ("← NASSIM OS", "← Q OS", a chat arrow), so the navigation changed shape, height and naming on every page. AngolaIQ had its own sidebar.
3. **Inconsistent identity.** The suite was called "NASSIM OS", "Q OS", "Command Center" and "Command centre". Icons mixed SVGs with emoji and glyphs (◈ ⚔ 👁 ↻ ✦ 📝).
4. **Different states.** Each section had its own buttons, empty and loading states, toasts and errors (with ⚠ prefixes), and contrast was not checked.
5. **Colour without meaning.** Red was both the chat brand colour and the critical status colour. Neon glows and gradients competed with real alerts.

## 2. Tokens: single source of truth (`src/styles/tokens.css`)

- **Colour (Obsidian):**
  - canvas `#090A0E`; surfaces `#12141B`, `#191C25` and `#202431` (elevated)
  - text `#F3F4F6`, `#A1A1AA` (secondary) and `#8B90A0` (muted)
  - borders: `rgba(255,255,255,.07/.12/.20)` for structure, `.40` for controls (3:1)
- **Status only:** ok `#22C58B`, watch `#E9A23B`, critical `#F12D43`, info `#5797E8`. Each has a lighter "ink" variant for text.
- **Accent:** Halo `#EADFCB`, used only on primary actions and the active item.
- **Studio themes:** Obsidian, Aurora, Graphite and Light Executive, plus 7 accents. Every text token is at least 4.5:1 on every surface of its theme.
- **Type:** Inter (self-hosted with `next/font`). The scale is 12/16, 13/20, 14/22, 16/24, 20/28, 24/32 and 32/40. Figures use `tabular-nums`. Instrument Serif appears only in the Q briefing headline.
- **Space:** a 4px grid (4–48). Radius 6, 8, 12, 16, 20. Controls are 32, 40 and 48 px (44 on phones).
- **Frame:** rail 64 px (232 px expanded), top bar 56 px, phone tab bar 68 px, page max width 1200 px (1440 px for wide pages).

## 3. Blueprint

- **Shell** (`src/components/shell/app-shell.tsx`), mounted once by `src/app/(os)/layout.tsx`, so it never re-mounts between sections:
  - left rail: the sections, Applications (real app logos), Studio and expand/collapse, with tooltips when collapsed
  - top bar: breadcrumb (`Q OS / Section / Page`), search (Ctrl/Cmd K), Luanda weather and time, alerts bell with unseen count, account menu
  - phone: a compact top bar and a bottom tab bar (Today, AngolaIQ, Ask Q, Alerts, More)
  - global overlays: command palette (sections, AngolaIQ pages, apps, actions, AngolaIQ search, then Ask Q), Studio, Alerts and Applications
- **Page template** (`src/components/shell/page.tsx` and `ui.css`):
  - `PageHeader` holds the title, a one-line purpose, meta and actions on the right; `.subnav` tabs serve sections with several pages
  - shared cards, KPIs, tables, chips, forms and drawers
  - states: `State` covers empty, error and loading, each with a next step
- **Command centre:**
  - Above a 1180 px viewport: the orbit canvas.
  - Below it: the Smart Stack card layout, for phones, tablets and small laptops.

## Checks

- Automated WCAG 2.0/2.1/2.2 A and AA scan (axe-core) on 11 views (dark and light themes, desktop and phone), plus all 10 AngolaIQ sub-pages in Obsidian and Light Executive at 1440 and 375 px: no violations, and no page scrolls sideways on a phone.
- The Command centre builds only the layout that fits the screen (orbit or Smart Stack), not both.
- 53 unit tests, including orbit layout (no overlaps from 1024 to 1920 px) and app logos (every registry app has its own logo; the local copies exist).
