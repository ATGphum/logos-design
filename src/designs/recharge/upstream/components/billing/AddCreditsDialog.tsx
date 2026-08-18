import { useEffect, type ReactNode, type RefObject } from 'react'
import { LogosDialog } from '../logos'
import { pageText } from '../../i18n/pageText'

export type AddCreditsDialogStep = {
  id: string
  label: string
}

type AddCreditsDialogProps = {
  open: boolean
  title: string
  subtitle: string
  steps: readonly AddCreditsDialogStep[]
  activeStepIndex: number
  children: ReactNode
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export function AddCreditsDialog({
  open,
  title,
  subtitle,
  steps,
  activeStepIndex,
  children,
  returnFocusRef,
  onClose,
}: AddCreditsDialogProps) {
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const title = document.querySelector<HTMLElement>('.add-credits-dialog .logos-dialog-title')
      if (title === null) return
      title.tabIndex = -1
      title.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, title])

  return (
    <LogosDialog
      open={open}
      wide
      title={title}
      subtitle={subtitle}
      contentClassName="billing-dialog add-credits-dialog"
      onClose={onClose}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        returnFocusRef.current?.focus()
      }}
    >
      <div className="add-credits-dialog__shell">
        <ol className="add-credits-dialog__steps" aria-label={pageText('billing.addCreditsDialog.addCredits')}>
          {steps.map((step, index) => {
            const current = index === activeStepIndex
            const complete = index < activeStepIndex
            return (
              <li
                className={current ? 'is-current' : complete ? 'is-complete' : undefined}
                key={step.id}
                aria-current={current ? 'step' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step.label}</strong>
              </li>
            )
          })}
        </ol>
        <div className="add-credits-dialog__content">{children}</div>
      </div>
    </LogosDialog>
  )
}
