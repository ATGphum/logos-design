/**
 * Demo data for the console design, preserved verbatim from
 * marketing/llm-interface.html (console script, lines 3826-4134, and the
 * agent-surface markup/scripts, lines 4186-5535).
 */

/* ===== INSTANCE STATE =====
   One source of truth for the access control, the sidebar sub-hierarchy and the
   instances table. Replace CI_LIST with the backend payload.
   Empty list => "Access agent" routes to the create-instance scene instead of the agent. */
export interface Instance {
  id: string
  name: string
  status: string
}

export const CI_LIST: Instance[] = [
  { id: "inst_05ce0bb2-b383-4bb5-a4d6-edfa108dde62", name: "scout", status: "running" },
  { id: "inst_1b74d9af-2c60-41ee-9f03-71cc4a2be810", name: "atlas", status: "running" },
  { id: "inst_9e0c33d1-8ab4-4d72-b115-2f6ad90ce447", name: "meridian", status: "running" },
  { id: "inst_47fb1220-5d19-4a86-8c30-9b0e5177ac93", name: "kestrel", status: "running" },
  { id: "inst_c8a5f6e3-7104-4bd9-a2f7-3e59d0c14b78", name: "vantage", status: "running" },
  { id: "inst_63d2e8b7-9f41-4c05-b6ea-08fc7a259d31", name: "harbor", status: "running" },
]

/** how many instances the sidebar lists inline */
export const CI_SIDE_MAX = 3

/** Instances table rows (cs-panel-instances) — verbatim from the prototype table. */
export interface InstanceRow {
  ava: string
  name: string
  id: string
  owner: string
}

export const CI_TABLE_ROWS: InstanceRow[] = [
  { ava: "S", name: "scout", id: "inst_05ce0bb2-b383-4bb5-a4d6-edfa108dde62", owner: "scout tesy" },
  { ava: "A", name: "atlas", id: "inst_1b74d9af-2c60-41ee-9f03-71cc4a2be810", owner: "atlas ops" },
  { ava: "M", name: "meridian", id: "inst_9e0c33d1-8ab4-4d72-b115-2f6ad90ce447", owner: "meridian lab" },
  { ava: "K", name: "kestrel", id: "inst_47fb1220-5d19-4a86-8c30-9b0e5177ac93", owner: "kestrel node" },
  { ava: "V", name: "vantage", id: "inst_c8a5f6e3-7104-4bd9-a2f7-3e59d0c14b78", owner: "vantage core" },
  { ava: "H", name: "harbor", id: "inst_63d2e8b7-9f41-4c05-b6ea-08fc7a259d31", owner: "harbor test" },
]

/** API keys table (cs-panel-api) — verbatim. */
export interface ApiKeyRow {
  name: string
  key: string
  dot: "ok" | "warn" | "err"
  status: string
  budget: string
  tokens: string
  created: string
  action: string
}

export const API_KEYS: ApiKeyRow[] = [
  { name: "production", key: "sk-logos-7f3a-••••-b21c", dot: "ok", status: "active", budget: "$0.00", tokens: "231,004,113", created: "2026-05-02", action: "Copy" },
  { name: "staging", key: "sk-logos-90dd-••••-4e01", dot: "ok", status: "active", budget: "$0.00", tokens: "168,220,540", created: "2026-05-19", action: "Copy" },
  { name: "benchmarks", key: "sk-logos-a114-••••-77c9", dot: "warn", status: "limited", budget: "$0.00", tokens: "60,313,444", created: "2026-06-07", action: "Copy" },
  { name: "legacy", key: "sk-logos-31be-••••-0d2f", dot: "err", status: "deleted", budget: "—", tokens: "—", created: "2026-03-28", action: "Restore" },
]

/** Console sidebar navigation — item labels + csNav() arguments, verbatim. */
export interface NavItem {
  label: string
  panel: string
  title: string
  sub: string
}

export type NavEntry = { group: string } | { item: NavItem; bottom?: boolean; back?: boolean }

