# Login design — port notes

Ported 1:1 from `marketing/llm-interface.html`, `<div class="login-view">`
(lines 4137–4183) plus the CSS/JS that drives it. Renders at `#/login`.

## Structure map

```
LoginDesign (default export, src/designs/login/LoginDesign.tsx)
└─ div.lg-root[.light][.app-emerge]        ← was <body> (+ its toggled classes)
   └─ div.login-view[.entering][.hidden]   ← the sign-in gate overlay
      ├─ div.login-back                    ← "Back" (see Behaviors)
      ├─ button.login-mode-toggle          ← moon/sun toggle (ModeIcon)
      └─ div.login-split                   ← the frosted card
         ├─ div.login-left
         │  ├─ div.login-heading           ("Meet your / agentic reflection")
         │  └─ div.login-box               (3× .login-social, .login-or,
         │                                  .login-input, .login-continue)
         ├─ div.login-divider
         └─ div.login-right
            ├─ div.login-hero-name         ("LOGO" + span.s-fix "S")
            ├─ div.login-mark-wrap > img.login-hero-mark   (enso mark)
            ├─ div.login-product           ("AN AFFINE SUBNET 120 PRODUCT")
            └─ div.login-brands            (bittensor × affine lockup)
```

CSS lives in `login.css`, generated mechanically from these prototype
`<style>` ranges (class names preserved for legible diffs):

| prototype lines | section |
|---|---|
| 1790–1792 | `@font-face` Jost 300/400 + Julius Sans One 400 (data-URI, verbatim) |
| 12–118 | `:root` + `body.light` design tokens → `.lg-root` / `.lg-root.light` |
| 123–126, 134–153 | reset + `body` base (noise/gradient background, flex, overflow) |
| 1654–1789 | "Sign-in gate" block (login card, inputs, socials, brands, keyframes) |
| 2703–2731 | "LOGIN NIGHT THEME" overrides + perf hints + `.login-back` |

