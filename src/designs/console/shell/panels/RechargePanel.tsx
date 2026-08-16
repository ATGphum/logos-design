/**
 * Recharge panel (cs-panel-recharge) — LOGOS credit balance and one-time top-up.
 *
 * New design, not a port: built from the reference mocks in the design brief.
 * Reuses the console's section/tag/button language; recharge-specific pieces
 * carry the `rc-` prefix.
 *
 * Every number the server owns is treated as server-authoritative here — the
 * amount the user types is a *request*, and the copy says the server verifies
 * the final value before checkout.
 */
import { useMemo, useState, type ReactNode } from "react"
import { RECHARGE_HISTORY, RECHARGE_LIMITS, RECHARGE_QUICK, RECHARGE_METHODS } from "../../state"

/* ---------- icons (stroke style matches the rest of the console) ---------- */

const Ico = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const CoinIco = () => (
  <Ico>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.6 9.2a3 3 0 0 0-2.6-1.3c-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.7.9 2.7 2.1-1.1 2.1-2.7 2.1a3 3 0 0 1-2.6-1.3" />
    <path d="M12 6.2v11.6" />
  </Ico>
)

const ShieldIco = () => (
  <Ico size={15}>
    <path d="M12 3.2 5 6v5.2c0 4 2.9 7.5 7 9 4.1-1.5 7-5 7-9V6z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </Ico>
)

const ClockIco = ({ size = 15 }: { size?: number }) => (
  <Ico size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.2V12l3 1.8" />
  </Ico>
)

const HistoryIco = () => (
  <Ico size={26}>
    <path d="M3.2 12a8.8 8.8 0 1 0 2.6-6.2" />
    <path d="M3 4.4V9h4.6" />
    <path d="M12 7.6V12l3 1.8" />
  </Ico>
)

const InboxIco = () => (
  <Ico size={17}>
    <rect x="3" y="5" width="18" height="14" rx="1.6" />
    <path d="m3.4 6 8.6 6 8.6-6" />
  </Ico>
)

const CardIco = () => (
  <Ico size={17}>
    <rect x="2.6" y="5" width="18.8" height="14" rx="1.8" />
    <path d="M2.6 9.6h18.8" />
  </Ico>
)

const TaoIco = () => (
  <Ico size={17}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M7.6 9h8.8" />
    <path d="M12 9v8" />
  </Ico>
)

const RefreshIco = () => (
  <Ico size={13}>
    <path d="M20 11a8 8 0 1 0-1.9 6.1" />
    <path d="M20 5v6h-6" />
  </Ico>
)

const CheckIco = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.6 4.5L19 7" />
  </svg>
)

/* ---------- money helpers ---------- */

/** "1234.5" -> "1,234.50" — tabular display, always two decimals. */
function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Accepts what the user is typing; keeps digits and a single dot, max 2 decimals. */
function sanitize(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "")
  const [head, ...rest] = cleaned.split(".")
  if (!rest.length) return head
  return head + "." + rest.join("").slice(0, 2)
}

/* ---------- small building blocks ---------- */

function Badge({ children }: { children: ReactNode }) {
  return <span className="rc-badge">{children}</span>
}

function SecHead({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="rc-sech">
      <div>
        <div className="rc-eyebrow">{eyebrow}</div>
        <div className="rc-sect">{title}</div>
        {sub ? <p className="rc-secsub">{sub}</p> : null}
      </div>
      {right ? <div className="rc-sechr">{right}</div> : null}
    </div>
  )
}

/** Left-accented callout — the mock's "Ready to recharge" / selection confirmation. */
function Callout({ icon, title, desc, tone }: { icon?: ReactNode; title: ReactNode; desc: ReactNode; tone?: "ok" }) {
  return (
    <div className={"rc-callout" + (tone ? " " + tone : "")}>
      {icon ? <span className="ci">{icon}</span> : null}
      <div>
        <div className="tt">{title}</div>
        <div className="dd">{desc}</div>
      </div>
    </div>
  )
}

/* ---------- the panel ---------- */

