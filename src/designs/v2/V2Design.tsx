/**
 * V2 shell — experimental re-composition of the same surfaces, in a different order.
 *
 * V1 (#/console) opens on the control plane and treats the agent as somewhere you go
 * ("Access LOGOS"). V2 inverts that:
 *
 *  - the agent page is the product, and is what loads
 *  - login pops out once on opening, is dismissable, and is reachable afterwards from
 *    Login / Sign up in the top right — not a screen of its own
 *  - Mainpage and Console are buttons *on* the agent page, not places you start from
 *
 * Deliberately built by composing the existing AgentView/ConsoleView rather than
 * forking them, so V1 keeps working untouched and any fix to the shared surfaces
 * lands in both. Everything V2-specific is the entry logic here plus v2.css.
 */
import { useRef, useState } from "react"
import { useTheme } from "../../vendor/webui/theme"
import "../console/chat.css"
import "../console/console.css"
import "./v2.css"
import { AgentView } from "../console/agent/AgentView"
import { ConsoleView } from "../console/shell/ConsoleView"
import { isMobileViewport } from "../console/state"
import ensoWhite from "../console/assets/enso.svg"
import ensoInk from "../console/assets/enso-ink.svg"
import { LoginGate, type AuthMode } from "./LoginGate"
import { AccountChip } from "./AccountChip"

export default function V2Design() {
  const { resolvedMode } = useTheme()
  const startLight = resolvedMode === "light"

  const [light, setLight] = useState(startLight)
  const [night, setNight] = useState(!startLight)

  /* the pop-out shows once on opening and is dismissable with its X; the Login / Sign up
     buttons in the top right bring it back. The agent page itself stays untouched. */
  const [signedIn, setSignedIn] = useState(false)
  const [gateOpen, setGateOpen] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>("login")

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setGateOpen(true)
  }

  /* V2's inversion, in three lines: the console starts closed and the agent is what
     you land on. V1 starts these true/false the other way round. */
  const [csDisplayed, setCsDisplayed] = useState(false)
  const [csHidden, setCsHidden] = useState(true)
  const [chatReveal, setChatReveal] = useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [watermarkOn, setWatermarkOn] = useState(true)

  const [isMobile] = useState(isMobileViewport)
  const timers = useRef<number[]>([])

  /* console → agent: same fade V1 uses, just not the entry path any more */
  const enterAgent = () => {
    setChatReveal(true)
    setCsHidden(true)
    timers.current.push(window.setTimeout(() => setCsDisplayed(false), 650))
    timers.current.push(window.setTimeout(() => setChatReveal(false), 2600))
  }

  /* agent → console, from the rail button or the sidebar's Console row */
  const openConsole = () => {
    if (isMobileViewport()) setSidebarCollapsed(true)
    setCsDisplayed(true)
    requestAnimationFrame(() => setCsHidden(false))
  }

  /* Mainpage is a button on the agent page now. The marketing site is not part of the
     sandbox, so it lands on the gallery — same stand-in V1 uses. */
  const backHome = () => {
    window.location.hash = "#/"
  }

  const rootClass =
    "console-root v2-root" +
    (light ? " light" : "") +
    (sidebarCollapsed ? " sidebar-collapsed" : "") +
    (terminalOpen ? " terminal-open" : "") +
    (chatReveal ? " chat-reveal" : "") +
    (!watermarkOn ? " hide-watermark" : "") +
    (signedIn ? "" : " v2-signedout")

  return (
    <div className={rootClass}>
      <AgentView
        light={light}
        onToggleLight={() => setLight((v) => !v)}
        onSetLight={setLight}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onCollapseSidebar={() => setSidebarCollapsed(true)}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen((v) => !v)}
        watermarkOn={watermarkOn}
        onToggleWatermark={() => setWatermarkOn((v) => !v)}
        isMobile={isMobile}
        onOpenConsole={openConsole}
        onBackHome={backHome}
        projectsAsPicker
        shortModelName
        contextualTools
        freshOnOpen
        logoFolds
        accountSlot={
          <AccountChip
            onOpenBilling={openConsole}
            onOpenSettings={openConsole}
            light={light}
            onToggleLight={() => setLight((v) => !v)}
          />
        }
        heroGreetingNode={
          <>
            <span className="v2-hero-mark">
              <img src={light ? ensoInk : ensoWhite} alt="" aria-hidden="true" />
              {/* wordmark and its gloss share a column, so the gloss hangs off the L
                  rather than centring under the lockup as a whole */}
              <span className="v2-hero-word">
                <span className="v2-hero-name">LOGOS</span>
                {/* set like a dictionary entry, but as ornament rather than reference —
                    the pronunciation, then the sense the product is named for */}
                <span className="v2-hero-def">
                  <i>/ˈlɒɡɒs/</i>
                  <svg className="v2-hero-arrow" viewBox="0 0 28 8" fill="none" aria-hidden="true">
                    <path d="M0 4h23" stroke="currentColor" strokeWidth="1" />
                    <path d="M19.6 1.4 23.2 4l-3.6 2.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <em>reason</em>
                </span>
              </span>
            </span>
          </>
        }
      />

      {/* mounted only once opened, so V2 costs nothing extra on the agent page */}
      {csDisplayed ? (
        <div
          className={"v2-cs-scrim" + (csHidden ? " out" : "")}
          onClick={enterAgent}
          aria-hidden="true"
        />
      ) : null}
      {csDisplayed ? (
        <ConsoleView
          displayed={csDisplayed}
          hidden={csHidden}
          night={night}
          onToggleNight={() => setNight((v) => !v)}
          onEnterAgent={enterAgent}
          onBackHome={backHome}
        />
      ) : null}

      {signedIn ? null : (
        <div className="v2-auth">
          <button className="v2-auth-btn" type="button" onClick={() => openAuth("login")}>
            Login
          </button>
          <button className="v2-auth-btn v2-auth-primary" type="button" onClick={() => openAuth("signup")}>
            Sign up
          </button>
        </div>
      )}

      {!signedIn && gateOpen ? (
        <LoginGate
          mode={authMode}
          light={light}
          onSwitchMode={setAuthMode}
          onSignIn={() => setSignedIn(true)}
          onClose={() => setGateOpen(false)}
        />
      ) : null}
    </div>
  )
}
