/**
 * V2 shell — experimental re-composition of the same surfaces, in a different order.
 *
 * V1 (#/console) opens on the control plane and treats the agent as somewhere you go
 * ("Access LOGOS"). V2 inverts that:
 *
 *  - the agent page is the product, and is what loads
 *  - login is a small window docked to the right of that page while signed out —
 *    not a screen of its own, and not built into the page
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
import { LoginGate } from "./LoginGate"

export default function V2Design() {
  const { resolvedMode } = useTheme()
  const startLight = resolvedMode === "light"

  const [light, setLight] = useState(startLight)
  const [night, setNight] = useState(!startLight)

  /* the login window sits on the agent page; the page itself stays untouched */
  const [signedIn, setSignedIn] = useState(false)

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
    (!watermarkOn ? " hide-watermark" : "")

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
      />

      {/* mounted only once opened, so V2 costs nothing extra on the agent page */}
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
        <LoginGate onSignIn={() => setSignedIn(true)} onSkip={() => setSignedIn(true)} />
      )}
    </div>
  )
}
