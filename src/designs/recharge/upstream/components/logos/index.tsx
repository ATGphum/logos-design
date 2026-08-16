/**
 * DESIGN SHIM — replaces web-ui/src/components/logos (radix-based primitive
 * kit; @radix-ui is not a dependency of this sandbox). Only LogosDialog is
 * used by the billing components, so only it is provided — a plain portal-free
 * modal that keeps the production class names so the vendored skin applies.
 */
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './logos.css'

export function LogosDialog({
  open,
  title,
  subtitle,
  children,
  actions,
  wide,
  contentClassName,
  onClose,
  onCloseAutoFocus,
}: {
  open: boolean
  title: string
  subtitle?: ReactNode
  children: ReactNode
  actions?: ReactNode
  wide?: boolean
  contentClassName?: string
  onClose: () => void
  onCloseAutoFocus?: (event: Event) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="logos-dialog-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`logos-dialog-content${wide ? ' logos-dialog-wide' : ''}${contentClassName ? ` ${contentClassName}` : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="logos-dialog-header">
          <div>
            <h2 className="logos-dialog-title">{title}</h2>
            {subtitle ? <div className="logos-dialog-subtitle">{subtitle}</div> : null}
          </div>
          <button type="button" className="logos-dialog-close" aria-label="Close" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="logos-dialog-body">{children}</div>
        {actions ? <footer className="logos-dialog-actions">{actions}</footer> : null}
      </div>
    </div>
  )
}
