# logos-design — agent guide

Design sandbox for LOGOS. Prototypes are real React built on the design
language vendored from the product repos (`angosr/logos-webui` — the
workbench app — and `angosr/logos-infra` — the admin console + billing UI
in `web-ui/`), so the frontend dev can lift composition code instead of
reinterpreting mockups. This file is the canonical agent guide for every
AI tool (Claude Code, Codex, …). CLAUDE.md just points here.

## Commands

| command | what |
|---|---|
| `npm run dev` | Vite dev server — gallery at `/`, designs at `#/login`, `#/console` |
| `npm run build` | typecheck + production build (must pass before any PR) |
| `npm run build:single` | one self-contained `dist/index.html` — the shareable preview |
| `npm run sync` | pull everything newer from both upstreams: atoms → `src/vendor/`, then three-way-merge upstream changes into all adopted designs |
| `npm run adopt -- <source> <path> <id>` | copy an upstream page into a design, with provenance |
| `npm run sync:atoms` / `npm run absorb` | the two halves of sync, if ever needed separately (`absorb -- <id>` for one design) |
| `npm run drift` | mechanical drift report vs both upstreams (`-- --mark` to advance state) |

`npm run sync -- webui|infra` syncs one source; `WEBUI_REF`/`INFRA_REF`
pin a ref, `WEBUI_PATH`/`INFRA_PATH` use a local checkout.

## Layout

- `src/designs/<id>/` — one folder per design: root component (default export,
  registered in `src/designs/registry.ts`), CSS with that design's class
  prefix (`lg-*`, `cs-*`), assets, and a `NOTES.md` (structure map, token
  mapping, open questions — keep it current, it's the frontend handoff doc).
  Designs adopted from a product page also carry `UPSTREAM.json` (adoption
  provenance, written by `npm run adopt`) and the adapted copy under
  `src/designs/<id>/upstream/<mirror-path>` — keep that path alignment, the
  drift report depends on it.
- `src/vendor/<source>/` — synced design-language ATOMS (theme system, token
  CSS, icons) from each upstream. Importable by designs, type-checked.
  **Never edit by hand**; only `npm run sync` writes here. Each
  `MANIFEST.json` records the synced upstream commit — the baseline that
  adopt/absorb/drift measure against.
- `.webui-cache/`, `.infra-cache/` — gitignored local git clones of the
  upstreams, auto-created by the scripts. adopt/absorb/drift read product
  source straight from these; adoption paths are relative to each source's
  UI root (`src/` for webui, `web-ui/src/` for infra).
- `marketing/` — the marketing-page prototype, deliberately plain HTML
  (`llm-interface.html`). Not a React port candidate. `preview.html` is a
  build output — never commit it.
- `scripts/` — sync + adopt + drift mechanics. `drift-state.json` —
  last-reviewed upstream commits (one entry per source).

## Design ↔ product workflow

Designs mirror product pages and product pages absorb design work — both
directions are mechanical three-way diffs against the upstream source at
the synced commit:

- **Adopt** (product → design): `npm run adopt -- infra components/billing recharge`
  copies the page from the product repo into the design with provenance,
  then you adapt it (rewire app imports to `src/vendor/` atoms or local
  stubs) until it builds. New upstream pages show up in `npm run drift` as
  adoption candidates.
- **Absorb** (product → design, ongoing): part of `npm run sync` — upstream
  changes are three-way-merged into each adopted copy. Your adaptations
  survive, new upstream files under adopted paths are pulled in, overlapping
  edits leave standard conflict markers to resolve (sync exits 2). It bumps
  `adopted_commit` itself; `npm run drift` previews what sync would take in.
- **Handoff** (design → product): the drift report's Handoff diff (design
  copy vs upstream at the synced commit) is exactly the patch the frontend
  dev applies upstream. Label the PR `needs-frontend` and fill the Handoff
  notes.

## Conventions

- Branch per change, PR into `main`; CI attaches downloadable rendered
  previews to every PR. Label every PR: `needs-frontend` (requires product
  adaptation — fill the "Handoff notes" section of the PR template),
  `exploration`, `product-drift`, or `infra`.
- Merged PRs accumulate into a draft GitHub release (the design changelog
  for the frontend dev). Cut the release when a batch is ready to hand off.
- Designs may run AHEAD of the product on purpose. Vendored tokens/primitives
  are treated as stable atoms — widening the vendor allowlists
  (`scripts/sync-from-webui.mjs`) needs the frontend dev's sign-off.
- Keep new deps out: fidelity work should need nothing beyond React + the
  vendored language. If a design seems to need a library, raise it in the PR.

## Drift check

The product→design drift runbook lives at
`.claude/skills/drift-check/SKILL.md` (Claude Code loads it as the
`drift-check` skill; from other tools, open the file and follow it verbatim).
