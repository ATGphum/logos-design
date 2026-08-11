#!/usr/bin/env node
/**
 * Mechanical half of the product->design drift check. Prints a markdown
 * report; the judgment half (is a change drift? file issues) is the
 * drift-check runbook: .claude/skills/drift-check/SKILL.md.
 *
 *   npm run drift              # report only, changes nothing
 *   npm run drift -- --mark    # also record upstream HEAD as reviewed
 */
import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const UPSTREAM = "https://github.com/angosr/logos-webui.git"
const CACHE = process.env.WEBUI_PATH ?? join(ROOT, ".webui-cache")
const STATE_FILE = join(ROOT, "drift-state.json")
const MANIFEST_FILE = join(ROOT, "src", "vendor", "webui", "MANIFEST.json")

const sh = (cmd, cwd = CACHE) =>
  execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim()

if (!existsSync(CACHE)) {
  console.error(`cloning ${UPSTREAM} …`)
  execSync(`git clone --filter=blob:none ${UPSTREAM} ${JSON.stringify(CACHE)}`, { stdio: "inherit" })
}
sh("git fetch origin")

const head = sh("git rev-parse origin/main")
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"))
const state = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE, "utf8"))
  : { last_reviewed_commit: manifest.commit }

const short = (sha) => sha.slice(0, 10)
console.log(`# Drift report — logos-webui @ ${short(head)}\n`)

// ---- 1. Mechanical: vendored design language ------------------------------
console.log(`## Vendored design language (synced @ ${short(manifest.commit)})\n`)
const vendorPaths = manifest.allowlist.map((p) => JSON.stringify(p)).join(" ")
const vendorDiff = sh(`git diff --stat ${manifest.commit} ${head} -- ${vendorPaths}`)
if (vendorDiff) {
  console.log("Token/primitive files changed upstream since last sync — run `npm run sync`")
  console.log("and open a `product-drift` PR with the vendor diff:\n")
  console.log("```\n" + vendorDiff + "\n```\n")
} else {
  console.log("No changes to vendored files since last sync. ✅\n")
}

// ---- 2. Review window: merged work since last drift review ----------------
console.log(`## Upstream changes since last review (${short(state.last_reviewed_commit)})\n`)
const range = `${state.last_reviewed_commit}..${head}`
const commits = sh(`git log --first-parent --format=%H%x09%s ${range}`)
if (!commits) {
  console.log("Nothing merged since the last review. ✅\n")
} else {
  for (const line of commits.split("\n")) {
    const [sha, subject] = line.split("\t")
    const stat = sh(`git show --stat --format= ${sha} -- src`)
      .split("\n").filter(Boolean)
    console.log(`### ${subject} (${short(sha)})`)
    if (stat.length === 0) {
      console.log("_touches nothing under src/ — likely not UI-relevant_\n")
      continue
    }
    console.log("```")
    console.log(stat.slice(0, 25).join("\n"))
    if (stat.length > 25) console.log(`… ${stat.length - 25} more files`)
    console.log("```\n")
  }
}

// ---- 3. State -------------------------------------------------------------
if (process.argv.includes("--mark")) {
  writeFileSync(
    STATE_FILE,
    JSON.stringify({ last_reviewed_commit: head, marked_at: new Date().toISOString() }, null, 2) + "\n",
  )
  console.log(`\n_marked ${short(head)} as reviewed in drift-state.json_`)
} else {
  console.log(`\n_report only — run with --mark after review to advance drift-state.json_`)
}
