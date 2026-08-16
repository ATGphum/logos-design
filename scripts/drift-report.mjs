#!/usr/bin/env node
/**
 * Mechanical half of the product->design drift check, across both product
 * upstreams (logos-webui and logos-infra — see sync-from-webui.mjs SOURCES).
 * Prints a markdown report; the judgment half (is a change drift? file
 * issues) is the drift-check runbook: .claude/skills/drift-check/SKILL.md.
 *
 * Per upstream:
 *   1. vendored atoms   — did allowlisted token/theme files change upstream?
 *   2. adopted designs  — absorb: upstream changes under adopted paths since
 *                         adoption (cleared by `npm run absorb`); handoff:
 *                         design copy vs upstream at the synced commit — the
 *                         patch for the frontend dev
 *   3. review window    — merged upstream commits since last --mark
 *
 *   npm run drift              # report only, changes nothing
 *   npm run drift -- --mark    # also record upstream HEADs as reviewed
 */
import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { SOURCES, ensureCache, syncedCommit, filesAt, readAt } from "./sync-from-webui.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const STATE_FILE = join(ROOT, "drift-state.json")
const DESIGNS_DIR = join(ROOT, "src", "designs")

const short = (sha) => sha.slice(0, 10)
const rawState = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}
// Legacy shape was a single {last_reviewed_commit} for webui.
const state = rawState.last_reviewed_commit ? { webui: rawState } : rawState
const nextState = {}

// Designs with recorded adoptions.
const adoptions = []
if (existsSync(DESIGNS_DIR)) {
  for (const id of readdirSync(DESIGNS_DIR)) {
    const f = join(DESIGNS_DIR, id, "UPSTREAM.json")
    if (!existsSync(f)) continue
    for (const a of JSON.parse(readFileSync(f, "utf8")).adoptions ?? []) {
      adoptions.push({ design: id, ...a })
    }
  }
}

