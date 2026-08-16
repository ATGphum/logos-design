# Console design — port notes

Ported from `marketing/llm-interface.html` (single-file prototype):

- **Markup**: `#cs-view` (lines 3745–3825) and the agent chat surface (lines 4186–4882).
- **Script**: console logic (3826–4134) and the chat scripts (4883–5535).
- **CSS**: `CONSOLE v3` band (2205–2872) + the `#cs-view.cs-night` noise rule (2063) → `console.css`;
  design tokens / base / chat-UI band (11–1653) + embedded `@font-face` (1790–1792) → `chat.css`.

## Why the agent chat surface is included

The scope asked whether the early chat-UI CSS (`.sidebar`, `.main`, terminal drawer, chat
search, …) is reachable from the console. **It is**: `csEnter()` ("Access agent", both the
topbar split-button and the mobile `cs-maccess` band) fades `#cs-view` out and reveals the
agent chat app underneath (`body.chat-reveal` runs `chatFade` on `.sidebar` /
`.collapsed-rail` / `.collapsed-settings` / `.main`), and the agent's rail/sidebar
**Console** button calls `openConsole()` to come back. That CSS is therefore *not* dead —
the agent surface is part of the console experience and is ported here as the second
surface of this one design.

## Structure map

```
ConsoleDesign.tsx            root <div class="console-root [light] [sidebar-collapsed]
│                            [terminal-open] [chat-reveal] [hide-watermark]">
│                            (the prototype styled <body>; body→.console-root rewritten)
├─ agent/AgentView.tsx       collapsed rail + collapsed settings gear, chat-home button,
│  │                         <main class="main"> topbar / chat-area / input bar / terminal
│  ├─ agent/AgentSidebar.tsx sidebar: logo, resizer (drag), nav, pinned / projects /
│  │                         recent chats, footer (+ mobile new-chat bubble)
│  ├─ agent/SearchOverlay.tsx fullscreen chat search (build/filter/pick, esc)
│  ├─ agent/SettingsView.tsx settings side nav + general/memory/skills/config/version
│  │                         panels + Add-memory / Install-skill modals
│  └─ agent/icons.tsx        shared inline SVGs (verbatim path data)
├─ shell/ConsoleView.tsx     #cs-view: topbar (search, ACCESS AGENT split pill + instance
│  │                         menu, refresh, mode), sidebar (nav + instance sub-hierarchy),
│  │                         head, panel routing, sidebar collapse, mobile nav drawer
│  ├─ shell/BaseComponents.tsx scrim / dialog / drawer / toast system (useCsBase hook)
│  └─ shell/panels/
│     ├─ bits.tsx            Mod (.cs-mod), Stat (.cs-stat), Kv, SecH, Toggle, Money
│     ├─ OverviewPanel.tsx   budget hero (ov-*), KPIs, breakdown, attention queue, modules
│     ├─ InstancesPanel.tsx  filters/toolbar/table (row overflow menus), lifecycle,
│     │                      workspace, create-instance (scroll + ci-flash target)
│     ├─ SmallPanels.tsx     API keys, Usage, Users, Machines, Placeholder
│     ├─ RechargePanel.tsx   credit balance + one-time top-up (NEW — not a port)
│     ├─ SettingsPanel.tsx   signup / resource / registration / grant / resources forms
│     └─ ComponentsPanel.tsx wired demos (dialogs, toasts, drawers) + csOpsDrawer etc.
├─ state.ts                  CI_LIST + all demo data, verbatim from the prototype
├─ chat.css / console.css    prototype CSS, mechanically extracted (see below)
└─ assets/                   enso.svg / enso-ink.svg (extracted from the inline #enso
                             symbol), rl-ico-github.webp, rl-ico-discord.webp
```

## CSS extraction rules (mechanical, diff-friendly)

1. `body` → `.console-root`, `:root` → `.console-root` (the design must not style the real
   `<body>`); `body.light|.sidebar-collapsed|.terminal-open|.chat-reveal|.hide-watermark`
   became classes on the root div driven by React state.
2. Every other top-level selector got a `.console-root ` descendant prefix so the generic
   prototype class names (`.sidebar`, `.main`, `.topbar`, universal `*` reset, bare
   `::-webkit-scrollbar` rules) cannot leak into the gallery or the other design.
   `@keyframes` / `@font-face` untouched; `@media` bodies prefixed recursively.
   Caveat: the uniform prefix flattens *some* specificity gaps (e.g. `body.light X` vs a
   later `X` rule of equal new specificity) — source order still resolves every pair I
   checked, but a pixel-diff pass is worth doing.
3. Class names in markup are unchanged from the prototype.

## Prototype → vendored-token mapping

