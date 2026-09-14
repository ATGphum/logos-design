import { Component, Suspense, useEffect, useState, type ReactNode } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { ThemeProvider } from "./vendor/webui/theme"
import { designs } from "./designs/registry"
import { getLandingPageHref } from "./sandbox/landingPageHref"
import { ViewAsProvider, ViewAsSwitch } from "./sandbox/viewAs"

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return hash.replace(/^#\/?/, "")
}

class DesignBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="gal-error">
          <h2>This design failed to render</h2>
          <pre>{String(this.state.error)}</pre>
          <a href="#/">Back to gallery</a>
        </div>
      )
    }
    return this.props.children
  }
}

function Gallery() {
  const [showOtherDesigns, setShowOtherDesigns] = useState(false)
  const logosAgent = designs.find((design) => design.id === "v2")
  const otherDesigns = designs.filter((design) => design.id !== "v2")
  const landingPageHref = getLandingPageHref()

  return (
    <div className="gal-root">
      <header className="gal-header">
        <span className="gal-eyebrow">Product demo</span>
        <h1>LOGOS</h1>
        <p>Choose an experience to explore.</p>
      </header>

      <main>
        <div className="gal-grid gal-grid-featured">
          <a className="gal-card gal-card-featured" href={landingPageHref}>
            <div className="gal-card-top">
              <span className="gal-card-kind">Website</span>
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
            </div>
            <div className="gal-card-copy">
              <span className="gal-title">Landing Page</span>
              <p className="gal-desc">
                Explore the public LOGOS story, from the product premise to how
                the system works.
              </p>
            </div>
          </a>

          {logosAgent ? (
            <a className="gal-card gal-card-featured" href="#/v2">
              <div className="gal-card-top">
                <span className="gal-card-kind">Product</span>
                <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} />
              </div>
              <div className="gal-card-copy">
                <span className="gal-title">{logosAgent.title}</span>
                <p className="gal-desc">
                  Step into the agent-first LOGOS experience, with the console
                  and main site close at hand.
                </p>
              </div>
            </a>
          ) : null}
        </div>

        {showOtherDesigns ? (
          <section className="gal-other" aria-labelledby="gal-other-title">
            <div className="gal-section-heading">
              <span className="gal-eyebrow">Design archive</span>
              <h2 id="gal-other-title">Other designs</h2>
            </div>
            <div className="gal-grid gal-grid-secondary">
              {otherDesigns.map((design) => (
                <a
                  key={design.id}
                  className="gal-card"
                  href={`#/${design.id}`}
                >
                  <div className="gal-card-top">
                    <span className="gal-title">{design.title}</span>
                    <span
                      className={`gal-status gal-status-${design.status}`}
                    >
                      {design.status}
                    </span>
                  </div>
                  <p className="gal-desc">{design.description}</p>
                  <p className="gal-maps">{design.maps_to}</p>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <button
        className="gal-reveal"
        type="button"
        aria-expanded={showOtherDesigns}
        onClick={() => setShowOtherDesigns((isVisible) => !isVisible)}
      >
        {showOtherDesigns ? (
          <EyeOff aria-hidden="true" size={17} />
        ) : (
          <Eye aria-hidden="true" size={17} />
        )}
        {showOtherDesigns
          ? "Hide other designs"
          : `Show other designs (${otherDesigns.length})`}
      </button>
    </div>
  )
}

export default function App() {
  const route = useHashRoute()
  const active = designs.find((d) => d.id === route)
  return (
    <ThemeProvider>
      <ViewAsProvider>
        {active ? (
          <DesignBoundary key={active.id}>
            <Suspense fallback={<div className="gal-loading">loading…</div>}>
              <active.component />
            </Suspense>
            <div className="gal-chrome">
              {/* only the console has admin-only surfaces to hide */}
              {/* both console shells honour it — V2 renders the same ConsoleView */}
              {active.id === "console" || active.id === "v2" ? <ViewAsSwitch /> : null}
              <a className="gal-back" href="#/" title="Back to gallery">
                ⌂
              </a>
            </div>
          </DesignBoundary>
        ) : (
          <Gallery />
        )}
      </ViewAsProvider>
    </ThemeProvider>
  )
}
