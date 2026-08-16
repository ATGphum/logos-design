#!/usr/bin/env node
/**
 * Sync design-language ATOMS from the product repos into src/vendor/<name>/
 * (theme, tokens, icons — type-checked, importable by designs).
 *
 * Upstreams:
 *   - angosr/logos-webui   (workbench app,          UI root src/)
 *   - angosr/logos-infra   (admin console + billing, UI root web-ui/src/)
 *
 * Each vendor MANIFEST.json records the synced upstream commit — that commit
 * is the shared baseline for `npm run adopt` / `npm run absorb` / `npm run
 * drift`, which read the product source directly from the local git caches
 * (.webui-cache/, .infra-cache/ — auto-cloned, gitignored).
 *
 *   npm run sync                 # fetch both upstreams' main, copy allowlists
 *   npm run sync -- webui        # sync a single source (webui | infra)
 *   WEBUI_REF=<sha|branch> npm run sync     # pin the webui source
 *   INFRA_REF=<sha|branch> npm run sync     # pin the infra source
 *   WEBUI_PATH=/path/to/checkout npm run sync   # use a local clone as-is
 *   INFRA_PATH=/path/to/checkout npm run sync
 */
import { execSync, spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const VENDOR_EXCLUDE = /\.test\.(ts|tsx)$|-source\.css$/

// Vendor allowlists are deliberately narrow: theme systems, token/global
// stylesheets, icon registries. Widen only with raychen's sign-off —
// everything here is treated as a stable atom by designs.
export const SOURCES = [
  {
    name: "webui",
    upstream: "https://github.com/angosr/logos-webui.git",
    cache: join(ROOT, ".webui-cache"),
    envPrefix: "WEBUI",
    srcRoot: "src", // upstream UI source root — adopt/absorb paths are relative to this
    vendor: join(ROOT, "src", "vendor", "webui"),
    allowlist: [
      { from: "src/theme", to: "theme" },
      { from: "src/styles", to: "styles" },
      { from: "src/components/ui/Icons.tsx", to: "components/Icons.tsx" },
    ],
  },
  {
    name: "infra",
    upstream: "https://github.com/angosr/logos-infra.git",
    cache: join(ROOT, ".infra-cache"),
    envPrefix: "INFRA",
    srcRoot: "web-ui/src", // upstream UI source root — adopt/absorb paths are relative to this
    vendor: join(ROOT, "src", "vendor", "infra"),
    allowlist: [
      // logos-ui is the scoped design-language workspace inside web-ui;
      // *-source.css raw static dumps are excluded (see VENDOR_EXCLUDE).
      { from: "web-ui/src/logos-ui/styles", to: "styles" },
      { from: "web-ui/src/hooks/useLogosTheme.ts", to: "hooks/useLogosTheme.ts" },
      { from: "web-ui/src/index.css", to: "index.css" },
    ],
  },
]

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim()

/** The local git cache for a source, cloning it if absent. Returns its dir. */
export function ensureCache({ upstream, cache, envPrefix }) {
  const local = process.env[`${envPrefix}_PATH`]
  if (local) {
    if (!existsSync(local)) throw new Error(`${envPrefix}_PATH does not exist: ${local}`)
    return local
  }
  if (!existsSync(cache)) {
    console.log(`cloning ${upstream} …`)
    sh(`git clone --filter=blob:none ${upstream} ${JSON.stringify(cache)}`)
  }
  return cache
}

/** The commit this repo is synced to (from the source's vendor MANIFEST). */
export function syncedCommit(source) {
  return JSON.parse(readFileSync(join(source.vendor, "MANIFEST.json"), "utf8")).commit
}

/** List upstream files under srcRoot/<path> at a commit (paths relative to srcRoot). */
export function filesAt(source, commit, path = "") {
  const cache = ensureCache(source)
  const spec = path ? `${source.srcRoot}/${path}` : source.srcRoot
  const r = spawnSync("git", ["ls-tree", "-r", "--name-only", commit, "--", spec],
    { cwd: cache, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`git ls-tree failed in ${cache}: ${r.stderr}`)
  return r.stdout.split("\n").filter(Boolean).map((f) => relative(source.srcRoot, f))
}

/** Read one upstream file (path relative to srcRoot) at a commit; null if absent. */
export function readAt(source, commit, path) {
  const cache = ensureCache(source)
  const r = spawnSync("git", ["show", `${commit}:${source.srcRoot}/${path}`],
    { cwd: cache, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  return r.status === 0 ? r.stdout : null
}

function copyTree(fromAbs, toAbs, { exclude, base, copied }) {
  if (statSync(fromAbs).isDirectory()) {
    for (const entry of readdirSync(fromAbs)) {
      copyTree(join(fromAbs, entry), join(toAbs, entry), { exclude, base, copied })
    }
    return
  }
  if (exclude?.test(fromAbs)) return
  mkdirSync(dirname(toAbs), { recursive: true })
  cpSync(fromAbs, toAbs)
  copied.push(relative(base, toAbs))
}

function syncSource(source) {
  const { name, upstream, vendor, allowlist, envPrefix } = source
  const ref = process.env[`${envPrefix}_REF`] ?? "main"
  const src = ensureCache(source)
  if (!process.env[`${envPrefix}_PATH`]) {
    sh(`git fetch origin`, src)
    sh(`git checkout --detach ${ref === "main" ? "origin/main" : ref}`, src)
  }

  const commit = sh("git rev-parse HEAD", src)
  const commitDate = sh("git show -s --format=%cI HEAD", src)

  rmSync(vendor, { recursive: true, force: true })
  mkdirSync(vendor, { recursive: true })
  const vendored = []
  for (const { from, to } of allowlist) {
    const fromAbs = join(src, from)
    if (!existsSync(fromAbs)) {
      console.warn(`WARN allowlist entry missing upstream: ${from}`)
      continue
    }
    copyTree(fromAbs, join(vendor, to), { exclude: VENDOR_EXCLUDE, base: vendor, copied: vendored })
  }
  writeFileSync(
    join(vendor, "MANIFEST.json"),
    JSON.stringify(
      {
        upstream, ref, commit, commitDate,
        allowlist: allowlist.map((a) => a.from),
        files: vendored.sort(),
      },
      null,
      2,
    ) + "\n",
  )
  writeFileSync(
    join(vendor, "README.md"),
    `# Vendored from logos-${name} — DO NOT EDIT\n\n` +
      "Synced by `npm run sync` (scripts/sync-from-webui.mjs). Edits here are\n" +
      "overwritten on every sync. See MANIFEST.json for the source commit —\n" +
      "it is also the baseline for `npm run adopt` / `absorb` / `drift`.\n",
  )

  console.log(`synced logos-${name} @ ${commit.slice(0, 10)} (${commitDate}): ${vendored.length} atom files`)
}

// Only sync when run directly — other scripts import the helpers above.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = process.argv[2]
  const selected = only ? SOURCES.filter((s) => s.name === only) : SOURCES
  if (only && selected.length === 0) {
    console.error(`unknown source ${JSON.stringify(only)} — expected one of: ${SOURCES.map((s) => s.name).join(", ")}`)
    process.exit(1)
  }
  for (const source of selected) syncSource(source)
}
