/** Console Settings panel (#cs-panel-settings) — 1:1 port. */
import { Kv, Mod, SecH, Toggle } from "./bits"

export function SettingsPanel() {
  return (
    <>
      <div className="cs-sec">
        <SecH l="Signup policy" r="new user credit and default active instance quota" />
        <div className="cs-mods">
          <Mod mk="Credit USD" mv="100" mr={<span className="cs-tag">$100.00</span>} />
          <Mod mk="Max instances" mv="5" mr={<span className="cs-tag">5 saved</span>} />
          <Mod mk="Audit reason" mv="Ready" mr={<span className="cs-tag">updated from web-ui</span>} />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Resource policy" r="default cpu, memory and workspace allocation" />
        <div className="cs-mods">
          <Mod mk="CPU cores" mv="2" mr={<span className="cs-tag">2 saved</span>} />
          <Mod mk="Memory GB" mv="8" mr={<span className="cs-tag">8.0 GB</span>} />
          <Mod mk="Workspace GB" mv="100" mr={<span className="cs-tag">100 GB</span>} />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Registration access" r="controls whether the auth page exposes public account creation" />
        <div className="cs-tglrow">
          <Toggle />
          <span className="tl">Public registration</span>
        </div>
        <Kv label="Current policy" value="closed" />
        <Kv label="Updated by" value="—" />
        <Kv label="Updated at" value="—" />
        <div className="cs-form" style={{ marginTop: 18 }}>
          <div className="cs-field">
            <label>Audit reason</label>
            <input defaultValue="Updated from web-ui template" />
          </div>
        </div>
        <div className="cs-formfoot">
          <button className="cs-btn">Reset</button>
          <button className="cs-btn pri">Save access</button>
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Signup grant" r="default credit and instance quota for newly registered users" />
        <div className="cs-form">
          <div className="cs-field">
            <label>Credit USD</label>
            <input defaultValue="100" />
            <div className="hint">0 or greater</div>
          </div>
          <div className="cs-field">
            <label>Max active instances</label>
            <input defaultValue="5" />
            <div className="hint">0 or greater</div>
          </div>
          <div className="cs-field">
            <label>Audit reason</label>
            <input defaultValue="Updated from web-ui template" />
          </div>
        </div>
        <div className="cs-formfoot">
          <button className="cs-btn">Reset</button>
          <button className="cs-btn pri">Save grant</button>
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Instance resources" r="default cpu, memory and workspace allocation for new instances" />
        <div className="cs-form">
          <div className="cs-field">
            <label>CPU cores</label>
            <input defaultValue="2" />
            <div className="hint">greater than 0</div>
          </div>
          <div className="cs-field">
            <label>Memory GB</label>
            <input defaultValue="8" />
            <div className="hint">greater than 0</div>
          </div>
          <div className="cs-field">
            <label>Workspace GB</label>
            <input defaultValue="100" />
            <div className="hint">greater than 0</div>
          </div>
        </div>
        <Kv label="Applies to" value="new_instances" />
        <Kv label="Updated by" value="user_000001" />
        <Kv label="Updated at" value="2026/6/21 00:07:51" />
        <div className="cs-formfoot">
          <button className="cs-btn">Reset</button>
          <button className="cs-btn pri">Save resources</button>
        </div>
      </div>
      {/* moved off the Dashboard: control-plane detail that only admins act on.
          Parked here so the wiring has somewhere to land later. */}
      <div className="cs-sec" style={{ marginTop: 80 }}>
        <SecH l="Operations" r="control-plane detail — mostly relevant to admins" />
      </div>
      <div className="cs-sec">
        <SecH l="Operations overview" r="readiness, credentials, preflight warnings, and acknowledgements" />
        <p className="cs-note">[Placeholder] Operations detail drawer — wired by backend.</p>
      </div>
    </>
  )
}
