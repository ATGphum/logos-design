#!/usr/bin/env node
/**
 * Handoff changelist for raychen: how the adopted design copies differ from
 * the product repos, split into what should be APPLIED upstream vs what is
 * sandbox plumbing to ignore.
 *
 *   design change  — file differs and is NOT a shim → the patch to apply
 *   sandbox shim   — file contains the "DESIGN SHIM" marker (or rewrites an
 *                    import with that marker) → exists only so the page runs
 *                    without a backend; never apply upstream
 *
 * Diffs are taken against each source's last-synced commit (vendor
 * MANIFEST.json). Run `npm run sync` first for a changelist against current
 * upstream main.
 *
 *   npm run handoff                # markdown report to stdout
 *   npm run handoff -- --patch-dir handoff-patches   # also write .patch files
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { SOURCES, syncedCommit, filesAt, readAt } from "./sync-from-webui.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DESIGNS_DIR = join(ROOT, "src", "designs")
const SHIM_MARKER = "DESIGN SHIM"
// Whole-file shims carry a "DESIGN SHIM — …" header; inline import rewrites
// in otherwise-real files use "DESIGN SHIM (was …)".
const WHOLE_FILE_MARKER = "DESIGN SHIM —"

const patchDirFlag = process.argv.indexOf("--patch-dir")
const patchDir = patchDirFlag !== -1 ? join(ROOT, process.argv[patchDirFlag + 1]) : null

const short = (sha) => sha.slice(0, 10)
const listFiles = (p) =>
  statSync(p).isDirectory() ? readdirSync(p).flatMap((e) => listFiles(join(p, e))) : [p]

function unifiedDiff(upstreamRel, theirs, oursPath) {
  const tmp = join(tmpdir(), `handoff-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmp, { recursive: true })
  const theirsFile = join(tmp, "upstream")
  writeFileSync(theirsFile, theirs ?? "")
  const r = spawnSync(
    "git",
    ["diff", "--no-index", `--src-prefix=a/${upstreamRel}#`, `--dst-prefix=b/${upstreamRel}#`, "--", theirsFile, oursPath],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
  // Rewrite the temp-file headers into upstream-relative paths so the patch
  // applies with `git apply -p1` in the product repo.
  return r.stdout
    .replace(new RegExp(`a/${escapeReg(upstreamRel)}#[^\\n]*`, "g"), `a/${upstreamRel}`)
    .replace(new RegExp(`b/${escapeReg(upstreamRel)}#[^\\n]*`, "g"), `b/${upstreamRel}`)
    .replace(/^diff --git .*$/m, `diff --git a/${upstreamRel} b/${upstreamRel}`)
}

const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

let anything = false
for (const source of SOURCES) {
  const synced = syncedCommit(source)
  const sections = []
  const patches = []

  for (const id of existsSync(DESIGNS_DIR) ? readdirSync(DESIGNS_DIR) : []) {
    const stateFile = join(DESIGNS_DIR, id, "UPSTREAM.json")
    if (!existsSync(stateFile)) continue
    const { adoptions = [] } = JSON.parse(readFileSync(stateFile, "utf8"))
    for (const a of adoptions.filter((a) => a.source === source.name)) {
      const oursRoot = join(DESIGNS_DIR, id, "upstream", a.path)
      if (!existsSync(oursRoot)) continue
      const changes = []
      const shims = []
      const oursFiles = listFiles(oursRoot).map((f) =>
        statSync(oursRoot).isFile() ? a.path : join(a.path, relative(oursRoot, f)))
      const theirsFiles = filesAt(source, synced, a.path)
      for (const rel of new Set([...oursFiles, ...theirsFiles])) {
        const oursPath = join(DESIGNS_DIR, id, "upstream", rel)
        const ours = existsSync(oursPath) ? readFileSync(oursPath, "utf8") : null
        const theirs = readAt(source, synced, rel)
        if (ours === theirs) continue
        if (ours === null) { changes.push({ rel, kind: "deleted in design" }); continue }
        // Whole-file shim vs design file with inline shim rewrites: the diff
        // of the latter gets flagged so shim hunks aren't applied upstream.
        if (ours.slice(0, 400).includes(WHOLE_FILE_MARKER)) {
          shims.push({ rel, kind: theirs === null ? "shim (new file)" : "shim (replaces upstream)" })
          continue
        }
        const diff = unifiedDiff(`${source.srcRoot}/${rel}`, theirs, oursPath)
        changes.push({
          rel,
          kind: theirs === null ? "added" : "modified",
          diff,
          shimHunks: diff.includes(SHIM_MARKER),
        })
      }
      if (changes.length === 0 && shims.length === 0) continue
      sections.push({ design: id, path: a.path, adopted: a.adopted_commit, changes, shims })
      patches.push(...changes.filter((c) => c.diff).map((c) => c.diff))
    }
  }

  if (sections.length === 0) continue
  anything = true
  console.log(`# Handoff — logos-${source.name} (vs ${short(synced)})\n`)
  for (const s of sections) {
    console.log(`## design \`${s.design}\` ← \`${s.path}\` (adopted @ ${short(s.adopted)})\n`)
    const real = s.changes.filter((c) => c.diff || c.kind === "deleted in design")
    if (real.length === 0) {
      console.log("No design changes to apply — all differences are sandbox shims. ✅\n")
    } else {
      console.log("### Apply upstream\n")
      for (const c of real) console.log(`- \`${source.srcRoot}/${c.rel}\` (${c.kind}${c.shimHunks ? " — contains DESIGN SHIM hunks, skip those" : ""})`)
      console.log("")
      for (const c of real.filter((c) => c.diff)) {
        if (c.shimHunks) console.log(`> ⚠️ Hunks whose lines mention \`${SHIM_MARKER}\` are sandbox-only import rewrites — do not apply those hunks.\n`)
        console.log("```diff\n" + c.diff.trimEnd() + "\n```\n")
      }
    }
    if (s.shims.length > 0) {
      console.log(`### Sandbox shims — do NOT apply (${s.shims.length})\n`)
      for (const c of s.shims) console.log(`- \`${source.srcRoot}/${c.rel}\` (${c.kind})`)
      console.log("")
    }
  }
  if (patchDir && patches.length > 0) {
    mkdirSync(patchDir, { recursive: true })
    const file = join(patchDir, `${source.name}-handoff.patch`)
    writeFileSync(file, patches.join("\n"))
    console.log(`_patch written: ${relative(ROOT, file)} (git apply -p1 in the ${source.name} repo)_\n`)
  }
}

if (!anything) {
  console.log("# Handoff\n\nNo adopted design differs from upstream (beyond nothing at all) — nothing to hand off. ✅")
}