| Prototype value | Ported as | Note |
| --- | --- | --- |
| `--font: "Jost", "Inter", -apple-system, BlinkMacSystemFont, sans-serif` | `var(--app-font-sans)` | vendored stack also starts with Jost — clean mapping |
| `font-family: "Jost", sans-serif` (console band) | `var(--app-font-sans)` | same |
| `--font-mono: "SF Mono", "Fira Code", monospace` | **kept literal** | vendored `--app-font-mono` starts with JetBrains Mono — different render, deliberately not mapped |
| `"Julius Sans One"` (display font) | **kept literal** | loaded via the prototype's embedded data-URI `@font-face` (copied into chat.css), so no external fetch and no dependency on index.html |
| Jost `@font-face` data URIs | copied verbatim | belt-and-braces: index.html also loads Jost from Google Fonts |
| All colors (`--cs-*`, `--color-*`, `--side-*`, …) | **kept literal** on `.console-root` / `#cs-view` | fidelity over token purity; none map 1:1 onto oc-2 semantic tokens |
| spacing / radii literals | kept literal | prototype px values ≠ `--space-*` scale; not mapped |

Light/dark: root `.light` (chat surface) and `#cs-view.cs-night` (console) are
*independent* toggles, exactly like the prototype (`body.light` vs `cs-night`). Both are
initialized from `useTheme().resolvedMode`; the design's own toggle buttons (console
topbar moon/sun, agent topbar moon/sun, settings Appearance segment) all work.

## Behaviors ported

Console: panel routing + title/sub (`csNav`), scroll-to-top on nav, sidebar collapse
(`csToggleSide`, cs-expand button), instance sub-hierarchy fold (`ciToggleSubs`), ACCESS
AGENT split pill (`ciAccess` incl. empty-list → create-scene routing, `ciAccMenu`,
`ciSelect`, `ciGotoList`, `ciGotoCreate` with scroll + `ci-flash`), document-click menu
closing, instance-row overflow menus (`ciMenu`/`ciPick`), `csCopy` (clipboard),
`csToggleMode` (cs-night + icon swap), `csRefreshDemo`, dialogs (`csDialog`, Esc, scrim
click), drawers (`csDrawer`, left/narrow variant, transition-reset repositioning), toasts
(`csNotify` with progress bar + auto/manual dismiss), mobile nav drawer (`csMobileNav`),
settings/API toggles (`cs-tgl`), `csEnter` (chat-reveal fade, mobile textarea focus),
`openConsole` (incl. mobile sidebar fold).

Agent: sidebar collapse/expand (`toggleSidebar`, rail, mobile burger), drag-to-resize
sidebar (168–380px), section fold with max-height animation (`toggleSection`), project
open/caret + expand-all (`toggleProjectSubs` icon swap), pin/unpin to Pinned section with
counts (`togglePin`/`updateSidebarCounts`), delete chat/project, completed-chat green dot,
click flash feedback, chat select + title, new chat / `startProject` (hero greeting swap,
focus), hero ⇄ bottom input relocation (React conditional placement instead of DOM moves),
auto-resize textarea + send-button reveal, Enter-to-send, `sendMessage` user bubble +
THINKING… placeholder block (verbatim), scroll-to-bottom, model dropdown (fixed-position
centering + clamping, selection, info hover), search overlay (build from recent titles,
filter, no-results state, pick → title, esc), settings view (nav switch, appearance seg
wired to light mode, language seg, watermark toggle → `hide-watermark`, config tabs,
memory/skills switches, both modals with Esc-priority), terminal drawer toggle, mobile
variants evaluated once at load like the prototype (`Ask LOGOS` placeholder, pretty model
name, straight chat-home arrow, footer new-chat bubble, suggestion labels).

## Recharge panel (new — not in the prototype)

`/ Recharge` is a **new** Workspace page, added after `/ Usage`. It does not exist in
`marketing/llm-interface.html`, so nothing here is a port — it was built from design mocks
against the console's existing visual language.

Structure: balance + one-time-credit header pair → *Choose recharge amount* (quick chips,
free-entry field, payment method, confirmation) → *Recharge history*.

**Token / class mapping**

| Piece | Reuses | New |
| --- | --- | --- |
| section headers | — | `.rc-sech` + `.rc-eyebrow` / `.rc-sect` (eyebrow above a `cs-sec-h`-scale title, right-hand badge slot) |
| balance figure | `.ov-money.disp` (superscript `$`) | `.rc-amount` sizing only |
| "VERIFIED" / "UNAVAILABLE" | — | `.rc-badge` — **outline** badge; `.cs-tag` is filled and read too loud next to the section titles |
| buttons | `.cs-btn` | `:disabled` state added (the repo had none) |
| accent | `#8fc39a` / `rgba(110,190,130,…)`, the existing console green | — |
| everything else | `--cs-ink/-bg/-line/-soft/-faint/-hl` | — |

