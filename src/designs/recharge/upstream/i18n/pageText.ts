/**
 * DESIGN SHIM — replaces web-ui/src/i18n/pageText.ts (i18next-backed).
 * Direct lookup into the adopted English page copy, with {{var}} interpolation.
 */
import pagesEN from './locales/en/pages.json'

export type PageCopyKey = keyof typeof pagesEN

type PageTextOptions = Readonly<Record<string, string | number | boolean>>

export function pageText(key: PageCopyKey, options?: PageTextOptions): string {
  const template = pagesEN[key]
  if (typeof template !== 'string') return String(key)
  if (!options) return template
  return template
    // ICU plural: {total, plural, one {# recharge} other {# recharges}}
    .replace(/\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
      (match, name: string, one: string, other: string) => {
        if (!(name in options)) return match
        const count = Number(options[name])
        return (count === 1 ? one : other).replace(/#/g, String(count))
      })
    // {{name}} (i18next) and {name} (ICU) interpolation
    .replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, double: string, single: string) => {
      const name = double ?? single
      return name in options ? String(options[name]) : match
    })
}
