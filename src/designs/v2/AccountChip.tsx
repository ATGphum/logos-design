import { useEffect, useRef, useState } from "react"

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <line x1="2.5" y1="10" x2="21.5" y2="10" />
  </svg>
)

const GearGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

/** The trigger reads as a nav glyph, not an avatar — everything else in that column and
 *  rail is a 26px line icon, and a filled letter-disc sat oddly among them. The lettered
 *  disc stays inside the menu, where it is genuinely an avatar. */
const UserGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.6" r="3.4" />
    <path d="M5.4 19.5a6.6 6.6 0 0 1 13.2 0" />
  </svg>
)

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const SunGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </svg>
)

const MoonGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
)

interface AccountChipProps {
  /** the console's Billing panel, so the two surfaces reach the same place */
  onOpenBilling: () => void
  onOpenSettings: () => void
  light: boolean
  onToggleLight: () => void
}

/**
 * V2: the signed-in user, in the chats column footer where Settings used to sit.
 *
 * Identity matches the console's Profile drawer on purpose — same name, org and credit —
 * so the agent and the control plane never disagree about who you are. Settings and
 * Billing are the two places you actually go from an account menu, so they are here
 * rather than only in the console's nav. Theme is a preference, so it lives here too
 * and leaves the topbar.
 *
 * Fixture data; no real account is involved.
 */
/* Credit left, matching the console's Dashboard exactly — $163.60 with 35% used. The two
   surfaces must never disagree about the same number. */
const CREDIT = { amount: "$163.60", pct: 65 }

/**
 * Green at full, amber at half, red at empty — interpolated, not stepped.
 *
 * A three-colour ramp read as one continuous value: the ring does not change state at a
 * threshold, it drifts, so 70% and 60% look different from each other rather than both
 * looking "fine". Stepping it would hide exactly the part of the range where you would
 * want to notice the drift.
 */
function gaugeColour(pct: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [201, 105, 95]],
    [50, [210, 160, 90]],
    [100, [110, 190, 130]],
  ]
  const p = Math.max(0, Math.min(100, pct))
  let lo = stops[0]
  let hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (p >= stops[i][0] && p <= stops[i + 1][0]) {
      lo = stops[i]
      hi = stops[i + 1]
      break
    }
  }
  const span = hi[0] - lo[0] || 1
  const t = (p - lo[0]) / span
  const c = lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/**
 * How much credit is left, in the two shapes the column has room for.
 *
 * Both are rendered every time. AgentView puts the account slot in two places — the
 * column footer and the fixed rail — so the same component is already mounted twice, and
 * which shape shows is decided by which of those two it landed in. No prop needs to know
 * whether the sidebar is folded, and the two can never disagree.
 *
 * Open: a meter with the figure beside it, above the name.
 * Folded: a ring with the percentage inside it, on the rail's glyph axis.
 */
function UsageMeter() {
  const colour = gaugeColour(CREDIT.pct)
  const label = `${CREDIT.amount} left — ${CREDIT.pct}% of your credit`

  return (
    <div className="v2-usage" title={label} aria-label={label}>
      <div className="v2-usage-bar" aria-hidden="true">
        <div className="v2-usage-line">
          <span>{CREDIT.amount} left</span>
          <b style={{ color: colour }}>{CREDIT.pct}%</b>
        </div>
        <div className="v2-usage-track">
          <span style={{ width: CREDIT.pct + "%", background: colour }} />
        </div>
      </div>

      <div className="v2-usage-ring" aria-hidden="true">
        {/* pathLength normalises the circumference, so the dash is the percentage
            itself — no radius-dependent constant to keep in step with the CSS */}
        <svg viewBox="0 0 32 32">
          <circle className="v2-usage-ring-track" cx="16" cy="16" r="13" pathLength="100" />
          <circle
            className="v2-usage-ring-arc"
            cx="16"
            cy="16"
            r="13"
            pathLength="100"
            stroke={colour}
            style={{ strokeDasharray: `${CREDIT.pct} 100` }}
          />
        </svg>
        <span className="v2-usage-pct" style={{ color: colour }}>
          {CREDIT.pct}
        </span>
      </div>
    </div>
  )
}

export function AccountChip({ onOpenBilling, onOpenSettings, light, onToggleLight }: AccountChipProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  /* any click outside closes it, same as the model menu */
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [open])

  return (
    <div className={"v2-acct" + (open ? " open" : "")} ref={wrapRef}>
      <UsageMeter />
      <button className="v2-acct-chip" onClick={() => setOpen((v) => !v)} title="Account">
        <span className="v2-acct-ico">
          <UserGlyph />
        </span>
        <span className="v2-acct-name">scout tesy</span>
        <span className="v2-acct-caret">
          <Chevron />
        </span>
      </button>

      {open ? (
        <div className="v2-acct-menu" role="menu">
          <div className="v2-acct-head">
            <span className="v2-acct-ava lg">S</span>
            <div className="v2-acct-who">
              <b>scout tesy</b>
              <span>org_000004</span>
            </div>
          </div>

          <div className="v2-acct-tag">Platform administrator</div>

          <div className="v2-acct-credit">
            <span className="v2-acct-credit-l">Current credit</span>
            <span className="v2-acct-credit-v">$163.60</span>
          </div>

          <div className="v2-acct-sep" />

          <button
            className="v2-acct-row"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenSettings()
            }}
          >
            <GearGlyph />
            Settings
          </button>
          <button
            className="v2-acct-row"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenBilling()
            }}
          >
            <CardIcon />
            Billing
          </button>

          {/* the theme control lives here rather than in the topbar — it is a preference,
              which is what this menu is for */}
          <button className="v2-acct-row" role="menuitem" onClick={onToggleLight}>
            {light ? <MoonGlyph /> : <SunGlyph />}
            {light ? "Dark mode" : "Light mode"}
          </button>

          <div className="v2-acct-sep" />

          <button className="v2-acct-row v2-acct-out" role="menuitem" onClick={() => setOpen(false)}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}
