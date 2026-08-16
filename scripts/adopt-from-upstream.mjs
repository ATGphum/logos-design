#!/usr/bin/env node
/**
 * Adopt an upstream page (or file/dir) into a design, straight from the
 * product repo at the last-synced commit (vendor MANIFEST). Provenance is
 * recorded so `npm run absorb` can three-way-merge later upstream changes
 * and `npm run drift` can print the handoff diff.
 *
 *   npm run adopt -- <source> <upstream-path> <design-id>
 *   npm run adopt -- infra components/billing recharge
 *     → copies logos-infra web-ui/src/components/billing/ into
 *       src/designs/recharge/upstream/components/billing/
 *     → records it in src/designs/recharge/UPSTREAM.json
 *
 * Paths are relative to the source's UI root (web-ui/src/ for infra,
 * src/ for webui). The copy lands under src/designs/<id>/upstream/ ON
 * PURPOSE: it will not compile as-is (imports point at app modules that
 * don't exist here). Adapt it inside the design — rewire imports to
 * src/vendor/ atoms or local stubs — and keep the adapted copy where it
 * landed so diffs stay path-aligned.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SOURCES, syncedCommit, filesAt, readAt } from "./sync-from-webui.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const [sourceName, upstreamPath, designId] = process.argv.slice(2)

const usage = () => {
  console.error("usage: npm run adopt -- <source> <upstream-path> <design-id>")
  console.error(`  source: ${SOURCES.map((s) => s.name).join(" | ")}`)
  console.error("  e.g.  npm run adopt -- infra components/billing recharge")
  process.exit(1)
}
if (!sourceName || !upstreamPath || !designId) usage()

const source = SOURCES.find((s) => s.name === sourceName)
if (!source) usage()

const commit = syncedCommit(source)
const files = filesAt(source, commit, upstreamPath)
if (files.length === 0) {
  console.error(`not found upstream @ ${commit.slice(0, 10)}: ${source.srcRoot}/${upstreamPath}`)
  console.error("(is the path right? paths are relative to the UI root — run `npm run sync` if stale)")
  process.exit(1)
}

const designDir = join(ROOT, "src", "designs", designId)
const destRoot = join(designDir, "upstream", upstreamPath)
if (existsSync(destRoot)) {
  console.error(`already adopted: ${join("src/designs", designId, "upstream", upstreamPath)}`)
  console.error("(delete it first to re-adopt, or adopt a narrower path)")
  process.exit(1)
}
for (const rel of files) {
  // rel is srcRoot-relative and starts with upstreamPath (or equals it, for a file)
  const dest = join(designDir, "upstream", rel)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, readAt(source, commit, rel))
}

const stateFile = join(designDir, "UPSTREAM.json")
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { adoptions: [] }
state.adoptions.push({
  source: source.name,
  path: upstreamPath,
  adopted_commit: commit,
  adopted_at: new Date().toISOString(),
})
writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n")

console.log(`adopted ${files.length} file(s) from logos-${source.name} ${source.srcRoot}/${upstreamPath} @ ${commit.slice(0, 10)}`)
console.log(`  → ${join("src/designs", designId, "upstream", upstreamPath)}`)
console.log(`  provenance recorded in ${join("src/designs", designId, "UPSTREAM.json")}`)
console.log("\nNext: adapt the copy (rewire app imports to vendored atoms/stubs),")
console.log("register the design in src/designs/registry.ts, and keep a NOTES.md.")
