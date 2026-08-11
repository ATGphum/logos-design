# Onboarding note — paste into chat for Scout / raychen

**Scout (design):** We design in code now — `github.com/ATGphum/logos-design`.
Clone it, `npm install`, `npm run dev`. One folder per design under
`src/designs/`; the gallery lists them. Branch → PR for every change; keep
branches short-lived and rebase before opening. CI attaches a rendered
preview file to your PR, so review the *picture*, not the diff. Fill in the
PR template's handoff notes if the change needs frontend work, and label the
PR (`needs-frontend` / `exploration`). Two rules: never edit
`src/vendor/` (it's synced from the product repo), and never commit
`marketing/preview.html`. AI agents know their way around — the repo has
AGENTS.md/CLAUDE.md, so "port my change from this sketch" works in
Claude Code or Codex from a fresh clone.

**raychen (frontend):** The repo's draft GitHub release is the design
changelog — we'll publish it when a batch is ready. PRs labeled
`needs-frontend` are your queue; each has handoff notes and a downloadable
rendered preview (self-contained HTML). Designs are React on top of the
design language vendored from logos-webui (`src/vendor/webui/` +
`MANIFEST.json` says which commit), so lifting composition code should
mostly work. Each design folder has a `NOTES.md` with the component map and
token mapping. Two asks: (1) link your logos-webui PR back to the design PR
it implements, and note on the design PR if you had to diverge; (2) the
vendor sync allowlist (`scripts/sync-from-webui.mjs`) is deliberately
narrow — theme + Icons; sanity-check it and tell us what else is stable
enough to treat as shared atoms.
