import { useEffect, useRef, useState } from "react"
import { useTheme } from "../../vendor/webui/theme"
import "./login.css"

import githubWhite from "./assets/login-ico-github.webp"
import githubDark from "./assets/login-ico-github-dark.webp"
import googleIco from "./assets/login-ico-google.webp"
import discordIco from "./assets/login-ico-discord.webp"
import bittensorDark from "./assets/brand-bittensor.webp"
import bittensorLight from "./assets/brand-bittensor-light.webp"
import affineDark from "./assets/brand-affine.webp"
import affineLight from "./assets/brand-affine-light.webp"
// Prototype builds these data-URIs at runtime from the inline #enso <symbol>
// (ensoURI(ink)); here the same path is pre-rendered into two SVG assets.
import ensoWhite from "./assets/enso-white.svg"
import ensoInk from "./assets/enso-ink.svg"

/** Moon (dark mode) / sun (light mode) icon paths — verbatim from the
 *  prototype's MOON_ICON / SUN_ICON innerHTML swaps. */
function ModeIcon({ light }: { light: boolean }) {
  return (
    <svg
      id="login-mode-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {light ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </>
      ) : (
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      )}
    </svg>
  )
}

export default function LoginDesign() {
  const { resolvedMode } = useTheme()
  // Prototype: applyMode() toggles body.light (persisted in localStorage).
  // Here: class toggle on the design root, seeded from the app theme.
  const [light, setLight] = useState(resolvedMode === "light")
  const [entering, setEntering] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [appEmerge, setAppEmerge] = useState(false)

  const rightRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const after = (ms: number, fn: () => void) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  const resetGate = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    const right = rightRef.current
    if (right) {
      right.style.transition = "none"
      right.style.transform = ""
    }
    setEntering(false)
    setHidden(false)
    setAppEmerge(false)
  }

  /** Verbatim port of the prototype's enterApp(): the LOGOS column slides to
   *  the exact viewport centre while everything else fades, then the gate goes
   *  hidden and the app "emerges" underneath. The prototype then leaves the
   *  agent app on screen; this standalone design resets itself instead so the
   *  gate stays explorable (see NOTES.md). */
  const enterApp = () => {
    if (entering) return
    const right = rightRef.current
    const mark = markRef.current
    if (right && mark) {
      const r = mark.getBoundingClientRect()
      const gx = r.left + r.width / 2 // group center x (logos + head are column-centered)
      const Vx = window.innerWidth / 2
      let curTx = 0
      const cur = getComputedStyle(right).transform
      if (cur && cur !== "none") {
        try {
          curTx = new DOMMatrixReadOnly(cur).m41
        } catch {
          /* prototype swallows this too */
        }
      }
      const tx = curTx + (Vx - gx) // pure horizontal slide to center X
      right.style.transition = "transform 1s cubic-bezier(0.65, 0, 0.2, 1)"
      right.style.transform = "translateX(" + tx + "px)"
    }
    setEntering(true)
    setAppEmerge(true) // prototype: document.body.classList.add('app-emerge')
    after(1150, () => setHidden(true))
    after(2100, () => setAppEmerge(false))
    // SANDBOX-only: bring the gate back once the hand-off would have finished.
    after(3000, resetGate)
  }

  const toggleMode = () => setLight((l) => !l)

  // Prototype: loginBack() returns to the marketing page (out of scope here);
  // in the sandbox it doubles as a reset of any in-flight enter animation.
  const loginBack = () => resetGate()

  const rootClass = `lg-root${light ? " light" : ""}${appEmerge ? " app-emerge" : ""}`
  const viewClass = `login-view${entering ? " entering" : ""}${hidden ? " hidden" : ""}`

  return (
    <div className={rootClass}>
      <div className={viewClass} id="login-view">
        <div className="login-back" onClick={loginBack} title="Back">
          <svg
            viewBox="0 0 22 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="20" y1="6" x2="3" y2="6" />
            <path d="M8.5 1.5 L2.5 6 L8.5 10.5" />
          </svg>
          <span>Back</span>
        </div>
        <button className="login-mode-toggle" onClick={toggleMode} title="Toggle light / dark">
          <ModeIcon light={light} />
        </button>
        <div className="login-split">
          <div className="login-left">
            <div className="login-heading">
              Meet your
              <br />
              agentic reflection
            </div>
            <div className="login-box">
              <button className="login-social" onClick={enterApp}>
                <img
                  className="login-social-ico"
                  id="login-github-ico"
                  src={light ? githubDark : githubWhite}
                  loading="lazy"
                  decoding="async"
                  alt=""
                />
                Continue with GitHub
              </button>
              <button className="login-social" onClick={enterApp}>
                <img
                  className="login-social-ico"
                  src={googleIco}
                  loading="lazy"
                  decoding="async"
                  alt=""
                />
                Continue with Google
              </button>
              <button className="login-social" onClick={enterApp}>
                <img
                  className="login-social-ico"
                  src={discordIco}
                  loading="lazy"
                  decoding="async"
                  alt=""
                />
                Continue with Discord
              </button>
              <div className="login-or">or</div>
              <input
                className="login-input"
                type="email"
                placeholder="Enter your E-Mail address"
                spellCheck={false}
              />
              <button className="login-continue" onClick={enterApp}>
                Continue
              </button>
            </div>
          </div>
          <div className="login-divider" />
          <div className="login-right" ref={rightRef}>
            <div className="login-hero-name">
              LOGO<span className="s-fix">S</span>
            </div>
            <div className="login-mark-wrap" ref={markRef}>
              <img
                className="login-hero-mark"
                id="login-logo"
                src={light ? ensoInk : ensoWhite}
                alt="Logos"
              />
            </div>
            <div className="login-product">
              <span className="pp">AN AFFINE</span> SUBNET 120 PRODUCT
            </div>
            <div className="login-brands">
              <span className="pb-label">incentivized and aligned by</span>
              <span className="pb-marks">
                <img
                  className="brand-btt"
                  id="login-bittensor"
                  src={light ? bittensorLight : bittensorDark}
                  alt="bittensor"
                />
                <span className="brand-x">×</span>
                <img
                  className="brand-affine"
                  id="login-affine"
                  src={light ? affineLight : affineDark}
                  alt="affine"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
