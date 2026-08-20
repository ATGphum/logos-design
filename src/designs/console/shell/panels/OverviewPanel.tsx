/** Overview panel (#cs-panel-overview) — ported 1:1 from the prototype markup. */
import { Mod, SecH, Stat } from "./bits"

export function OverviewPanel({ onManageInstances, onUsageBreakdown }: { onManageInstances?: () => void; onUsageBreakdown?: () => void }) {
  return (
    <>
      <div className="cs-sec ov-budget" style={{ marginTop: 6 }}>
        <div className="ov-btop">
          <div className="ov-bmain">
            <div className="lab">
              Remaining budget
              <span className="ov-spent">
                <span className="sl">/</span>
                <span className="fig">
                  <span className="cur">$</span>4.12
                </span>
                <span className="tok">(2.31M tokens)</span>
                <span className="per">past 24h</span>
              </span>
            </div>
            <div className="amt ov-money disp">
              <span className="cur">$</span>163.60
            </div>
          </div>
          <div className="acts">
            <button className="cs-btn neutral">Add credit</button>
            <button className="cs-btn" onClick={onUsageBreakdown}>Usage breakdown</button>
          </div>
        </div>
        <div className="ov-bar">
          <span className="fill" style={{ width: "34.6%" }}></span>
        </div>
        <div className="ov-bused">35% used</div>
      </div>
      {/* instance count + readiness live on the Instances page, behind the button below */}
      <div className="ov-manage-row">
        <button className="cs-btn neutral ov-manage" onClick={onManageInstances}>
          Manage instances
        </button>
        <span className="hint">Create, inspect and retire instances across your machines.</span>
      </div>

      {/* "where the credit went" lives on the Usage page, behind "Usage breakdown" */}
      <div className="cs-sec">
        <SecH l="Attention queue" r="instances, stale heartbeats, and control-plane drift" />
        <div className="cs-mods">
          <Mod
            mk="Needs attention"
            mv="0"
            mr={
              <>
                <span className="chip chip-o">review instances</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Stale heartbeats"
            mv="0"
            mr={
              <>
                <span className="chip chip-o">health signals</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Config drift"
            mv="0"
            mr={
              <>
                <span className="chip chip-b">config / policy</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Control-plane modules" r="jump into the concrete modules behind the overview signals" />
        <div className="cs-mods">
          <Mod
            mk="Instances module"
            mv="12"
            mr={
              <>
                <span className="chip chip-b">12 visible</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Machines module"
            mv="6"
            mr={
              <>
                <span className="chip chip-b">5 provider</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Operations drawer"
            mv="0"
            mr={
              <>
                <span className="chip chip-n">summary</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
    </>
  )
}
