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
 * the glyph. Right is the brain: Goal mode, the long-thinking switch. Speed on the left,
 * depth on the right, and the icons say which is which without a label.
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
      <svg className="v2-bulb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5.1a3 3 0 0 0-5.4 1.5A2.7 2.7 0 0 0 5.2 9.3a2.8 2.8 0 0 0 .5 3.3 2.8 2.8 0 0 0 .6 3.4A2.9 2.9 0 0 0 12 17.6z" />
        <path d="M12 5.1a3 3 0 0 1 5.4 1.5 2.7 2.7 0 0 1 1.4 2.7 2.8 2.8 0 0 1-.5 3.3 2.8 2.8 0 0 1-.6 3.4A2.9 2.9 0 0 1 12 17.6z" />
        <line x1="12" y1="5.1" x2="12" y2="17.6" />
        <path d="M8.6 9.1h1.6M13.8 9.1h1.6M8.2 13.2h1.9M13.9 13.2h1.9" />
      </svg>
    </button>
  )
}
