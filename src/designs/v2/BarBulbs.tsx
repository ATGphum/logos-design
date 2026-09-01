import { useState } from "react"

/**
 * The two orbs flanking the composer, once it has dropped to the bottom of a
 * conversation.
 *
 * They sit outside the bar as its siblings rather than inside it, and take their height
 * from it by stretching — see the aspect-ratio note in v2.css. That is why they stay
 * exactly as tall as the bar and exactly round without a single hand-tuned number.
 *
 * Left is the bolt: how fast to answer, three settings, shown as an arc closing around
 * the glyph. Right is Goal mode, drawn as the same bending lattice the thread uses while
 * it thinks — off it sits at rest, on it bends. Speed on the left, depth on the right,
 * and the same figure means the same thing in both places.
 */

const SPEEDS = [
  { name: "Instant", hint: "Answers immediately" },
  { name: "Balanced", hint: "Thinks briefly first" },
  { name: "Deep", hint: "Thinks it through" },
]

/* r=10 in a 24 box → circumference 62.8, which is where the thirds below come from */
const CIRC = 62.8

export function ThinkSpeed() {
  const [level, setLevel] = useState(1)
  const s = SPEEDS[level]

  return (
    <button
      type="button"
      className={"v2-bulb v2-bulb-speed lv" + level}
      onClick={() => setLevel((l) => (l + 1) % SPEEDS.length)}
      title={`Thinking speed: ${s.name} — ${s.hint}`}
      aria-label={`Thinking speed: ${s.name}`}
    >
      <svg className="v2-bulb-ring" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="v2-bulb-ring-track" cx="12" cy="12" r="10" />
        <circle
          className="v2-bulb-ring-arc"
          cx="12"
          cy="12"
          r="10"
          style={{ strokeDasharray: `${(CIRC * (level + 1)) / 3} ${CIRC}` }}
        />
      </svg>
      <svg className="v2-bulb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13.4 2.5 5.6 13.1h5.3l-.9 8.4 8-10.9h-5.4z" />
      </svg>
    </button>
  )
}

export function GoalBulb() {
  const [on, setOn] = useState(false)

  return (
    <button
      type="button"
      className={"v2-bulb v2-bulb-goal" + (on ? " on" : "")}
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      title={on ? "Goal mode is on — the agent will think longer" : "Goal mode — let the agent think longer"}
    >
      {/* The lattice, bending — the same figure and the same travelling wave as the
          thinking mark, which is the point: Goal mode is that thinking, held longer.
          Off it is the grid at rest, flat and still. Pressing it starts the bend. */}
      <svg className="v2-bulb-lattice" viewBox="0 0 24 24" aria-hidden="true">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              className="v2-bulb-node"
              cx={5 + col * 7}
              cy={5 + row * 7}
              r="1.6"
              style={{ animationDelay: `${(row + col) * 0.11}s` }}
            />
          )),
        )}
      </svg>
    </button>
  )
}
