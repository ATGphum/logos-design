/**
 * Console base components — scrim / dialog / drawer / notifications.
 * Ported from the prototype's csDialog / csDrawer / csNotify helpers
 * (marketing/llm-interface.html lines 3826-4134). Markup and class names 1:1.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

export interface CsAction {
  label: string
  cls?: string
  onClick?: () => void
}

export interface CsDialogSpec {
  title?: string
  sub?: string
  body?: ReactNode
  actions?: CsAction[]
}

export interface CsDrawerSpec {
  title?: string
  sub?: string
  body?: ReactNode
  actions?: CsAction[]
  side?: "left" | "right"
  narrow?: boolean
}

export interface CsToastSpec {
  kind?: "ok" | "warn" | "err"
  title?: string
  msg?: string
  timeout?: number
}

interface ToastEntry extends CsToastSpec {
  key: number
}

const CloseX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

/** One toast — reproduces the enter / progress / auto-dismiss lifecycle of csNotify(). */
function Toast({ toast, onGone }: { toast: ToastEntry; onGone: (key: number) => void }) {
  const [on, setOn] = useState(false)
  const [out, setOut] = useState(false)
  const goneRef = useRef(false)
  const barRef = useRef<HTMLSpanElement>(null)
  const dur = toast.timeout || 4600

  const dismiss = useCallback(() => {
    if (goneRef.current) return
    goneRef.current = true
    setOut(true)
    window.setTimeout(() => onGone(toast.key), 420)
  }, [onGone, toast.key])

  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setOn(true)
        const p = barRef.current
        if (p) {
          p.style.transition = "transform " + dur + "ms linear"
          p.style.transform = "scaleX(0)"
        }
      })
    })
    const t = window.setTimeout(dismiss, dur)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t)
    }
  }, [dismiss, dur])

  return (
    <div className={"cs-toast" + (toast.kind ? " " + toast.kind : "") + (on ? " on" : "") + (out ? " out" : "")}>
      <div className="tt">{toast.title || "Notice"}</div>
      {toast.msg ? <div className="tm">{toast.msg}</div> : null}
      <button className="cs-x" title="Dismiss" onClick={dismiss}>
        <CloseX />
      </button>
      <span className="tp" ref={barRef}></span>
    </div>
  )
}

export interface CsBaseApi {
  dialog: (o: CsDialogSpec) => void
  dialogClose: () => void
  drawer: (o: CsDrawerSpec) => void
  drawerClose: () => void
  notify: (o: CsToastSpec) => void
}

/**
 * Hook owning the scrim/dialog/drawer/toast state; render the returned
 * elements inside #cs-view exactly like the prototype markup.
 */
export function useCsBase(): { api: CsBaseApi; elements: ReactNode } {
  const [dlg, setDlg] = useState<CsDialogSpec | null>(null)
  const [drw, setDrw] = useState<CsDrawerSpec | null>(null)
  const [drwOn, setDrwOn] = useState(false)
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const toastKey = useRef(0)
  const drawerRef = useRef<HTMLElement>(null)

  const dialogClose = useCallback(() => setDlg(null), [])
  const drawerClose = useCallback(() => setDrwOn(false), [])

  const dialog = useCallback((o: CsDialogSpec) => setDlg(o), [])

  const drawer = useCallback((o: CsDrawerSpec) => {
    /* reposition with transitions OFF so the slide-in always starts from the correct side */
    const d = drawerRef.current
    if (d) {
      d.style.transition = "none"
      d.classList.toggle("left", o.side === "left")
      d.style.width = o.narrow ? "min(300px, 76vw)" : ""
      void d.offsetWidth
      d.style.transition = ""
    }
    setDrw(o)
    requestAnimationFrame(() => setDrwOn(true))
  }, [])

  const notify = useCallback((o: CsToastSpec) => {
    toastKey.current += 1
    const entry: ToastEntry = { ...o, key: toastKey.current }
    setToasts((t) => [...t, entry])
  }, [])

  const removeToast = useCallback((key: number) => {
    setToasts((t) => t.filter((x) => x.key !== key))
  }, [])

  const dlgOpen = dlg !== null
  const scrimOn = dlgOpen || drwOn

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (dlgOpen) dialogClose()
      else if (drwOn) drawerClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [dlgOpen, drwOn, dialogClose, drawerClose])

  const scrimClick = () => {
    if (dlgOpen) dialogClose()
    else if (drwOn) drawerClose()
  }

  const dlgActions: CsAction[] = dlg?.actions || [{ label: "Close" }]

  const elements = (
    <>
      {/* base components: scrim / dialog / drawer / notifications */}
      <div className={"cs-scrim" + (scrimOn ? " on" : "")} id="cs-scrim" onClick={scrimClick}></div>
      <div
        className={"cs-dialog-wrap" + (dlgOpen ? " on" : "")}
        id="cs-dialog-wrap"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogClose()
        }}
      >
        <div className="cs-dialog">
          <div className="cs-dlg-head">
            <div>
              <h3 className="cs-dlg-title" id="cs-dlg-title">
                {dlg?.title || ""}
              </h3>
              <p className="cs-dlg-sub" id="cs-dlg-sub">
                {dlg?.sub || ""}
              </p>
            </div>
            <button className="cs-x" onClick={dialogClose} title="Close">
              <CloseX />
            </button>
          </div>
          <div className="cs-dlg-body" id="cs-dlg-body">
            {dlg?.body}
          </div>
          <div className="cs-dlg-foot" id="cs-dlg-foot">
            {dlgOpen
              ? dlgActions.map((a, i) => (
                  <button
                    key={i}
                    className={"cs-btn " + (a.cls || "neutral")}
                    onClick={() => {
                      dialogClose()
                      if (a.onClick) a.onClick()
                    }}
                  >
                    {a.label}
                  </button>
                ))
              : null}
          </div>
        </div>
      </div>
      <aside className={"cs-drawer" + (drwOn ? " on" : "")} id="cs-drawer" ref={drawerRef}>
        <div className="cs-drw-head">
          <div>
            <h3 className="cs-drw-title" id="cs-drw-title">
              {drw?.title || ""}
            </h3>
            <p className="cs-drw-sub" id="cs-drw-sub">
              {drw?.sub || ""}
            </p>
          </div>
          <button className="cs-x" onClick={drawerClose} title="Close">
            <CloseX />
          </button>
        </div>
        <div className="cs-drw-body" id="cs-drw-body">
          {drw?.body}
        </div>
        <div className="cs-drw-foot" id="cs-drw-foot">
          {(drw?.actions || []).map((a, i) => (
            <button
              key={i}
              className={"cs-btn " + (a.cls || "neutral")}
              onClick={() => {
                drawerClose()
                if (a.onClick) a.onClick()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </aside>
      <div className="cs-toasts" id="cs-toasts">
        {toasts.map((t) => (
          <Toast key={t.key} toast={t} onGone={removeToast} />
        ))}
      </div>
    </>
  )

  return { api: { dialog, dialogClose, drawer, drawerClose, notify }, elements }
}
