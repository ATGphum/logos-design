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
      <button className="v2-acct-chip" onClick={() => setOpen((v) => !v)} title="Account">
        <span className="v2-acct-ava">S</span>
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
