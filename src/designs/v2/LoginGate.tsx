import { useState } from "react"
import ensoInk from "../console/assets/enso-ink.svg"

interface LoginGateProps {
  onSignIn: () => void
  /** sandbox escape hatch — lets a reviewer get past the gate to look around */
  onSkip: () => void
}

/**
 * V2's login is a small window docked to the right of the agent page — not a screen of
 * its own, and not built into the page. The agent page renders and behaves normally
 * underneath; this just sits on it until you are signed in.
 *
 * Inert by design. Nothing is validated, stored, or sent anywhere — this is a design
 * fixture, and the real gate lives in logos-webui's auth surface (see #/login for the
 * full-screen treatment this replaces).
 */
export function LoginGate({ onSignIn, onSkip }: LoginGateProps) {
  const [email, setEmail] = useState("")

  return (
    <div className="v2-gate" aria-labelledby="v2-gate-title">
      <div className="v2-gate-card" role="dialog" aria-labelledby="v2-gate-title">
        <img className="v2-gate-mark" src={ensoInk} alt="" aria-hidden="true" />

        <h1 className="v2-gate-title" id="v2-gate-title">
          Sign in to LOGOS
        </h1>
        <p className="v2-gate-sub">Your agents and instances, wherever you left them.</p>

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
            Continue
          </button>
        </form>

        <div className="v2-gate-or">
          <span>or</span>
        </div>

        <button className="v2-gate-alt" type="button" onClick={onSignIn}>
          Continue with wallet
        </button>

        <button className="v2-gate-skip" type="button" onClick={onSkip}>
          Skip — look around first
        </button>
      </div>
    </div>
  )
}