All new CSS is `rc-`-prefixed and scoped under `#cs-panel-recharge`, so it cannot leak into
the other panels. Night mode works through the existing `--cs-*` variables; only two
explicit `.cs-night` rules were needed (title glow, balance glow), matching the existing
treatment of `.cs-sec-h .l`.

**Behavior implemented**

Quick chips ($20/$50/$100) write the amount field; typing is sanitized to digits with at
most two decimals and normalized to two on blur; the chip highlights only on an exact
match. Validity is checked against `RECHARGE_LIMITS` (1–10,000) — out of range swaps the
helper text, reddens the field border and disables Continue. Payment method is a
radio-style group (keyboard operable, `role="radio"` + `aria-checked`); unavailable methods
are non-selectable. The confirmation callout and the Continue label both track the selected
method. History renders the empty state whenever `RECHARGE_HISTORY` is empty.

**Deliberately not built** — the payment flow itself. Continue is inert: wallet connection,
quote creation and Stripe are all product decisions, and the mock's own copy defers the
final amount to the server.

## Intentionally static / adapted

- `csBackHome()` / chat-home returned to the **marketing mainpage** (`#mp-view`), which is
  not part of this design → both now navigate to the sandbox gallery (`#/`).
- Buttons that were static in the prototype stay static: console demo buttons (Add credit,
  Refresh, Create…, filters, Select…, Export CSV, Copy on non-first rows, cs-act "View"),
  agent attach/mic/prev/next/edit-title/side-panel buttons, terminal tab buttons,
  settings Refresh/Discover/Save, sidebar "New project", `m-info` (hover tooltip only).
- `cs-side-foot` GitHub/Discord icons: the prototype copies data-URI images from the
  marketing nav at runtime; ported as `assets/rl-ico-github.webp` / `rl-ico-discord.webp`
  (same art family from `marketing/assets/`).
- Sidebar/rail logo: the markup's philosopher's-stone webp is replaced *at boot* by the
  prototype's own `ensoURI()` (generated from the inline `#enso` symbol) — ported as
  `assets/enso.svg` / `enso-ink.svg`, swapped on light/dark. The hero watermark uses
  `<use href="enso.svg#enso">` instead of the in-DOM symbol (172KB path kept out of JSX).
- Model menu is positioned `fixed` in place instead of re-parented to `<body>` (the
  prototype appended it to body to escape transformed ancestors; the root here has no
  transform). Revisit if a transformed ancestor is ever introduced.
- Dev-only FPS meter (press F) — skipped.
- `localStorage('logos-mode')` persistence — skipped; theme comes from the sandbox
  ThemeProvider instead.

## Dead code found (not ported, CSS kept verbatim where in-band)

- CSS with no reachable markup anywhere in the prototype: `.cs-brand`, `.cs-user`,
  `.cs-sideaccess`, `.cs-balance-*`, `.cs-budgetrow` (old budget hero), `.cs-access`,
  `.login-back` rules inside the console band. Left in `console.css` to keep the diff
  against the prototype legible.
- JS never reachable: `csSelect()` (targets nonexistent `#cs-panel-agent` / `.sel-tag`),
  `toggleChatMenu()`/`closeAllChatMenus()` (no `.chat-menu` markup), `toggleThought()` /
  `toggleWorked()` (no generated thought/worked markup in the shipped demo), `enterApp()`
  + login pupil mousemove (login surface), `mp-stars` seeding (marketing surface).
- Sign-in gate CSS (1654–1792) and mainpage CSS (1793–2204) — other surfaces, not ported.

## Open questions for raychen

1. Should the agent chat surface eventually be split into its own design id (it maps to a
   different webui surface than the control-plane console), or stay bundled since the
   console's "Access agent" flow owns the transition?
2. `--font-mono`: prototype uses SF Mono/Fira Code, vendored token is JetBrains Mono —
   which should win for the terminal drawer and `code` chips?
3. `csBackHome` → gallery is a sandbox stand-in; what should "Back to mainpage" do in the
   real product (marketing site URL? workspace home?).
4. The prototype evaluates mobile variants once at load (no resize listener). Keep that
   behavior, or make the ported surface responsive to live viewport changes?
5. Julius Sans One ships as an embedded data-URI font (from the prototype). Should it be
   added to logos-webui's font pipeline instead?
6. **Recharge**: the mock says amounts are "server-verified" and the balance is
   "server-authoritative", but the design hardcodes the quick amounts (20/50/100) and the
   1–10,000 range. Should those come from an endpoint instead, and is the client allowed to
   validate at all before checkout, or only echo what the server returns?
7. **Recharge**: `.rc-badge` is a new outline badge because filled `.cs-tag` overpowered the
   section titles. Worth promoting to a shared variant (`.cs-tag.outline`) in webui, or keep
   it recharge-local?