export const CS_NAV: NavEntry[] = [
  { group: "Workspace" },
  { item: { label: "/ Overview", panel: "overview", title: "Overview", sub: "Your credit, your instances, and what they are costing you." } },
  { item: { label: "/ Instances", panel: "instances", title: "Instances", sub: "Deployment instances across your machines." } },
  { item: { label: "/ API Keys", panel: "api", title: "API Keys", sub: "Create, budget and monitor scoped keys." } },
  { item: { label: "/ Usage", panel: "usage", title: "Usage", sub: "Rollups, provider records and cost windows." } },
  { item: { label: "/ Recharge", panel: "recharge", title: "Recharge", sub: "View your available USD credit and add more with a one-time payment." } },
  { group: "Operations" },
  { item: { label: "/ Users", panel: "users", title: "Users", sub: "Accounts, roles, balances and sessions." } },
  { item: { label: "/ Machines", panel: "machines", title: "Machines", sub: "Nodes, providers, pools and capacity." } },
  { item: { label: "/ Models", panel: "ph", title: "Models", sub: "[Placeholder] Model registry." } },
  { item: { label: "/ Feedback", panel: "ph", title: "Feedback", sub: "[Placeholder] Feedback inbox." } },
  { item: { label: "/ Audit", panel: "ph", title: "Audit", sub: "[Placeholder] Audit trail." } },
  { item: { label: "/ Sessions", panel: "ph", title: "Sessions", sub: "[Placeholder] Active sessions." } },
  { group: "Framework" },
  { item: { label: "/ Components", panel: "components", title: "Components", sub: "Base components of the LOGOS framework — dialogs, notifications, drawers." } },
  { item: { label: "/ Back to mainpage", panel: "", title: "", sub: "" }, bottom: true, back: true },
  { item: { label: "/ Settings", panel: "settings", title: "Settings", sub: "Signup, resource and registration policies." } },
]

/* ===================== agent chat surface ===================== */

export interface ChatItem {
  id: string
  title: string
  status?: "running" | "completed" | "stuck"
  pinned: boolean
}

/** The eight chats present in the static markup, verbatim (order + status). */
const RECENT_MARKUP: Array<[string, ChatItem["status"]]> = [
  ["Bittensor TAO explained", "running"],
  ["Math homework", "completed"],
  ["Agent responsiveness check", "completed"],
  ["Agent identity introduction", "stuck"],
  ["Refactor auth middleware", "completed"],
  ["Debug CI on arm64", "stuck"],
  ["Migrate Postgres → SQLite", "completed"],
  ["Build CLI for log parsing", "completed"],
]

/** Seeded extra recent chats so the list scrolls — verbatim from the prototype script. */
const RECENT_SEED: string[] = [
  "Kubernetes autoscaling notes",
  "Weekend trip itinerary",
  "Rewrite the landing page copy",
  "SQL query optimization",
  "Book summary: Meditations",
  "Fix the flaky e2e tests",
  "Marketing email draft",
  "Docker image size audit",
  "Explain diffusion models",
  "Budget spreadsheet formulas",
  "Refactor the payment webhook",
  "Onboarding checklist ideas",
  "Compare vector databases",
  "Draft the release notes",
]

export function initialRecentChats(): ChatItem[] {
  return [
    ...RECENT_MARKUP.map(([title, status], i) => ({ id: `chat-${i}`, title, status, pinned: false })),
    ...RECENT_SEED.map((title, i) => ({ id: `seed-${i}`, title, pinned: false })),
  ]
}

export interface Project {
  id: string
  /** csNav argument-style name used by selectChat */
  chatKey: string
  title: string
  subs: Array<{ key: string; title: string }>
}

export const PROJECTS: Project[] = [
  {
    id: "proj-scout",
    chatKey: "scout",
    title: "Scout",
    subs: [
      { key: "Scout · data crawl", title: "Data crawl" },
      { key: "Scout · ranking model", title: "Ranking model" },
    ],
  },
  {
    id: "proj-jerry",
    chatKey: "jerry",
    title: "Jerry",
    subs: [
      { key: "Jerry · onboarding flow", title: "Onboarding flow" },
      { key: "Jerry · billing edge cases", title: "Billing edge cases" },
    ],
  },
  {
    id: "proj-jiyu",
    chatKey: "jiyu",
    title: "Jiyu",
    subs: [{ key: "Jiyu · i18n audit", title: "I18n audit" }],
  },
]

export interface Model {
  name: string
  sum: string
  desc: string
}

export const MODELS: Model[] = [
  {
    name: "qwen3.7-max-2026-06-08",
    sum: "Flagship multimodal reasoning",
    desc: "Qwen 3.7 Max 2026-06-08 with image input support for complex reasoning, coding, and multi-step agent tasks.",
  },
  {
    name: "affine-champion",
    sum: "Fast, reliable everyday model",
    desc: "Affine's in-house flagship, tuned for fast, reliable everyday reasoning and writing.",
  },
  {
    name: "glm-5.2",
    sum: "General chat & generation",
    desc: "GLM family model for general chat, structured generation, and multi-turn interaction.",
  },
  {
    name: "qwen3.6-35b-a3b",
    sum: "Chinese & mid-complexity tasks",
    desc: "Qwen 3.6 35B A3B for Chinese tasks, general Q&A, and medium-complexity reasoning.",
  },
]

/** matchMedia gate the prototype evaluates once at load for its mobile-only DOM tweaks */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(max-width: 700px)").matches
}