export function RechargePanel({ onRefresh }: { onRefresh?: () => void }) {
  const [amount, setAmount] = useState("20.00")
  const [method, setMethod] = useState<string>(RECHARGE_METHODS[0].id)

  const value = useMemo(() => {
    const n = Number.parseFloat(amount)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const valid = value >= RECHARGE_LIMITS.min && value <= RECHARGE_LIMITS.max
  const active = RECHARGE_METHODS.find((m) => m.id === method) ?? RECHARGE_METHODS[0]

  return (
    <>
      <div className="rc-actions">
        <button className="cs-btn" onClick={onRefresh}>
          <RefreshIco />
          Refresh
        </button>
      </div>

      {/* ---------- balance + one-time credit ---------- */}
      <div className="rc-top">
        <section className="rc-col">
          <div className="rc-balhead">
            <span className="rc-balico">
              <CoinIco />
            </span>
            <div>
              <div className="rc-eyebrow">Available USD credit</div>
              <div className="rc-balname">Current balance</div>
            </div>
            <Badge>Verified</Badge>
          </div>
          <div className="rc-amount">
            <span className="ov-money disp">
              <span className="cur">$</span>
              0.00
            </span>
          </div>
          <p className="rc-secsub">Credit is consumed by service usage. Recharge does not change instance limits or resource settings.</p>
          <div className="rc-meta">
            <span>
              <ShieldIco />
              Server-authoritative balance
            </span>
            <span>
              <ClockIco />
              Credit does not expire
            </span>
          </div>
        </section>

        <section className="rc-col rc-col-r">
          <div className="rc-eyebrow">One-time credit</div>
          <div className="rc-balname">Recharge balance</div>
          <p className="rc-secsub">Add USD credit with a one-time payment. Each completed payment adds credit once.</p>
          <Callout
            icon={<InboxIco />}
            title="Ready to recharge"
            desc="Server-defined recharge amounts will be shown here."
          />
        </section>
      </div>

      {/* ---------- amount ---------- */}
      <div className="cs-sec">
        <SecHead
          eyebrow="Server-verified amounts"
          title="Choose recharge amount"
          sub="Enter a USD amount or use a quick option. The server verifies the final value before checkout."
          right={<Badge>Verified</Badge>}
        />

        <div className="rc-row">
          <span className="rc-lab">Quick amount</span>
          <div className="rc-quick">
            {RECHARGE_QUICK.map((q) => (
              <button key={q} className={"rc-chip" + (value === q ? " on" : "")} onClick={() => setAmount(q.toFixed(2))}>
                ${q}
              </button>
            ))}
          </div>
        </div>

        <div className="rc-row rc-row-lab">
          <span className="rc-lab">Recharge amount</span>
          <span className="rc-unit">USD · up to two decimal places</span>
        </div>

        <div className={"rc-input" + (valid ? "" : " bad")}>
          <span className="pre">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            spellCheck={false}
            onChange={(e) => setAmount(sanitize(e.target.value))}
            onBlur={() => setAmount(Number.isFinite(value) && amount !== "" ? value.toFixed(2) : "")}
            aria-label="Recharge amount in USD"
          />
          <span className="suf">USD</span>
        </div>

        <div className="rc-helper">
          <span>{valid ? `You receive $${fmt(value)} credit.` : "Enter an amount within the allowed range."}</span>
          <span>
            Allowed: ${fmt(RECHARGE_LIMITS.min)}–${fmt(RECHARGE_LIMITS.max)}
          </span>
        </div>

        {/* ---------- payment method ---------- */}
        <div className="rc-row rc-row-lab rc-paylab">
          <span className="rc-lab">Payment method</span>
        </div>

        <div className="rc-pay">
          {RECHARGE_METHODS.map((m) => {
            const on = m.id === method
            return (
              <div
                key={m.id}
                className={"rc-payrow" + (on ? " on" : "") + (m.available ? "" : " off")}
                onClick={() => m.available && setMethod(m.id)}
                role="radio"
                aria-checked={on}
                aria-disabled={!m.available}
                tabIndex={m.available ? 0 : -1}
                onKeyDown={(e) => {
                  if (m.available && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    setMethod(m.id)
                  }
                }}
              >
                <span className={"rc-check" + (on ? " on" : "")}>{on ? <CheckIco size={12} /> : null}</span>
                <span className="rc-payico">{m.id === "tao" ? <TaoIco /> : <CardIco />}</span>
                <div className="rc-paytx">
                  <div className="tt">{m.label}</div>
                  <div className="dd">{m.desc}</div>
                </div>
                {m.available ? null : <Badge>Unavailable</Badge>}
              </div>
            )
          })}
        </div>

        {valid ? (
          <Callout
            tone="ok"
            icon={<CheckIco />}
            title={`$${fmt(value)} Credit selected`}
            desc={`Pay $${fmt(value)} USD with ${active.short} and receive $${fmt(value)} credit.`}
          />
        ) : null}

        <div className="rc-foot">
          <button className="cs-btn" disabled={!valid}>
            Continue with {active.short}
          </button>
          <p className="rc-footnote">{active.footnote}</p>
        </div>
      </div>

      {/* ---------- history ---------- */}
      <div className="cs-sec">
        <SecHead eyebrow="Owner records" title="Recharge history" sub="Payments and full refunds backed by server records." right={<Badge>Verified</Badge>} />

        {RECHARGE_HISTORY.length === 0 ? (
          <div className="rc-empty">
            <HistoryIco />
            <div className="tt">No recharge history yet</div>
            <div className="dd">Completed and pending one-time recharges will appear here.</div>
          </div>
        ) : (
          <table className="cs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Status</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {RECHARGE_HISTORY.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.method}</td>
                  <td>
                    <span className={"dot " + r.dot}></span>
                    {r.status}
                  </td>
                  <td className="num">{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
