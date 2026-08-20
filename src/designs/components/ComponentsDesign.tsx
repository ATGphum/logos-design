/**
 * Framework components — the base-component gallery (dialogs, drawers, toasts).
 *
 * This lives in the design gallery rather than the console sidebar: it is a
 * reference surface for whoever is building LOGOS, not a page a LOGOS customer
 * would ever open. The panel itself is untouched and still ports 1:1 from the
 * prototype; this file only supplies the chrome it expects — the .console-root
 * / #cs-view scoping its cs-* styles need, a page head, and the useCsBase host
 * elements its dialogs, drawers and toasts mount into.
 *
 * Both stylesheets are imported (not just console.css) because .console-root's
 * own layout lives in chat.css — importing one without the other leaves this
 * page dependent on whether the console design happened to load first.
 */
import { useTheme } from "../../vendor/webui/theme"
import "../console/chat.css"
import "../console/console.css"
import { useCsBase } from "../console/shell/BaseComponents"
import { ComponentsPanel } from "../console/shell/panels/ComponentsPanel"

export default function ComponentsDesign() {
  const { resolvedMode } = useTheme()
  const { api, elements } = useCsBase()

  return (
    <div className="console-root">
      <div id="cs-view" className={resolvedMode === "light" ? "" : "cs-night"}>
        <main className="cs-main">
          <div className="cs-head">
            <div className="cs-headl"></div>
            <div className="cs-headmid">
              <div>
                <h1 className="cs-title">Components</h1>
                <p className="cs-sub">
                  Base components of the LOGOS framework — dialogs, notifications, drawers.
                </p>
              </div>
            </div>
            <div className="cs-headr"></div>
          </div>
          <div className="cs-panel" style={{ display: "block" }}>
            <ComponentsPanel api={api} onMobileNav={() => {}} />
          </div>
        </main>
        {elements}
      </div>
    </div>
  )
}