for (const source of SOURCES) {
  const { name, srcRoot } = source
  const dir = ensureCache(source)
  const sh = (cmd, cwd = dir) =>
    execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim()
  const shOk = (cmd, cwd) => { try { return sh(cmd, cwd) } catch { return null } }
  // git diff --no-index exits 1 when files differ — capture stdout either way
  const shDiff = (cmd, cwd) => {
    try { return sh(cmd, cwd) } catch (e) { return e.stdout ? e.stdout.toString().trim() : null }
  }

  sh("git fetch origin")
  const head = sh("git rev-parse origin/main")
  const synced = syncedCommit(source)
  const manifest = JSON.parse(readFileSync(join(source.vendor, "MANIFEST.json"), "utf8"))
  const reviewed = state[name]?.last_reviewed_commit ?? synced
  nextState[name] = { last_reviewed_commit: head }

  console.log(`# Drift report — logos-${name} @ ${short(head)}\n`)

  // ---- 1. Mechanical: vendored design language ----------------------------
  console.log(`## Vendored atoms (synced @ ${short(synced)})\n`)
  const vendorPaths = manifest.allowlist.map((p) => JSON.stringify(p)).join(" ")
  const vendorDiff = sh(`git diff --stat ${synced} ${head} -- ${vendorPaths}`)
  if (vendorDiff) {
    console.log("Token/primitive files changed upstream since last sync — run `npm run sync`")
    console.log("and open a `product-drift` PR with the vendor diff:\n")
    console.log("```\n" + vendorDiff + "\n```\n")
  } else {
    console.log("No changes to vendored files since last sync. ✅\n")
  }

  // ---- 2. Adopted designs: absorb + handoff --------------------------------
  const mine = adoptions.filter((a) => a.source === name)
  console.log(`## Adopted designs\n`)
  if (mine.length === 0) {
    console.log("No designs have adopted pages from this source yet (`npm run adopt`).\n")
  }
  for (const a of mine) {
    const designCopy = join(DESIGNS_DIR, a.design, "upstream", a.path)
    console.log(`### ${a.design} ← ${a.path} (adopted @ ${short(a.adopted_commit)})\n`)

    // absorb: upstream movement under the adopted path since adoption
    const absorb = shOk(`git diff --stat ${a.adopted_commit} ${head} -- ${JSON.stringify(`${srcRoot}/${a.path}`)}`)
    if (absorb == null) {
      console.log("_adopted commit unknown to the cache — re-sync or check UPSTREAM.json_\n")
    } else if (absorb) {
      console.log("**Absorb** — upstream changed since adoption (run `npm run sync && npm run absorb`):\n")
      console.log("```\n" + absorb + "\n```\n")
    } else {
      console.log("Absorb: upstream unchanged since adoption. ✅\n")
    }

    // handoff: design copy vs upstream at the synced commit (path-aligned).
    // Extract "theirs" to a temp tree so git diff --no-index can walk both.
    const theirFiles = filesAt(source, synced, a.path)
    if (theirFiles.length === 0) {
      console.log(`Handoff: path no longer exists upstream @ ${short(synced)} (removed upstream?).\n`)
    } else if (!existsSync(designCopy)) {
      console.log(`Handoff: design copy missing at ${join("src/designs", a.design, "upstream", a.path)}.\n`)
    } else {
      const tmp = join(tmpdir(), `handoff-${name}-${a.design}-${Date.now()}`)
      for (const rel of theirFiles) {
        const dest = join(tmp, rel)
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, readAt(source, synced, rel))
      }
      const handoff = shDiff(
        `git diff --no-index --stat ${JSON.stringify(join(tmp, a.path))} ${JSON.stringify(designCopy)}`,
        ROOT,
      )
      if (handoff) {
        console.log("**Handoff** — design copy differs from upstream (the patch for the frontend dev):\n")
        console.log("```\n" + handoff + "\n```\n")
      } else {
        console.log("Handoff: design copy identical to upstream. ✅\n")
      }
    }
  }

  // ---- 3. Review window: merged work since last drift review --------------
  console.log(`## Upstream changes since last review (${short(reviewed)})\n`)
  const commits = sh(`git log --first-parent --format=%H%x09%s ${reviewed}..${head}`)
  if (!commits) {
    console.log("Nothing merged since the last review. ✅\n")
  } else {
    for (const line of commits.split("\n")) {
      const [sha, subject] = line.split("\t")
      const stat = sh(`git show --stat --format= ${sha} -- ${JSON.stringify(srcRoot)}`)
        .split("\n").filter(Boolean)
      console.log(`### ${subject} (${short(sha)})`)
      if (stat.length === 0) {
        console.log("_touches no UI source — likely not UI-relevant_\n")
        continue
      }
      // Surface brand-new pages: added files are adoption candidates.
      const added = sh(`git show --diff-filter=A --name-only --format= ${sha} -- ${JSON.stringify(srcRoot)}`)
        .split("\n").filter(Boolean)
      console.log("```")
      console.log(stat.slice(0, 25).join("\n"))
      if (stat.length > 25) console.log(`… ${stat.length - 25} more files`)
      console.log("```")
      if (added.length > 0) {
        console.log(`**New files** (adoption candidates): ${added.map((f) => `\`${f}\``).join(", ")}`)
      }
      console.log("")
    }
  }
}

// ---- State ------------------------------------------------------------------
if (process.argv.includes("--mark")) {
  const marked_at = new Date().toISOString()
  const out = Object.fromEntries(
    Object.entries(nextState).map(([k, v]) => [k, { ...v, marked_at }]),
  )
  writeFileSync(STATE_FILE, JSON.stringify(out, null, 2) + "\n")
  console.log(`\n_marked upstream HEADs as reviewed in drift-state.json_`)
} else {
  console.log(`\n_report only — run with --mark after review to advance drift-state.json_`)
}
