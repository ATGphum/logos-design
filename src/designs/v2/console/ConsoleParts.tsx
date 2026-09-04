import type { ReactNode } from "react"
import { useState } from "react"

/**
 * The console's vocabulary — five shapes, and every page is built from them.
 *
 * The old console had one shape doing every job: a tile with a label, a number, a badge
 * and a chevron, laid out three across. Some navigated and some did not, some were a
 * reading and some were a setting, and nothing on the tile said which. A page of them
 * reads as a wall, and the only way to learn it is to click everything.
 *
 * So each shape here means exactly one thing, and the meaning is visible before you
 * read the words:
 *
 *   Figures  — readings. Large, unboxed, never interactive.
 *   Card     — a titled group with a plain-English line under the title.
 *   Row      — one item in a list. A chevron ONLY when it goes somewhere.
 *   Table    — records, when the columns actually differ per row.
 *   Field    — something you change, drawn as a recess because you type into it.
 *
 * Rows replace the tile grid throughout. A full-width row puts the name at the left
 * margin and the value at the right, so they can never collide the way two and three
 * columns of tiles did at every window size.
 */

/* ————— page frame ————— */
export function Page({
  title,
  lede,
  actions,
  children,
}: {
  title: string
  /** one line, plain language: what this page is for. Not a slogan. */
  lede: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="k-page">
      <header className="k-head">
        <div className="k-head-text">
          <h1>{title}</h1>
          <p>{lede}</p>
        </div>
        {actions ? <div className="k-head-acts">{actions}</div> : null}
      </header>
      <div className="k-body">{children}</div>
    </div>
  )
}

/* ————— readings ————— */
export function Figures({ children }: { children: ReactNode }) {
  return <div className="k-figs">{children}</div>
}

export function Fig({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="k-fig">
      <div className="k-fig-l">{label}</div>
      <div className={"k-fig-v" + (tone ? " " + tone : "")}>{value}</div>
      {note ? <div className="k-fig-n">{note}</div> : null}
    </div>
  )
}

/* ————— a titled group ————— */
export function Card({ title, lede, aside, children }: { title: string; lede?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="k-card">
      <div className="k-card-head">
        <div>
          <h2>{title}</h2>
          {lede ? <p>{lede}</p> : null}
        </div>
        {aside ? <div className="k-card-aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

/* ————— list rows ————— */
export function Rows({ children }: { children: ReactNode }) {
  return <div className="k-rows">{children}</div>
}

export function Row({
  name,
  note,
  value,
  tag,
  tone,
  onOpen,
}: {
  name: string
  note?: string
  value?: string
  tag?: string
  tone?: "ok" | "warn"
  /** present = this row goes somewhere, and only then does it get a chevron */
  onOpen?: () => void
}) {
  /* Four cells, always all four, even when empty — the tracks only line up if every row
     declares the same ones. See the subgrid note in the stylesheet. */
  const body = (
    <>
      <span className="k-row-name">
        {name}
        {note ? <em>{note}</em> : null}
      </span>
      <span className="k-row-val">{value ?? ""}</span>
      <span className="k-row-tagcell">{tag ? <span className={"k-tag" + (tone ? " " + tone : "")}>{tag}</span> : null}</span>
      <span className="k-row-gocell">
        {onOpen ? (
          <svg className="k-row-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        ) : null}
      </span>
    </>
  )
  return onOpen ? (
    <button className="k-row is-link" type="button" onClick={onOpen}>
      {body}
    </button>
  ) : (
    <div className="k-row">{body}</div>
  )
}

/* ————— records ————— */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="k-table-wrap">
      <table className="k-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className={h === "" ? "k-th-act" : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/* ————— things you change ————— */
export function Field({ label, hint, defaultValue }: { label: string; hint?: string; defaultValue?: string }) {
  return (
    <label className="k-field">
      <span className="k-field-l">{label}</span>
      <input className="k-input" defaultValue={defaultValue} />
      {hint ? <span className="k-field-h">{hint}</span> : null}
    </label>
  )
}

export function Fields({ children }: { children: ReactNode }) {
  return <div className="k-fields">{children}</div>
}

export function Switch({ label, note, initialOn = false }: { label: string; note?: string; initialOn?: boolean }) {
  const [on, setOn] = useState(initialOn)
  return (
    <button className={"k-switch" + (on ? " on" : "")} type="button" onClick={() => setOn((v) => !v)} aria-pressed={on}>
      <span className="k-switch-track" aria-hidden="true">
        <span className="k-switch-knob" />
      </span>
      <span className="k-switch-text">
        {label}
        {note ? <em>{note}</em> : null}
      </span>
      <span className="k-switch-state">{on ? "On" : "Off"}</span>
    </button>
  )
}

export function Btn({
  children,
  primary,
  onClick,
}: {
  children: ReactNode
  primary?: boolean
  onClick?: () => void
}) {
  return (
    <button className={"k-btn" + (primary ? " pri" : "")} type="button" onClick={onClick}>
      {children}
    </button>
  )
}

export function FormFoot({ children }: { children: ReactNode }) {
  return <div className="k-formfoot">{children}</div>
}

/** Nothing here yet, said without the square brackets the old placeholders used. */
export function Empty({ what }: { what: string }) {
  return (
    <div className="k-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17" />
      </svg>
      <p>{what}</p>
    </div>
  )
}
