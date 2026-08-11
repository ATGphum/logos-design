#!/usr/bin/env node
/**
 * Sync the design language from angosr/logos-webui into src/vendor/webui/.
 *
 * The vendored copy is COMMITTED — designs build offline, and a `git diff`
 * of src/vendor/ after a sync is the mechanical half of the drift check.
 *
 *   npm run sync                 # fetch upstream main, copy allowlist
 *   WEBUI_REF=<sha|branch> npm run sync
 *   WEBUI_PATH=/path/to/checkout npm run sync   # use a local clone as-is
 */
import { execSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const UPSTREAM = "https://github.com/angosr/logos-webui.git"
const CACHE = join(ROOT, ".webui-cache")
const VENDOR = join(ROOT, "src", "vendor", "webui")
const REF = process.env.WEBUI_REF ?? "main"

// What we vendor. Deliberately narrow: the theme system, the token/global
// stylesheets, and the icon registry. Widen only with raychen's sign-off —
// everything here is treated as a stable atom by designs.
const ALLOWLIST = [
  { from: "src/theme", to: "theme" },
  { from: "src/styles", to: "styles" },
  { from: "src/components/ui/Icons.tsx", to: "components/Icons.tsx" },
]
const EXCLUDE = /\.test\.(ts|tsx)$/

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim()

let src = process.env.WEBUI_PATH
if (src) {
  if (!existsSync(src)) throw new Error(`WEBUI_PATH does not exist: ${src}`)
} else {
  if (!existsSync(CACHE)) {
    console.log(`cloning ${UPSTREAM} …`)
    sh(`git clone --filter=blob:none ${UPSTREAM} ${JSON.stringify(CACHE)}`)
  }
  sh(`git fetch origin`, CACHE)
  sh(`git checkout --detach ${REF === "main" ? "origin/main" : REF}`, CACHE)
  src = CACHE
}

const commit = sh("git rev-parse HEAD", src)
const commitDate = sh("git show -s --format=%cI HEAD", src)

rmSync(VENDOR, { recursive: true, force: true })
mkdirSync(VENDOR, { recursive: true })

const copied = []
function copyEntry(fromAbs, toAbs) {
  if (statSync(fromAbs).isDirectory()) {
    for (const name of readdirSync(fromAbs)) {
      copyEntry(join(fromAbs, name), join(toAbs, name))
    }
    return
  }
  if (EXCLUDE.test(fromAbs)) return
  mkdirSync(dirname(toAbs), { recursive: true })
  cpSync(fromAbs, toAbs)
  copied.push(relative(VENDOR, toAbs))
}
for (const { from, to } of ALLOWLIST) {
  const fromAbs = join(src, from)
  if (!existsSync(fromAbs)) {
    console.warn(`WARN allowlist entry missing upstream: ${from}`)
    continue
  }
  copyEntry(fromAbs, join(VENDOR, to))
}

writeFileSync(
  join(VENDOR, "MANIFEST.json"),
  JSON.stringify(
    {
      upstream: UPSTREAM,
      ref: REF,
      commit,
      commitDate,
      allowlist: ALLOWLIST.map((a) => a.from),
      files: copied.sort(),
    },
    null,
    2,
  ) + "\n",
)
writeFileSync(
  join(VENDOR, "README.md"),
  "# Vendored from logos-webui — DO NOT EDIT\n\n" +
    "Synced by `npm run sync` (scripts/sync-from-webui.mjs). Edits here are\n" +
    "overwritten on every sync. See MANIFEST.json for the source commit.\n",
)

console.log(`synced ${copied.length} files from logos-webui @ ${commit.slice(0, 10)} (${commitDate})`)
