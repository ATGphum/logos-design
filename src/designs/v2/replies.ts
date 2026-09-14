/**
 * Canned answers for the V2 thread, so the surface can be judged with real prose in it
 * rather than a placeholder line. Nothing here calls a model — the point is to see what
 * a finished answer looks like: heading, paragraph, list, code, and a closing line.
 *
 * Each entry carries the reasoning steps that precede it, because how a turn *arrives*
 * is as much of the design as how it reads once it has.
 */
export interface Reply {
  /** lowercase words that route a prompt here; the last entry matches anything */
  match: string[]
  steps: string[]
  body: string
}

export const REPLIES: Reply[] = [
  {
    match: ["fold", "sidebar", "column", "animation", "transition", "css"],
    steps: [
      "Reading the request",
      "Locating the fold in console.css",
      "Checking which properties are interpolable",
      "Comparing against the measured timings",
      "Writing it up",
    ],
    body: `Short answer: the column is not animating because one of the properties in that transition cannot be interpolated.

## What is happening

A transition needs two numeric endpoints to walk between. Four of the properties in play here have none:

- \`width: auto → 0\` — \`auto\` is not a length, so it snaps
- \`justify-content\` and \`align-items\` — keywords, not values
- \`margin: auto\` — resolved at layout, not animation, time
- \`font-size: 0\` on a collapsing label — legal, but it reflows every frame

## The fix

Give the property a real pair of endpoints, and pin the constraint that is fighting it:

\`\`\`css
.sidebar {
  min-width: 0;              /* min-width beats max-width — this was the blocker */
  max-width: var(--w);
  transition: max-width .28s cubic-bezier(.33, .45, .25, 1);
}
\`\`\`

One thing worth flagging: \`min-width\` outranks \`max-width\` in the cascade of used values, so as long as a non-zero \`min-width\` is set the fold-out can never animate, no matter what curve you put on it.

Measured after the change: 0 reversals across the fold, and peak velocity down from 1.85 to 1.60 px/ms.`,
  },
  {
    match: ["glass", "depth", "shadow", "toggle", "button", "highlight", "material", "groove"],
    steps: [
      "Reading the request",
      "Inspecting the computed background layers",
      "Working out which surface is raised and which is recessed",
      "Drafting the correction",
    ],
    body: `The reason it reads as flat is that the channel and the thing inside it are lit the same way.

## Why that fails

A bright rim along the **top** edge is how a *raised* surface catches light. It is correct on a button, and correct on the bulb, which sits proud. Put it on the groove and you have described a raised pill with a stroke around it — which is exactly what the eye reports.

A recess is lit the other way round:

- the upper lip is **in shadow**, because it faces away from the light
- the lower lip **catches** it, because it faces into it
- the floor is darkest immediately under the upper lip, and opens up toward the bottom

## In practice

\`\`\`css
.channel {
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(0,0,0,.5), rgba(255,255,255,.035)) padding-box,
    linear-gradient(180deg, rgba(0,0,0,.72), rgba(255,255,255,.26)) border-box;
  box-shadow:
    inset 0 2px 3px -1px rgba(0,0,0,.85),   /* occlusion under the lip */
    inset 0 -1px 1.5px rgba(255,255,255,.09); /* bounce off the floor */
}
\`\`\`

Keep the raised element's rim as it was, and give it a contact shadow so it sits *in* the groove rather than floating above it.`,
  },
  {
    match: ["scroll", "scrollbar", "seam", "indicator", "thumb"],
    steps: [
      "Reading the request",
      "Checking what the browser will and will not draw",
      "Measuring the rendered thumb",
      "Writing it up",
    ],
    body: `A native scrollbar cannot do this, and it is worth knowing why before spending time on the CSS.

The browser draws the thumb, and its width is **constant along its own length**. There is no property that tapers it, and none that fades its ends — so a thumb that thins toward the top and bottom is not a styling problem, it is a different element.

There is also a trap in the rule you already have:

\`\`\`css
scrollbar-width: thin;   /* makes Chromium ignore ::-webkit-scrollbar entirely */
\`\`\`

With that set, the \`::-webkit-scrollbar\` block is discarded. Measured: an 11px thumb against the 3px the stylesheet asked for.

## What works

Draw it. A real element can be clipped to a lens, faded at both ends, and positioned in the seam rather than beside it — and it can read the scroll position directly:

\`\`\`ts
const ratio = list.clientHeight / list.scrollHeight
const height = Math.max(48, rect.height * ratio)
const progress = list.scrollTop / (list.scrollHeight - list.clientHeight || 1)
\`\`\``,
  },
  {
    match: [],
    steps: [
      "Reading the request",
      "Gathering the relevant context",
      "Checking the assumptions hold",
      "Composing a response",
    ],
    body: `Here is how I would approach that.

## The shape of it

The useful move is to separate the part that is genuinely uncertain from the part that only looks uncertain. Most of what feels ambiguous in a request like this resolves the moment you measure it rather than eyeball it — computed styles, element rects, per-frame sampling. What is left after that is the real decision, and it is usually small.

- **Measure first.** A cause you have observed beats a cause you have reasoned toward.
- **Change one thing.** Two changes that both plausibly explain a fix leave you knowing nothing.
- **Keep the reason next to the code.** A number tuned by hand is a number someone will break later without knowing they did.

## Worth flagging

If this is going to be touched again, the current structure holds two copies of the same thing in separate trees, aligned by hand-tuned pixel values. It works, and it will keep working until the row height changes — at which point the register breaks silently, with nothing to catch it.

Deriving the second copy's positions from the first would end that class of bug outright.`,
  },
]

export function pickReply(prompt: string): Reply {
  const p = prompt.toLowerCase()
  for (const r of REPLIES) {
    if (r.match.length && r.match.some((m) => p.includes(m))) return r
  }
  return REPLIES[REPLIES.length - 1]
}
