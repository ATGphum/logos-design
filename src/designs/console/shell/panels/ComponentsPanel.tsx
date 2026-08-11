/** Framework components panel (#cs-panel-components) — wired demos, 1:1 port. */
import type { CsBaseApi } from "../BaseComponents"
import { SecH } from "./bits"

export function csRefreshDemo(api: CsBaseApi) {
  api.notify({ kind: "ok", title: "Data refreshed", msg: "Control-plane metrics re-pulled for org_000071." })
}

export function csOpsDrawer(api: CsBaseApi) {
  api.drawer({
    title: "Operations details",
    sub: "Control plane · org_000071",
    body: (
      <>
        <div className="cs-kv">
          <span>Control plane</span>
          <b>
            <span className="dot ok"></span>Operational
          </b>
        </div>
        <div className="cs-kv">
          <span>Scheduler</span>
          <b>
            <span className="dot ok"></span>Operational
          </b>
        </div>
        <div className="cs-kv">
          <span>Provider mesh</span>
          <b>
            <span className="dot warn"></span>Degraded
          </b>
        </div>
        <div className="cs-kv">
          <span>Last incident</span>
          <b>2026/07/09 · resolved</b>
        </div>
        <div className="cs-kv">
          <span>Stale heartbeats</span>
          <b>2</b>
        </div>
        <div className="cs-note">Live status of LOGOS control-plane subsystems. Values refresh with the operations poller.</div>
      </>
    ),
    actions: [{ label: "Close" }, { label: "Refresh", cls: "pri", onClick: () => csRefreshDemo(api) }],
  })
}

export function csConfirmDemo(api: CsBaseApi) {
  api.dialog({
    title: "Deploy instance",
    sub: "Confirm a control-plane action.",
    body: (
      <>
        Deploy <b>logos-inference-v3</b> to pool <b>eu-01</b>? The instance becomes billable once the machine reports ready.
      </>
    ),
    actions: [
      { label: "Cancel" },
      {
        label: "Deploy",
        cls: "pri",
        onClick: () => api.notify({ kind: "ok", title: "Deployed", msg: "logos-inference-v3 scheduled on eu-01." }),
      },
    ],
  })
}

export function csDangerDemo(api: CsBaseApi) {
  api.dialog({
    title: "Revoke API key",
    sub: "This action cannot be undone.",
    body: (
      <>
        Revoke <b>sk-logos-7f3a-****-b21c</b>? Requests signed with this key fail immediately.
      </>
    ),
    actions: [
      { label: "Cancel" },
      {
        label: "Revoke key",
        cls: "act-r",
        onClick: () => api.notify({ kind: "err", title: "Key revoked", msg: "sk-logos-7f3a-****-b21c is no longer valid." }),
      },
    ],
  })
}

export function ComponentsPanel({ api, onMobileNav }: { api: CsBaseApi; onMobileNav: () => void }) {
  return (
    <>
      <div className="cs-sec" style={{ marginTop: 34 }}>
        <SecH l="Dialogs" r="Modal confirmations and focused decisions. Esc or scrim click dismisses." />
        <div className="cs-actions">
          <button className="cs-btn neutral" onClick={() => csConfirmDemo(api)}>
            Confirm dialog
          </button>
          <button className="cs-btn neutral" onClick={() => csDangerDemo(api)}>
            Destructive dialog
          </button>
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Notifications" r="Transient toasts, bottom right. Status accent, auto-dismiss, manual close." />
        <div className="cs-actions">
          <button className="cs-btn neutral" onClick={() => api.notify({ title: "Notice", msg: "Neutral notification in the unified style." })}>
            Neutral
          </button>
          <button className="cs-btn neutral" onClick={() => api.notify({ kind: "ok", title: "Success", msg: "Instance deployed to pool eu-01." })}>
            Success
          </button>
          <button
            className="cs-btn neutral"
            onClick={() => api.notify({ kind: "warn", title: "Warning", msg: "Budget threshold at 80% for key sk-logos-7f3a." })}
          >
            Warning
          </button>
          <button
            className="cs-btn neutral"
            onClick={() => api.notify({ kind: "err", title: "Error", msg: "Provider heartbeat lost on machine mx-04." })}
          >
            Error
          </button>
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Drawers" r="Side panels for details and secondary flows, right or left." />
        <div className="cs-actions">
          <button className="cs-btn neutral" onClick={() => csOpsDrawer(api)}>
            Right drawer
          </button>
          <button className="cs-btn neutral" onClick={onMobileNav}>
            Left drawer (nav)
          </button>
        </div>
      </div>
    </>
  )
}
