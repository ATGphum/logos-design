/**
 * The control-plane console (#cs-view) — topbar, sidebar, head and panels.
 * Ported 1:1 from marketing/llm-interface.html lines 3745-3825 (markup) and
 * 3826-4134 (script). Class names and demo copy preserved verbatim.
 */
import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { CI_LIST, CI_SIDE_MAX, CS_NAV, type NavItem } from "../state"
import ensoInk from "../assets/enso-ink.svg"
import { useViewAs } from "../../../sandbox/viewAs"
import { useCsBase } from "./BaseComponents"
import { SecH } from "./panels/bits"
import { ComponentsPanel, csRefreshDemo } from "./panels/ComponentsPanel"
import { InstancesPanel } from "./panels/InstancesPanel"
import { OverviewPanel } from "./panels/OverviewPanel"
import { SettingsPanel } from "./panels/SettingsPanel"
import { ApiPanel, MachinesPanel, PlaceholderPanel, UsagePanel, UsersPanel } from "./panels/SmallPanels"
/* The Recharge panel is the ADOPTED product page (src/designs/recharge),
   mounted where the product's own sidebar puts it (navigation.ts →
   items.recharge). Lazy: it carries the billing page + infra skin. */
const AdoptedRechargePage = lazy(() => import("../../recharge/AdoptedRechargePage"))

const MoonPath = () => <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
const SunPaths = () => (
  <>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </>
)

export interface ConsoleViewProps {
  /** display:none control — mirrors the prototype's v.style.display */
  displayed: boolean
  /** .cs-hidden fade class */
  hidden: boolean
  night: boolean
  onToggleNight: () => void
  /** csEnter() — reveal the agent surface */
  onEnterAgent: () => void
  /** csBackHome() — sandbox equivalent: back to the design gallery */
  onBackHome: () => void
}

interface NavState {
  idx: number
  panel: string
  title: string
  sub: string
}

const NAV_ITEMS = CS_NAV.filter((e): e is Extract<typeof e, { item: NavItem }> => "item" in e)
const FIRST = NAV_ITEMS[0].item

/** Bottom-rail glyphs — replace the "/" prefix for Mainpage and Settings. */
function NavIcon({ kind }: { kind: "back" | "gear" | "dashboard" | "billing" }) {
  return (
    <svg
      className="cs-navico"
      /* the chevron only spans a sliver of a 24x24 box — cropped so it still reads
         once the icon is scaled down to match the "/" prefix advance */
      viewBox={kind === "back" ? "8 5 8 14" : "0 0 24 24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={kind === "back" ? "2.6" : "1.9"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "back" ? (
        <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
      ) : kind === "dashboard" ? (
        <>
          <rect x="3.2" y="3.2" width="7.4" height="7.4" rx="1.4" />
          <rect x="13.4" y="3.2" width="7.4" height="7.4" rx="1.4" />
          <rect x="3.2" y="13.4" width="7.4" height="7.4" rx="1.4" />
          <rect x="13.4" y="13.4" width="7.4" height="7.4" rx="1.4" />
        </>
      ) : kind === "billing" ? (
        <>
          <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2.2" />
          <path d="M2.6 10.1h18.8" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47.97z" />
        </>
      )}
    </svg>
  )
}

