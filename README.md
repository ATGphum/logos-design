# LOGOS design

Design sandbox for LOGOS. Prototypes here are **real React built on the
product's own design language** (vendored from
[logos-webui](https://github.com/angosr/logos-webui)), so handing a design to
frontend means lifting composition code, not reinterpreting a mockup.

## Who does what

- **jeremy + scout (design):** branch → edit/create designs → PR. CI attaches a
  rendered, self-contained preview to every PR. Label your PR.
- **raychen (frontend):** the draft GitHub release is your changelog; the
  `needs-frontend` label is your queue. Each PR carries handoff notes and a
  preview. Link your logos-webui PR back to the design PR it implements —
  and if you had to diverge from the design, say so on that PR.

## Quickstart

```
npm install
npm run dev        # gallery at localhost:5173 — designs at #/login, #/console
```

`npm run build:single` produces `dist/index.html` — one file, everything
inlined. Send it to anyone; it opens without a server (same idea as
`marketing/build-preview.py`).

## The workflow

1. Branch, edit a design under `src/designs/<id>/` (or add a folder + register
   it in `src/designs/registry.ts`).
2. PR into `main` using the template — the **handoff notes** section is what
   raychen reads, treat it as the deliverable. Label it:
   `needs-frontend` / `exploration` / `product-drift` / `infra`.
3. Review happens on the CI preview build, not just the diff.
4. Merged PRs accumulate into a draft release ("design changelog"). Publish
   the release when a batch is ready for raychen.

## Staying in sync with the product

- `src/vendor/webui/` is a committed copy of the product's theme system,
  token CSS and icons — synced by `npm run sync`, recorded in
  `MANIFEST.json`, never edited by hand.
- `npm run drift` prints what changed upstream since the last review. The
  full runbook (AI-runnable from Claude Code or Codex) is
  `.claude/skills/drift-check/SKILL.md`: sync tokens, review upstream
  merges, file `product-drift` issues, advance `drift-state.json`.
- Designs may deliberately run ahead of the product — open `needs-frontend`
  PRs are pending product work, not drift.

## Marketing page

`marketing/llm-interface.html` stays a standalone HTML prototype (it isn't
built from product components). Open it directly in a browser; see
`marketing/README.md`. Never commit `marketing/preview.html`.

## Repo map

See [AGENTS.md](AGENTS.md) — canonical guide for structure, commands and
conventions (written for AI agents, accurate for humans too).

New here? [docs/ONBOARDING.md](docs/ONBOARDING.md) has the short version
for designers and for frontend.
