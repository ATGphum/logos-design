/**
 * Sandbox-only "view as" state.
 *
 * This is scaffolding for whoever is reviewing a design (scout, jeremy) — not a
 * product feature. A console operator has no such switch; the real app decides
 * what to show from the signed-in account's role. It lets a reviewer see the
 * customer-facing shape of a design without a second account.
 *
 * Lives in src/sandbox/ rather than inside a design so it never gets lifted into
 * logos-webui along with the composition code.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

export type ViewAs = "admin" | "user"

interface ViewAsCtx {
  viewAs: ViewAs
  setViewAs: (v: ViewAs) => void
}

const Ctx = createContext<ViewAsCtx>({ viewAs: "admin", setViewAs: () => {} })

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAs] = useState<ViewAs>("admin")
  const value = useMemo(() => ({ viewAs, setViewAs }), [viewAs])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Designs read this to decide whether admin-only surfaces are shown. */
export function useViewAs() {
  return useContext(Ctx)
}

/** The switch itself — rendered in the sandbox chrome, never inside a design. */
export function ViewAsSwitch() {
  const { viewAs, setViewAs } = useViewAs()
  const isAdmin = viewAs === "admin"
  return (
    <button
      className="gal-viewas"
      onClick={() => setViewAs(isAdmin ? "user" : "admin")}
      title="Sandbox only — preview this design as a plain user or as an admin"
    >
      <span className="gal-viewas-lb">viewing as</span>
      <span className={"gal-viewas-val" + (isAdmin ? " is-admin" : "")}>{isAdmin ? "admin" : "user"}</span>
    </button>
  )
}
