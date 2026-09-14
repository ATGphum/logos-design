import { useEffect, useState } from "react"

/**
 * The chat list's scroll position, drawn as part of the column's seam.
 *
 * A native scrollbar thumb cannot taper: the browser draws it, and its width is constant
 * along its own length. This is a real element, so it can be clipped to a lens and faded
 * at both ends the way the seam is — and it can sit exactly in the seam rather than
 * beside it.
 *
 * Positioned fixed against the column's own rect rather than portalled into it, so the
 * shared sidebar needs no markup for it.
 *
 * It measures every frame rather than on scroll and resize events. The column's width is
 * animated by CSS, and CSS transitions fire no event per frame — the old code polled at
 * 120ms to cover that, which is about two samples across a 280ms fold, so the indicator
 * stepped along visibly behind the column. Safari made it obvious; it was never right.
 * A rAF loop tracks the animation exactly, costs two rect reads a frame, and only calls
 * setState when the measured position has actually changed.
 */
export function SeamScroll() {
  const [box, setBox] = useState<{ x: number; top: number; height: number } | null>(null)

  useEffect(() => {
    let raf = 0
    /* the last position we actually rendered, as a string — cheaper to compare than
       three numbers and it keeps setState out of frames where nothing moved */
    let last = ""

    const tick = () => {
      raf = requestAnimationFrame(tick)

      const list = document.querySelector<HTMLElement>("#recent-list")
      const side = document.querySelector<HTMLElement>(".sidebar")
      if (!list || !side) {
        if (last !== "none") {
          last = "none"
          setBox(null)
        }
        return
      }

      const sr = side.getBoundingClientRect()
      const lr = list.getBoundingClientRect()
      /* folded in, or nothing to scroll */
      if (sr.width < 40 || list.scrollHeight <= list.clientHeight + 1) {
        if (last !== "none") {
          last = "none"
          setBox(null)
        }
        return
      }

      const ratio = list.clientHeight / list.scrollHeight
      const height = Math.max(48, lr.height * ratio)
      const travel = lr.height - height
      const progress = list.scrollTop / (list.scrollHeight - list.clientHeight || 1)
      const next = { x: sr.right - 2, top: lr.top + travel * progress, height }

      const key = `${next.x}|${next.top}|${next.height}`
      if (key === last) return
      last = key
      setBox(next)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!box) return null

  return (
    <div
      className="v2-seam-scroll"
      aria-hidden="true"
      style={{ left: box.x, top: box.top, height: box.height }}
    />
  )
}
