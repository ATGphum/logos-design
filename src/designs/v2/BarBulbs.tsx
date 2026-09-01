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
 * the glyph. Right is a branch — one thought opening into three — which is Goal mode,
 * the long-thinking switch. Speed on the left, deliberation on the right, and the glyphs
 * say which is which without a label.
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
      {/* One thought branching into three: the graph glyph, which is what long thinking
          actually looks like. Tried a brain first (a blob with scratches at this size)
          and then a diamond of nodes — at 21px the curves closed up against the nodes
          and it read as a four-pointed star. Orthogonal rules survive small sizes;
          curves between close points do not. */}
      <svg className="v2-bulb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 6.6v3.1" />
        <path d="M5.6 14.1v-2.2a2.2 2.2 0 0 1 2.2-2.2h8.4a2.2 2.2 0 0 1 2.2 2.2v2.2" />
        <path d="M12 9.7v4.4" />
        <circle cx="12" cy="4.7" r="1.75" fill="currentColor" stroke="none" />
        <circle cx="5.6" cy="16.1" r="1.75" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16.1" r="1.75" fill="currentColor" stroke="none" />
        <circle cx="18.4" cy="16.1" r="1.75" fill="currentColor" stroke="none" />
      </svg>
    </button>
  )
}
