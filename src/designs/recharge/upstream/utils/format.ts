import type { SupportedLocale } from '../i18n/locale'

export type DateTimeZone = 'local' | 'UTC'

type DateValue = Date | number | string | null | undefined
type NumberValue = number | null | undefined

const EMPTY_VALUE = '-'

function localeOrCurrent(locale?: SupportedLocale) {
  if (locale) return locale
  if (typeof document !== 'undefined') {
    const documentLocale = document.documentElement.lang.toLowerCase()
    if (documentLocale.startsWith('zh')) return 'zh-CN'
    if (documentLocale.startsWith('en')) return 'en'
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) return 'zh-CN'
  return 'en'
}

function finiteNumber(value: NumberValue, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parsedDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function timeZoneOption(timeZone: DateTimeZone | undefined) {
  return timeZone === 'UTC' ? 'UTC' : undefined
}

export function formatInteger(value?: number, locale?: SupportedLocale) {
  return new Intl.NumberFormat(localeOrCurrent(locale), { maximumFractionDigits: 0 }).format(finiteNumber(value))
}

export function formatDecimal(
  value?: number,
  options: Intl.NumberFormatOptions = {},
  locale?: SupportedLocale,
) {
  return new Intl.NumberFormat(localeOrCurrent(locale), options).format(finiteNumber(value))
}

export function formatPercent(
  value?: number,
  options: Intl.NumberFormatOptions = {},
  locale?: SupportedLocale,
) {
  return new Intl.NumberFormat(localeOrCurrent(locale), {
    style: 'percent',
    maximumFractionDigits: 2,
    ...options,
  }).format(finiteNumber(value))
}

export function formatCurrency(
  value?: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {},
  locale?: SupportedLocale,
) {
  return new Intl.NumberFormat(localeOrCurrent(locale), {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    ...options,
  }).format(finiteNumber(value))
}

export function formatCurrencyMicros(
  micros?: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {},
  locale?: SupportedLocale,
) {
  return formatCurrency(finiteNumber(micros) / 1_000_000, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }, locale)
}

export function formatCurrencyMicrosExact(
  micros: string,
  currency = 'USD',
  locale?: SupportedLocale,
) {
  return formatCurrencyUnitsExact(micros, 6, 2, currency, locale)
}

export function formatCurrencyMinorUnitsExact(
  minorUnits: string,
  currency = 'USD',
  locale?: SupportedLocale,
) {
  return formatCurrencyUnitsExact(minorUnits, 2, 2, currency, locale)
}

function formatCurrencyUnitsExact(
  units: string,
  scale: number,
  minimumFractionDigits: number,
  currency: string,
  locale?: SupportedLocale,
) {
  if (!/^(?:0|-?[1-9][0-9]{0,18})$/.test(units)) return 'Unavailable'
  const value = BigInt(units)
  if (value < -9_223_372_036_854_775_808n || value > 9_223_372_036_854_775_807n) return 'Unavailable'
  const negative = value < 0n
  const absolute = negative ? -value : value
  const divisor = 10n ** BigInt(scale)
  const whole = absolute / divisor
  let fraction = (absolute % divisor).toString().padStart(scale, '0')
  while (fraction.length > minimumFractionDigits && fraction.endsWith('0')) fraction = fraction.slice(0, -1)
  const wholeLabel = new Intl.NumberFormat(localeOrCurrent(locale), { maximumFractionDigits: 0 }).format(whole)
  const decimalSeparator = new Intl.NumberFormat(localeOrCurrent(locale)).formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? '.'
  const numberLabel = fraction ? `${wholeLabel}${decimalSeparator}${fraction}` : wholeLabel
  const currencyParts = new Intl.NumberFormat(localeOrCurrent(locale), {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).formatToParts(0)
  const currencyPrefix = currencyParts.findIndex((part) => part.type === 'currency') < currencyParts.findIndex((part) => part.type === 'integer')
  const symbol = currencyParts.find((part) => part.type === 'currency')?.value ?? currency
  const spacing = currencyParts.some((part) => part.type === 'literal' && /\s/u.test(part.value)) ? ' ' : ''
  const signedNumber = `${negative ? '-' : ''}${numberLabel}`
  return currencyPrefix ? `${negative ? '-' : ''}${symbol}${spacing}${numberLabel}` : `${signedNumber}${spacing}${symbol}`
}

export function formatDate(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale?: SupportedLocale,
) {
  const date = parsedDate(value)
  if (!date) return EMPTY_VALUE
  return new Intl.DateTimeFormat(localeOrCurrent(locale), options).format(date)
}

export function formatDateTime(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale?: SupportedLocale,
) {
  return formatDate(value, options, locale)
}

export function formatDateTimeInZone(
  value: DateValue,
  timeZone: DateTimeZone = 'local',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  locale?: SupportedLocale,
) {
  return formatDate(value, { ...options, timeZone: timeZoneOption(timeZone) }, locale)
}

export function formatRelativeTime(
  value: DateValue,
  options: { now?: DateValue; numeric?: Intl.RelativeTimeFormatNumeric } = {},
  locale?: SupportedLocale,
) {
  const date = parsedDate(value)
  const now = parsedDate(options.now ?? Date.now())
  if (!date || !now) return EMPTY_VALUE
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]
  const formatter = new Intl.RelativeTimeFormat(localeOrCurrent(locale), { numeric: options.numeric ?? 'auto' })
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return formatter.format(seconds, 'second')
}

export function formatBytes(
  bytes?: number,
  options: { empty?: string; maximumFractionDigits?: number } = {},
  locale?: SupportedLocale,
) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return options.empty ?? EMPTY_VALUE
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'] as const
  const absoluteBytes = Math.abs(bytes)
  let value = absoluteBytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  if (bytes < 0) value *= -1
  const maximumFractionDigits = options.maximumFractionDigits ?? (value >= 10 || unit === 0 ? 0 : 1)
  return `${formatDecimal(value, { maximumFractionDigits }, locale)} ${units[unit]}`
}

export function formatGibibytes(bytes?: number, locale?: SupportedLocale) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return EMPTY_VALUE
  return `${formatDecimal(bytes / 1_073_741_824, { maximumFractionDigits: 2 }, locale)} GiB`
}

// Compatibility aliases for existing call sites. All aliases are locale-aware.
export const fmtInteger = formatInteger
export const fmtUSD = (micros?: number) => formatCurrencyMicros(micros, 'USD')
export const fmtBytes = formatBytes

export function formatDeployedAt(value?: string) {
  return formatDateTimeInZone(value, 'local', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
