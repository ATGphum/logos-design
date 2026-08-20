/** API Keys, Usage, Users, Machines and Placeholder panels — 1:1 ports. */
import { API_KEYS } from "../../state"
import { Kv, Mod, SecH, Stat, Toggle } from "./bits"

export function ApiPanel({ onCopy }: { onCopy: () => void }) {
  return (
    <>
      <div className="cs-actions">
        <button className="cs-btn pri">+ Create API key</button>
        <button className="cs-btn">Edit registration access</button>
      </div>
      <div className="cs-stats">
        <Stat k="Total keys" v="12" t="12 visible" tCls="b" />
        <Stat k="Budget" v="$0.00" t="configured limit" tCls="ok" />
        <Stat k="Usage" v="$1531.32" t="459,538,097 tokens" tCls="warn" />
      </div>
      <div className="cs-sec">
        <SecH l="Keys" r="status, spend and token activity" />
        <table className="cs-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Status</th>
              <th className="num">Budget</th>
              <th className="num">Tokens</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {API_KEYS.map((k, i) => (
              <tr key={k.name}>
                <td>{k.name}</td>
                <td>
                  <code>{k.key}</code>
                </td>
                <td>
                  <span className={"dot " + k.dot}></span>
                  {k.status}
                </td>
                <td className="num">{k.budget}</td>
                <td className="num">{k.tokens}</td>
                <td>{k.created}</td>
                <td>
                  {/* only the first row wires csCopy() in the prototype */}
                  <span className="cs-act" onClick={i === 0 ? onCopy : undefined}>
                    {k.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cs-sec">
        <SecH l="Key signals" />
        <div className="cs-mods">
          <Mod
            mk="Active"
            mv="12"
            mr={
              <>
                <span className="cs-tag ok">0 disabled</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Deleted"
            mv="11"
            mr={
              <>
                <span className="cs-tag">excluded from visible</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Used budget"
            mv="$1531.32"
            mr={
              <>
                <span className="cs-tag warn">over configured limit</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Tokens"
            mv="459,538,097"
            mr={
              <>
                <span className="cs-tag">input + output</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Registration access" r="public account creation policy exposed on the auth screen" />
        <div className="cs-tglrow">
          <Toggle />
          <span className="tl">Public registration</span>
        </div>
        <Kv label="Current policy" value="closed" />
        <Kv label="Updated by" value="—" />
        <Kv label="Updated at" value="—" />
      </div>
    </>
  )
}

export function UsagePanel() {
  return (
    <>
      <div className="cs-actions">
        <button className="cs-btn">Refresh</button>
        <button className="cs-btn">Provider records</button>
        <button className="cs-btn">Lookup</button>
        <button className="cs-btn">Import</button>
        <button className="cs-btn pri">Export CSV</button>
      </div>
      <div className="cs-stats">
        <Stat k="Input tokens" v="0" t="0/0 daily rows" />
        <Stat k="Output tokens" v="0" t="model responses" />
        <Stat k="Estimated cost" v="$0.00" t="2026-07-13" />
      </div>
{/* moved off the Dashboard — this is what "Usage breakdown" goes to */}
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
      <div className="cs-sec">
        <SecH l="Usage workspace" r="rollups, provider records, lookup, csv import & export" />
        <div className="cs-mods">
          <Mod
            mk="Daily rollup"
            mv="0"
            mr={
              <>
                <span className="cs-tag">0 visible</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Provider records"
            mv="0"
            mr={
              <>
                <span className="cs-tag">admin records</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Request lookup"
            mv="2026-07-13"
            mr={
              <>
                <span className="cs-tag">provider request</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Provider CSV import"
            mv="Enabled"
            mr={
              <>
                <span className="cs-tag ok">0 rows</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Provider CSV export"
            mv="CSV"
            mr={
              <>
                <span className="cs-tag">latest 100 records</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Usage signals" r="token mix, cost and provider distribution" />
        <div className="cs-mods">
          <Mod mk="Input share" mv="0%" mr={<span className="cs-tag">0 tokens</span>} />
          <Mod mk="Output share" mv="0%" mr={<span className="cs-tag">0 tokens</span>} />
          <Mod mk="Cost window" mv="$0.00" mr={<span className="cs-tag">2026-07-13</span>} />
          <Mod mk="Daily rows" mv="0" mr={<span className="cs-tag">0 total</span>} />
        </div>
        <p className="cs-note">No provider usage rows.</p>
      </div>
    </>
  )
}

export function UsersPanel() {
  return (
    <>
      <div className="cs-actions">
        <button className="cs-btn pri">+ Create user</button>
      </div>
      <div className="cs-stats">
        <Stat k="Users" v="45" t="platform accounts" />
        <Stat k="Active" v="7" t="active users" tCls="ok" />
        <Stat k="Admins" v="23" t="platform admins" />
      </div>
      <div className="cs-sec">
        <SecH l="User workspace" r="roles, balance, instance limits and active sessions" />
        <div className="cs-mods">
          <Mod
            mk="Create user"
            mv="45"
            mr={
              <>
                <span className="cs-tag">new account</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Platform admin roles"
            mv="23"
            mr={
              <>
                <span className="cs-tag">platform admins</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Balance ledger"
            mv="$10,668.72"
            mr={
              <>
                <span className="cs-tag">45 visible</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Instance limits"
            mv="12 / 146"
            mr={
              <>
                <span className="cs-tag warn">1 at capacity</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Active user sessions"
            mv="37"
            mr={
              <>
                <span className="cs-tag">7 users</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="User signals" r="role distribution, account status and entitlement pressure" />
        <div className="cs-mods">
          <Mod mk="Balance" mv="$10,668.72" mr={<span className="cs-tag">total credit</span>} />
          <Mod mk="Instances" mv="12 / 146" mr={<span className="cs-tag">active / max</span>} />
          <Mod mk="Sessions" mv="37" mr={<span className="cs-tag">active sessions</span>} />
          <Mod mk="Admins" mv="23" mr={<span className="cs-tag">platform admins</span>} />
        </div>
        <Kv
          label={
            <>
              <span className="dot"></span>platform_admin
            </>
          }
          value="23"
        />
        <Kv
          label={
            <>
              <span className="dot"></span>user
            </>
          }
          value="22"
        />
      </div>
    </>
  )
}

export function MachinesPanel() {
  return (
    <>
      <div className="cs-actions">
        <button className="cs-btn pri">+ Create node</button>
        <button className="cs-btn">+ Create provider</button>
        <button className="cs-btn">+ Create pool</button>
        <button className="cs-btn">+ Provider machine</button>
        <button className="cs-btn">Reconcile capacity</button>
        <button className="cs-btn">Refresh</button>
      </div>
      <div className="cs-stats">
        <Stat k="Machines" v="6" t="deployment nodes" />
        <Stat k="Providers" v="2" t="machine providers" />
        <Stat k="Pools" v="2" t="capacity pools" />
        <Stat k="Healthy" v="1" t="health status ok" tCls="ok" />
      </div>
      <div className="cs-sec">
        <SecH l="Machine workspace" r="nodes, providers, pools, capacity and ledger views" />
        <div className="cs-mods">
          <Mod
            mk="Nodes"
            mv="6"
            mr={
              <>
                <span className="cs-tag warn">1 healthy</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Providers"
            mv="2"
            mr={
              <>
                <span className="cs-tag ok">2 active</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Pools"
            mv="2"
            mr={
              <>
                <span className="cs-tag ok">2 active</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Provider machines"
            mv="5"
            mr={
              <>
                <span className="cs-tag">0 active</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Capacity requests"
            mv="5"
            mr={
              <>
                <span className="cs-tag warn">2 pending</span>
                <i>›</i>
              </>
            }
          />
          <Mod
            mk="Cost ledger"
            mv="$0.00"
            mr={
              <>
                <span className="cs-tag">0 entries</span>
                <i>›</i>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec">
        <SecH l="Capacity signals" r="real-time machine capacity and request pressure" />
        <div className="cs-mods">
          <Mod mk="Available slots" mv="0 / 16" mr={<span className="cs-tag">deployment capacity</span>} />
          <Mod mk="CPU reservation" mv="24 / 41" mr={<span className="cs-tag">reserved / total</span>} />
          <Mod mk="Pending requests" mv="2" mr={<span className="cs-tag">0 failed</span>} />
          <Mod mk="Provider fleet" mv="0" mr={<span className="cs-tag">5 tracked</span>} />
        </div>
        <Kv
          label={
            <>
              <span className="dot ok"></span>ok
            </>
          }
          value="1"
        />
        <Kv
          label={
            <>
              <span className="dot warn"></span>stale
            </>
          }
          value="5"
        />
      </div>
    </>
  )
}

export function PlaceholderPanel() {
  return (
    <div className="cs-blank">
      <span>/ placeholder — module pending /</span>
    </div>
  )
}
