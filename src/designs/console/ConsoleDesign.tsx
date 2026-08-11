/**
 * Control-plane console design — ported from marketing/llm-interface.html.
 *
 * Two surfaces, exactly like the prototype:
 *  - #cs-view: the console (topbar, sidebar, panels, base components)
 *  - the agent chat surface underneath, revealed by "Access agent"
 *    (csEnter() → body.chat-reveal fade), with the console re-openable
 *    from the agent's rail/sidebar Console button (openConsole()).
 *
 * The prototype styles <body>; those rules are rewritten onto .console-root
 * (see chat.css / console.css headers). Light/dark: the chat surface toggles
 * .light on the root (body.light in the prototype), the console independently
 * toggles .cs-night on #cs-view — both initialized from the sandbox theme.
 */
import { useRef, useState } from "react"
import { useTheme } from "../../vendor/webui/theme"
import "./chat.css"
import "./console.css"
import { AgentView } from "./agent/AgentView"
import { ConsoleView } from "./shell/ConsoleView"
import { isMobileViewport } from "./state"

export default function ConsoleDesign() {
  const { resolvedMode } = useTheme()
  const startLight = resolvedMode === "light"

  /* chat-surface light mode (body.light) and console night mode (cs-night) are
     independent toggles in the prototype; both start from the sandbox theme. */
  const [light, setLight] = useState(startLight)
  const [night, setNight] = useState(!startLight)

  /* console overlay visibility — mirrors csEnter()/openConsole() timing */
  const [csDisplayed, setCsDisplayed] = useState(true)
  const [csHidden, setCsHidden] = useState(false)
  const [chatReveal, setChatReveal] = useState(false)

  /* body-level classes from the prototype (body ships as sidebar-collapsed) */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [watermarkOn, setWatermarkOn] = useState(true)

  /* frozen at mount for the agent surface's load-time mobile DOM tweaks;
     csEnter()/openConsole() check the live viewport per call like the prototype */
  const [isMobile] = useState(isMobileViewport)
  const timers = useRef<number[]>([])

  /* csEnter(): fade the console out, reveal the agent chat surface */
  const enterAgent = () => {
    setChatReveal(true)
    setCsHidden(true)
    timers.current.push(window.setTimeout(() => setCsDisplayed(false), 650))
    timers.current.push(window.setTimeout(() => setChatReveal(false), 2600))
    /* mobile: open ready-to-type, like a messaging app */
    if (isMobileViewport()) {
      timers.current.push(
        window.setTimeout(() => {
          const ta = document.querySelector<HTMLTextAreaElement>(".input-bar textarea")
          if (ta) ta.focus()
        }, 750),
      )
    }
  }

  /* openConsole(): bring the console back over the agent surface */
  const openConsole = () => {
    /* mobile: fold the agent's chats column away so it never lingers over the console */
    if (isMobileViewport()) setSidebarCollapsed(true)
    setCsDisplayed(true)
    requestAnimationFrame(() => setCsHidden(false))
  }

  /* csBackHome(): the prototype returns to the marketing mainpage, which is not
     part of this design — the sandbox equivalent is the design gallery. */
  const backHome = () => {
    window.location.hash = "#/"
  }

  const rootClass =
    "console-root" +
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
      <ConsoleView
        displayed={csDisplayed}
        hidden={csHidden}
        night={night}
        onToggleNight={() => setNight((v) => !v)}
        onEnterAgent={enterAgent}
        onBackHome={backHome}
      />
    </div>
  )
}
