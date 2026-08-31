import { useState } from "react"

/**
 * Goal mode — the long-thinking toggle, under the composer.
 *
 * Binary and self-evident: the whole pill is the switch, and its state is carried by
 * colour, fill and light rather than by a label that changes. Off it is a quiet outline
 * in the page's own greys; on it lifts into violet with a lit rim and a glow, so the
 * agent is visibly in a different mode without anything else on the page moving.
 *
 * Violet is the only colour in V2 — that is deliberate. Nothing else competes with it,
 * so it reads as a state rather than as decoration.
 */
export function GoalMode() {
  const [on, setOn] = useState(false)

  return (
    <button
      type="button"
      className={"v2-goal" + (on ? " on" : "")}
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      title={on ? "Goal mode is on — the agent will think longer" : "Goal mode — let the agent think longer"}
    >
      <span className="v2-goal-dot" aria-hidden="true" />
      <span className="v2-goal-label">Goal mode</span>
    </button>
  )
}
