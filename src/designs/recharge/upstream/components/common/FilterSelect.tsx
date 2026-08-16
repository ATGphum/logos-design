import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from './useTranslationShim' // DESIGN SHIM (was 'react-i18next')
import './FilterSelect.css'

type FilterSelectLabelKey = 'filters.all'

export type FilterSelectOption<Value extends string = string> = Readonly<{
  value: Value
  label: string
  labelKey?: FilterSelectLabelKey
  disabled?: boolean
}>

type FilterSelectProps<Value extends string> = {
  label: string
  value: Value
  options: readonly FilterSelectOption<Value>[]
  onChange: (value: Value) => void
  className?: string
  testId?: string
  description?: ReactNode
  disabled?: boolean
  error?: ReactNode
  variant?: 'filter' | 'form'
}

export function FilterSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  testId,
  description,
  disabled = false,
  error,
  variant = 'filter',
}: FilterSelectProps<Value>) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const labelID = useId()
  const menuID = useId()
  const descriptionID = useId()
  const errorID = useId()
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const optionLabel = (option: FilterSelectOption<Value> | undefined) => option?.labelKey ? t(option.labelKey) : option?.label
  const describedBy = [description ? descriptionID : '', error ? errorID : ''].filter(Boolean).join(' ') || undefined

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const selected = menu?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)')
    const first = menu?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)')
    ;(selected ?? first)?.focus()

    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
    }
  }, [open])

  const handleOpenMenuKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const choices = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [])
    if (choices.length === 0) return
    event.preventDefault()
    const current = choices.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Home') choices[0].focus()
    else if (event.key === 'End') choices[choices.length - 1].focus()
    else if (event.key === 'ArrowDown') choices[(current + 1 + choices.length) % choices.length].focus()
    else choices[(current - 1 + choices.length) % choices.length].focus()
  }

  const choose = (nextValue: Value) => {
    onChange(nextValue)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={`${variant === 'filter' ? 'cs-filter-field' : 'logos-field'} console-filter-field console-filter-field--${variant} ${className}`.trim()} role="group" aria-labelledby={labelID} data-testid={testId}>
      <span className="console-filter-label" id={labelID}>{label}</span>
      <div ref={rootRef} className={`console-filter-select ${open ? 'is-open' : ''}`} onKeyDown={handleOpenMenuKeys}>
        <button
          ref={triggerRef}
          className="console-filter-trigger"
          type="button"
          role="combobox"
          aria-labelledby={labelID}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? menuID : undefined}
          data-value={value}
          data-testid={testId ? `${testId}-trigger` : undefined}
          disabled={disabled}
          title={optionLabel(selectedOption) ?? value}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
            event.preventDefault()
            setOpen(true)
          }}
        >
          <span className="console-filter-value">{optionLabel(selectedOption) ?? value}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {open ? (
          <div ref={menuRef} className="console-filter-options dashboard-scrollbar" id={menuID} role="listbox" aria-labelledby={labelID}>
            {options.map((option) => {
              const selected = option.value === value
              return (
                <button
                  className={selected ? 'is-selected' : ''}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-value={option.value}
                  data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                  disabled={option.disabled}
                  key={option.value}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => choose(option.value)}
                >
                  <span>{optionLabel(option)}</span>
                  <Check size={15} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      {description ? <span className="logos-field-hint" id={descriptionID}>{description}</span> : null}
      {error ? <span className="logos-field-error" id={errorID} role="alert">{error}</span> : null}
    </div>
  )
}

export function filterSelectOptions<Value extends string>(values: readonly Value[]): readonly FilterSelectOption<Value>[] {
  return values.map((value) => ({ value, label: value, labelKey: value.toLowerCase() === 'all' ? 'filters.all' : undefined }))
}
