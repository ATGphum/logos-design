/** Fullscreen chat search (blurred backdrop) — ported from the prototype's search overlay. */
import { useEffect, useRef, useState } from "react"
import { SearchIcon } from "./icons"

export function SearchOverlay({
  open,
  titles,
  onClose,
  onPick,
}: {
  open: boolean
  titles: string[]
  onClose: () => void
  onPick: (title: string) => void
}) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    const t = window.setTimeout(() => inputRef.current?.focus(), 70)
    return () => window.clearTimeout(t)
  }, [open])

  const q = query.trim().toLowerCase()
  const hits = titles.filter((t) => t.toLowerCase().includes(q))
  const any = hits.length > 0

  return (
    <div
      className={"search-overlay" + (open ? " open" : "") + (!any ? " no-results" : "")}
      id="search-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="search-inner">
        <div className="search-box">
          <SearchIcon />
          <input
            id="search-input"
            ref={inputRef}
            type="text"
            placeholder="Search chats"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-esc" onClick={onClose} title="Close">
            esc
          </button>
        </div>
        <div className="search-results" id="search-results">
          <div className="search-section-label" style={{ display: any ? undefined : "none" }}>
            Recent
          </div>
          {hits.map((t) => (
            <div key={t} className="search-row" onClick={() => onPick(t)}>
              <span className="search-row-title">{t}</span>
              <span className="search-row-date">Yesterday</span>
            </div>
          ))}
        </div>
        <div className="search-empty" id="search-empty">
          No matching chats
        </div>
      </div>
    </div>
  )
}