export function ConsoleView({ displayed, hidden, night, onToggleNight, onEnterAgent, onBackHome }: ConsoleViewProps) {
  const { api, elements } = useCsBase()

  const [nav, setNav] = useState<NavState>({ idx: 0, panel: FIRST.panel, title: FIRST.title, sub: FIRST.sub })
  const [collapsed, setCollapsed] = useState(false)
  /* The column animates over 500ms. Until it settles it must stay clipped, or its
     204px-wide children spill across the main panel; only afterwards can overflow go
     visible again so the instance dropdown can escape. */
  const [settled, setSettled] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)
  const [subsShut, setSubsShut] = useState(false)
  const [accOpen, setAccOpen] = useState(false)
  const [ciActive, setCiActive] = useState<string | null>(CI_LIST.length ? CI_LIST[0].name : null)
  /** increments to retrigger the create-instance scroll+flash */
  const [flashCreate, setFlashCreate] = useState(0)

  /* any document click closes the access menu (prototype's document handler) */
  useEffect(() => {
    if (!accOpen) return
    const close = () => setAccOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [accOpen])

  /* Settle on the column's own transitionend rather than a timer — a fixed delay either
     fires early (overflow opens while it is still moving) or late (a visible pause), and
     both read as a stutter. The timeout is only a fallback for a dropped transition. */
  useEffect(() => {
    setSettled(false)
    const wrap = document.querySelector("#cs-view .cs-wrap")
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setSettled(true)
    }
    const onEnd = (e: Event) => {
      if ((e as TransitionEvent).propertyName === "grid-template-columns") finish()
    }
    wrap?.addEventListener("transitionend", onEnd)
    const fallback = window.setTimeout(finish, 520)
    return () => {
      wrap?.removeEventListener("transitionend", onEnd)
      window.clearTimeout(fallback)
    }
  }, [collapsed])

  const csNav = (idx: number, item: NavItem) => {
    setNav({ idx, panel: item.panel, title: item.title, sub: item.sub })
    const main = document.querySelector("#cs-view .cs-main")
    if (main) main.scrollTop = 0
  }

  const instancesIdx = useMemo(() => NAV_ITEMS.findIndex((e) => e.item.panel === "instances"), [])

  const ciOpenInstances = () => csNav(instancesIdx, NAV_ITEMS[instancesIdx].item)

  const usageIdx = useMemo(() => NAV_ITEMS.findIndex((e) => e.item.panel === "usage"), [])
  const billingIdx = useMemo(() => NAV_ITEMS.findIndex((e) => e.item.panel === "recharge"), [])
  const openBilling = () => csNav(billingIdx, NAV_ITEMS[billingIdx].item)
  const openUsage = () => csNav(usageIdx, NAV_ITEMS[usageIdx].item)

  /* Profile uses the console's own right drawer (scrim + slide) rather than a bespoke
     overlay, so it matches the drawers the Components page documents. */
  const openProfile = () =>
    api.drawer({
      title: "Profile",
      side: "right",
      body: (
        <div className="cs-prof">
          <div className="cs-prof-id">
            <span className="cs-prof-ava">S</span>
            <b>scout tesy</b>
            <div className="cs-prof-key">
              <code>usr_kbrztqp89s0n4q5veewmsmhhbg</code>
              <button className="cs-btn" onClick={csCopy}>
                Copy
              </button>
            </div>
            <span className="cs-prof-org">org_000004</span>
            <span className="cs-tag">Platform administrator</span>
          </div>
          <div className="cs-sec cs-prof-card">
            <SecH l="Current credit" />
            <div className="cs-prof-amt ov-money">
              <span className="cur">$</span>163.60
            </div>
            <p>USD credit available for usage</p>
            <SecH l="Session" />
            <p>1 browser session tracked</p>
          </div>
          <button className="cs-btn pri cs-prof-wide" onClick={() => { api.drawerClose(); openBilling() }}>
            Recharge
          </button>
          <button className="cs-btn cs-prof-wide" onClick={() => api.drawerClose()}>
            Log out
          </button>
        </div>
      ),
    })

  const ciGotoList = () => {
    setAccOpen(false)
    ciOpenInstances()
  }

  const ciGotoCreate = () => {
    setAccOpen(false)
    ciOpenInstances()
    setFlashCreate((n) => n + 1)
  }

  /* the main button: no instance -> create scene, otherwise straight into the agent */
  const ciAccess = () => {
    if (!CI_LIST.length) {
      ciGotoCreate()
      return
    }
    onEnterAgent()
  }

  const ciSelect = (name: string) => {
    setCiActive(name)
    setAccOpen(false)
  }

  const csMobileNav = () => {
    api.drawer({
      side: "left",
      narrow: true,
      title: "Menu",
      sub: "LOGOS console",
      body: (
        <div className="cs-dnav">
          {CS_NAV.map((entry, i) => {
            if ("group" in entry) {
              if (!adminView && entry.admin) return null
              return (
                <div key={i} className="cs-group">
                  {entry.group}
                </div>
              )
            }
            if (!adminView && entry.admin) return null
            const itemIdx = NAV_ITEMS.findIndex((e) => e.item === entry.item)
            return (
              <div
                key={i}
                className={"cs-item" + (nav.idx === itemIdx ? " cs-on" : "")}
                onClick={() => {
                  api.drawerClose()
                  if (entry.back) onBackHome()
                  else csNav(itemIdx, entry.item)
                }}
              >
                {entry.item.icon ? <NavIcon kind={entry.item.icon} /> : null}
                <span className="cs-item-lb">{entry.item.label}</span>
              </div>
            )
          })}
        </div>
      ),
    })
  }

  const csCopy = () => {
    if (navigator.clipboard) void navigator.clipboard.writeText("sk-logos-7f3a-****-b21c")
  }

  const has = CI_LIST.length > 0

  /* Sandbox "view as" — reviewers preview the customer-facing shape. Never a control
     the console itself owns; the real app derives this from the account's role. */
  const { viewAs } = useViewAs()
  const adminView = viewAs === "admin"

  const accessBand = (
    <>
      <div className="cs-sideacc">
        <div className={"cs-acc-wrap" + (accOpen ? " on" : "")} id="cs-acc-wrap">
          <button className="cs-acc-btn" onClick={ciAccess} title="Open LOGOS">
            <span className="lb">Access LOGOS</span>
            {/* rail form: the wordmark set vertically — an arrow here read as a fold control */}
            <span className="cs-acc-ico" aria-hidden="true">LOGOS</span>
          </button>
          <button
            className="cs-acc-pick"
            title="Switch instance"
            onClick={(e) => {
              e.stopPropagation()
              setAccOpen((v) => !v)
            }}
          >
            <span className="sb" id="cs-acc-sb">
              {has ? `on ${ciActive}` : "no instance — create one"}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className="cs-acc-menu" id="cs-acc-menu">
            <div className="hd">{has ? `Your instances — ${CI_LIST.length}` : "No instances yet"}</div>
            {CI_LIST.slice(0, 6).map((x) => (
              <div key={x.id} className={"it" + (x.name === ciActive ? " sel" : "")} onClick={() => ciSelect(x.name)}>
          <span className="av">{x.name.charAt(0).toUpperCase()}</span>
          <span className="nm">{x.name}</span>
          <span className="st">{x.status}</span>
              </div>
            ))}
            {CI_LIST.length > 6 ? (
              <div className="more" onClick={ciGotoList}>
          View all {CI_LIST.length} instances
              </div>
            ) : null}
            <div className="it new" onClick={ciGotoCreate}>
              <span className="av">+</span>
              <span className="nm">Create new instance</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  let itemIdx = -1
  let leadGroupDone = false

  return (
    <div
      id="cs-view"
      className={
        (night ? "cs-night" : "") +
        (hidden ? " cs-hidden" : "") +
        (collapsed ? " cs-collapsed" : "") +
        (settled ? " cs-settled" : "")
      }
      style={{ display: displayed ? "block" : "none" }}
    >
      <div className="cs-topbar">
        {/* the page title takes the topbar's left slot; search moved into the sidebar */}
        <h1 className="cs-ttitle" id="cs-title">{nav.title}</h1>
        <div className="cs-tacts">
        <button className="cs-mode" onClick={() => csRefreshDemo(api)} title="Refresh data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11a8 8 0 1 0-1.9 6.1" />
            <path d="M20 5v6h-6" />
          </svg>
        </button>
        <button className="cs-mode" onClick={onToggleNight} title="Light / dark">
          <svg id="cs-mode-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {night ? <SunPaths /> : <MoonPath />}
          </svg>
        </button>
        </div>
        <div className="cs-tuser" title="Account" onClick={openProfile}>
          <span className="cs-ava">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7.5" r="3.4" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <span className="cs-uid">
            <b>Const</b>
            <i>Profile</i>
          </span>
        </div>
      </div>
      <div className="cs-topline"></div>
      <div className="cs-wrap">
        <aside className={"cs-side" + (adminView ? "" : " as-user")}>
          {/* LOGOS lockup — .cs-brand already carried the enso/wordmark styling, it was
              simply never mounted in the console. The account moved to the topbar. */}
          {/* the lockup is also the collapse target — a 200px-wide hit area beats
              hunting for a 34px chevron */}
          <div className="cs-brand" onClick={() => setCollapsed((v) => !v)} title="Collapse sidebar">
            <img src={ensoInk} alt="" aria-hidden="true" />
            <span>LOGOS</span>
            {/* the fold control sits with the lockup; stopPropagation so it does not also
                fire the lockup's own toggle */}
            <button
              className="cs-expand"
              title="Collapse sidebar"
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed((v) => !v)
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
              </svg>
            </button>
          </div>
          {/* in the rail the input is hidden, so the magnifier had nothing to do — clicking it
              opens the column and puts the caret in the field once it has room */}
          <div
            className="cs-tmold"
            onClick={() => {
              if (!collapsed) return
              setCollapsed(false)
              window.setTimeout(() => searchRef.current?.focus(), 360)
            }}
          >
            <div className="cs-tsearch">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input ref={searchRef} type="text" placeholder="Search console pages" spellCheck={false} />
            </div>
          </div>
          {/* account stays here for the ≤900px bar, where the topbar is hidden */}
          <div className="cs-user2" title="Account">
            <span className="cs-ava">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7.5" r="3.4" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <span className="cs-uid">
              <b>Const</b>
              <i>Pro dashboard system</i>
            </span>
            <svg
              className="cs-fold"
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed((v) => !v)
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Collapse sidebar</title>
              <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
            </svg>
          </div>
          <button className="cs-mburger" onClick={csMobileNav} title="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <div className="cs-maccess" onClick={onEnterAgent}>
            Access LOGOS
          </div>
          {CS_NAV.map((entry, i) => {
            if ("group" in entry) {
              if (!adminView && entry.admin) return null
              /* the lead group carries the auto margin that centres the nav > band >
                 bottom-rail cluster; it cannot be selected in CSS because hidden mobile
                 elements sit between it and the lockup. */
              const lead = !leadGroupDone
              leadGroupDone = true
              return (
                <div key={i} className={"cs-group" + (lead ? " cs-group-lead" : "")}>
                  {entry.group}
                </div>
              )
            }
            itemIdx += 1
            const idx = itemIdx
            if (entry.hidden) return null
            if (!adminView && entry.admin) return null
            if (entry.back) {
              return (
                <Fragment key={i}>
                  {accessBand}
                  <div className="cs-item cs-bottom" onClick={onBackHome}>
                    {entry.item.icon ? <NavIcon kind={entry.item.icon} /> : null}
                    <span className="cs-item-lb">{entry.item.label}</span>
                  </div>
                </Fragment>
              )
            }
            if (entry.item.panel === "instances") {
              return (
                <Fragment key={i}>
                  <div
                    className={"cs-item has-subs" + (nav.idx === idx ? " cs-on" : "") + (subsShut ? " shut" : "")}
                    id="ci-navitem"
                    onClick={() => csNav(idx, entry.item)}
                  >
                    <span><span className="cs-item-lb">{entry.item.label}</span></span>
                    <span
                      className="ci-fold"
                      title="Fold instance list"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSubsShut((v) => !v)
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                  <div className={"ci-subs" + (subsShut ? " shut" : "")} id="ci-subs">
                    {CI_LIST.slice(0, CI_SIDE_MAX).map((x) => (
                      <div key={x.id} className={"ci-sub" + (x.name === ciActive ? " on" : "")} onClick={() => ciSelect(x.name)}>
                        <span className="sdot"></span>
                        {x.name}
                      </div>
                    ))}
                    {CI_LIST.length > CI_SIDE_MAX ? (
                      <div className="ci-sub morei" onClick={ciGotoList}>
                        Show all {CI_LIST.length}
                      </div>
                    ) : null}
                  </div>
                </Fragment>
              )
            }
            return (
              <div
                key={i}
                /* the final row closes the nav cluster; it carries the auto margin that
                   balances the space below it against the space above WORKSPACE */
                className={"cs-item" + (nav.idx === idx ? " cs-on" : "") + (i === CS_NAV.length - 1 ? " cs-item-tail" : "")}
                onClick={() => csNav(idx, entry.item)}
              >
                {entry.item.icon ? <NavIcon kind={entry.item.icon} /> : null}
                <span className="cs-item-lb">{entry.item.label}</span>
              </div>
            )
          })}
          <div className="cs-vers">
            <span>Version 0.0.0</span>
            <span>Deployed 2026/07/13</span>
          </div>
          <div className="cs-side-foot">
            {/* inline marks, not the brand app-icons: those ship as coloured rounded-square
                tiles, which read as boxes next to the sidebar's monochrome glyphs */}
            <a href="#" title="GitHub" aria-label="GitHub" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.55v-2.1c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.67.8.55A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
            </a>
            <a href="#" title="Discord" aria-label="Discord" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.32 4.9A19.8 19.8 0 0 0 15.43 3.4a.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.26a18.3 18.3 0 0 0-5.48 0 12.6 12.6 0 0 0-.62-1.26.08.08 0 0 0-.08-.04A19.7 19.7 0 0 0 3.67 4.9a.07.07 0 0 0-.03.03C.53 9.55-.32 14.06.1 18.51a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1 0-.13l.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .8.04 19.8 19.8 0 0 0 6.02-3.04.08.08 0 0 0 .03-.06c.5-5.15-.84-9.62-3.56-13.58a.06.06 0 0 0-.03-.03ZM8.02 15.8c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.33-.94 2.42-2.16 2.42Z" />
              </svg>
            </a>
          </div>
        </aside>
        <main className="cs-main">
          {/* Adopted pages (recharge) carry their own page header — hide the console head for them. */}
          <div className="cs-head" style={{ display: "none" }}>
            <div className="cs-headl"></div>
            <div className="cs-headmid">
              <div>
                <h1 className="cs-title" id="cs-title">
                  {nav.title}
                </h1>
                {nav.sub ? (
                  <p className="cs-sub" id="cs-sub">
                    {nav.sub}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="cs-headr"></div>
          </div>
          <div className="cs-panel" id="cs-panel-overview" style={{ display: nav.panel === "overview" ? "block" : "none" }}>
            <OverviewPanel onManageInstances={ciOpenInstances} onUsageBreakdown={openUsage} />
          </div>
          <div className="cs-panel" id="cs-panel-instances" style={{ display: nav.panel === "instances" ? "block" : "none" }}>
            <InstancesPanel flashCreate={flashCreate} />
          </div>
          <div className="cs-panel" id="cs-panel-api" style={{ display: nav.panel === "api" ? "block" : "none" }}>
            <ApiPanel onCopy={csCopy} />
          </div>
          <div className="cs-panel" id="cs-panel-usage" style={{ display: nav.panel === "usage" ? "block" : "none" }}>
            <UsagePanel />
          </div>
          <div className="cs-panel" id="cs-panel-recharge" style={{ display: nav.panel === "recharge" ? "block" : "none" }}>
            {nav.panel === "recharge" ? (
              <Suspense fallback={<div role="status">Loading recharge…</div>}>
                <AdoptedRechargePage night={night} />
              </Suspense>
            ) : null}
          </div>
          <div className="cs-panel" id="cs-panel-users" style={{ display: nav.panel === "users" ? "block" : "none" }}>
            <UsersPanel />
          </div>
          <div className="cs-panel" id="cs-panel-machines" style={{ display: nav.panel === "machines" ? "block" : "none" }}>
            <MachinesPanel />
          </div>
          <div className="cs-panel" id="cs-panel-settings" style={{ display: nav.panel === "settings" ? "block" : "none" }}>
            <SettingsPanel />
          </div>
          <div className="cs-panel" id="cs-panel-ph" style={{ display: nav.panel === "ph" ? "block" : "none" }}>
            <PlaceholderPanel />
          </div>
          <div className="cs-panel" id="cs-panel-components" style={{ display: nav.panel === "components" ? "block" : "none" }}>
            <ComponentsPanel api={api} onMobileNav={csMobileNav} />
          </div>
          <div className="cs-main-foot">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Terms
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Privacy
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              About
            </a>
          </div>
        </main>
      </div>
      {elements}
    </div>
  )
}
