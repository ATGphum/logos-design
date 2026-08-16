export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type LocaleDirection = 'ltr' | 'rtl'

export const DEFAULT_LOCALE: SupportedLocale = 'en'
export const LOCALE_QUERY_PARAMETER = 'lang'
export const LOCALE_STORAGE_KEY = 'logos.locale'

export const LOCALE_METADATA: Readonly<Record<SupportedLocale, {
  direction: LocaleDirection
  label: string
}>> = {
  en: { direction: 'ltr', label: 'English' },
  'zh-CN': { direction: 'ltr', label: '简体中文' },
}

type LocaleResolutionInput = {
  browserLocales?: readonly string[]
  preferredLocale?: string | null
  storedLocale?: string | null
  urlSearch?: string
}

export function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replaceAll('_', '-').toLowerCase()
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  if (
    normalized === 'zh' ||
    normalized === 'zh-cn' ||
    normalized === 'zh-sg' ||
    normalized === 'zh-hans' ||
    normalized.startsWith('zh-hans-')
  ) return 'zh-CN'
  return null
}

export function localeFromSearch(search: string): SupportedLocale | null {
  const rawLocale = new URLSearchParams(search).get(LOCALE_QUERY_PARAMETER)
  return normalizeLocale(rawLocale)
}

export function readStoredLocale(): SupportedLocale | null {
  if (typeof window === 'undefined') return null
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function storeLocale(locale: SupportedLocale) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage can be unavailable in private or hardened browser contexts.
  }
}

export function browserLocaleCandidates(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

export function resolveLocale(input: LocaleResolutionInput = {}): SupportedLocale {
  const urlSearch = input.urlSearch ?? (typeof window === 'undefined' ? '' : window.location.search)
  const storedLocale = input.storedLocale === undefined ? readStoredLocale() : normalizeLocale(input.storedLocale)
  const browserLocales = input.browserLocales ?? browserLocaleCandidates()
  const candidates = [
    localeFromSearch(urlSearch),
    normalizeLocale(input.preferredLocale),
    storedLocale,
    ...browserLocales.map(normalizeLocale),
  ]

  return candidates.find((candidate): candidate is SupportedLocale => candidate !== null) ?? DEFAULT_LOCALE
}

export function localeDirection(locale: SupportedLocale): LocaleDirection {
  return LOCALE_METADATA[locale].direction
}
