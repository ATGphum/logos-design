---
name: drift-check
description: Check the product repos (logos-webui, logos-infra) for UI changes the design sandbox should reflect — sync vendored tokens + mirrors, review merged upstream work, absorb changes into adopted designs, file product-drift issues. Run when asked to "check design drift", "sync with the product", or on a schedule.
---

# Product → design drift check

Everything mechanical lives in scripts; your job is the judgment layer.
This runbook is tool-agnostic — it works the same from Claude Code or any
agent that can run shell commands (Codex users: AGENTS.md points here).

Two upstreams feed the report: `angosr/logos-webui` (workbench) and
`angosr/logos-infra` (admin console + billing, `web-ui/`). Importable atoms
are vendored in `src/vendor/<name>/` (its MANIFEST.json commit is the synced
baseline); everything else is read straight from the gitignored local caches
(`.webui-cache/`, `.infra-cache/`), auto-cloned by the scripts.

## Steps

1. **Run the mechanical report** from the repo root:

   ```
   npm run drift
   ```

   Per upstream it prints (a) whether vendored atoms changed upstream since
   the last `npm run sync`, (b) per adopted design, an **Absorb** diff
   (upstream movement under the adopted path since adoption) and a
   **Handoff** diff (design copy vs upstream at the synced commit — the
   patch for the frontend dev), and (c) every commit merged to main since
   the last reviewed commit in `drift-state.json`, flagging newly added
   files as adoption candidates.

2. **If vendored files changed**: run `npm run sync`, then open a PR titled
   `sync: <source> design language @ <short-sha>` containing the
   `src/vendor/**` changes, labeled `product-drift`. Note
   in the PR body which tokens/values changed — that diff is exact, quote it.
   If a vendored change breaks the build (`npm run build`), fix the affected
   designs in the same PR and describe the breakage in the PR body.

3. **For each Absorb diff**: `npm run sync` already absorbs (or run
   `npm run absorb -- <design-id>` for one design).
   It three-way-merges upstream changes into the adapted copies
   — local adaptations survive, upstream-added files under adopted paths are
   pulled in, and overlapping edits leave `<<<<<<<` conflict markers (exit
   code 2). Resolve conflicts reading the upstream intent
   (`git -C .infra-cache show <sha>` / `git -C .webui-cache show <sha>`),
   then `npm run build`. Upstream DELETIONS are reported but kept — removing
   design work is a human call; raise it in the PR. absorb bumps
   `adopted_commit` in `UPSTREAM.json` itself.

4. **For each upstream commit in the review window**, decide whether it
   changes something a design in `src/designs/*` or
   `marketing/llm-interface.html` depicts. Read the actual diff in the
   upstream cache when the stat is ambiguous. Skip commits touching only
   tests, backend glue, build config, or copy the designs don't show.
   New-page files flagged as adoption candidates: mention them in the report
   so the designer can `npm run adopt` them.

5. **Before flagging drift, check the design backlog** — a difference is NOT
   drift if it's pending design work:

   ```
   gh pr list --label needs-frontend --state open
   gh issue list --label product-drift --state open
   ```

   Anything already covered by an open `needs-frontend` design PR is the
   product catching up to design (its Handoff diff is the patch). Anything
   already filed stays filed — don't duplicate.

6. **File one issue per genuine drift** in THIS repo (never in the product
   repos):

   ```
   gh issue create --label product-drift --title "drift: <surface> — <what changed>" --body "..."
   ```

   Body must include: the upstream commit(s) (`angosr/<repo>@<sha>`), which
   design/section is affected, what the product now does vs what the design
   shows, and a suggested fix scope. Issues are candidates for human review,
   not verdicts — say so when confidence is low.

7. **Advance the state** only after steps 2–6 are complete:

   ```
   npm run drift -- --mark
   ```

   Commit `drift-state.json` (plus any sync PR) — the mark is what prevents
   re-reviewing the same window next run.

8. **Report**: summarize vendored-sync status, absorb/handoff status per
   adopted design, commits reviewed, issues filed (with numbers), and
   anything skipped as not-UI-relevant.

## Guardrails

- Never edit `src/vendor/**` by hand — only `npm run sync` writes there.
  Design work on adopted pages happens in `src/designs/<id>/upstream/`
  (the adapted copy). Never commit the caches.
- Never push to `main` — sync PRs go through review like everything else.
- The design sandbox may deliberately be AHEAD of the product; a Handoff
  diff is usually intentional design work, not drift. When in doubt whether
  a difference is drift or unshipped design, file the issue as a question
  rather than asserting drift.
