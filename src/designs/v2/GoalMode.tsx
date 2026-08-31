import { useState } from "react"

/**
 * Goal mode — the long-thinking toggle, under the composer.
 *
 * A physical switch rather than a lit pill: the knob is parked hard left against an
 * empty track when off, so being off is unmistakable at a glance, and slides across a
 * violet track that fills in behind it when on. Shaded and glossed so it reads as an
 * object you press rather than a state you infer.
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
      {/* a real track and knob: off, the knob is parked left against an empty track, so
          the state is legible without reading anything */}
      <span className="v2-goal-label">Goal mode</span>
      <span className="v2-goal-track" aria-hidden="true">
        <span className="v2-goal-fill" />
        <span className="v2-goal-knob" />
      </span>
    </button>
  )
}
