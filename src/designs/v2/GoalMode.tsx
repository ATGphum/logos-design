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
      <span className="v2-goal-track" aria-hidden="true">
        {/* Both blobs live inside the filtered layer, so their alpha is blurred and then
            hard-clipped: where they overlap they read as one body, and as the bulb pulls
            away a neck stretches between them and snaps. That merge is the whole effect —
            shadows and gradients cannot produce it. */}
        <span className="v2-goal-goo">
          <span className="v2-goal-fill" />
          <span className="v2-goal-knob" />
        </span>
      </span>
      <span className="v2-goal-label">Goal mode</span>

      {/* the goo filter itself: blur the alpha, then push it through a steep ramp so the
          soft edges resolve back to a crisp silhouette */}
      <svg className="v2-goal-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="v2-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
            />
          </filter>
        </defs>
      </svg>
    </button>
  )
}
