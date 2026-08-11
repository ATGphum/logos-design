/** Overview panel (#cs-panel-overview) — ported 1:1 from the prototype markup. */
import { Mod, SecH, Stat } from "./bits"

export function OverviewPanel() {
  return (
    <>
      <div className="cs-sec ov-budget" style={{ marginTop: 20 }}>
        <div className="cs-sec-h ov-sech">
          <div>
            <span className="l">Budget</span>
            <span className="r">your credit for this cycle · resets 1 September</span>
          </div>
          <div className="acts">
            <button className="cs-btn neutral">Add credit</button>
            <button className="cs-btn">Usage breakdown</button>
          </div>
        </div>
        <div className="ov-btop">
          <div className="ov-bmain">
            <div className="lab">Available to spend</div>
            <div className="amt ov-money disp">
              <span className="cur">$</span>163.60
            </div>
          </div>
          <div className="ov-bpct">
            <div className="lab">Used so far</div>
            <div className="big ov-money">35%</div>
          </div>
        </div>
        <div className="ov-bar">
          <span className="fill" style={{ width: "34.6%" }}></span>
        </div>
        <div className="ov-blegend">
          <div className="grp">
            <span className="li">
              <span className="sw used"></span>
              <b>
                <span className="ov-money">
                  <span className="cur">$</span>86.40
                </span>
              </b>
              <i>used</i>
            </span>
            <span className="li">
              <span className="sw left"></span>
              <b>
                <span className="ov-money">
                  <span className="cur">$</span>163.60
                </span>
              </b>
              <i>remaining</i>
            </span>
            <span className="li">
              <i>of</i>
              <b>
                <span className="ov-money">
                  <span className="cur">$</span>250.00
                </span>
              </b>
              <i>total</i>
            </span>
          </div>
        </div>
      </div>
      <div className="cs-stats" style={{ marginTop: 96 }}>
        <Stat
          k="Spend today"
          vCls="ov-money disp"
          v={
            <>
              <span className="cur">$</span>4.12
            </>
          }
          t={<span className="chip chip-n">2.31M tokens</span>}
        />
        <Stat k="Your instances" vCls="ov-money" v="6" t={<span className="chip chip-g">6 running</span>} />
        <Stat k="Readiness" v="Ready" t={<span className="chip chip-g">all systems normal</span>} />
      </div>
      <div className="cs-sec ov-breakdown">
        <SecH l="Where the credit went" />
        <div className="ov-bd">
          <div className="row">
            <span className="n">Agent sessions</span>
            <span className="a">$52.90</span>
          </div>
          <div className="row">
            <span className="n">Instance runtime</span>
            <span className="a">$26.10</span>
          </div>
          <div className="row">
            <span className="n">Storage</span>
            <span className="a">$7.40</span>
          </div>
        </div>
      </div>
      <div className="cs-sec" style={{ marginTop: 80 }}>
        <SecH l="Operations" r="control-plane detail — mostly relevant to admins" />
      </div>
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
      <div className="cs-sec">
        <SecH l="Operations overview" r="readiness, credentials, preflight warnings, and acknowledgements" />
        <p className="cs-note">[Placeholder] Operations detail drawer — wired by backend.</p>
      </div>
    </>
  )
}
