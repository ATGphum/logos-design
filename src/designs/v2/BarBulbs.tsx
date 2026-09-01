import { useState } from "react"

/**
 * The two composer bulbs, which exist only once the bar has dropped to the bottom of a
 * conversation.
 *
 * In the hero there is room to state Goal mode at full size below the bar. At the bottom
 * there is not, so it compacts into the bar as a bulb — same material as the bar itself
 * (raised: dark fill, rim lit along the top), same violet, same on/off reading.
 *
 * The brain sits opposite it and carries thinking speed. Three settings, cycled by
 * clicking, shown as an arc closing around the glyph — the same language the thinking
 * indicator in the thread uses, so a ring filling up means the same thing in both places.
 * It is cream rather than violet on purpose: violet is Goal mode's, and two violet
 * controls either side of the bar would read as one setting split in half.
 */

const SPEEDS = [
  { name: "Instant", hint: "Answers immediately" },
  { name: "Balanced", hint: "Thinks briefly first" },
  { name: "Deep", hint: "Thinks it through" },
]

/* r=9 in a 24 box → circumference 56.5, which is where the thirds below come from */
const CIRC = 56.5

export function ThinkSpeed() {
  const [level, setLevel] = useState(1)
  const s = SPEEDS[level]

  return (
    <button
      type="button"
      className={"v2-bulb v2-bulb-brain lv" + level}
      onClick={() => setLevel((l) => (l + 1) % SPEEDS.length)}
      title={`Thinking speed: ${s.name} — ${s.hint}`}
      aria-label={`Thinking speed: ${s.name}`}
    >
      <svg className="v2-bulb-ring" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="v2-bulb-ring-track" cx="12" cy="12" r="9" />
        <circle
          className="v2-bulb-ring-arc"
          cx="12"
          cy="12"
          r="9"
          style={{ strokeDasharray: `${(CIRC * (level + 1)) / 3} ${CIRC}` }}
        />
      </svg>
      <svg className="v2-bulb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5.4a2.9 2.9 0 0 0-5.2 1.4A2.6 2.6 0 0 0 5.4 9.4a2.7 2.7 0 0 0 .5 3.2 2.7 2.7 0 0 0 .6 3.3A2.8 2.8 0 0 0 12 17.4z" />
        <path d="M12 5.4a2.9 2.9 0 0 1 5.2 1.4 2.6 2.6 0 0 1 1.4 2.6 2.7 2.7 0 0 1-.5 3.2 2.7 2.7 0 0 1-.6 3.3A2.8 2.8 0 0 1 12 17.4z" />
        <line x1="12" y1="5.4" x2="12" y2="17.4" />
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
      <svg className="v2-bulb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="7.6" />
        <circle cx="12" cy="12" r="3.6" />
        <circle className="v2-bulb-pip" cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    </button>
  )
}
