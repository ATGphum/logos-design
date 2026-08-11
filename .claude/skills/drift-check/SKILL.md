---
name: drift-check
description: Check the logos-webui product code for UI changes the design sandbox should reflect — sync vendored tokens, review merged upstream work, file product-drift issues. Run when asked to "check design drift", "sync with the product", or on a schedule.
---

# Product → design drift check

Everything mechanical lives in scripts; your job is the judgment layer.
This runbook is tool-agnostic — it works the same from Claude Code or any
agent that can run shell commands (Codex users: AGENTS.md points here).

## Steps

1. **Run the mechanical report** from the repo root:

   ```
   npm run drift
   ```

   It prints (a) whether vendored design-language files changed upstream since
   the last `npm run sync`, and (b) every commit merged to `logos-webui` main
   since the last reviewed commit in `drift-state.json`, with per-commit file
   stats under `src/`.

2. **If vendored files changed**: run `npm run sync`, then open a PR titled
   `sync: webui design language @ <short-sha>` containing only `src/vendor/**`
   changes, labeled `product-drift`. Note in the PR body which tokens/values
   changed — that diff is exact, quote it. If a vendored change breaks the
   build (`npm run build`), fix the affected designs in the same PR and
   describe the breakage in the PR body.

3. **For each upstream commit in the review window**, decide whether it changes
   something a design in `src/designs/*` or `marketing/llm-interface.html`
   depicts. Read the actual diff in the upstream cache when the stat is
   ambiguous: `git -C .webui-cache show <sha>`. Skip commits touching only
   tests, backend glue, build config, or copy the designs don't show.

4. **Before flagging drift, check the design backlog** — a difference is NOT
   drift if it's pending design work:

   ```
   gh pr list --label needs-frontend --state open
   gh issue list --label product-drift --state open
   ```

   Anything already covered by an open `needs-frontend` design PR is the
   product catching up to design. Anything already filed stays filed — don't
   duplicate.

5. **File one issue per genuine drift** in THIS repo (never in logos-webui):

   ```
   gh issue create --label product-drift --title "drift: <surface> — <what changed>" --body "..."
   ```

   Body must include: the upstream commit(s) (`angosr/logos-webui@<sha>`),
   which design/section is affected, what the product now does vs what the
   design shows, and a suggested fix scope. Issues are candidates for human
   review, not verdicts — say so when confidence is low.

6. **Advance the state** only after steps 2–5 are complete:

   ```
   npm run drift -- --mark
   ```

   Commit `drift-state.json` (plus any sync PR) — the mark is what prevents
   re-reviewing the same window next run.

7. **Report**: summarize vendored-sync status, commits reviewed, issues filed
   (with numbers), and anything skipped as not-UI-relevant.

## Guardrails

- Never edit `src/vendor/**` by hand — only `npm run sync` writes there.
- Never push to `main` — sync PRs go through review like everything else.
- The design sandbox may deliberately be AHEAD of the product; when in doubt
  whether a difference is drift or unshipped design, file the issue as a
  question rather than asserting drift.
