import { useState } from "react"

/**
 * Goal mode — the long-thinking toggle, under the composer.
 *
 * Off, the bulb sits left in an empty channel; on, it travels right and the whole pane
 * takes the violet. Both the position and the colour carry the state, so it is never
 * ambiguous which way it is set.
 *
 * The stretch during travel is done entirely in CSS by transitioning the bulb's two
 * horizontal insets on different delays — see the geometry note in v2.css. Nothing here
 * animates anything.
 *
 * Violet is the only colour in V2, deliberately: it reads as a mode the agent is in
 * rather than as decoration.
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
      <span className="v2-goal-track" aria-hidden="true">
        <span className="v2-goal-knob" />
      </span>
      <span className="v2-goal-label">Goal mode</span>
    </button>
  )
}
