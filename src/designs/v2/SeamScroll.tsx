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
 */
export function SeamScroll() {
  const [box, setBox] = useState<{ x: number; top: number; height: number } | null>(null)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      const list = document.querySelector<HTMLElement>("#recent-list")
      const side = document.querySelector<HTMLElement>(".sidebar")
      if (!list || !side) return setBox(null)

      const sr = side.getBoundingClientRect()
      const lr = list.getBoundingClientRect()
      /* folded in, or nothing to scroll */
      if (sr.width < 40 || list.scrollHeight <= list.clientHeight + 1) return setBox(null)

      const ratio = list.clientHeight / list.scrollHeight
      const height = Math.max(48, lr.height * ratio)
      const travel = lr.height - height
      const progress = list.scrollTop / (list.scrollHeight - list.clientHeight || 1)

      setBox({ x: sr.right - 2, top: lr.top + travel * progress, height })
    }

    const onScrollOrResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measure()
    const list = document.querySelector("#recent-list")
    list?.addEventListener("scroll", onScrollOrResize, { passive: true })
    window.addEventListener("resize", onScrollOrResize)
    /* the column's width animates, so re-measure across the fold */
    const poll = window.setInterval(measure, 120)

    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(poll)
      list?.removeEventListener("scroll", onScrollOrResize)
      window.removeEventListener("resize", onScrollOrResize)
    }
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
