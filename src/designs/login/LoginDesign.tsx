import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react"
import { ArrowLeft } from "lucide-react"

import "../../vendor/infra/styles/marketing.css"
import "./login.css"

import githubIcon from "./assets/login-ico-github.webp"
import googleIcon from "./assets/login-ico-google.webp"
import discordIcon from "./assets/login-ico-discord.webp"
import ensoWhite from "./assets/enso-white.svg"

type LoginStep = "signup" | "login" | "reserved"
type Provider = "github" | "google" | "discord"

const providers: Array<{ key: Provider; name: string; icon: string }> = [
  { key: "github", name: "GitHub", icon: githubIcon },
  { key: "google", name: "Google", icon: googleIcon },
  { key: "discord", name: "Discord", icon: discordIcon },
]

// The product marketing hero creates the same 46 points at runtime. A fixed
// seed keeps this standalone handoff deterministic while preserving the field.
const stars = Array.from({ length: 46 }, (_, index) => {
  const angle = ((index * 137.508 + 19) * Math.PI) / 180
  const radius = Math.sqrt(((index * 47) % 101) / 100) * 30
  const size = index % 9 === 0 ? 3 : index % 3 === 0 ? 2 : 1.5

  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
    size,
    duration: `${2.6 + (index % 8) * 0.43}s`,
    delay: `-${(index % 12) * 0.37}s`,
    peak: `${0.58 + (index % 5) * 0.09}`,
  }
})

export default function LoginDesign() {
  const [step, setStep] = useState<LoginStep>("signup")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [provider, setProvider] = useState<Provider | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const goTo = (next: LoginStep) => {
    setError("")
    setProvider(null)
    setSubmitting(false)
    setStep(next)
  }

  const handleBack = () => {
    if (step === "signup") {
      window.location.hash = "#/"
      return
    }
    goTo("signup")
  }

  const handleSignup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid e-mail address to continue.")
      return
    }

    setError("")
    setSubmitting(true)
    timerRef.current = window.setTimeout(() => {
      setSubmitting(false)
      setStep("reserved")
    }, 520)
  }

  const handleProvider = (nextProvider: Provider) => {
    if (provider) return
    setProvider(nextProvider)
    timerRef.current = window.setTimeout(() => {
      window.location.hash = "#/console"
    }, 420)
  }

  return (
    <main className="logos-marketing-root lg-ring-root">
      <div id="mp-view" className="mp-login-mode">
        <section
          className={`mp-hero${step === "reserved" ? " mp-hero-reserved" : ""}`}
          aria-label="LOGOS stage two access"
        >
          <div className="mp-enso-glow" aria-hidden="true" />
          <img className="mp-enso-halo" src={ensoWhite} alt="" aria-hidden="true" />
          <div className="mp-stars" aria-hidden="true">
            {stars.map((star, index) => (
              <span
                className="mp-star"
                key={index}
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  "--dur": star.duration,
                  "--delay": star.delay,
                  "--peak": star.peak,
                } as CSSProperties}
              />
            ))}
          </div>

          <form
            className={`mp-ring-login rl-step-${step}${step === "login" ? " rl-has-providers" : " rl-email-only"}`}
            onSubmit={handleSignup}
            noValidate
          >
            {step === "reserved" ? (
              <div className="rl-reserved" role="status">
                <span className="rl-reserved-check" aria-hidden="true" />
                <div className="rl-reserved-title">Account reserved</div>
                <p>Your spot for stage two is saved.</p>
                <small>We’ll contact {email.trim()} when access is ready.</small>
                <button className="rl-reserved-back" type="button" onClick={() => goTo("signup")}>
                  Back to sign up
                </button>
              </div>
            ) : step === "signup" ? (
              <>
                <div className="rl-head">
                  Sign up for
                  <br />
                  stage two
                </div>
                {error ? <div className="rl-error" role="alert">{error}</div> : null}
                <input
                  className="rl-input"
                  type="email"
                  placeholder="Enter your e-mail address"
                  spellCheck={false}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (error) setError("")
                  }}
                  aria-label="E-mail address"
                />
                <button className="rl-continue" type="submit" disabled={submitting}>
                  {submitting ? "Saving" : "Continue"}
                </button>
                <div className="rl-beta-divider"><span>or</span></div>
                <button className="rl-beta-access" type="button" onClick={() => goTo("login")}>
                  Access for
                  <br />
                  beta users
                </button>
              </>
            ) : (
              <>
                <div className="rl-head">Access LOGOS</div>
                {providers.map((item) => (
                  <button
                    className="rl-btn"
                    data-provider={item.key}
                    type="button"
                    key={item.key}
                    disabled={provider !== null}
                    onClick={() => handleProvider(item.key)}
                  >
                    <img className="rl-ico" src={item.icon} alt="" />
                    {provider === item.key ? `Connecting to ${item.name}` : `Continue with ${item.name}`}
                  </button>
                ))}
              </>
            )}
          </form>
        </section>

        <button className="rl-backtop" type="button" onClick={handleBack} aria-label={step === "signup" ? "Back to gallery" : "Back to stage two sign up"}>
          <ArrowLeft aria-hidden="true" strokeWidth={2.1} />
        </button>
      </div>
    </main>
  )
}
