#!/usr/bin/env node
/**
 * Absorb upstream changes into adopted design copies via three-way merge,
 * reading the product source straight from the git caches.
 *
 * For every adoption in src/designs/<id>/UPSTREAM.json, each file is merged:
 *
 *   base   = upstream file at the adoption's recorded commit
 *   theirs = upstream file at the last-synced commit (vendor MANIFEST)
 *   ours   = the design's adapted copy
 *
 * Clean hunks apply silently (your adaptations survive); overlapping edits
 * leave standard <<<<<<< conflict markers to resolve by hand. Files upstream
 * ADDED under an adopted directory are copied in; files upstream DELETED are
 * reported but kept (deleting design work is a human call). On success each
 * adoption's adopted_commit is bumped to the synced commit.
 *
 *   npm run sync              # first — absorb merges toward the synced commit
 *   npm run absorb            # all designs
 *   npm run absorb -- <id>    # one design
 *
 * After: resolve any conflicts, `npm run build`, review the diff.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import { SOURCES, syncedCommit, filesAt, readAt } from "./sync-from-webui.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DESIGNS_DIR = join(ROOT, "src", "designs")
const only = process.argv[2]

const listFiles = (p) =>
  statSync(p).isDirectory()
    ? readdirSync(p).flatMap((e) => listFiles(join(p, e)))
    : [p]

let designs = existsSync(DESIGNS_DIR) ? readdirSync(DESIGNS_DIR) : []
if (only) {
  if (!designs.includes(only)) {
    console.error(`no such design: ${only}`)
    process.exit(1)
  }
  designs = [only]
}

let totals = { merged: 0, conflicts: 0, added: 0, deleted: 0, upToDate: 0 }

for (const id of designs) {
  const stateFile = join(DESIGNS_DIR, id, "UPSTREAM.json")
  if (!existsSync(stateFile)) continue
  const state = JSON.parse(readFileSync(stateFile, "utf8"))
  let stateChanged = false

  for (const adoption of state.adoptions ?? []) {
    const source = SOURCES.find((s) => s.name === adoption.source)
    if (!source) {
      console.warn(`WARN ${id}: unknown source ${adoption.source}, skipping`)
      continue
    }
    const target = syncedCommit(source)
    if (target === adoption.adopted_commit) {
      totals.upToDate++
      continue
    }

    const theirFiles = filesAt(source, target, adoption.path)
    const oursRoot = join(DESIGNS_DIR, id, "upstream", adoption.path)
    if (theirFiles.length === 0) {
      console.warn(`WARN ${id}: ${adoption.path} gone upstream @ ${target.slice(0, 10)} — left as-is`)
      continue
    }

    console.log(`\n${id} ← ${adoption.source}/${adoption.path}: ${adoption.adopted_commit.slice(0, 10)} → ${target.slice(0, 10)}`)

    for (const rel of theirFiles) {
      // rel is srcRoot-relative; it equals adoption.path (file) or extends it (dir)
      const oursPath = join(DESIGNS_DIR, id, "upstream", rel)
      const theirs = readAt(source, target, rel)

      if (!existsSync(oursPath)) {
        // new upstream file under an adopted path → bring it in
        mkdirSync(dirname(oursPath), { recursive: true })
        writeFileSync(oursPath, theirs)
        console.log(`  A ${rel} (new upstream — adopted)`)
        totals.added++
        continue
      }

      const base = readAt(source, adoption.adopted_commit, rel)
      const ours = readFileSync(oursPath, "utf8")
      if (base === theirs) continue // upstream didn't change this file
      if (ours === base) {
        // we never adapted it — fast-forward
        writeFileSync(oursPath, theirs)
        console.log(`  M ${rel} (fast-forward)`)
        totals.merged++
        continue
      }

      // true three-way merge
      const tmp = join(tmpdir(), `absorb-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      mkdirSync(tmp, { recursive: true })
      const baseF = join(tmp, "base"); const theirsF = join(tmp, "theirs"); const oursF = join(tmp, "ours")
      writeFileSync(baseF, base ?? "")
      writeFileSync(theirsF, theirs)
      writeFileSync(oursF, ours)
      const r = spawnSync(
        "git", ["merge-file", "-L", `design:${id}`, "-L", "base", "-L", "upstream", oursF, baseF, theirsF],
        { encoding: "utf8" },
      )
      writeFileSync(oursPath, readFileSync(oursF, "utf8"))
      if (r.status === 0) {
        console.log(`  M ${rel} (merged clean)`)
        totals.merged++
      } else {
        console.log(`  C ${rel} (CONFLICT — markers left in file)`)
        totals.conflicts++
      }
    }

    // upstream deletions: files we track that no longer exist at the target
    if (existsSync(oursRoot)) {
      const theirSet = new Set(theirFiles)
      for (const abs of listFiles(oursRoot)) {
        const rel = join(adoption.path, relative(oursRoot, abs))
        if (!theirSet.has(rel) && readAt(source, adoption.adopted_commit, rel) !== null) {
          console.log(`  D ${rel} (deleted upstream — KEPT, remove by hand if agreed)`)
          totals.deleted++
        }
      }
    }

    adoption.adopted_commit = target
    adoption.absorbed_at = new Date().toISOString()
    stateChanged = true
  }

  if (stateChanged) {
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n")
  }
}

console.log(
  `\nabsorb: ${totals.merged} merged, ${totals.added} added, ${totals.conflicts} conflicts, ` +
    `${totals.deleted} upstream deletions kept, ${totals.upToDate} adoption(s) already current`,
)
if (totals.conflicts > 0) {
  console.log("resolve <<<<<<< markers, then `npm run build` before committing")
  process.exit(2)
}