Mechanical rewrites only: `body` → `.lg-root`, `body.light` → `.lg-root.light`,
`:root` → `.lg-root`, the global `*` reset scoped under `.lg-root`, plus one
added rule: `.lg-root { position: fixed; inset: 0; width: 100vw; }` (the
prototype's body IS the viewport; our root div has to claim it).

## Prototype → vendored-token mapping

| prototype | ported as | note |
|---|---|---|
| `--font: "Jost","Inter",-apple-system,BlinkMacSystemFont,sans-serif` | `var(--app-font-sans)` | webui stack is `"Jost","Inter",-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",sans-serif` — same leading families; Jost itself is embedded via the verbatim `@font-face` data-URIs |
| `--font-mono: "SF Mono","Fira Code",monospace` | `var(--app-font-mono)` | webui leads with JetBrains Mono; only consumer is `.login-view code, .login-view .mono`, which matches no login markup (dead rule) |
| every color (`--color-*`, night-theme literals like `#f4f2ec`, `rgba(244,242,236,…)`) | kept literal on `.lg-root` | deliberate: the gate's night look is bespoke; nothing in `oc-2.json` (text-strong, border-weak-base, …) matches these cream/ink values, and remapping would change the render |
| radii `22px / 13px / 11px / 999px` | kept literal | webui radius scale is 6/8/12/16/24/999 — only the pill (`999px` ≈ `--radius-full`) lines up, left literal for diff legibility |
| spacing/padding values | kept literal | prototype spacing is hand-tuned per element, not on a 4/8 scale |
| `--r-sm/--r-md/--r-lg`, gold/cream/side/term tokens | carried in `.lg-root` verbatim, unused by login rules | kept so the token block diffs 1:1 against the prototype |

Theme integration: root `light` class is React state seeded from
`useTheme().resolvedMode`; the design's own `.login-mode-toggle` flips it
(prototype `applyMode()`/`toggleMode()` minus the `localStorage` persistence,
which the sandbox leaves to the app-level ThemeProvider).

## Behaviors ported

- **Light/dark toggle** — swaps root class, moon↔sun icon, GitHub icon
  (white↔dark webp), bittensor/affine lockup (dark↔light webp), and the enso
  mark (white↔ink SVG). All five swaps match `applyMode()` exactly.
- **Enso mark** — prototype builds `data:image/svg+xml` URIs at runtime from
  the inline 172 KB `#enso` symbol (`ensoURI(ink)`); ported by pre-rendering
  the same path + fill colors into `assets/enso-white.svg` / `enso-ink.svg`.
- **enterApp()** (all three provider buttons + Continue) — verbatim math:
  measures `.login-mark-wrap`, slides `.login-right` so the mark hits viewport
  centre-x over 1 s `cubic-bezier(0.65,0,0.2,1)`, everything else fades via
  `.entering`, gate goes `.hidden` at 1150 ms, `.app-emerge` clears at
  2100 ms. **Sandbox deviation:** at 3000 ms the gate resets itself (in the
  prototype the agent app is revealed underneath; there is no app here, so
  without the reset the design would end on a blank screen).
- **Back** — prototype `loginBack()` returns to the marketing page, which is
  out of this design's scope; here it resets any in-flight enter animation.
  Visual treatment is 1:1.
- **Email input** — focus/placeholder states are pure CSS (night-theme
  underline focus ring), ported verbatim. The prototype attaches no JS to this
  input (no validation — that lives on the marketing ring's waitlist, see
  below), so none was added.

## Skipped / dead, and why

- **Ring login + waitlist panels** (`.mp-ring-login`, `.mp-ring-wait`,
  `rl-*`, `rw-*` CSS at ~2073–2171/2733+, `mpAccess/mpBeta/mpWaitContinue/
  mpRingContinue` JS): these live inside the marketing hero's enso ring in
  `#mp-view`, not in `#login-view` — traced from the markup, they are a
  *different* gate (the marketing-page one) and can't render without the whole
  hero (canvas terrain, ring halo, star field). Marketing page is explicitly
  not a port candidate (AGENTS.md). The task's e-mail validation
  (`rw-invalid`) belongs to that waitlist, not to `.login-input`.
- **Eye/pupil tracker** (`.login-eye/.login-blink/.login-pupil` CSS +
  `#login-pupil` mousemove listener + `eyeBlink` keyframes): dead in the
  prototype — no element with those classes/ids exists in the login markup.
  CSS kept verbatim (it rides along in the 1654–1789 block), JS not ported.
- **`.login-alchemy-wrap/-top`, `.login-sn`, `.login-subtitle`,
  `.login-subhead`, `.login-field-label`, `.login-primary`** — CSS for markup
  that no longer exists in the login view (earlier iteration). Kept verbatim
  in the copied block, unreachable; listed here so nobody hunts for them.
- **`.app-emerge .main` / `uiEmerge`** — kept (rewritten to
  `.lg-root.app-emerge .main`) but unreachable: the emerging `.main` app is
  the console design's markup. Harmless; preserves the block 1:1.
- **`#mp-view, #cs-view` in the will-change perf rule** — kept verbatim,
  match nothing here.
- **Anurati `@font-face`** (line 8): NOT copied. `.login-heading` /
  `.login-hero-name` name Anurati, but the later
  `.login-view .login-heading, .login-view .login-hero-name` rule (1706)
  overrides both to Julius Sans One inside the login view, so Anurati can
  never paint in this design. (It's used by the marketing hero only.)
- **Global scrollbar styling** (prototype lines 127–133): global
  `::-webkit-scrollbar` selectors would leak into the sandbox gallery; the
  login screen has no scrollable region (`overflow: hidden` root), so nothing
  is lost.
- **`localStorage['logos-mode']` persistence** — mode is app-level state in
  the sandbox (ThemeProvider); persisting per-design would fight it.
- **Mobile gate media query** (2733–2795): contains only `mp-ring-*` /
  agent-view rules; there are no `login-view` mobile rules in the prototype,
  so the ported design intentionally has none either.

## Assets

`login-ico-{github,github-dark,google,discord}.webp`,
`brand-{bittensor,bittensor-light,affine,affine-light}.webp` copied from
`marketing/assets/` (byte-identical to the data-URIs embedded in the
prototype markup/JS — verified by md5). `enso-{white,ink}.svg` generated from
the `#enso` symbol path as described above.

## Open questions for raychen

1. The night-theme block hides the gate's own light/dark toggle (the
   prototype expects the app topbar to own mode). This standalone port
   re-enables it (`display: flex` override, marked SANDBOX in login.css) so
   light mode stays reachable — should the product login keep its own toggle,
   or inherit mode with no local control?
2. Fonts: Jost 300/400 + Julius Sans One 400 ship as data-URI `@font-face`
   (~46 KB of CSS). Should these move into the webui font pipeline (real font
   files / preload) instead of living in a design stylesheet?
3. The gate colors are hard-coded night-theme values (`#0e0e0e`, `#f4f2ec`
   cream family) that ignore the app theme by design. Should the product
   login be theme-locked like this, or should these map onto oc-2 semantic
   tokens (accepting a visible shift)?
4. After sign-in the prototype hands off to the agent app via the
   slide-to-centre animation (`enterApp()` — the LOGOS mark lands where the
   app's hero watermark sits). Coordinating that continuity needs the login
   and app surfaces to share the mark's geometry — worth speccing?
5. The enso mark is a 172 KB path pre-rendered to two SVGs here; product
   probably wants a single currentColor SVG component instead of per-mode
   assets. OK to diverge from the prototype's img-src-swap mechanism?
