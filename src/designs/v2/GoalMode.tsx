import { useState } from "react"

/**
 * Goal mode — the long-thinking toggle, under the composer.
 *
 * A slab that nearly fills its channel and swooshes end to end: grey and parked left
 * when off, violet and parked right when on. The travel and the colour change carry the
 * state together, so there is nothing to read and nothing to infer.
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
      <span className="v2-goal-track" aria-hidden="true">
        <span className="v2-goal-knob" />
      </span>
      <span className="v2-goal-label">Goal mode</span>
    </button>
  )
}
