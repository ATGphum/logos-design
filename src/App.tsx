import { Component, Suspense, useEffect, useState, type ReactNode } from "react"
import { ThemeProvider } from "./vendor/webui/theme"
import { designs } from "./designs/registry"
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
  return (
    <div className="gal-root">
      <header className="gal-header">
        <h1>LOGOS design</h1>
        <p>
          Prototypes built on <code>logos-webui</code> design tokens. Pick a
          design; PRs get a self-contained preview build.
        </p>
      </header>
      <div className="gal-grid">
        {designs.map((d) => (
          <a key={d.id} className="gal-card" href={`#/${d.id}`}>
            <div className="gal-card-top">
              <span className="gal-title">{d.title}</span>
              <span className={`gal-status gal-status-${d.status}`}>
                {d.status}
              </span>
            </div>
            <p className="gal-desc">{d.description}</p>
            <p className="gal-maps">→ {d.maps_to}</p>
          </a>
        ))}
        <div className="gal-card gal-card-static">
          <div className="gal-card-top">
            <span className="gal-title">Marketing page</span>
            <span className="gal-status gal-status-shipped">html</span>
          </div>
          <p className="gal-desc">
            The marketing site stays a standalone HTML prototype — open{" "}
            <code>marketing/llm-interface.html</code> directly.
          </p>
        </div>
      </div>
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
              {active.id === "console" ? <ViewAsSwitch /> : null}
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
