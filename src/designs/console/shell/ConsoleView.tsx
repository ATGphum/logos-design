/**
 * The control-plane console (#cs-view) — topbar, sidebar, head and panels.
 * Ported 1:1 from marketing/llm-interface.html lines 3745-3825 (markup) and
 * 3826-4134 (script). Class names and demo copy preserved verbatim.
 */
import { Fragment, useEffect, useMemo, useState } from "react"
import { CI_LIST, CI_SIDE_MAX, CS_NAV, type NavItem } from "../state"
import { useCsBase } from "./BaseComponents"
import { ComponentsPanel, csRefreshDemo } from "./panels/ComponentsPanel"
import { InstancesPanel } from "./panels/InstancesPanel"
import { OverviewPanel } from "./panels/OverviewPanel"
import { SettingsPanel } from "./panels/SettingsPanel"
import { ApiPanel, MachinesPanel, PlaceholderPanel, UsagePanel, UsersPanel } from "./panels/SmallPanels"
import githubIco from "../assets/rl-ico-github.webp"
import discordIco from "../assets/rl-ico-discord.webp"

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

export function ConsoleView({ displayed, hidden, night, onToggleNight, onEnterAgent, onBackHome }: ConsoleViewProps) {
  const { api, elements } = useCsBase()

  const [nav, setNav] = useState<NavState>({ idx: 0, panel: FIRST.panel, title: FIRST.title, sub: FIRST.sub })
  const [collapsed, setCollapsed] = useState(false)
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

  const csNav = (idx: number, item: NavItem) => {
    setNav({ idx, panel: item.panel, title: item.title, sub: item.sub })
    const main = document.querySelector("#cs-view .cs-main")
    if (main) main.scrollTop = 0
  }

  const instancesIdx = useMemo(() => NAV_ITEMS.findIndex((e) => e.item.panel === "instances"), [])

  const ciOpenInstances = () => csNav(instancesIdx, NAV_ITEMS[instancesIdx].item)

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
              return (
                <div key={i} className="cs-group">
                  {entry.group}
                </div>
              )
            }
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
                {entry.item.label}
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

  let itemIdx = -1

  return (
    <div
      id="cs-view"
      className={(night ? "cs-night" : "") + (hidden ? " cs-hidden" : "") + (collapsed ? " cs-collapsed" : "")}
      style={{ display: displayed ? "block" : "none" }}
    >
      <div className="cs-topbar">
        <div className="cs-tmold">
          <div className="cs-tsearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search console pages..." spellCheck={false} />
          </div>
        </div>
        <div className="cs-accslot">
          <div className={"cs-acc-wrap" + (accOpen ? " on" : "")} id="cs-acc-wrap">
            <button className="cs-acc-btn" onClick={ciAccess} title="Open the agent">
              <span className="lb">Access agent</span>
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
                {has ? ciActive : "no instance — create one"}
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
        <button className="cs-mode" onClick={() => csRefreshDemo(api)} title="Refresh data" style={{ marginRight: 6 }}>
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
      <div className="cs-topline"></div>
      <button className="cs-expand" onClick={() => setCollapsed((v) => !v)} title="Expand sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
        </svg>
      </button>
      <div className="cs-wrap">
        <aside className="cs-side">
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
            Access agent
          </div>
          {CS_NAV.map((entry, i) => {
            if ("group" in entry) {
              return (
                <div key={i} className="cs-group">
                  {entry.group}
                </div>
              )
            }
            itemIdx += 1
            const idx = itemIdx
            if (entry.back) {
              return (
                <div key={i} className="cs-item cs-bottom" onClick={onBackHome}>
                  {entry.item.label}
                </div>
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
                    <span>{entry.item.label}</span>
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
              <div key={i} className={"cs-item" + (nav.idx === idx ? " cs-on" : "")} onClick={() => csNav(idx, entry.item)}>
                {entry.item.label}
              </div>
            )
          })}
          <div className="cs-vers">
            Version 0.0.0
            <br />
            Deployed 2026/07/13
          </div>
          <div className="cs-side-foot">
            <a href="#" title="GitHub" onClick={(e) => e.preventDefault()}>
              <img alt="GitHub" src={githubIco} />
            </a>
            <a href="#" title="Discord" onClick={(e) => e.preventDefault()}>
              <img alt="Discord" src={discordIco} />
            </a>
          </div>
        </aside>
        <main className="cs-main">
          <div className="cs-head">
            <div className="cs-headl"></div>
            <div className="cs-headmid">
              <div>
                <h1 className="cs-title" id="cs-title">
                  {nav.title}
                </h1>
                <p className="cs-sub" id="cs-sub">
                  {nav.sub}
                </p>
              </div>
            </div>
            <div className="cs-headr"></div>
          </div>
          <div className="cs-panel" id="cs-panel-overview" style={{ display: nav.panel === "overview" ? "block" : "none" }}>
            <OverviewPanel />
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
