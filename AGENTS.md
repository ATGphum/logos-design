# logos-design — agent guide

Design sandbox for LOGOS. Prototypes are real React built on the design
language vendored from the product repo (`angosr/logos-webui`), so the
frontend dev can lift composition code instead of reinterpreting mockups.
This file is the canonical agent guide for every AI tool (Claude Code,
Codex, …). CLAUDE.md just points here.

## Commands

| command | what |
|---|---|
| `npm run dev` | Vite dev server — gallery at `/`, designs at `#/login`, `#/console` |
| `npm run build` | typecheck + production build (must pass before any PR) |
| `npm run build:single` | one self-contained `dist/index.html` — the shareable preview |
| `npm run sync` | re-vendor design language from logos-webui into `src/vendor/webui/` |
| `npm run drift` | mechanical drift report vs logos-webui main (`-- --mark` to advance state) |

## Layout

- `src/designs/<id>/` — one folder per design: root component (default export,
  registered in `src/designs/registry.ts`), CSS with that design's class
  prefix (`lg-*`, `cs-*`), assets, and a `NOTES.md` (structure map, token
  mapping, open questions — keep it current, it's the frontend handoff doc).
- `src/vendor/webui/` — synced copy of the product design language
  (theme system, token CSS, icons). **Never edit by hand**; only
  `npm run sync` writes here. Its `MANIFEST.json` records the source commit.
- `marketing/` — the marketing-page prototype, deliberately plain HTML
  (`llm-interface.html`). Not a React port candidate. `preview.html` is a
  build output — never commit it.
- `scripts/` — sync + drift mechanics. `drift-state.json` — last-reviewed
  upstream commit.

## Conventions

- Branch per change, PR into `main`; CI attaches downloadable rendered
  previews to every PR. Label every PR: `needs-frontend` (requires webui
  adaptation — fill the "Handoff notes" section of the PR template),
  `exploration`, `product-drift`, or `infra`.
- Merged PRs accumulate into a draft GitHub release (the design changelog
  for the frontend dev). Cut the release when a batch is ready to hand off.
- Designs may run AHEAD of the product on purpose. Vendored tokens/primitives
  are treated as stable atoms — widening the sync allowlist
  (`scripts/sync-from-webui.mjs`) needs the frontend dev's sign-off.
- Keep new deps out: fidelity work should need nothing beyond React + the
  vendored language. If a design seems to need a library, raise it in the PR.

## Drift check

The product→design drift runbook lives at
`.claude/skills/drift-check/SKILL.md` (Claude Code loads it as the
`drift-check` skill; from other tools, open the file and follow it verbatim).
