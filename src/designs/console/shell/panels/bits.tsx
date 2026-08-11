/** Small shared console primitives — markup mirrors the prototype exactly. */
import { useState, type ReactNode } from "react"

/** .cs-mod card: left mk/mv column + right-hand mr slot */
export function Mod({ mk, mv, mr }: { mk: ReactNode; mv: ReactNode; mr?: ReactNode }) {
  return (
    <div className="cs-mod">
      <div>
        <div className="mk">{mk}</div>
        <div className="mv">{mv}</div>
      </div>
      <div className="mr">{mr}</div>
    </div>
  )
}

/** .cs-stat KPI tile */
export function Stat({ k, v, vCls, t, tCls }: { k: ReactNode; v: ReactNode; vCls?: string; t?: ReactNode; tCls?: string }) {
  return (
    <div className="cs-stat">
      <div className="k">{k}</div>
      <div className={"v" + (vCls ? " " + vCls : "")}>{v}</div>
      {t !== undefined ? <div className={"t" + (tCls ? " " + tCls : "")}>{t}</div> : null}
    </div>
  )
}

/** .cs-kv row */
export function Kv({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="cs-kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

/** .cs-sec-h header (simple variant: l + optional r) */
export function SecH({ l, r }: { l: ReactNode; r?: ReactNode }) {
  return (
    <div className="cs-sec-h">
      <span className="l">{l}</span>
      {r !== undefined ? <span className="r">{r}</span> : null}
    </div>
  )
}

/** .cs-tgl on/off switch — prototype toggles the class on click */
export function Toggle({ initialOn = false }: { initialOn?: boolean }) {
  const [on, setOn] = useState(initialOn)
  return <div className={"cs-tgl" + (on ? " on" : "")} onClick={() => setOn((v) => !v)}></div>
}

/** $-amount with the small currency glyph, matching .ov-money markup */
export function Money({ amount, cls }: { amount: string; cls?: string }) {
  return (
    <span className={"ov-money" + (cls ? " " + cls : "")}>
      <span className="cur">$</span>
      {amount}
    </span>
  )
}
