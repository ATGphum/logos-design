import { useEffect, useRef, useState } from "react"
import { useViewAs } from "../../../sandbox/viewAs"
import {
  BillingPage,
  CompetitionsPage,
  DashboardPage,
  InstancesPage,
  KeysPage,
  MachinesPage,
  SettingsPage,
  SoonPage,
  UsagePage,
  UsersPage,
  type PageId,
} from "./ConsolePages"
import "./v2-console.css"

/**
 * V2's console.
 *
 * Written rather than restyled. The old console's layout is a fixed 268px column, a 100px
 * banner, and pages made of tiles three across — and no amount of CSS on top of that
 * produces a different structure, which is why it kept reading as the old console wearing
 * new paint.
 *
 * The frame follows the agent page: same ground, same raised/recessed material, same type
 * scale, and the same rule that a lit top edge means raised and a shadowed one means
 * recessed.
 *
 * Three decisions carry the navigability:
 *
 *  - Every page states what it is for, in one line, in plain language. The old pages
 *    opened straight into numbers, which is fine once you know the product and useless
 *    before that.
 *
 *  - Admin pages are their own group rather than the tail of Operations. Eleven items
 *    under one heading is a list you read; five under three headings is a map.
 *
 *  - A chevron means the row goes somewhere, and nothing else has one. In the old console
 *    every tile carried one whether it navigated or not.
 */

interface Item {
  id: PageId
  label: string
  admin?: boolean
}
interface Group {
  group: string
  items: Item[]
}

const NAV: Group[] = [
  {
    group: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "instances", label: "Instances", admin: true },
      { id: "billing", label: "Billing" },
    ],
  },
  {
    group: "Operations",
    items: [
      { id: "usage", label: "Usage" },
      { id: "competitions", label: "Competitions" },
    ],
  },
  {
    group: "Administration",
    items: [
      { id: "keys", label: "API keys", admin: true },
      { id: "users", label: "Users", admin: true },
      { id: "machines", label: "Machines", admin: true },
      { id: "models", label: "Models", admin: true },
      { id: "feedback", label: "Feedback", admin: true },
      { id: "audit", label: "Audit", admin: true },
      { id: "sessions", label: "Sessions", admin: true },
    ],
  },
]

const Glyph = ({ d, stroke = 1.6 }: { d: string; stroke?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

interface V2ConsoleProps {
  open: boolean
  onClose: () => void
  night: boolean
  onToggleNight: () => void
  /** the agent page's own theme, so the two surfaces cannot disagree */
  initial?: PageId
}

export function V2Console({ open, onClose, night, onToggleNight, initial = "dashboard" }: V2ConsoleProps) {
  const { viewAs } = useViewAs()
  const admin = viewAs === "admin"

  const [page, setPage] = useState<PageId>(initial)
  const [query, setQuery] = useState("")
  const bodyRef = useRef<HTMLDivElement>(null)

  /* a new page starts at its own top, rather than inheriting the last one's scroll */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [page])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const visible = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (admin || !i.admin) && (!query || i.label.toLowerCase().includes(query.toLowerCase()))),
  })).filter((g) => g.items.length)

  const go = (p: PageId) => setPage(p)

  const body = () => {
    switch (page) {
      case "dashboard":
        return <DashboardPage go={go} />
      case "billing":
        return <BillingPage />
      case "instances":
        return <InstancesPage />
      case "usage":
        return <UsagePage />
      case "competitions":
        return <CompetitionsPage />
      case "keys":
        return <KeysPage />
      case "users":
        return <UsersPage />
      case "machines":
        return <MachinesPage />
      case "settings":
        return <SettingsPage />
      case "models":
        return <SoonPage title="Models" lede="Which models your agents may call, and what each one costs." what="The model registry is not wired up yet. It will list every model available to your org, with its pricing and limits." />
      case "feedback":
        return <SoonPage title="Feedback" lede="What people have reported about your agents' answers." what="No feedback has come in yet. Ratings and written reports from your agents' users will collect here." />
      case "audit":
        return <SoonPage title="Audit" lede="A record of every change made to this platform, and by whom." what="The audit trail is not wired up yet. It will show each change, who made it and when." />
      case "sessions":
        return <SoonPage title="Sessions" lede="Who is signed in right now, and from where." what="No active sessions to show. Signed-in users and their devices will appear here." />
    }
  }

  return (
    <div className={"k-console" + (open ? "" : " out") + (night ? " night" : " day")} role="dialog" aria-modal="true" aria-label="Console">
      <aside className="k-side">
        {/* No mark here. The enso already sits top-left of the page this window opened
            over, and repeating it inside says the console is a separate product. */}
        <div className="k-brand">
          <span>Console</span>
        </div>

        <div className="k-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search console pages" />
        </div>

        <nav className="k-nav">
          {visible.map((g) => (
            <div className="k-group" key={g.group}>
              <div className="k-group-l">{g.group}</div>
              {g.items.map((i) => (
                <button key={i.id} className={"k-navitem" + (page === i.id ? " on" : "")} onClick={() => go(i.id)} type="button">
                  {i.label}
                </button>
              ))}
            </div>
          ))}
          {!visible.length ? <div className="k-nav-none">No page matches “{query}”.</div> : null}
        </nav>

        <div className="k-side-foot">
          <button className={"k-navitem" + (page === "settings" ? " on" : "")} onClick={() => go("settings")} type="button">
            <Glyph d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4M19.2 12a7.2 7.2 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.2 7.2 0 0 0-2-1.2l-.3-2.5H10.4l-.3 2.5a7.2 7.2 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.2 7.2 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.2 7.2 0 0 0 2 1.2l.3 2.5h3.2l.3-2.5a7.2 7.2 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" stroke={1.3} />
            Settings
          </button>
          <div className="k-vers">
            <span>Version 0.0.0</span>
            <span>Deployed 2026/07/13</span>
          </div>
        </div>
      </aside>

      <main className="k-main">
        <div className="k-topbar">
          <div className="k-crumb">
            <button className="k-crumb-root" type="button" onClick={onClose}>
              LOGOS
            </button>
            <span className="k-crumb-sep">/</span>
            <span className="k-crumb-here">
              {NAV.flatMap((g) => g.items).find((i) => i.id === page)?.label ?? (page === "settings" ? "Settings" : "")}
            </span>
          </div>

          <div className="k-topbar-right">
            <button className="k-iconbtn" onClick={onToggleNight} type="button" aria-label={night ? "Light theme" : "Dark theme"}>
              {night ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </svg>
              ) : (
                <Glyph d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke={1.7} />
              )}
            </button>
            <button className="k-who" type="button">
              <span className="k-who-ava">S</span>
              <span className="k-who-text">
                <b>scout tesy</b>
                <em>{admin ? "Administrator" : "org_000004"}</em>
              </span>
              <svg className="k-who-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {/* the way out, stated as a control rather than left to the scrim */}
            <button className="k-close" onClick={onClose} type="button" aria-label="Close console">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="k-scroll" ref={bodyRef}>
          {body()}
        </div>
      </main>
    </div>
  )
}
