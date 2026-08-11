/** Instances panel (#cs-panel-instances) — table, lifecycle, workspace, create. 1:1 port. */
import { useEffect, useRef, useState } from "react"
import { CI_TABLE_ROWS } from "../../state"
import { Mod, SecH, Stat } from "./bits"

export function InstancesPanel({ flashCreate }: { flashCreate: number }) {
  /** which row's overflow menu (…) is open */
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const createRef = useRef<HTMLDivElement>(null)

  /* any outside click closes the row menus, same as the prototype's document handler */
  useEffect(() => {
    if (menuRow === null) return
    const close = () => setMenuRow(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [menuRow])

  /* ciGotoCreate(): scroll the create-instance section into view and flash it */
  useEffect(() => {
    if (!flashCreate) return
    const t = window.setTimeout(() => {
      const sec = createRef.current
      if (!sec) return
      sec.scrollIntoView({ behavior: "smooth", block: "center" })
      sec.classList.remove("ci-flash")
      void sec.offsetWidth
      sec.classList.add("ci-flash")
    }, 60)
    return () => window.clearTimeout(t)
  }, [flashCreate])

  const pick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuRow(null)
  }

  return (
    <>
      <div className="cs-actions">
        <button className="cs-btn">Refresh</button>
        <button className="cs-btn pri">+ Create instance</button>
      </div>
      <div className="cs-stats">
        <Stat k="Total instances" v="25" t={<span className="chip chip-b">25 visible</span>} />
        <Stat k="Active capacity" v="1/1" t={<span className="chip chip-n">platform_admin</span>} />
        <Stat k="Readiness" v="ready" t={<span className="chip chip-g">postgres</span>} />
      </div>
      <div className="cs-sec ci-hub">
        <SecH l="Instances" r="scope, owner, status, runtime and quick actions — 25 visible" />
        <div className="ci-filters">
          <button className="cs-btn">Mine</button>
          <button className="cs-btn pri">All visible</button>
          <button className="cs-btn">Reset</button>
          <button className="cs-btn pri">All 25</button>
          <button className="cs-btn">Enrolled 25</button>
        </div>
        <div className="ci-toolbar">
          <div className="ci-tf">
            <label>Search</label>
            <input placeholder="Search ID, name, owner, status or target" />
          </div>
          <div className="ci-tf inline">
            <label>Targets</label>
            <span className="tv">self_hosted_docker</span>
          </div>
          <div className="ci-tf inline">
            <label>Owners</label>
            <select defaultValue="All 25">
              <option>All 25</option>
              <option>scout tesy</option>
              <option>atlas ops</option>
              <option>meridian lab</option>
            </select>
          </div>
        </div>
        <div className="ci-selrow">
          <button className="cs-btn">Select all instances (25)</button>
          <button className="cs-btn">Select page (20)</button>
          <button className="cs-btn">Clear selection</button>
        </div>
        <table className="ci-table">
          <thead>
            <tr>
              <th>
                <input className="ci-cb" type="checkbox" />
              </th>
              <th>Instance</th>
              <th>Status</th>
              <th>Deployment</th>
              <th>Target</th>
              <th>Runtime</th>
              <th>Owner</th>
              <th className="act">Action</th>
            </tr>
          </thead>
          <tbody>
            {CI_TABLE_ROWS.map((row, i) => (
              <tr key={row.id}>
                <td style={{ width: 34 }}>
                  <input className="ci-cb" type="checkbox" />
                </td>
                <td>
                  <div className="ci-who">
                    <span className="ci-ava">{row.ava}</span>
                    <div>
                      <div className="ci-nm">{row.name}</div>
                      <div className="ci-id">{row.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="chip chip-n">enrolled</span>
                </td>
                <td>
                  <span className="chip chip-g">running</span>
                </td>
                <td>
                  <code>self_hosted_docker</code>
                </td>
                <td className="ci-rt">logos-infra-deployment-worker</td>
                <td>{row.owner}</td>
                <td className="act">
                  <div className="ci-acts">
                    <span className="ci-open" title="Open this instance">
                      Open
                    </span>
                    <span className="ci-vr"></span>
                    <span className="ci-mini">Details</span>
                    <span
                      className="ci-more"
                      title="More actions"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuRow(menuRow === i ? null : i)
                      }}
                    >
                      …
                    </span>
                  </div>
                  <div className={"ci-menu" + (menuRow === i ? " on" : "")}>
                    <span onClick={pick}>Config</span>
                    <span onClick={pick}>Usage</span>
                    <span onClick={pick}>Owner</span>
                    <span className="warn" onClick={pick}>
                      Disable
                    </span>
                    <span className="danger" onClick={pick}>
                      Delete
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cs-note">showing 6 of 25 — page 1</p>
      </div>
      <div className="cs-sec">
        <SecH l="Lifecycle signals" r="runtime state, attention, and queued operations — 25 tracked" />
        <div className="cs-mods">
          <Mod mk="Running" mv="25" mr={<span className="cs-tag warn">0 pending</span>} />
          <Mod mk="Attention" mv="0" mr={<span className="cs-tag warn">0 findings</span>} />
          <Mod mk="Queued ops" mv="0" mr={<span className="cs-tag warn">0 runtime stale</span>} />
        </div>
        <p className="cs-note">enrolled 25</p>
      </div>
      <div className="cs-sec">
        <SecH l="Instance workspace" r="my instances, admin filters, and all visible instances — 25 visible" />
        <div className="cs-mods">
          <Mod
            mk="My instances"
            mv="1"
            mr={
              <>
                <span className="cs-tag">usr_a7pwt9fvch8j8pb392ya0s5kq4</span>
                <span className="cs-act">View</span>
              </>
            }
          />
          <Mod
            mk="Instance filters"
            mv="Enabled"
            mr={
              <>
                <span className="cs-tag">All</span>
                <span className="cs-act">View</span>
              </>
            }
          />
          <Mod
            mk="All instances"
            mv="25"
            mr={
              <>
                <span className="cs-tag">25 total</span>
                <span className="cs-act">View</span>
              </>
            }
          />
        </div>
      </div>
      <div className="cs-sec" id="ci-create" ref={createRef}>
        <SecH l="Create instance" r="provision a workspace with the current default resource policy" />
        <div className="cs-mods">
          <Mod mk="CPU" mv="2" />
          <Mod mk="Memory" mv="8.0 GB" />
          <Mod mk="Workspace" mv="100 GB" />
        </div>
        <div className="cs-formfoot" style={{ justifyContent: "flex-start" }}>
          <button className="cs-btn pri">+ Create instance</button>
        </div>
      </div>
    </>
  )
}
