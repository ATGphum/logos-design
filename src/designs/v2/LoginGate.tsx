import { useState } from "react"
import ensoInk from "../console/assets/enso-ink.svg"

export type AuthMode = "login" | "signup"

interface LoginGateProps {
  mode: AuthMode
  onSwitchMode: (mode: AuthMode) => void
  onSignIn: () => void
  /** the large X — dismiss and carry on looking around */
  onClose: () => void
}

/**
 * V2's auth pop-out. It appears once on opening the site and can be dismissed with the
 * large X; the Login / Sign up buttons in the agent page's top right bring it back.
 *
 * Inert by design: nothing is validated, stored or sent. This is a design fixture — the
 * real auth surface lives in logos-webui, and #/login is the full-screen treatment this
 * is an alternative to.
 */
export function LoginGate({ mode, onSwitchMode, onSignIn, onClose }: LoginGateProps) {
  const [email, setEmail] = useState("")
  const signup = mode === "signup"

  return (
    <div className="v2-gate">
      {/* clicking off the card dismisses it too — the X is the obvious way, not the only one */}
      <div className="v2-gate-scrim" onClick={onClose} />

      <div className="v2-gate-card" role="dialog" aria-modal="true" aria-labelledby="v2-gate-title">
        <button className="v2-gate-x" type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        <img className="v2-gate-mark" src={ensoInk} alt="" aria-hidden="true" />

        <h1 className="v2-gate-title" id="v2-gate-title">
          {signup ? "Create an account" : "Sign in to LOGOS"}
        </h1>
        <p className="v2-gate-sub">
          {signup
            ? "Spin up your first instance in a couple of minutes."
            : "Your agents and instances, wherever you left them."}
        </p>

        <form
          className="v2-gate-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSignIn()
          }}
        >
          <label className="v2-gate-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <button className="v2-gate-go" type="submit">
            {signup ? "Create account" : "Continue"}
          </button>
        </form>

        <div className="v2-gate-or">
          <span>or</span>
        </div>

        <button className="v2-gate-alt" type="button" onClick={onSignIn}>
          Continue with wallet
        </button>

        <p className="v2-gate-switch">
          {signup ? "Already have an account?" : "No account yet?"}{" "}
          <button type="button" onClick={() => onSwitchMode(signup ? "login" : "signup")}>
            {signup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  )
}
