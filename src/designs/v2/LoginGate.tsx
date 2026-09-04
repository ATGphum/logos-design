import { useState } from "react"
import ensoInk from "../console/assets/enso-ink.svg"
import githubWhite from "../login/assets/login-ico-github.webp"
import githubDark from "../login/assets/login-ico-github-dark.webp"
import googleIco from "../login/assets/login-ico-google.webp"
import discordIco from "../login/assets/login-ico-discord.webp"

export type AuthMode = "login" | "signup"

interface LoginGateProps {
  mode: AuthMode
  light: boolean
  onSwitchMode: (mode: AuthMode) => void
  onSignIn: () => void
  /** the large X — dismiss and carry on looking around */
  onClose: () => void
}

/**
 * V2's auth pop-out. Appears once on opening the site, dismissable with the large X;
 * Login / Sign up in the agent page's top right bring it back.
 *
 * Providers and order follow #/login — GitHub, Google, Discord, then email — and reuse
 * that design's icon assets so the two cannot drift apart.
 *
 * Inert by design: nothing is validated, stored or sent. The real auth surface lives in
 * logos-webui.
 */
export function LoginGate({ mode, light, onSwitchMode, onSignIn, onClose }: LoginGateProps) {
  const [email, setEmail] = useState("")
  const signup = mode === "signup"
  const verb = signup ? "Sign up" : "Continue"

  return (
    <div className="v2-gate">
      {/* clicking off the card dismisses it too — the X is the obvious way, not the only one */}
      <div className="v2-gate-scrim" onClick={onClose} />

      <div className="v2-gate-card" role="dialog" aria-modal="true" aria-labelledby="v2-gate-title">
        <button className="v2-gate-x" type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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

        <div className="v2-gate-providers">
          <button className="v2-gate-social" type="button" onClick={onSignIn}>
            <img className="v2-gate-ico" src={light ? githubDark : githubWhite} alt="" aria-hidden="true" />
            {verb} with GitHub
          </button>
          <button className="v2-gate-social" type="button" onClick={onSignIn}>
            <img className="v2-gate-ico" src={googleIco} alt="" aria-hidden="true" />
            {verb} with Google
          </button>
          <button className="v2-gate-social" type="button" onClick={onSignIn}>
            <img className="v2-gate-ico" src={discordIco} alt="" aria-hidden="true" />
            {verb} with Discord
          </button>
        </div>

        <div className="v2-gate-or">
          <span>or</span>
        </div>

        <form
          className="v2-gate-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSignIn()
          }}
        >
          <input
            className="v2-gate-input"
            type="email"
            autoComplete="email"
            placeholder="Enter your e-mail address"
            aria-label="Email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="v2-gate-go" type="submit">
            {signup ? "Create account" : "Continue"}
          </button>
        </form>

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
